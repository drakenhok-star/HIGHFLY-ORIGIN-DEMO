/**
 * HIGHFLY P18.2 / TERRESTRIAL HABITAT
 * Pure lightweight rules shared by initial spawns, respawns and movement.
 * Only non-aquatic ground mobs use these rules. Swimming monsters may later
 * register a separate habitat and movement controller.
 *
 * IMPORTANT: terrain.getHeight is procedural and works even without a chunk
 * built; this does not access visible chunk geometry or generate new terrain.
 */
export const HABITAT_P182_CLEARANCE=0.85; // water surface + wave/slope margin
export const HABITAT_P182_EDGE=1.7;
export const HABITAT_P182_RADII=Object.freeze([0,8,16,26,38,54,72,92]);
export function landCellP182(terrain,x,z,edge=HABITAT_P182_EDGE){
  if(!terrain||!Number.isFinite(x)||!Number.isFinite(z))return false;
  const minY=terrain.waterY+HABITAT_P182_CLEARANCE;
  if(terrain.getHeight(x,z)<=minY)return false;
  if(edge<=0)return true;
  // Shoreline margin prevents a creature's legs/rig intersecting the water.
  return terrain.getHeight(x+edge,z)>minY &&
    terrain.getHeight(x-edge,z)>minY &&
    terrain.getHeight(x,z+edge)>minY &&
    terrain.getHeight(x,z-edge)>minY;
}
export function dryPackCenterP182(terrain,desired,offsets,allow=(x,z)=>true){
  if(!terrain||!desired||!Array.isArray(offsets)||!offsets.length)return null;
  let checks=0;
  for(const radius of HABITAT_P182_RADII){
    const samples=radius===0?1:12;
    for(let i=0;i<samples;i++){
      const angle=2*Math.PI*i/samples;
      const x=desired.x+Math.cos(angle)*radius;
      const z=desired.z+Math.sin(angle)*radius;
      checks++;
      if(!allow(x,z))continue;
      let dry=true;
      for(const off of offsets){
        if(!landCellP182(terrain,x+off[0],z+off[1])){
          dry=false;break;
        }
      }
      if(dry)return Object.freeze({x,z,checks,shift:radius});
    }
  }
  return null; // never manufacture a wolf under a water plane
}
/**
 * Respect a land edge at EACH game simulation step, including knockback;
 * try sliding along the shore before freezing horizontal motion.
 * The original player movement is never touched.
 */
export function groundedStepP182(terrain,x,z,stepX,stepZ){
  if(!Number.isFinite(stepX)||!Number.isFinite(stepZ))return {x,z,blocked:true};
  const nx=x+stepX,nz=z+stepZ;
  if(landCellP182(terrain,nx,nz,1.1))return {x:nx,z:nz,blocked:false};
  const alongX=landCellP182(terrain,nx,z,1.1);
  const alongZ=landCellP182(terrain,x,nz,1.1);
  if(alongX&&alongZ){
    if(Math.abs(stepX)>=Math.abs(stepZ))return {x:nx,z,blocked:true};
    return {x,z:nz,blocked:true};
  }
  if(alongX)return {x:nx,z,blocked:true};
  if(alongZ)return {x,z:nz,blocked:true};
  return {x,z,blocked:true};
}
