const LEGACY_KEY = 'tianjie5_save';
const KEY = 'highfly_p7_save';

export class SaveSys {
  constructor(game) {
    this.game = game;
    this.autosaveTimer = 0;
    this.key=game.p7Enabled?KEY:LEGACY_KEY;
  }

  save() {
    const g = this.game;
    const dragon = g.enemies.dragon;
    // 室内存档时记录门外位置与离门朝向，读档永远落在户外（interiors.savePosition 契约）
    const pos = g.interiors && g.interiors.savePosition ? g.interiors.savePosition() : g.player.pos;
    const yaw = g.interiors && typeof g.interiors.saveYaw === 'function' ? g.interiors.saveYaw() : g.player.yaw;
    const data = {
      dayTime: g.time.dayTime,
      player: { x: pos.x, y: pos.y, z: pos.z, yaw, torchOn:!!g.player.torchOn },
      stats: g.stats.serialize(),
      inv: g.inventory.serialize(),
      quests: g.quests.serialize(),
      combat: g.combat && g.combat.serialize ? g.combat.serialize() : null,
      chestsOpened: g.structures.chests
        .map((c, i) => (c.opened ? i : -1))
        .filter((i) => i >= 0),
      dragonDead: !dragon || !dragon.alive,
    };
    localStorage.setItem(this.key, JSON.stringify(data));
    g.hud.notify('已保存');
  }

  hasSave() {
    return localStorage.getItem(this.key) !== null || (this.game.p7Enabled && localStorage.getItem(LEGACY_KEY)!==null);
  }

  loadRaw() {
    // First P7 visit reads P6 progress, but writes ONLY P7: original never overwritten.
    const raw = localStorage.getItem(this.key) || (this.game.p7Enabled?localStorage.getItem(LEGACY_KEY):null);
    if (!raw) return null;
    // 持久化数据是外部边界，损坏存档按无存档处理
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  applyLoaded() {
    const d = this.loadRaw();
    if (!d) return;
    const g = this.game;
    if (typeof d.dayTime === 'number') g.time.dayTime = d.dayTime;
    g.stats.applyData(d.stats);
    g.inventory.applyData(d.inv);
    g.quests.applyData(d.quests);
    if (g.combat && g.combat.applyData) g.combat.applyData(d.combat);
    for (const i of d.chestsOpened || []) {
      const chest = g.structures.chests[i];
      if (chest) {
        chest.opened = true;
        chest.openAnim = 1;
      }
    }
    if (d.dragonDead) {
      const dragon = g.enemies.dragon;
      if (dragon) {
        dragon.alive = false;
        dragon.hp = 0;
        if (dragon.group && dragon.group.parent) dragon.group.parent.remove(dragon.group);
      }
    }
    if (d.player) {
      g.player.pos.set(d.player.x, d.player.y, d.player.z);
      if(this.game.p7Enabled){g.player.torchOn=!!d.player.torchOn;
        if(g.inventory.equipped.offhand)g.player.torchOn=false;
        g.player.updateTorch();}
      if (typeof d.player.yaw === 'number') {
        g.player.yaw = d.player.yaw;
        // 同步身体朝向，避免读档后第一帧身体从重置朝向转过来
        g.player.bodyYaw = d.player.yaw;
      }
    }
  }

  update(dt) {
    if (this.game.state !== 'playing') return;
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= 60) {
      this.autosaveTimer = 0;
      this.save();
      this.game.hud.notify('已自动保存');
    }
  }
}
