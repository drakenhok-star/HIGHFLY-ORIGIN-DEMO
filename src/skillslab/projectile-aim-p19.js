/** P19: one-time 3D shot assist. NEVER continuously homes. */
export function chooseLaunchVector({origin,forward,targets=[],range=22,halfAngle=17,visible=()=>true}){
 const length=Math.hypot(forward?.x||0,forward?.y||0,forward?.z||0)||1;
 const f={x:(forward?.x||0)/length,y:(forward?.y||0)/length,z:(forward?.z||0)/length};
 let best=null,score=Infinity;
 for(const target of targets){
  if(!target||target.alive===false)continue;
  const p=target.position||target;
  if(!p)continue;
  const dx=p.x-origin.x,dy=p.y-origin.y,dz=p.z-origin.z;
  const dist=Math.hypot(dx,dy,dz);
  if(dist<.01||dist>range)continue;
  const horizontal=Math.hypot(dx,dz);
  const flatF=Math.hypot(f.x,f.z)||1;
  const dot=(dx*f.x+dz*f.z)/(Math.max(.001,horizontal)*flatF);
  if(dot<Math.cos(halfAngle*Math.PI/180))continue;
  if(!visible(target,p))continue;
  const preference=(1-dot)*30+dist*.025;
  if(preference<score){score=preference;best={target,
    direction:{x:dx/dist,y:dy/dist,z:dz/dist}};}
 }
 // At launch the aim is fixed forever. A dodge or miss must remain a miss.
 return best||{target:null,direction:f};
}
