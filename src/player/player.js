import * as THREE from 'three';
import { cameraSafeFraction } from '../combat/targeting-p6.js';
import { resolveDashDirection,relativeDodgeClip,worldMove,angleTo,wrapAngle } from '../combat/motion-p7.js';
import { FuryTraversalP13 } from './fury-traversal-p13.js';
import { landingRock } from './fury-surfaces-p13.js';

const _tmpV1 = new THREE.Vector3();
const _tmpV2 = new THREE.Vector3();
const _tmpV3 = new THREE.Vector3();

// KayKit 模型本体朝 +Z；游戏 yaw=0 时前方是 -Z（forward = (-sin yaw, -cos yaw)），故偏移 π
const MODEL_YAW_OFFSET = Math.PI;
const ATTACK_CLIP = '1H_Melee_Attack_Slice_Diagonal';
const CAST_CLIP = 'Spellcast_Shoot';
const ACTION_DURATION = 0.35;

// 旋风冲刺（WULD 龙吼）：0.28s × 52 ≈ 14.5m
const DASH_DURATION = 0.28;
const DASH_SPEED = 52;

// 装备外观表：武器作用于挂手的剑克隆体，护甲作用于躯干/披风网格
const WEAPON_STYLES = {
  iron_sword: { scale: 1.0 },
  steel_sword: { scale: 1.05, color: 0xc9ced6 },
  ancient_sword: { scale: 1.12, emissive: 0x6fc3ff, emissiveIntensity: 0.55 },
  dragonbone_sword: { scale: 1.18, color: 0xddd5c0, emissive: 0xff9a4a, emissiveIntensity: 0.25 }
};
const ARMOR_STYLES = {
  cloth_armor: {},
  hide_armor: { torso: { color: 0x5a4530 } },
  dragonscale_armor: {
    torso: { color: 0x3a4f42, metalness: 0.35, emissive: 0x2e4438, emissiveIntensity: 0.08 },
    cape: { color: 0x2f3b34 }
  }
};

export class Player {
  constructor(game) {
    this.game = game;
    this.height = 1.8;
    this.eyeHeight = 1.65;
    this.yaw = 0;
    this.pitch = -0.15;
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.firstPerson = false;
    this.camDist = 6;
    this.attackT = -1;
    this.castT = -1;
    this.shakeT = 0;
    this.bodyYaw = 0;
    this.currentWeapon = null;
    this.currentArmor = null;
    this.currentOffhand=null;
    this._offhandSword=null;
    this._attackAnimStarted = false;
    this._castAnimStarted = false;
    this._swordParts = null;
    this._armorParts = null;
    this._inWater = false;
    this._rippleT = 0;
    this.dashT = -1;
    this._dashTrailFallback = false;
    this._dashDir = new THREE.Vector3(0,0,-1);
    this._dashSpeed = DASH_SPEED;
    this._dashDuration = DASH_DURATION;
    this._moveDir = new THREE.Vector3(0,0,0);
    this._lastMoveDir = new THREE.Vector3(0,0,0);
    this._airDashCount=0;
    this._jumpBufferT=0;
    this._torchStashedOffhand=null;
    this._secondJumpVfxT=0;
    this._jumpCount = 0;
    this._airDashUsed = false;
    this._cameraReady = false;
    this.attackClip = ATTACK_CLIP;
    this.actionDuration = ACTION_DURATION;
    this.dashClip=null;
    this._dashAnimStarted=false;
    this._jumpAnimT=0;
    this._jumpAnimStarted=false;
    this.torchOn = false;

    this.group = new THREE.Group();
    this.rig = game.assets.spawn('player');
    this.group.add(this.rig.root);
    this.fury=game.p13Enabled ? new FuryTraversalP13(game,this) : null;
    if(this.fury)this.rig.root.rotation.order='YXZ';
    const sx = 8, sz = 70;
    this.group.position.set(sx, game.terrain.getHeight(sx, sz), sz);
    game.scene.add(this.group);

    this.faceVillage();
    this.bodyYaw = this.yaw;
    this.rig.root.rotation.y = this.bodyYaw + MODEL_YAW_OFFSET;
    this.rig.play('Idle');
    this.applyEquipment();
    this.buildTorch();
  }

  get pos() { return this.group.position; }

  faceVillage() {
    const dx = 0 - this.group.position.x;
    const dz = 40 - this.group.position.z;
    this.yaw = Math.atan2(-dx, -dz);
    this.pitch = -0.15;
  }

  // 材质独占一份并记录基准外观，换装调色不污染 AssetLib 共享缓存、可随时还原
  prepClonedMaterials(mesh) {
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((x) => x.clone())
      : mesh.material.clone();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      mat.userData.baseColor = mat.color ? mat.color.clone() : null;
      mat.userData.baseMetalness = mat.metalness;
      mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
      mat.userData.baseEmissiveIntensity = mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 1;
    }
  }

  // 按样式表调色；样式缺省的字段一律还原到基准
  applyMaterialStyle(mesh, style) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat.color && mat.userData.baseColor) {
        if (style.color !== undefined) mat.color.set(style.color);
        else mat.color.copy(mat.userData.baseColor);
      }
      if (mat.metalness !== undefined && mat.userData.baseMetalness !== undefined) {
        mat.metalness = style.metalness !== undefined ? style.metalness : mat.userData.baseMetalness;
      }
      if (mat.emissive) {
        if (style.emissive !== undefined) {
          mat.emissive.set(style.emissive);
          mat.emissiveIntensity = style.emissiveIntensity !== undefined ? style.emissiveIntensity : 1;
        } else {
          mat.emissive.copy(mat.userData.baseEmissive);
          mat.emissiveIntensity = mat.userData.baseEmissiveIntensity;
        }
      }
    }
  }

  // 找 AssetLib 挂在 handslotr 下的剑（隐藏的原生道具 visible=false，借此区分）
  findSwordParts() {
    this._swordParts = [];
    const slot = this.rig.root.getObjectByName('handslotr');
    if (!slot) return;
    for (const child of slot.children) {
      if (!child.visible) continue;
      const meshes = [];
      child.traverse((o) => {
        if ((o.isMesh || o.isSkinnedMesh) && o.visible) meshes.push(o);
      });
      if (meshes.length === 0) continue;
      for (const m of meshes) this.prepClonedMaterials(m);
      this._swordParts.push({ root: child, baseScale: child.scale.clone(), meshes });
    }
  }

  // 躯干/披风网格（Barbarian_Body / Barbarian_Cape），护甲换装时调色
  findArmorParts() {
    this._armorParts = { torso: [], cape: [] };
    for (const [slot, nodeName] of [['torso', 'Barbarian_Body'], ['cape', 'Barbarian_Cape']]) {
      const node = this.rig.root.getObjectByName(nodeName);
      if (!node) continue;
      node.traverse((o) => {
        if (!(o.isMesh || o.isSkinnedMesh) || !o.visible) return;
        this.prepClonedMaterials(o);
        this._armorParts[slot].push(o);
      });
    }
  }

  updateWeaponVisual() {
    const inv = this.game.inventory;
    const id = inv ? inv.equipped.weapon : 'iron_sword';
    if (id === this.currentWeapon) return;
    if (!this._swordParts) this.findSwordParts();
    this.currentWeapon = id;

    const style = WEAPON_STYLES[id] || WEAPON_STYLES.iron_sword;
    for (const part of this._swordParts) {
      part.root.visible=!!id;
      part.root.scale.copy(part.baseScale).multiplyScalar(style.scale || 1);
      for (const m of part.meshes) this.applyMaterialStyle(m, style);
    }
  }

  updateArmorVisual() {
    const inv = this.game.inventory;
    const id = inv ? inv.equipped.armor : 'cloth_armor';
    if (id === this.currentArmor) return;
    if (!this._armorParts) this.findArmorParts();
    this.currentArmor = id;

    const style = ARMOR_STYLES[id] || ARMOR_STYLES.cloth_armor;
    for (const m of this._armorParts.torso) this.applyMaterialStyle(m, style.torso || {});
    for (const m of this._armorParts.cape) this.applyMaterialStyle(m, style.cape || {});
  }

  // Uses the SAME licensed sword asset as the right hand; no new GLBs.
  updateOffhandVisual() {
    const id=this.game.inventory?.equipped.offhand||null;
    if(id===this.currentOffhand)return;
    this.currentOffhand=id;
    if(this._offhandSword){this._offhandSword.removeFromParent();this._offhandSword=null;}
    if(!id)return;
    const bone=this.rig.root.getObjectByName('handslotl');
    const src=this.game.assets._lib.sword?.gltf?.scene;
    if(!bone||!src){console.warn('[P7] Falta anclaje/espada secundaria');return;}
    const off=src.clone(true);off.name='highfly_offhand_sword';
    const style=WEAPON_STYLES[id]||WEAPON_STYLES.iron_sword;
    off.scale.multiplyScalar(style.scale||1);
    off.traverse(o=>{if(o.isMesh){this.prepClonedMaterials(o);this.applyMaterialStyle(o,style);}});
    bone.add(off);this._offhandSword=off;
    this.torchOn=false;
  }

  applyEquipment() {
    this.updateWeaponVisual();
    this.updateOffhandVisual();
    this.updateArmorVisual();
  }

  // 手持火把（T 键切换）。GLB 里骨骼原名 handslot.l/.r，GLTFLoader 会去掉点号，
  // 故此处与右手剑挂载（assets.js WEAPON_ATTACH 'handslotr'）同用无点名字
  buildTorch() {
    const group = new THREE.Group();
    group.name = 'hand_torch';

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.42, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.85, metalness: 0 })
    );
    handle.position.y = 0.07; // 握点在柄下 1/3 处：挂点原点即手心
    handle.castShadow = true;
    group.add(handle);

    // 锥底平移到几何原点：scale.y 摆动时火苗向上舔而不是绕中心双向抖
    const flameGeo = new THREE.ConeGeometry(0.12, 0.3, 6);
    flameGeo.translate(0, 0.15, 0);
    this._torchFlame = new THREE.Mesh(
      flameGeo,
      new THREE.MeshStandardMaterial({ color: 0xff8c3a, emissive: 0xff8c3a, emissiveIntensity: 2.2 })
    );
    this._torchFlame.position.y = 0.28;
    group.add(this._torchFlame);

    // 点光不挂手骨而挂 player.group：一是第一人称 rig.root 会整体隐藏（挂骨下光源
    // 会连坐熄灭），二是免受骨骼缩放影响；decay=1 缓衰减才铺得开光池（同室内补光经验，
    // 默认 decay=2 实测只照亮脚下一小圈）
    this._torchLight = new THREE.PointLight(0xff9a4a, 3.0, 18, 1);
    this._torchLight.position.set(0, 1.4, 0);
    this.group.add(this._torchLight);

    const bone = this.rig.root.getObjectByName('handslotl');
    if (bone) {
      bone.add(group);
      // 骨骼世界缩放带着模型归一比例，一次性反补偿回世界尺寸
      const ws = bone.getWorldScale(_tmpV1);
      group.scale.setScalar(1 / Math.max(ws.x, 1e-6));
      // 手槽 +Y 沿武器纵轴（剑零旋转即正姿），微仰让火把头偏向上
      group.rotation.x = -0.35;
    } else {
      console.warn('[player] 缺少挂点骨骼: handslotl，火把回退挂 rig.root');
      this.rig.root.add(group);
      group.position.set(0.35, 1.05, 0.1);
    }
    this._torchGroup = group;
    this.updateTorch();
  }

  // 火把可见性单点推导：torchOn 控整体、入水压灭火苗与点光（木柄保留），不在别处散写
  updateTorch() {
    const lit = this.torchOn && !this._inWater;
    this._torchGroup.visible = this.torchOn;
    this._torchFlame.visible = lit;
    this._torchLight.visible = lit;
    if (!lit) return;
    // 确定性多正弦闪烁，同 structures 村庄火把的写法（不用 Math.random）
    const el = this.game.time.elapsed;
    this._torchLight.intensity = 3.0 + 0.55 * Math.sin(el * 13)
      + 0.18 * Math.sin(el * 47.3)
      + 0.1 * Math.sin(el * 29.7);
    this._torchFlame.scale.y = 1 + 0.1 * Math.sin(el * 11.3) + 0.05 * Math.sin(el * 37.1);
  }

  toggleTorch(){
    const inventory=this.game.inventory;
    if(!this.torchOn){
      if(this.game.p810Enabled){
        this._torchStashedOffhand=inventory.equipped.offhand||null;
        inventory.equipped.offhand=null;
        this.currentOffhand=null;
        this.updateOffhandVisual();
      }else if(this.game.p7Enabled && inventory.equipped.offhand){
        this.game.hud.notify('Desequipá la espada secundaria para usar antorcha');return false;
      }
      this.torchOn=true;
    }else{
      this.torchOn=false;
      if(this.game.p810Enabled){
        const weapon=this._torchStashedOffhand;
        inventory.equipped.offhand=weapon&&inventory.has(weapon)?weapon:null;
        this._torchStashedOffhand=null;
        this.updateOffhandVisual();
      }
    }
    this.updateTorch();
    this.game.hud.notify(this.torchOn?'Antorcha encendida':'Antorcha apagada');
    if(this.torchOn)this.game.audio.play('cast');
    return true;
  }

  // P6 directional evasion and existing WULD share the same movement primitive.
  startDash(opts = {}) {
    this.dashT = 0;
    if(this.game.p14Enabled && !this.onGround)this.game.combat?.keepAirCombo('air-dash');
    if(this.fury && this.fury.mode!=='AIR')this.fury.stop('dash');
    const direction=opts.direction || (this.game.p7Enabled
      ? resolveDashDirection(this.game.input.touchMove,this.yaw,this._lastMoveDir,this.bodyYaw)
      : (this.game.p6Enabled && this._moveDir.lengthSq()>0.1 ? this._moveDir : this.getForward()));
    this._dashDir.set(direction.x||0,0,direction.z||0);
    if(this._dashDir.lengthSq()<0.001)this._dashDir.copy(this.getForward());
    this._dashDir.normalize();
    this._dashSpeed=opts.speed||DASH_SPEED;
    this._dashDuration=opts.duration||DASH_DURATION;
    this.dashClip=null;this._dashAnimStarted=false;
    if(opts.style==='dodge' && this.game.p6Enabled){
      // The GLB audit confirmed all four Dodge_* clips in player_barbarian.glb.
      const forward=this.getForward();
      const fd=this._dashDir.dot(forward);
      const side=this._dashDir.x*Math.cos(this.yaw)-this._dashDir.z*Math.sin(this.yaw);
      this.dashClip=this.game.p7Enabled ? relativeDodgeClip(this._dashDir,this.bodyYaw)
        : (Math.abs(fd)>=Math.abs(side) ? (fd>=0?'Dodge_Forward':'Dodge_Backward')
        : (side>=0?'Dodge_Right':'Dodge_Left'));
      if(!this.rig.clips.has(this.dashClip))this.dashClip=null;
    }
    const effects=this.game.effects;
    this._dashTrailFallback=!(effects && typeof effects.dashTrail==='function');
    if(!this._dashTrailFallback)effects.dashTrail(()=>new THREE.Vector3(
      this.group.position.x,this.group.position.y+1,this.group.position.z
    ),this._dashDuration);
  }

  addShake(s) {
    this.shakeT = Math.max(this.shakeT, s);
  }

  getForward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  getCombatForward() {
    return new THREE.Vector3(-Math.sin(this.bodyYaw),0,-Math.cos(this.bodyYaw));
  }

  getAimDir() {
    const v = new THREE.Vector3();
    this.game.camera.getWorldDirection(v);
    return v;
  }

  update(dt) {
    const g = this.game;
    const input = g.input;
    const terrain = g.terrain;
    const stats = g.stats;

    this.applyEquipment();

    this.yaw -= input.mouse.dx * 0.0025;
    this.pitch -= input.mouse.dy * 0.0025;
    if (this.pitch < -1.2) this.pitch = -1.2;
    if (this.pitch > 1.45) this.pitch = 1.45;

    if (input.wheel !== 0) {
      this.camDist += input.wheel * 0.01;
      if (this.camDist < 2.5) this.camDist = 2.5;
      if (this.camDist > 12) this.camDist = 12;
    }

    if (input.justPressed.has('KeyV')) {
      this.firstPerson = !this.firstPerson;
    }

    if (input.justPressed.has('KeyT'))this.toggleTorch();

    let mx = 0, mz = 0;
    if (input.keys.has('KeyW')) mz -= 1;
    if (input.keys.has('KeyS')) mz += 1;
    if (input.keys.has('KeyA')) mx -= 1;
    if (input.keys.has('KeyD')) mx += 1;
    // HIGHFLY_TOUCH_PATCH_V1: analog joystick and WASD coexist.
    if (input.touchMove) {
      mx = Math.max(-1, Math.min(1, mx + input.touchMove.x));
      mz = Math.max(-1, Math.min(1, mz + input.touchMove.y));
    }
    const moving = mx !== 0 || mz !== 0;

    const groundHere = terrain.getHeight(this.group.position.x, this.group.position.z);
    const inWater = groundHere < terrain.waterY - 0.6;

    let speed = g.p812Enabled?7.5:6;
    if (moving && (input.keys.has('ShiftLeft') || input.touchSprint) &&
        (g.p14Enabled || stats.useStamina((g.p812Enabled?10:12) * dt))) {
      speed = g.p812Enabled?11.2:10;
    }
    if (inWater) speed *= 0.55;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let tx = 0, tz = 0;
    if (moving) {
      const dir=g.p7Enabled?worldMove(mx,mz,this.yaw):null;
      if(g.p7Enabled){tx=dir.x*speed;tz=dir.z*speed;}
      else{
        const len=Math.hypot(mx,mz),lx=mx/len,lz=mz/len,analog=Math.min(1,len);
        tx=(lx*cos+lz*sin)*speed*analog;
        tz=(-lx*sin+lz*cos)*speed*analog;
      }
      this._moveDir.set(tx,0,tz).normalize();
      this._lastMoveDir.copy(this._moveDir);
    } else this._moveDir.set(0,0,0);
    const k = 1 - Math.exp(-(g.p812Enabled?17:10) * dt);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;

    // 冲刺中水平速度强制为前向 DASH_SPEED，且不累积重力
    const dashing = this.dashT >= 0;
    if (dashing) {
      this.dashT += dt;
      const fwd = g.p6Enabled ? this._dashDir : this.getForward();
      this.vel.x = fwd.x * this._dashSpeed;
      this.vel.z = fwd.z * this._dashSpeed;
      if(!g.p7Enabled || this.onGround)this.vel.y = 0;
      if (this._dashTrailFallback && g.effects && (!g.p812Enabled || this.dashT<0.05 || this.dashT>0.11)) {
        g.effects.spawnBurst(
          _tmpV1.set(this.group.position.x, this.group.position.y + 1.0, this.group.position.z),
          '#eef4f8', 5, 2.5, 0.35, 0.14
        );
      }
      if (this.dashT >= this._dashDuration) this.dashT = -1;
    }

    if(g.p7Enabled){
      if(input.justPressed.has('Space'))this._jumpBufferT=0.2;
      this._jumpBufferT=Math.max(0,this._jumpBufferT-dt);
    }
    const wantJump=g.p7Enabled?this._jumpBufferT>0:input.justPressed.has('Space');
    let furyHandledJump=false;
    if(wantJump && !inWater && !dashing && this.fury &&
       (this.fury.isHolding() || this.fury.isRunning())){
      furyHandledJump=this.fury.jumpFromWall();
      // A failed wall-climb cannot fall through to a cheaper double jump.
      if(!furyHandledJump){this._jumpBufferT=0;furyHandledJump=true;}
      if(furyHandledJump)this._jumpBufferT=0;
    }
    if(wantJump && !furyHandledJump && !inWater && !dashing){
      if(this.onGround && stats.useStamina(8)){
        this.vel.y=9.5;this.onGround=false;this._jumpCount=1;this._jumpBufferT=0;
        if(g.p14Enabled)g.combat?.keepAirCombo('jump');
      }else if(g.p6Enabled && !this.onGround && this._jumpCount===1 && stats.useStamina(12)){
        this.vel.y=8.8;this._jumpCount=2;this._jumpBufferT=0;
        if(this.fury)this.fury.beginFlip(mx,mz);
        if(g.p14Enabled)g.combat?.keepAirCombo('double-jump');
        if(g.p810Enabled){
          // Keep a steady airborne pose. Jump_Full_Short on a second impulse
          // makes the head snap on the KayKit rig at mobile frame rates.
          this._jumpAnimT=0;this._jumpAnimStarted=false;
          this._secondJumpVfxT=0.18;
        }else{this._jumpAnimT=0.34;this._jumpAnimStarted=false;}
      }else if(g.p7Enabled&&this._jumpCount>=2)this._jumpBufferT=0;
    }

    if(this.fury && !inWater)this.fury.update(dt,moving,this._moveDir.x,this._moveDir.z);
    if (!dashing && !this.fury?.isHolding()) this.vel.y -= 26 * dt;
    const previousFootY=this.group.position.y;
    // Small collision steps prevent dash from tunnelling through buildings/well.
    const steps = g.p6Enabled ? Math.max(1,Math.ceil(Math.hypot(this.vel.x*dt,this.vel.z*dt)/0.35)) : 1;
    for(let step=0;step<steps;step++){
    const prevX = this.group.position.x;
    const prevZ = this.group.position.z;
    this.group.position.x += this.vel.x * dt / steps;
    this.group.position.z += this.vel.z * dt / steps;
    this.group.position.y += this.vel.y * dt / steps;

    // 室内墙体无碰撞网格：按房间可行走范围夹取，防普通移动/旋风冲刺穿墙出屋（inside 状态脱节）
    if (g.interiors && g.interiors.inside && typeof g.interiors.constrain === 'function') {
      g.interiors.constrain(this.group.position, prevX, prevZ);
    }

    // 室外房屋墙体同样无碰撞网格：对房屋 OBB / 水井圆柱按最小穿透轴做位置推出，防步行与旋风冲刺穿屋
    if (!(g.interiors && g.interiors.inside) && g.structures && g.structures.colliders) {
      const p = this.group.position;
      const R = 0.45; // 玩家水平半径
      for (const c of g.structures.colliders) {
        const cos = Math.cos(c.ry), sin = Math.sin(c.ry);
        const dx = p.x - c.x, dz = p.z - c.z;
        // 世界 → 房屋局部（绕 -ry）：lx=dx·cos-dz·sin, lz=dx·sin+dz·cos
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        const px = c.hw + R - Math.abs(lx);
        const pz = c.hd + R - Math.abs(lz);
        if (px <= 0 || pz <= 0) continue;
        let ox = 0, oz = 0;
        if (px < pz) ox = lx >= 0 ? px : -px;
        else oz = lz >= 0 ? pz : -pz;
        p.x += ox * cos + oz * sin;
        p.z += oz * cos - ox * sin;
      }
      const circles = g.structures.circleColliders;
      if (circles) {
        for (const c of circles) {
          const dx = p.x - c.x, dz = p.z - c.z;
          const d2 = dx * dx + dz * dz;
          const min = c.r + R;
          if (d2 >= min * min || d2 < 1e-6) continue;
          const dd = Math.sqrt(d2);
          p.x = c.x + (dx / dd) * min;
          p.z = c.z + (dz / dd) * min;
        }
      }
    }
    if(g.p7Enabled && !(g.interiors && g.interiors.inside) && g.scatter?.obstacles){
      const foot=this.group.position.y;
      g.scatter.obstacles.collide(this.group.position,0.43,foot);
    }

    }

    const fallSpeed = Math.max(0, -this.vel.y);

    const ground = terrain.getHeight(this.group.position.x, this.group.position.z);
    const baseFloor = ground < terrain.waterY - 0.6 ? terrain.waterY - 0.4 : ground;
    const platform=this.fury && this.vel.y<=0 && !this.fury.isHolding()
      ?landingRock(g,this.group.position.x,this.group.position.z,previousFootY,this.group.position.y):null;
    const floor=platform?Math.max(baseFloor,platform.top):baseFloor;
    if(this.fury?.isHolding()){
      this.vel.y=0;this.onGround=false;
    }else if (this.group.position.y <= floor) {
      this.group.position.y = floor;
      this.vel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = this.group.position.y - floor < 0.02;
    }

    if(this.onGround){
      this._jumpCount=0;this._airDashUsed=false;this._airDashCount=0;
      if(this.fury && this.fury.flipT>=0)this.fury.flipT=-1;
    }
    if(g.p810Enabled&&this._secondJumpVfxT>0){
      this._secondJumpVfxT=Math.max(0,this._secondJumpVfxT-dt);
      if(this._secondJumpVfxT>0.11 && this._secondJumpVfxT-dt<=0.11 && g.effects){
        g.effects.spawnBurst(_tmpV2.copy(this.pos).add(new THREE.Vector3(0,0.35,0)),'#83e1ff',5,1.1,0.22,0.13);
      }
    }
    const horizSpeed = Math.hypot(this.vel.x, this.vel.z);

    // 水花钩子：入水/出水溅起、游动涟漪
    const wet = inWater && this.group.position.y < terrain.waterY + 0.5;
    if (g.water && g.water.splash) {
      if (wet !== this._inWater) {
        const splashPos = new THREE.Vector3(this.group.position.x, terrain.waterY + 0.05, this.group.position.z);
        if (wet) {
          g.water.splash(splashPos, Math.min(1, horizSpeed / 8 + fallSpeed / 9));
        } else {
          g.water.splash(splashPos, 0.25);
        }
      }
      if (wet && horizSpeed > 1.5) {
        this._rippleT -= dt;
        if (this._rippleT <= 0) {
          this._rippleT = 0.4;
          g.water.splash(new THREE.Vector3(this.group.position.x, terrain.waterY + 0.05, this.group.position.z), 0.12);
        }
      } else {
        this._rippleT = 0;
      }
    }
    this._inWater = wet;

    this.updateTorch();

    let targetYaw = this.bodyYaw;
    if(g.p7Enabled){
      if(this.dashT>=0){targetYaw=this.bodyYaw;}
      else if(this.attackT>=0 || this.castT>=0){
        const target=this.attackT>=0?g.combat?._attackTarget:(g.combat?._castTarget||g.targeting?.locked);
        if(target?.alive){
          targetYaw=angleTo(target.group.position.x-this.pos.x,target.group.position.z-this.pos.z);
        }else targetYaw=this.bodyYaw;
      }else if(horizSpeed>0.5)targetYaw=angleTo(this.vel.x,this.vel.z);
    }else if(g.p6Enabled && this.dashT>=0 && this.dashClip){
      targetYaw=this.yaw;
    } else if (this.attackT >= 0 || this.castT >= 0) {
      const target=g.p6Enabled && g.targeting && this.attackT>=0 ? g.targeting.get(4.8) : null;
      if(target){
        const dx=target.group.position.x-this.pos.x,dz=target.group.position.z-this.pos.z;
        targetYaw=Math.atan2(-dx,-dz);
      } else targetYaw=this.yaw;
    } else if (horizSpeed > 0.5)targetYaw = Math.atan2(-this.vel.x, -this.vel.z);
    let dy = targetYaw - this.bodyYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.bodyYaw += (g.p7Enabled?wrapAngle(targetYaw-this.bodyYaw):dy) * (1 - Math.exp(-(g.p7Enabled && this.attackT>=0?32:12) * dt));
    this.rig.root.rotation.y = this.bodyYaw + MODEL_YAW_OFFSET;

    this.animate(dt, horizSpeed);
    this.updateCamera(dt);
    this.updateInteract();
  }

  actionTimeScale(clipName) {
    const clip = this.rig.clips.get(clipName);
    return clip ? clip.duration / (this.actionDuration || ACTION_DURATION) : 1;
  }

  animate(dt, horizSpeed) {
    if (this.attackT >= 0) {
      this.attackT += dt / (this.actionDuration || ACTION_DURATION);
      if (this.attackT > 1) {
        this.attackT = -1;
        this._attackAnimStarted = false;
      }
    }
    if (this.castT >= 0) {
      this.castT += dt / ACTION_DURATION;
      if (this.castT > 1) {
        this.castT = -1;
        this._castAnimStarted = false;
      }
    }

    if(this._jumpAnimT>0)this._jumpAnimT=Math.max(0,this._jumpAnimT-dt);
    if(this.dashT>=0 && this.dashClip && this.game.p6Enabled){
      if(!this._dashAnimStarted){
        this._dashAnimStarted=true;
        const clip=this.rig.clips.get(this.dashClip);
        const scale=clip ? clip.duration/this._dashDuration : 1;
        this.rig.play(this.dashClip,{once:true,fade:0.04,timeScale:scale});
      }
    } else if (this.attackT >= 0 && this.attackT < 1) {
      if (!this._attackAnimStarted) {
        this._attackAnimStarted = true;
        const name=this.rig.clips.has(this.attackClip) ? this.attackClip : ATTACK_CLIP;
        this.rig.play(name,{once:true,fade:0.06,timeScale:this.actionTimeScale(name)});
      }
    } else if (this.castT >= 0 && this.castT < 1) {
      if (!this._castAnimStarted) {
        this._castAnimStarted = true;
        this.rig.play(CAST_CLIP, { once: true, fade: 0.08, timeScale: this.actionTimeScale(CAST_CLIP) });
      }
    } else if(this._jumpAnimT>0 && this.game.p6Enabled && this.rig.clips.has('Jump_Full_Short')){
      if(!this._jumpAnimStarted){
        this._jumpAnimStarted=true;
        const clip=this.rig.clips.get('Jump_Full_Short');
        this.rig.play('Jump_Full_Short',{once:true,fade:0.06,
          timeScale:clip.duration/0.34});
      }
    } else if(this.fury?.isHolding()){
      this.rig.play('Jump_Idle');
    } else if(this.fury?.isRunning()){
      this.rig.play('Running_A',{timeScale:1.15});
    } else if (!this.onGround) {
      this.rig.play('Jump_Idle');
    } else if (horizSpeed > 7) {
      // 上限防冲刺时（52）动画快进失真
      this.rig.play('Running_A', { timeScale: Math.min(1.6, horizSpeed / 9) });
    } else if (horizSpeed > 0.6) {
      this.rig.play('Walking_A', { timeScale: Math.max(0.8, horizSpeed / 6) });
    } else {
      this.rig.play('Idle');
    }

    this.rig.update(dt);
    if(this.fury)this.fury.animate(dt);
  }

  updateCamera(dt) {
    const cam = this.game.camera;
    const terrain = this.game.terrain;

    if (this.firstPerson) {
      this.rig.root.visible = false;
      cam.position.set(
        this.group.position.x,
        this.group.position.y + this.eyeHeight,
        this.group.position.z
      );
      cam.rotation.order = 'YXZ';
      cam.rotation.set(this.pitch, this.yaw, 0);
    } else {
      this.rig.root.visible = true;
      const target = _tmpV1.copy(this.group.position);
      target.y += 1.7;
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      _tmpV2.set(
        Math.sin(this.yaw) * cp * this.camDist,
        -sp * this.camDist,
        Math.cos(this.yaw) * cp * this.camDist
      );
      const goal=_tmpV3.copy(target).add(_tmpV2);
      if(this.game.p6Enabled){
        const fraction=cameraSafeFraction(this.game,target,goal);
        goal.copy(target).addScaledVector(_tmpV2,fraction);
        const safeDistance=this.camDist*fraction;
        if(!this._cameraReady || (fraction<0.99 && cam.position.distanceTo(target)>safeDistance+0.25))
          cam.position.copy(goal);
        else cam.position.lerp(goal,1-Math.exp(-(this.game.p810Enabled?(this.cameraSmoothing||12):12)*dt));
      }else cam.position.copy(goal);
      this._cameraReady=true;
      const minY=terrain.getHeight(cam.position.x,cam.position.z)+0.5;
      if(cam.position.y<minY)cam.position.y=minY;
      cam.lookAt(target);
    }

    if (this.shakeT > 0) {
      cam.position.x += (Math.random() - 0.5) * 2 * this.shakeT;
      cam.position.y += (Math.random() - 0.5) * 2 * this.shakeT;
      cam.position.z += (Math.random() - 0.5) * 2 * this.shakeT;
      this.shakeT *= Math.exp(-6 * dt);
      if (this.shakeT < 0.001) this.shakeT = 0;
    }
  }

  updateInteract() {
    const g = this.game;
    const p = this.group.position;
    let best = null;
    let bestDist = Infinity;

    if (g.npcs && g.npcs.list) {
      for (const npc of g.npcs.list) {
        const d = _tmpV3.copy(npc.group.position).sub(p).length();
        if (d < 3.5 && d < bestDist) {
          bestDist = d;
          best = { text: 'Hablar con '+npc.name, exec: () => g.npcs.startDialogue(npc) };
        }
      }
    }

    // 门交互（严格优先于宝箱）：室外扫可进入的门，室内扫出口
    let doorFound = false;
    if (g.interiors) {
      if (!g.interiors.inside) {
        if (g.structures && g.structures.enterableDoors) {
          for (const door of g.structures.enterableDoors) {
            const d = _tmpV3.copy(door.pos).sub(p).length();
            if (d < 2.8 && d < bestDist) {
              bestDist = d;
              best = { text: 'E ' + door.label, exec: () => g.interiors.enter(door) };
              doorFound = true;
            }
          }
        }
      } else if (g.interiors.doors) {
        for (const door of g.interiors.doors) {
          const d = _tmpV3.copy(door.pos).sub(p).length();
          if (d < 2.8 && d < bestDist) {
            bestDist = d;
            best = { text: 'E ' + door.label, exec: () => g.interiors.exit() };
            doorFound = true;
          }
        }
      }
    }

    if (g.structures && g.structures.chests && !doorFound) {
      for (const chest of g.structures.chests) {
        if (chest.opened) continue;
        const d = _tmpV3.copy(chest.pos).sub(p).length();
        if (d < 3 && d < bestDist) {
          bestDist = d;
          best = { text: 'E 打开宝箱', exec: () => g.inventory.openChest(chest) };
        }
      }
    }

    if (g.enemies && g.enemies.lootDrops) {
      for (const drop of g.enemies.lootDrops) {
        const d = _tmpV3.copy(drop.pos).sub(p).length();
        if (d < 3 && d < bestDist) {
          bestDist = d;
          best = { text: 'E 拾取战利品', exec: () => g.inventory.pickupDrop(drop) };
        }
      }
    }

    if (best) {
      g.hud.prompt(best.text);
      if (g.input.justPressed.has('KeyE') && !(g.p14Enabled && this.fury?.isHolding())) best.exec();
    } else {
      g.hud.prompt(null);
    }
  }

  reset() {
    const sx = 8, sz = 70;
    this.group.position.set(sx, this.game.terrain.getHeight(sx, sz), sz);
    this.vel.set(0, 0, 0);
    this.onGround = false;
    this.attackT = -1;
    this.castT = -1;
    this._attackAnimStarted = false;
    this._castAnimStarted = false;
    this.shakeT = 0;
    this.firstPerson = false;
    this.camDist = 6;
    this._inWater = false;
    this._rippleT = 0;
    this.dashT=-1;
    this._dashTrailFallback=false;
    this._dashSpeed=DASH_SPEED;
    this._dashDuration=DASH_DURATION;
    this._moveDir.set(0,0,0);this._lastMoveDir.set(0,0,0);
    this._torchStashedOffhand=null;this._secondJumpVfxT=0;
    this._airDashCount=0;this._jumpBufferT=0;
    this._jumpCount=0;this._airDashUsed=false;this._cameraReady=false;
    this.attackClip=ATTACK_CLIP;this.actionDuration=ACTION_DURATION;
    this.dashClip=null;this._dashAnimStarted=false;
    this._jumpAnimT=0;this._jumpAnimStarted=false;
    this.torchOn = false;
    this.updateTorch();
    this.faceVillage();
    this.bodyYaw = this.yaw;
    this.rig.root.rotation.y = this.bodyYaw + MODEL_YAW_OFFSET;
    if(this.fury)this.fury.reset();
    this.rig.root.visible = true;
    this.rig.play('Idle', { fade: 0 });
    this.currentWeapon = null;
    this.currentArmor = null;
    this.currentOffhand=null;
    if(this._offhandSword){this._offhandSword.removeFromParent();this._offhandSword=null;}
    this.applyEquipment();
  }
}
