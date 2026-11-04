// HIGHFLY P6: real data rules and geometry tests; no browser/three dependency.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {inspectGlb} from '../scripts/audit_animation_p6.mjs';
const moduleSource=async rel=>{
  const src=await readFile(new URL('../'+rel,import.meta.url),'utf8');
  return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
};
const {ABILITIES_P6,spendAbilityResource}=await moduleSource('src/combat/abilities-p6.js');
const {TargetingP6,hasLineOfSight,cameraSafeFraction}=await moduleSource('src/combat/targeting-p6.js');
assert.equal(Object.keys(ABILITIES_P6).length,4);
assert.equal(ABILITIES_P6.S1.resource,'mp');
assert.equal(ABILITIES_P6.S2.resource,'sp');
assert.equal(ABILITIES_P6.S3.resource,'mp');
assert.equal(ABILITIES_P6.S4.resource,'sp');
const stats={mp:100,sp:100,useMagicka(n){if(this.mp<n)return false;this.mp-=n;return true;},
  useStamina(n){if(this.sp<n)return false;this.sp-=n;return true;}};
assert.equal(spendAbilityResource(stats,ABILITIES_P6.S1),true);
assert.equal(stats.mp,82);
assert.equal(spendAbilityResource(stats,ABILITIES_P6.S4),true);
assert.equal(stats.sp,76);
stats.mp=0;
assert.equal(spendAbilityResource(stats,ABILITIES_P6.S1),false);
const e=(x,z)=>({alive:true,name:'Lobo',hitRadius:1,group:{position:{x,y:0,z}}});
const near=e(0,-7),far=e(2,-18),behind=e(0,5);
let blocked=false;
const game={
  terrain:{getHeight:()=>0},
  interiors:{inside:false},
  structures:{colliders:[],circleColliders:[]},
  player:{pos:{x:0,y:0,z:0},yaw:0},
  combat:{collectTargets:()=>[far,near,behind]},
  input:{justPressed:new Set()},
  hud:{notify:()=>{}}
};
const target=new TargetingP6(game);
assert.equal(target.acquire(),near,'prefer close front target');
target.update(.2);assert.equal(target.soft,near);
game.input.justPressed.add('KeyL');target.update(.2);assert.equal(target.locked,near);
game.input.justPressed.clear();
game.input.justPressed.add('KeyR');target.update(.2);assert.equal(target.locked,far);
game.input.justPressed.clear();
game.input.justPressed.add('KeyX');target.update(.2);assert.equal(target.locked,null);
game.structures.colliders.push({x:0,z:-3.5,ry:0,hw:1,hd:1});
assert.equal(hasLineOfSight(game,{x:0,y:1.2,z:0},{x:0,y:1.2,z:-7}),false);
assert.equal(target.valid(near),false,'hidden enemies cannot be auto-targeted');
assert.ok(cameraSafeFraction(game,{x:0,y:1.6,z:0},{x:0,y:1.6,z:-6})<1);
const glb=await readFile(new URL('../assets/models/player_barbarian.glb',import.meta.url));
const inventory=inspectGlb(glb,'player_barbarian.glb');
assert.ok(inventory.animations.length>0,'real player rig animations must exist');
assert.ok(inventory.skins>0,'player must be skinned');
const source=await readFile(new URL('../src/player/player.js',import.meta.url),'utf8');
assert.ok(source.includes('this.rig.clips.has(this.attackClip)'),'combo fallback must use real clips');
assert.ok(source.includes('const steps = g.p6Enabled'),'dash collision substepping');
const combat=await readFile(new URL('../src/combat/combat.js',import.meta.url),'utf8');
assert.ok(combat.includes('hasLineOfSight(g'),'projectiles and melee require LOS');
for(const asset of ['player_barbarian','wolf_quaternius','dragon_evolved_quaternius']){
  assert.ok((await stat(new URL('../assets/models/'+asset+'.glb',import.meta.url))).size>1000);
}
console.log('P6: catalog, resource deduction, front target, lock/cycle/cancel, LOS, camera obstruction, real GLB, collision — PASS');
