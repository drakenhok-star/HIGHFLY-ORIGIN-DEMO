/**
 * Heightfield audit: real terrain math from src/world/terrain.js, no WebGL.
 * Independent of current world chunks; sampling only, does not change game data.
 */
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../src/core/noise.js',import.meta.url),'utf8');
const {makeNoise2D,fbm}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const n=makeNoise2D(1337),smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const flat=[
 {x:0,z:40,r:75,y:4.5},{x:-220,z:-180,r:50,y:12},
 {x:150,z:150,r:25,y:8},{x:3000,z:3000,r:150,y:34},
 {x:-3000,z:-3000,r:120,y:34},{x:380,z:-150,r:40,y:70}
];
function height(x,z){
 let h=fbm(n,x*.0015,z*.0015,5)*30;
 const raw=fbm(n,x*.0008+37,z*.0008+91,3);
 const bias=Math.max(-.2,Math.min(.4,(x-z)/1600));
 const mask=smooth((raw*.5+.5+bias-.46)/.3);
 if(mask>0){const ridge=1-Math.abs(fbm(n,x*.004+7,z*.004+13,4));h+=ridge*ridge*95*mask;}
 for(const p of flat){
  const d=Math.hypot(x-p.x,z-p.z);
  if(d<p.r){const k=smooth((d-p.r*.55)/(p.r*.45));h=p.y+(h-p.y)*k;}
 }
 return h;
}
function slope(x,z){const e=1.5;return Math.hypot((height(x+e,z)-height(x-e,z))/(2*e),
  (height(x,z+e)-height(x,z-e))/(2*e));}
const candidates=[];
for(let x=150;x<=1350;x+=45)for(let z=-1300;z<=-80;z+=45){
 const y=height(x,z),s=slope(x,z);
 if(y<42||s<.5)continue;
 candidates.push({x,z,height:+y.toFixed(1),slope:+s.toFixed(2)});
}
candidates.sort((a,b)=>b.slope-a.slope||b.height-a.height);
console.log(JSON.stringify({
 title:'HIGHFLY HEIGHTFIELD MOUNTAINS — sampled northeast, not overhanging 3D walls',
 approximate:true,
 sampled:candidates.length,
 steepest:candidates.slice(0,12),
 authored_landmarks:[{name:'Monolitos de piedra',x:-220,z:-180},{name:'Meseta nevada',x:380,z:-150},
  {name:'Torre de piedra',x:300,z:-300}]
},null,2));
