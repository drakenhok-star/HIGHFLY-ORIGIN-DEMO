/** HIGHFLY L23: explicit monster selector. No hidden auto-target.
 * Camera/joystick stays untouched. Ground skills keep 2D manual AIM.
 */
import {isFlying22,lockedLaunchDirection22} from './aerial-aim-l22.js';

export function availableMonsters23(enemies,origin,groundHeight,{
 range=38,visible=()=>true
}={}){
 if(!Array.isArray(enemies)||!origin||typeof groundHeight!=='function')return [];
 return enemies.filter(e=>{
   if(!e?.alive||!e.group||!e.group.position)return false;
   const aim=lockedLaunchDirection22(origin,e,{range,visible});
   return !!aim;
 }).sort((a,b)=>{
   const pa=a.group.position,pb=b.group.position;
   const da=Math.hypot(pa.x-origin.x,pa.y-origin.y,pa.z-origin.z);
   const db=Math.hypot(pb.x-origin.x,pb.y-origin.y,pb.z-origin.z);
   return da-db;
 }).map(e=>({enemy:e,air:isFlying22(e,groundHeight),name:e.name||e.type||'Monstruo'}));
}

export function focusedFlightShot23(origin,selected,groundHeight,{
 range=22,visible=()=>true,manualGesture=false
}={}){
 if(manualGesture||!selected||!selected.alive||
    typeof groundHeight!=='function'||!isFlying22(selected,groundHeight))return null;
 return lockedLaunchDirection22(origin,selected,{range,visible});
}
