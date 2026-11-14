import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// HIGHFLY WorldForge Five Realms P1 — MIT original test logic, public CC0 player only.
// A single shared triangulated surface and a single height sampler support all three visual modes.
const $=s=>document.querySelector(s), TAU=Math.PI*2, SQ3=Math.sqrt(3), R=140, SCALE=4, DIST=SQ3*R;
const WORLD_KIND=new URLSearchParams(location.search).get('world')==='manual'?'manual':'wfc';
const START_FINISH=new URLSearchParams(location.search).get('finish')==='normal'?1:2;
const REGIONS=[
  {id:0,name:'Arvelia · Ciudad',short:'CIUDAD',x:0,z:0,c:'#76ad6a'},
  {id:1,name:'Elyndra · Bosque',short:'BOSQUE',x:-SQ3*R/2,z:1.5*R,c:'#316b49'},
  {id:2,name:'Ignaris · Oasis',short:'DESIERTO',x:SQ3*R/2,z:1.5*R,c:'#e6bc74'},
  {id:3,name:'Drakhar · Montañas',short:'MONTAÑA',x:-SQ3*R/2,z:-1.5*R,c:'#79858a'},
  {id:4,name:'Nivalis · Isla nevada',short:'NIEVE',x:SQ3*R/2,z:-1.5*R,c:'#dae7e9'}
];
const scene=new THREE.Scene();scene.background=new THREE.Color(0x83b8d0);scene.fog=new THREE.Fog(0x83b8d0,170,640);
const camera=new THREE.PerspectiveCamera(59,innerWidth/innerHeight,.15,1200);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
$('#app').append(renderer.domElement);
const ambient=new THREE.HemisphereLight(0xd5efff,0x4a5140,2.1);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffe3a9,2.2);sun.position.set(-90,130,80);scene.add(sun);
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smooth(a,b,x){let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
function lerp(a,b,t){return a+(b-a)*t}
function hash(n){const s=Math.sin(n*128.43+14.73)*43758.5453;return s-Math.floor(s)}
function bump(x,z,cx,cz,sx,sz){return Math.exp(-(((x-cx)/sx)**2+((z-cz)/sz)**2))}
function inside(x,z,r=R){return Math.abs(x)<=SQ3*r*.5+.001 && Math.abs(z)+Math.abs(x)/SQ3<=r+.001}
function edgeDistance(x,z){return Math.min(SQ3*R*.5-Math.abs(x),(R-Math.abs(z)-Math.abs(x)/SQ3)*SQ3*.5)}
function regionAt(x,z){
  for(const r of REGIONS)if(inside(x-r.x,z-r.z))return r;
  return null;
}
function corridor(x,z){
  const ux=.5,uz=-SQ3/2, vx=SQ3/2,vz=.5,t=x*ux+z*uz,p=Math.abs(x*vx+z*vz);
  return {t,p,weight:(1-smooth(8,13,p))*smooth(68,94,t)*(1-smooth(DIST-84,DIST-66,t))};
}
const defaultColor=new THREE.Color('#789b69'),cGrass=new THREE.Color('#7eb76f'),
cForest=new THREE.Color('#336d4d'),cSand=new THREE.Color('#e5be7c'),cRock=new THREE.Color('#7c868c'),
cSnow=new THREE.Color('#e7eef1'),cBeach=new THREE.Color('#d6c395'),cWater=new THREE.Color('#5b9ab4'),cDirt=new THREE.Color('#aaa084');
function groundHeight(x,z){
 const reg=regionAt(x,z);
 const base=.42+.22*Math.sin(x*.035)*Math.cos(z*.031)+.12*Math.sin(x*.053+z*.025);
 if(!reg)return -3.1;
 const dx=(x-reg.x)/SCALE,dz=(z-reg.z)/SCALE;
 const edge=Math.max(0,edgeDistance(x-reg.x,z-reg.z));
 const blend=smooth(0,25,edge),rnd=WORLD_KIND==='wfc'?.28*Math.sin(dx*.23+reg.id)*Math.cos(dz*.19-reg.id):0;
 let v=base;
 if(reg.id===0)v=base+blend*(.48+.7*Math.sin(dx*.075)*Math.cos(dz*.082)+rnd*.3);
 if(reg.id===1)v=base+blend*(1.7+1.3*Math.sin(dx*.11+1.2)*Math.cos(dz*.13)+1.2*Math.sin(dx*.066+dz*.043)+4*bump(dx,dz,-13,16,17,14)+rnd);
 if(reg.id===2){
  v=base+blend*(.2+2.3*Math.sin(dx*.15+dz*.05)**2+.68*Math.sin(dz*.15)+rnd);
  v=lerp(v,.13,Math.min(.96,bump(dx,dz,6,7,8,9)));
 }
 if(reg.id===3){
  let peaks=35*bump(dx,dz,-12,-14,8,10)+46*bump(dx,dz,13,-10,9,10)+31*bump(dx,dz,-3,20,8,10)+15*bump(dx,dz,20,22,9,8);
  const route=Math.abs(dx*.5+dz*(-SQ3/2));
  peaks*=1-.87*(1-smooth(2,5.5,route));
  v=base+blend*(1.3+peaks+rnd);
 }
 if(reg.id===4){
  const d=Math.hypot(dx,dz),land=1-smooth(18,29,d);
  const mountains=24*bump(dx,dz,15,-6,10,10)+30*bump(dx,dz,-7,-13,8,10)+15*bump(dx,dz,9,12,12,10);
  v=-3.1+land*(4.25+mountains+rnd);
 }
 const bridge=corridor(x,z);
 if(bridge.weight>.0001)v=lerp(v,1.28,bridge.weight);
 return v;
}
function colorAt(x,z,y,premium=false){
 const reg=regionAt(x,z),noise=Math.sin(x*.11)*Math.cos(z*.098)*.12+Math.sin((x+z)*.27)*.035;
 if(!reg)return cWater.clone();
 const dx=(x-reg.x)/SCALE,dz=(z-reg.z)/SCALE,d=Math.hypot(dx,dz),weight=smooth(0,25,Math.max(0,edgeDistance(x-reg.x,z-reg.z)));
 let c=cGrass.clone().lerp(new THREE.Color('#648d5d'),smooth(-.16,.20,noise));
 if(reg.id===1)c.lerp(cForest,.68*weight);
 if(reg.id===2)c.lerp(cSand,.99*weight);
 if(reg.id===3){c.lerp(cRock,weight*(.38+.55*smooth(3,10,y)));c.lerp(cGrass,.2*(1-smooth(7,13,y)))}
 if(reg.id===4){c=cBeach.clone();c.lerp(cSnow,1-smooth(14,27,d));c.lerp(cRock,.48*smooth(12,21,y));if(y< -1.5)c.lerp(cWater,.48)}
 if(reg.id===0)c.lerp(new THREE.Color('#a0bd76'),.14*weight);
 if(premium){c.multiplyScalar(.94+.13*(noise+.5));if(reg.id===2)c.lerp(new THREE.Color('#ffd98e'),.11);if(reg.id===1)c.lerp(new THREE.Color('#1f624b'),.1)}
 return c;
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
 const n=76;
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
const water=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshPhysicalMaterial({color:0x388bb2,roughness:.25,metalness:.1,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide}));
water.rotation.x=-Math.PI/2;water.position.y=-1.73;scene.add(water);
const foamMat=new THREE.MeshBasicMaterial({color:0xa7ebed,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
const seaFoam=new THREE.Mesh(new THREE.RingGeometry(22,23.5,90),foamMat);seaFoam.rotation.x=-Math.PI/2;seaFoam.position.set(REGIONS[4].x,-1.68,REGIONS[4].z);seaFoam.scale.set(4,4,1);scene.add(seaFoam);
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
 [1,1.3,.3,3,.5,.55,1.3,9,.8]
];
const WFC_RAD=8,WFC_STEP=R/(1.5*(WFC_RAD+1)),WFC_MAPS=[];
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

// Instanced flora; independent from collision geometry, keeps mobile draw calls low.
function createVegetation(){
 const pineTrunkGeo=new THREE.CylinderGeometry(.13,.25,1.9,5),
       pineFoliageGeo=new THREE.ConeGeometry(1.45,4.5,7),
       bushGeo=new THREE.IcosahedronGeometry(.87,0),
       rockGeo=new THREE.DodecahedronGeometry(1.6,0);
 const specs={green:[],dark:[],snow:[],palm:[],rocks:[],bushes:[]};
 let serial=0;
 for(const r of REGIONS){
  const total=[360,2200,450,750,840][r.id];
  for(let i=0;i<total;i++){
    let dx=(hash(i*41+r.id*303+2)-.5)*R*1.76,
        dz=(hash(i*53+r.id*133+6)-.5)*R*1.80;
    if(!inside(dx,dz,R-11))continue;
    const x=r.x+dx,z=r.z+dz;
    if(Math.hypot(dx,dz)<(r.id===0?50:r.id===2?24:16))continue;
    const h=groundHeight(x,z);
    if(r.id===4&&(h<-.7||h>29))continue;
    if(r.id===3&&h>34)continue;
    if(r.id===2&&(Math.hypot(dx-24,dz-28)<28||Math.hypot(dx-24,dz-28)>76&&hash(i*41)>.21))continue;
    if(r.id!==0){const ux=r.x/DIST,uz=r.z/DIST;if(Math.abs(dx*uz-dz*ux)<9&&Math.hypot(dx,dz)>16)continue}
    const tile=wfcAt(x,z);
    if(WORLD_KIND==='wfc'&&(tile==='TRACK'||tile==='HAMLET'||tile==='WATER'||tile==='MEADOW'&&hash(i*7+r.id)<.66||tile==='ROCK'&&hash(i*17)<.6))continue;
    const size=(.8+hash(i*11+r.id*223)*.75)*(WORLD_KIND==='wfc'&&tile==='THICKET'?1.15:1);
    const pick=r.id===4?'snow':(r.id===1||r.id===0?'dark':r.id===2?'palm':'green');
    specs[pick].push({x,z,y:h,s:size,k:i+r.id*600});
    if(serial++%5===0)specs.bushes.push({x:x+2,z:z+1,y:groundHeight(x+2,z+1),s:.45+hash(i*3)*.7,k:i});
  }
  for(let i=0;i<145;i++){
   const dx=(hash(i*97+r.id*154+2)-.5)*R*1.62,dz=(hash(i*103+r.id*24+9)-.5)*R*1.62;
   if(!inside(dx,dz,R-12)||Math.hypot(dx,dz)<21)continue;
   const x=r.x+dx,z=r.z+dz,y=groundHeight(x,z);
   if(y< -1)continue; if(WORLD_KIND==='wfc'&&wfcAt(x,z)==='WATER')continue; specs.rocks.push({x,z,y,s:.45+hash(i*10+r.id)*1.25,k:i});
  }
 }
 const dummy=new THREE.Object3D();
 function inst(geometry,mat,arr,place,colorfn,parent=allDecor){
   if(!arr.length)return;
   const m=new THREE.InstancedMesh(geometry,mat,arr.length);
   arr.forEach((p,i)=>{place(p,dummy);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(colorfn)m.setColorAt(i,new THREE.Color(colorfn(p,i)))});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;parent.add(m);
 }
 const bark=new THREE.MeshStandardMaterial({color:'#86664a',roughness:1}),greenMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),palmMat=new THREE.MeshStandardMaterial({color:'#dbb56a',roughness:1});
 for(const type of ['green','dark','snow']){
  const arr=specs[type];
  inst(pineTrunkGeo,bark,arr,(p,d)=>{d.position.set(p.x,p.y+.95*p.s,p.z);d.rotation.set(0,0,0);d.scale.setScalar(p.s)});
  inst(pineFoliageGeo,greenMat,arr,(p,d)=>{d.position.set(p.x,p.y+3.4*p.s,p.z);d.rotation.set(0,p.k*.8,0);d.scale.setScalar(p.s)},p=>type==='snow'?((hash(p.k)>.5)?'#c6d4cb':'#7cafa2'):type==='dark'?(hash(p.k)>.5?'#2d6949':'#3d7c52'):(hash(p.k)>.5?'#518766':'#41795e'));
  inst(new THREE.ConeGeometry(.95,3.1,7),greenMat,arr,(p,d)=>{d.position.set(p.x,p.y+5.1*p.s,p.z);d.scale.setScalar(p.s)},p=>type==='snow'?'#e5e9e7':type==='dark'?'#52926a':'#6e9f7c');
 }
 inst(new THREE.CylinderGeometry(.2,.29,4.5,6),palmMat,specs.palm,(p,d)=>{d.position.set(p.x,p.y+2.2*p.s,p.z);d.scale.setScalar(p.s)});
 inst(new THREE.IcosahedronGeometry(2.7,0),greenMat,specs.palm,(p,d)=>{d.position.set(p.x,p.y+5.3*p.s,p.z);d.scale.set(1.1*p.s,.34*p.s,1.1*p.s)},p=>'#4d9872');
 inst(rockGeo,greenMat,specs.rocks,(p,d)=>{d.position.set(p.x,p.y+.65*p.s,p.z);d.rotation.set(.1,p.k*.87,.15);d.scale.set(p.s,.72*p.s,p.s)},p=>p.y>8?'#a8b4bc':'#96979a');
 inst(bushGeo,greenMat,specs.bushes,(p,d)=>{d.position.set(p.x,p.y+.45*p.s,p.z);d.scale.setScalar(p.s)},p=>hash(p.k)>.5?'#60975d':'#6c9f5f',premiumOnly);
}
createVegetation();
// Tall stone formations, water oasis and shoreline.
for(let i=0;i<38;i++){
 let dx=(hash(i*18+6)-.5)*R*1.5,dz=(hash(i*31+7)-.5)*R*1.5;
 if(!inside(dx,dz,R-5)||Math.hypot(dx,dz)<7)continue;
 let x=mountain.x+dx,z=mountain.z+dz,y=groundHeight(x,z);
 const ph=8+hash(i*15)*18;cone(2.2+hash(i*9)*3.1,ph,5,materials.darkStone,x,y+ph/2,z);solid(x,z,2.2+hash(i*9)*3.1);
}
const oasisX=desert.x+24,oasisZ=desert.z+28;
const oasis=mesh(new THREE.CircleGeometry(28.5,56),materials.water,oasisX,.22,oasisZ);oasis.rotation.x=-Math.PI/2;
const oasisRim=mesh(new THREE.RingGeometry(28.3,31.5,56),new THREE.MeshStandardMaterial({color:'#b9ad7e',side:THREE.DoubleSide}),oasisX,.17,oasisZ);oasisRim.rotation.x=-Math.PI/2;
for(let i=0;i<20;i++){
 const a=i*TAU/20,dist=34+hash(i*12)*7,x=oasisX+Math.cos(a)*dist,z=oasisZ+Math.sin(a)*dist,y=groundHeight(x,z);
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
for(const r of REGIONS.slice(1)){
 const len=Math.hypot(r.x,r.z),ux=r.x/len,uz=r.z/len,pts=[];
 for(let i=0;i<=100;i++){const t=8+(len-7)*i/100;pts.push([ux*t+Math.sin(i*.12)*.35,uz*t+Math.cos(i*.17)*.3])}
 if(r.id===4){pathMesh(pts,6.2,bridgeMat,.14)}
 else pathMesh(pts,5.1,roadMaterial,.08);
}
function buildBridge(){
 const ux=.5,uz=-SQ3/2,vx=SQ3/2,vz=.5;
 for(let t=70;t<=DIST-70;t+=1.22){
   const x=ux*t,z=uz*t,y=groundHeight(x,z);
   const m=cube(7.8,.25,1.16,materials.wood,x,y+.18,z);m.rotation.y=Math.atan2(ux,uz);
   if(Math.floor(t*2)%7<2){for(const side of [-1,1]){
    const px=x+vx*side*3.7,pz=z+vz*side*3.7,py=groundHeight(px,pz);
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
   if(cell.label!=='HAMLET'||added>=6||Math.hypot(cell.x-map.reg.x,cell.z-map.reg.z)<30)continue;
   if(!inside(cell.x-map.reg.x,cell.z-map.reg.z,R-14)||groundHeight(cell.x,cell.z)<-.5)continue;
   if(Math.hypot(cell.x,cell.z)<28)continue;
   createHouse(cell.x,cell.z,map.reg.id===1?materials.roofGreen:map.reg.id===2?materials.roofGold:map.reg.id===4?materials.roofBlue:materials.roof,.72+hash(placed*13)*.25);
   const track=[];for(let i=0;i<16;i++){const u=i/15;track.push([lerp(cell.x,map.reg.x,u),lerp(cell.z,map.reg.z,u)])}
   pathMesh(track,1.6,roadMaterial,.08);added++;placed++;
  }
 }
}

// Hexagonal piece overlay: only changes appearance. No seams in character collision.
const tileLayer=new THREE.Group();scene.add(tileLayer);
const rad=1.5,hexGeo=new THREE.CylinderGeometry(rad,rad,.21,6),
hexMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,flatShading:true});
const positions=[];
for(let row=-50;row<=50;row++)for(let col=-47;col<=47;col++){
 const x=SQ3*rad*(col+row/2),z=1.5*rad*row;
 const r=regionAt(x,z);if(!r)continue;
 const y=groundHeight(x,z);
 if(r.id===4&&y< -1.3)continue;
 positions.push({x,z,y,k:row*101+col});
}
const tiles=new THREE.InstancedMesh(hexGeo,hexMat,positions.length),dummy=new THREE.Object3D();
positions.forEach((p,i)=>{dummy.position.set(p.x,p.y-.04,p.z);dummy.rotation.set(0,Math.PI/6,0);dummy.scale.set(1,1,1);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);
 const c=colorAt(p.x,p.z,p.y);c.lerp(new THREE.Color('#ffffff'),.035*Math.sin(p.k));tiles.setColorAt(i,c)});
tiles.instanceMatrix.needsUpdate=true;if(tiles.instanceColor)tiles.instanceColor.needsUpdate=true;tileLayer.add(tiles);
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
  model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;}if(o.name&&/(axe|shield|mug|cape)/i.test(o.name))o.visible=false});
  visual.clear();visual.add(model);
  if(g.animations?.length){
   mixer=new THREE.AnimationMixer(model);
   const actions={};for(const n of ['Idle','Walking_A','Running_A','Jump_Start']){const clip=g.animations.find(a=>a.name===n);if(clip)actions[n]=mixer.clipAction(clip)}
   const idle=actions.Idle??Object.values(actions)[0];idle?.play();
   hero.userData.actions=actions;hero.userData.last='Idle';
  }
 },undefined,e=>console.warn('CC0 player fallback:',e?.message));
}catch(err){console.warn(err)}
function reset(){hero.position.set(9,groundHeight(9,11),11);state.vy=0;state.air=0;state.dash=0;state.crossings=0;state.blocked=0;state.lastRegion=0;$('#crossings').textContent='0';$('#blocks').textContent='0'}
let visualMode=0;
const descriptions=[
 '1 · Hexágonos visibles: piezas individuales superpuestas; física continua independiente de sus juntas.',
 '2 · Capa continua: una sola malla comparte vértices, normales y alturas en las cinco regiones.',
 '3 · Premium: mismo terreno físico continuo, materiales refinados y más detalles de vegetación.'
];
function setMode(m){
 visualMode=m;tileLayer.visible=m===0;contourGroups[0].visible=m===0;contourGroups[1].visible=m!==0;
 premiumOnly.visible=m===2;groundMesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(m===2?colsPremium:cols,3));
 groundMesh.material.roughness=m===2?.87:.96;sun.intensity=m===2?2.6:2.2;renderer.toneMappingExposure=m===2?1.42:1.28;
 $('#modeLabel').textContent=['HEX','CONTINUO','PREMIUM'][m];$('#desc').textContent=descriptions[m];
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',Number(b.dataset.mode)===m));
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(Number(b.dataset.mode))));
$('#reset').addEventListener('click',reset);
const state={vy:0,air:0,dash:0,blocked:0,crossings:0,lastRegion:0};
let yaw=.6,pitch=.47,camDistance=15,dragCam=null,lastPX=0,lastPY=0;
const keys={KeyW:'w',ArrowUp:'w',KeyS:'s',ArrowDown:'s',KeyA:'a',ArrowLeft:'a',KeyD:'d',ArrowRight:'d'};
const down={w:false,s:false,a:false,d:false,run:false},joy={x:0,y:0};
window.addEventListener('keydown',e=>{
 if(keys[e.code]){down[keys[e.code]]=true;e.preventDefault()}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight')down.run=true;
 if(e.code==='Space'){jump();e.preventDefault()}
 if(e.code==='KeyQ')dash();
 if(e.code==='Digit1')setMode(0);
 if(e.code==='Digit2')setMode(1);
 if(e.code==='Digit3')setMode(2);
});
window.addEventListener('keyup',e=>{if(keys[e.code])down[keys[e.code]]=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')down.run=false});
function jump(){if(state.air<=.01){state.vy=8;state.air=.01}}
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
 for(const reg of REGIONS.slice(1)){
  const ux=reg.x/DIST,uz=reg.z/DIST,mid=DIST/2;
  let max=0;
  for(let i=0;i<=60;i++){
   const dt=(i-30)*.03;
   const xa=ux*(mid+dt-.015),za=uz*(mid+dt-.015),xb=ux*(mid+dt+.015),zb=uz*(mid+dt+.015);
   const diff=Math.abs(groundHeight(xa,za)-groundHeight(xb,zb));max=Math.max(diff,max);
  }
  maxJump=Math.max(maxJump,max);if(max>.25)failed++;counts.push(reg.short+': '+max.toFixed(3));
 }
 const pass=failed===0;$('#seamStatus').textContent=pass?'OK · '+maxJump.toFixed(3):'FALLO '+failed;
 $('#seamStatus').style.color=pass?'#85e3ae':'#ffae9d';
 $('#desc').textContent='TEST PASOS CENTRALES · '+counts.join(' | ')+' unidades/0,03 m. (No sustituye colisiones definitivas).';
 return {pass,maxJump,counts};
}
$('#test').addEventListener('click',runSeamTest);
window.HIGHFLY_TEST={runSeamTest,groundHeight,regionAt,regions:REGIONS,reset,setMode,getPlayerPosition:()=>({x:hero.position.x,y:hero.position.y,z:hero.position.z}),getJoystick:()=>({...joy})}; // manual QA from devtools
const minimap=$('#minimap'),ctx=minimap.getContext('2d'),mapW=minimap.width,mapH=minimap.height;
function mapPoint(x,z){return [mapW/2+x*1.75,mapH/2-z*1.48]}
function minimapDraw(){
 ctx.clearRect(0,0,mapW,mapH);ctx.fillStyle='#101c2d';ctx.fillRect(0,0,mapW,mapH);
 for(const r of REGIONS){
   ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/2-i*Math.PI/3,[x,y]=mapPoint(r.x+R*Math.cos(a),r.z+R*Math.sin(a));if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
   ctx.closePath();ctx.fillStyle=r.c;ctx.fill();ctx.strokeStyle='#dfcea6';ctx.lineWidth=1.2;ctx.stroke();
   const [cx,cy]=mapPoint(r.x,r.z);ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillStyle=r.id===2?'#47321c':'#fff';ctx.fillText(['C','B','D','M','N'][r.id],cx,cy+4);
 }
 const [x,y]=mapPoint(hero.position.x,hero.position.z);ctx.fillStyle='#241230';ctx.beginPath();ctx.arc(x,y,7,0,TAU);ctx.fill();ctx.fillStyle='#ffdc8e';ctx.beginPath();ctx.arc(x,y,4.5,0,TAU);ctx.fill();
}
function canEnter(x,z){
 const reg=regionAt(x,z);if(!reg)return false;
 const h=groundHeight(x,z);
 if(reg.id===4 && h < -1.68)return false;
 for(const c of colliders){const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz<(c.r+.5)**2)return false}
 return true;
}
function movePlayer(dx,dz,dt){
 const h=groundHeight(hero.position.x,hero.position.z),x=hero.position.x+dx,z=hero.position.z+dz;
 if(canEnter(x,z)&&(groundHeight(x,z)-h<.88||state.air>.35)){hero.position.x=x;hero.position.z=z;return true}
 if(canEnter(x,hero.position.z)&&(groundHeight(x,hero.position.z)-h<.88||state.air>.35)){hero.position.x=x;return true}
 if(canEnter(hero.position.x,z)&&(groundHeight(hero.position.x,z)-h<.88||state.air>.35)){hero.position.z=z;return true}
 state.blocked++;return false;
}
reset();setMode(0);
const clock=new THREE.Clock();let frames=0,totalSeconds=0;
function loop(){
 requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);frames++;totalSeconds+=dt;
 if(totalSeconds>.75){$('#fps').textContent=String(Math.round(frames/totalSeconds));frames=0;totalSeconds=0;$('#blocks').textContent=String(state.blocked);}
 const ix=(down.d?1:0)-(down.a?1:0)+joy.x, iz=(down.w?1:0)-(down.s?1:0)-joy.y;
 const mag=Math.hypot(ix,iz);let walking=false, running=false;
 if(mag>.06){
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  const nx=(rx*ix+fx*iz)/Math.max(1,mag),nz=(rz*ix+fz*iz)/Math.max(1,mag);
  const speed=(down.run?11.2:7.2)*(state.dash>0?2.25:1);
  walking=movePlayer(nx*speed*dt,nz*speed*dt,dt);running=down.run||state.dash>0;
  if(walking)hero.rotation.y=Math.atan2(nx,nz);
 }
 if(state.dash>0)state.dash=Math.max(0,state.dash-dt);
 if(state.air>0||state.vy>0){state.vy-=21*dt;state.air=Math.max(0,state.air+state.vy*dt);if(state.air===0)state.vy=0;}
 const gh=groundHeight(hero.position.x,hero.position.z);hero.position.y=gh+state.air;
 const current=regionAt(hero.position.x,hero.position.z);
 if(current&&current.id!==state.lastRegion){state.crossings++;state.lastRegion=current.id;$('#crossings').textContent=String(state.crossings)}
 if(current)$('#biomeName').textContent=current.name;
 if(mixer){const acts=hero.userData.actions;
  if(acts){const key=state.air>.1?'Jump_Start':running&&walking?'Running_A':walking?'Walking_A':'Idle';
   if(key!==hero.userData.last&&acts[key]){const prev=acts[hero.userData.last];prev?.fadeOut(.16);acts[key].reset().fadeIn(.16).play();hero.userData.last=key;}}
  mixer.update(dt);}
 const focus=new THREE.Vector3(hero.position.x,hero.position.y+1.7,hero.position.z);
 const desired=new THREE.Vector3(focus.x+Math.sin(yaw)*Math.cos(pitch)*camDistance,focus.y+Math.sin(pitch)*camDistance+2.4,focus.z+Math.cos(yaw)*Math.cos(pitch)*camDistance);
 desired.y=Math.max(desired.y,groundHeight(desired.x,desired.z)+2.5);
 camera.position.lerp(desired,Math.min(1,dt*9));camera.lookAt(focus);
 const elapsed=performance.now()*.001;
 water.material.opacity=.85+.018*Math.sin(elapsed*1.4);foamMat.opacity=.26+.065*Math.sin(elapsed*.9);
 minimapDraw();renderer.render(scene,camera);
}
runSeamTest();$('#desc').textContent=descriptions[0];$('#loadingtxt').textContent='Terreno creado. Cargando exploración...';
requestAnimationFrame(loop);
setTimeout(()=>{const el=$('#loading');el.style.opacity='0';setTimeout(()=>el.remove(),600)},600);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.35))});
