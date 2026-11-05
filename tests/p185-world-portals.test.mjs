import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  WORLD_SCHEMA_P185,WORLD_START_P185,WORLD_ZONES_P185,
  WORLD_ZONE_BY_ID_P185,WORLD_PORTALS_P185,GATHER_RESOURCES_P185,
  createWorldTravelStateP185,unlockPortalP185,
  preparePortalTripP185,completePortalTripP185,auditWorldDefinitionsP185
} from '../src/world/world-zones-p185.js';

assert.equal(WORLD_SCHEMA_P185,185);
assert.equal(WORLD_START_P185,'village_01');
assert.deepEqual(auditWorldDefinitionsP185(),{zones:8,portals:2,ready:1});
assert.equal(WORLD_ZONES_P185.length,8);
assert.equal(WORLD_PORTALS_P185.length,2);
assert.notEqual(WORLD_ZONE_BY_ID_P185.village_01.seed,
  WORLD_ZONE_BY_ID_P185.forest_falls_01.seed,'forest is not a coordinate shift');
assert.notEqual(WORLD_ZONE_BY_ID_P185.village_01.terrainProfile,
  WORLD_ZONE_BY_ID_P185.forest_falls_01.terrainProfile);
assert.notEqual(WORLD_ZONE_BY_ID_P185.village_01.foliageProfile,
  WORLD_ZONE_BY_ID_P185.forest_falls_01.foliageProfile);
assert.equal(WORLD_ZONE_BY_ID_P185.forest_falls_01.sceneReady,false,
  'second world must not be announced playable without renderer');
assert.ok(WORLD_ZONE_BY_ID_P185.forest_falls_01.features.includes('cascadas'));
assert.ok(WORLD_ZONE_BY_ID_P185.village_01.gather.includes('wood_common'));
for(const action of ['RECOLECTAR','TALAR','MINAR','PESCAR'])
  assert.ok(GATHER_RESOURCES_P185.some(r=>r.action===action),'resource action missing: '+action);
assert.equal(new Set(GATHER_RESOURCES_P185.map(r=>r.id)).size,
  GATHER_RESOURCES_P185.length);

const initial=createWorldTravelStateP185();
assert.equal(initial.zoneId,'village_01');
assert.deepEqual(initial.visited,{});
assert.deepEqual(initial.unlocked,{});
assert.equal(preparePortalTripP185(initial,'missing').reason,'PORTAL_UNKNOWN');
assert.equal(preparePortalTripP185(initial,'forest_village_01').reason,'WRONG_WORLD');
assert.equal(preparePortalTripP185(initial,'village_forest_01').reason,'PORTAL_LOCKED');
const unlocked=unlockPortalP185(initial,'forest_invitation');
assert.deepEqual(initial.unlocked,{},'unlock reducer must not mutate prior state');
assert.equal(unlocked.unlocked.forest_invitation,true);
const waiting=preparePortalTripP185(unlocked,'village_forest_01');
assert.equal(waiting.reason,'DESTINATION_NOT_BUILT',
  'do not display or enable an unimplemented portal');
assert.equal(waiting.destinationId,'forest_falls_01');
assert.equal(unlocked.zoneId,'village_01','preview cannot transfer character');
assert.throws(()=>completePortalTripP185(unlocked,waiting,{landingVerified:true}),/not prepared/);
assert.throws(()=>completePortalTripP185(unlocked,{
  ok:true,phase:'PREPARED',portalId:'village_forest_01',
  from:'village_01',to:'forest_falls_01'
},{landingVerified:false}),/Unsafe landing/);
assert.throws(()=>completePortalTripP185(unlocked,{
  ok:true,phase:'PREPARED',portalId:'village_forest_01',
  from:'village_01',to:'forest_falls_01'
},{landingVerified:true}),/not built/);

const restored=createWorldTravelStateP185(JSON.parse(JSON.stringify(unlocked)));
assert.deepEqual(restored,unlocked);
assert.equal(createWorldTravelStateP185({zoneId:'__proto__'}).zoneId,'village_01');
assert.equal(createWorldTravelStateP185({zoneId:'nonsense'}).zoneId,'village_01');
assert.deepEqual(createWorldTravelStateP185({
  nodes:{good_node:true,constructor:true,bad_node:false}
}).nodes,{good_node:true});
assert.throws(()=>unlockPortalP185(initial,'__proto__'),/Invalid/);

const source=await readFile(new URL('../src/world/world-zones-p185.js',import.meta.url),'utf8');
assert.doesNotMatch(source,/localStorage\.setItem|new THREE\.|new Mesh\(|fetch\(|\.addXP\(/,
  'foundation does not touch gameplay, network or permanent saves');
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/new Terrain\(this\)/,'existing runtime remains active');
const save=await readFile(new URL('../src/systems/save.js',import.meta.url),'utf8');
assert.match(save,/highfly_p183_save/,'original P18.3 save remains unchanged');
console.log('HIGHFLY P18.5 PASS: 8 region contracts, 2 portal routes, 4 gathering actions, immutable gates and safe landing boundaries');
