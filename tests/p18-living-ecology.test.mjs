import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 LIVE_CREATURES_P18,PLANNED_CREATURES_P18,CREATURES_P18,
 creatureSpecP18,creatureSpawnableP18,newSpeciesReadyP18,
 monsterSimulationTierP18,zoneSpawnProposalP18,P18_PROPOSED_MOBILE_LIMITS
} from '../src/world/living-ecology-p18.js';
assert.equal(LIVE_CREATURES_P18.length,5,'5 existing varieties: wolves, ice wolves, draugr warriors/mages, dragon');
assert.equal(PLANNED_CREATURES_P18.length,5,'new families only after assets licensed');
assert.equal(new Set(CREATURES_P18.map(x=>x.id)).size,10);
const lib=await readFile(new URL('../src/core/assets.js',import.meta.url),'utf8');
for(const x of LIVE_CREATURES_P18){
 assert.equal(x.assetApproved,true);
 assert.equal(x.implementedInP16,true);
 assert.ok(lib.includes("  "+x.model+": './assets/models/"),'existing visual key must exist in P16.3 AssetLib: '+x.model);
 assert.ok(x.zoneIds.length>0);
}
for(const x of PLANNED_CREATURES_P18){
 assert.equal(x.model,null,'never assume model exists');
 assert.equal(x.assetApproved,false,'cannot publish new visual until its license confirmed');
 assert.equal(x.implementedInP16,false);
 assert.equal(creatureSpawnableP18(x.id,x.zoneIds[0]),false);
 assert.equal(newSpeciesReadyP18(x,['wolf'],[x.id]),false);
}
assert.equal(creatureSpawnableP18('wolf','wolf_north_01'),true);
assert.equal(creatureSpawnableP18('wolf','village_01'),false);
assert.equal(creatureSpawnableP18('ancient_dragon','barrow_01'),false);
assert.equal(creatureSpawnableP18('draugr_mage','stones_01'),true);
assert.equal(creatureSpawnableP18('draugr_mage','barrow_01'),true);
assert.equal(creatureSpecP18('abc'),null);
assert.equal(zoneSpawnProposalP18({x:0,z:40,regionId:'wolf_north_01',creatureId:'wolf',alreadyActive:0,partySize:4}).count,0,
 'no enemy inside village even if a caller falsely reports a hostile zone');
assert.deepEqual(zoneSpawnProposalP18({x:120,z:160,regionId:'wolf_north_01',creatureId:'wolf',alreadyActive:0,partySize:3}),
 {allowed:true,count:3,reason:'eligible'});
assert.equal(zoneSpawnProposalP18({x:120,z:160,regionId:'wolf_north_01',creatureId:'wolf',alreadyActive:14,partySize:3}).count,0,'mobile active budget');
assert.equal(zoneSpawnProposalP18({x:120,z:160,regionId:'wolf_north_01',creatureId:'forest_spider',partySize:3}).count,0,'unlicensed visual blocked');
assert.ok(P18_PROPOSED_MOBILE_LIMITS.maxNearHostiles>0);
assert.equal(monsterSimulationTierP18({distanceSq:0}),'full');
assert.equal(monsterSimulationTierP18({distanceSq:100*100}),'low_frequency');
assert.equal(monsterSimulationTierP18({distanceSq:300*300}),'dormant');
assert.equal(monsterSimulationTierP18({distanceSq:300*300,engaged:true}),'full',
 'never freeze enemy AI in engaged combat');
assert.equal(monsterSimulationTierP18({distanceSq:300*300,questRequired:true}),'full');
assert.equal(monsterSimulationTierP18({distanceSq:300*300,boss:true}),'full');
const file=await readFile(new URL('../src/world/living-ecology-p18.js',import.meta.url),'utf8');
assert.doesNotMatch(file,/game\.enemies\.|new THREE|\.addXP|setInterval|localStorage/,'policy cannot mutate existing gameplay');
console.log('HIGHFLY P18 W0.1 PASS: existing creature models, 5 gated new species, town safety, spawn caps, quest/boss AI and license barrier');
