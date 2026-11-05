import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {makeNoise2D,fbm} from '../src/core/noise.js';
import {P183B_CAMPS,resolveBiomeCampP183b,biomeValidP183b} from '../src/world/biome-families-p183b.js';
import {realForestP183c} from '../src/world/habitat-p183c.js';
import {landCellP182,dryPackCenterP182} from '../src/world/terrestrial-habitat-p182.js';
import {worldIsSafeP18} from '../src/world/world-registry-p18.js';
let src=await readFile(new URL('../src/world/terrain.js',import.meta.url),'utf8');
src=src.replace(/^import .*;\s*$/gm,'').replace('export class Terrain','class Terrain');
const context={makeNoise2D,fbm,Math};
runInNewContext(src+'\nthis.h=Terrain.prototype.getHeight;this.s=Terrain.prototype.getSlope;',context);
const terrain={waterY:-2,noise:makeNoise2D(1337)};
terrain.getHeight=(x,z)=>context.h.call(terrain,x,z);
terrain.getSlope=(x,z)=>context.s.call(terrain,x,z);
const allow=(x,z)=>!worldIsSafeP18(x,z)&&Math.abs(x)<1100&&Math.abs(z)<1100;
const locs=[];
for(const spec of P183B_CAMPS){
  if(!['boar','prairie_wolf','prairie_alpha','bandit'].includes(spec.type))continue;
  const site=resolveBiomeCampP183b(terrain,spec,allow);
  assert.ok(site,spec.id+' requires valid terrain');
  let count=0;
  for(let k=0;k<spec.count;k++){
    const offsets=spec.biome==='road'
      ? [[0,0],[-15,2],[-31,5],[14,9],[29,19]]
      : [[0,0],[4.1,3.3],[-12,9],[13,-10],[-6,-14],[17,13]];
    const preferred=offsets[k]||[Math.cos(k*2.4)*17,Math.sin(k*2.4)*17];
    const probes=[preferred,[preferred[0]*.6,preferred[1]*.6],[0,0]];
    let found=null;
    for(const [dx,dz] of probes){
      const x=site.x+dx,z=site.z+dz;
      if(!biomeValidP183b(terrain,x,z,spec.biome,allow))continue;
      if(spec.biome==='road'&&Math.hypot(x-215,z+112)>=34)continue;
      found={x,z};break;
    }
    assert.ok(found,'valid member '+k+' in '+spec.id);
    if(locs.some(n=>n.specId===spec.id&&Math.hypot(n.x-found.x,n.z-found.z)<3))
       throw Error('crowded/duplicate '+spec.id+' member '+k);
    locs.push({specId:spec.id,...found});
    count++;
  }
  assert.equal(count,spec.count,'actual complete count in '+spec.id);
  console.log('P183D CAMP '+spec.id+' '+count+' real land positions');
}
const es=(await readFile(new URL('../src/entities/enemies.js',import.meta.url),'utf8'));
const spiderLine=es.split('\n').find(s=>s.includes('const P183_SPIDER_DENS ='));
assert.ok(spiderLine);
const matches=[...spiderLine.matchAll(/\{x:(-?\d+),z:(-?\d+)\}/g)];
assert.equal(matches.length,5,'five CC0 spider dens configured');
for(const [i,match]of matches.entries()){
 const x=Number(match[1]),z=Number(match[2]);
 const land=dryPackCenterP182(terrain,{x,z},[[0,0]],(cx,cz)=>allow(cx,cz)&&realForestP183c(terrain,cx,cz));
 assert.ok(land,'spider den '+i+' must resolve to forest land');
 assert.ok(Math.hypot(land.x-x,land.z-z)<55,'spider den '+i+' should not teleport away');
 console.log('P183D SPIDER '+(i+1)+' x='+land.x.toFixed(0)+' z='+land.z.toFixed(0));
}
console.log('P183D REAL WORLD PASS: all prairie family members separated and five dry forest spider dens');
