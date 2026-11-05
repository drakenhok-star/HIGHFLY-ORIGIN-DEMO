import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const file=await readFile(new URL('../src/rpg/highfly-rpg-core-p17.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(file).toString('base64'));
const {CORE_STATS,levelCoreStats,hunterStatBreakdown,previewDerivedResources,
 equipmentAttributeTotals,validateFitnessAssessment,applyReputationEvent,
 socialStanding,createRpgEvent}=m;
assert.deepEqual(CORE_STATS,['STR','AGI','VIT','PER','INT']);
assert.deepEqual(levelCoreStats(1),{STR:10,AGI:10,VIT:10,PER:10,INT:10},
 'Everyone starts with the same stats; no class-dependent baseline');
assert.equal(levelCoreStats(35).STR,44);
assert.equal(levelCoreStats(50).STR,59);
assert.equal(levelCoreStats(125).STR,108,'v1 caps level simulation at 99');
assert.equal(hunterStatBreakdown({level:1}).trainingStats.STR,0);
assert.equal(hunterStatBreakdown({level:35}).calibrationStatus,'pending');
const assessment=(scores,overrides={})=>({
 source:'highfly-training-core',version:'fitness-evidence-v1',
 validated:true,calibrationDays:7,
 trainingScores:Object.fromEntries(CORE_STATS.map(k=>[k,scores[k]||0])),
 ...overrides
});
const perfect=assessment(Object.fromEntries(CORE_STATS.map(k=>[k,1])));
const trained=assessment({STR:.9,AGI:.7,VIT:.75,PER:.8,INT:.95});
const G50=hunterStatBreakdown({level:50}),T35=hunterStatBreakdown({level:35,fitnessAssessment:trained});
assert.ok(T35.totalStats.STR>G50.totalStats.STR,
 'High-quality trained level 35 can rival/unbalance untrained level 50 in STR');
assert.ok(T35.totalStats.INT>G50.totalStats.INT,
 'Training consistency/tINT can make level 35 competitive in MP-related stats');
const max=hunterStatBreakdown({level:35,fitnessAssessment:perfect});
for(const k of CORE_STATS){
 const delta=max.trainingStats[k],total=max.totalStats[k];
 assert.ok(Math.abs(delta/total-.3)<.00001,'Fitness may supply up to 30% of final stat');
 assert.ok(delta>=0 && delta<=total*.30+.0001,'No unlimited training gain');
}
assert.ok(validateFitnessAssessment(trained));
assert.equal(validateFitnessAssessment(assessment({STR:.9}, {calibrationDays:6})),false,
 'No training bonus before first-week calibration');
assert.equal(validateFitnessAssessment(assessment({STR:.9},{validated:false})),false);
assert.equal(validateFitnessAssessment(assessment({STR:1.2})),false,
 'Training evidence over 100% rejected, not infinitely farmed');
assert.equal(hunterStatBreakdown({level:35,fitnessAssessment:assessment({STR:.9},{calibrationDays:6})}).trainingStats.STR,0);
const res=previewDerivedResources({level:35,fitnessAssessment:trained});
const untrained=previewDerivedResources({level:35});
assert.ok(res.energy>untrained.energy,'validated strength increases energy');
assert.ok(res.mp>untrained.mp,'validated consistency/intelligence increases mana');
assert.ok(res.hp>untrained.hp,'validated vitality increases HP');
assert.equal(previewDerivedResources({level:35,fitnessAssessment:assessment({STR:.9},{calibrationDays:6})}).energy,untrained.energy);
const gear=[{id:'sword',attributes:{physicalDamage:10,criticalChance:3}},
{id:'armor',attributes:{armor:20,elementalResistance:5}}];
const original=hunterStatBreakdown({level:35,fitnessAssessment:trained});
const equipment=equipmentAttributeTotals(gear);
assert.equal(equipment.physicalDamage,10);
assert.equal(equipment.armor,20);
assert.deepEqual(hunterStatBreakdown({level:35,fitnessAssessment:trained}),original,
 'Equipping items cannot mutate level or training stats');
assert.throws(()=>equipmentAttributeTotals([{attributes:{STR:999}}]),/Forbidden/);
assert.throws(()=>equipmentAttributeTotals([{stats:{STR:999},attributes:{armor:3}}]),/Gear cannot/);
assert.throws(()=>equipmentAttributeTotals([{attributes:{physicalDamage:Infinity}}]),/Invalid/);
let world={schemaVersion:17,cities:{},npcs:{}};
world=applyReputationEvent(world,{action:'help',cityId:'starter_village',npcId:'sigrid'});
assert.equal(world.cities.starter_village,8);
assert.equal(world.npcs['starter_village:sigrid'],12);
world=applyReputationEvent(world,{action:'betrayal',cityId:'starter_village',npcId:'sigrid'});
assert.equal(world.cities.starter_village,-32);
assert.equal(world.npcs['starter_village:sigrid'],-48);
assert.equal(socialStanding(-90),'hostile');
assert.equal(socialStanding(5),'neutral');
assert.equal(socialStanding(30),'trusted');
assert.equal(socialStanding(90),'ally');
assert.throws(()=>applyReputationEvent(world,{action:'kill',cityId:'starter_village'}),/Unknown social action/);
const ev=createRpgEvent('questCompleted',{questId:'wolves'});
assert.equal(ev.schemaVersion,17);
assert.equal(ev.payload.questId,'wolves');
assert.throws(()=>createRpgEvent('combatFrame',{}),/Unrecognized/);
console.log('HIGHFLY P17 OK: level+training stats, items attributes only, 70:30 cap, Lv35 vs Lv50, initial week, ENE/MP, NPC gratitude/faction, event contract');