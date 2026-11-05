import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LivingWorldP18,P18_FRONTIER_QUEST} from '../src/world/living-world-runtime-p18.js';
import {SaveSys} from '../src/systems/save.js';
import {regionAtP18,worldIsSafeP18} from '../src/world/world-registry-p18.js';

globalThis.window={};
globalThis.document={
 createElement:()=>({style:{},dataset:{},setAttribute(){},textContent:'',id:''}),
 body:{appendChild(){}},head:{appendChild(){}}
};
const events={notification:[],banner:[],save:[]};
const game={
 p18Build:true,p18Enabled:true,p16Enabled:true,state:'playing',
 time:{dayTime:.50},interiors:{inside:null},
 player:{pos:{x:0,y:0,z:40},yaw:0},
 hud:{notify(s){events.notification.push(s)},questBanner(s){events.banner.push(s)}},
 inventory:{gold:10,serialize(){return {gold:this.gold}}},
 stats:{xp:0,addXP(n){this.xp+=n},serialize(){return {xp:this.xp}}},
 quests:{serialize(){return {states:{},progress:{}}}},
 combat:null,structures:{chests:[]},
 enemies:{dragon:{alive:true},list:[],packs:[{p18:true},{p18:true}]},
 npcs:{list:[{id:'olaf'},{id:'sigrid'},{id:'bjorn'}]},
 saveSys:{key:'highfly_p18_save',save(){events.save.push(game.livingWorld.serialize())}}
};
const w=new LivingWorldP18(game);game.livingWorld=w;
assert.equal(w.quest.status,'available');
w.setVisible(true);
assert.equal(w.node.style.display,'block');
w.update(.40);
assert.equal(w.zone.id,'village_01');
assert.equal(w.node.dataset.safe,'yes');
assert.equal(w.world.visited.village_01,true);
assert.ok(w.report().npcRoutines.sigrid.includes('smithy'));
assert.equal(w.report().frontierPacks,2);
game.player.pos.x=110;game.player.pos.z=95;
w.update(.40);
assert.equal(w.zone.id,'wolf_edge_east_01');
assert.equal(w.node.dataset.safe,'no');
assert.equal(worldIsSafeP18(110,95),false);
assert.equal(worldIsSafeP18(0,40),true);
assert.equal(regionAtP18(-112,76).id,'wolf_edge_west_01');
assert.equal(w.world.visited.wolf_edge_east_01,true);
w.onNpcTalk('bjorn');
assert.equal(w.world.npcTalks.bjorn,1);
assert.equal(w.acceptFrontier(),true);
assert.equal(w.acceptFrontier(),false,'accept once');
assert.match(w.node.textContent,/Centinelas 0\/3/);
assert.equal(events.save.length,1);
assert.equal(w.onEnemyKilled({p18Frontier:false}),false,'old wolves do not count');
for(let i=1;i<=3;i++){
 const result=w.onEnemyKilled({p18Frontier:true,p18Role:i%2?'alpha':'scout'});
 assert.equal(result,true);
 assert.equal(w.quest.progress,i);
}
assert.equal(w.quest.status,'complete');
assert.match(w.node.textContent,/Volvé con Bjorn/);
assert.equal(w.onEnemyKilled({p18Frontier:true}),false,'no farming after objective');
assert.equal(game.stats.xp,0,'no bounty XP granted before turn-in');
assert.equal(game.inventory.gold,10);
assert.equal(w.turnInFrontier(),true);
assert.equal(game.stats.xp,P18_FRONTIER_QUEST.rewardXp);
assert.equal(game.inventory.gold,10+P18_FRONTIER_QUEST.rewardGold);
assert.equal(w.turnInFrontier(),false,'cannot double-claim');
assert.equal(w.world.questFlags.frontier_patrol_01,true);
const snapshot=w.serialize();
w.reset();
assert.equal(w.quest.status,'available');
w.applyData(snapshot);
assert.equal(w.quest.status,'done');
assert.equal(w.quest.progress,3);
assert.equal(w.world.npcTalks.bjorn,1);
assert.equal(w.world.visited.wolf_edge_east_01,true);
assert.equal(window.highflyP18Report().frontierQuest.status,'done');
w.applyData({schemaVersion:18,frontier:{status:'active',progress:999}});
assert.equal(w.quest.status,'complete','tampered progress clamps');
w.applyData({schemaVersion:17});
assert.equal(w.quest.status,'available','invalid world state migrates safely');
w.setVisible(false);
assert.equal(w.node.style.display,'none');

// Critical: P18 writes under a NEW save key even with all P18 mechanics disabled.
// Reading P16 as a fall-back never mutates the old P16 bytes.
const store=new Map();
globalThis.localStorage={
 getItem:k=>store.get(k)??null,
 setItem:(k,v)=>store.set(k,v)
};
const p16Bytes='{"legacy":"my-stable-p16-save"}';
store.set('highfly_p16_save',p16Bytes);
const saveGame={
 ...game,saveSys:null,p18Build:true,p18Enabled:true,p16Enabled:true,
 player:{pos:{x:2,y:3,z:4},yaw:0,torchOn:false},
 enemies:{dragon:{alive:true}},interiors:{inside:null,savePosition:null,saveYaw:null}
};
const save=new SaveSys(saveGame);saveGame.saveSys=save;
assert.equal(save.key,'highfly_p18_save');
assert.equal(save.hasSave(),true);
assert.deepEqual(save.loadRaw(),{legacy:'my-stable-p16-save'},'old P16 imported read-only');
saveGame.livingWorld=w;
save.save();
assert.equal(store.get('highfly_p16_save'),p16Bytes,'P16 save frozen');
assert.equal(JSON.parse(store.get('highfly_p18_save')).player.x,2);
assert.ok('livingWorld' in JSON.parse(store.get('highfly_p18_save')),'P18 world + bounty saved atomically');
const p18Off=new SaveSys({...saveGame,p18Enabled:false});
assert.equal(p18Off.key,'highfly_p18_save','diagnostic opt-out must not write P16');

const enemySrc=await readFile(new URL('../src/entities/enemies.js',import.meta.url),'utf8');
assert.match(enemySrc,/P18_FRONTIER_PACKS/);
assert.match(enemySrc,/p18Frontier/);
assert.match(enemySrc,/mate\.state='chase'/);
assert.match(enemySrc,/worldIsSafeP18\(p\.x,p\.z\)/);
assert.match(enemySrc,/livingWorld\?\.onEnemyKilled/);
const npcs=await readFile(new URL('../src/entities/npc.js',import.meta.url),'utf8');
assert.match(npcs,/Centinelas de la frontera/);
assert.match(npcs,/livingWorld\.turnInFrontier\(\)/);
assert.match(npcs,/npcRoutineP18/);
const questSrc=await readFile(new URL('../src/systems/quests.js',import.meta.url),'utf8');
assert.match(questSrc,/p18_frontier/);
assert.match(questSrc,/nearestFrontierTargetP181/,'mission compass now uses two named area anchors with respawn fallback');
const frontierTracker=await readFile(new URL('../src/ui/frontier-tracking-p181.js',import.meta.url),'utf8');
assert.match(frontierTracker,/Lobo centinela · ESTE/);
assert.match(frontierTracker,/Lobo centinela · OESTE/);
assert.match(frontierTracker,/Entregar misión · Bjorn/);
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/this\.livingWorld = this\.p18Enabled \?/);
assert.match(main,/game\.livingWorld\?\.update\(dt\)/);
assert.match(main,/this\.livingWorld\?\.reset\(\)/);
assert.equal(game.stats.xp,60,'only one P18 turn-in reward');
console.log('HIGHFLY P18 PLAYABLE PASS: 2 frontier zones, quest from Bjorn, 3 kills, journal/compass, single reward, world persistence, P16 save isolation, NPC schedule, legacy mechanics untouched');
