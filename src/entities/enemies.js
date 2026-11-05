import * as THREE from 'three';

const WOLF_PACK_HOMES = [
  { x: 120, z: 160 },
  { x: -150, z: 120 },
  { x: 80, z: -180 },
];
const WOLF_OFFSETS = [[0, 0], [4.2, 2.6], [-3.6, 3.4]];
const COS35 = Math.cos((35 * Math.PI) / 180);

// 雪原高台Lobo helado群（PLATEAU 380,-150，4 只一群，120s 重生）
const ICE_PACK_HOME = { x: 380, z: -150 };
const ICE_WOLF_OFFSETS = [[0, 0], [4.5, 2.5], [-4, 3.5], [2, -4.5]];
const ICE_TINT = new THREE.Color(0xcfe0ea);

// 风暮地穴Draugr（BARROW_ORIGIN -3000,34,-3000，沿入口->回廊->圆厅->王座厅路径摆放）
const BARROW_ORIGIN = { x: -3000, z: -3000 };
const BARROW_DRAUGR = [
  { dx: 0, dz: 16, variant: 'warrior' },   // 回廊
  { dx: 2.6, dz: 31, variant: 'warrior' }, // 圆厅
  { dx: -2.6, dz: 33, variant: 'mage' },   // 圆厅
];
const BARROW_BOSS_OFFSET = { dx: 0, dz: 52 }; // 王座厅

const MAGE_MIN_DIST = 10;
const MAGE_MAX_DIST = 16;
const MAGE_CAST_CD = 2.4;
const MAGE_BOLT_SPEED = 18;
const MAGE_BOLT_LIFE = 2.5;
const AWAKEN_SEC = 1.5;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function angLerp(a, b, t) { return a + angDiff(b, a) * t; }

export class Enemies {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.lootDrops = [];
    this.bolts = [];
    this.dragon = null;
    this.packs = [];
    this.pendingRespawns = [];
    // Active ONLY in /lab.html: no wandering packs, NPC attackers or bosses.
    // Works at /lab.html AND the independent GitHub Pages /index.html root.
    // The original main demo never includes the Skill Lab entrypoint.
    this.trainingLab=!!document.querySelector(
      'script[type="module"][src$="/src/skillslab/boot.js"]'
    ) || location.pathname.endsWith('/lab.html');
    // L24: ONE laboratory and ONE island scene, always 3 grounded skeleton
    // training enemies on one side + ONE real flying Quaternius dragon opposite.
    // No ?hf_fly toggle, no duplicate environments and no enemy AI or rewards.
    this.trainingCount=this.trainingLab?3:0;
    this.trainingFlight=false;
    this.geoCache = new Map();
    this.sackMat = new THREE.MeshStandardMaterial({ color: 0x7a5c34, roughness: 0.8, metalness: 0, emissive: 0xc9a86a, emissiveIntensity: 0.45 });
    this.knotMat = new THREE.MeshStandardMaterial({ color: 0x5a4426, roughness: 1, metalness: 0 });
    this.boltGeo = new THREE.SphereGeometry(0.16, 8, 6);
    this.boltMat = new THREE.MeshBasicMaterial({
      color: 0x7fd4ff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.spawnAll();
  }

  _geo(key, make) {
    let g = this.geoCache.get(key);
    if (!g) { g = make(); this.geoCache.set(key, g); }
    return g;
  }

  _boxGeo(w, h, d) {
    return this._geo('b' + w + ',' + h + ',' + d, () => new THREE.BoxGeometry(w, h, d));
  }

  _groundAt(x, z) {
    const t = this.game.terrain;
    return Math.max(t.getHeight(x, z), t.waterY + 0.3);
  }

  _attachRig(e, key, parent = e.group) {
    const rig = this.game.assets.spawn(key);
    e.rig = rig;
    parent.add(rig.root);
    rig.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      // AssetLib 只对 SkinnedMesh 做了 per-spawn 材质克隆；挂在骨骼上的静态武器仍共享材质，
      // 这里补克隆，避免受击红闪串到其他个体
      if (!o.isSkinnedMesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.emissive) e.mats.push({ m, e: m.emissive.getHex(), i: m.emissiveIntensity });
      }
    });
    return rig;
  }

  _loco(e, name, timeScale = 1) {
    if (e.animLock > 0) return;
    e.rig.play(name, { timeScale });
  }

  // fitSec > 0 时把片段压缩/拉伸到 fitSec 秒；返回前禁止 locomotion 覆盖
  _once(e, name, fitSec = 0) {
    const clip = e.rig.clips.get(name);
    const dur = clip ? clip.duration : Math.max(fitSec, 0.5);
    const timeScale = fitSec > 0 ? dur / fitSec : 1;
    e.rig.play(name, { once: true, timeScale, fade: 0.12 });
    e.animLock = Math.max(e.animLock, fitSec > 0 ? fitSec : dur);
  }

  spawnAll() {
    // Only isolated Skills Lab: 3 grounded skeleton rigs + one actual dragon.
    // Principal P16 world spawning at / remains entirely unaffected.
    if (this.trainingLab) {
      this.packs = [];
      this.configureTrainingTargets(this.trainingCount);
      return;
    }
    this.packs = WOLF_PACK_HOMES.map((h) => ({ home: h, members: [], respawnT: -1, ice: false, respawnDelay: 90 }));
    this.packs.push({ home: ICE_PACK_HOME, members: [], respawnT: -1, ice: true, respawnDelay: 120 });
    for (let pi = 0; pi < this.packs.length; pi++) this._spawnPack(pi);
    const sc = this.game.structures.stonesCenter;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const variant = (i === 1 || i === 4) ? 'mage' : 'warrior';
      this._spawnDraugr(sc.x + Math.cos(a) * 22, sc.z + Math.sin(a) * 22, variant);
    }
    this._spawnBarrowDraugr();
    this._spawnDragon();
    if(this.game.p16Enabled && new URLSearchParams(location.search).has('hf_training'))
      this._spawnTrainingDummy();
  }

  configureTrainingTargets(count = 1) {
    if (!this.trainingLab) return false;
    this.trainingCount = 3; // Fixed unified four-enemy island setup.
    // Remove only training targets, never a shared enemy object or P16 world entity.
    for (const e of this.list) if (e.training && !e.removed) this._removeEnemy(e);
    this.list = this.list.filter(e => !e.training);
    // Combat.collectTargets() must not keep a removed training dragon separately.
    this.dragon=null;
    this.pendingRespawns.length = 0;
    this.bolts.length = 0;
    this.packs.length = 0;
    const p = this.game.player;
    const forward = p.getForward();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    // Three separated dummies on the FRONT side of the SAME flat island.
    const offsets=[[8.3,-3.8],[8.9,0],[8.3,3.8]];
    offsets.forEach(([distance,side],i) => {
      const spot=p.pos.clone().addScaledVector(forward,distance)
        .addScaledVector(right,side);
      this._spawnTrainingDummy(spot.x,spot.z,i);
    });
    // Opposite side, still on the same island. 15m lateral separation from
    // spawn keeps short 3D projectiles in range, while the two areas do not
    // overlap. Spawn relative to original player for reproducible resets.
    const dragonSpot=p.pos.clone().addScaledVector(forward,-14.3)
      .addScaledVector(right,1.3);
    this._spawnTrainingDragon(dragonSpot.x,dragonSpot.z,p.pos);
    return true;
  }

  _spawnTrainingDummy(x=null,z=null,index=0){
    const p=this.game.player.group.position;
    const px=x??p.x+5,pz=z??p.z-3;
    // Real licensed animated enemy, no geometric placeholder.
    const e=this._base('training','OBJETIVO '+(index+1)+' · COMBATE',2400,.9,px,pz);
    this._attachRig(e,'skeleton_warrior');
    e.training=true;e.aggroR=0;e.attackRange=0;e.speed=0;e.dmg=0;
    // All three skeletons stay ON THE GROUND; no more fake airborne skeleton.
    e.trainingFlight=false;e.flightOffset=0;
    e.hitPending=-1;e.boltPending=-1;e.attackCd=99;
    e.trainingLastHit=-1e6;e.hitstunT=0;
    e.rig.play('Idle');
    // Uses REAL HP loss for P16 hit-confirm, never dies, rewards or drops.
    // Idle stance is static, but its physics REACTS to P16 4th-hit launch.
    e.takeDamage=(amount,impulse)=>{
      const damage=Math.max(0,Math.min(500,Number(amount)||0));
      if(!Number.isFinite(damage)||damage<=0)return;
      e.hp=Math.max(1,e.hp-damage);
      e.trainingLastHit=this.game.time.elapsed;
      e.flashT=.12;
      if(impulse)e.kbVel.add(impulse);
      e.hitstunT=.25;
      if(e.rig.clips.has('HitReact'))e.rig.play('HitReact',{once:true,fade:.08});
      for(const mat of e.mats){
        mat.m.emissive.setHex(0xff3030);mat.m.emissiveIntensity=.9;
      }
    };
    return e;
  }

  _spawnTrainingDragon(x,z,face){
    // Real pre-existing Quaternius Dragon Evolved GLB + Flying_Idle clip.
    // Stays in the lab, is damageable, never chases, attacks, dies, drops loot
    // or awards XP. NO placeholder geometry, no duplicate separate spawner.
    const e=this._base('dragon','DRAGÓN VOLADOR · ENTRENAMIENTO',
      8000,2.8,x,z);
    this._attachRig(e,'dragon');
    e.training=true;e.trainingDragon=true;e.trainingFlight=true;
    e.flightOffset=7.0;
    e.group.position.y=this._groundAt(x,z)+e.flightOffset;
    e.home.copy(e.group.position);
    e.yaw=Math.atan2(face.x-x,face.z-z);
    e.group.rotation.y=e.yaw;
    e.aggroR=0;e.attackRange=0;e.speed=0;e.dmg=0;
    e.boss=true;e.hitPending=-1;e.boltPending=-1;e.attackCd=99;
    e.trainingLastHit=-1e6;e.hitstunT=0;
    e.rig.play('Flying_Idle',{timeScale:.45});
    e.takeDamage=(amount,_impulse)=>{
      const damage=Math.max(0,Math.min(8000,Number(amount)||0));
      if(!Number.isFinite(damage)||damage<=0)return;
      e.hp=Math.max(1,e.hp-damage);
      e.trainingLastHit=this.game.time.elapsed;
      e.flashT=.12;
      e.hitstunT=.2;
      for(const mat of e.mats){
        mat.m.emissive.setHex(0xff3030);mat.m.emissiveIntensity=.9;
      }
    };
    this.dragon=e;
    return e;
  }

  _spawnPack(pi) {
    const pack = this.packs[pi];
    const offs = pack.ice ? ICE_WOLF_OFFSETS : WOLF_OFFSETS;
    pack.members = offs.map((o) => this._spawnWolf(pack.home.x + o[0], pack.home.z + o[1], pi, pack.ice));
    pack.respawnT = -1;
  }

  _spawnBarrowDraugr() {
    for (let i = 0; i < BARROW_DRAUGR.length; i++) {
      const d = BARROW_DRAUGR[i];
      this._spawnDraugr(BARROW_ORIGIN.x + d.dx, BARROW_ORIGIN.z + d.dz, d.variant);
    }
    const boss = this._spawnDraugr(
      BARROW_ORIGIN.x + BARROW_BOSS_OFFSET.dx,
      BARROW_ORIGIN.z + BARROW_BOSS_OFFSET.dz,
      'warrior'
    );
    boss.boss = true;
    boss.name = 'Señor draugr';
    boss.hp = boss.maxHp = 150;
    boss.dmg = 22;
    boss.speed = 4.6;
    boss.aggroR = 16;
    boss.hitRadius = 1.2;
    boss.attackRange = 2.8;
    boss.rig.root.scale.multiplyScalar(1.15);
  }

  _base(type, name, hp, hitRadius, x, z) {
    const group = new THREE.Group();
    const y = this._groundAt(x, z);
    group.position.set(x, y, z);
    const e = {
      type, name, group,
      hp, maxHp: hp, alive: true, hitRadius,
      state: 'idle',
      home: new THREE.Vector3(x, y, z),
      yaw: Math.random() * Math.PI * 2,
      kbVel: new THREE.Vector3(),
      hitstunT:0,
      wanderTarget: new THREE.Vector3(x, y, z),
      wanderT: Math.random() * 3,
      cdT: 0, aggroT: 0, hitPending: -1, boltPending: -1,
      variant: '', awakened: true, awakenT: 0,
      animLock: 0,
      flashT: 0, deadT: 0, fallV: 0,
      slowT: 0, slowDur: 0, slowFactor: 1,
      fading: false, removed: false,
      rig: null, mats: [],
    };
    group.rotation.y = e.yaw;
    e.takeDamage = (dmg, kb) => this._takeDamage(e, dmg, kb);
    e.applySlow = (factor, seconds) => this._applySlow(e, factor, seconds);
    this.game.scene.add(group);
    this.list.push(e);
    return e;
  }

  _applySlow(e, factor, seconds) {
    if (!e.alive) return;
    let f = clamp(factor, 0, 1);
    if (e.type === 'dragon') f = Math.max(f, 0.7); // 巨龙体魄强健，减速效果打折
    e.slowFactor = f;
    e.slowT = Math.max(e.slowT, seconds);
    e.slowDur = Math.max(e.slowDur, seconds);
  }

  // Lobo helado皮毛染冰白色（per-spawn 克隆材质，安全），并把冰蓝微光写回 mats 基准值
  _tintIce(e) {
    e.rig.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.color) m.color.lerp(ICE_TINT, 0.6);
        if (m.emissive) {
          m.emissive.setHex(0x6fa8c8);
          m.emissiveIntensity = 0.06;
        }
      }
    });
    for (let i = 0; i < e.mats.length; i++) {
      e.mats[i].e = e.mats[i].m.emissive.getHex();
      e.mats[i].i = e.mats[i].m.emissiveIntensity;
    }
  }

  _spawnWolf(x, z, packIdx, ice = false) {
    const hp = ice ? 45 : 30 + (this.game.stats.level - 1) * 5;
    const e = this._base('wolf', ice ? 'Lobo helado' : 'Lobo', hp, 1.0, x, z);
    e.dmg = ice ? 12 : 8;
    e.speed = ice ? 8 : 7.5;
    e.aggroR = 28; e.attackRange = 2.3; e.attackCd = 1.3;
    e.packIdx = packIdx;
    e.ice = ice;
    this._attachRig(e, 'wolf');
    if (ice) this._tintIce(e);
    e.rig.play('Idle');
    e.rig.update(0.3 + Math.random() * 1.5);
    return e;
  }

  _spawnDraugr(x, z, variant = 'warrior') {
    const e = this._base('draugr', variant === 'mage' ? 'Draugr mago' : 'Draugr', 60, 1.0, x, z);
    e.dmg = 14; e.speed = 4.2; e.aggroR = 20; e.attackRange = 2.6; e.attackCd = 1.6;
    e.variant = variant;
    e.awakened = false;
    this._attachRig(e, variant === 'mage' ? 'skeleton_mage' : 'skeleton_warrior');
    e.rig.play('Idle');
    e.rig.update(0.3 + Math.random() * 1.5);
    return e;
  }

  _spawnDragon() {
    const perch = this.game.structures.perchPos;
    const group = new THREE.Group();
    const e = {
      type: 'dragon', name: 'Dragón antiguo', group,
      hp: 400, maxHp: 400, alive: true, hitRadius: 4.5,
      state: 'perch', sub: '', subT: 0,
      perch: perch.clone(),
      home: perch.clone(),
      vel: new THREE.Vector3(), kbVel: new THREE.Vector3(),
      yaw: Math.atan2(-perch.x, 40 - perch.z), pitch: 0, bank: 0,
      decideT: 0, flameT: 0, flameAcc: 0, flameDmgAcc: 0,
      circleAngle: 0, landPos: new THREE.Vector3(),
      cdT: 0, hitPending: -1,
      meleeAlt: false, hitReactT: 0,
      animLock: 0,
      flashT: 0, deadT: 0, fallV: 0,
      slowT: 0, slowDur: 0, slowFactor: 1,
      fading: false, removed: false,
      rig: null, pivot: null, mats: [],
    };
    e.takeDamage = (dmg, kb) => this._takeDamage(e, dmg, kb);
    e.applySlow = (factor, seconds) => this._applySlow(e, factor, seconds);

    e.pivot = new THREE.Group();
    group.add(e.pivot);
    this._attachRig(e, 'dragon', e.pivot);
    e.rig.play('Flying_Idle', { timeScale: 0.45 });
    e.rig.update(0.3);

    group.position.copy(perch);
    group.position.y += 1.4;
    group.rotation.y = e.yaw;
    this.game.scene.add(group);
    this.list.push(e);
    this.dragon = e;
  }

  _spawnDrop(x, z, items, gold) {
    const y = this._groundAt(x, z);
    const mesh = new THREE.Group();
    const sack = new THREE.Mesh(
      this._geo('sack', () => new THREE.SphereGeometry(0.3, 6, 5)),
      this.sackMat
    );
    sack.scale.set(1, 1.15, 1);
    mesh.add(sack);
    const knot = new THREE.Mesh(
      this._boxGeo(0.14, 0.14, 0.14),
      this.knotMat
    );
    knot.position.y = 0.36;
    mesh.add(knot);
    const pos = new THREE.Vector3(x, y + 0.55, z);
    mesh.position.copy(pos);
    this.game.scene.add(mesh);
    this.lootDrops.push({ mesh, pos, items, gold, t: Math.random() * 6 });
  }

  _awaken(e) {
    e.awakened = true;
    e.state = 'awaken';
    e.awakenT = AWAKEN_SEC;
    e.aggroT = Math.max(e.aggroT, 4);
    this._once(e, 'Skeletons_Awaken_Floor', AWAKEN_SEC);
  }

  _takeDamage(e, dmg, kb) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.flashT = 0.12;
    for (let i = 0; i < e.mats.length; i++) {
      e.mats[i].m.emissive.setHex(0xff3030);
      e.mats[i].m.emissiveIntensity = 0.9;
    }
    if (e.type === 'dragon') {
      if (e.state === 'perch') this._dragonRoarTakeoff(e);
      // animLock > 0 表示攻击/受击片段还在播，不打断
      if (e.hitReactT <= 0 && e.animLock <= 0) {
        e.hitReactT = 2;
        this._once(e, 'HitReact');
      }
    } else {
      if (kb) e.kbVel.add(kb);
      if (e.type === 'draugr' && !e.awakened) this._awaken(e);
      else if (e.state !== 'attack' && e.state !== 'awaken') e.state = 'chase';
      e.aggroT = 10;
    }
    if (e.hp <= 0) {
      e.hp = 0;
      this._die(e);
    }
  }

  _restoreMats(e) {
    for (let i = 0; i < e.mats.length; i++) {
      e.mats[i].m.emissive.setHex(e.mats[i].e);
      e.mats[i].m.emissiveIntensity = e.mats[i].i;
    }
  }

  _die(e) {
    const g = this.game;
    e.alive = false;
    e.state = 'dead';
    e.deadT = 0;
    e.fallV = 0;
    e.kbVel.set(0, 0, 0);
    e.boltPending = -1;
    e.hitPending = -1;
    this._once(e, e.type === 'draugr' ? 'Death_A' : 'Death');
    e.animLock = 1e9;
    e.slowT = 0;
    e.slowDur = 0;
    e.slowFactor = 1;

    let xp, items, gold;
    if (e.type === 'wolf') {
      if (e.ice) {
        xp = 30; items = ['wolf_pelt', 'frost_essence'];
        gold = 8 + Math.floor(Math.random() * 11);
      } else {
        xp = 20; items = ['wolf_pelt'];
        gold = 5 + Math.floor(Math.random() * 11);
      }
    } else if (e.type === 'draugr') {
      if (e.boss) {
        xp = 120; items = ['ancient_relic'];
        gold = 80 + Math.floor(Math.random() * 41);
      } else {
        xp = 35; items = ['draugr_bone'];
        gold = 10 + Math.floor(Math.random() * 16);
      }
    } else {
      xp = 300; items = ['dragon_bone', 'dragon_scale'];
      gold = 300;
    }
    g.stats.addXP(xp);
    // Lobo helado按独立类型上报：q1「狼患」只认Lobo
    g.quests.onEnemyKilled(e.ice ? 'ice_wolf' : e.type);
    this._spawnDrop(e.group.position.x, e.group.position.z, items, gold);

    if (e.type === 'draugr' && !e.boss) {
      this.pendingRespawns.push({ kind: 'draugr', t: 120, x: e.home.x, z: e.home.z, variant: e.variant });
    }
    if (e.type === 'dragon') {
      g.effects.spawnSoulStream(e.group.position.clone(), 2.5);
      g.hud.questBanner('Absorbiste el alma del dragón');
      g.audio.play('soul');
    }
  }

  _removeEnemy(e) {
    if (e.rig) e.rig.mixer.stopAllAction();
    this.game.scene.remove(e.group);
    for (let i = 0; i < e.mats.length; i++) e.mats[i].m.dispose();
    e.removed = true;
  }

  _updateDead(e, dt) {
    e.deadT += dt;
    const pos = e.group.position;
    if (e.type === 'dragon') {
      const ground = this._groundAt(pos.x, pos.z) + 1.2;
      if (pos.y > ground) {
        e.fallV += 30 * dt;
        pos.y = Math.max(ground, pos.y - e.fallV * dt);
      }
    } else {
      const ground = this._groundAt(pos.x, pos.z);
      if (pos.y > ground) pos.y += (ground - pos.y) * Math.min(1, 6 * dt);
    }
    if (e.deadT > 25) {
      if (!e.fading) {
        e.fading = true;
        for (let i = 0; i < e.mats.length; i++) e.mats[i].m.transparent = true;
      }
      const f = (e.deadT - 25) / 1.2;
      if (f >= 1) {
        this._removeEnemy(e);
      } else {
        for (let i = 0; i < e.mats.length; i++) e.mats[i].m.opacity = 1 - f;
      }
    }
  }

  _fireBolt(e, p) {
    const pos = e.group.position;
    const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
    mesh.position.set(pos.x, pos.y + 1.35, pos.z);
    _v3.set(p.x, p.y + 1.2, p.z).sub(mesh.position);
    if (_v3.lengthSq() < 1e-6) _v3.set(0, 0, 1);
    _v3.normalize();
    mesh.position.addScaledVector(_v3, 0.6);
    this.game.scene.add(mesh);
    this.bolts.push({ mesh, vel: _v3.clone().multiplyScalar(MAGE_BOLT_SPEED), life: MAGE_BOLT_LIFE });
    this.game.effects.spawnBurst(mesh.position, '#7fd4ff', 5, 3, 0.3, 0.1);
  }

  _updateBolts(dt, p) {
    const g = this.game;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      const bp = b.mesh.position;
      let gone = b.life <= 0;
      _v1.set(p.x, p.y + 1.0, p.z);
      if (bp.distanceTo(_v1) < 1.2) {
        g.stats.damage(12);
        g.effects.spawnBurst(bp, '#7fd4ff', 12, 7, 0.4, 0.14);
        gone = true;
      } else if (bp.y < g.terrain.getHeight(bp.x, bp.z) + 0.15 || bp.y < g.terrain.waterY) {
        g.effects.spawnBurst(bp, '#7fd4ff', 8, 5, 0.35, 0.12);
        gone = true;
      }
      if (gone) {
        g.scene.remove(b.mesh);
        this.bolts.splice(i, 1);
      }
    }
  }

  _updateGround(e, dt, p) {
    const g = this.game;
    const pos = e.group.position;
    const dx = p.x - pos.x;
    const dz = p.z - pos.z;
    const dist = Math.hypot(dx, dz);
    // HIGHFLY_P2_20261104: leash 50u wolves / 38u draugr from spawn.
    // No persistent aggro outside territory, no long cross-map chases.
    const dxHome = pos.x - e.home.x;
    const dzHome = pos.z - e.home.z;
    const homeDist = Math.hypot(dxHome, dzHome);
    const leash = e.type === 'wolf' ? 50 : 38;
    if (homeDist > leash && e.state !== 'return') {
      e.state = 'return';
      e.aggroT = 0;
      e.hitPending = -1;
      e.boltPending = -1;
      e.kbVel.set(0, 0, 0);
    }

    if (e.cdT > 0) e.cdT -= dt;
    if (e.aggroT > 0) e.aggroT -= dt;
    if (e.hitPending >= 0) {
      e.hitPending -= dt;
      if (e.hitPending < 0) {
        e.hitPending = -1;
        if (dist < e.attackRange + 0.9) g.stats.damage(e.dmg);
      }
    }
    if (e.boltPending >= 0) {
      e.boltPending -= dt;
      if (e.boltPending < 0) {
        e.boltPending = -1;
        this._fireBolt(e, p);
      }
    }

    let mx = 0, mz = 0, sp = 0;
    let faceX = 0, faceZ = 0, hasFace = false;

    if (this.game.p15Enabled && e.hitstunT>0){
      e.hitstunT=Math.max(0,e.hitstunT-dt);
      // Suppress enemy movement/attack while hit-reacting, but preserve kbVel physics.
      e.hitPending=-1;e.boltPending=-1;
      e.cdT=Math.max(e.cdT,.12);
    } else if (e.state === 'return') {
      const hx = e.home.x - pos.x;
      const hz = e.home.z - pos.z;
      const hd = Math.hypot(hx, hz);
      if (hd <= 1.8) {
        e.state = 'idle';
        e.wanderTarget.copy(e.home);
        e.wanderT = 2;
      } else {
        mx = hx / hd; mz = hz / hd;
        sp = e.speed * 0.9;
        faceX = mx; faceZ = mz; hasFace = true;
      }
    } else if (e.state === 'awaken') {
      faceX = dx; faceZ = dz; hasFace = true;
      e.awakenT -= dt;
      if (e.awakenT <= 0) e.state = 'chase';
    } else if (e.state === 'idle') {
      if (dist < e.aggroR) {
        e.aggroT = Math.max(e.aggroT, 4);
        if (e.type === 'draugr' && !e.awakened) this._awaken(e);
        else e.state = 'chase';
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 2.5 + Math.random() * 4;
          if (Math.random() < 0.35) {
            e.wanderTarget.copy(pos);
          } else {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 25;
            e.wanderTarget.set(e.home.x + Math.cos(a) * r, 0, e.home.z + Math.sin(a) * r);
          }
        }
        const wx = e.wanderTarget.x - pos.x;
        const wz = e.wanderTarget.z - pos.z;
        const wd = Math.hypot(wx, wz);
        if (wd > 1.4) {
          mx = wx / wd; mz = wz / wd;
          sp = e.speed * 0.42;
          faceX = mx; faceZ = mz; hasFace = true;
        }
      }
    } else if (e.state === 'chase') {
      if (e.variant === 'mage') {
        if (dist > 60 && e.aggroT <= 0) {
          e.state = 'idle';
          e.wanderT = 0;
        } else if (dist > 0.01) {
          faceX = dx; faceZ = dz; hasFace = true;
          if (dist > MAGE_MAX_DIST) {
            mx = dx / dist; mz = dz / dist;
            sp = e.speed;
          } else if (dist < MAGE_MIN_DIST) {
            mx = -dx / dist; mz = -dz / dist;
            sp = e.speed;
          }
          if (e.cdT <= 0 && dist < MAGE_MAX_DIST + 4) {
            e.cdT = MAGE_CAST_CD;
            e.boltPending = 0.35;
            this._once(e, 'Spellcast_Shoot');
          }
        }
      } else if (dist < e.attackRange) {
        e.state = 'attack';
      } else if (dist > 60 && e.aggroT <= 0) {
        e.state = 'idle';
        e.wanderT = 0;
      } else if (dist > 0.01) {
        mx = dx / dist; mz = dz / dist;
        sp = e.speed;
        faceX = mx; faceZ = mz; hasFace = true;
      }
    } else if (e.state === 'attack') {
      faceX = dx; faceZ = dz; hasFace = true;
      if (dist > e.attackRange * 1.7) {
        e.state = 'chase';
      } else if (e.cdT <= 0) {
        e.cdT = e.attackCd;
        e.hitPending = 0.2;
        if (e.type === 'wolf') this._once(e, 'Attack', 0.8);
        else this._once(e, '1H_Melee_Attack_Slice_Diagonal');
      }
    }

    if (e.slowT > 0) sp *= e.slowFactor; // 凛冬之息减速（动画速率随 sp 同步变慢）

    pos.x += (mx * sp + e.kbVel.x) * dt;
    pos.z += (mz * sp + e.kbVel.z) * dt;
    const decay = Math.exp(-5 * dt);
    e.kbVel.x *= decay;
    e.kbVel.z *= decay;
    const ground = this._groundAt(pos.x, pos.z);
    if (e.kbVel.y > 0 || pos.y > ground + 0.02) {
      pos.y += e.kbVel.y * dt;
      e.kbVel.y -= 26 * dt;
      if (pos.y <= ground) { pos.y = ground; e.kbVel.y = 0; }
    } else {
      pos.y = ground;
      e.kbVel.y = 0;
    }

    if (hasFace) {
      e.yaw = angLerp(e.yaw, Math.atan2(faceX, faceZ), 1 - Math.exp(-9 * dt));
      e.group.rotation.y = e.yaw;
    }

    e.animLock -= dt;
    if (e.animLock <= 0) {
      if (sp > 0.1) {
        if (e.type === 'wolf') {
          if (e.state === 'chase') this._loco(e, 'Gallop', sp / 7);
          else this._loco(e, 'Walk');
        } else if (e.variant === 'mage') {
          this._loco(e, 'Walking_A', Math.max(0.8, sp / 4.2));
        } else {
          this._loco(e, 'Walking_D_Skeletons');
        }
      } else {
        this._loco(e, 'Idle');
      }
    }
    e.rig.update(dt);
  }

  _dragonRoarTakeoff(e) {
    this.game.audio.play('dragon_roar');
    this.game.player.addShake(0.3);
    this._toTakeoff(e);
  }

  _toTakeoff(e) {
    e.state = 'takeoff';
    e.sub = '';
    e.subT = 0;
    const pos = e.group.position;
    e.circleAngle = Math.atan2(pos.z - e.perch.z, pos.x - e.perch.x);
    e.vel.set(Math.sin(e.yaw) * 7, 7, Math.cos(e.yaw) * 7);
  }

  _circleY(e) {
    return e.perch.y + 40 + Math.sin(this.game.time.elapsed * 0.25) * 5;
  }

  _steer(e, target, speed, dt, turn) {
    if (e.slowT > 0) speed *= e.slowFactor;
    const pos = e.group.position;
    _v3.copy(target).sub(pos);
    const d = _v3.length();
    if (d > 0.001) _v3.multiplyScalar(speed / d);
    e.vel.lerp(_v3, 1 - Math.exp(-turn * dt));
    pos.addScaledVector(e.vel, dt);
    const hs = Math.hypot(e.vel.x, e.vel.z);
    if (hs > 0.5) {
      const prev = e.yaw;
      e.yaw = angLerp(e.yaw, Math.atan2(e.vel.x, e.vel.z), 1 - Math.exp(-3 * dt));
      const rate = angDiff(e.yaw, prev) / Math.max(dt, 1e-4);
      e.bank += (clamp(-rate * 0.55, -0.65, 0.65) - e.bank) * (1 - Math.exp(-4 * dt));
      e.pitch += (clamp(Math.atan2(e.vel.y, hs) * 0.8, -0.7, 0.7) - e.pitch) * (1 - Math.exp(-4 * dt));
    }
  }

  _breathFlames(e, dt, p) {
    const g = this.game;
    const pos = e.group.position;
    const yawSin = Math.sin(e.yaw);
    const yawCos = Math.cos(e.yaw);
    _v2.set(pos.x + yawSin * 4.8, pos.y + 1.2, pos.z + yawCos * 4.8);
    _v3.set(p.x, p.y + 1, p.z).sub(_v2);
    const d = Math.min(_v3.length(), 25) || 1;
    _v3.normalize();
    e.flameAcc -= dt;
    while (e.flameAcc <= 0) {
      e.flameAcc += 0.08;
      const ft = 0.15 + Math.random() * 0.8;
      g.effects.spawnBurst(
        new THREE.Vector3(_v2.x + _v3.x * d * ft, _v2.y + _v3.y * d * ft, _v2.z + _v3.z * d * ft),
        '#ff7426', 5, 10, 0.32, 0.24
      );
    }
    e.flameDmgAcc -= dt;
    if (e.flameDmgAcc <= 0) {
      e.flameDmgAcc += 0.45;
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      const fd = Math.hypot(dx, dz) || 1;
      if (pos.distanceToSquared(p) < 16 * 16 && (dx / fd) * yawSin + (dz / fd) * yawCos > COS35) {
        g.stats.damage(7);
      }
    }
  }

  _updateDragon(e, dt) {
    const g = this.game;
    const p = g.player.pos;
    const pos = e.group.position;
    if (e.cdT > 0) e.cdT -= dt;
    if (e.hitReactT > 0) e.hitReactT -= dt;
    e.animLock -= dt;

    let loco = 'Fast_Flying';
    let locoTs = 1;

    if (e.state === 'perch') {
      loco = 'Flying_Idle';
      locoTs = 0.45;
      e.pitch *= Math.exp(-3 * dt);
      e.bank *= Math.exp(-3 * dt);
      if (pos.distanceToSquared(p) < 70 * 70 || g.quests.getState('q3') === 'active') {
        this._dragonRoarTakeoff(e);
      }
    } else if (e.state === 'takeoff') {
      e.subT += dt;
      const spd = Math.min(26, 10 + e.subT * 7);
      _v1.set(
        e.perch.x + Math.cos(e.circleAngle) * 80,
        this._circleY(e),
        e.perch.z + Math.sin(e.circleAngle) * 80
      );
      this._steer(e, _v1, spd, dt, 1.5);
      if (pos.distanceToSquared(_v1) < 14 * 14 || e.subT > 7) {
        e.state = 'circle';
        e.decideT = 7 + Math.random() * 5;
      }
    } else if (e.state === 'circle') {
      const ca = Math.atan2(pos.z - e.perch.z, pos.x - e.perch.x);
      _v1.set(
        e.perch.x + Math.cos(ca + 0.5) * 80,
        this._circleY(e),
        e.perch.z + Math.sin(ca + 0.5) * 80
      );
      this._steer(e, _v1, 26, dt, 1.5);
      e.decideT -= dt;
      if (e.decideT <= 0) {
        e.decideT = 7 + Math.random() * 5;
        if (Math.random() < 0.6) {
          e.state = 'breath';
          e.sub = 'dive';
          e.subT = 0;
        } else {
          e.state = 'land';
          e.sub = 'descend';
          e.subT = 0;
          _v2.copy(pos).sub(p);
          _v2.y = 0;
          const l = _v2.length() || 1;
          _v2.multiplyScalar(8 / l);
          e.landPos.set(p.x + _v2.x, 0, p.z + _v2.z);
          e.landPos.y = this._groundAt(e.landPos.x, e.landPos.z);
        }
      }
    } else if (e.state === 'breath') {
      if (e.sub === 'dive') {
        e.subT += dt;
        _v1.set(p.x, p.y + 7, p.z);
        this._steer(e, _v1, 30, dt, 1.8);
        if (pos.distanceToSquared(p) < 22 * 22 || e.subT > 7) {
          e.sub = 'flame';
          e.flameT = 2.2;
          e.flameAcc = 0;
          e.flameDmgAcc = 0;
        }
      } else if (e.sub === 'flame') {
        const hl = Math.hypot(e.vel.x, e.vel.z) || 1;
        _v1.set(p.x + (e.vel.x / hl) * 26, p.y + 11, p.z + (e.vel.z / hl) * 26);
        this._steer(e, _v1, 15, dt, 1.1);
        this._breathFlames(e, dt, p);
        e.flameT -= dt;
        if (e.flameT <= 0) {
          e.sub = 'climb';
          e.subT = 0;
        }
      } else {
        e.subT += dt;
        const ca = Math.atan2(pos.z - e.perch.z, pos.x - e.perch.x);
        _v1.set(
          e.perch.x + Math.cos(ca + 0.35) * 80,
          this._circleY(e),
          e.perch.z + Math.sin(ca + 0.35) * 80
        );
        this._steer(e, _v1, 24, dt, 1.3);
        if (pos.y > this._circleY(e) - 5 || e.subT > 8) e.state = 'circle';
      }
    } else if (e.state === 'land') {
      if (e.sub === 'descend') {
        loco = 'Flying_Idle';
        e.subT += dt;
        _v1.copy(e.landPos);
        _v1.y += 1.8;
        this._steer(e, _v1, 17, dt, 1.7);
        if (pos.distanceToSquared(_v1) < 9 || e.subT > 9) {
          e.sub = 'ground';
          e.subT = 8;
          e.vel.set(0, 0, 0);
        }
      } else {
        loco = 'Flying_Idle';
        locoTs = 0.45;
        e.subT -= dt;
        const gy = this._groundAt(pos.x, pos.z) + 1.6;
        pos.y += (gy - pos.y) * (1 - Math.exp(-6 * dt));
        e.pitch *= Math.exp(-4 * dt);
        e.bank *= Math.exp(-4 * dt);
        const dx = p.x - pos.x;
        const dz = p.z - pos.z;
        e.yaw = angLerp(e.yaw, Math.atan2(dx, dz), 1 - Math.exp(-3 * dt));
        if (e.hitPending >= 0) {
          e.hitPending -= dt;
          if (e.hitPending < 0) {
            e.hitPending = -1;
            if (pos.distanceTo(p) < 6) g.stats.damage(25);
          }
        }
        if (e.cdT <= 0 && pos.distanceTo(p) < 4.5) {
          e.cdT = 2;
          e.hitPending = 0.3;
          this._once(e, e.meleeAlt ? 'Punch' : 'Headbutt');
          e.meleeAlt = !e.meleeAlt;
        }
        if (e.subT <= 0) this._toTakeoff(e);
      }
    }

    e.group.rotation.y = e.yaw;
    e.pivot.rotation.x = -e.pitch;
    e.pivot.rotation.z = e.bank;
    this._loco(e, loco, locoTs);
    e.rig.update(dt);

    if (e.state === 'takeoff' || e.state === 'circle' || e.state === 'breath') {
      const minY = this._groundAt(pos.x, pos.z) + 6;
      if (pos.y < minY) pos.y = minY;
    }
  }

  update(dt) {
    const g = this.game;
    const p = g.player.pos;

    for (let i = 0; i < this.lootDrops.length; i++) {
      const d = this.lootDrops[i];
      d.t += dt;
      d.mesh.position.y = d.pos.y + Math.sin(d.t * 2.6) * 0.12;
      d.mesh.rotation.y += dt * 1.6;
    }

    this._updateBolts(dt, p);

    for (let i = this.pendingRespawns.length - 1; i >= 0; i--) {
      const r = this.pendingRespawns[i];
      r.t -= dt;
      if (r.t <= 0) {
        this.pendingRespawns.splice(i, 1);
        if (r.kind === 'draugr') this._spawnDraugr(r.x, r.z, r.variant);
      }
    }

    for (let pi = 0; pi < this.packs.length; pi++) {
      const pack = this.packs[pi];
      if (pack.respawnT < 0) {
        if (pack.members.length && pack.members.every((m) => !m.alive)) pack.respawnT = pack.respawnDelay || 90;
      } else {
        pack.respawnT -= dt;
        if (pack.respawnT <= 0) this._spawnPack(pi);
      }
    }

    let purge = false;
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (e.removed) { purge = true; continue; }
      if (e.flashT > 0) {
        e.flashT -= dt;
        if (e.flashT <= 0) this._restoreMats(e);
      }
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) {
          e.slowT = 0;
          e.slowDur = 0;
          e.slowFactor = 1;
          if (e.flashT <= 0) this._restoreMats(e);
        } else if (e.flashT <= 0) {
          // 冰霜余韵：发光随剩余减速时间淡出
          const k = 0.25 * Math.min(1, e.slowT / Math.max(e.slowDur, 0.001));
          for (let j = 0; j < e.mats.length; j++) {
            e.mats[j].m.emissive.setHex(0x4f7f9f);
            e.mats[j].m.emissiveIntensity = k;
          }
        }
      }
      if(e.training){
        // Stationary AI but REAL directional knockback/launch physics.
        e.hitPending=-1;e.boltPending=-1;
        const pos=e.group.position;
        pos.x+=e.kbVel.x*dt;pos.z+=e.kbVel.z*dt;
        const ground=this._groundAt(pos.x,pos.z)+(e.flightOffset||0);
        if(e.kbVel.y>0||pos.y>ground+.015){
          pos.y+=e.kbVel.y*dt;e.kbVel.y-=26*dt;
          if(pos.y<=ground){pos.y=ground;e.kbVel.y=0;}
        }else{pos.y=ground;e.kbVel.y=0;}
        const friction=Math.exp(-5*dt);
        e.kbVel.x*=friction;e.kbVel.z*=friction;
        e.hitstunT=Math.max(0,e.hitstunT-dt);
        if(this.game.time.elapsed-e.trainingLastHit>3.5){
          // Restore HP and positions only BETWEEN combo sequences.
          e.hp=e.maxHp;
          pos.x+=(e.home.x-pos.x)*Math.min(1,2.8*dt);
          pos.z+=(e.home.z-pos.z)*Math.min(1,2.8*dt);
          e.kbVel.set(0,0,0);
        }
        if(e.trainingDragon){
          // Never stomp the airborne hover clip with a ground Idle animation.
          if(e.hitstunT<=0)e.rig.play('Flying_Idle',{timeScale:.45});
        }else if(e.hitstunT<=0)e.rig.play('Idle');
        e.rig.update(dt);
        continue;
      }
      if (!e.alive) {
        if (!e.group.parent) {
          this._removeEnemy(e);
          purge = true;
          continue;
        }
        if (e.state === 'dead') {
          this._updateDead(e, dt);
          if (!e.removed) e.rig.update(dt);
        }
        if (e.removed) purge = true;
        continue;
      }
      if (e.type === 'dragon') {
        this._updateDragon(e, dt);
        continue;
      }
      const dx = p.x - e.group.position.x;
      const dz = p.z - e.group.position.z;
      if (dx * dx + dz * dz > 260 * 260) continue;
      this._updateGround(e, dt, p);
    }
    if (purge) this.list = this.list.filter((e) => !e.removed);
  }

  reset() {
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (!e.removed) this._removeEnemy(e);
    }
    this.list = [];
    for (let i = 0; i < this.lootDrops.length; i++) {
      this.game.scene.remove(this.lootDrops[i].mesh);
    }
    this.lootDrops = [];
    for (let i = 0; i < this.bolts.length; i++) {
      this.game.scene.remove(this.bolts[i].mesh);
    }
    this.bolts = [];
    this.pendingRespawns = [];
    this.packs = [];
    this.dragon = null;
    this.spawnAll();
  }
}
