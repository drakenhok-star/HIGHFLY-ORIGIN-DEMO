export class Stats {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.maxHp = 100;
    this.maxMp = 100;
    this.maxSp = 100;
    this.hp = 100;
    this.mp = 100;
    this.sp = 100;
    this.level = 1;
    this.xp = 0;
    this.spTimer = 0;
    this.lastDamageT = 999;
  }

  xpNext() {
    return Math.floor(100 * Math.pow(this.level, 1.35));
  }

  armorValue() {
    return this.game.inventory.armorValue();
  }

  damage(amount) {
    if (this.game.state !== 'playing') return;
    // P15: successful directional dodge preserves combo and takes no HP damage.
    // Guard/parry is intentionally not faked: no active guard action exists yet.
    if(this.game.p15Enabled && this.game.player?.dodgeInvulnT>0){
      this.game.combat?.ports?.emit('dodge-success',{avoided:amount});
      return 0;
    }
    const reduced = amount * (1 - Math.min(this.armorValue() * 0.006, 0.6));
    if(reduced<=0)return 0;
    if(this.game.p15Enabled)this.game.combat?.breakCombo('hit');
    this.hp -= reduced;
    this.lastDamageT = 0;
    this.game.hud.damageFlash();
    this.game.audio.play('hurt');
    if (this.hp <= 0) {
      this.hp = 0;
      this.game.setState('dead');
      this.game.menus.showDeath();
      this.game.audio.play('death');
    }
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  restoreMp(n) {
    this.mp = Math.min(this.maxMp, this.mp + n);
  }

  useStamina(n) {
    if (this.sp < n) return false;
    this.sp -= n;
    this.spTimer = 0.8;
    return true;
  }

  useMagicka(n) {
    if (this.mp < n) return false;
    this.mp -= n;
    return true;
  }

  addXP(n) {
    this.xp += n;
    this.game.hud.notify('+' + n + ' EXP');
    let need = this.xpNext();
    while (this.xp >= need) {
      this.xp -= need;
      this.level++;
      this.maxHp += 8;
      this.maxMp += 8;
      this.maxSp += 8;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.sp = this.maxSp;
      this.game.hud.questBanner('¡NIVEL '+this.level+'!');
      this.game.audio.play('levelup');
      need = this.xpNext();
    }
  }

  update(dt) {
    this.hp = Math.min(this.maxHp, this.hp + 1.5 * dt);
    this.mp = Math.min(this.maxMp, this.mp + 6 * dt);
    this.spTimer -= dt;
    if (this.spTimer <= 0) {
      this.sp = Math.min(this.maxSp, this.sp + 14 * dt);
    }
    this.lastDamageT += dt;
  }

  serialize() {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      mp: this.mp,
      maxMp: this.maxMp,
      sp: this.sp,
      maxSp: this.maxSp,
      level: this.level,
      xp: this.xp,
    };
  }

  applyData(d) {
    if (!d) return;
    // 手改存档可能塞入 NaN/字符串/Infinity，非法值回退默认，避免污染运行时数值
    const num = (v, fb) => (Number.isFinite(v) ? v : fb);
    this.maxHp = num(d.maxHp, 100);
    this.maxMp = num(d.maxMp, 100);
    this.maxSp = num(d.maxSp, 100);
    this.hp = num(d.hp, this.maxHp);
    this.mp = num(d.mp, this.maxMp);
    this.sp = num(d.sp, this.maxSp);
    this.level = num(d.level, 1);
    this.xp = num(d.xp, 0);
    this.spTimer = 0;
    this.lastDamageT = 999;
  }
}
