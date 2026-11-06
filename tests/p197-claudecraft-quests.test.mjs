import assert from 'node:assert/strict';
import {CC_QUESTS_P197,ClaudeQuestBridgeP197} from '../src/world/claudecraft-quests-p197.js';
assert.equal(CC_QUESTS_P197.length,3);
assert.deepEqual(CC_QUESTS_P197.map(x=>x.sourceId),['q_wolves','q_boars','q_spiders']);
const inv={gold:0,slots:new Map([['boar_hide',5],['spider_silk',4]]),
 removeItem(item,qty){assert.ok(this.slots.get(item)>=qty);this.slots.set(item,this.slots.get(item)-qty)}};
let xp=0,saveCount=0;
const game={stats:{level:3,addXP(n){xp+=n}},inventory:inv,
 quests:{getState(q){return q==='q1'?'done':'available'}},
 hud:{questBanner(){},notify(){}},audio:{play(){}},
 saveSys:{save(){saveCount++}}};
const b=new ClaudeQuestBridgeP197(game);
assert.ok(b.accept('cc_q_wolves'));
for(let i=0;i<8;i++)b.onEnemyKilled('wolf');
assert.equal(b.getState('cc_q_wolves'),'complete');
assert.equal(b.turnIn('cc_q_wolves','olaf'),true);
assert.equal(b.turnIn('cc_q_wolves','olaf'),false);
assert.ok(b.accept('cc_q_boars'));assert.equal(b.getState('cc_q_boars'),'complete');
assert.equal(b.turnIn('cc_q_boars','master_tanner'),true);
assert.equal(inv.slots.get('boar_hide'),0);
assert.ok(b.accept('cc_q_spiders'));
for(let i=0;i<6;i++)b.onEnemyKilled('spider');
assert.equal(b.getState('cc_q_spiders'),'complete');
assert.equal(b.turnIn('cc_q_spiders','master_herbalist'),true);
assert.equal(inv.slots.get('spider_silk'),0);
assert.equal(xp,1020);
assert.equal(inv.gold,335);
assert.equal(b.list().length,3);
const data=b.serialize(),migrated=new ClaudeQuestBridgeP197(game);
migrated.applyData(data);
assert.ok(migrated.list().every(q=>q.state==='done'));
assert.ok(saveCount>=6);
const novice={...game,stats:{level:1,addXP(){}}};
const n=new ClaudeQuestBridgeP197(novice);
assert.equal(n.accept('cc_q_spiders'),false);
assert.equal(n.turnIn('cc_q_wolves','olaf'),false);
const stale=new ClaudeQuestBridgeP197(game);
stale.applyData({schemaVersion:197,states:{cc_q_spiders:'active'},kills:{cc_q_spiders:{spider:999999}}});
assert.equal(stale.kills.cc_q_spiders.spider,6);
console.log('P197 Quest Bridge: 3 MIT source quests, exact kill & inventory goals, 1020 XP / 335 gold, one-shot rewards, durable save and level gating: PASS');
