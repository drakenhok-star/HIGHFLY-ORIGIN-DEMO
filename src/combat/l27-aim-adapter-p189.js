/**
 * HIGHFLY P189 — original L27 aim guide, adapted without lab boot.
 * Does not own damage, inventory, combat input or controls.
 */
import * as THREE from 'three';
import {TianjieAimGuide,AIM_PROFILES} from '../skillslab/aim-guide-p16.js';
const FAMILIES=['GUINEVERE','DYRROTH','TIGREAL','CLAUDE_MAGE','CLAUDE_ROGUE'];
// Legacy word-wall abilities now display through the SAME L27 telegraph engine.
export const NATIVE_AIM_PROFILES_P190=Object.freeze({
 native_fus:Object.freeze({kind:'cone',range:14,width:0,radius:0,halfAngle:35}),
 native_frost:Object.freeze({kind:'cone',range:15,width:0,radius:0,halfAngle:40}),
 native_wuld:Object.freeze({kind:'dash',range:13.2,width:2.3,radius:0,halfAngle:0})
});
const SPECS=AIM_PROFILES.flatMap((kit,i)=>kit.map((profile,slot)=>({
 kit:FAMILIES[i],slot:slot+1,profile
})));
export const AIM_SPECS_P189=Object.freeze(Object.fromEntries(SPECS.map(s=>[
 s.kit+'/'+s.slot,Object.freeze({
  kind:s.profile.kind,range:s.profile.range,width:s.profile.width,
  radius:s.profile.radius,halfAngle:s.profile.halfAngle
 })
])));
export function getLabAimProfileP189(skill,recast=false){
 const style=FAMILIES.indexOf(skill?.kit),slot=skill?.slot;
 if(skill?.nativeId)return NATIVE_AIM_PROFILES_P190[skill.id]||null;
 if(style<0||!Number.isInteger(slot)||slot<1||slot>3)return null;
 if(recast&&style===0&&slot===2)return Object.freeze({kind:'dash',range:4.4,width:2.7,radius:0});
 return AIM_PROFILES[style][slot-1];
}
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export function computeLabAimDragP189({dx,dy,forward,profile,sensitivity=.145,deadZone=4,playerPos=null,terrain=null}){
 const f=forward.clone().setY(0);
 if(f.lengthSq()<.01)f.set(0,0,-1);
 f.normalize();
 const right=v(-f.z,0,f.x);
 if(Math.hypot(dx,dy)<=deadZone||profile?.kind==='self')
  return {direction:f,target:null,dragged:false};
 if(profile?.kind==='zone'){
  const span=Math.min(profile.range*.76,profile.range<9?5.4:13);
  const d=right.multiplyScalar(dx*sensitivity)
   .addScaledVector(f,Math.max(.2,Math.min(profile.range,span-dy*sensitivity)));
  if(d.length()>profile.range)d.setLength(profile.range);
  const target=playerPos?playerPos.clone().add(d):null;
  if(target&&terrain)target.y=terrain.getHeight(target.x,target.z);
  return {direction:d.lengthSq()>.001?d.normalize():f,target,dragged:true};
 }
 const scale=sensitivity/.145;
 const delta=right.multiplyScalar(dx*1.35*scale)
  .addScaledVector(f,18-dy*1.35*scale);
 return {direction:delta.lengthSq()>.005?delta.normalize():f,target:null,dragged:true};
}
export class L27AimAdapterP189{
 constructor(game){
  this.game=game;this.guide=new TianjieAimGuide(game);
  this.group=this.guide.root;this.spec=null;this.lastResult=null;
 }
 begin(skill,recast=false){
  const index=FAMILIES.indexOf(skill?.kit);
  const native=!!skill?.nativeId;
  if(index<0&&!native)return false;
  this.skill=skill;this.spec=getLabAimProfileP189(skill,recast);
  if(!this.spec)return false;
  this.guide.begin(native?0:index,native?1:skill.slot,
   native||recast?this.spec:null);
  this.lastResult=null;return true;
 }
 update(_player,direction,target=null){
  if(!this.spec)return null;
  this.lastResult=this.guide.updateAim(direction,target);
  return this.lastResult;
 }
 stop(){this.guide.clear();this.spec=null;this.lastResult=null;this.skill=null;}
 get valid(){return !!this.lastResult?.valid;}
}