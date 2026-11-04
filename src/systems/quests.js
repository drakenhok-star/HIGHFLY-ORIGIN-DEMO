import * as THREE from 'three';

const QUEST_DEFS = {
  q1: { name: '狼患', giver: 'olaf', desc: '为村长奥拉夫猎杀 5 头冰原狼。', kind: 'kill', target: 'wolf', need: 5, rewardGold: 100, rewardXp: 80 },
  q2: { name: '先祖之刃', giver: 'sigrid', desc: '从立石阵的石箱中取回先祖之刃。', kind: 'item', target: 'ancient_sword', need: 1, rewardGold: 150, rewardXp: 100 },
  q3: { name: '天际之祸', giver: 'olaf', desc: '斩杀盘踞古塔的远古巨龙。', kind: 'kill', target: 'dragon', need: 1, rewardGold: 500, rewardXp: 400 },
};

const QUEST_IDS = ['q1', 'q2', 'q3'];
const GIVER_NAMES = { olaf: '村长奥拉夫', sigrid: '铁匠西格丽德' };
const WOLF_PACK_HOMES = [
  [120, 160],
  [-150, 120],
  [80, -180],
];

export class Quests {
  constructor(game) {
    this.game = game;
    this._markerVecs = {
      q1: new THREE.Vector3(),
      q2: new THREE.Vector3(),
      q3: new THREE.Vector3(),
    };
    this.reset();
  }

  reset() {
    this.states = { q1: 'available', q2: 'available', q3: 'locked' };
    this.progress = { q1: 0, q2: 0, q3: 0 };
  }

  getState(id) {
    return this.states[id];
  }

  accept(id) {
    const def = QUEST_DEFS[id];
    this.states[id] = 'active';
    this.game.hud.questBanner('接受任务：' + def.name);
    this.game.audio.play('quest');
    if (def.kind === 'item' && this.game.inventory.has(def.target)) {
      this.progress[id] = def.need;
      this._complete(id);
    }
    if (def.kind === 'kill' && def.target === 'dragon') {
      const dragon = this.game.enemies.dragon;
      // 巨龙不重生，接取前已被杀则直接计为完成，避免主线软锁
      if (!dragon || !dragon.alive) {
        this.progress[id] = def.need;
        this._complete(id);
      }
    }
  }

  _complete(id) {
    const def = QUEST_DEFS[id];
    this.states[id] = 'complete';
    this.game.hud.questBanner('任务目标完成：' + def.name);
    this.game.hud.notify('回去向' + GIVER_NAMES[def.giver] + '交付任务');
  }

  onEnemyKilled(type) {
    for (const id of QUEST_IDS) {
      const def = QUEST_DEFS[id];
      if (this.states[id] !== 'active' || def.kind !== 'kill' || def.target !== type) continue;
      this.progress[id]++;
      this.game.hud.notify(def.name + '：' + this.progress[id] + '/' + def.need);
      if (this.progress[id] >= def.need) this._complete(id);
    }
  }

  onItemAcquired(itemId) {
    for (const id of QUEST_IDS) {
      const def = QUEST_DEFS[id];
      if (this.states[id] !== 'active' || def.kind !== 'item' || def.target !== itemId) continue;
      this.progress[id] = def.need;
      this._complete(id);
    }
  }

  turnIn(id) {
    const def = QUEST_DEFS[id];
    this.states[id] = 'done';
    this.game.inventory.gold += def.rewardGold;
    this.game.hud.notify('获得 ' + def.rewardGold + ' 金币');
    this.game.stats.addXP(def.rewardXp);
    this.game.hud.questBanner('任务完成：' + def.name);
    this.game.audio.play('quest');
    if (this.states.q1 === 'done' && this.states.q2 === 'done' && this.states.q3 === 'locked') {
      this.states.q3 = 'available';
      this.game.hud.notify('村长奥拉夫似乎有新的委托');
    }
    this.game.saveSys.save();
    if (id === 'q3') {
      this.game.hud.questBanner('天际恢复了安宁');
      this.game.audio.play('fanfare');
    }
  }

  list() {
    return QUEST_IDS.map((id) => {
      const def = QUEST_DEFS[id];
      return {
        id,
        name: def.name,
        desc: def.desc,
        state: this.states[id],
        progress: this.progress[id],
        need: def.need,
      };
    });
  }

  markers() {
    const out = [];
    if (this.states.q1 === 'active') {
      const pos = this._wolfMarkerPos();
      if (pos) out.push({ pos, label: QUEST_DEFS.q1.name });
    }
    if (this.states.q2 === 'active') {
      const chest = this.game.structures.chests[0];
      if (chest) {
        out.push({ pos: this._markerVecs.q2.copy(chest.pos), label: QUEST_DEFS.q2.name });
      }
    }
    if (this.states.q3 === 'active') {
      const dragon = this.game.enemies.dragon;
      if (dragon && dragon.alive) {
        out.push({ pos: this._markerVecs.q3.copy(dragon.group.position), label: QUEST_DEFS.q3.name });
      }
    }
    return out;
  }

  _wolfMarkerPos() {
    const playerPos = this.game.player.pos;
    const v = this._markerVecs.q1;
    let best = null;
    let bestDist = Infinity;
    for (const enemy of this.game.enemies.list) {
      // 霜狼（ice）不属于 q1 目标，标记不指向高台狼群
      if (enemy.type !== 'wolf' || enemy.ice || !enemy.alive) continue;
      const d = enemy.group.position.distanceToSquared(playerPos);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    if (best) return v.copy(best.group.position);
    let home = WOLF_PACK_HOMES[0];
    bestDist = Infinity;
    for (const [hx, hz] of WOLF_PACK_HOMES) {
      const dx = hx - playerPos.x;
      const dz = hz - playerPos.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        home = [hx, hz];
      }
    }
    return v.set(home[0], this.game.terrain.getHeight(home[0], home[1]), home[1]);
  }

  serialize() {
    return {
      states: { q1: this.states.q1, q2: this.states.q2, q3: this.states.q3 },
      progress: { q1: this.progress.q1, q2: this.progress.q2, q3: this.progress.q3 },
    };
  }

  applyData(d) {
    if (!d) return;
    this.states = { ...this.states, ...(d.states || {}) };
    this.progress = { ...this.progress, ...(d.progress || {}) };
    // 兜底修复旧存档：解锁条件已满足但 q3 仍为 locked
    if (this.states.q1 === 'done' && this.states.q2 === 'done' && this.states.q3 === 'locked') {
      this.states.q3 = 'available';
    }
  }
}
