import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  WORLD_P18_SCHEMA,WORLD_P18_CELL_METERS,WORLD_REGIONS_P18,WILDERNESS_P18,
  worldCellP18,regionAtP18,worldIsSafeP18,
  NPC_SCHEDULES_P18,worldDayPeriodP18,npcRoutineP18,npcSimulationTierP18,
  createWorldStateP18,applyWorldEventP18,worldSnapshotP18
} from '../src/world/world-registry-p18.js';

assert.equal(WORLD_P18_SCHEMA,18);
assert.equal(WORLD_P18_CELL_METERS,200,'matches P16.3 terrain chunk');
assert.equal(WORLD_REGIONS_P18.length,11);
assert.equal(new Set(WORLD_REGIONS_P18.map(r=>r.id)).size,WORLD_REGIONS_P18.length,'zone IDs unique');
assert.equal(worldCellP18(0,40).key,'0,0');
assert.equal(worldCellP18(-.01,-.01).key,'-1,-1');
assert.equal(worldCellP18(200,-200).key,'1,-1');
assert.throws(()=>worldCellP18(Infinity,1),/Invalid/);
assert.throws(()=>worldCellP18(2,3,0),/Invalid/);
assert.equal(regionAtP18(0,40).id,'village_01');
assert.equal(regionAtP18(110,95).id,'wolf_edge_east_01');
assert.equal(regionAtP18(-112,76).id,'wolf_edge_west_01');
assert.equal(worldIsSafeP18(0,40),true);
assert.equal(worldIsSafeP18(120,160),false);
assert.equal(regionAtP18(-220,-180).id,'stones_01');
assert.equal(regionAtP18(150,150).id,'clearing_01','clearing wins when wolf zone overlaps');
assert.equal(regionAtP18(380,-150).id,'frost_plateau_01');
assert.equal(regionAtP18(300,-300).id,'dragon_tower_01');
assert.equal(regionAtP18(-3000,-3000,'interior').id,'barrow_01');
assert.equal(regionAtP18(-3000,-3000,'overworld'),WILDERNESS_P18,'crypt stays interior-only');
assert.equal(regionAtP18(NaN,5),null);
assert.equal(regionAtP18(80000,80000).id,'wilderness');

assert.equal(Object.keys(NPC_SCHEDULES_P18).length,3);
assert.equal(worldDayPeriodP18(0),'night');
assert.equal(worldDayPeriodP18(.22),'dawn');
assert.equal(worldDayPeriodP18(.50),'day');
assert.equal(worldDayPeriodP18(.75),'dusk');
assert.equal(worldDayPeriodP18(.95),'night');
assert.equal(npcRoutineP18('sigrid',.50).activity,'smithy_work');
assert.equal(npcRoutineP18('olaf',.50).activity,'village_council');
assert.equal(npcRoutineP18('bjorn',.75).activity,'inn_guest');
assert.equal(npcRoutineP18('unknown',.50),null);
assert.equal(npcSimulationTierP18(0),'near');
assert.equal(npcSimulationTierP18(45*45),'near');
assert.equal(npcSimulationTierP18(90*90),'ambient');
assert.equal(npcSimulationTierP18(150*150),'dormant');

const initial=createWorldStateP18();
assert.equal(initial.schemaVersion,18);
assert.deepEqual(initial.visited,{});
const visited=applyWorldEventP18(initial,{type:'areaVisited',id:'village_01'});
assert.deepEqual(initial.visited,{},'world-state reducer is immutable');
assert.equal(visited.visited.village_01,true);
const visitedAgain=applyWorldEventP18(visited,{type:'areaVisited',id:'village_01'});
assert.equal(visitedAgain.visited.village_01,true,'visit idempotent');
const spoken=applyWorldEventP18(visitedAgain,{type:'npcTalked',id:'sigrid'});
const twice=applyWorldEventP18(spoken,{type:'npcTalked',id:'sigrid'});
assert.equal(twice.npcTalks.sigrid,2);
const gathered=applyWorldEventP18(twice,{type:'resourceGathered',id:'resource_tree_01'});
assert.equal(gathered.resources.resource_tree_01,true);
assert.equal(applyWorldEventP18(gathered,{type:'resourceGathered',id:'resource_tree_01'}).resources.resource_tree_01,true,'resource node state idempotent');
const opened=applyWorldEventP18(gathered,{type:'portalOpened',id:'barrow_01'});
const cleared=applyWorldEventP18(opened,{type:'questCompleted',id:'q1'});
const raw=JSON.stringify(worldSnapshotP18(cleared));
assert.deepEqual(createWorldStateP18(JSON.parse(raw)),cleared,'persistent world data round-trip');
assert.deepEqual(createWorldStateP18({schemaVersion:17}).visited,{},'older schema is not blindly imported');
assert.throws(()=>applyWorldEventP18(initial,{type:'enemyKilled',id:'wolf'}),/Unknown/,'combat authority remains existing combat');
assert.throws(()=>applyWorldEventP18(initial,{type:'npcTalked',id:'__proto__'}),/Invalid/,'prototype pollution blocked');
assert.throws(()=>applyWorldEventP18(initial,{type:'npcTalked',id:''}),/Invalid/);
const source=await readFile(new URL('../src/world/world-registry-p18.js',import.meta.url),'utf8');
assert.doesNotMatch(source,/localStorage|setInterval|setTimeout|fetch\(/,'no I/O, no AI ticks, no save mutation');
assert.doesNotMatch(source,/new THREE|new Mesh|\\.addXP|\\.takeDamage/,'no rendered placeholders, XP or combat edits');
const terrain=await readFile(new URL('../src/world/terrain.js',import.meta.url),'utf8');
assert.match(terrain,/const CHUNK = 200/);
const save=await readFile(new URL('../src/systems/save.js',import.meta.url),'utf8');
assert.match(save,/highfly_p16_save/,'original save remains untouched');
const p17=await readFile(new URL('../src/rpg/highfly-rpg-core-p17.js',import.meta.url),'utf8');
assert.match(p17,/applyReputationEvent/,'P17 source reused, not reinvented');
console.log('HIGHFLY P18 W0 PASS: 11 regions including two playable frontier areas, map-cell alignment, 3 NPC routines, immutable persisted world events, save/skills/combat isolation');
