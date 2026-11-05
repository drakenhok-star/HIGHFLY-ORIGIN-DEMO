/** HIGHFLY L22 — 3D skill targeting. Pure and deterministic.
 * All directions are in world coordinates; the projectile never homes after launch.
 */
export function clamp22(v,min,max){return Math.max(min,Math.min(max,v));}
export function enemyChest22(entity){
  const p=entity?.group?.position||entity?.position||entity;
  if(!p)return null;
  const r=Number.isFinite(entity?.hitRadius)?entity.hitRadius:0.9;
  return {x:p.x,y:p.y+Math.min(1.3,Math.max(0.7,r)),z:p.z};
}
export function flightHeight22(entity,groundHeight){
  const p=entity?.group?.position||entity?.position||entity;
  if(!p)return 0;
  const ground=groundHeight(p.x,p.z);
  return Number.isFinite(ground)?Math.max(0,p.y-ground):0;
}
export function isFlying22(entity,groundHeight,threshold=1.65){
  return flightHeight22(entity,groundHeight)>threshold;
}
export function aerialDirection22(forward,dragX=0,dragY=0,scale=1){
  const fx=Number.isFinite(Number(forward?.x))?Number(forward.x):0;
  const fz=Number.isFinite(Number(forward?.z))?Number(forward.z):-1;
  const len=Math.hypot(fx,fz)||1;
  const nx=fx/len,nz=fz/len;
  const rightX=-nz,rightZ=nx;
  // Negative dragY = look upward. Max vertical elevation: +/- 52 degrees.
  const yaw=clamp22(dragX*0.022*scale,-1.05,1.05);
  const pitch=clamp22(-dragY*0.008*scale,-0.90,0.90);
  const horizX=nx*Math.cos(yaw)+rightX*Math.sin(yaw);
  const horizZ=nz*Math.cos(yaw)+rightZ*Math.sin(yaw);
  return {x:horizX*Math.cos(pitch),y:Math.sin(pitch),z:horizZ*Math.cos(pitch)};
}
export function directionToTarget22(origin,target){
  if(!origin||!target)return null;
  const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z;
  const d=Math.hypot(dx,dy,dz);
  return d>1e-5?{x:dx/d,y:dy/d,z:dz/d}:null;
}
export function targetWithinSkillVolume22(center,enemy,range,verticalRange=2.6){
  const p=enemyChest22(enemy);
  if(!p||!center)return false;
  const rad=Math.max(0,Number(enemy?.hitRadius)||0);
  return Math.hypot(p.x-center.x,p.z-center.z)<=range+rad &&
    Math.abs(p.y-(center.y+1.0))<=verticalRange+rad;
}
export function isCancelDrop22(x,y,rect,margin=12){
  return Number.isFinite(x)&&Number.isFinite(y)&&!!rect &&
    x>=rect.left-margin&&x<=rect.right+margin&&
    y>=rect.top-margin&&y<=rect.bottom+margin;
}

/** Swept sphere collision: world-space X/Y/Z, not horizontal-only radius. */
export function sweptProjectileHit22(from,to,center,radius){
 if(!from||!to||!center||!Number.isFinite(radius)||radius<=0)return null;
 const vx=to.x-from.x,vy=to.y-from.y,vz=to.z-from.z;
 const lenSq=vx*vx+vy*vy+vz*vz;
 if(lenSq<1e-10)return null;
 const wx=center.x-from.x,wy=center.y-from.y,wz=center.z-from.z;
 const t=clamp22((wx*vx+wy*vy+wz*vz)/lenSq,0,1);
 const dx=wx-vx*t,dy=wy-vy*t,dz=wz-vz*t;
 const distanceSq=dx*dx+dy*dy+dz*dz;
 return distanceSq<=radius*radius?{t,distanceSq}:null;
}

/** Explicit lock-on is the player's priority for an un-dragged 3D projectile.
 * The direction is captured ONCE at release. The missile does not home.
 * A target out of 3D range or behind an obstacle cannot acquire the shot.
 */
export function lockedLaunchDirection22(origin,enemy,{range=22,visible=()=>true}={}){
 if(!enemy||enemy.alive===false)return null;
 const target=enemyChest22(enemy);
 const dir=directionToTarget22(origin,target);
 if(!dir)return null;
 const dist=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z);
 if(dist>range||!visible(enemy,target))return null;
 return {direction:dir,target:enemy,distance:dist};
}

/**
 * L22 design rule: never soft-aim a skill at an enemy ON THE GROUND.
 * The optional airborne auto-aim may acquire only a genuinely elevated,
 * visible living target within the projectile's finite travel range.
 * The user can always override with manual drag.
 */
export function flyingAutoTarget22(origin,forward,enemies,groundHeight,{
  range=22,halfAngle=17,visible=()=>true,flightThreshold=1.65
}={}){
 if(!origin||!forward||typeof groundHeight!=='function')return null;
 const len=Math.hypot(forward.x||0,forward.y||0,forward.z||0)||1;
 const f={x:(forward.x||0)/len,y:(forward.y||0)/len,z:(forward.z||0)/len};
 const h=Math.hypot(f.x,f.z)||1;
 let winner=null,best=Infinity;
 for(const enemy of enemies||[]){
  if(!enemy?.alive||!isFlying22(enemy,groundHeight,flightThreshold))continue;
  const candidate=lockedLaunchDirection22(origin,enemy,{range,visible});
  if(!candidate)continue;
  const d=candidate.direction;
  const horizontal=Math.hypot(d.x,d.z)||1;
  const dot=(d.x*f.x+d.z*f.z)/(horizontal*h);
  if(dot<Math.cos(halfAngle*Math.PI/180))continue;
  const score=(1-dot)*30+candidate.distance*.03;
  if(score<best){best=score;winner=candidate;}
 }
 return winner;
}
