import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  INICIOS_SCHEMA_P186,INICIOS_WORLD_P186,INICIOS_LEVEL_RANGE_P186,
  INICIOS_HUBS_P186,INICIOS_GATHERING_P186,INICIOS_CRAFT_RING_P186,
  INICIOS_PROFESSIONS_P186,INICIOS_TRAINERS_P186,INICIOS_DUNGEONS_P186,
  INICIOS_CHAPTERS_P186,INICIOS_RESOURCE_BY_ID_P186,
  newIniciosProfessionStateP186,learnIniciosProfessionP186,
  awardIniciosProficiencyP186,canGatherMaterialP186,auditIniciosDefinitionsP186
} from '../src/world/inicios-v2-p186.js';
import {
  findIniciosHubSiteP186,INICIOS_CONNECTIVITY_P186,
  auditIniciosConnectivityP186
} from '../src/world/inicios-site-planner-p186.js';

assert.equal(INICIOS_SCHEMA_P186,186);
assert.equal(INICIOS_WORLD_P186,'village_01');
assert.deepEqual(INICIOS_LEVEL_RANGE_P186,[1,20]);
assert.deepEqual(auditIniciosDefinitionsP186(),{
  professions:15,gathering:5,crafting:10,hubs:8,trainers:14,dungeons:2,resources:8
});
assert.deepEqual(auditIniciosConnectivityP186(),{hubs:8,routes:7});
assert.deepEqual(INICIOS_GATHERING_P186.map(p=>p.id),
  ['mining','logging','herbalism','fishing','farming']);
assert.deepEqual(INICIOS_CRAFT_RING_P186.map(p=>p.id),[
  'engineering','alchemy','cooking','leatherworking','tailoring',
  'inscription','enchanting','jewelcrafting','weaponcrafting','armorcrafting'
]);
const ids=new Set(INICIOS_PROFESSIONS_P186.map(p=>p.id));
assert.equal(ids.size,15);
assert.ok(INICIOS_PROFESSIONS_P186.every(p=>p.introLevel<=20));
assert.ok(INICIOS_PROFESSIONS_P186.every(p=>p.registered && !p.playable),
  'data curriculum must not claim a live gameplay feature');
assert.ok(INICIOS_CHAPTERS_P186.some(c=>c.levels[1]===20));
assert.equal(INICIOS_HUBS_P186.filter(h=>h.kind==='satellite').length,5);
assert.equal(INICIOS_HUBS_P186.filter(h=>h.built).length,1);
assert.equal(INICIOS_CONNECTIVITY_P186.length,7);
assert.ok(INICIOS_TRAINERS_P186.find(n=>n.id==='sigrid')?.existing);
assert.ok(INICIOS_TRAINERS_P186.filter(n=>!n.existing).every(n=>n.modelId===null),
 'never use fake model or spawn placeholder NPC');
assert.ok(INICIOS_DUNGEONS_P186.some(d=>d.sourceRoomId==='barrow'));
assert.ok(INICIOS_DUNGEONS_P186.some(d=>d.stage==='design'));

const initial=newIniciosProfessionStateP186();
assert.deepEqual(initial.learned,{});
assert.equal(Object.keys(initial.experience).length,15);
assert.equal(initial.experience.farming,0);
assert.throws(()=>awardIniciosProficiencyP186(initial,'farming','plant_bed_1',2),
  /not learned/);
const learned=learnIniciosProfessionP186(initial,'farming');
assert.equal(initial.learned.farming,undefined,'learn is immutable');
assert.equal(learned.learned.farming,true);
assert.throws(()=>learnIniciosProfessionP186(initial,'carpentry'),
  /Unknown/, 'carpentry not miscounted as canonical WOC trade');
const earned=awardIniciosProficiencyP186(learned,'farming','harvest_bed_1',2);
assert.equal(earned.experience.farming,2);
assert.equal(awardIniciosProficiencyP186(earned,'farming','harvest_bed_1',2).experience.farming,2,
  'gathering grant cannot be duplicated by save reload');
assert.equal(awardIniciosProficiencyP186(earned,'farming','harvest_bed_2',3).experience.farming,5);
assert.throws(()=>awardIniciosProficiencyP186(earned,'farming','__proto__'),/Invalid/);
assert.equal(newIniciosProfessionStateP186({schemaVersion:185,learned:{farming:true}})
  .learned.farming,undefined,'old saves never assumed to contain new professions');
assert.equal(newIniciosProfessionStateP186({schemaVersion:186,
  learned:{farming:true,constructor:true,woodworking:true}}).learned.farming,true);
assert.equal(newIniciosProfessionStateP186({schemaVersion:186,
  learned:{farming:true,constructor:true,woodworking:true}}).learned.woodworking,undefined);
assert.equal(INICIOS_RESOURCE_BY_ID_P186.forest_ancient_wood.zoneId,'forest_falls_01');
assert.equal(canGatherMaterialP186('forest_ancient_wood','village_01',5,99),false);
assert.equal(canGatherMaterialP186('forest_ancient_wood','forest_falls_01',1,99),false);
assert.equal(canGatherMaterialP186('forest_ancient_wood','forest_falls_01',2,21),true);
assert.equal(canGatherMaterialP186('ore_copper','village_01',1,5),true);
assert.equal(canGatherMaterialP186('ore_copper','forest_falls_01',2,21),false);

const terrain={waterY:-2,getHeight:()=>6,getSlope:()=>.02};
const safe={
  isBlocked:()=>false,isDangerous:()=>false,hasSafeRoute:()=>true,
  matchesHabitat:()=>true,hasWaterAccess:()=>true,
  shoreSamples:[{x:500,z:500}]
};
assert.equal(findIniciosHubSiteP186('central_village',terrain,safe).constructionAllowed,false);
assert.equal(findIniciosHubSiteP186('mining_hamlet',terrain).reason,
 'MISSING_WORLD_VALIDATORS','no blind placement without collision and reachability');
assert.equal(findIniciosHubSiteP186('fishing_hamlet',terrain,{...safe,shoreSamples:null}).reason,
 'MISSING_REAL_SHORELINE','fishing hamlet needs real water, not a fake pond');
const sawmill=findIniciosHubSiteP186('sawmill_hamlet',terrain,safe);
assert.equal(sawmill.ok,true);
assert.equal(sawmill.constructionAllowed,false,'selection never builds automatically');
assert.equal(sawmill.site.verifiedTerrain,true);
assert.equal(findIniciosHubSiteP186('sawmill_hamlet',terrain,
 {...safe,isBlocked:()=>true}).reason,'NO_SAFE_PLACE_FOUND');
assert.equal(findIniciosHubSiteP186('sawmill_hamlet',terrain,
 {...safe,hasSafeRoute:()=>false}).reason,'NO_SAFE_PLACE_FOUND');
assert.equal(findIniciosHubSiteP186('sawmill_hamlet',
 {...terrain,getSlope:()=>.99},safe).reason,'NO_SAFE_PLACE_FOUND');
assert.equal(findIniciosHubSiteP186('fishing_hamlet',terrain,
 {...safe,hasWaterAccess:()=>false}).reason,'NO_SAFE_PLACE_FOUND');
assert.equal(findIniciosHubSiteP186('artisan_quarter',terrain,safe).reason,
 'ANCHOR_SURVEY_REQUIRED','urban spaces need actual building footprint survey');
assert.equal(findIniciosHubSiteP186('alien_hub',terrain,safe).reason,'UNKNOWN_HUB');

const src=await readFile(new URL('../src/world/inicios-v2-p186.js',import.meta.url),'utf8');
const planner=await readFile(new URL('../src/world/inicios-site-planner-p186.js',import.meta.url),'utf8');
assert.doesNotMatch(src+planner,/localStorage|new THREE\.|new Mesh\(|fetch\(|\.addXP\(/,
  'contract modules do not touch rendering, assets, RPG stats or current save');
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.doesNotMatch(main,/inicios-v2-p186/,
 'P18.6 planning branch must not silently splice untested systems into game');
console.log('HIGHFLY P18.6 PASS: 15 canonical WOC professions, 14 trainers, 8 hubs, 2 dungeon plans, 5 level chapters, region-exclusive materials, immutable proficiency and safe site planning');
