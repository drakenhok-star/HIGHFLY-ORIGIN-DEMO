/**
 * HIGHFLY P13 FURY SURFACES - stable non-allocating contact math.
 * Uses existing public map placements/colliders. Decorative geometry is not climbable.
 * Surface normals are horizontal; local roof/top tests are conservative.
 */
export const FURY_REACH=0.88;
export const FURY_BODY_RADIUS=0.43;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
export function circularContact(o,x,y,z,reach=FURY_REACH){
 if(o.kind==='tree')return null; // trunk collides, but no tree climbing yet
 if(y+1.6<o.minY || y>o.maxY+.5)return null;
 const dx=x-o.x,dz=z-o.z;
 const d2=dx*dx+dz*dz;
 if(d2>Math.pow(o.r+FURY_BODY_RADIUS+reach,2))return null;
 const dist=Math.sqrt(d2);
 if(dist<.08)return null;
 const gap=dist-(o.r+FURY_BODY_RADIUS);
 if(gap < -.1 || gap>reach)return null;
 return {nx:dx/dist,nz:dz/dist,top:o.maxY,kind:o.kind,gap,
    anchorX:o.x,anchorZ:o.z,r:o.r};
}
export function boxContact(c,x,y,z,groundY,reach=FURY_REACH){
 if(y>groundY+3.5||y+1.5<groundY)return null;
 const dx=x-c.x,dz=z-c.z;
 const co=Math.cos(c.ry),si=Math.sin(c.ry);
 const lx=dx*co-dz*si,lz=dx*si+dz*co;
 const qx=clamp(lx,-c.hw,c.hw),qz=clamp(lz,-c.hd,c.hd);
 const vx=lx-qx,vz=lz-qz;
 const d2=vx*vx+vz*vz;
 if(d2<1e-6)return null;
 const d=Math.sqrt(d2),gap=d-FURY_BODY_RADIUS;
 if(gap<-.12||gap>reach)return null;
 const nx=vx/d,nz=vz/d;
 return {nx:nx*co+nz*si,nz:-nx*si+nz*co,top:groundY+3.35,
    kind:'building',gap,anchorX:c.x,anchorZ:c.z,r:Math.max(c.hw,c.hd)};
}
export function closestTraversalSurface(game,position,reach=FURY_REACH){
 if(game.interiors?.inside)return null;
 const {x,y,z}=position;
 let best=null;
 const obs=game.scatter?.obstacles;
 if(obs){
  for(const o of obs.query(x,z,reach+3.5)){
   const s=circularContact(o,x,y,z,reach);
   if(s && (!best || s.gap<best.gap))best=s;
  }
 }
 for(const c of game.structures?.colliders||[]){
  if(Math.abs(x-c.x)>c.hw+4 || Math.abs(z-c.z)>c.hd+4)continue;
  const s=boxContact(c,x,y,z,game.terrain.getHeight(c.x,c.z),reach);
  if(s && (!best || s.gap<best.gap))best=s;
 }
 return best;
}
export function wallTangent(nx,nz,dx,dz,prefer=1){
 const proj=dx*nx+dz*nz;
 let tx=dx-proj*nx,tz=dz-proj*nz;
 const len=Math.hypot(tx,tz);
 if(len<.14){tx=-nz*(prefer<0?-1:1);tz=nx*(prefer<0?-1:1);}
 else{tx/=len;tz/=len;}
 return {x:tx,z:tz};
}
export function canGrabLedge(surface,y,verticalVelocity,pressingToward){
 if(!surface || surface.kind==='building'||!pressingToward||verticalVelocity>-.15)return false;
 const gap=surface.top-y;
 return gap>.30 && gap<1.48 && surface.r>=.64;
}
/** Only approximate flat rock tops qualify for aerial support; no stairs/roof teleport. */
export function landingRock(game,x,z,previousFootY,currentFootY){
 const obs=game.scatter?.obstacles;
 if(!obs)return null;
 let best=null;
 for(const o of obs.query(x,z,3)){
  if(o.kind!=='rock'&&o.kind!=='large-rock')continue;
  if((x-o.x)**2+(z-o.z)**2>(o.r-.16)**2)continue;
  const top=o.maxY;
  if(previousFootY>=top-.12 && currentFootY<=top+.12 &&
     (!best||top>best.top))best={top,source:o};
 }
 return best;
}
