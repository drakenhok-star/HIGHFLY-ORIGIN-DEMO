import assert from 'node:assert/strict';
import {INICIOS_PROFESSIONS_P186,INICIOS_TRAINERS_P186} from '../src/world/inicios-v2-p186.js';
import {HAMLET_QUESTS_P192} from '../src/world/hamlets-p192.js';
import {WILDERNESS_SPOTS_P196,PROTECTED_BOSS_ANCHORS_P196} from '../src/world/wilderness-spots-p196.js';
import {P183B_CAMPS} from '../src/world/biome-families-p183b.js';
import {GEAR_RECIPES_P192} from '../src/world/gear-crafting-p192.js';
import {TOWN_LANTERN_COORDS_P196} from '../src/world/town-visuals-p196.js';

assert.equal(INICIOS_PROFESSIONS_P186.length,15);
assert.equal(INICIOS_TRAINERS_P186.length,14);
assert.equal(HAMLET_QUESTS_P192.length,7);
assert.equal(new Set(HAMLET_QUESTS_P192.map(x=>x.hubId)).size,7);
assert.equal(WILDERNESS_SPOTS_P196.length,3);
assert.deepEqual(WILDERNESS_SPOTS_P196.map(x=>x.count),[5,5,5]);
assert.equal(new Set(WILDERNESS_SPOTS_P196.map(x=>x.id)).size,3);
assert.ok(TOWN_LANTERN_COORDS_P196.length>=10);
assert.equal(GEAR_RECIPES_P192.length,7);
for(const p of INICIOS_PROFESSIONS_P186)
 assert.ok(INICIOS_TRAINERS_P186.some(t=>t.id===p.trainerId));
for(const s of WILDERNESS_SPOTS_P196){
 assert.ok(Math.hypot(s.x,s.z-40)>115,'Wilderness spot outside village');
 for(const boss of PROTECTED_BOSS_ANCHORS_P196)
  assert.ok(Math.hypot(s.x-boss.x,s.z-boss.z)>115,
   'Do not overwrite original boss territory');
 if(s.kind!=='spider')assert.ok(P183B_CAMPS.some(p=>p.id===s.sourceCamp));
}
console.log('P196 structural contracts: 15 professions, 14 trainers, 7 shared quests, 3x5 spots, boss safe, 11 torches, 7 recipes.');
