import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeNoise2D,fbm} from '../src/core/noise.js';
import {worldIsSafeP18} from '../src/world/world-registry-p18.js';
import {
 landCellP182,dryPackCenterP182,groundedStepP182,
 HABITAT_P182_CLEARANCE,HABITAT_P182_RADII
} from '../src/world/terrestrial-habitat-p182.js';

assert.ok(HABITAT_P182_CLEARANCE>0.6,'wave safety margin');
const water={waterY:-2,getHeight(x,z){return x>=5?1:-4;}};
assert.equal(landCellP182(water,0,0),false,'never spawn a wolf underwater');
assert.equal(landCellP182(water,6,0),false,'shoreline shoulder must stay dry');
assert.equal(landCellP182(water,8,0),true,'safe dry bank');
const scoutOffsets=[[0,0],[4,3.4]];
const newHome=dryPackCenterP182(water,{x:-10,z:0},scoutOffsets,()=>true);
assert.ok(newHome&&newHome.x>=6.7,'relocate full pack, not just one wolf');
for(const [ox,oz] of scoutOffsets)
  assert.equal(landCellP182(water,newHome.x+ox,newHome.z+oz),true,'all pack members dry');
const noLand={waterY:-2,getHeight(){return -4;}};
assert.equal(dryPackCenterP182(noLand,{x:0,z:0},scoutOffsets),null,
 'no valid land => no wolf rig; no fallback water spawn');
assert.ok(HABITAT_P182_RADII.length<=9,'bounded dry spawn search');
const blocker={waterY:-2,getHeight(x,z){return x<5?-4:1;}};
const out={};
let step=groundedStepP182(blocker,8,0,-5,0,out);
assert.equal(step,out,'same object reused, no per-frame garbage');
assert.equal(step.x,8,'chase cannot cross into ocean');
step=groundedStepP182(blocker,8,0,1,1,out);
assert.equal(step.x,9);
assert.equal(step.z,1);
assert.equal(step.blocked,false);
const nearShore=groundedStepP182(blocker,8,0,-2,1,out);
assert.equal(nearShore.x,8,'shore collision slides or stops');
assert.equal(nearShore.z,1,'shore collision may slide in Z');
let heightQueries=0;
const upland={waterY:-2,getHeight(){heightQueries++;return 50;}};
groundedStepP182(upland,10,10,1,0,out);
assert.equal(heightQueries,1,'high-altitude mob tick needs only ONE height probe');

// Exercise the actual Tianjie procedural height function (no Three/WebGL).
const terrainSource=await readFile(new URL('../src/world/terrain.js',import.meta.url),'utf8');
const terrainJS=terrainSource.replace(/^import .*$/gm,'')
 .replace('export class Terrain','class Terrain');
const Terrain=Function('makeNoise2D','fbm',terrainJS+'\nreturn Terrain;')(makeNoise2D,fbm);
const terrain=Object.create(Terrain.prototype);
terrain.noise=makeNoise2D(1337);terrain.waterY=-2;
const oldPacks=[
 {name:'wolf north',home:{x:120,z:160},offsets:[[0,0],[4.2,2.6],[-3.6,3.4]]},
 {name:'wolf west',home:{x:-150,z:120},offsets:[[0,0],[4.2,2.6],[-3.6,3.4]]},
 {name:'wolf south',home:{x:80,z:-180},offsets:[[0,0],[4.2,2.6],[-3.6,3.4]]},
 {name:'ice wolves',home:{x:380,z:-150},offsets:[[0,0],[4.5,2.5],[-4,3.5],[2,-4.5]]},
 {name:'centinela east',home:{x:110,z:95},offsets:[[0,0],[4,3.4]]},
 {name:'centinela west',home:{x:-112,z:76},offsets:[[0,0],[4,3.4]]}
];
for(const pack of oldPacks){
 const pos=dryPackCenterP182(terrain,pack.home,pack.offsets,
 (x,z)=>!worldIsSafeP18(x,z)&&pack.offsets.every(([ox,oz])=>!worldIsSafeP18(x+ox,z+oz)));
 assert.ok(pos,'grounded procedural terrain must offer a habitat for '+pack.name);
 for(const [ox,oz] of pack.offsets){
   assert.equal(landCellP182(terrain,pos.x+ox,pos.z+oz),true,
    'REAL WORLD height: '+pack.name+' individual wolf is on land');
 }
 console.log('P182 REAL TERRAIN: '+pack.name+
   ' dry center x='+pos.x.toFixed(1)+' z='+pos.z.toFixed(1)+
   ' shift='+pos.shift+'m checks='+pos.checks);
}
const enemy=await readFile(new URL('../src/entities/enemies.js',import.meta.url),'utf8');
assert.match(enemy,/dryPackCenterP182\(this\.game\.terrain,pack\.home,offs/);
assert.match(enemy,/pack\.respawnT=30/,'no safe terrain means no pack, retry later');
assert.match(enemy,/groundedStepP182\(g\.terrain/,'chase + wander water avoidance');
assert.match(enemy,/e\._p182Step\\|\\|/,'reuse output object');
assert.match(enemy,/if\(!dry\)return null/,'draugr never spawn under water');
const map=await readFile(new URL('../src/ui/world-map-p34.js',import.meta.url),'utf8');
assert.doesNotMatch(map,/hf-p181-radar-target/,'no redundant label under radar');
assert.match(map,/this\.hunterArrow\(ctx,px,py,this\.game\.player\.bodyYaw\\?\\?/,
 'map arrow reflects torso heading, not camera');
assert.match(map,/this\.hunterArrow\(ctx,n\/2,n\/2,this\.game\.player\.bodyYaw\\?\\?/,
 'round radar arrow reflects torso too');
const runtime=await readFile(new URL('../src/world/living-world-runtime-p18.js',import.meta.url),'utf8');
assert.match(runtime,/MISIÓN ACTIVA · CENTINELAS/);
assert.match(runtime,/MISIÓN LISTA · VOLVÉ CON BJORN/);
assert.doesNotMatch(runtime,/this\.node\.textContent='P18/,'no P18 village-safe debug banner');
assert.match(runtime,/top:max\(9px/,'mission centered near top, not below radar');
console.log('P18.2 PASS: procedural 6/6 land packs, shoreline collision, cached FPS sampling, chest arrow, top-only mission HUD, no radar label');
