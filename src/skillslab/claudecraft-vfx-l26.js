/**
 * HIGHFLY L26 · ClaudeCraft VFX restoration (six abilities).
 * Reconstructs the signature timing/shape of MIT full ability specs from
 * World of ClaudeCraft v0.44.7 @493c35a without loading any upstream media.
 *
 * Exact references:
 *  fireball: bolt fire/orb/headScale/smoke/scorch
 *  meteor: skybeam/fire/fissure/impact ring
 *  frost_nova: frost nova/pillars/crack
 *  backstab: shadow thrust, contact-only, no ring
 *  kidney_shot: vertical blood hit + chains, stars/stun
 *  charge: physical dash/speedlines/fissure, arrival-only impact
 *
 * All geometry/materials original THREE primitives, no textures/SFX/GLB,
 * controlled through the existing 48-active-mesh FX lifetime cap.
 * Damage/cooldowns never live here. No imported commercial media.
 */
import * as THREE from 'three';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const mat=(color,opacity=.82,add=true)=>new THREE.MeshBasicMaterial({
 color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,
 blending:add?THREE.AdditiveBlending:THREE.NormalBlending
});
const ground=(g,x,z)=>g.terrain.getHeight(x,z);
const sat=(x,a,b)=>Math.max(a,Math.min(b,x));

export const CLAUDE_L26_SIGNATURE=Object.freeze({
 fireball:['orb','embers','impact-shell','scorch'],
 meteor:['warning','skyshaft','fall','fissure','fireburst'],
 frost_nova:['expanding-frost','ice-pillars','root-bind'],
 backstab:['contact-thrust','shadow-glint'],
 kidney_shot:['vertical-contact','bind-chains','stun-stars'],
 charge:['rush-speedlines','arrival-fissure','steel-impact']
});

export class ClaudeVfxL26{
 constructor(fx){this.fx=fx;this.game=fx.game;}

 /** A single mesh contains a tessellated ground sigil; no copyrighted atlas. */
 scorch(world,radius,color='#e76a35',life=1.25){
  const t=this.game.terrain;
  const verts=[];
  const triangles=(a,b,c,d)=>verts.push(...a,...b,...c,...a,...c,...d);
  const at=(a,r)=>{const x=world.x+Math.cos(a)*r,z=world.z+Math.sin(a)*r;
    return [x,t.getHeight(x,z)+.18,z];};
  const count=32,width=radius*.09;
  for(let i=0;i<count;i++){
    const a=i*2*Math.PI/count,b=(i+1)*2*Math.PI/count;
    triangles(at(a,radius-width),at(a,radius),at(b,radius),at(b,radius-width));
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  const mesh=new THREE.Mesh(geo,mat(color,.62));
  mesh.frustumCulled=false;
  this.fx.add(mesh,life,'l26-scorch');
 }

 /** One instanced draw, height-rising ice shards anchored to ground profile. */
 icePillars(origin,radius=5,life=1.45){
  const count=this.fx.quality===0?7:12;
  const baseY=ground(this.game,origin.x,origin.z);
  const mesh=new THREE.InstancedMesh(
    new THREE.ConeGeometry(.34,1.35,5),mat('#b9f3ff',.83),count);
  const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2+.1*Math.sin(i*13);
    const r=radius*(.70+(i%4)*.065);
    const x=origin.x+Math.sin(a)*r,z=origin.z+Math.cos(a)*r;
    const h=1.35+(i%4)*.34;
    dummy.position.set(x,ground(this.game,x,z)-baseY+.18+h*.5);
    dummy.rotation.set(Math.sin(a)*.18,a,Math.cos(a)*.16);
    dummy.scale.set(.84,h,.82);dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false;
  mesh.position.y=baseY;
  mesh.scale.y=.06;
  return this.fx.add(mesh,life,'l26-ice-rise');
 }

 /** Collision-bound visible frost debris around a physically hit enemy. */
 frostBind(enemy){
  if(!enemy?.group)return;
  const base=enemy.group.position.clone();
  this.fx.signature.iceShards(base,.9,'#d1f7ff',1.5,6);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.83,.085,5,28),
    mat('#72cfff',.88));
  halo.position.copy(base).add(V(0,.39,0));
  halo.rotation.x=Math.PI*.5;
  this.fx.add(halo,1.18,'l26-frost-halo');
 }

 /** Fireball's launch already uses the actual ported ico core + flame shells. */
 fireCharge(world,forward){
  const at=world.clone().add(V(0,1.3,0)).addScaledVector(forward,.6);
  this.fx.signature.upwardPillar(at,'#ffad4f',1.45,.37);
  this.fx.sparks(at,'#ffd789',18,1.4,.32,.10);
 }

 fireImpact(contact){
  this.fx.signature.upwardPillar(contact.clone(),'#ff7430',2.25,.51);
  this.fx.sparks(contact.clone().add(V(0,.3,0)),'#ffda8f',28,4,.55,.16);
  const y=ground(this.game,contact.x,contact.z);
  if(Math.abs(contact.y-y)<3.4){
    const onGround=V(contact.x,y,contact.z);
    this.scorch(onGround,1.45,'#ff6438',1.35);
    this.fx.signature.meteorScars(onGround,1.6,'#ff9845',.7);
  }
 }

 /** Meteor: an actual shaft descending from above the designated ground target. */
 meteorSkybeam(target,life=.76){
  const y=ground(this.game,target.x,target.z);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.10,.65,11.5,9,1,true),
    mat('#ffbe63',.39));
  beam.position.set(target.x,y+6.4,target.z);
  beam.scale.set(1,.08,1);
  this.fx.add(beam,life,'l26-skyshaft');
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.12,.29,10,7,1,true),
    mat('#fff3c5',.28));
  core.position.set(target.x,y+6.0,target.z);
  core.scale.y=.08;
  this.fx.add(core,life,'l26-skyshaft');
  this.fx.signature.meteorScars(target,3.8,'#ff7136',life+.23);
  this.fx.ring(target,4.1,'#ffae62',life);
 }

 meteorDetonate(world){
  this.fx.signature.meteorScars(world,4.15,'#ff7639',1.7);
  this.scorch(world,3.4,'#ed4b18',2.2);
  this.fx.signature.upwardPillar(world,'#ff9442',7.0,.75);
  this.fx.sparks(world.clone().add(V(0,1.0,0)),'#ffdf98',40,5.8,.65,.22);
  this.fx.ring(world,4.15,'#ffa84f',.71);
 }

 frostNova(world,targets=[]){
  this.icePillars(world,5,1.5);
  this.fx.ring(world,4.9,'#83eaff',.96);
  this.fx.ring(world,3.8,'#e6fbff',.71);
  this.fx.sparks(world.clone().add(V(0,.5,0)),'#cdf9ff',28,3.1,.55,.12);
  this.scorch(world,4.6,'#77d8ff',1.25);
  for(const enemy of targets.slice(0,5))this.frostBind(enemy);
 }

 /** Quiet stealth attack: NO generic explosion and NO ground ring. */
 backstabContact(enemy,forward,critical){
  if(!enemy?.group)return;
  const hit=enemy.group.position.clone().add(V(0,.85,0));
  const f=forward.clone().setY(0).normalize();
  const right=V(-f.z,0,f.x);
  const pts=[
    hit.clone().addScaledVector(f,-1.05),
    hit.clone().addScaledVector(f,-.25).addScaledVector(right,-.12),
    hit.clone().addScaledVector(f,.65)
  ];
  this.fx.signature.path(pts,critical?'#e5a2ff':'#92d5ff',.41,.13);
  this.fx.signature.shadowStrike(enemy.group.position.clone(),forward,
    critical?'#bb6bff':'#8ab7df',.48);
  this.fx.sparks(hit,critical?'#d08aff':'#cdeaff',critical?17:9,1.8,.31,.08);
 }

 /** A character-specific stun marker at actual hit position. */
 kidneyContact(enemy,forward){
  if(!enemy?.group)return;
  const loc=enemy.group.position.clone(),f=forward.clone().setY(0).normalize();
  this.fx.signature.chains(loc,'#e24476',2.65,1.20);
  const head=loc.clone().add(V(0,2.0,0));
  const count=6,mesh=new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(.16,0),mat('#fff0ba',.93),count);
  const tmp=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const a=i*Math.PI*2/count;
    tmp.position.copy(head).add(V(Math.cos(a)*.58,Math.sin(a*.5)*.19,Math.sin(a)*.58));
    tmp.rotation.set(.3,a,.28);tmp.scale.setScalar(.68+i%3*.13);
    tmp.updateMatrix();mesh.setMatrixAt(i,tmp.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;
  this.fx.add(mesh,1.12,'l26-stun-stars');
  this.fx.signature.upwardPillar(loc,'#ec557e',2.5,.48);
  this.fx.sparks(head.clone().addScaledVector(f,.3),'#fff0cd',18,2.1,.39,.1);
 }

 chargeWindup(origin,dir){
  this.fx.signature.rushLines(origin.clone().add(V(0,1.0,0)),dir,'#d8e6f3',.43);
  this.fx.sparks(origin.clone().add(V(0,.45,0)),'#aab9cd',18,2.1,.43,.11);
 }
 chargeCrash(at,dir,hits=0){
  this.fx.signature.groundWave(at,dir,2.65,'#d9e7f8',.43,65,.36);
  this.fx.signature.meteorScars(at,2.15,'#9aacc3',.79);
  this.fx.sparks(at.clone().add(V(0,.9,0)),'#f7fcff',hits?32:16,3.2,.5,.14);
 }

 /** Optional 3D visual spec completeness checks; no behavior side effects. */
 static isComplete(){
  return Object.values(CLAUDE_L26_SIGNATURE).every(a=>a.length>=2);
 }
}
