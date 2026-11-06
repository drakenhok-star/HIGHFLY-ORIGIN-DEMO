import { ITEM_DB } from '../systems/inventory.js';
import { TrainingPreviewP161 } from './training-p161.js';

const EMBLEM_SVG =
  '<svg viewBox="0 0 160 96" width="150" height="90" aria-hidden="true">' +
  '<g fill="none" stroke="#c9a86a" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter">' +
  '<path d="M80 6 L80 88"/>' +
  '<path d="M68 14 L80 2 L92 14"/>' +
  '<path d="M80 26 L46 50 L18 42 L4 60"/>' +
  '<path d="M80 26 L114 50 L142 42 L156 60"/>' +
  '<path d="M58 74 L80 56 L102 74"/>' +
  '<path d="M70 88 L80 80 L90 88"/>' +
  '</g></svg>';

const HELP_KEYS = [
  ['W A S D', 'Mover'],
  ['Shift', 'Correr'],
  ['Espacio', 'Saltar'],
  ['Ratón', 'Cámara'],
  ['Click izquierdo', 'Ataque cuerpo a cuerpo'],
  ['Click derecho', 'Bola de fuego'],
  ['F', 'Grito'],
  ['Q', 'Cambiar grito'],
  ['E', 'Interactuar'],
  ['V', 'Primera/tercera persona'],
  ['T', 'Antorcha'],
  ['Rueda', 'Acercar/alejar cámara'],
  ['Tab', 'Inventario'],
  ['J', 'Misiones'],
  ['Esc', 'Pausa'],
];

function el(tag, cls, parent, text) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  if (parent) parent.appendChild(d);
  return d;
}

export class Menus {
  constructor(game) {
    this.game = game;
    this.helpReturn = 'main';
    this.invSelected = null;
    this.invUsable = false;
    this.root = el('div', null, document.body);
    this.root.id = 'menus';
    this.screens = {};
    this.buildSplash();
    this.buildMain();
    this.buildHelp();
    this.buildPause();
    this.buildInventory();
    this.buildQuests();
    this.buildDialogue();
    this.buildDeath();
    this.training = new TrainingPreviewP161(game, this);
    this.onState(game.state);
  }

  btn(label, id, onClick) {
    const b = document.createElement('button');
    b.className = 'menu-btn';
    if (id) b.id = id;
    b.textContent = label;
    b.addEventListener('click', () => {
      if (b.classList.contains('menu-btn-disabled')) return;
      this.game.audio.init();
      this.game.audio.play('click');
      onClick();
    });
    return b;
  }

  screen(name, id) {
    const s = el('div', 'menu-screen', this.root);
    s.id = id;
    this.screens[name] = s;
    return s;
  }

  showScreen(name) {
    for (const k in this.screens) this.screens[k].style.display = k === name ? 'flex' : 'none';
  }

  hideAll() {
    for (const k in this.screens) this.screens[k].style.display = 'none';
  }

  buildSplash() {
    this.splash = el('div', null, this.root);
    this.splash.id = 'boot-splash';
    el('div', 'boot-splash-title', this.splash, 'HIGHFLY');
    el('div', 'boot-splash-tip', this.splash, 'Preparando el mundo…');
  }

  hideSplash() {
    if (!this.splash || this.splashHiding) return;
    this.splashHiding = true;
    this.splash.classList.add('boot-splash-hide');
    setTimeout(() => {
      this.splash.style.display = 'none';
    }, 650);
  }

  buildMain() {
    const s = this.screen('main', 'menu-main');
    const panel = el('div', 'menu-panel menu-main-panel', s);
    const emblem = el('div', 'menu-emblem', panel);
    emblem.innerHTML = EMBLEM_SVG;
    el('div', 'menu-title', panel, 'HIGHFLY');
    const rule = el('div', 'menu-rule', panel);
    el('div', 'menu-rule-diamond', rule);
    el('div', 'menu-subtitle', panel, 'O R I G I N · H I G H F L Y');
    this.mainBtns = el('div', 'menu-btn-col', panel);
    el('div', 'menu-footer', s, 'HIGHFLY ORIGIN · Three.js');
  }

  showMain() {
    this.mainBtns.innerHTML = '';
    if (this.game.saveSys.hasSave()) {
      this.mainBtns.appendChild(this.btn('CONTINUAR', 'btn-continue', () => this.game.continueGame()));
    }
    this.mainBtns.appendChild(this.btn('NUEVA PARTIDA', 'btn-new', () => this.game.newGame()));
    this.mainBtns.appendChild(this.btn('ENTRENAMIENTO · TRAINING', 'btn-training-p161', () => this.training.open('menu')));
    this.mainBtns.appendChild(
      this.btn('CONTROLES', 'btn-help', () => {
        this.helpReturn = 'main';
        this.showScreen('help');
      })
    );
    this.showScreen('main');
  }

  buildHelp() {
    const s = this.screen('help', 'menu-help');
    const panel = el('div', 'menu-panel', s);
    el('h2', 'menu-h2', panel, 'CONTROLES');
    const grid = el('div', 'menu-keys', panel);
    for (const [k, d] of HELP_KEYS) {
      const row = el('div', 'menu-key-row', grid);
      el('span', 'menu-keycap', row, k);
      el('span', 'menu-keydesc', row, d);
    }
    panel.appendChild(this.btn('VOLVER', 'btn-help-back', () => this.showScreen(this.helpReturn)));
  }

  buildPause() {
    const s = this.screen('pause', 'menu-pause');
    const panel = el('div', 'menu-panel', s);
    el('h2', 'menu-h2', panel, 'PAUSA');
    this.pauseMain = el('div', 'menu-btn-col', panel);
    this.pauseMain.appendChild(this.btn('CONTINUAR', 'btn-resume', () => this.game.setState('playing')));
    this.pauseMain.appendChild(this.btn('ENTRENAMIENTO · TRAINING', 'btn-pause-training-p161', () => this.training.open('paused')));
    const saveBtn = this.btn('GUARDAR PARTIDA', 'btn-save', () => {
      this.game.saveSys.save();
      saveBtn.textContent = 'GUARDADO';
      setTimeout(() => {
        saveBtn.textContent = 'GUARDAR PARTIDA';
      }, 1000);
    });
    this.pauseMain.appendChild(saveBtn);
    this.pauseMain.appendChild(
      this.btn('CONTROLES', 'btn-pause-help', () => {
        this.helpReturn = 'pause';
        this.showScreen('help');
      })
    );
    this.pauseMain.appendChild(
      this.btn('MENÚ PRINCIPAL', 'btn-quit', () => {
        this.pauseMain.style.display = 'none';
        this.pauseConfirm.style.display = 'flex';
      })
    );
    this.pauseConfirm = el('div', 'menu-confirm', panel);
    el('div', 'menu-confirm-text', this.pauseConfirm, 'Se perderán los cambios sin guardar. ¿Salir?');
    const row = el('div', 'menu-confirm-row', this.pauseConfirm);
    row.appendChild(
      this.btn('CONFIRMAR', 'btn-quit-confirm', () => {
        this.resetPause();
        this.game.setState('menu');
        this.showMain();
      })
    );
    row.appendChild(this.btn('CANCELAR', 'btn-quit-cancel', () => this.resetPause()));
  }

  resetPause() {
    this.pauseMain.style.display = 'flex';
    this.pauseConfirm.style.display = 'none';
  }

  showPause() {
    this.resetPause();
    this.showScreen('pause');
  }

  buildInventory() {
    const s = this.screen('inventory', 'menu-inventory');
    const panel = el('div', 'menu-panel menu-box-panel menu-inv-panel', s);
    const header = el('div', 'menu-panel-header', panel);
    el('h2', 'menu-h2 menu-h2-header', header, 'Inventario');
    el('span', 'menu-hint', header, 'Tab para cerrar');
    const body = el('div', 'menu-inv-body', panel);
    const left = el('div', 'menu-inv-left', body);
    this.invList = el('div', 'menu-inv-list', left);
    this.invDesc = el('div', 'menu-item-desc', left);
    this.invStats = el('div', 'menu-inv-right', body);
    const bottom = el('div', 'menu-inv-bottom', panel);
    this.btnUse = this.btn('USAR', 'btn-use', () => {
      this.game.inventory.useOrEquip(this.invSelected);
      this.refreshInventory();
    });
    bottom.appendChild(this.btnUse);
  }

  refreshInventory() {
    const inv = this.game.inventory;
    const st = this.game.stats;
    this.invList.innerHTML = '';
    let hasSel = false;
    for (const [id, count] of inv.slots) {
      if (!count) continue;
      const item = ITEM_DB[id];
      const row = el('div', 'menu-item-row', this.invList);
      const nameBox = el('div', 'menu-item-name', row);
      el('span', null, nameBox, item.name);
      if (inv.equipped.weapon === id || inv.equipped.armor === id) el('span', 'menu-tag-equipped', nameBox, 'Equipado');
      const parts = [];
      if (count > 1) parts.push('×' + count);
      if (item.type === 'potion') parts.push(item.heal ? 'Restaura ' + item.heal + ' HP' : 'Restaura ' + item.mana + ' MP');
      else if (item.type === 'weapon') parts.push('Daño ' + item.damage);
      else if (item.type === 'armor') parts.push('Armadura ' + item.armor);
      parts.push('Valor ' + item.value);
      el('div', 'menu-item-meta', row, parts.join(' · '));
      if (id === this.invSelected) {
        row.classList.add('menu-item-selected');
        hasSel = true;
      }
      row.addEventListener('click', () => {
        this.invSelected = id;
        this.refreshInventory();
      });
    }
    if (!hasSel) this.invSelected = null;

    this.invDesc.textContent = this.invSelected ? ITEM_DB[this.invSelected].desc : 'Seleccioná un objeto para ver sus detalles.';

    this.invUsable = false;
    let label = 'USAR';
    if (this.invSelected) {
      const t = ITEM_DB[this.invSelected].type;
      if (t === 'weapon' || t === 'armor') {
        label = 'EQUIPAR';
        this.invUsable = true;
      } else if (t === 'potion') {
        label = 'USAR';
        this.invUsable = true;
      }
    }
    this.btnUse.textContent = label;
    this.btnUse.classList.toggle('menu-btn-disabled', !this.invUsable);

    this.invStats.innerHTML = '';
    const rows = [
      ['Nivel', st.level],
      ['Experiencia', Math.floor(st.xp) + ' / ' + st.xpNext()],
      ['Salud', Math.ceil(st.hp) + ' / ' + st.maxHp],
      ['Maná', Math.ceil(st.mp) + ' / ' + st.maxMp],
      ['Energía', Math.ceil(st.sp) + ' / ' + st.maxSp],
      ['Armadura', inv.armorValue()],
      ['Daño de arma', inv.weaponDamage()],
      ['Oro', inv.gold],
    ];
    for (const [k, v] of rows) {
      const r = el('div', 'menu-stat-row', this.invStats);
      el('span', 'menu-stat-label', r, k);
      el('span', 'menu-stat-value', r, String(v));
    }
  }

  buildQuests() {
    const s = this.screen('quests', 'menu-quests');
    const panel = el('div', 'menu-panel menu-box-panel menu-quest-panel', s);
    const header = el('div', 'menu-panel-header', panel);
    el('h2', 'menu-h2 menu-h2-header', header, 'Misiones');
    el('span', 'menu-hint', header, 'J para cerrar');
    this.questBody = el('div', 'menu-quest-body', panel);
  }

  refreshQuests() {
    const list = this.game.quests.list();
    this.questBody.innerHTML = '';
    el('div', 'menu-section-title', this.questBody, 'En curso');
    const active = list.filter((q) => q.state === 'active' || q.state === 'complete');
    if (!active.length) el('div', 'menu-quest-empty', this.questBody, 'No hay misiones en curso.');
    for (const q of active) {
      const card = el('div', 'menu-quest-card', this.questBody);
      const name = el('div', 'menu-quest-name', card, q.name);
      el('span', 'menu-quest-progress', name, q.state === 'complete' ? 'Lista para entregar' : q.progress + ' / ' + q.need);
      el('div', 'menu-quest-desc', card, q.desc);
      if(q.secret)el('div','menu-quest-desc',card,'Recompensa: ? (misión secreta)');
      else if(Number.isFinite(q.rewardGold)||Number.isFinite(q.rewardXp))
        el('div','menu-quest-desc',card,'Recompensa: '+(q.rewardGold??'—')+' oro · '+(q.rewardXp??'—')+' XP');
    }
    el('div', 'menu-section-title', this.questBody, 'Completadas');
    const done = list.filter((q) => q.state === 'done');
    if (!done.length) el('div', 'menu-quest-empty', this.questBody, 'Aún no completaste misiones.');
    for (const q of done) {
      const card = el('div', 'menu-quest-card menu-quest-card-done', this.questBody);
      el('div', 'menu-quest-name', card, q.name);
      el('div', 'menu-quest-desc', card, q.desc);
      if(q.secret)el('div','menu-quest-desc',card,'Recompensa: ? (misión secreta)');
      else if(Number.isFinite(q.rewardGold)||Number.isFinite(q.rewardXp))
        el('div','menu-quest-desc',card,'Recompensa: '+(q.rewardGold??'—')+' oro · '+(q.rewardXp??'—')+' XP');
    }
  }

  buildDialogue() {
    const s = this.screen('dialogue', 'menu-dialogue');
    const box = el('div', 'menu-dialogue-box', s);
    this.dlgName = el('div', 'menu-dialogue-name', box);
    this.dlgText = el('div', 'menu-dialogue-text', box);
    this.dlgRecipe = el('div','hf-p192-recipe-card',box);
    this.dlgOptions = el('div', 'menu-dialogue-options', box);
  }

  showDialogue(data) {
    this.dlgName.textContent = data.name;
    this.dlgText.textContent = data.text;
    this.dlgRecipe.replaceChildren();
    this.dlgRecipe.style.display=data.craftPreview?'grid':'none';
    if(data.craftPreview){
      const p=data.craftPreview;
      const title=el('strong',null,this.dlgRecipe,'RECETA · '+p.result);
      title.style.color='#ffdca0';
      for(const mat of p.inputs){
        const line=el('div',null,this.dlgRecipe,mat.name+': '+mat.owned+' / '+mat.needed);
        line.style.color=mat.ok?'#b7ffca':'#ff9fa4';
      }
      const oro=el('div',null,this.dlgRecipe,'ORO: '+p.ownedGold+' / '+p.gold);
      oro.style.color=p.ownedGold>=p.gold?'#b7ffca':'#ff9fa4';
      this.dlgRecipe.style.cssText='display:grid;gap:5px;padding:11px;margin:8px 0;'+
        'border:1px solid #be86e6;border-radius:10px;background:#201237;'+
        'font:600 13px/1.4 system-ui';
    }
    this.dlgOptions.innerHTML = '';
    for (const opt of data.options) {
      const b = this.btn(opt.label, null, () => opt.action());
      b.classList.add('menu-btn-full');
      if(opt.disabled){b.disabled=true;b.classList.add('menu-btn-disabled');}
      this.dlgOptions.appendChild(b);
    }
    this.showScreen('dialogue');
  }

  closeDialogue() {
    this.screens.dialogue.style.display = 'none';
    if (this.game.state === 'dialogue') this.game.setState('playing');
  }

  buildDeath() {
    const s = this.screen('death', 'menu-death');
    el('div', 'menu-death-title', s, 'HAS CAÍDO');
    this.deathBtns = el('div', 'menu-btn-col', s);
  }

  showDeath() {
    this.deathBtns.innerHTML = '';
    if (this.game.saveSys.hasSave()) {
      this.deathBtns.appendChild(this.btn('CARGAR PARTIDA', 'btn-load-death', () => this.game.continueGame()));
    }
    this.deathBtns.appendChild(
      this.btn('MENÚ PRINCIPAL', 'btn-death-menu', () => {
        this.game.setState('menu');
        this.showMain();
      })
    );
    this.showScreen('death');
  }

  onState(s) {
    if (s === 'menu') {
      this.showMain();
    } else if (s === 'paused') {
      this.showPause();
    } else if (s === 'training') {
      this.training.show();
    } else if (s === 'inventory') {
      this.refreshInventory();
      this.showScreen('inventory');
    } else if (s === 'quests') {
      this.refreshQuests();
      this.showScreen('quests');
    } else if (s === 'dialogue') {
      this.showScreen('dialogue');
    } else if (s === 'dead') {
      this.showDeath();
    } else {
      this.hideAll();
    }
  }
}
