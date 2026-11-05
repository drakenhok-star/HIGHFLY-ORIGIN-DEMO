/** HIGHFLY L24 — one stable island training layout, one world scene.
 * Player begins between two combat zones. Distances are world units.
 * No map regeneration or second laboratory is involved.
 */
export function unifiedIslandLayout24(origin,forward){
  if(!origin||!forward)throw Error('Island layout requires an anchor and heading');
  const n=Math.hypot(forward.x||0,forward.z||0)||1;
  const fx=(forward.x||0)/n,fz=(forward.z||-1)/n;
  const rx=-fz,rz=fx;
  const at=(dist,side)=>({
    x:origin.x+fx*dist+rx*side,
    z:origin.z+fz*dist+rz*side
  });
  return {
    skeletons:[at(8.3,-3.8),at(8.9,0),at(8.3,3.8)],
    dragon:at(-14.3,1.3),
    hoverHeight:7.0
  };
}
