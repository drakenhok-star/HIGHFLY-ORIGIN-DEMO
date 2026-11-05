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
  wolf_fang: { name:'Colmillo de lobo',type:'misc',value:21,desc:'Material obtenido de los lobos de pradera.' },
  greyjaw_fang: { name:'Colmillo de Greyjaw',type:'misc',value:145,desc:'Trofeo de un gran lobo alfa.' },
  spider_leg: { name:'Pata de araña',type:'misc',value:18,desc:'Ingrediente de criaturas arácnidas.' },
  spider_silk: { name: 'Seda de araña', type: 'misc', value: 16, desc: 'Material del bosque.' },
  boar_hide:{name:'Cuero de jabalí',type:'misc',value:22,desc:'Piel curtida de las praderas.'},
  boar_meat:{name:'Carne de jabalí',type:'misc',value:14,desc:'Recurso de caza.'},
  goblin_token:{name:'Amuleto goblin',type:'misc',value:26,desc:'Insignia de una tribu forestal.'},
  fox_fur:{name:'Pelaje de zorro',type:'misc',value:20,desc:'Material suave de bosque.'},
  deer_antler:{name:'Astas de ciervo',type:'misc',value:25,desc:'Material de fauna pacífica.'},
  yeti_fur:{name:'Pelaje de yeti',type:'misc',value:110,desc:'Material de nieve profunda.'},
  bandit_emblem:{name:'Emblema de bandido',type:'misc',value:38,desc:'Prueba de una patrulla derrotada.'},
  orc_tusk:{name:'Colmillo de orco',type:'misc',value:52,desc:'Material de las ruinas.'},
  crab_shell:{name:'Caparazón de cangrejo',type:'misc',value:18,desc:'Recurso de playa.'},
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
    this.equipped = { weapon: 'iron_sword', offhand: null, armor: 'cloth_armor' };
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

  useOrEquip(id, slot=null) {
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
      const targetSlot=slot==='offhand'&&item.type==='weapon'?'offhand':item.type;
      if(targetSlot==='offhand' && this.equipped.weapon===id && this.slots.get(id)<2){
        this.game.hud.notify('Necesitás dos copias de esa espada.');return false;
      }
      if(targetSlot==='weapon' && this.equipped.offhand===id && this.slots.get(id)<2){
        this.game.hud.notify('La otra mano ya usa esa única espada.');return false;
      }
      this.equipped[targetSlot] = id;
      if(targetSlot==='offhand'&&this.game.player){
        this.game.player.torchOn=false;
        if(this.game.p810Enabled)this.game.player._torchStashedOffhand=null;
        this.game.player.updateTorch();
      }
      this.game.hud.notify('Equipado: ' + item.name+(targetSlot==='offhand'?' (mano secundaria)':''));
    }
    return true;
  }

  unequip(slot) {
    if(!['weapon','offhand','armor'].includes(slot))return;
    this.equipped[slot]=null;
    this.game.hud.notify('Objeto desequipado');
  }

  weaponDamage() {
    return ITEM_DB[this.equipped.weapon]?.damage || 2;
  }
  offhandDamage() {
    return this.equipped.offhand ? Math.round((ITEM_DB[this.equipped.offhand]?.damage||0)*0.3) : 0;
  }

  armorValue() {
    return ITEM_DB[this.equipped.armor]?.armor || 0;
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
    if(this.game.p183Enabled && ['rare','epic','legendary'].includes(drop.rarity)){
      const titles={rare:'RARO',epic:'ÉPICO',legendary:'LEGENDARIO'};
      this.game.hud.notify('✦ BOTÍN '+titles[drop.rarity]);
    }
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
      equipped: { weapon: this.equipped.weapon, offhand: this.equipped.offhand, armor: this.equipped.armor },
      gold: this.gold,
    };
  }

  applyData(d) {
    if (!d) return;
    this.slots = new Map(d.slots || []);
    const eq=d.equipped||{};
    const valid=(id,type)=>id===null||(ITEM_DB[id]?.type===type && this.has(id));
    this.equipped = {
      weapon:valid(eq.weapon,'weapon')?eq.weapon:'iron_sword',
      armor:valid(eq.armor,'armor')?eq.armor:'cloth_armor',
      offhand:valid(eq.offhand,'weapon')?eq.offhand:null
    };
    if(this.equipped.weapon && this.equipped.offhand===this.equipped.weapon &&
       (this.slots.get(this.equipped.weapon)||0)<2)this.equipped.offhand=null;
    // Number.isFinite 挡手改存档写入的 NaN/字符串
    this.gold = Number.isFinite(d.gold) ? d.gold : 50;
  }
}
