/** Normalized landscape HUD positions; same contract across phone sizes. */
export const HUD_LAYOUT_KEY='hf_p812_hud_layout_v2';
export const HUD_LAYOUT_VERSION=2;
export const HUD_DEFAULTS=Object.freeze({
 joy:{x:.025,y:.66,size:122},run:{x:.43,y:.75,size:54},
 jump:{x:.51,y:.75,size:58},dash:{x:.59,y:.75,size:58},
 use:{x:.67,y:.75,size:56},s1:{x:.75,y:.75,size:58},atk:{x:.85,y:.695,size:90},
 // L26: optional Skill Lab-only control, registered after HUD mounts.
 focus:{x:.915,y:.845,size:43},
 s2:{x:.75,y:.625,size:51},s3:{x:.825,y:.52,size:51},s4:{x:.905,y:.555,size:51},
 lock:{x:.61,y:.57,size:43},next:{x:.665,y:.49,size:42},clear:{x:.72,y:.445,size:37},
 radar:{x:.845,y:.014,size:122},bag:{x:.855,y:.395,size:50},
 menu:{x:.925,y:.395,size:50},combo:{x:.405,y:.022,size:180},
 perf:{x:.81,y:.34,size:158},header:{x:.015,y:.018,size:232}
});
export const HUD_IDS=Object.freeze(Object.keys(HUD_DEFAULTS));
export const clamp=(a,lo,hi)=>Math.max(lo,Math.min(hi,a));
export function sanitizeHudLayout(input={}){
 const source=input && typeof input==='object' && !Array.isArray(input)?input:{};
 const out={};
 for(const id of HUD_IDS){
  const original=HUD_DEFAULTS[id],value=source[id]||{};
  out[id]={
   x:Number.isFinite(value.x)?clamp(value.x,0,.98):original.x,
   y:Number.isFinite(value.y)?clamp(value.y,0,.98):original.y,
   size:Number.isFinite(value.size)?clamp(value.size,26,350):original.size,
   opacity:Number.isFinite(value.opacity)?clamp(value.opacity,.25,1):1,
   hidden:value.hidden===true
  };
 }
 // Essential actions cannot be hidden: editor must not lock the player out.
 for(const id of ['joy','atk','jump','dash','use','menu'])out[id].hidden=false;
 return out;
}
export function placeHudItem(item,width,height,scale=1,autoHeight=false){
 const w=Math.max(250,width),h=Math.max(200,height);
 const size=clamp(item.size*scale,20,Math.min(w*.5,h*.57));
 const drawHeight=autoHeight?Math.min(120,Math.max(23,size*.12)):size;
 const top=clamp(item.y*h,4,h-drawHeight-4),left=clamp(item.x*w,4,w-size-4);
 return {left,top,size,opacity:item.opacity};
}
