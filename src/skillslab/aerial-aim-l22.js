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
