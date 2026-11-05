import * as THREE from 'three';
import {hasLineOfSight,insideBlockingObject} from '../combat/targeting-p6.js';
// HIGHFLY P19 terrain-adapted telegraphs for the real P16 player. Original code.
// World-specific radii, not copied MLBB data/media.
const p=(kind,range,width,radius,halfAngle=0)=>Object.freeze({kind,range,width,radius,halfAngle});
export const AIM_PROFILES=Object.freeze([
 [p('line',17,1.7,0),p('zone',7.4,.18,2.45),p('self',0,0,4)],
 [p('cone',6.7,0,0,47),p('dash',6.2,2.9,0),p('line',10,3.4,0)],
 [p('cone',7,0,0,57),p('dash',5.9,3.3,0),p('self',0,0,4.8)],
 [p('line',22,1.5,0),p('zone',20,.18,4.15),p('self',0,0,5)],
 [p('cone',3.35,0,0,34),p('cone',3.25,0,0,40),p('dash',8,2.65,0)]
]);
const COLORS=[0xc591ff,0xff6987,0xffd78e,0xff9b50,0x74e8ff];
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const mat=(color,opacity)=>new THREE.MeshBasicMaterial({color,
 transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,
 depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,
 polygonOffsetUnits:-2,blending:THREE.AdditiveBlending});
export class TianjieAimGuide {
 constructor(game){
  this.game=game;this.root=new THREE.Group();this.path=new THREE.Group();
  game.scene.add(this.root,this.path);
  this.profile=null;this.valid=true;this.mainColor=COLORS[0];
  this.root.visible=false;this.path.visible=false;
  this.pathEnabled=false;
  this._lastCenter=vec(1e6,0,0);this._lastYaw=1e6;
  this._lastRefresh=-1;this.lastArcPoint=null;this.lastArcOrigin=null;
  // Floating 3D reticle for aerial targets; ground corridor remains a projection.
  this.aerialBeam=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1,7),
    new THREE.MeshBasicMaterial({color:0xc591ff,transparent:true,opacity:.88,
      depthWrite:false,blending:THREE.AdditiveBlending}));
  this.aerialBeam.visible=false;game.scene.add(this.aerialBeam);
  this.aerialTip=new THREE.Mesh(new THREE.SphereGeometry(.18,9,7),
    new THREE.MeshBasicMaterial({color:0xf8f5ff,transparent:true,opacity:.75,
      depthWrite:false,blending:THREE.AdditiveBlending}));
  this.aerialTip.visible=false;game.scene.add(this.aerialTip);
 }
 surface(triangles,color,opacity=.3,parent=this.root){
  // X,Z triangulation stays unchanged. Y samples its OWN mountain height.
  const values=new Float32Array(triangles.length*3);
  for(let i=0;i<triangles.length;i++){
   values[i*3]=triangles[i][0];values[i*3+2]=triangles[i][1];
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(values,3));
  const o=new THREE.Mesh(g,mat(color,opacity));o.renderOrder=11;
  o.frustumCulled=false;o.userData.flat=Float32Array.from(values);
  parent.add(o);return o;
 }
 band(points,width,color,opacity=.96){
  const triangles=[];
  for(let i=0;i<points.length-1;i++){
   const [x,z]=points[i],[px,pz]=points[i+1];
   const dx=px-x,dz=pz-z,len=Math.max(1e-5,Math.hypot(dx,dz));
   const ux=-dz/len*width*.5,uz=dx/len*width*.5;
   const A=[x+ux,z+uz],B=[x-ux,z-uz],
    C=[px-ux,pz-uz],D=[px+ux,pz+uz];
   triangles.push(A,B,C,A,C,D);
  }
  return this.surface(triangles,color,opacity);
 }
 ring(radius,color,opacity=.97){
  const pts=[],segments=40;
  for(let i=0;i<=segments;i++){
   const a=2*Math.PI*i/segments;pts.push([Math.sin(a)*radius,Math.cos(a)*radius]);
  }
  return this.band(pts,.18,color,opacity);
 }
 disk(radius,color,opacity=.20){
  const n=40,shells=6,triangles=[];
  for(let r=0;r<shells;r++)for(let i=0;i<n;i++){
   const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;
   const low=radius*r/shells,high=radius*(r+1)/shells;
   const A=[Math.sin(a)*low,Math.cos(a)*low],
    B=[Math.sin(b)*low,Math.cos(b)*low],
    C=[Math.sin(b)*high,Math.cos(b)*high],
    D=[Math.sin(a)*high,Math.cos(a)*high];
   triangles.push(A,B,C,A,C,D);
  }
  this.surface(triangles,color,opacity);
 }
 cone(len,angle,color){
  const sectors=30,rings=6,triangles=[];
  const a0=-angle*Math.PI/180,a1=angle*Math.PI/180;
  for(let r=0;r<rings;r++)for(let i=0;i<sectors;i++){
   const a=a0+(a1-a0)*i/sectors,b=a0+(a1-a0)*(i+1)/sectors;
   const r0=len*r/rings,r1=len*(r+1)/rings;
   const A=[Math.sin(a)*r0,-Math.cos(a)*r0],B=[Math.sin(b)*r0,-Math.cos(b)*r0];
   const C=[Math.sin(b)*r1,-Math.cos(b)*r1],D=[Math.sin(a)*r1,-Math.cos(a)*r1];
   triangles.push(A,B,C,A,C,D);
  }
  this.surface(triangles,color,.22);
  for(const a of [a0,a1]){
   const edge=[];
   const slices=Math.ceil(len/.42);
   for(let i=0;i<=slices;i++){
    const r=len*i/slices;edge.push([Math.sin(a)*r,-Math.cos(a)*r]);
   }
   this.band(edge,.17,color,.98);
  }
  const arc=[];
  for(let i=0;i<=40;i++){
   const a=a0+(a1-a0)*i/40;arc.push([Math.sin(a)*len,-Math.cos(a)*len]);
  }
  this.band(arc,.19,color,.98);
 }
 corridor(len,width,color,dash=false){
  const n=Math.max(8,Math.ceil(len/.4)),tris=[],left=[],right=[];
  for(let i=0;i<n;i++){
   const a=-len*i/n,b=-len*(i+1)/n,w=width*.5;
   tris.push([-w,a],[w,a],[w,b],[-w,a],[w,b],[-w,b]);
  }
  this.surface(tris,color,dash?.30:.22);
  for(let i=0;i<=n;i++){
   const z=-len*i/n;left.push([-width*.5,z]);right.push([width*.5,z]);
  }
  this.band(left,.18,color);this.band(right,.18,color);
  this.band([[-width*.5,-len],[width*.5,-len]],.21,0xf8ffff);
  for(let d=1.8;d<len-.4;d+=2){
   const w=Math.min(.54,width*.34);
   this.band([[-w,-d+.3],[0,-d-.24],[w,-d+.3]],.13,0xf6faff,.78);
  }
 }
 clearGroup(group){
  while(group.children.length){
   const o=group.children[0];group.remove(o);
   o.traverse(node=>{
    node.geometry?.dispose();
    if(node.material)
     for(const m of (Array.isArray(node.material)?node.material:[node.material]))m.dispose();
   });
  }
 }
 clear(){
  this.profile=null;this.valid=true;this.pathEnabled=false;
  this.clearGroup(this.root);this.clearGroup(this.path);
  this.root.visible=false;this.path.visible=false;
  this._lastCenter.set(1e6,0,0);this._lastYaw=1e6;this._lastRefresh=-1;
  this.lastArcPoint=null;this.lastArcOrigin=null;
  this.aerialBeam.visible=false;this.aerialTip.visible=false;
 }
 begin(style,slot,override=null){
  this.clear();this.profile=override||AIM_PROFILES[style]?.[slot-1]||AIM_PROFILES[0][0];
  this.mainColor=COLORS[style]||COLORS[0];
  const pr=this.profile,color=this.mainColor;
  if(pr.kind==='zone'||pr.kind==='self'){
   this.disk(pr.radius,color);this.ring(pr.radius,color);
   this.ring(pr.radius*.7,0xfafaff,.6);this.ring(.48,0xfafaff,1);
  }else if(pr.kind==='cone')this.cone(pr.range,pr.halfAngle,color);
  else this.corridor(pr.range,pr.width,color,pr.kind==='dash');
  // A curved destination arrow makes sense for GUINEVERE S2 jump ONLY;
  // Meteorite, projectiles, dashes, self ultimates do NOT draw fake arcs.
  this.pathEnabled=(style===0&&slot===2&&pr.kind==='zone');
  this.airborneLine=(style===0||style===3)&&slot===1&&pr.kind==='line';
  this.aerialBeam.material.color.setHex(color);
  this.root.visible=true;this.path.visible=this.pathEnabled;
 }
 conform(center,yaw){
  const height=this.game.terrain.getHeight.bind(this.game.terrain);
  const co=Math.cos(yaw),si=Math.sin(yaw),clearance=.18;
  for(const mesh of this.root.children){
   const p=mesh.geometry.attributes.position,flat=mesh.userData.flat;
   for(let i=0;i<p.count;i++){
    const x=flat[i*3],z=flat[i*3+2];
    const wx=center.x+co*x+si*z,wz=center.z-si*x+co*z;
    p.setY(i,height(wx,wz)-center.y+clearance);
   }
   p.needsUpdate=true;mesh.geometry.computeBoundingSphere();
  }
 }
 makePath(origin,center){
  this.clearGroup(this.path);
  const dx=center.x-origin.x,dz=center.z-origin.z,len=Math.hypot(dx,dz);
  if(len<.3)return;
  const count=Math.max(8,Math.ceil(len/.38)),tris=[];
  const rx=-dz/len*.075,rz=dx/len*.075;
  for(let i=0;i<count;i++){
   const at=(j,side)=>{
    const t=j/count,x=origin.x+dx*t+rx*side,z=origin.z+dz*t+rz*side;
    return [x,this.game.terrain.getHeight(x,z)+.25+Math.sin(Math.PI*t)*2.0,z];
   };
   tris.push(...at(i,-1),...at(i,1),...at(i+1,1),
    ...at(i,-1),...at(i+1,1),...at(i+1,-1));
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(tris,3));
  const obj=new THREE.Mesh(geo,mat(this.mainColor,.82));
  obj.frustumCulled=false;obj.renderOrder=12;this.path.add(obj);
 }
 updateAim(direction,target=null){
  if(!this.profile)return null;
  const q=this.profile,g=this.game,origin=g.player.pos;
  const trueDir=direction?.clone()?.normalize()||g.player.getForward();
  const dir=trueDir.clone().setY(0).normalize();
  // L23: NO manual altitude drag. Show elevated beam ONLY for explicit
  // selected flying monster (trueDir gained elevation from focus).
  if(this.airborneLine&&trueDir.y>.065){
    const from=origin.clone().add(new THREE.Vector3(0,1.25,0));
    const to=from.clone().addScaledVector(trueDir,q.range);
    const beamDelta=to.clone().sub(from),length=beamDelta.length();
    this.aerialBeam.position.copy(from).addScaledVector(beamDelta,.5);
    this.aerialBeam.scale.set(1,length,1);
    this.aerialBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
      beamDelta.normalize());
    this.aerialBeam.visible=true;this.aerialTip.visible=true;
    this.aerialTip.position.copy(to);
  }else{this.aerialBeam.visible=false;this.aerialTip.visible=false;}
  if(dir.lengthSq()<.001)dir.set(0,0,-1);
  const yaw=Math.atan2(-dir.x,-dir.z);
  let center=origin.clone();
  if(q.kind==='zone'){
   const preferred=target?.clone()||origin.clone().addScaledVector(dir,q.range*.78);
   const planar=preferred.sub(origin).setY(0);
   if(planar.length()>q.range)planar.setLength(q.range);
   center.add(planar);
  }
  center.y=g.terrain.getHeight(center.x,center.z);
  let blocked=false;
  if(q.kind==='zone'){
   blocked=insideBlockingObject(g,center.x,center.y+1,center.z,.6)||
     !hasLineOfSight(g,{x:origin.x,y:origin.y+1.15,z:origin.z},
        {x:center.x,y:center.y+1.15,z:center.z});
  }else if(q.kind==='dash'){
   const end=origin.clone().addScaledVector(dir,q.range);
   end.y=g.terrain.getHeight(end.x,end.z);
   blocked=insideBlockingObject(g,end.x,end.y+1,end.z,.4)||
    !hasLineOfSight(g,{x:origin.x,y:origin.y+1,z:origin.z},
       {x:end.x,y:end.y+1,z:end.z});
  }
  this.valid=!blocked;
  const turn=(q.kind==='self'||q.kind==='zone')?0:yaw;
  this.root.position.copy(center);this.root.rotation.y=turn;
  this.root.visible=true;
  const now=g.time.elapsed||0;
  if(center.distanceToSquared(this._lastCenter)>.009||
      Math.abs(turn-this._lastYaw)>.02||now-this._lastRefresh>.15){
   this.conform(center,turn);
   if(this.pathEnabled &&
     (!this.lastArcPoint||this.lastArcPoint.distanceToSquared(center)>.045||
      !this.lastArcOrigin||this.lastArcOrigin.distanceToSquared(origin)>.035)){
    this.makePath(origin,center);this.lastArcPoint=center.clone();
    this.lastArcOrigin=origin.clone();
   }
   this._lastCenter.copy(center);this._lastYaw=turn;this._lastRefresh=now;
  }
  const color=blocked?0xff3559:this.mainColor;
  for(const o of this.root.children)
   if(o.material?.color&&o.material.opacity>.85)o.material.color.setHex(color);
  return {direction:dir,target:center.clone(),valid:this.valid};
 }
}
