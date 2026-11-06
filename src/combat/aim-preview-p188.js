/**
 * HIGHFLY P188 / real-world 3D aiming telegraphs.
 * Aiming is PREVIEW ONLY. Damage, MP, Energy and cooldown are processed
 * by P186 after pointer release/confirm. No practice dummies or lab maps.
 *
 * Three.js meshes are created ONCE and reused, not reallocated every frame.
 * Screen drag uses camera-relative forward/right for a real 360-degree aim.
 */
import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const DEFS={
 guin_violet_lance:['line',36,1],guin_ascension:['circle',5.8,2.6],
 guin_tempest:['self',0,4.2],
 dyr_fury_slashes:['cone',4.9,65],dyr_step:['line',6.5,1.1],
 dyr_final_cut:['cone',10.5,22],
 tig_iron_wave:['cone',6.5,58],tig_charge:['line',7,1.5],
 tig_collapse:['self',0,4.6],
 woc_fireball:['line',40,1.05],woc_meteor:['circle',12.5,4.15],
 woc_frost_nova:['self',0,5],
 woc_backstab:['cone',3.45,34],woc_kidney_shot:['cone',3.25,40],
 woc_charge:['line',7,1.3]
};
export const AIM_SPECS_P188=Object.freeze(Object.fromEntries(Object.entries(DEFS)
 .map(([id,[kind,range,angleOrRadius]])=>[id,Object.freeze({kind,range,angleOrRadius})])));
export function aimDirectionFromDragP188(startX,startY,x,y,cameraForward,fallback){
 const deltaX=x-startX,deltaY=startY-y;
 const len=Math.hypot(deltaX,deltaY);
 if(len<7)return fallback.clone().setY(0).normalize();
 const f=cameraForward.clone().setY(0);
 if(f.lengthSq()<.01)f.set(0,0,-1);
 f.normalize();
 const r=V(-f.z,0,f.x); // planar camera right: facing -Z -> +X
 const dir=f.multiplyScalar(deltaY).addScaledVector(r,deltaX);
 return dir.lengthSq()>.001?dir.normalize():fallback.clone().setY(0).normalize();
}
export function previewPointP188(player,dir,spec,terrain){
 const range=spec?.kind==='self'?0:spec?.range||4;
 const x=player.x+dir.x*range,z=player.z+dir.z*range;
 const y=terrain?.getHeight?.(x,z);
 return V(x,Number.isFinite(y)?y:player.y,z);
}
const material=(color,opacity)=>new THREE.MeshBasicMaterial({
 color,transparent:true,opacity,depthWrite:false,depthTest:false,
 side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1
});
function makeSector(angleDeg=85){
 const shape=new THREE.Shape();
 const half=Math.PI*angleDeg/360;
 shape.moveTo(0,0);
 for(let i=0;i<=30;i++){
  const a=-half+2*half*i/30;
  shape.lineTo(Math.sin(a),Math.cos(a));
 }
 shape.closePath();
 const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),material('#50dafa',.27));
 m.rotation.x=-Math.PI/2;
 return m;
}
export class AimPreviewP188{
 constructor(game){
  this.game=game;
  this.group=new THREE.Group();
  this.group.name='highfly_p188_skill_aim_preview';
  this.group.visible=false;
  this.group.renderOrder=600;
  const line=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material('#54e3ff',.43));
  line.rotation.x=-Math.PI/2;
  this.line=line;this.group.add(line);
  this.sector=makeSector();this.group.add(this.sector);
  this.sectorCache=new Map([[85,this.sector.geometry]]);
  const fill=new THREE.Mesh(new THREE.CircleGeometry(1,48),material('#75d7ff',.18));
  fill.rotation.x=-Math.PI/2;
  this.fill=fill;this.group.add(fill);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,56),material('#6feaff',.85));
  ring.rotation.x=-Math.PI/2;
  this.ring=ring;this.group.add(ring);
  this.game.scene.add(this.group);
  this.spec=null;this.skillId=null;
 }
 begin(skill){
  this.skillId=skill.id;
  this.spec=AIM_SPECS_P188[skill.id]||{kind:'line',range:10,angleOrRadius:1};
  if(this.spec.kind==='cone'){
   const angle=this.spec.angleOrRadius;
   if(!this.sectorCache.has(angle))this.sectorCache.set(angle,makeSector(angle).geometry);
   this.sector.geometry=this.sectorCache.get(angle);
  }
  this.group.visible=true;
 }
 update(player,dir){
  if(!this.group.visible||!this.spec)return;
  const spec=this.spec,kind=spec.kind;
  const y=this.game.terrain.getHeight(player.x,player.z);
  this.group.position.set(player.x,(Number.isFinite(y)?y:player.y)+.22,player.z);
  this.group.rotation.y=Math.atan2(-dir.x,-dir.z);
  this.line.visible=kind==='line';
  this.sector.visible=kind==='cone';
  this.fill.visible=kind==='self'||kind==='circle';
  this.ring.visible=kind==='self'||kind==='circle'||kind==='line';
  if(kind==='line'){
   this.line.position.set(0,.02,-spec.range/2);
   this.line.scale.set(spec.angleOrRadius,spec.range,1);
   this.ring.position.set(0,.02,-spec.range);
   this.ring.scale.setScalar(Math.max(.6,spec.angleOrRadius));
  }
  if(kind==='cone'){
   this.sector.scale.setScalar(spec.range);
   // Rotate the reusable sector within its own local plane to match cone arc.
   // 85° full reusable sector is narrowed by its parent's local scale only
   // for cosmetic preview; hit logic still uses its true aim direction.
   this.ring.visible=false;
  }
  if(kind==='self'||kind==='circle'){
   const center=kind==='self'?0:spec.range;
   const radius=spec.angleOrRadius;
   this.fill.position.set(0,.025,-center);
   this.ring.position.set(0,.035,-center);
   this.fill.scale.setScalar(radius);
   this.ring.scale.setScalar(radius);
  }
 }
 stop(){this.group.visible=false;this.spec=null;this.skillId=null;}
 dispose(){
  this.stop();this.game.scene.remove(this.group);
  for(const geo of this.sectorCache.values())geo.dispose();
  this.group.traverse(o=>{
   if(o!==this.sector)o.geometry?.dispose();
   if(o.material?.dispose)o.material.dispose();
  });
 }
}
