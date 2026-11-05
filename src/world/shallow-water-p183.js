/**
 * HIGHFLY P18.3 - terrestrial transition: dry -> wading -> deep water.
 * Pure procedural terrain rules. No scene objects, physics engines or allocations
 * in the hot movement path. P18.2 remains intact and can be restored by flag.
 */
export const P183_MAX_WADE_DEPTH = 1.05; // metres below flat water plane
export const P183_DRY_TOLERANCE = .08;
export const P183_SHORE_PROBE = .75;
const finite = n => Number.isFinite(n);

export function waterDepthP183(terrain,x,z){
  if(!terrain||!finite(x)||!finite(z))return Infinity;
  return terrain.waterY-terrain.getHeight(x,z);
}
export function waterModeP183(terrain,x,z){
  const depth=waterDepthP183(terrain,x,z);
  return depth>P183_MAX_WADE_DEPTH?'deep':
    depth>P183_DRY_TOLERANCE?'wade':'dry';
}
export function waterSpeedP183(terrain,x,z){
  const depth=waterDepthP183(terrain,x,z);
  if(depth<=P183_DRY_TOLERANCE)return 1;
  if(depth>P183_MAX_WADE_DEPTH)return 0;
  const t=(depth-P183_DRY_TOLERANCE)/(P183_MAX_WADE_DEPTH-P183_DRY_TOLERANCE);
  return .65-.2*t; // 0.65 at waterline, ~0.45 at deepest traversable water
}
function canTraverse(terrain,x,z){
  if(!finite(x)||!finite(z))return false;
  const h=terrain.getHeight(x,z);
  const cutoff=terrain.waterY-P183_MAX_WADE_DEPTH;
  if(h<cutoff)return false;
  // High terrain costs one height probe only; shallow edges get a safety ring.
  if(h>terrain.waterY+2)return true;
  const e=P183_SHORE_PROBE;
  return terrain.getHeight(x+e,z)>=cutoff &&
    terrain.getHeight(x-e,z)>=cutoff &&
    terrain.getHeight(x,z+e)>=cutoff &&
    terrain.getHeight(x,z-e)>=cutoff;
}
/** Keep the same caller-owned result object; do not create per-frame garbage. */
export function shallowStepP183(terrain,x,z,dx,dz,out){
  if(!out)throw new TypeError('shallowStepP183 requires a reusable output object');
  out.x=x;out.z=z;out.blocked=true;
  if(!terrain||!finite(x)||!finite(z)||!finite(dx)||!finite(dz))return out;
  const nx=x+dx,nz=z+dz;
  if(canTraverse(terrain,nx,nz)){
    out.x=nx;out.z=nz;out.blocked=false;return out;
  }
  const slideX=canTraverse(terrain,nx,z);
  const slideZ=canTraverse(terrain,x,nz);
  if(slideX&&slideZ){
    if(Math.abs(dx)>=Math.abs(dz))out.x=nx;
    else out.z=nz;
  }else if(slideX)out.x=nx;
  else if(slideZ)out.z=nz;
  return out;
}
