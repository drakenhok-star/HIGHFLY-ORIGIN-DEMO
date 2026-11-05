/** P19 pure ATK-gesture math. Owns NO joystick or camera input. */
export const ATK_DRAG_P19=Object.freeze({fullPixels:36,neutralPixels:9});
export function aimFromAttackDrag(dx,dy){
 const x=Number.isFinite(dx)?dx:0,y=Number.isFinite(dy)?dy:0;
 if(Math.hypot(x,y)<ATK_DRAG_P19.neutralPixels)return {x:0,y:0};
 return {x:Math.max(-1,Math.min(1,x/ATK_DRAG_P19.fullPixels)),
         y:Math.max(-1,Math.min(1,y/ATK_DRAG_P19.fullPixels))};
}
export function attackArrow(x,y){
 const ax=Math.abs(x),ay=Math.abs(y);
 if(Math.max(ax,ay)<.42)return '↑'; // unobtrusive forward default
 if(ay>=ax)return y<0?'↑':'↓';
 return x<0?'←':'→';
}
