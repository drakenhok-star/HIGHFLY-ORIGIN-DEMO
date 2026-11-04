export const ITEM_DB = {
  iron_sword: { name: 'Espada de hierro', type: 'weapon', damage: 8, value: 25, desc: 'Una espada sencilla de hierro.' },
  steel_sword: { name: 'Espada de acero', type: 'weapon', damage: 14, value: 120, desc: 'Acero bien forjado, resistente y afilado.' },
  ancient_sword: { name: 'Espada ancestral', type: 'weapon', damage: 22, value: 400, desc: 'Una espada ancestral de brillo azulado.' },
  dragonbone_sword: { name: 'Espada de hueso de dragón', type: 'weapon', damage: 30, value: 900, desc: 'Forjada con hueso de dragón.' },
  cloth_armor: { name: 'Ropa de tela', type: 'armor', armor: 5, value: 10, desc: 'Ropa sencilla de tela.' },
  hide_armor: { name: 'Armadura de piel', type: 'armor', armor: 14, value: 120, desc: 'Protección de cuero resistente.' },
  dragonscale_armor: { name: 'Armadura de escamas', type: 'armor', armor: 28, value: 1200, desc: 'Armadura de escamas muy resistentes.' },
  health_potion: { name: 'Poción de salud', type: 'potion', heal: 40, value: 30, desc: 'Restaura 40 HP.' },
  mana_potion: { name: 'Poción de maná', type: 'potion', mana: 40, value: 30, desc: 'Restaura 40 MP.' },
  wolf_pelt: { name: 'Piel de lobo', type: 'misc', value: 12, desc: 'Pelaje de lobo de las tierras frías.' },
  draugr_bone: { name: 'Restos de draugr', type: 'misc', value: 18, desc: 'Restos impregnados de frío.' },
  dragon_bone: { name: 'Hueso de dragón', type: 'misc', value: 500, desc: 'Huesos de un dragón antiguo.' },
  dragon_scale: { name: 'Escama de dragón', type: 'misc', value: 350, desc: 'Escamas extraordinariamente resistentes.' },
  ancient_relic: { name: 'Reliquia ancestral', type: 'misc', value: 220, desc: 'Reliquia encontrada en la cripta.' },
  frost_essence: { name: 'Esencia helada', type: 'misc', value: 60, desc: 'Esencia de un lobo helado.' },
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
      console.warn('[inventory] Objeto desconocido: ' + id);
      return;
    }
    this.slots.set(id, (this.slots.get(id) || 0) + n);
    this.game.hud.notify('Obtuviste ' + item.name + (n > 1 ? ' ×' + n : ''));
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
        this.game.hud.notify('Recuperaste ' + item.heal + ' HP');
      }
      if (item.mana) {
        this.game.stats.restoreMp(item.mana);
        this.game.hud.notify('Recuperaste ' + item.mana + ' MP');
      }
      this.game.audio.play('potion');
    } else if (item.type === 'weapon' || item.type === 'armor') {
      this.equipped[item.type] = id;
      this.game.hud.notify('Equipado: ' + item.name);
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
      this.game.hud.notify('Obtuviste ' + chest.gold + ' de oro');
    }
    for (const id of chest.loot) this.addItem(id);
  }

  pickupDrop(drop) {
    this.game.audio.play('chest');
    if (drop.gold > 0) {
      this.gold += drop.gold;
      this.game.hud.notify('Obtuviste ' + drop.gold + ' de oro');
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
