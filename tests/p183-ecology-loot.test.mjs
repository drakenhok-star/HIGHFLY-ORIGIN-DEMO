import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 waterDepthP183,waterModeP183,waterSpeedP183,shallowStepP183,
 P183_MAX_WADE_DEPTH
} from '../src/world/shallow-water-p183.js';
import {
 P183_RARITY,P183_BASE_RARITY,P183_BONUS_TABLES,
 lootSpeciesP183,rollBonusLootP183
} from '../src/systems/loot-table-p183.js';
import {ITEM_DB} from '../src/systems/inventory.js';
import {P183_PENDING_SPECIES,speciesReadyP183} from '../src/world/species-gate-p183.js';
import {SaveSys} from '../src/systems/save.js';

const t={waterY:0,getHeight(x){return x<0?-3:x<3?-.5:3;}};
assert.equal(waterModeP183(t,5,0),'dry');
assert.equal(waterModeP183(t,1,0),'wade');
assert.equal(waterModeP183(t,-5,0),'deep');
assert.equal(waterDepthP183(t,1,0),.5);
assert.equal(waterSpeedP183(t,5,0),1);
assert.ok(waterSpeedP183(t,1,0)<.65 && waterSpeedP183(t,1,0)>.45);
assert.equal(waterSpeedP183(t,-5,0),0);
assert.ok(P183_MAX_WADE_DEPTH<1.2,'never treat deep water as walking terrain');

const wide={waterY:0,getHeight(x){return x<0?-3:x<20?-.5:3;}};
const reused={x:0,z:0,blocked:false};
const step=shallowStepP183(wide,5,5,1,0,reused);
assert.equal(step,reused,'reuse mutable output, no per-frame allocation');
assert.equal(step.x,6);
assert.equal(step.blocked,false);
shallowStepP183(wide,1,5,-4,0,reused);
assert.equal(reused.x,1,'deep-water crossing blocked');
assert.equal(reused.blocked,true);
shallowStepP183(wide,1,5,-4,1,reused);
assert.equal(reused.x,1,'shore slide protects deep coast');
assert.equal(reused.z,6,'can slide along coast');
let queries=0;
const dry={waterY:0,getHeight(){queries++;return 9;}};
shallowStepP183(dry,5,5,.5,.5,reused);
assert.equal(queries,1,'upland path is one terrain query');

for(const [species,table] of Object.entries(P183_BONUS_TABLES)){
 assert.ok(P183_BASE_RARITY[species]);
 for(const reward of table){
  assert.ok(ITEM_DB[reward.id],species+' references a real inventory item');
  assert.ok(reward.chance>0&&reward.chance<1,'chance bounded');
  assert.ok(reward.rarity in P183_RARITY);
 }
}
assert.equal(lootSpeciesP183({type:'wolf',p18Frontier:true}),'wolf_sentinel');
assert.equal(lootSpeciesP183({type:'wolf',ice:true}),'ice_wolf');
assert.equal(lootSpeciesP183({type:'draugr',boss:true}),'draugr_boss');
assert.equal(lootSpeciesP183({type:'dragon'}),'dragon');
assert.deepEqual(rollBonusLootP183({type:'wolf'},()=>1).items,[]);
const jackpot=rollBonusLootP183({type:'wolf'},()=>0);
assert.ok(jackpot.items.includes('hide_armor'));
assert.equal(jackpot.rarity,'rare');
const boss=rollBonusLootP183({type:'draugr',boss:true},()=>0);
assert.equal(boss.rarity,'epic');
assert.ok(boss.items.includes('ancient_sword'));
assert.equal(rollBonusLootP183({type:'training'},()=>0).items.length,0,
 'training target produces no random bonuses');

assert.equal(P183_PENDING_SPECIES.length,3);
for(const spec of P183_PENDING_SPECIES){
 if(spec.id==='forest_spider'){
  assert.equal(spec.modelKey,'spider');assert.equal(spec.licenseVerified,true);
  assert.equal(spec.rigValidated,true);assert.equal(speciesReadyP183(spec,['spider']),true);
  assert.equal(speciesReadyP183(spec,['wolf']),false);
 }else{
  assert.equal(spec.modelKey,null,'no stand-in model for '+spec.id);
  assert.equal(spec.licenseVerified,false);assert.equal(spec.rigValidated,false);
  assert.equal(speciesReadyP183(spec,['wolf']),false);
 }
}
assert.equal(speciesReadyP183({
 modelKey:'boar_verified',licenseVerified:true,rigValidated:true
},['boar_verified']),true,'future new rig must be independently approved');

const enemies=await readFile(new URL('../src/entities/enemies.js',import.meta.url),'utf8');
assert.match(enemies,/shallowStepP183\(g\.terrain/);
assert.match(enemies,/waterSpeedP183\(g\.terrain/);
assert.match(enemies,/rollBonusLootP183\(e\)/);
assert.match(enemies,/items=items\.concat\(extra\.items\)/,
 'original guaranteed loot remains attached to each kill');
assert.match(enemies,/_spawnDrop\(e\.group\.position\.x, e\.group\.position\.z, items, gold, rarity\)/);
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/this\.p183Build=true/);
assert.match(main,/this\.p183Enabled=!new URLSearchParams/);

const store=new Map([['highfly_p182_save','{"legacyP182":true}']]);
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const game={
 p183Build:true,p182Build:true,p18Build:true,p18Enabled:false,
 p16Enabled:true,p15Enabled:true,p14Enabled:true,p13Enabled:true,
 p812Enabled:true,p810Enabled:true,p7Enabled:true,
 state:'playing',time:{dayTime:.5},player:{pos:{x:0,y:0,z:0},yaw:0},
 stats:{serialize:()=>({})},inventory:{serialize:()=>({})},quests:{serialize:()=>({})},
 structures:{chests:[]},enemies:{dragon:{alive:true}},
 interiors:{inside:null},hud:{notify(){}}
};
const saver=new SaveSys(game);
assert.equal(saver.key,'highfly_p183_save','new version has independent save key');
assert.deepEqual(saver.loadRaw(),{legacyP182:true},'previous game loads read-only');
saver.save({silent:true});
assert.ok(store.has('highfly_p183_save'));
assert.equal(store.get('highfly_p182_save'),'{"legacyP182":true}',
 'P18.2 save must never be overwritten');

console.log('P18.3 PASS: wading/deep-water barriers, rarity loot, 3 gated species, saves backward-compatible');
