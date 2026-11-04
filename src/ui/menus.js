import { ITEM_DB } from '../systems/inventory.js';

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
  ['W A S D', '移动'],
  ['Shift', '疾跑'],
  ['空格', '跳跃'],
  ['鼠标', '视角'],
  ['左键', '近战攻击'],
  ['右键', '火球术'],
  ['F', '龙吼'],
  ['Q', '切换龙吼'],
  ['E', '互动'],
  ['V', '第一/第三人称'],
  ['T', '手持火把'],
  ['滚轮', '缩放视角'],
  ['Tab', '物品栏'],
  ['J', '任务日志'],
  ['Esc', '暂停'],
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
    el('div', 'boot-splash-title', this.splash, '天 际');
    el('div', 'boot-splash-tip', this.splash, '正在生成天际省……');
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
    el('div', 'menu-title', panel, '天 际');
    const rule = el('div', 'menu-rule', panel);
    el('div', 'menu-rule-diamond', rule);
    el('div', 'menu-subtitle', panel, 'T I A N J I E · V');
    this.mainBtns = el('div', 'menu-btn-col', panel);
    el('div', 'menu-footer', s, 'TIANJIE V · 基于 Three.js 构筑');
  }

  showMain() {
    this.mainBtns.innerHTML = '';
    if (this.game.saveSys.hasSave()) {
      this.mainBtns.appendChild(this.btn('继续游戏', 'btn-continue', () => this.game.continueGame()));
    }
    this.mainBtns.appendChild(this.btn('新游戏', 'btn-new', () => this.game.newGame()));
    this.mainBtns.appendChild(
      this.btn('操作说明', 'btn-help', () => {
        this.helpReturn = 'main';
        this.showScreen('help');
      })
    );
    this.showScreen('main');
  }

  buildHelp() {
    const s = this.screen('help', 'menu-help');
    const panel = el('div', 'menu-panel', s);
    el('h2', 'menu-h2', panel, '操作说明');
    const grid = el('div', 'menu-keys', panel);
    for (const [k, d] of HELP_KEYS) {
      const row = el('div', 'menu-key-row', grid);
      el('span', 'menu-keycap', row, k);
      el('span', 'menu-keydesc', row, d);
    }
    panel.appendChild(this.btn('返回', 'btn-help-back', () => this.showScreen(this.helpReturn)));
  }

  buildPause() {
    const s = this.screen('pause', 'menu-pause');
    const panel = el('div', 'menu-panel', s);
    el('h2', 'menu-h2', panel, '已暂停');
    this.pauseMain = el('div', 'menu-btn-col', panel);
    this.pauseMain.appendChild(this.btn('继续游戏', 'btn-resume', () => this.game.setState('playing')));
    const saveBtn = this.btn('保存游戏', 'btn-save', () => {
      this.game.saveSys.save();
      saveBtn.textContent = '已保存';
      setTimeout(() => {
        saveBtn.textContent = '保存游戏';
      }, 1000);
    });
    this.pauseMain.appendChild(saveBtn);
    this.pauseMain.appendChild(
      this.btn('操作说明', 'btn-pause-help', () => {
        this.helpReturn = 'pause';
        this.showScreen('help');
      })
    );
    this.pauseMain.appendChild(
      this.btn('回到主菜单', 'btn-quit', () => {
        this.pauseMain.style.display = 'none';
        this.pauseConfirm.style.display = 'flex';
      })
    );
    this.pauseConfirm = el('div', 'menu-confirm', panel);
    el('div', 'menu-confirm-text', this.pauseConfirm, '未保存的进度将丢失，确定吗？');
    const row = el('div', 'menu-confirm-row', this.pauseConfirm);
    row.appendChild(
      this.btn('确定', 'btn-quit-confirm', () => {
        this.resetPause();
        this.game.setState('menu');
        this.showMain();
      })
    );
    row.appendChild(this.btn('取消', 'btn-quit-cancel', () => this.resetPause()));
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
    el('h2', 'menu-h2 menu-h2-header', header, '物品栏');
    el('span', 'menu-hint', header, 'Tab 关闭');
    const body = el('div', 'menu-inv-body', panel);
    const left = el('div', 'menu-inv-left', body);
    this.invList = el('div', 'menu-inv-list', left);
    this.invDesc = el('div', 'menu-item-desc', left);
    this.invStats = el('div', 'menu-inv-right', body);
    const bottom = el('div', 'menu-inv-bottom', panel);
    this.btnUse = this.btn('使用', 'btn-use', () => {
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
      if (inv.equipped.weapon === id || inv.equipped.armor === id) el('span', 'menu-tag-equipped', nameBox, '已装备');
      const parts = [];
      if (count > 1) parts.push('×' + count);
      if (item.type === 'potion') parts.push(item.heal ? '恢复 ' + item.heal + ' 生命' : '恢复 ' + item.mana + ' 法力');
      else if (item.type === 'weapon') parts.push('伤害 ' + item.damage);
      else if (item.type === 'armor') parts.push('护甲 ' + item.armor);
      parts.push('价值 ' + item.value);
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

    this.invDesc.textContent = this.invSelected ? ITEM_DB[this.invSelected].desc : '选择一件物品查看详情。';

    this.invUsable = false;
    let label = '使用';
    if (this.invSelected) {
      const t = ITEM_DB[this.invSelected].type;
      if (t === 'weapon' || t === 'armor') {
        label = '装备';
        this.invUsable = true;
      } else if (t === 'potion') {
        label = '使用';
        this.invUsable = true;
      }
    }
    this.btnUse.textContent = label;
    this.btnUse.classList.toggle('menu-btn-disabled', !this.invUsable);

    this.invStats.innerHTML = '';
    const rows = [
      ['等级', st.level],
      ['经验', Math.floor(st.xp) + ' / ' + st.xpNext()],
      ['生命', Math.ceil(st.hp) + ' / ' + st.maxHp],
      ['法力', Math.ceil(st.mp) + ' / ' + st.maxMp],
      ['耐力', Math.ceil(st.sp) + ' / ' + st.maxSp],
      ['护甲', inv.armorValue()],
      ['武器伤害', inv.weaponDamage()],
      ['金币', inv.gold],
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
    el('h2', 'menu-h2 menu-h2-header', header, '任务日志');
    el('span', 'menu-hint', header, 'J 关闭');
    this.questBody = el('div', 'menu-quest-body', panel);
  }

  refreshQuests() {
    const list = this.game.quests.list();
    this.questBody.innerHTML = '';
    el('div', 'menu-section-title', this.questBody, '进行中');
    const active = list.filter((q) => q.state === 'active' || q.state === 'complete');
    if (!active.length) el('div', 'menu-quest-empty', this.questBody, '暂无进行中的任务。');
    for (const q of active) {
      const card = el('div', 'menu-quest-card', this.questBody);
      const name = el('div', 'menu-quest-name', card, q.name);
      el('span', 'menu-quest-progress', name, q.state === 'complete' ? '可交付' : q.progress + ' / ' + q.need);
      el('div', 'menu-quest-desc', card, q.desc);
    }
    el('div', 'menu-section-title', this.questBody, '已完成');
    const done = list.filter((q) => q.state === 'done');
    if (!done.length) el('div', 'menu-quest-empty', this.questBody, '尚未完成任何任务。');
    for (const q of done) {
      const card = el('div', 'menu-quest-card menu-quest-card-done', this.questBody);
      el('div', 'menu-quest-name', card, q.name);
      el('div', 'menu-quest-desc', card, q.desc);
    }
  }

  buildDialogue() {
    const s = this.screen('dialogue', 'menu-dialogue');
    const box = el('div', 'menu-dialogue-box', s);
    this.dlgName = el('div', 'menu-dialogue-name', box);
    this.dlgText = el('div', 'menu-dialogue-text', box);
    this.dlgOptions = el('div', 'menu-dialogue-options', box);
  }

  showDialogue(data) {
    this.dlgName.textContent = data.name;
    this.dlgText.textContent = data.text;
    this.dlgOptions.innerHTML = '';
    for (const opt of data.options) {
      const b = this.btn(opt.label, null, () => opt.action());
      b.classList.add('menu-btn-full');
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
    el('div', 'menu-death-title', s, '你 死 了');
    this.deathBtns = el('div', 'menu-btn-col', s);
  }

  showDeath() {
    this.deathBtns.innerHTML = '';
    if (this.game.saveSys.hasSave()) {
      this.deathBtns.appendChild(this.btn('读取存档', 'btn-load-death', () => this.game.continueGame()));
    }
    this.deathBtns.appendChild(
      this.btn('回到主菜单', 'btn-death-menu', () => {
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
