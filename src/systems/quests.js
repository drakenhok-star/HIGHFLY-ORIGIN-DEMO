import * as THREE from 'three';
import { nearestFrontierTargetP181 } from '../ui/frontier-tracking-p181.js';
import { P18_FRONTIER_QUEST } from '../world/living-world-runtime-p18.js';

const QUEST_DEFS = {
  q1: { name: 'Amenaza de lobos', giver: 'olaf', desc: 'Eliminá 5 lobos para ayudar a Olaf.', kind: 'kill', target: 'wolf', need: 5, rewardGold: 100, rewardXp: 80 },
  q2: { name: 'Espada ancestral', giver: 'sigrid', desc: 'Recuperá la espada ancestral del cofre de las ruinas.', kind: 'item', target: 'ancient_sword', need: 1, rewardGold: 150, rewardXp: 100 },
  q3: { name: 'Amenaza del dragón', giver: 'olaf', desc: 'Derrotá al dragón que habita la torre.', kind: 'kill', target: 'dragon', need: 1, rewardGold: 500, rewardXp: 400 },
};

const QUEST_IDS = ['q1', 'q2', 'q3'];
const GIVER_NAMES = { olaf: 'Olaf, jefe de la aldea', sigrid: 'Sigrid, herrera' };
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
      p18: new THREE.Vector3(),
    };
    this.reset();
  }

  reset() {
    this.states = { q1: 'available', q2: 'available', q3: 'locked' };
    this.progress = { q1: 0, q2: 0, q3: 0 };
  }

  getState(id) {
    if(id==='p18_frontier'&&this.game.p18Enabled)return this.game.livingWorld?.quest?.status||'available';
    return this.states[id];
  }

  accept(id) {
    const def = QUEST_DEFS[id];
    this.states[id] = 'active';
    this.game.hud.questBanner('Misión aceptada: ' + def.name);
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
    this.game.hud.questBanner('Objetivo completado: ' + def.name);
    this.game.hud.notify('Volvé con ' + GIVER_NAMES[def.giver] + ' para entregar la misión');
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
    this.game.hud.notify('Obtuviste ' + def.rewardGold + ' de oro');
    this.game.stats.addXP(def.rewardXp);
    this.game.hud.questBanner('Misión completada: ' + def.name);
    this.game.audio.play('quest');
    if (this.states.q1 === 'done' && this.states.q2 === 'done' && this.states.q3 === 'locked') {
      this.states.q3 = 'available';
      this.game.hud.notify('Olaf, jefe de la aldea tiene una misión nueva');
    }
    this.game.saveSys.save();
    if (id === 'q3') {
      this.game.hud.questBanner('La región vuelve a estar en paz');
      this.game.audio.play('fanfare');
    }
  }

  list() {
    const quests=QUEST_IDS.map((id) => {
      const def = QUEST_DEFS[id];
      return {
        id,
        name: def.name,
        desc: def.desc,
        state: this.states[id],
        progress: this.progress[id],
        need: def.need,
        rewardGold:def.rewardGold,rewardXp:def.rewardXp,
        giver:GIVER_NAMES[def.giver],kind:id==='q2'?'secundaria':'principal',secret:false,
      };
    });
    // The P18 quest is owned by LivingWorldP18; expose it to the EXISTING
    // quest journal without altering P16 quest definitions or save schema.
    const frontier=this.game.p18Enabled?this.game.livingWorld?.quest:null;
    if(frontier)quests.push({
      id:'p18_frontier',name:'Centinelas de la frontera',
      desc:'Eliminá 3 lobos de la frontera este u oeste. Volvé con Bjorn.',
      state:frontier.status,progress:frontier.progress,need:P18_FRONTIER_QUEST.need,
      rewardGold:P18_FRONTIER_QUEST.rewardGold,rewardXp:P18_FRONTIER_QUEST.rewardXp,
      giver:'Bjorn · aldea',kind:'secundaria',secret:false
    });
    return quests;
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
    const frontier=this.game.p18Enabled?this.game.livingWorld?.quest:null;
    if(frontier?.status==='active'||frontier?.status==='complete'){
      const goal=nearestFrontierTargetP181(this.game);
      if(goal)out.push({
        pos:this._markerVecs.p18.set(goal.x,this.game.terrain.getHeight(goal.x,goal.z),goal.z),
        label:goal.label
      });
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
