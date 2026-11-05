import * as THREE from 'three';
/**
 * HIGHFLY L22 signature effects — original Three.js procedural geometry.
 * No MLBB or proprietary media used. Practical low-poly WebGL effects that
 * emphasize cast/windup/contact; actual damage is owned by skills-web.js.
 */
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const MAT=(hex,opacity=.85)=>new THREE.MeshBasicMaterial({color:hex,transparent:true,
 opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
export class L22SignatureVfx {
 constructor(fx){this.fx=fx;this.game=fx.game;}
 add(obj,life=.55,kind='signature'){return this.fx.add(obj,life,kind);}
 path(points,color,life=.55,width=.07,kind='signature'){
  if(points.length<2)return null;
  const geom=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(12,points.length*2),width,4,false);
  const mesh=new THREE.Mesh(geom,MAT(color));mesh.frustumCulled=false;
  return this.add(mesh,life,kind);
 }
 groundWave(from,forward,radius,color,life=.47,halfAngle=50,thickness=.24){
  // A solid wedge-front that follows each actual terrain height, not a fake slash arc.
  const f=forward.clone().setY(0).normalize(),v=[],segments=20;
  const origin=from.clone();
  const y=(x,z)=>this.game.terrain.getHeight(x,z)+.18;
  const arc=halfAngle*Math.PI/180;
  for(let i=0;i<segments;i++){
   const make=(step,r)=>{const theta=(step/segments*2-1)*arc;
    const x=origin.x+(f.x*Math.cos(theta)-f.z*Math.sin(theta))*r;
    const z=origin.z+(f.z*Math.cos(theta)+f.x*Math.sin(theta))*r;
    return [x,y(x,z),z] };
   const a=make(i,radius),b=make(i+1,radius),
     c=make(i+1,Math.max(.1,radius-thickness)),d=make(i,Math.max(.1,radius-thickness));
   v.push(...a,...b,...c,...a,...c,...d);
  }
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  const mesh=new THREE.Mesh(geom,MAT(color,.96));mesh.frustumCulled=false;
  return this.add(mesh,life,'signature');
 }
 crescent(from,forward,color='#fc789c',life=.48,scale=1){
  // Two connected luminous edges form a broad blade strike; not copyrighted texture.
  const f=forward.clone().setY(0).normalize(),r=V(-f.z,0,f.x);
  const path=[];
  for(let i=0;i<=12;i++){
   const t=i/12,side=(t-.5)*4*scale;
   path.push(from.clone().addScaledVector(f,1.9*scale+Math.sin(Math.PI*t)*.9*scale)
    .addScaledVector(r,side).add(V(0,.6+Math.sin(Math.PI*t)*1.3*scale,0)));
  }
  this.path(path,color,life,.12*scale);
  return this.path(path.map(p=>p.clone().add(V(0,-.15,0))),'#f7e6ff',life*.78,.042*scale);
 }
 upwardPillar(world,color='#dd9aff',height=4.5,life=.8){
  const pts=[];for(let i=0;i<=26;i++){
   const t=i/26,a=5*Math.PI*t;
   pts.push(world.clone().add(V(Math.cos(a)*(1.0-t*.62),.18+t*height,
     Math.sin(a)*(1-t*.62))));
  }
  this.path(pts,color,life,.11,'signature');
  this.path(pts.map((p,i)=>p.clone().add(V(.28,.0,.18))),'#f7eeff',life,.042);
  this.fx.sparks(world.clone().add(V(0,height*.45,0)),color,16,2.3,.49,.14);
 }
 gravityFunnel(world,color='#e8b85f',radius=4.5,height=4.7,life=1.65){
  // Strong center-seeking read, winding from outside toward caster.
  for(let band=0;band<3;band++){
   const pts=[];for(let i=0;i<=40;i++){
    const t=i/40,a=band*Math.PI*2/3+t*7*Math.PI;
    const r=radius*(1-t*.83);
    pts.push(world.clone().add(V(Math.cos(a)*r,.25+t*height,Math.sin(a)*r)));
   }
   this.path(pts,band===1?'#fff4b5':color,life,.105);
  }
  this.fx.ring(world,radius*.95,color,Math.min(.85,life));
 }
 iceShards(world,radius=2,color='#a9ecff',life=1.1,count=10){
  // One instanced draw for icy spikes, anchored to actual ground.
  count=clamp(count|0,3,16);
  const g=new THREE.ConeGeometry(.25,1.35,5),m=MAT(color,.85);
  const mesh=new THREE.InstancedMesh(g,m,count);
  const tmp=new THREE.Object3D();
  for(let i=0;i<count;i++){
   const a=(i/count)*Math.PI*2+Math.sin(i*13.1)*.07,r=radius*(.57+(i%3)*.14);
   const x=world.x+Math.cos(a)*r,z=world.z+Math.sin(a)*r;
   const h=.7+(i%4)*.3;
   tmp.position.set(x,this.game.terrain.getHeight(x,z)+.20+h*.5,z);
   tmp.rotation.set(Math.sin(a)*.22,0,Math.cos(a)*.18);
   tmp.scale.set(.7,h,.8);tmp.updateMatrix();mesh.setMatrixAt(i,tmp.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;
  return this.add(mesh,life,'signature-ice');
 }
 chains(world,color='#d93f6b',height=2.5,life=1){
  for(let k=0;k<2;k++){
   const pts=[];for(let i=0;i<=26;i++){
    const t=i/26,a=k*Math.PI+t*Math.PI*3.4,r=.75*(1-.33*t);
    pts.push(world.clone().add(V(Math.cos(a)*r,.17+t*height,Math.sin(a)*r)));
   }
   this.path(pts,k?'#e4ebff':color,life,k?.047:.07);
  }
 }
 rushLines(world,direction,color='#d7eaff',life=.36){
  const f=direction.clone().setY(0).normalize(),r=V(-f.z,0,f.x);
  for(let k=0;k<4;k++){
   const side=(k-1.5)*.5;
   const p=world.clone().addScaledVector(r,side).add(V(0,.45+(k%2)*.36,0));
   this.path([p.clone().addScaledVector(f,-2.3),p.clone().addScaledVector(f,2.8)],
    k===1?'#ffffff':color,life,.05);
  }
 }
 meteorScars(world,radius=4,color='#ff6729',life=1.35){
  // Uneven, ground-following cracks emanating from the REAL landing position.
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,r=radius*(.54+(i%3)*.17);
   const points=[];for(let j=0;j<=4;j++){
    const t=j/4,b=a+Math.sin(i*7+j*2)*.10*t;
    const x=world.x+Math.cos(b)*r*t,z=world.z+Math.sin(b)*r*t;
    points.push(V(x,this.game.terrain.getHeight(x,z)+.19,z));
   }
   this.path(points,i%2?'#fbd064':color,life,.065);
  }
  this.fx.sparks(world.clone().add(V(0,.32,0)),'#ffcc73',32,3.8,.65,.16);
 }
 shadowStrike(world,forward,color='#76c8ff',life=.42){
  // Precise crossed mark at the confirmed contact position, intentionally not an AoE ring.
  const f=forward.clone().setY(0).normalize(),r=V(-f.z,0,f.x);
  const center=world.clone().add(V(0,1.05,0));
  this.path([center.clone().addScaledVector(r,-.8).add(V(0,-.55,0)),
    center.clone().addScaledVector(r,.8).add(V(0,.55,0))],color,life,.075);
  this.path([center.clone().addScaledVector(r,.8).add(V(0,-.55,0)),
    center.clone().addScaledVector(r,-.8).add(V(0,.55,0))],'#dfe6ff',life,.045);
 }
 darkExecution(world,forward,life=.7){
  // A long blade corridor that communicates S3 line hitbox, then shatters at destination.
  const f=forward.clone().setY(0).normalize(),r=V(-f.z,0,f.x);
  for(let edge of [-1,1]){
   const pts=[];for(let i=0;i<=12;i++){
    const t=i/12,p=world.clone().addScaledVector(f,10*t)
      .addScaledVector(r,edge*(1.8-1.3*t));
    pts.push(p.add(V(0,.30+Math.sin(Math.PI*t)*1.55,0)));
   }
   this.path(pts,edge>0?'#ff5877':'#6c2859',life,.11);
  }
  this.fx.sparks(world.clone().addScaledVector(f,8).add(V(0,.9,0)),
    '#ffb6b9',19,2.5,.46,.16);
 }
}
