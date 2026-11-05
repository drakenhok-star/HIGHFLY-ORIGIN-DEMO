import assert from 'node:assert/strict';
import {
 P184_LAYOUT_VERSION,P184_CRYPT_ROOMS,P184_CRYPT_DOORS,
 p184HasVisuals,p184RoomById,p184RoomContains,p184WallSegments,
 p184CollisionBoxes,createCryptRunP184,p184DoorUnlocked,p184ApplyEvent
} from '../src/world/crypt-layout-p184.js';

assert.equal(P184_LAYOUT_VERSION,1);
assert.equal(P184_CRYPT_ROOMS.length,5,'five modular rooms');
assert.equal(P184_CRYPT_DOORS.length,4,'four gates connect the rooms');
const ids=new Set(P184_CRYPT_ROOMS.map(r=>r.id));
assert.equal(ids.size,5);
for(const door of P184_CRYPT_DOORS){
 assert.ok(ids.has(door.from) && ids.has(door.to));
 assert.ok(door.width>2 && door.width<5);
 const a=p184RoomById(door.from),b=p184RoomById(door.to);
 const cx=door.axis==='x'?door.at:door.center;
 const cz=door.axis==='z'?door.at:door.center;
 assert.equal(p184RoomContains(a,cx,cz),true,'door belongs to source room');
 assert.equal(p184RoomContains(b,cx,cz),true,'door belongs to target room');
}
assert.ok(p184RoomContains(p184RoomById('gallery'),0,-17));
assert.equal(p184RoomById('missing'),null);
assert.equal(p184HasVisuals([]),false,'never render geometric placeholders');
const lines=p184WallSegments();
assert.ok(lines.length>=20,'walls derived from rooms');
assert.equal(new Set(lines.map(s=>[s.axis,s.at,s.min,s.max].join(','))).size,lines.length,
 'shared wall sections deduplicated');
for(const d of P184_CRYPT_DOORS){
 const opening=p184WallSegments().filter(s=>s.axis===d.axis && s.at===d.at &&
    s.min < d.center && s.max > d.center);
 assert.equal(opening.length,0,'door '+d.id+' has no collidable wall across its opening');
}
assert.equal(p184CollisionBoxes().length,lines.length,'one collider per wall section');
assert.ok(p184CollisionBoxes().every(c=>c.w>0&&c.d>0&&c.h>=4));
let run=createCryptRunP184('normal',1337);
assert.equal(run.schemaVersion,P184_LAYOUT_VERSION);
assert.deepEqual(run.visitedRooms,['entrance']);
assert.equal(p184DoorUnlocked(run,'door_entry'),true);
assert.equal(p184DoorUnlocked(run,'door_ritual'),false);
assert.equal(p184DoorUnlocked(run,'door_ante'),false);
assert.equal(p184DoorUnlocked(run,'door_boss'),false);
run=p184ApplyEvent(run,{type:'pickup_sigil'});
assert.equal(run.sigil,false,'no early sigil');
run=p184ApplyEvent(run,{type:'boss_defeated'});
assert.equal(run.bossDefeated,false,'no early boss defeat');
run=p184ApplyEvent(run,{type:'claim_reward'});
assert.equal(run.rewardClaimed,false,'no early reward');
run=p184ApplyEvent(run,{type:'clear_room',roomId:'gallery'});
assert.equal(p184DoorUnlocked(run,'door_ritual'),true);
assert.equal(p184DoorUnlocked(run,'door_ante'),true);
run=p184ApplyEvent(run,{type:'clear_room',roomId:'ritual'});
run=p184ApplyEvent(run,{type:'pickup_sigil'});
assert.equal(run.sigil,true);
assert.equal(p184DoorUnlocked(run,'door_boss'),false,'ante combat must be cleared too');
run=p184ApplyEvent(run,{type:'clear_room',roomId:'ante'});
assert.equal(p184DoorUnlocked(run,'door_boss'),true);
run=p184ApplyEvent(run,{type:'boss_defeated'});
assert.equal(run.bossDefeated,true);
run=p184ApplyEvent(run,{type:'claim_reward'});
assert.equal(run.rewardClaimed,true);
const claimed=p184ApplyEvent(run,{type:'claim_reward'});
assert.equal(claimed.rewardClaimed,true,'idempotent reward claim state');
assert.deepEqual(claimed.clearedRooms,['gallery','ritual','ante']);
const heroic=createCryptRunP184('heroic',739);
assert.equal(heroic.difficulty,'heroic');
assert.equal(heroic.seed,739);
assert.throws(()=>createCryptRunP184('unknown'),TypeError);
for(const r of P184_CRYPT_ROOMS)
 for(const e of r.encounterSlots)
   assert.ok(['draugr_warrior','draugr_mage','draugr_boss'].includes(e.species),
      'all encounters use pre-existing monster families; no new fake model');
console.log('P18.4 PASS: 5-room layout, all door openings, collision derivation, boss gates and single-reward state');
