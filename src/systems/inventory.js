export const ITEM_DB = {
  iron_sword: { name: '铁剑', type: 'weapon', damage: 8, value: 25, desc: '寻常的铁制长剑。' },
  steel_sword: { name: '钢剑', type: 'weapon', damage: 14, value: 120, desc: '精钢锻造，锋利可靠。' },
  ancient_sword: { name: '先祖之刃', type: 'weapon', damage: 22, value: 400, desc: '诺德先祖锻造的古剑，泛着幽蓝寒光。' },
  dragonbone_sword: { name: '龙骨剑', type: 'weapon', damage: 30, value: 900, desc: '以龙骨锻成，挥动时隐有龙吟。' },
  cloth_armor: { name: '布衣', type: 'armor', armor: 5, value: 10, desc: '粗布衣裳，聊胜于无。' },
  hide_armor: { name: '兽皮甲', type: 'armor', armor: 14, value: 120, desc: '坚韧的兽皮护甲。' },
  dragonscale_armor: { name: '龙鳞甲', type: 'armor', armor: 28, value: 1200, desc: '龙鳞层叠，刀剑难伤。' },
  health_potion: { name: '治疗药水', type: 'potion', heal: 40, value: 30, desc: '恢复 40 点生命。' },
  mana_potion: { name: '法力药水', type: 'potion', mana: 40, value: 30, desc: '恢复 40 点法力。' },
  wolf_pelt: { name: '狼皮', type: 'misc', value: 12, desc: '冰原狼的毛皮。' },
  draugr_bone: { name: '尸鬼骨灰', type: 'misc', value: 18, desc: '散发寒气的骨灰。' },
  dragon_bone: { name: '龙骨', type: 'misc', value: 500, desc: '远古巨龙的骨骼。' },
  dragon_scale: { name: '龙鳞', type: 'misc', value: 350, desc: '坚不可摧的鳞片。' },
  ancient_relic: { name: '先祖遗物', type: 'misc', value: 220, desc: '地穴深处的古物，泛着幽光。' },
  frost_essence: { name: '霜之精华', type: 'misc', value: 60, desc: '霜狼体内凝结的寒气。' },
};

export class Inventory {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.slots = new Map([
      ['iron_sword', 1],
      ['cloth_armor', 1],
      ['health_potion', 3],
    ]);
    this.equipped = { weapon: 'iron_sword', armor: 'cloth_armor' };
    this.gold = 50;
  }

  addItem(id, n = 1) {
    const item = ITEM_DB[id];
    // 手改存档/任务配置可能带未知 id，静默丢弃并留日志，避免 TypeError 中断游戏循环
    if (!item) {
      console.warn('[inventory] 未知物品 id: ' + id);
      return;
    }
    this.slots.set(id, (this.slots.get(id) || 0) + n);
    this.game.hud.notify('获得 ' + item.name + (n > 1 ? ' ×' + n : ''));
    this.game.quests.onItemAcquired(id);
  }

  removeItem(id, n = 1) {
    const left = (this.slots.get(id) || 0) - n;
    if (left > 0) this.slots.set(id, left);
    else this.slots.delete(id);
  }

  has(id) {
    return (this.slots.get(id) || 0) > 0;
  }

  useOrEquip(id) {
    const item = ITEM_DB[id];
    if (!item || !this.has(id)) return;
    if (item.type === 'potion') {
      this.removeItem(id, 1);
      if (item.heal) {
        this.game.stats.heal(item.heal);
        this.game.hud.notify('恢复 ' + item.heal + ' 点生命');
      }
      if (item.mana) {
        this.game.stats.restoreMp(item.mana);
        this.game.hud.notify('恢复 ' + item.mana + ' 点法力');
      }
      this.game.audio.play('potion');
    } else if (item.type === 'weapon' || item.type === 'armor') {
      this.equipped[item.type] = id;
      this.game.hud.notify('已装备 ' + item.name);
    }
  }

  weaponDamage() {
    return ITEM_DB[this.equipped.weapon].damage;
  }

  armorValue() {
    return ITEM_DB[this.equipped.armor].armor;
  }

  openChest(chest) {
    if (chest.opened) return;
    chest.opened = true;
    this.game.audio.play('chest');
    if (chest.gold > 0) {
      this.gold += chest.gold;
      this.game.hud.notify('获得 ' + chest.gold + ' 金币');
    }
    for (const id of chest.loot) this.addItem(id);
  }

  pickupDrop(drop) {
    this.game.audio.play('chest');
    if (drop.gold > 0) {
      this.gold += drop.gold;
      this.game.hud.notify('获得 ' + drop.gold + ' 金币');
    }
    for (const id of drop.items) this.addItem(id);
    if (drop.mesh && drop.mesh.parent) drop.mesh.parent.remove(drop.mesh);
    const drops = this.game.enemies.lootDrops;
    const i = drops.indexOf(drop);
    if (i >= 0) drops.splice(i, 1);
  }

  serialize() {
    return {
      slots: Array.from(this.slots.entries()),
      equipped: { weapon: this.equipped.weapon, armor: this.equipped.armor },
      gold: this.gold,
    };
  }

  applyData(d) {
    if (!d) return;
    this.slots = new Map(d.slots || []);
    this.equipped = {
      weapon: (d.equipped && d.equipped.weapon) || 'iron_sword',
      armor: (d.equipped && d.equipped.armor) || 'cloth_armor',
    };
    // Number.isFinite 挡手改存档写入的 NaN/字符串
    this.gold = Number.isFinite(d.gold) ? d.gold : 50;
  }
}
