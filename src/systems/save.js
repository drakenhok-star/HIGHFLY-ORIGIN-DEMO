const LEGACY_KEY = 'tianjie5_save';
const KEY = 'highfly_p7_save';
const KEY_P810 = 'highfly_p810_save';
const KEY_P812 = 'highfly_p812_save';
const KEY_P13 = 'highfly_p13_save';
const KEY_P14 = 'highfly_p14_save';
const KEY_P15 = 'highfly_p15_save';
const KEY_P16 = 'highfly_p16_save';
const KEY_P18 = 'highfly_p18_save';
const KEY_P182 = 'highfly_p182_save';
const KEY_P183 = 'highfly_p183_save';
const KEY_P187 = 'highfly_p187_save';
const KEY_P188 = 'highfly_p188_save';
const KEY_P190 = 'highfly_p190_save';
const KEY_P192 = 'highfly_p192_save';
const KEY_P196 = 'highfly_p196_save';
const KEY_P197 = 'highfly_p197_save'; // isolated imported-quests experiment // never overwrites stable P192/P194 progress

export class SaveSys {
  constructor(game) {
    this.game = game;
    this.autosaveTimer = 0;
    this.key=game.p197Build?KEY_P197:game.p196Build?KEY_P196:game.p192Build?KEY_P192:game.p190Build?KEY_P190:game.p188Build?KEY_P188:game.p187Build?KEY_P187:game.p183Build?KEY_P183:game.p182Build?KEY_P182:game.p18Build?KEY_P18:game.p16Enabled?KEY_P16:game.p15Enabled?KEY_P15:game.p14Enabled?KEY_P14:game.p13Enabled?KEY_P13:game.p812Enabled?KEY_P812:game.p810Enabled?KEY_P810:game.p7Enabled?KEY:LEGACY_KEY;
  }

  save({silent=false}={}) {
    const g = this.game;
    const dragon = g.enemies.dragon;
    // 室内存档时记录门外位置与离门朝向，读档永远落在户外（interiors.savePosition 契约）
    const pos = g.interiors && g.interiors.savePosition ? g.interiors.savePosition() : g.player.pos;
    const yaw = g.interiors && typeof g.interiors.saveYaw === 'function' ? g.interiors.saveYaw() : g.player.yaw;
    const data = {
      dayTime: g.time.dayTime,
      player: { x: pos.x, y: pos.y, z: pos.z, yaw,
        torchOn:!!g.player.torchOn,
        torchStashedOffhand:g.player._torchStashedOffhand||null },
      stats: g.stats.serialize(),
      inv: g.inventory.serialize(),
      quests: g.quests.serialize(),
      combat: g.combat && g.combat.serialize ? g.combat.serialize() : null,
      chestsOpened: g.structures.chests
        .map((c, i) => (c.opened ? i : -1))
        .filter((i) => i >= 0),
      dragonDead: !dragon || !dragon.alive,
      ...(g.p18Enabled && g.livingWorld ? {livingWorld:g.livingWorld.serialize()} : {}),
      ...(g.p187Build && g.p187Professions ? {professionsP187:g.p187Professions.serialize()} : {}),
      ...(g.p192Build&&g.p192Hamlets?{hamletsP192:g.p192Hamlets.serialize()}:{}),
      ...(g.p190Build && g.p188Skills ? {skillsP190:g.p188Skills.serialize()} :
        g.p188Build&&g.p188Skills?{skillsP188:g.p188Skills.serialize()}:{}),
    };
    localStorage.setItem(this.key, JSON.stringify(data));
    if(!silent)g.hud.notify('Partida guardada');
  }

  hasSave() {
    return localStorage.getItem(this.key) !== null ||
      (this.game.p197Build && localStorage.getItem(KEY_P196)!==null) ||
      (this.game.p196Build && localStorage.getItem(KEY_P192)!==null) ||
      (this.game.p192Build && localStorage.getItem(KEY_P190)!==null) ||
      (this.game.p190Build && (localStorage.getItem(KEY_P188)!==null || localStorage.getItem(KEY_P187)!==null)) ||
      (this.game.p188Build && localStorage.getItem(KEY_P187)!==null) ||
      (this.game.p187Build && localStorage.getItem(KEY_P183)!==null) ||
      (this.game.p183Build && localStorage.getItem(KEY_P182)!==null) ||
      (this.game.p182Build && localStorage.getItem(KEY_P18)!==null) ||
      (this.game.p18Build && localStorage.getItem(KEY_P16)!==null) ||
      (this.game.p16Enabled && localStorage.getItem(KEY_P15)!==null) ||
      (this.game.p15Enabled && localStorage.getItem(KEY_P14)!==null) ||
      (this.game.p14Enabled && localStorage.getItem(KEY_P13)!==null) ||
      (this.game.p13Enabled && localStorage.getItem(KEY_P812)!==null) ||
      (this.game.p812Enabled && localStorage.getItem(KEY_P810)!==null) ||
      (this.game.p810Enabled && (localStorage.getItem(KEY)!==null || localStorage.getItem(LEGACY_KEY)!==null)) ||
      (this.game.p7Enabled && localStorage.getItem(LEGACY_KEY)!==null);
  }

  loadRaw() {
    // First P7 visit reads P6 progress, but writes ONLY P7: original never overwritten.
    const raw = localStorage.getItem(this.key) ||
      (this.game.p197Build?localStorage.getItem(KEY_P196):null) ||
      (this.game.p196Build?localStorage.getItem(KEY_P192):null) ||
      (this.game.p192Build?localStorage.getItem(KEY_P190):null) ||
      (this.game.p190Build?localStorage.getItem(KEY_P188):null) ||
      (this.game.p188Build?localStorage.getItem(KEY_P187):null) ||
      (this.game.p187Build?localStorage.getItem(KEY_P183):null) ||
      (this.game.p183Build?localStorage.getItem(KEY_P182):null) ||
      (this.game.p182Build?localStorage.getItem(KEY_P18):null) ||
      (this.game.p18Build?localStorage.getItem(KEY_P16):null) ||
      (this.game.p16Enabled?localStorage.getItem(KEY_P15):null) ||
      (this.game.p15Enabled?localStorage.getItem(KEY_P14):null) ||
      (this.game.p14Enabled?localStorage.getItem(KEY_P13):null) ||
      (this.game.p13Enabled?localStorage.getItem(KEY_P812):null) ||
      (this.game.p812Enabled?localStorage.getItem(KEY_P810):null) ||
      (this.game.p810Enabled?localStorage.getItem(KEY):null) ||
      (this.game.p7Enabled?localStorage.getItem(LEGACY_KEY):null);
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
    if(g.p192Build)g.p192Hamlets?.applyData(d.hamletsP192);
    if(g.p188Build){
      g.p188Skills?.applyData(g.p190Build?(d.skillsP190||d.skillsP188):d.skillsP188);
      // Existing P185/P187 quest progress unlocks only its earned discoveries.
      g.p188Skills?.syncExistingQuests();
    }
    if(g.p187Build)g.p187Professions?.applyData(d.professionsP187);
    if(g.p18Enabled)g.livingWorld?.applyData(d.livingWorld);
    if (g.combat && g.combat.applyData) g.combat.applyData(d.combat);
    if(g.p190Build){
      if(!d.skillsP190)g.p188Skills?.migratePriorCombat(d.combat);
      g.p188Skills?.syncWorldRunes();
    }
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
      if(this.game.p7Enabled){
        g.player.torchOn=!!d.player.torchOn;
        if(this.game.p810Enabled && g.player.torchOn){
          g.player._torchStashedOffhand=d.player.torchStashedOffhand || g.inventory.equipped.offhand || null;
          g.inventory.equipped.offhand=null;
          g.player.currentOffhand=null;g.player.updateOffhandVisual();
        }else if(g.inventory.equipped.offhand)g.player.torchOn=false;
        g.player.updateTorch();
      }
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
      // Autosave status remains observable without two stacked black toast panels.
      this.lastAutosaveStatus='Guardado automático';
      this.save({silent:true});
    }
  }
}
