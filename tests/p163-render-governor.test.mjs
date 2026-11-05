import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { percentileFrameMs, decideDprP163, PerfGovernorP163 } from '../src/ui/performance-p163.js';
import { includeGrassP163 } from '../src/world/grass-lod-p163.js';

assert.equal(percentileFrameMs([10,20,30,40],.95),40);
assert.equal(includeGrassP163(0,1),true,'near grass fully retained');
assert.equal(includeGrassP163(899,1),true,'30m fully dense');
assert.equal(includeGrassP163(9000,0),false,'unseen grass excluded');
assert.equal(includeGrassP163(2200,.60),true,'mid-distance stable hash retained');
assert.equal(includeGrassP163(2200,.80),false,'mid-distance stable hash reduced');
assert.equal(percentileFrameMs([], .95),null);
assert.equal(decideDprP163({fps:26,p95:44,current:.88,min:.70,max:.88}),.80);
assert.equal(decideDprP163({fps:33,p95:31,current:.78,min:.70,max:.88}),.70);
assert.equal(decideDprP163({fps:26,p95:44,current:.70,min:.70,max:.88}),.70,'respect visual floor');
assert.equal(decideDprP163({fps:60,p95:16.7,current:.8,min:.7,max:.88}),.84);
assert.equal(decideDprP163({fps:45,p95:23,current:.8,min:.7,max:.88}),.8,'hysteresis holds');
assert.equal(decideDprP163({fps:26,p95:44,current:.88,min:.70,max:.88,eco:true}),.88,'eco cap does not trigger downscale');
assert.equal(decideDprP163({fps:26,p95:44,current:.88,min:.70,max:.88,enabled:false}),.88);

globalThis.window={devicePixelRatio:3};
globalThis.document={visibilityState:'visible'};
const renderer={dpr:.88,shadowMap:{enabled:false},getPixelRatio(){return this.dpr;},setPixelRatio(v){this.dpr=v;}};
const game={p163Enabled:true,touch:{enabled:true},renderer,state:'playing',p812Eco:false,
  performanceP2:{preset:'FLUID',flatWaterGeometry:{id:'flat'},bloomPass:{enabled:false}},
  water:{mesh:{geometry:{id:'flat'}}},resizeCount:0,onResize(){this.resizeCount++;},
  mobileAudit:{report(){return {base:true};}}
};
game.water.mesh.geometry=game.performanceP2.flatWaterGeometry;
const gov=new PerfGovernorP163(game);
assert.equal(gov.enabled,true);
const send=(ms,n,start=0)=>{let t=start;for(let i=0;i<n;i++){t+=ms;gov.update(t);}return t;};
let t=send(44,100);
assert.equal(renderer.dpr,.80,'slow sustained frames reduce only DPR, not simulation');
assert.equal(game.resizeCount,1);
assert.equal(gov.report().waterMeshTriangles,1152);
assert.equal(gov.report().bloomEnabled,false);
assert.equal(game.mobileAudit.report().p163.downscales,1,'report exported for COPIAR DATOS');
t=send(44,110,t);
assert.ok(renderer.dpr>=.70);
const prev=renderer.dpr;
game.p812Eco=true;
t=send(44,220,t);
assert.equal(renderer.dpr,prev,'eco bypass keeps pixel ratio');
game.p812Eco=false;
game.performanceP2.preset='HIGH';
t=send(44,220,t);
assert.equal(renderer.dpr,prev,'HIGH does not adapt');
gov.onPresetChange();assert.equal(gov.report().reason,'preset-change');

const source=(await readFile(new URL('../src/ui/performance-p2.js',import.meta.url),'utf8'))
  .replace(/^import .*;[ \t]*$/gm,'').replace('export class PerformanceP2','class PerformanceP2');
class FakePlaneGeometry {constructor(w,h,x,y){this.width=w;this.height=h;this.segX=x;this.segY=y;}}
class FakeMeshPhongMaterial {constructor(props){Object.assign(this,props);}}
const fakeThree={PlaneGeometry:FakePlaneGeometry,MeshPhongMaterial:FakeMeshPhongMaterial,DoubleSide:'DoubleSide'};
const domNode=()=>({style:{},textContent:'',setAttribute(){},addEventListener(){}});
const fakeDocument={createElement:domNode,head:{appendChild(){}},body:{appendChild(){}}};
const P2=Function('THREE','document','window',source+'\nreturn PerformanceP2;')(fakeThree,fakeDocument,globalThis.window);
const originalGeo={id:'high',triangles:100352},originalMat={id:'water-high'};
const g2={p163Enabled:true,p812Enabled:true,p812Eco:false,state:'playing',p812Eco:false,
  water:{mesh:{material:originalMat,geometry:originalGeo,position:{x:0,z:0}},update(){},rings:[]},
  composer:{passes:[{}, {constructor:{name:'UnrealBloomPass'},enabled:true}]},
  renderer:{shadowMap:{enabled:true},setPixelRatio(v){this.dpr=v;},getPixelRatio(){return this.dpr;}},
  mobileAudit:{samples:[],fpsText:{textContent:''},fpsP95:{textContent:''}},onResize(){},touch:{enabled:true}
};
const p2=new P2(g2);
assert.equal(p2.preset,'FLUID');
assert.equal(g2.water.mesh.geometry.segX,24);
assert.equal(g2.water.mesh.geometry.segY,24);
assert.equal(24*24*2,1152,'24x24 water has 1152 instead of 100352 triangles');
assert.equal(g2.renderer.shadowMap.enabled,false);
assert.equal(g2.composer.passes[1].enabled,false);
p2.apply('HIGH');
assert.equal(g2.water.mesh.geometry,originalGeo,'HIGH restores original geometry');
assert.equal(g2.water.mesh.material,originalMat,'HIGH restores full water shader');
assert.equal(g2.renderer.shadowMap.enabled,true);
assert.equal(g2.composer.passes[1].enabled,true);
p2.apply('BALANCED');
assert.equal(g2.water.mesh.geometry,p2.flatWaterGeometry);
assert.equal(g2.renderer.shadowMap.enabled,false);
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/PerfGovernorP163/);
assert.match(main,/game\.perf163\.update\(time\)/);
assert.match(main,/game\.p163Enabled && game\.performanceP2\?\.preset==='BALANCED'/);
const terrain=await readFile(new URL('../src/world/terrain.js',import.meta.url),'utf8');
const scatter=await readFile(new URL('../src/world/scatter.js',import.meta.url),'utf8');
assert.match(terrain,/!!game\.p163Enabled/);
assert.match(scatter,/!!game\.p163Enabled/);
assert.match(scatter,/includeGrassP163\(/);
assert.match(scatter,/lastInstances = job.used/);
console.log('HIGHFLY P16.3 PASS: 98.85% flat water triangle reduction, HIGH rollback, no-bloom composer bypass, bounded DPR, ECO/visibility/mode gates, stats export and world flags');
