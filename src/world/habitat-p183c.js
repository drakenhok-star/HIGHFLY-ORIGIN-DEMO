/**
 * P18.3c: one spatial source for real forest cells and the short bandit trail.
 * Same 1338 forest seed as Scatter.buildPines(); no fake biome based on height.
 */
import { makeNoise2D, fbm } from '../core/noise.js';
const forestNoise=makeNoise2D(1338);
export const P183C_FOREST_GROVES=Object.freeze([
 Object.freeze({x:-190,z:505,id:'goblin'}),
 Object.freeze({x:-210,z:420,id:'spider'}),
 Object.freeze({x:-350,z:470,id:'forest_wolf'})
]);
export function treeNoiseP183c(x,z){
 return fbm(forestNoise,x*0.002,z*0.002,3);
}
export function realForestP183c(terrain,x,z){
 if(!terrain||!Number.isFinite(x)||!Number.isFinite(z))return false;
 const y=terrain.getHeight(x,z);
 return y>1.0&&y<50&&terrain.getSlope(x,z)<0.75&&treeNoiseP183c(x,z)>0.20;
}
const TRACK=Object.freeze([
 Object.freeze({x:171,z:-107}),Object.freeze({x:215,z:-112}),
 Object.freeze({x:257,z:-86})
]);
export function banditTrailP183c(x,z){
 if(x<162||x>267||z<-125||z>-76)return 0;
 let distance=Infinity;
 for(let i=1;i<TRACK.length;i++){
  const a=TRACK[i-1],b=TRACK[i];
  const dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  distance=Math.min(distance,Math.hypot(x-(a.x+t*dx),z-(a.z+t*dz)));
 }
 return distance>=3.8?0:distance<=2.3?1:(3.8-distance)/1.5;
}
