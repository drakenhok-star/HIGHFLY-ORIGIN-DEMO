/** HIGHFLY P7 pure gameplay math — no Three/DOM, fast enough for mobile. */
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function worldMove(x,y,yaw){
 const length=Math.hypot(x,y);
 if(length<0.03)return {x:0,z:0,strength:0};
 const n=Math.min(1,length),lx=x/length,lz=y/length;
 return {x:(lx*Math.cos(yaw)+lz*Math.sin(yaw))*n,
         z:(-lx*Math.sin(yaw)+lz*Math.cos(yaw))*n,strength:n};
}
export function resolveDashDirection(analog,yaw,last,bodyYaw){
 const move=worldMove(analog?.x||0,analog?.y||0,yaw);
 if(move.strength>0.1){
   const n=Math.hypot(move.x,move.z);return {x:move.x/n,z:move.z/n};
 }
 if(last && Math.hypot(last.x,last.z)>0.1){
   const n=Math.hypot(last.x,last.z);return {x:last.x/n,z:last.z/n};
 }
 return {x:-Math.sin(bodyYaw),z:-Math.cos(bodyYaw)};
}
export function relativeDodgeClip(dir,bodyYaw){
 const f={x:-Math.sin(bodyYaw),z:-Math.cos(bodyYaw)};
 const right={x:Math.cos(bodyYaw),z:-Math.sin(bodyYaw)};
 const fd=dir.x*f.x+dir.z*f.z,side=dir.x*right.x+dir.z*right.z;
 return Math.abs(fd)>=Math.abs(side)?(fd>=0?'Dodge_Forward':'Dodge_Backward'):(side>=0?'Dodge_Right':'Dodge_Left');
}
export function closestAttackTarget(candidates,maxRange=4.5){
 const ok=candidates.filter(c=>c.alive && c.visible && c.distance<=maxRange+(c.hitRadius||0));
 ok.sort((a,b)=>a.distance-b.distance || String(a.id).localeCompare(String(b.id)));
 return ok.length?ok[0]:null;
}
export function comboStep(previous,windowActive){
 return windowActive ? previous % 4 + 1 : 1;
}
export function angleTo(x,z){return Math.atan2(-x,-z);}
export function wrapAngle(a){return Math.atan2(Math.sin(a),Math.cos(a));}
export function canAirDash(count,energy=16){return count<2 && energy>=16;}
export function canJump(count,grounded,energy){return grounded?energy>=8:count<2 && energy>=12;}
