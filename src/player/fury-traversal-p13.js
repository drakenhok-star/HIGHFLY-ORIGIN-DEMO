/**
 * FURY Movement Engine P13: bounded rock/structure contact parkour.
 * State transitions are deterministic; capsule never rotates or inherits skeletal flips.
 * No external animation required: use audited Jump_Idle / Running_A as fallbacks.
 */
import {closestTraversalSurface,wallTangent,canGrabLedge} from './fury-surfaces-p13.js';
export const FURY_PARKOUR=Object.freeze({
 wallRunSeconds:.82,wallRunSpeed:8.6,wallRunEnergyPerSec:13,
 wallJumpEnergy:15,wallJumpVertical:9.4,wallJumpOutward:6.4,
 ledgeHangEnergyPerSec:5,ledgeClimbEnergy:12,contactCooldown:.75,
 flipSeconds:.57,flipEnergy:12
});
const max=(a,b)=>Math.max(a,b);
export class FuryTraversalP13{
 constructor(game,player){
  this.game=game;this.player=player;
  this.mode='AIR';this.surface=null;this.wallTime=0;this.cooldown=0;
  this.hangY=0;this.flipT=-1;this.flipType='front';this.flipDone=false;
  this.lastReason='';
 }
 reset(){
  this.mode='AIR';this.surface=null;this.wallTime=0;this.cooldown=0;
  this.hangY=0;this.flipT=-1;this.flipType='front';this.flipDone=false;
  this.lastReason='';
  if(this.player?.rig?.root){
   this.player.rig.root.rotation.x=0;this.player.rig.root.rotation.z=0;
   this.player.rig.root.position.y=0;
  }
 }
 stop(reason=''){
  this.mode='AIR';this.surface=null;
  this.wallTime=0;this.cooldown=FURY_PARKOUR.contactCooldown;
  this.lastReason=reason;
 }
 isHolding(){return this.mode==='HANG';}
 isRunning(){return this.mode==='WALL_RUN';}
 beginFlip(mx,mz){
  if(this.flipT>=0)return false;
  // P14: the flip is a visual variant of the paid double jump, never double-charged.
  if(!this.game.p14Enabled && !this.game.stats.useStamina(FURY_PARKOUR.flipEnergy))return false;
  this.flipType=Math.abs(mx)>Math.abs(mz)
    ?(mx<0?'left':'right'):(mz>0?'back':'front');
  this.flipT=0;this.flipDone=false;
  return true;
 }
 jumpFromWall(){
  if(!this.surface || !['WALL_RUN','HANG'].includes(this.mode))return false;
  const p=this.player,g=this.game,s=this.surface;
  if(this.mode==='HANG'){
   if(!g.stats.useStamina(FURY_PARKOUR.ledgeClimbEnergy))return false;
   // Pull the stable capsule onto the rock top. Only rounded rock tops are supported.
   const inset=Math.max(.15,s.r*.60);
   p.pos.x=s.anchorX+s.nx*inset;
   p.pos.z=s.anchorZ+s.nz*inset;
   p.pos.y=s.top+.05;
   p.vel.y=0;p.vel.x=0;p.vel.z=0;p.onGround=true;
   p._jumpCount=0;
   this.stop('rock-mantle');
   this.cooldown=.52;
   return true;
  }
  if(!g.stats.useStamina(FURY_PARKOUR.wallJumpEnergy))return false;
  p.vel.x=s.nx*FURY_PARKOUR.wallJumpOutward;
  p.vel.z=s.nz*FURY_PARKOUR.wallJumpOutward;
  p.vel.y=FURY_PARKOUR.wallJumpVertical;
  p._jumpCount=2;p.onGround=false;p._jumpBufferT=0;
  this.stop('wall-jump');
  this.cooldown=.65;
  return true;
 }
 update(dt,moving,dirX,dirZ){
  const p=this.player,g=this.game;
  this.cooldown=max(0,this.cooldown-dt);
  if(p.onGround){
   if(this.mode!=='AIR')this.stop('landed');
   this.cooldown=0;
   return;
  }
  if(p.dashT>=0 || g.interiors?.inside){
   if(this.mode!=='AIR')this.stop('dash-or-interior');
   return;
  }
  const wantsGrip=!g.p14Enabled || Boolean(g.input?.touchUseHold || g.input?.keys?.has('KeyE'));
  if(this.mode==='HANG' && !wantsGrip){this.stop('released-grip');return;}
  if(this.mode==='HANG'){
   if(!this.surface || !g.stats.useStamina(FURY_PARKOUR.ledgeHangEnergyPerSec*dt)){
    this.stop('ledge-energy-empty');return;
   }
   p.vel.x=0;p.vel.z=0;p.vel.y=0;
   p.pos.x=this.surface.anchorX+this.surface.nx*(this.surface.r+.44);
   p.pos.z=this.surface.anchorZ+this.surface.nz*(this.surface.r+.44);
   p.pos.y=this.hangY;
   return;
  }
  const surface=closestTraversalSurface(g,p.pos,.66);
  if(this.mode==='WALL_RUN'){
   if(!surface||this.wallTime>=FURY_PARKOUR.wallRunSeconds||
      !moving||!g.stats.useStamina(FURY_PARKOUR.wallRunEnergyPerSec*dt)){
    this.stop('wall-run-expired');return;
   }
   this.surface=surface;
   this.wallTime+=dt;
   const tangent=wallTangent(surface.nx,surface.nz,dirX,dirZ,
      p.vel.x*-surface.nz+p.vel.z*surface.nx);
   p.vel.x=tangent.x*FURY_PARKOUR.wallRunSpeed;
   p.vel.z=tangent.z*FURY_PARKOUR.wallRunSpeed;
   p.vel.y=Math.max(p.vel.y,0.75);
   return;
  }
  if(this.cooldown>0 || !surface || !moving || dirX*surface.nx+dirZ*surface.nz>-.08)return;
  if(wantsGrip && canGrabLedge(surface,p.pos.y,p.vel.y,true)){
   this.mode='HANG';this.surface=surface;
   this.hangY=surface.top-1.04;
   p.vel.x=0;p.vel.y=0;p.vel.z=0;
   p.pos.x=surface.anchorX+surface.nx*(surface.r+.44);
   p.pos.z=surface.anchorZ+surface.nz*(surface.r+.44);
   p.pos.y=this.hangY;
   this.lastReason='ledge-catch';
   return;
  }
  if(g.stats.sp<3)return;
  this.mode='WALL_RUN';this.surface=surface;this.wallTime=0;
  this.lastReason='wall-run-started';
  // Push onto the wall tangent immediately, not towards the solid collider.
  const t=wallTangent(surface.nx,surface.nz,dirX,dirZ,
    p.vel.x*-surface.nz+p.vel.z*surface.nx);
  p.vel.x=t.x*FURY_PARKOUR.wallRunSpeed;
  p.vel.z=t.z*FURY_PARKOUR.wallRunSpeed;
  p.vel.y=Math.max(p.vel.y,1.0);
 }
 animate(dt){
  const p=this.player,root=p.rig.root;
  if(this.flipT>=0){
   this.flipT=Math.min(FURY_PARKOUR.flipSeconds,this.flipT+dt);
   const u=this.flipT/FURY_PARKOUR.flipSeconds;
   const ease=u*u*(3-2*u);
   const sign=(this.flipType==='back'||this.flipType==='left')?-1:1;
   // Skeleton-only full turn, capsule stays upright; soft lift prevents feet clipping.
   root.rotation.x=(this.flipType==='front'||this.flipType==='back')?ease*Math.PI*2*sign:0;
   root.rotation.z=(this.flipType==='left'||this.flipType==='right')?ease*Math.PI*2*sign:0;
   root.position.y=Math.sin(Math.PI*u)*.72;
   if(u>=1){this.flipT=-1;root.rotation.x=0;root.rotation.z=0;root.position.y=0;}
  }else{
   root.rotation.x=0;
   root.rotation.z=this.mode==='WALL_RUN'&&this.surface
     ?-.12*(this.surface.nx*Math.cos(p.bodyYaw)+this.surface.nz*Math.sin(p.bodyYaw))
     :0;
   root.position.y=0;
  }
 }
}
