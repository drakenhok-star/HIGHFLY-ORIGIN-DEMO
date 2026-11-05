import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {makeNoise2D,fbm} from '../src/core/noise.js';
import {worldIsSafeP18} from '../src/world/world-registry-p18.js';
import {P183B_CAMPS,resolveBiomeCampP183b,resolveCoastSitesP183b,biomeValidP183b} from '../src/world/biome-families-p183b.js';
let code=await readFile(new URL('../src/world/terrain.js',import.meta.url),'utf8');
code=code.replace(/^import .*;\s*$/gm,'').replace('export class Terrain','class Terrain');
const ctx={makeNoise2D,fbm,Math};
runInNewContext(code+'\nthis.height=Terrain.prototype.getHeight;this.slope=Terrain.prototype.getSlope;',ctx);
const terrain={waterY:-2,noise:makeNoise2D(1337)};
terrain.getHeight=function(x,z){return ctx.height.call(this,x,z)};
terrain.getSlope=function(x,z){return ctx.slope.call(this,x,z)};
const allow=(x,z)=>!worldIsSafeP18(x,z)&&Math.abs(x)<1100&&Math.abs(z)<1100;
const found=P183B_CAMPS.map(c=>({id:c.id,type:c.type,biome:c.biome,at:resolveBiomeCampP183b(terrain,c,allow)}));
const coastal=resolveCoastSitesP183b(terrain,allow);
for(const c of found){
 if(c.at)assert.ok(biomeValidP183b(terrain,c.at.x,c.at.z,c.biome,allow));
 console.log('P183B TERRAIN '+c.id+' : '+(c.at?'X '+Math.round(c.at.x)+' Z '+Math.round(c.at.z)+' Y '+Math.round(c.at.y):'NO VALID CELL'));
}
console.log('P183B COAST: '+JSON.stringify(coastal.map(c=>({x:Math.round(c.x),z:Math.round(c.z)}))));
assert.ok(found.filter(c=>c.at).length>=6,'at least six camps must have real, dry terrain');
assert.ok(coastal.length>0,'coast must have at least one actual land/water transition');
console.log('P183B REAL TERRAIN PASS: '+found.filter(c=>c.at).length+'/'+found.length+' camps, '+coastal.length+' crab beaches');
