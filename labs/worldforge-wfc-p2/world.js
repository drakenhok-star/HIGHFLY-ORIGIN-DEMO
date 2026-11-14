import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// HIGHFLY WorldForge Five Realms P1 — MIT original test logic, public CC0 player only.
// A single shared triangulated surface and a single height sampler support all three visual modes.
const $=s=>document.querySelector(s), TAU=Math.PI*2, SQ3=Math.sqrt(3), R=280, SCALE=8, DIST=SQ3*R;
const URL_PARAMS=new URLSearchParams(location.search);
const SEED=(URL_PARAMS.get('seed')||'AETHERIA-07').slice(0,30).replace(/[^a-zA-Z0-9_-]/g,'')||'AETHERIA-07';
const SEED_NUMBER=Array.from(SEED).reduce((v,c)=>Math.imul(v^c.charCodeAt(0),16777619)>>>0,2166136261);
const WORLD_KIND='wfc', START_FINISH=URL_PARAMS.get('finish')==='normal'?1:2;
const REGIONS=[
 {id:0,q:0,r:0,name:'Arvelia · Ciudad de los Inicios',short:'CIUDAD',c:'#77ac71'},
 {id:1,q:-1,r:1,name:'Elyndra · Bosque Esmeralda',short:'BOSQUE',c:'#2c694c'},
 {id:2,q:0,r:1,name:'Ignaris · Dunas y Oasis',short:'DESIERTO',c:'#e8bf79'},
 {id:3,q:0,r:-1,name:'Drakhar · Cumbres Rocosas',short:'MONTAÑA',c:'#879397'},
 {id:4,q:1,r:-1,name:'Nivalis · Isla de Nieve',short:'NIEVE',c:'#d7e9ea'},
 {id:5,q:-2,r:1,name:'Mizuhara · Pantanos',short:'PANTANO',c:'#517f5a'},
 {id:6,q:-1,r:2,name:'Viridia · Jungla',short:'SELVA',c:'#146b4b'},
 {id:7,q:2,r:-1,name:'Ignaroth · Volcanes',short:'VOLCÁN',c:'#9a5343'},
 {id:8,q:1,r:0,name:'Solaria · Sabanas',short:'SABANA',c:'#b7a56b'},
 {id:9,q:-1,r:0,name:'Karaz · Cañones',short:'CAÑONES',c:'#a88268'},
 {id:10,q:1,r:1,name:'Lumeria · Costa Azul',short:'COSTA',c:'#5cacc0'},
 {id:11,q:0,r:2,name:'Sylpharia · Bosque Otoñal',short:'OTOÑO',c:'#b1794c'},
 {id:12,q:-1,r:-1,name:'Borealis · Tundra',short:'TUNDRA',c:'#9aaebe'}
];
for(const reg of REGIONS){reg.x=SQ3*R*(reg.q+reg.r/2);reg.z=1.5*R*reg.r}
const HEX_LOOKUP=new Map(REGIONS.map(r=>[r.q+','+r.r,r]));
const HEX_DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
const hexDistance=r=>(Math.abs(r.q)+Math.abs(r.r)+Math.abs(r.q+r.r))/2;
const MAIN_ROADS=[];
for(const r of REGIONS.slice(1)){
 const parent=HEX_DIRECTIONS.map(([dq,dr])=>HEX_LOOKUP.get((r.q+dq)+','+(r.r+dr)))
  .filter(x=>x&&hexDistance(x)<hexDistance(r)).sort((a,b)=>hexDistance(a)-hexDistance(b))[0];
 if(parent)MAIN_ROADS.push({a:parent,b:r});
}
const LAKES=[
 {reg:0,dx:138,dz:-88,r:44,level:.75,type:'lago'},
 {reg:2,dx:52,dz:58,r:66,level:.95,type:'oasis'},
 {reg:4,dx:65,dz:69,r:64,level:-.18,type:'lago glaciar'},
 {reg:5,dx:-48,dz:45,r:89,level:.90,type:'pantano'},
 {reg:6,dx:76,dz:64,r:50,level:.86,type:'laguna'},
 {reg:10,dx:75,dz:-18,r:108,level:.70,type:'bahía'},
 {reg:12,dx:-48,dz:78,r:58,level:.48,type:'lago helado'}
];
for(const lake of LAKES){lake.x=REGIONS[lake.reg].x+lake.dx;lake.z=REGIONS[lake.reg].z+lake.dz}
function roadWeight(x,z){
 let strength=0;
 for(const seg of MAIN_ROADS){
  const vx=seg.b.x-seg.a.x,vz=seg.b.z-seg.a.z;
  const t=clamp(((x-seg.a.x)*vx+(z-seg.a.z)*vz)/(vx*vx+vz*vz),0,1);
  const d=Math.hypot(x-seg.a.x-vx*t,z-seg.a.z-vz*t);
  strength=Math.max(strength,1-smooth(6,18,d));
 }
 return strength;
}
function waterAt(x,z,bed){
 let level=null;
 for(const lake of LAKES){if(Math.hypot(x-lake.x,z-lake.z)<lake.r)level=lake.level}
 if(!regionAt(x,z)||REGIONS[4]===regionAt(x,z)&&bed<-1.7)level=-1.62;
 if(level===null||level<=bed+.05)return {kind:'tierra',depth:0,level:null};
 const depth=Math.max(0,level-bed);
 return {kind:depth<=.48?'orilla':depth<=1.55?'vadeo':'profunda',depth,level};
}

const scene=new THREE.Scene();scene.background=new THREE.Color(0x83b8d0);scene.fog=new THREE.Fog(0x83b8d0,250,1500);
const camera=new THREE.PerspectiveCamera(59,innerWidth/innerHeight,.15,2500);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
$('#app').append(renderer.domElement);
const ambient=new THREE.HemisphereLight(0xd5efff,0x4a5140,2.1);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffe3a9,2.2);sun.position.set(-90,130,80);scene.add(sun);
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smooth(a,b,x){let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
function lerp(a,b,t){return a+(b-a)*t}
function hash(n){const a=Math.sin(n*128.43+14.73+SEED_NUMBER*.000017)*43758.5453;return a-Math.floor(a)}
function bump(x,z,cx,cz,sx,sz){return Math.exp(-(((x-cx)/sx)**2+((z-cz)/sz)**2))}
function inside(x,z,r=R){return Math.abs(x)<=SQ3*r*.5+.001 && Math.abs(z)+Math.abs(x)/SQ3<=r+.001}
function edgeDistance(x,z){return Math.min(SQ3*R*.5-Math.abs(x),(R-Math.abs(z)-Math.abs(x)/SQ3)*SQ3*.5)}
function regionAt(x,z){
  for(const r of REGIONS)if(inside(x-r.x,z-r.z))return r;
  return null;
}
function corridor(x,z){
  const ux=.5,uz=-SQ3/2, vx=SQ3/2,vz=.5,t=x*ux+z*uz,p=Math.abs(x*vx+z*vz);
  return {t,p,weight:(1-smooth(13,22,p))*smooth(100,146,t)*(1-smooth(DIST-155,DIST-130,t))};
}
const defaultColor=new THREE.Color('#789b69'),cGrass=new THREE.Color('#7eb76f'),
cForest=new THREE.Color('#336d4d'),cSand=new THREE.Color('#e5be7c'),cRock=new THREE.Color('#7c868c'),
cSnow=new THREE.Color('#e7eef1'),cBeach=new THREE.Color('#d6c395'),cWater=new THREE.Color('#5b9ab4'),cDirt=new THREE.Color('#aaa084');
function groundHeight(x,z){
 const reg=regionAt(x,z);
 const base=.42+.27*Math.sin(x*.031)*Math.cos(z*.028)+.13*Math.sin(x*.041+z*.023);
 if(!reg)return -3.1;
 const dx=(x-reg.x)/SCALE,dz=(z-reg.z)/SCALE,d=Math.hypot(dx,dz);
 const edge=Math.max(0,edgeDistance(x-reg.x,z-reg.z)),blend=smooth(0,28,edge);
 const seedWaves=.45*Math.sin(dx*.23+reg.id+SEED_NUMBER*.0001)*Math.cos(dz*.17+reg.id);
 const hills=2.8*Math.sin(dx*.09)*Math.cos(dz*.085)+1.1*Math.sin(dx*.16+dz*.11);
 let y=base;
 switch(reg.id){
  case 0:y+=blend*(.7+.34*hills);break;
  case 1:y+=blend*(2.2+.56*hills+7*bump(dx,dz,-12,16,13,15)+seedWaves);break;
  case 2:y+=blend*(.8+3.3*Math.sin(dx*.13+dz*.05)**2+.66*hills+seedWaves);break;
  case 3:{
   const peaks=42*bump(dx,dz,-12,-15,8,9)+53*bump(dx,dz,13,-9,9,10)+37*bump(dx,dz,-2,20,9,10);
   y+=blend*(1.6+peaks+.6*hills);break;
  }
  case 4:{
   const land=1-smooth(17,29,d);
   const peaks=37*bump(dx,dz,15,-6,10,11)+42*bump(dx,dz,-8,-13,8,10)+21*bump(dx,dz,9,13,11,11);
   y=base+blend*(land*(3.6+peaks)-.6*(1-land));break;
  }
  case 5:y+=blend*(.15+.5*hills+2.4*bump(dx,dz,-10,19,16,11));break;
  case 6:y+=blend*(2.3+.77*hills+9*bump(dx,dz,10,11,11,13)+seedWaves);break;
  case 7:{
   const c=bump(dx,dz,-2,-6,12,11),crater=bump(dx,dz,-2,-6,4.2,4);
   y+=blend*(2.2+49*c-19*crater+7*bump(dx,dz,18,14,9,10)+seedWaves);break;
  }
  case 8:y+=blend*(1.4+.72*hills+1.8*bump(dx,dz,17,-10,17,12));break;
  case 9:y+=blend*(3.6+18*bump(dx,dz,-13,-12,13,7)+18*bump(dx,dz,14,13,12,7)+7*Math.pow(Math.sin(dx*.16),4));break;
  case 10:y+=blend*(1.2+.35*hills-1.9*bump(dx,dz,20,12,18,16));break;
  case 11:y+=blend*(2.4+.8*hills+7*bump(dx,dz,-17,-7,17,14));break;
  case 12:y+=blend*(1.2+.32*hills+18*bump(dx,dz,-12,-15,14,13)+7*bump(dx,dz,18,15,14,12));break;
 }
 for(const lake of LAKES){
  if(lake.reg!==reg.id)continue;
  const distance=Math.hypot(x-lake.x,z-lake.z);
  const depress=1-smooth(lake.r-17,lake.r+7,distance);
  if(depress>0){
   const innerDepth=reg.id===5?2.3:reg.id===10?2.8:2.4;
   y=lerp(y,lake.level-innerDepth,depress);
  }
 }
 // Safe traversable arteries: flatten only the road corridor, never an entire region.
 const path=roadWeight(x,z);
 if(path>.001)y=lerp(y,base+.47,path*.97);
 return y;
}
function colorAt(x,z,y,premium=false){
 const reg=regionAt(x,z);
 if(!reg)return cWater.clone();
 const dx=(x-reg.x)/SCALE,dz=(z-reg.z)/SCALE;
 const noise=Math.sin(x*.12)*Math.cos(z*.083)*.13+.036*Math.sin((x+z)*.28);
 const weight=smooth(0,24,Math.max(0,edgeDistance(x-reg.x,z-reg.z)));
 const palettes=[
 '#80b86e','#356d50','#e0ba78','#7d868b','#b9dce3','#648264',
 '#267b56','#78554f','#b5ae70','#b38868','#b8ba89','#a1764b','#afc0b7'
 ];
 let col=cGrass.clone().lerp(new THREE.Color(palettes[reg.id]),weight*.84);
 if(reg.id===3||reg.id===9||reg.id===7)col.lerp(cRock,smooth(6,15,y)*(.7*weight));
 if(reg.id===4||reg.id===12)col.lerp(cSnow,smooth(reg.id===4?13:12,reg.id===4?23:20,y)*weight);
 if(reg.id===10)col.lerp(cSand,weight*(.65+.18*Math.sin(dx*.15)));
 if(reg.id===2)col.lerp(cSand,.42*weight);
 if(reg.id===7&&y>25)col.lerp(new THREE.Color('#75413e'),.75);
 if(reg.id===11)col.lerp(new THREE.Color('#ce8649'),.25*weight);
 const tile=wfcAt(x,z);
 if(tile==='WOODS'||tile==='THICKET')col.lerp(new THREE.Color('#2e7754'),.14*weight);
 if(tile==='ROCK')col.lerp(cRock,.13*weight);
 if(tile==='SAND')col.lerp(cSand,.12*weight);
 // Every WFC tile receives the same premium terrain pipeline; no individual tile mesh collisions.
 if(premium){
  col.multiplyScalar(clamp(.96+noise*.65,.78,1.18));
  if(tile==='HAMLET')col.lerp(new THREE.Color('#b2a276'),.13);
  if(reg.id===10||reg.id===2)col.lerp(new THREE.Color('#f0d297'),.05);
 }
 if(roadWeight(x,z)>.15)col.lerp(cDirt,roadWeight(x,z)*.79);
 return col;
}

// WorldForge WFC-lite: six-neighbor hex rule propagation controls land-use and outposts.
// This is an independent compact implementation, not a direct port of Felix Turner's full WFC.
const WFC_TYPES=['MEADOW','WOODS','THICKET','ROCK','WATER','HAMLET','TRACK','SNOW','SAND'];
const NEIGHBORS=[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
const WFC_ALLOWED={
 MEADOW:WFC_TYPES,WOODS:['MEADOW','WOODS','THICKET','ROCK','TRACK','HAMLET','SNOW'],
 THICKET:['MEADOW','WOODS','THICKET','ROCK'],
 ROCK:['MEADOW','WOODS','THICKET','ROCK','TRACK','HAMLET','SNOW','SAND'],
 WATER:['MEADOW','WATER','SAND','WOODS'],
 HAMLET:['MEADOW','WOODS','ROCK','TRACK','HAMLET','SNOW','SAND'],
 TRACK:['MEADOW','WOODS','ROCK','HAMLET','TRACK','SNOW','SAND'],
 SNOW:['MEADOW','WOODS','ROCK','TRACK','HAMLET','SNOW'],
 SAND:['MEADOW','ROCK','WATER','HAMLET','TRACK','SAND']
};
const WEIGHTS=[
 [8,2,.8,.6,0,1.6,2.2,0,0],
 [3,6,7,2,.35,.45,1.2,0,0],
 [1,0,0,2,1.5,.7,1.3,0,8],
 [2,1,.15,8,0,.25,.6,1.5,0],
 [1,1.3,.3,3,.5,.55,1.3,9,.8],
 [2,2,3,.2,8,.3,1,0,1],
 [1,8,7,1,1,.4,.8,0,0],
 [.7,0,0,9,.4,.3,1.5,0,2],
 [9,.9,.2,1.1,1,1,2,0,1.6],
 [2,.1,0,8,.25,.5,1.5,0,4],
 [1,1,.2,.5,8,1,1,0,5],
 [2,8,4,1,.6,.7,1.3,0,0],
 [2,1,.3,6,.8,.4,1.2,8,.5]
];
const WFC_RAD=12,WFC_STEP=R/(1.5*(WFC_RAD+1)),WFC_MAPS=[];
function bitCount(m){let n=0;while(m){m&=m-1;n++}return n}
function firstBit(m){for(let i=0;i<WFC_TYPES.length;i++)if(m&(1<<i))return i;return 0}
function makeWFC(reg){
 const list=[],lookup=new Map(),weights=WEIGHTS[reg.id];
 let allowed=0;for(let i=0;i<9;i++)if(weights[i]>0)allowed|=1<<i;
 for(let q=-WFC_RAD;q<=WFC_RAD;q++)for(let r=-WFC_RAD;r<=WFC_RAD;r++){
  if(Math.abs(q+r)>WFC_RAD)continue;
  const x=reg.x+SQ3*WFC_STEP*(q+r/2),z=reg.z+1.5*WFC_STEP*r;
  const cell={q,r,x,z,mask:allowed,label:'MEADOW'};
  if(q===0&&r===0)cell.mask=(1<<(reg.id===0?0:5));
  list.push(cell);lookup.set(q+','+r,cell);
 }
 const allowedMasks=WFC_TYPES.map(t=>WFC_ALLOWED[t].reduce((m,n)=>m|(1<<WFC_TYPES.indexOf(n)),0));
 let repairs=0,iterations=0;
 function propagate(start){
  const queue=[start];
  while(queue.length){
   const item=queue.pop(),m=item.mask;let union=0;
   for(let i=0;i<9;i++)if(m&(1<<i))union|=allowedMasks[i];
   for(const [dq,dr] of NEIGHBORS){
    const other=lookup.get((item.q+dq)+','+(item.r+dr));
    if(!other)continue;
    let next=other.mask&union;
    if(!next){next=1;repairs++}
    if(next!==other.mask){other.mask=next;queue.push(other)}
   }
  }
 }
 propagate(lookup.get('0,0'));
 for(let turn=0;turn<list.length;turn++){
  let min=99,candidates=[];
  for(const c of list){const count=bitCount(c.mask);if(count<=1)continue;
   if(count<min){min=count;candidates=[c]}else if(count===min)candidates.push(c)}
  if(!candidates.length)break;
  const pick=candidates[Math.floor(hash((reg.id+1)*791+turn*3.17)*candidates.length)];
  let sum=0;for(let i=0;i<9;i++)if(pick.mask&(1<<i))sum+=weights[i];
  let draw=hash((turn+1)*557+reg.id*193)*sum,chosen=firstBit(pick.mask);
  for(let i=0;i<9;i++){if(!(pick.mask&(1<<i)))continue;draw-=weights[i];if(draw<=0){chosen=i;break}}
  pick.mask=1<<chosen;propagate(pick);iterations++;
 }
 for(const c of list)c.label=WFC_TYPES[firstBit(c.mask)];
 return {reg,lookup,cells:list,repairs,iterations};
}
if(WORLD_KIND==='wfc')for(const r of REGIONS)WFC_MAPS.push(makeWFC(r));
function wfcAt(x,z){
 if(WORLD_KIND!=='wfc')return 'MEADOW';
 const r=regionAt(x,z);if(!r)return 'MEADOW';
 const rf=(2/3*(z-r.z))/WFC_STEP,qf=(x-r.x)/(SQ3*WFC_STEP)-rf/2;
 let q=Math.round(qf),rr=Math.round(rf),yy=Math.round(-qf-rf);
 const dq=Math.abs(q-qf),dr=Math.abs(rr-rf),dy=Math.abs(yy+qf+rf);
 if(dq>dr&&dq>dy)q=-rr-yy;else if(dr>dy)rr=-q-yy;
 return WFC_MAPS[r.id]?.lookup.get(q+','+rr)?.label||'MEADOW';
}


const vertexPositions=[],idx=[],cols=[],colsPremium=[],vertexMap=new Map();
function vertex(x,z){
  const key=Math.round(x*10000)+','+Math.round(z*10000);
  if(vertexMap.has(key))return vertexMap.get(key);
  const y=groundHeight(x,z),a=colorAt(x,z,y),b=colorAt(x,z,y,true),id=vertexPositions.length/3;
  vertexPositions.push(x,y,z);cols.push(a.r,a.g,a.b);colsPremium.push(b.r,b.g,b.b);
  vertexMap.set(key,id);return id;
}
function makeTerrain(){
 const n=52;
 for(const r of REGIONS){
  for(let s=0;s<6;s++){
   const a=Math.PI/2-s*Math.PI/3,b=a-Math.PI/3;
   const ax=Math.cos(a)*R,az=Math.sin(a)*R,bx=Math.cos(b)*R,bz=Math.sin(b)*R;
   const local=new Map();
   const vid=(i,j)=>{const k=i+','+j;if(local.has(k))return local.get(k);
      const x=r.x+(ax*i+bx*j)/n,z=r.z+(az*i+bz*j)/n;
      const v=vertex(x,z);local.set(k,v);return v;};
   for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
      const aa=vid(i,j),bb=vid(i+1,j),cc=vid(i,j+1);idx.push(aa,bb,cc);
      if(i+j<n-1){const dd=vid(i+1,j+1);idx.push(bb,dd,cc);}
   }
  }
 }
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(vertexPositions,3));
 geom.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geom.setIndex(idx);geom.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,side:THREE.DoubleSide});
 const uv=[];for(let i=0;i<vertexPositions.length;i+=3)uv.push(vertexPositions[i]/8,vertexPositions[i+2]/8);
 geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const mesh=new THREE.Mesh(geom,mat);mesh.name='shared-continuous-terrain';scene.add(mesh);return mesh;
}
$('#loadingtxt').textContent='Generando malla física y visual compartida...';
const groundMesh=makeTerrain();
function makeDetailTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;
 const cx=c.getContext('2d'),im=cx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const grain=204+Math.floor(hash((x*3+y*127)%99999)*49),i=(y*128+x)*4;
  im.data[i]=im.data[i+1]=im.data[i+2]=grain;im.data[i+3]=255;
 }
 cx.putImageData(im,0,0);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;return tex;
}
const detailTexture=makeDetailTexture();
const contourGroups=[new THREE.Group(),new THREE.Group()];
scene.add(contourGroups[0]);scene.add(contourGroups[1]);
for(const r of REGIONS){
 let pts=[];for(let s=0;s<6;s++){const a=Math.PI/2-s*Math.PI/3,b=a-Math.PI/3;
   for(let k=0;k<30;k++){const f=k/30,x=r.x+R*lerp(Math.cos(a),Math.cos(b),f),z=r.z+R*lerp(Math.sin(a),Math.sin(b),f);pts.push(new THREE.Vector3(x,groundHeight(x,z)+.10,z));}}
 const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:r.id===4?0xcbe8e7:0x6a5142,transparent:true,opacity:.48}));contourGroups[0].add(line);
 const line2=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(p.x,p.y+.025,p.z))),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.07}));contourGroups[1].add(line2);
}
// Sea covers the non-land part of the island; water is separate from land collision.
const water=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshPhysicalMaterial({color:0x388bb2,roughness:.25,metalness:.1,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide}));
water.rotation.x=-Math.PI/2;water.position.y=-1.73;scene.add(water);
const foamMat=new THREE.MeshBasicMaterial({color:0xa7ebed,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
const seaFoam=new THREE.Mesh(new THREE.RingGeometry(22,23.5,90),foamMat);seaFoam.rotation.x=-Math.PI/2;seaFoam.position.set(REGIONS[4].x,-1.68,REGIONS[4].z);seaFoam.scale.set(8,8,1);scene.add(seaFoam);
// Decoration helpers. Original low-poly shapes; no private assets.
const materials={
 stone:new THREE.MeshStandardMaterial({color:'#bcb6a8',roughness:.9}),
 darkStone:new THREE.MeshStandardMaterial({color:'#6c727b',roughness:.9}),
 wood:new THREE.MeshStandardMaterial({color:'#845d45',roughness:.9}),
 plaster:new THREE.MeshStandardMaterial({color:'#e5ccab',roughness:.9}),
 roof:new THREE.MeshStandardMaterial({color:'#a95343',roughness:.85}),
 roofBlue:new THREE.MeshStandardMaterial({color:'#557b9b',roughness:.85}),
 roofGreen:new THREE.MeshStandardMaterial({color:'#3d7560',roughness:.9}),
 roofGold:new THREE.MeshStandardMaterial({color:'#cda96e',roughness:.85}),
 snow:new THREE.MeshStandardMaterial({color:'#e8eef2',roughness:.95}),
 tan:new THREE.MeshStandardMaterial({color:'#d7b483',roughness:.9}),
 window:new THREE.MeshStandardMaterial({color:'#ffe3a3',roughness:.55,emissive:'#513a18',emissiveIntensity:.3}),
 water:new THREE.MeshStandardMaterial({color:'#49bdc6',transparent:true,opacity:.84,roughness:.24,depthWrite:false,side:THREE.DoubleSide})
};
const allDecor=new THREE.Group();scene.add(allDecor);
const premiumOnly=new THREE.Group();scene.add(premiumOnly);
const colliders=[];
function mesh(geo,mat,x=0,y=0,z=0,parent=allDecor){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m}
function cube(w,h,d,m,x,y,z,parent=allDecor){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent)}
function cone(rad,h,sides,m,x,y,z,parent=allDecor){return mesh(new THREE.ConeGeometry(rad,h,sides),m,x,y,z,parent)}
function cylinder(rad1,rad2,h,sides,m,x,y,z,parent=allDecor){return mesh(new THREE.CylinderGeometry(rad1,rad2,h,sides),m,x,y,z,parent)}
function solid(x,z,rad){colliders.push({x,z,r:rad})}
function roof(x,y,z,r,mat=materials.roof,parent=allDecor){const m=cone(r,3.6,4,mat,x,y,z,parent);m.rotation.y=Math.PI/4;return m}
function createHouse(x,z,col=materials.roof,scale=1){
 const y=groundHeight(x,z),g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);allDecor.add(g);
 cube(4.7,3,4,materials.plaster,0,1.5,0,g);
 roof(0,4.37,0,3.6,col,g);
 cube(.82,1.75,.13,materials.wood,0,.89,2.07,g);
 cube(.78,.78,.12,materials.window,-1.35,2.05,2.08,g);
 cube(.78,.78,.12,materials.window,1.35,2.05,2.08,g);
 const chimney=cube(.55,2,.62,materials.stone,1.4,5,0,g);
 solid(x,z,2.6*scale);return g;
}
function createTower(x,z,roofMaterial=materials.roof){
 const y=groundHeight(x,z);
 cylinder(2.4,2.8,7,8,materials.stone,x,y+3.5,z);
 roof(x,y+8.5,z,3.2,roofMaterial);
 for(let k=0;k<4;k++){const a=k*TAU/4;cube(.55,1.2,.65,materials.darkStone,x+Math.cos(a)*2.5,y+6.8,z+Math.sin(a)*2.5)}
 solid(x,z,2.6);
}
function createCastle(x,z,ro=materials.roof){
 const y=groundHeight(x,z);
 cube(10,7,8,materials.stone,x,y+3.5,z);cube(6,4,5,materials.plaster,x,y+9,z);
 roof(x,y+12.3,z,5.3,ro);
 for(const [dx,dz] of [[-5,-4],[5,-4],[-5,4],[5,4]])createTower(x+dx,z+dz,ro);
 cube(2,3,.23,materials.wood,x,y+1.5,z+4.11);
 const flag=cube(.09,5,.09,materials.darkStone,x,y+16,z);
 const banner=mesh(new THREE.PlaneGeometry(2.4,1.25),new THREE.MeshBasicMaterial({color:'#d85e58',side:THREE.DoubleSide}),x+1.2,y+17.5,z);banner.rotation.y=.3;
 solid(x,z,6.3);
 return flag;
}
function createForestShrine(r){
 const x=r.x,z=r.z,y=groundHeight(x,z);
 cylinder(5,5.25,1.4,8,materials.stone,x,y+.7,z);
 cube(7,5,5,materials.wood,x,y+3.4,z);
 roof(x,y+7.5,z,5.1,materials.roofGreen);
 for(const dx of [-4,4])for(const dz of [-3,3])cylinder(.42,.52,6,7,materials.wood,x+dx,y+4.2,z+dz);
 const altar=cube(2,.8,1.7,materials.stone,x,y+1,z+7);altar.rotation.y=.1;
 solid(x,z,5.4);
}
function createDesertTemple(r){
 const x=r.x-6,z=r.z-7,y=groundHeight(x,z);
 cube(11,4.5,8,materials.tan,x,y+2.25,z);
 cube(12,.8,9,materials.roofGold,x,y+4.7,z);
 cylinder(3.4,3.4,2,12,materials.tan,x,y+5.85,z);
 const dome=mesh(new THREE.SphereGeometry(3.2,16,10,0,TAU,0,Math.PI/2),materials.roofGold,x,y+6.8,z);
 for(const dx of [-5,5])for(const dz of [-4,4]){
 cylinder(1.3,1.5,6,8,materials.tan,x+dx,y+3,z+dz);
 const small=mesh(new THREE.SphereGeometry(1.55,9,7,0,TAU,0,Math.PI/2),materials.roofGold,x+dx,y+6,z+dz);
 }
 cube(2,3,.2,materials.wood,x,y+1.5,z+4.1);
 solid(x,z,5.8);
}
function createMountainStronghold(r){
 const x=r.x+2,z=r.z+3,y=groundHeight(x,z);
 cube(10,6,8,materials.darkStone,x,y+3,z);
 roof(x,y+7.5,z,6,materials.roofBlue);
 createTower(x-5,z-3,materials.roofBlue);
 createTower(x+5,z+3,materials.roofBlue);
 solid(x,z,5);
}
function createSnowBeacon(r){
 const x=r.x-3,z=r.z+3,y=groundHeight(x,z);
 cylinder(3.2,4.1,10,8,materials.stone,x,y+5,z);
 cylinder(4,4,1,8,materials.snow,x,y+10.5,z);
 cone(5.4,6.5,8,materials.roofBlue,x,y+14.15,z);
 cylinder(.22,.22,5,8,materials.darkStone,x,y+19,z);
 const light=mesh(new THREE.SphereGeometry(.85,9,7),new THREE.MeshStandardMaterial({color:'#ffe8b3',emissive:'#ffc76e',emissiveIntensity:.95}),x,y+21,z);
 solid(x,z,3.6);
 return light;
}
const city=REGIONS[0],forest=REGIONS[1],desert=REGIONS[2],mountain=REGIONS[3],snow=REGIONS[4];
createCastle(0,0);
createForestShrine(forest);
createDesertTemple(desert);
createMountainStronghold(mountain);
createSnowBeacon(snow);
// Expanded authored world. Buildings stay at real character scale as land grows.
for(let i=0;i<40;i++){
 const ring=i<17?33:i<29?61:92,angle=i*2.39996+.2;
 const rr=ring+(hash(i*39)-.5)*12,x=Math.cos(angle)*rr,z=Math.sin(angle)*rr;
 if(!inside(x,z,R-9)||Math.abs(x)<8&&Math.abs(z)<12||Math.abs(x+z)<6)continue;
 createHouse(x,z,i%4===0?materials.roofBlue:i%3===0?materials.roofGold:materials.roof,.76+hash(i*13)*.23);
}
for(let i=0;i<6;i++){const a=i*TAU/6;createTower(Math.sin(a)*84,Math.cos(a)*84,materials.roof)}
for(let i=0;i<12;i++){
 const a=i*TAU/12,rad=35+hash(i*52)*62,x=forest.x+Math.cos(a)*rad,z=forest.z+Math.sin(a)*rad;
 if(inside(x-forest.x,z-forest.z,R-12))createHouse(x,z,materials.roofGreen,.72+hash(i*9)*.26);
}
for(let i=0;i<8;i++){
 const a=i*TAU/8,x=desert.x+Math.sin(a)*57,z=desert.z+Math.cos(a)*49;
 if(inside(x-desert.x,z-desert.z,R-12))createHouse(x,z,materials.roofGold,.82);
}
for(let i=0;i<7;i++){
 const a=i*TAU/7,x=mountain.x+Math.sin(a)*73,z=mountain.z+Math.cos(a)*75;
 if(inside(x-mountain.x,z-mountain.z,R-11))createHouse(x,z,materials.roofBlue,.72);
}
for(let i=0;i<7;i++){
 const a=i*TAU/7,x=snow.x+Math.sin(a)*54,z=snow.z+Math.cos(a)*55;
 if(inside(x-snow.x,z-snow.z,R-11)&&groundHeight(x,z)>0)createHouse(x,z,materials.roofBlue,.8);
}
// Instanced flora; independent from collision geometry, keeps mobile draw calls low.
const cameraTrees=[];
const cameraFoliage=[];
function createVegetation(){
 const pineTrunkGeo=new THREE.CylinderGeometry(.13,.25,1.9,5),
       pineFoliageGeo=new THREE.ConeGeometry(1.45,4.5,7),
       bushGeo=new THREE.IcosahedronGeometry(.87,0),
       rockGeo=new THREE.DodecahedronGeometry(1.6,0);
 const specs={green:[],dark:[],snow:[],palm:[],autumn:[],rocks:[],bushes:[]};
 let serial=0;
 for(const r of REGIONS){
  const total=[750,1850,520,680,700,1150,1550,440,700,480,620,1400,750][r.id];
  for(let i=0;i<total;i++){
    let dx=(hash(i*41+r.id*303+2)-.5)*R*1.76,
        dz=(hash(i*53+r.id*133+6)-.5)*R*1.80;
    if(!inside(dx,dz,R-11))continue;
    const x=r.x+dx,z=r.z+dz;
    if(Math.hypot(dx,dz)<(r.id===0?68:r.id===2?30:24))continue;
    const h=groundHeight(x,z);
    if((r.id===4||r.id===12)&&(h<-.7||h>38))continue;
    if((r.id===3||r.id===7||r.id===9)&&h>44)continue;
    if(waterAt(x,z,h).depth>.05)continue;
    if(r.id===2&&Math.hypot(dx-52,dz-58)>95&&hash(i*41)>.38)continue;
    if(r.id===7&&hash(i*9)>.32)continue;
    if(r.id===9&&hash(i*11)>.5)continue;
    if(roadWeight(x,z)>.13)continue;
    const tile=wfcAt(x,z);
    if(WORLD_KIND==='wfc'&&(tile==='TRACK'||tile==='HAMLET'||tile==='WATER'||tile==='MEADOW'&&hash(i*7+r.id)<.66||tile==='ROCK'&&hash(i*17)<.6))continue;
    const size=(.8+hash(i*11+r.id*223)*.75)*(WORLD_KIND==='wfc'&&tile==='THICKET'?1.15:1);
    const pick=(r.id===4||r.id===12)?'snow':r.id===2||r.id===10?'palm':r.id===11?'autumn':(r.id===7||r.id===9)?'green':(r.id===1||r.id===5||r.id===6)?'dark':'green';
    specs[pick].push({x,z,y:h,s:size,k:i+r.id*600});
    if(serial++%5===0)specs.bushes.push({x:x+2,z:z+1,y:groundHeight(x+2,z+1),s:.45+hash(i*3)*.7,k:i});
  }
  for(let i=0;i<165;i++){
   const dx=(hash(i*97+r.id*154+2)-.5)*R*1.62,dz=(hash(i*103+r.id*24+9)-.5)*R*1.62;
   if(!inside(dx,dz,R-12)||Math.hypot(dx,dz)<21)continue;
   const x=r.x+dx,z=r.z+dz,y=groundHeight(x,z);
   if(y< -1||waterAt(x,z,y).depth>.5)continue; if(WORLD_KIND==='wfc'&&wfcAt(x,z)==='WATER'&&hash(i*8)>.45)continue; specs.rocks.push({x,z,y,s:.45+hash(i*10+r.id)*1.25,k:i});
  }
 }
 for(const type of ['green','dark','snow','palm','autumn'])for(const p of specs[type]){
  cameraTrees.push({x:p.x,z:p.z,y:p.y,s:p.s});
  colliders.push({x:p.x,z:p.z,r:type==='palm'?.36*p.s:.52*p.s});
 }
 const dummy=new THREE.Object3D();
 function inst(geometry,mat,arr,place,colorfn,parent=allDecor){
   if(!arr.length)return;
   const m=new THREE.InstancedMesh(geometry,mat,arr.length);
   arr.forEach((p,i)=>{place(p,dummy);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(colorfn)m.setColorAt(i,new THREE.Color(colorfn(p,i)))});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;parent.add(m);
   const canopy=(geometry.type==='ConeGeometry'&&(arr===specs.green||arr===specs.dark||arr===specs.snow||arr===specs.autumn))||(geometry.type==='IcosahedronGeometry'&&arr===specs.palm);
   if(canopy)cameraFoliage.push({mesh:m,points:arr,source:m.instanceMatrix.array.slice(),hidden:new Uint8Array(arr.length)});

 }
 const bark=new THREE.MeshStandardMaterial({color:'#86664a',roughness:1}),greenMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),palmMat=new THREE.MeshStandardMaterial({color:'#dbb56a',roughness:1});
 for(const type of ['green','dark','snow','autumn']){
  const arr=specs[type];
  inst(pineTrunkGeo,bark,arr,(p,d)=>{d.position.set(p.x,p.y+.95*p.s,p.z);d.rotation.set(0,0,0);d.scale.setScalar(p.s)});
  inst(pineFoliageGeo,greenMat,arr,(p,d)=>{d.position.set(p.x,p.y+3.4*p.s,p.z);d.rotation.set(0,p.k*.8,0);d.scale.setScalar(p.s)},p=>type==='snow'?(hash(p.k)>.5?'#c6d4cb':'#7cafa2'):type==='autumn'?(hash(p.k)>.5?'#bd7441':'#bba057'):type==='dark'?(hash(p.k)>.5?'#2d6949':'#3d7c52'):(hash(p.k)>.5?'#518766':'#41795e'));
  inst(new THREE.ConeGeometry(.95,3.1,7),greenMat,arr,(p,d)=>{d.position.set(p.x,p.y+5.1*p.s,p.z);d.scale.setScalar(p.s)},p=>type==='snow'?'#e5e9e7':type==='autumn'?(hash(p.k)>.5?'#d18a42':'#bb5d43'):type==='dark'?'#52926a':'#6e9f7c');
 }
 inst(new THREE.CylinderGeometry(.2,.29,4.5,6),palmMat,specs.palm,(p,d)=>{d.position.set(p.x,p.y+2.2*p.s,p.z);d.scale.setScalar(p.s)});
 inst(new THREE.IcosahedronGeometry(2.7,0),greenMat,specs.palm,(p,d)=>{d.position.set(p.x,p.y+5.3*p.s,p.z);d.scale.set(1.1*p.s,.34*p.s,1.1*p.s)},p=>'#4d9872');
 inst(rockGeo,greenMat,specs.rocks,(p,d)=>{d.position.set(p.x,p.y+.65*p.s,p.z);d.rotation.set(.1,p.k*.87,.15);d.scale.set(p.s,.72*p.s,p.s)},p=>p.y>8?'#a8b4bc':'#96979a');
 inst(bushGeo,greenMat,specs.bushes,(p,d)=>{d.position.set(p.x,p.y+.45*p.s,p.z);d.scale.setScalar(p.s)},p=>hash(p.k)>.5?'#60975d':'#6c9f5f',premiumOnly);
}
createVegetation();
// Tall stone formations, water oasis and shoreline.
for(let i=0;i<55;i++){
 let dx=(hash(i*18+6)-.5)*R*1.5,dz=(hash(i*31+7)-.5)*R*1.5;
 if(!inside(dx,dz,R-5)||Math.hypot(dx,dz)<7)continue;
 let x=mountain.x+dx,z=mountain.z+dz,y=groundHeight(x,z);
 const ph=8+hash(i*15)*18;cone(2.2+hash(i*9)*3.1,ph,5,materials.darkStone,x,y+ph/2,z);solid(x,z,2.2+hash(i*9)*3.1);
}
const oasisX=LAKES[1].x,oasisZ=LAKES[1].z;
// Shared water bodies use the same waterAt() depth sampler as the character controller.
const waterSurfaces=[];
for(const lake of LAKES){
 const lakeMaterial=new THREE.MeshStandardMaterial({
  color:lake.reg===12?'#9ecfd5':lake.reg===5?'#4f9490':'#4db9ca',
  metalness:.06,roughness:.24,transparent:true,opacity:.77,depthWrite:false,side:THREE.DoubleSide
 });
 const surface=mesh(new THREE.CircleGeometry(lake.r,72),lakeMaterial,lake.x,lake.level,lake.z);
 surface.rotation.x=-Math.PI/2;
 waterSurfaces.push(surface);
 const rim=new THREE.Mesh(new THREE.RingGeometry(lake.r,lake.r+3.2,72),new THREE.MeshStandardMaterial({color:lake.reg===2?'#ccba89':'#8eaaa0',side:THREE.DoubleSide,transparent:true,opacity:.68}));
 rim.rotation.x=-Math.PI/2;rim.position.set(lake.x,lake.level-.03,lake.z);scene.add(rim);
}

for(let i=0;i<20;i++){
 const a=i*TAU/20,dist=LAKES[1].r+5+hash(i*12)*8,x=oasisX+Math.cos(a)*dist,z=oasisZ+Math.sin(a)*dist,y=groundHeight(x,z);
 cylinder(.16,.26,5.8,6,materials.wood,x,y+2.9,z);
 for(let leaf=0;leaf<5;leaf++){const g=cone(1.55,3.0,5,new THREE.MeshStandardMaterial({color:leaf%2?'#46986c':'#6ca86e'}),x+Math.sin(leaf*TAU/5)*1.0,y+6.1,z+Math.cos(leaf*TAU/5)*1);g.rotation.z=.65*Math.sin(leaf*TAU/5);}
}
// Curved road segments follow exactly the same shared height function as the character.
const roadMaterial=new THREE.MeshStandardMaterial({color:'#c5b298',roughness:.94,side:THREE.DoubleSide});
const bridgeMat=new THREE.MeshStandardMaterial({color:'#c4aa79',roughness:.8,side:THREE.DoubleSide});
function pathMesh(points,width=2.5,mat=roadMaterial,extra=.09){
 const pos=[],indices=[];
 for(let i=0;i<points.length;i++){const p=points[i],b=points[Math.min(points.length-1,i+1)],a=points[Math.max(0,i-1)];
  let vx=b[0]-a[0],vz=b[1]-a[1],len=Math.hypot(vx,vz)||1;vx/=len;vz/=len;
  for(const side of [-1,1]){
    const x=p[0]+(-vz)*side*width*.5,z=p[1]+vx*side*width*.5;
    pos.push(x,groundHeight(x,z)+extra,z);
  }
  if(i>0){const o=i*2;indices.push(o-2,o-1,o,o-1,o+1,o)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();
 const m=new THREE.Mesh(g,mat);allDecor.add(m);return m;
}
for(const connection of MAIN_ROADS){
 const src=connection.a,dst=connection.b,dx=dst.x-src.x,dz=dst.z-src.z;
 const pts=[];
 for(let i=0;i<=100;i++){
  const u=i/100;
  pts.push([src.x+dx*u,src.z+dz*u]);
 }
 const isBridge=(dst.id===4||src.id===4||dst.id===10&&src.id===8);
 pathMesh(pts,isBridge?7.1:6.3,isBridge?bridgeMat:roadMaterial,.11);
}

function buildBridge(){
 const ux=.5,uz=-SQ3/2,vx=SQ3/2,vz=.5;
 for(let t=115;t<=DIST-112;t+=1.9){
   const x=ux*t,z=uz*t,y=groundHeight(x,z);
   const m=cube(8.7,.25,1.7,materials.wood,x,y+.18,z);m.rotation.y=Math.atan2(ux,uz);
   if(Math.floor(t*2)%7<2){for(const side of [-1,1]){
    const px=x+vx*side*3.8,pz=z+vz*side*3.8,py=groundHeight(px,pz);
    cylinder(.15,.15,2.2,6,materials.wood,px,py+1.15,pz);
   }}
 }
}buildBridge();
// Auto-generated secondary hamlets from collapsed WFC cells.
if(WORLD_KIND==='wfc'){
 let placed=0;
 for(const map of WFC_MAPS){
  let added=0;
  for(const cell of map.cells){
   if(cell.label!=='HAMLET'||added>=5||Math.hypot(cell.x-map.reg.x,cell.z-map.reg.z)<75)continue;
   if(!inside(cell.x-map.reg.x,cell.z-map.reg.z,R-19))continue;
   const h=groundHeight(cell.x,cell.z);
   if(h<-.4||waterAt(cell.x,cell.z,h).depth>.03||roadWeight(cell.x,cell.z)>.5)continue;
   const grad=Math.max(Math.abs(groundHeight(cell.x+3,cell.z)-h),Math.abs(groundHeight(cell.x,cell.z+3)-h));
   if(grad>1.15)continue;
   createHouse(cell.x,cell.z,map.reg.id===1||map.reg.id===6?materials.roofGreen:map.reg.id===2?materials.roofGold:map.reg.id===4||map.reg.id===12?materials.roofBlue:materials.roof,.75+hash(placed*13)*.2);
   added++;placed++;
  }
 }
}

// Real public CC0 KayKit medieval models, packaged at build time from a verified public mirror.
const FREE_KAYKIT=[
 {kind:'hall',h:13,spots:[[-34,-10],[43,-26],[-45,55]]},
 {kind:'house',h:6.5,spots:[[27,36],[-51,28],[52,49],[-10,-64],[71,-8],[-80,-15],[-65,-78],[89,72],
  ...REGIONS.slice(1).filter(r=>r.id!==7).map(r=>[r.x+46,r.z+55])]},
 {kind:'tower',h:11,spots:[[105,0],[-104,0],[0,103],[0,-104],[76,77],[-76,-77]]},
 {kind:'wall',h:5,spots:[[98,17],[98,-17],[-98,17],[-98,-17],[17,98],[-17,98]]},
 {kind:'tree',h:9,spots:[[117,57],[-118,57],[128,-43],[-123,-52],[75,119]]},
 {kind:'rock',h:4.5,spots:[[142,72],[-143,89],[118,-112],...REGIONS.slice(1).map(r=>[r.x+95,r.z-55])]}
];
let realAssetLoaded=0,realAssetFailed=0;
const freeLoader=new GLTFLoader();
for(const spec of FREE_KAYKIT){
 freeLoader.load('./assets/'+spec.kind+'.glb',g=>{
  const model=g.scene;
  const box=new THREE.Box3().setFromObject(model);
  const size=new THREE.Vector3();box.getSize(size);
  const ctr=new THREE.Vector3();box.getCenter(ctr);
  const unit=spec.h/Math.max(.05,size.y);
  for(const [x,z] of spec.spots){
   const r=regionAt(x,z);
   if(!r)continue;
   const bed=groundHeight(x,z);
   if(waterAt(x,z,bed).depth>.1)continue;
   const copy=model.clone(true);
   copy.scale.setScalar(unit);
   copy.position.set(x-ctr.x*unit,bed-box.min.y*unit,z-ctr.z*unit);
   copy.rotation.y=(hash(x*71+z*43)-.5)*.12;
   copy.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
   scene.add(copy);
   realAssetLoaded++;
   if(spec.kind!=='tree'&&spec.kind!=='rock')addCollider(x,z,Math.max(1.6,Math.min(7,Math.max(size.x,size.z)*unit*.37)));
  }
 },undefined,err=>{realAssetFailed++;console.warn('KayKit CC0 model unavailable '+spec.kind,err?.message||err)});
}

// All four comparison combinations use one unified visual terrain mesh and one collision height function.
// Independent tiny hex tile overlays are intentionally disabled: this prevents visual seams.

// Character: public CC0 asset in HIGHFLY ORIGIN, original fallback if unavailable.
const hero=new THREE.Group();scene.add(hero);
const visual=new THREE.Group();hero.add(visual);
function fallback(){
 const robe=mesh(new THREE.CapsuleGeometry(.45,1.13,5,9),new THREE.MeshStandardMaterial({color:'#906ed3'}),0,1.1,0,visual);
 mesh(new THREE.SphereGeometry(.35,12,9),new THREE.MeshStandardMaterial({color:'#f1cba2'}),0,2.0,0,visual);
}
fallback();let mixer=null;
try{
 new GLTFLoader().load('../../assets/models/player_barbarian.glb',g=>{
  const model=g.scene;model.scale.setScalar(.8);
  model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}if(o.name&&/(axe|shield|mug|cape)/i.test(o.name))o.visible=false});
  visual.clear();visual.add(model);
  if(g.animations?.length){
   mixer=new THREE.AnimationMixer(model);
   const actions={};for(const n of ['Idle','Walking_A','Running_A','Jump_Start']){const clip=g.animations.find(a=>a.name===n);if(clip)actions[n]=mixer.clipAction(clip)}
   const idle=actions.Idle??Object.values(actions)[0];idle?.play();
   hero.userData.actions=actions;hero.userData.last='Idle';
  }
 },undefined,e=>console.warn('CC0 player fallback:',e?.message));
}catch(err){console.warn(err)}
function reset(){hero.position.set(9,groundHeight(9,11),11);state.vy=0;state.air=0;state.dash=0;state.water='tierra';state.crossings=0;state.blocked=0;state.lastRegion=0;$('#crossings').textContent='0';$('#blocks').textContent='0'}
const hiddenCanopyMatrix=new THREE.Matrix4().makeScale(0,0,0);
const originalCanopyMatrix=new THREE.Matrix4();
function updateNearFoliage(){
 const ax=hero.position.x,az=hero.position.z, bx=camera.position.x, bz=camera.position.z;
 const vx=bx-ax,vz=bz-az,length2=vx*vx+vz*vz+.0001;
 for(const entry of cameraFoliage){
  let changed=false;
  for(let i=0;i<entry.points.length;i++){
   const p=entry.points[i],dx=p.x-ax,dz=p.z-az,d2=dx*dx+dz*dz;
   let hide=d2<(4.0*p.s+1.8)**2;
   if(!hide){
    const t=(dx*vx+dz*vz)/length2;
    if(t>.08&&t<.96){
     const px=ax+vx*t,pz=az+vz*t;
     hide=(p.x-px)**2+(p.z-pz)**2<(2.8*p.s+1.1)**2;
    }
   }
   const state=hide?1:0;
   if(entry.hidden[i]===state)continue;
   entry.hidden[i]=state;
   if(hide)entry.mesh.setMatrixAt(i,hiddenCanopyMatrix);
   else entry.mesh.setMatrixAt(i,originalCanopyMatrix.fromArray(entry.source,i*16));
   changed=true;
  }
  if(changed)entry.mesh.instanceMatrix.needsUpdate=true;
 }
}

let visualMode=START_FINISH;
const descriptions={
  1:'NORMAL: terreno 8× continuo en 13 biomas. Agua somera transitable.',
  2:'PREMIUM: cada hexágono WFC recibe color, detalle y naturaleza, con ciudad y caminos protegidos.'
};
function setMode(m){
 visualMode=m;
 contourGroups[0].visible=m===1;contourGroups[1].visible=m!==1;
 premiumOnly.visible=m===2;
 groundMesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(m===2?colsPremium:cols,3));
 groundMesh.material.map=m===2?detailTexture:null;
 groundMesh.material.needsUpdate=true;
 groundMesh.material.roughness=m===2?.88:.98;
 sun.intensity=m===2?2.62:2.07;renderer.toneMappingExposure=m===2?1.38:1.17;
 $('#modeLabel').textContent=m===2?'PREMIUM':'NORMAL';
 $('#desc').textContent=descriptions[m];
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',Number(b.dataset.mode)===m));
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(Number(b.dataset.mode))));
$('#brand small').textContent='P2 · 13 BIOMAS 8× · SEMILLA '+SEED;
$('#seedValue').value=SEED;
$('#seed').addEventListener('click',()=>$('#seedPopup').classList.toggle('open'));
$('#closeSeed').addEventListener('click',()=>$('#seedPopup').classList.remove('open'));
const worldSeed=s=>{
 const value=String(s||'AETHERIA-07').slice(0,30).replace(/[^a-zA-Z0-9_-]/g,'')||'AETHERIA-07';
 const url=new URL(location.href);url.searchParams.set('seed',value);url.searchParams.set('finish',visualMode===1?'normal':'premium');location.assign(url.href);
};
document.querySelectorAll('[data-seed]').forEach(b=>b.addEventListener('click',()=>worldSeed(b.dataset.seed)));
$('#applySeed').addEventListener('click',()=>worldSeed($('#seedValue').value));
$('#regenerate').addEventListener('click',()=>worldSeed('AETHERIA-'+Math.floor(Math.random()*999999).toString().padStart(6,'0')));

$('#fullscreen').addEventListener('click',async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else{
   if(!document.documentElement.requestFullscreen)throw new Error('Tu navegador no admite pantalla completa');
   await document.documentElement.requestFullscreen({navigationUI:'hide'});
   if(screen.orientation?.lock)screen.orientation.lock('landscape').catch(()=>{});
  }
 }catch(e){$('#desc').textContent='No se pudo abrir pantalla completa: '+e.message+' · Probá Chrome.'}
});
document.addEventListener('fullscreenchange',()=>{
 $('#fullscreen').textContent=document.fullscreenElement?'⛶ SALIR FULL':'⛶ PANTALLA COMPLETA';
});
$('#reset').addEventListener('click',reset);
$('#travel').addEventListener('click',()=>$('#travelPopup').classList.toggle('open'));
$('#closeTravel').addEventListener('click',()=>$('#travelPopup').classList.remove('open'));
document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click',()=>{
 const reg=REGIONS[Number(b.dataset.region)];
 let target=null;
 if(reg.id===0)target={x:14,z:19};
 else{
  // Find a walkable nearby location rather than placing the character inside an object or lake.
  for(const rad of [45,65,90,115,145,165]){
   for(let i=0;i<24;i++){
    const angle=i*TAU/24, x=reg.x+Math.cos(angle)*rad,z=reg.z+Math.sin(angle)*rad;
    if(!canEnter(x,z))continue;
    const h=groundHeight(x,z);
    const gradient=Math.max(
     Math.abs(groundHeight(x+2,z)-h),
     Math.abs(groundHeight(x,z+2)-h)
    );
    if(gradient<.8){
     if(!target)target={x,z};
     let clearing=true;
     for(const p of cameraTrees){const dx=p.x-x,dz=p.z-z;const rad=3.6*p.s+1.1;
      if(dx*dx+dz*dz<rad*rad){clearing=false;break}
     }
     if(clearing){target={x,z,clear:true};break}
    }
   }
   if(target?.clear)break;
  }
 }
 if(target){
  hero.position.set(target.x,groundHeight(target.x,target.z),target.z);
  state.air=0;state.vy=0;state.dash=0;
  state.lastRegion=reg.id;
  $('#biomeName').textContent=reg.name;
  $('#desc').textContent='Llegaste a '+reg.name+'. Podés recorrer el territorio y cruzar libremente por sus caminos.';
 }else $('#desc').textContent='No encontré un punto seguro en '+reg.name+'.';
 $('#travelPopup').classList.remove('open');
}));


const state={vy:0,air:0,dash:0,water:'tierra',blocked:0,crossings:0,lastRegion:0};
let yaw=.6,pitch=.33,camDistance=10.5,dragCam=null,lastPX=0,lastPY=0;
const keys={KeyW:'w',ArrowUp:'w',KeyS:'s',ArrowDown:'s',KeyA:'a',ArrowLeft:'a',KeyD:'d',ArrowRight:'d'};
const down={w:false,s:false,a:false,d:false,run:false},joy={x:0,y:0};
const runBtn=$('#run');
runBtn.addEventListener('pointerdown',e=>{e.preventDefault();down.run=true;runBtn.classList.add('running');runBtn.setPointerCapture(e.pointerId)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])runBtn.addEventListener(event,()=>{down.run=false;runBtn.classList.remove('running')});
window.addEventListener('keydown',e=>{
 if(keys[e.code]){down[keys[e.code]]=true;e.preventDefault()}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight')down.run=true;
 if(e.code==='Space'){jump();e.preventDefault()}
 if(e.code==='KeyQ')dash();
 if(e.code==='Digit1')setMode(1);
 if(e.code==='Digit2')setMode(2);
});
window.addEventListener('keyup',e=>{if(keys[e.code])down[keys[e.code]]=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')down.run=false});
function jump(){if(state.air<=.01&&state.water!=='profunda'){state.vy=8;state.air=.01}}
function dash(){state.dash=.22}
$('#jump').addEventListener('pointerdown',e=>{e.preventDefault();jump()});$('#dash').addEventListener('pointerdown',e=>{e.preventDefault();dash()});
const joystick=$('#joystick'),knob=$('#knob');let joyId=null;
function joystickChange(e){const b=joystick.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2,limit=b.width*.32;
 const dx=e.clientX-cx,dy=e.clientY-cy,n=Math.max(Math.hypot(dx,dy),limit);
 joy.x=dx/n;joy.y=dy/n;knob.style.transform='translate('+(joy.x*limit)+'px,'+(joy.y*limit)+'px)';}
joystick.addEventListener('pointerdown',e=>{joyId=e.pointerId;joystick.setPointerCapture(joyId);joystickChange(e)});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joystickChange(e)});
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)'}
joystick.addEventListener('pointerup',joyEnd);joystick.addEventListener('pointercancel',joyEnd);
renderer.domElement.addEventListener('pointerdown',e=>{dragCam=e.pointerId;lastPX=e.clientX;lastPY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==dragCam)return;const dx=e.clientX-lastPX,dy=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;
 yaw-=dx*.007;pitch=clamp(pitch+dy*.004,.17,1.15)});
renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId===dragCam)dragCam=null});
renderer.domElement.addEventListener('pointercancel',e=>{if(e.pointerId===dragCam)dragCam=null});
renderer.domElement.addEventListener('wheel',e=>{camDistance=clamp(camDistance+Math.sign(e.deltaY)*1.15,7,29)},{passive:true});
// Deterministic seam check on all four city-to-region passages.
function runSeamTest(){
 let maxJump=0,failed=0,counts=[];
 for(const edge of MAIN_ROADS){
  const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,len=Math.hypot(dx,dz);
  const ux=dx/len,uz=dz/len,mid={x:(edge.a.x+edge.b.x)/2,z:(edge.a.z+edge.b.z)/2};
  let max=0;
  for(let i=0;i<=60;i++){
   const t=(i-30)*.20;
   const ax=mid.x+ux*(t-.06),az=mid.z+uz*(t-.06),bx=mid.x+ux*(t+.06),bz=mid.z+uz*(t+.06);
   max=Math.max(max,Math.abs(groundHeight(ax,az)-groundHeight(bx,bz)));
  }
  maxJump=Math.max(maxJump,max);if(max>.36)failed++;
  counts.push(edge.a.id+'→'+edge.b.id+':'+max.toFixed(3));
 }
 const pass=failed===0;
 $('#seamStatus').textContent=pass?'OK · '+maxJump.toFixed(3):'REVISAR '+failed;
 $('#seamStatus').style.color=pass?'#85e3ae':'#ffae9d';
 $('#desc').textContent='12 enlaces: '+(pass?'continuidad OK':'revisar uniones')+' · máximo '+maxJump.toFixed(3)+' u/0,12 m. Terreno de prueba, no motor PHOENIX.';
 return {pass,maxJump,failed,counts};
}

$('#test').addEventListener('click',runSeamTest);
window.HIGHFLY_TEST={runSeamTest,groundHeight,regionAt,regions:REGIONS,reset,setMode,
 worldMode:WORLD_KIND,sizeRatio:8,seed:SEED,biomeCount:REGIONS.length,waterAt:waterAt,lakes:LAKES,waterSwimReady:false,getFreeAssets:()=>({loaded:realAssetLoaded,failed:realAssetFailed}),
 wfcStats:()=>WFC_MAPS.map(m=>({id:m.reg.id,cells:m.cells.length,repairs:m.repairs,iterations:m.iterations})),
 getPlayerPosition:()=>({x:hero.position.x,y:hero.position.y,z:hero.position.z}),
 getJoystick:()=>({...joy}),getFinish:()=>visualMode,isFullscreen:()=>!!document.fullscreenElement};

const minimap=$('#minimap'),ctx=minimap.getContext('2d'),mapW=minimap.width,mapH=minimap.height;
function mapPoint(x,z){return [mapW/2+x*.12,mapH/2-(z-230)*.10]}
function minimapDraw(){
 ctx.clearRect(0,0,mapW,mapH);ctx.fillStyle='#101c2d';ctx.fillRect(0,0,mapW,mapH);
 for(const r of REGIONS){
   ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/2-i*Math.PI/3,[x,y]=mapPoint(r.x+R*Math.cos(a),r.z+R*Math.sin(a));if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
   ctx.closePath();ctx.fillStyle=r.c;ctx.fill();ctx.strokeStyle='#dfcea6';ctx.lineWidth=1.2;ctx.stroke();
   const [cx,cy]=mapPoint(r.x,r.z);ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillStyle=r.id===2?'#47321c':'#fff';ctx.fillText(['C','B','D','M','N','P','J','V','S','K','L','O','T'][r.id],cx,cy+4);
 }
 const [x,y]=mapPoint(hero.position.x,hero.position.z);ctx.fillStyle='#241230';ctx.beginPath();ctx.arc(x,y,7,0,TAU);ctx.fill();ctx.fillStyle='#ffdc8e';ctx.beginPath();ctx.arc(x,y,4.5,0,TAU);ctx.fill();
}
// Spatial collision buckets: avoids scanning thousands of trees each movement step.
const COLLIDER_GRID=new Map(), COLLISION_CELL=20;
for(const collider of colliders){
 const kx=Math.floor(collider.x/COLLISION_CELL),kz=Math.floor(collider.z/COLLISION_CELL);
 const key=kx+','+kz;
 if(!COLLIDER_GRID.has(key))COLLIDER_GRID.set(key,[]);
 COLLIDER_GRID.get(key).push(collider);
}
function addCollider(x,z,r){
 const obstacle={x,z,r};colliders.push(obstacle);
 const key=Math.floor(x/COLLISION_CELL)+','+Math.floor(z/COLLISION_CELL);
 if(!COLLIDER_GRID.has(key))COLLIDER_GRID.set(key,[]);
 COLLIDER_GRID.get(key).push(obstacle);
}
function canEnter(x,z){
 const reg=regionAt(x,z);if(!reg)return false;
 const h=groundHeight(x,z);
 const water=waterAt(x,z,h);
 if(water.kind==='profunda')return false;
 const cx=Math.floor(x/COLLISION_CELL),cz=Math.floor(z/COLLISION_CELL);
 for(let xx=cx-1;xx<=cx+1;xx++)for(let zz=cz-1;zz<=cz+1;zz++){
  for(const c of COLLIDER_GRID.get(xx+','+zz)||[]){
   const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz<(c.r+.5)**2)return false;
  }
 }
 return true;
}
function climbAllowed(from,to,distance){
 const change=to-from,travel=Math.max(.006,distance);
 if(state.air>.4)return change<=1.4;
 return change<=.1+travel*.6&&change>=-.25-travel*1.08;
}
function movePlayer(dx,dz,dt){
 const h=groundHeight(hero.position.x,hero.position.z),x=hero.position.x+dx,z=hero.position.z+dz;
 if(canEnter(x,z)&&climbAllowed(h,groundHeight(x,z),Math.hypot(dx,dz))){hero.position.x=x;hero.position.z=z;return true}
 if(canEnter(x,hero.position.z)&&climbAllowed(h,groundHeight(x,hero.position.z),Math.abs(dx))){hero.position.x=x;return true}
 if(canEnter(hero.position.x,z)&&climbAllowed(h,groundHeight(hero.position.x,z),Math.abs(dz))){hero.position.z=z;return true}
 state.blocked++;return false;
}
reset();setMode(START_FINISH);
const clock=new THREE.Clock();let frames=0,totalSeconds=0;
function loop(){
 requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);frames++;totalSeconds+=dt;
 if(totalSeconds>.75){$('#fps').textContent=String(Math.round(frames/totalSeconds));frames=0;totalSeconds=0;$('#blocks').textContent=String(state.blocked);}
 const ix=(down.d?1:0)-(down.a?1:0)+joy.x, iz=(down.w?1:0)-(down.s?1:0)-joy.y;
 const mag=Math.hypot(ix,iz);let walking=false, running=false;
 if(mag>.06){
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  const nx=(rx*ix+fx*iz)/Math.max(1,mag),nz=(rz*ix+fz*iz)/Math.max(1,mag);
  const depthNow=waterAt(hero.position.x,hero.position.z,groundHeight(hero.position.x,hero.position.z));
  const waterSpeed=depthNow.kind==='vadeo'?.42:depthNow.kind==='orilla'?.78:1;
  const speed=(down.run||Math.hypot(joy.x,joy.y)>.95?11.2:7.2)*(state.dash>0?2.25:1)*waterSpeed;
  walking=movePlayer(nx*speed*dt,nz*speed*dt,dt);running=down.run||Math.hypot(joy.x,joy.y)>.95||state.dash>0;
  if(walking)hero.rotation.y=Math.atan2(nx,nz);
 }
 if(state.dash>0)state.dash=Math.max(0,state.dash-dt);
 if(state.air>0||state.vy>0){state.vy-=21*dt;state.air=Math.max(0,state.air+state.vy*dt);if(state.air===0)state.vy=0;}
 const gh=groundHeight(hero.position.x,hero.position.z);
 const waterNow=waterAt(hero.position.x,hero.position.z,gh);
 state.water=waterNow.kind;
 const label={tierra:'TIERRA FIRME',orilla:'AGUA POCO PROFUNDA',vadeo:'VADEO · MOVIMIENTO LENTO',profunda:'AGUA PROFUNDA · NATACIÓN PENDIENTE'};
 $('#waterState').textContent=' · '+label[waterNow.kind]+(waterNow.depth?(' ('+waterNow.depth.toFixed(1)+'m)'):'');
 hero.position.y=gh+state.air;
 const current=regionAt(hero.position.x,hero.position.z);
 if(current&&current.id!==state.lastRegion){state.crossings++;state.lastRegion=current.id;$('#crossings').textContent=String(state.crossings)}
 if(current)$('#biomeName').textContent=current.name;
 if(mixer){const acts=hero.userData.actions;
  if(acts){const key=state.air>.1?'Jump_Start':running&&walking?'Running_A':walking?'Walking_A':'Idle';
   if(key!==hero.userData.last&&acts[key]){const prev=acts[hero.userData.last];prev?.fadeOut(.16);acts[key].reset().fadeIn(.16).play();hero.userData.last=key;}}
  mixer.update(dt);}
 const focus=new THREE.Vector3(hero.position.x,hero.position.y+1.7,hero.position.z);
 const desired=new THREE.Vector3(focus.x+Math.sin(yaw)*Math.cos(pitch)*camDistance,focus.y+Math.sin(pitch)*camDistance+1.45,focus.z+Math.cos(yaw)*Math.cos(pitch)*camDistance);
 desired.y=Math.max(desired.y,groundHeight(desired.x,desired.z)+2.5);
 // Keep an ordinary third-person camera. Fade only canopies obstructing the hero,
 // leaving trunks, collision geometry and the rest of the forest intact.
 camera.position.lerp(desired,Math.min(1,dt*9));camera.lookAt(focus);
 updateNearFoliage();
 const elapsed=performance.now()*.001;
 water.material.opacity=.85+.018*Math.sin(elapsed*1.4);foamMat.opacity=.26+.065*Math.sin(elapsed*.9);
 minimapDraw();renderer.render(scene,camera);
}
runSeamTest();$('#desc').textContent=descriptions[START_FINISH]+' · Semilla '+SEED;$('#loadingtxt').textContent='Terreno creado. Cargando exploración...';
requestAnimationFrame(loop);
setTimeout(()=>{const el=$('#loading');el.style.opacity='0';setTimeout(()=>el.remove(),600)},600);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25))});
