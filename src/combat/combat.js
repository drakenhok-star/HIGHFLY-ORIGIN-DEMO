import * as THREE from 'three';

const MELEE_CD = 0.5;
const CAST_CD = 0.6;
const MELEE_HIT_DELAY = 0.15;
const COS_MELEE = Math.cos(THREE.MathUtils.degToRad(45));
const COS_SHOUT = Math.cos(THREE.MathUtils.degToRad(35));
const COS_FROST = Math.cos(THREE.MathUtils.degToRad(40));

export class Combat {
  constructor(game) {
    this.game = game;
    this.meleeCd = 0;
    this.castCd = 0;
    this.shouts = [
      { id: 'fus', name: '不屈之力', words: 'FUS · RO · DAH', cd: 15 },
      { id: 'frost', name: '凛冬之息', words: 'FO · KRAH · DIIN', cd: 18 },
      { id: 'wuld', name: '旋风冲刺', words: 'WULD · NAH · KEST', cd: 8 }
    ];
    this.learnedShouts = ['fus'];
    this.equippedShout = 'fus';
    this.shoutCooldowns = { fus: 0, frost: 0, wuld: 0 };
    this.shoutCd = 0;
    this.shoutCdMax = 15;
    this.meleeHitT = -1;
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
    if (input.leftClick) this.melee();
    if (input.rightClick) this.cast();
    if (input.justPressed.has('KeyF')) this.shout();
    if (input.justPressed.has('KeyQ')) this.cycleShout();
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
    this.game.hud.notify('已切换龙吼：' + def.name);
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
      g.hud.questBanner('习得龙吼之词 — ' + def.name);
      g.hud.notify('按 F 释放，Q 切换龙吼');
    }
  }

  melee() {
    if (this.meleeCd > 0) return;
    const g = this.game;
    if (!g.stats.useStamina(6)) {
      g.hud.notify('耐力不足');
      return;
    }
    this.meleeCd = MELEE_CD;
    g.player.attackT = 0;
    g.audio.play('swing');
    this.meleeHitT = MELEE_HIT_DELAY;
  }

  resolveMelee() {
    const g = this.game;
    const player = g.player;
    const forward = this._fwd.copy(player.getForward());
    const targets = this.collectTargets();
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      const to = this._v1.copy(e.group.position).sub(player.pos);
      if (to.length() >= 3.4 + e.hitRadius * 0.5) continue;
      to.y = 0;
      if (to.lengthSq() < 1e-6) to.copy(forward);
      to.normalize();
      if (to.dot(forward) < COS_MELEE) continue;
      const dmg = g.inventory.weaponDamage() * (1 + (g.stats.level - 1) * 0.05);
      e.takeDamage(dmg, forward.clone().multiplyScalar(3));
      g.audio.play('hit');
      g.hud.showEnemyHP(e);
      const chest = this._v2.copy(e.group.position);
      chest.y += Math.min(1.2, Math.max(0.8, e.hitRadius));
      g.effects.spawnBurst(chest, '#b03030', 8);
    }
  }

  cast() {
    if (this.castCd > 0) return;
    const g = this.game;
    if (!g.stats.useMagicka(18)) {
      g.hud.notify('法力不足');
      return;
    }
    this.castCd = CAST_CD;
    g.player.castT = 0;
    g.audio.play('cast');
    const aim = this._v1.copy(g.player.getAimDir());
    const mesh = new THREE.Mesh(this.projGeo, this.projMat);
    mesh.position.copy(g.player.pos);
    mesh.position.y += g.player.eyeHeight;
    mesh.position.addScaledVector(aim, 1.2);
    mesh.add(this.projLight);
    this._lightHolder = mesh;
    g.scene.add(mesh);
    this.projectiles.push({
      mesh,
      vel: aim.clone().multiplyScalar(34),
      life: 3
    });
  }

  updateProjectiles(dt) {
    const g = this.game;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const pos = p.mesh.position;
      let hit = false;

      const targets = this.collectTargets();
      for (let j = 0; j < targets.length; j++) {
        const e = targets[j];
        const c = this._v1.copy(e.group.position);
        c.y += Math.min(1.0, e.hitRadius);
        if (pos.distanceTo(c) < 1.2 + e.hitRadius) {
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

  shout() {
    const g = this.game;
    const def = this.shoutDef(this.equippedShout) || this.shouts[0];
    if (this.shoutCooldowns[def.id] > 0) {
      g.hud.notify('龙吼尚未恢复');
      return;
    }
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
    const forward = this._fwd.copy(g.player.getForward());
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
    if (g.effects.frostCone) {
      const origin = new THREE.Vector3();
      g.effects.frostCone(
        () => {
          origin.copy(player.pos);
          origin.y += player.eyeHeight * 0.85;
          return origin;
        },
        () => player.getForward(),
        1.2
      );
    }
    const forward = this._fwd.copy(player.getForward());
    const targets = this.collectTargets();
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      const to = this._v2.copy(e.group.position).sub(player.pos);
      if (to.length() > 15) continue;
      to.y = 0;
      if (to.lengthSq() < 1e-6) to.copy(forward);
      to.normalize();
      if (to.dot(forward) < COS_FROST) continue;
      e.takeDamage(20);
      if (e.applySlow) e.applySlow(0.45, 4);
      g.hud.showEnemyHP(e);
    }
  }

  shoutWuld() {
    const g = this.game;
    g.audio.play('dash');
    g.hud.shoutText('WULD · NAH · KEST');
    if (g.player.startDash) g.player.startDash();
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
