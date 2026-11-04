import * as THREE from 'three';
import { ABILITIES_P6, abilityForShout, spendAbilityResource } from './abilities-p6.js';
import { hasLineOfSight, insideBlockingObject } from './targeting-p6.js';
import { comboStep } from './motion-p7.js';

const MELEE_CD = 0.5;
const CAST_CD = 0.6;
const MELEE_HIT_DELAY = 0.15;
const COS_MELEE = Math.cos(THREE.MathUtils.degToRad(45));
const COS_SHOUT = Math.cos(THREE.MathUtils.degToRad(35));
const COS_FROST = Math.cos(THREE.MathUtils.degToRad(40));
const COMBO_BONUS=[1,1.07,1.17,1.65];
const COMBO_CLIPS=[
  '1H_Melee_Attack_Slice_Diagonal',
  '1H_Melee_Attack_Slice_Horizontal',
  '1H_Melee_Attack_Stab',
  '1H_Melee_Attack_Chop'
];

export class Combat {
  constructor(game) {
    this.game = game;
    this.meleeCd = 0;
    this.castCd = 0;
    this.shouts = [
      { id: 'fus', name: 'Fuerza implacable', words: 'FUS · RO · DAH', cd: 15 },
      { id: 'frost', name: 'Aliento helado', words: 'FO · KRAH · DIIN', cd: 18 },
      { id: 'wuld', name: 'Embestida veloz', words: 'WULD · NAH · KEST', cd: 8 }
    ];
    this.learnedShouts = ['fus'];
    this.equippedShout = 'fus';
    this.shoutCooldowns = { fus: 0, frost: 0, wuld: 0 };
    this.shoutCd = 0;
    this.shoutCdMax = 15;
    this.meleeHitT = -1;
    this.comboStep=0;
    this._attackTarget=null;
    this._castTarget=null;
    this._frostDirection=null;
    this.comboTimer=0;
    this.attackBuffer=0;
    this._meleeStep=1;
    this.projectiles = [];
    this.projGeo = new THREE.SphereGeometry(0.22, 10, 8);
    this.projMat = new THREE.MeshStandardMaterial({
      color: 0xff7b2e,
      emissive: new THREE.Color('#ff7b2e'),
      emissiveIntensity: 2.2,
      roughness: 0.4,
      metalness: 0
    });
    // 单个共享点光源：永远挂在最新的火球上
    this.projLight = new THREE.PointLight(0xff8040, 2, 14);
    this._lightHolder = null;
    this._targets = [];
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._aimPoint=new THREE.Vector3();
    this._aimRay=new THREE.Vector3();
    this._muzzle=new THREE.Vector3();
    this._camRay=new THREE.Vector3();
    this._segmentA=new THREE.Vector3();
    this._segmentDelta=new THREE.Vector3();
  }

  collectTargets() {
    const out = this._targets;
    out.length = 0;
    const en = this.game.enemies;
    if (!en) return out;
    const list = en.list || [];
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e && e.alive) out.push(e);
    }
    const d = en.dragon;
    if (d && d.alive && out.indexOf(d) === -1) out.push(d);
    return out;
  }

  update(dt) {
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.castCd = Math.max(0, this.castCd - dt);
    if(this.game.p6Enabled){
      this.comboTimer=Math.max(0,this.comboTimer-dt);
      if(this.comboTimer<=0){this.comboStep=0;this._attackTarget=null;}
      this.attackBuffer=Math.max(0,this.attackBuffer-dt);
    }
    for (const id in this.shoutCooldowns) {
      this.shoutCooldowns[id] = Math.max(0, this.shoutCooldowns[id] - dt);
    }
    const eq = this.shoutDef(this.equippedShout) || this.shouts[0];
    this.shoutCd = this.shoutCooldowns[eq.id];
    this.shoutCdMax = eq.cd;

    if (this.meleeHitT >= 0) {
      this.meleeHitT -= dt;
      if (this.meleeHitT <= 0) {
        this.meleeHitT = -1;
        this.resolveMelee();
      }
    }

    this.updateProjectiles(dt);
    this.updateWordWalls();

    const input = this.game.input;
    if(this.game.p6Enabled && this.attackBuffer>0 && this.meleeCd===0){
      this.attackBuffer=0;this.melee();
    }
    if (input.leftClick) this.melee();
    if (input.rightClick) this.cast();
    if (input.justPressed.has('KeyF')) this.shout();
    if (input.justPressed.has('KeyQ')) this.cycleShout();
    if(this.game.p6Enabled){
      if(input.justPressed.has('Digit1'))this.cast();
      if(input.justPressed.has('Digit2'))this.shout('fus');
      if(input.justPressed.has('Digit3'))this.shout('frost');
      if(input.justPressed.has('Digit4'))this.shout('wuld');
    }
  }

  shoutDef(id) {
    for (let i = 0; i < this.shouts.length; i++) {
      if (this.shouts[i].id === id) return this.shouts[i];
    }
    return null;
  }

  cycleShout() {
    if (this.learnedShouts.length < 2) return;
    const idx = this.learnedShouts.indexOf(this.equippedShout);
    this.equippedShout = this.learnedShouts[(idx + 1) % this.learnedShouts.length];
    const def = this.shoutDef(this.equippedShout) || this.shouts[0];
    this.game.hud.notify('Grito equipado: ' + def.name);
    this.game.audio.play('click');
  }

  updateWordWalls() {
    const g = this.game;
    const walls = g.structures && g.structures.wordWalls;
    if (!walls || !g.player) return;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (w.learned) continue;
      const def = this.shoutDef(w.shoutId);
      if (!def) continue;
      if (g.player.pos.distanceTo(w.pos) > 4) continue;
      w.learned = true;
      if (w.setLearned) w.setLearned();
      if (this.learnedShouts.indexOf(def.id) === -1) this.learnedShouts.push(def.id);
      this.equippedShout = def.id;
      g.audio.play('word');
      g.hud.questBanner('Aprendiste el grito: ' + def.name);
      g.hud.notify('¡Habilidad desbloqueada! Disponible en la barra de skills.');
      if(g.p7Enabled && g.saveSys?.save)g.saveSys.save();
    }
  }

  melee() {
    const g=this.game;
    if(this.meleeCd>0){
      if(g.p7Enabled)this.attackBuffer=Math.min(0.7,Math.max(this.attackBuffer,this.meleeCd+0.09));
      else if(g.p6Enabled && this.meleeCd<0.18)this.attackBuffer=0.19;
      return;
    }
    const step=g.p7Enabled ? comboStep(this.comboStep,this.comboTimer>0)
      : g.p6Enabled ? (this.comboTimer>0 ? this.comboStep%4+1 : 1) : 1;
    const cost=g.p6Enabled && step===4 ? 10 : g.p6Enabled && step===3 ? 7 : 6;
    if(!g.stats.useStamina(cost)){
      g.hud.notify('Energía insuficiente');return;
    }
    this.comboStep=step;
    this._meleeStep=step;
    this.comboTimer=g.p7Enabled?1.45:0.92;
    this.meleeCd=g.p7Enabled?(step===4?0.42:0.34):g.p6Enabled ? (step===4?0.47:0.32) : MELEE_CD;
    this.attackBuffer=0;
    if(g.p7Enabled){
      const previous=this._attackTarget;
      const stillValid=previous && g.targeting?.valid(previous,4.7,true);
      this._attackTarget=g.targeting?.valid(g.targeting.locked,4.7,true)?g.targeting.locked
        :stillValid?previous:g.targeting?.attackTarget(4.5)||null;
      if(this._attackTarget && !g.targeting.locked)g.targeting.soft=this._attackTarget;
      if(!g.p810Enabled)g.hud.notify('COMBO '+step+'/4'+(step===4?' · ¡GOLPE FINAL!':'');
    }
    g.player.attackT=0;
    g.player._attackAnimStarted=false;
    if(g.p6Enabled){
      const rig=g.player.rig;
      g.player.attackClip=rig.clips.has(COMBO_CLIPS[step-1])?COMBO_CLIPS[step-1]:COMBO_CLIPS[0];
      g.player.actionDuration=step===4?0.43:0.32;
    }
    g.audio.play('swing');
    this.meleeHitT=g.p6Enabled ? 0.13 : MELEE_HIT_DELAY;
  }

  resolveMelee() {
    const g = this.game;
    const player = g.player;
    const locked=g.p7Enabled?this._attackTarget:
      g.p6Enabled && g.targeting?g.targeting.get(4.8):null;
    const forward=this._fwd.copy(g.p7Enabled?player.getCombatForward():player.getForward());
    if(locked){
      forward.copy(locked.group.position).sub(player.pos);
      forward.y=0;if(forward.lengthSq()>0.001)forward.normalize();
      else forward.copy(g.p7Enabled?player.getCombatForward():player.getForward());
    }
    const targets = this.collectTargets();
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      const to = this._v1.copy(e.group.position).sub(player.pos);
      if (to.length() >= 3.4 + e.hitRadius * 0.5) continue;
      to.y = 0;
      if (to.lengthSq() < 1e-6) to.copy(forward);
      to.normalize();
      if (to.dot(forward) < COS_MELEE) continue;
      if(g.p6Enabled && !hasLineOfSight(g,{x:player.pos.x,y:player.pos.y+1.25,z:player.pos.z},
          {x:e.group.position.x,y:e.group.position.y+Math.min(1.3,e.hitRadius||1),z:e.group.position.z})) continue;
      const bonus=g.p6Enabled?COMBO_BONUS[this._meleeStep-1]:1;
      const dmg = (g.inventory.weaponDamage() + (g.p7Enabled&&g.inventory.offhandDamage?g.inventory.offhandDamage():0))
        * (1 + (g.stats.level - 1) * 0.05)*bonus;
      e.takeDamage(dmg, forward.clone().multiplyScalar(g.p6Enabled&&this._meleeStep===4?5:3));
      g.audio.play('hit');
      g.hud.showEnemyHP(e);
      const chest = this._v2.copy(e.group.position);
      chest.y += Math.min(1.2, Math.max(0.8, e.hitRadius));
      g.effects.spawnBurst(chest,g.p6Enabled&&this._meleeStep===4?'#ffd09c':'#b03030',
        g.p6Enabled?this._meleeStep===4?12:6:8);
    }
  }

  cast() {
    if(this.castCd>0)return;
    const g=this.game,def=ABILITIES_P6.S1;
    if(g.p6Enabled ? !spendAbilityResource(g.stats,def) : !g.stats.useMagicka(18)){
      g.hud.notify('MP insuficiente');return;
    }
    this.castCd=CAST_CD;
    this._castTarget=g.p7Enabled?(g.targeting?.locked||g.targeting?.acquireAny(16)||null):null;
    g.player.castT=0;
    if(g.p6Enabled)g.player.actionDuration=0.35;
    g.player._castAnimStarted=false;
    g.audio.play('cast');
    const muzzle=this._muzzle.copy(g.player.pos);
    muzzle.y+=g.player.eyeHeight;
    const aim=this._aimRay;
    if(g.p6Enabled){
      const lock=g.p7Enabled && this._castTarget && g.targeting?.valid(this._castTarget,def.range,true)
        ? this._castTarget:g.targeting && g.targeting.get(def.range);
      if(lock){
        this._aimPoint.copy(lock.group.position);
        this._aimPoint.y+=Math.min(1.3,Math.max(0.6,lock.hitRadius||1));
      }else{
        const ray=g.camera.getWorldDirection(this._camRay);
        const origin=g.camera.position;
        this._aimPoint.copy(origin).addScaledVector(ray,def.range);
        for(let dist=2;dist<=def.range;dist+=2){
          const x=origin.x+ray.x*dist,y=origin.y+ray.y*dist,z=origin.z+ray.z*dist;
          if(y<g.terrain.getHeight(x,z)+0.25 || insideBlockingObject(g,x,y,z,0.05)){
            this._aimPoint.set(x,y,z);break;
          }
        }
      }
      aim.copy(this._aimPoint).sub(muzzle);
      if(aim.lengthSq()<0.001)aim.copy(g.player.getAimDir());
      aim.normalize();
    }else aim.copy(g.player.getAimDir());
    if(this.projectiles.length>=8)this.removeProjectile(0);
    const mesh=new THREE.Mesh(this.projGeo,this.projMat);
    mesh.position.copy(muzzle).addScaledVector(aim,0.55);
    const lightAllowed=!g.p6Enabled || !g.performanceP2 ||
      (g.performanceP2.preset!=='FLUID' && g.performanceP2.preset!=='BALANCED');
    if(lightAllowed){mesh.add(this.projLight);this._lightHolder=mesh;}
    g.scene.add(mesh);
    this.projectiles.push({mesh,vel:aim.clone().multiplyScalar(34),life:3});
  }

  updateProjectiles(dt) {
    const g = this.game;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      this._segmentA.copy(p.mesh.position);
      p.mesh.position.addScaledVector(p.vel, dt);
      const pos = p.mesh.position;
      this._segmentDelta.copy(pos).sub(this._segmentA);
      let hit = false;

      const targets = this.collectTargets();
      for (let j = 0; j < targets.length; j++) {
        const e = targets[j];
        const c = this._v1.copy(e.group.position);
        c.y += Math.min(1.0, e.hitRadius);
        const segLen2=this._segmentDelta.lengthSq();
        const t=segLen2>1e-5?Math.max(0,Math.min(1,
          c.clone().sub(this._segmentA).dot(this._segmentDelta)/segLen2)):0;
        const nearest=this._v2.copy(this._segmentA).addScaledVector(this._segmentDelta,t);
        if (nearest.distanceTo(c) < 1.0 + e.hitRadius &&
          (!g.p6Enabled || hasLineOfSight(g,this._segmentA,nearest))) {
          const dmg = 24 + g.stats.level;
          e.takeDamage(dmg, p.vel.clone().normalize().multiplyScalar(4));
          g.effects.spawnBurst(pos, '#ff8c3a', 14);
          g.hud.showEnemyHP(e);
          g.audio.play('hit');
          hit = true;
          break;
        }
      }

      if (!hit) {
        if(g.p6Enabled && !hasLineOfSight(g,this._segmentA,pos)){
          g.effects.spawnBurst(pos,'#ff8c3a',8);hit=true;
        }
        const groundY = g.terrain.getHeight(pos.x, pos.z);
        if (pos.y < groundY + 0.2) {
          g.effects.spawnBurst(pos, '#ff8c3a', 18);
          hit = true;
        } else if (pos.y < g.terrain.waterY) {
          g.effects.spawnBurst(pos, '#9fd8ff', 8, 4, 0.45, 0.12);
          hit = true;
        }
      }

      if (hit || p.life <= 0) this.removeProjectile(i);
    }
  }

  removeProjectile(index) {
    const p = this.projectiles[index];
    this.projectiles.splice(index, 1);
    this.game.scene.remove(p.mesh);
    if (p.mesh === this._lightHolder) {
      if (this.projectiles.length > 0) {
        const newest = this.projectiles[this.projectiles.length - 1].mesh;
        newest.add(this.projLight);
        this._lightHolder = newest;
      } else {
        this.projLight.removeFromParent();
        this._lightHolder = null;
      }
    }
  }

  shout(id=null) {
    const g = this.game;
    const def=this.shoutDef(id||this.equippedShout)||this.shouts[0];
    if(!this.learnedShouts.includes(def.id)){
      g.hud.notify('Habilidad todavía bloqueada');return;
    }
    if (this.shoutCooldowns[def.id] > 0) {
      g.hud.notify('Habilidad recargando');return;
    }
    const ability=abilityForShout(def.id);
    if(g.p6Enabled && !spendAbilityResource(g.stats,ability)){
      g.hud.notify(ability && ability.resource==='mp'?'MP insuficiente':'Energía insuficiente');
      return;
    }
    this.equippedShout=def.id;
    this.shoutCooldowns[def.id] = def.cd;
    this.shoutCd = def.cd;
    this.shoutCdMax = def.cd;
    if (def.id === 'frost') this.shoutFrost();
    else if (def.id === 'wuld') this.shoutWuld();
    else this.shoutFus();
  }

  shoutFus() {
    const g = this.game;
    g.audio.play('shout');
    g.hud.shoutText('FUS · RO · DAH');
    g.player.addShake(0.5);
    const target=g.p7Enabled?g.targeting?.attackTarget(14):g.p6Enabled && g.targeting ? g.targeting.get(14) : null;
    if(g.p7Enabled){this._castTarget=target;g.player.castT=0;g.player._castAnimStarted=false;}
    const forward=this._fwd.copy(g.p7Enabled?g.player.getCombatForward():g.player.getForward());
    if(target){forward.copy(target.group.position).sub(g.player.pos).setY(0).normalize();}
    const burstPos = this._v1.copy(g.player.pos).addScaledVector(forward, 2);
    burstPos.y += 1.4;
    g.effects.spawnBurst(burstPos, '#cfe8ff', 26, 14, 0.5, 0.3);
    const targets = this.collectTargets();
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      const to = this._v2.copy(e.group.position).sub(g.player.pos);
      if (to.length() > 14) continue;
      to.y = 0;
      if (to.lengthSq() < 1e-6) to.copy(forward);
      to.normalize();
      if (to.dot(forward) < COS_SHOUT) continue;
      if(g.p6Enabled && !hasLineOfSight(g,g.targeting.origin(),g.targeting.center(e)))continue;
      e.takeDamage(12, new THREE.Vector3(to.x * 22, 6, to.z * 22));
      g.hud.showEnemyHP(e);
    }
  }

  shoutFrost() {
    const g = this.game;
    const player = g.player;
    g.audio.play('frost');
    g.hud.shoutText('FO · KRAH · DIIN');
    player.addShake(0.3);
    const target=g.p7Enabled?g.targeting?.attackTarget(15):g.p6Enabled && g.targeting ? g.targeting.get(15) : null;
    if(g.p7Enabled){this._castTarget=target;g.player.castT=0;g.player._castAnimStarted=false;}
    const frostForward=this._frostForward||(this._frostForward=new THREE.Vector3());
    frostForward.copy(g.p7Enabled?player.getCombatForward():player.getForward());
    if(target)frostForward.copy(target.group.position).sub(player.pos).setY(0).normalize();
    if (g.effects.frostCone) {
      const origin = new THREE.Vector3();
      g.effects.frostCone(
        () => {
          origin.copy(player.pos);
          origin.y += player.eyeHeight * 0.85;
          return origin;
        },
        () => g.p7Enabled ? frostForward.clone() : player.getForward(),
        1.2
      );
    }
    const forward=this._fwd.copy(g.p7Enabled?frostForward:player.getForward());
    if(target)forward.copy(target.group.position).sub(player.pos).setY(0).normalize();
    const targets = this.collectTargets();
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      const to = this._v2.copy(e.group.position).sub(player.pos);
      if (to.length() > 15) continue;
      to.y = 0;
      if (to.lengthSq() < 1e-6) to.copy(forward);
      to.normalize();
      if (to.dot(forward) < COS_FROST) continue;
      if(g.p6Enabled && !hasLineOfSight(g,g.targeting.origin(),g.targeting.center(e)))continue;
      e.takeDamage(20);
      if (e.applySlow) e.applySlow(0.45, 4);
      g.hud.showEnemyHP(e);
    }
  }

  shoutWuld() {
    const g = this.game;
    g.audio.play('dash');
    g.hud.shoutText('WULD · NAH · KEST');
    if (g.player.startDash) g.player.startDash(g.p6Enabled?{speed:44,duration:0.30}:{});
    const burstPos = this._v1.copy(g.player.pos);
    burstPos.y += 1;
    g.effects.spawnBurst(burstPos, '#f0f6ff', 16, 8, 0.4, 0.22);
  }

  serialize() {
    return { learned: this.learnedShouts.slice(), equipped: this.equippedShout };
  }

  applyData(d) {
    if (!d) return;
    const learned = [];
    const src = Array.isArray(d.learned) ? d.learned : [];
    for (let i = 0; i < src.length; i++) {
      if (this.shoutDef(src[i]) && learned.indexOf(src[i]) === -1) learned.push(src[i]);
    }
    if (learned.indexOf('fus') === -1) learned.unshift('fus');
    this.learnedShouts = learned;
    this.equippedShout = learned.indexOf(d.equipped) !== -1 ? d.equipped : 'fus';
    const walls = this.game.structures && this.game.structures.wordWalls;
    if (walls) {
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        if (this.learnedShouts.indexOf(w.shoutId) === -1) continue;
        w.learned = true;
        if (w.setLearned) w.setLearned();
      }
    }
  }

  reset() {
    this.meleeCd = 0;
    this.castCd = 0;
    this.shoutCd = 0;
    this.shoutCdMax = 15;
    this.meleeHitT = -1;
    this.comboStep=0;this.comboTimer=0;this.attackBuffer=0;this._meleeStep=1;
    this._attackTarget=null;this._castTarget=null;
    for (const id in this.shoutCooldowns) this.shoutCooldowns[id] = 0;
    this.learnedShouts = ['fus'];
    this.equippedShout = 'fus';
    const walls = this.game.structures && this.game.structures.wordWalls;
    if (walls) {
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        w.learned = false;
        if (w.resetLearned) w.resetLearned();
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) this.removeProjectile(i);
  }
}
