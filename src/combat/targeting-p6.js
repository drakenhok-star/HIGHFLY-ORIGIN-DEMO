/**
 * HIGHFLY P6 targeting/LOS. No Three.js dependency: fast deterministic geometry.
 * Scene obstacles: known houses/well and sampled terrain, never visual-only meshes.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function insideBlockingObject(game,x,y,z,pad=0) {
  const s=game.structures;
  if(!s || (game.interiors && game.interiors.inside)) return false;
  const terrain=game.terrain;
  for(const c of s.colliders || []) {
    const dx=x-c.x,dz=z-c.z;
    if(Math.abs(dx)>10+pad||Math.abs(dz)>10+pad)continue;
    const co=Math.cos(c.ry),si=Math.sin(c.ry);
    if(Math.abs(dx*co-dz*si)>=c.hw+pad||Math.abs(dx*si+dz*co)>=c.hd+pad)continue;
    if(y<=terrain.getHeight(c.x,c.z)+6.2)return true;
  }
  for(const c of s.circleColliders || []) {
    const dx=x-c.x,dz=z-c.z;
    if(dx*dx+dz*dz>=(c.r+pad)*(c.r+pad))continue;
    if(y<=terrain.getHeight(c.x,c.z)+2.8)return true;
  }
  return false;
}
export function hasLineOfSight(game,from,to) {
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
  const len=Math.hypot(dx,dy,dz);
  if(len<0.01)return true;
  const steps=clamp(Math.ceil(len/1.2),2,42);
  for(let i=1;i<steps;i++){
    const t=i/steps, x=from.x+dx*t,y=from.y+dy*t,z=from.z+dz*t;
    if (game.terrain && y < game.terrain.getHeight(x,z)+0.12) return false;
    if (insideBlockingObject(game,x,y,z,0.12)) return false;
  }
  return true;
}
export function cameraSafeFraction(game,from,to){
  // Coarse, fixed-cost sweep for the camera; final terrain clamp is in Player.
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
  const steps=10;
  let safe=1;
  for(let i=1;i<=steps;i++){
    const t=i/steps,x=from.x+dx*t,y=from.y+dy*t,z=from.z+dz*t;
    if((game.terrain && y < game.terrain.getHeight(x,z)+0.42) ||
       insideBlockingObject(game,x,y,z,0.3)){safe=Math.max(0.18,(i-1)/steps);break;}
  }
  return safe;
}
export class TargetingP6 {
  constructor(game){this.game=game;this.locked=null;this.soft=null;this.scanT=0;this.range=48;}
  origin(){const p=this.game.player.pos;return {x:p.x,y:p.y+1.25,z:p.z};}
  center(e){const p=e.group.position;return {x:p.x,y:p.y+Math.min(1.3,Math.max(0.6,e.hitRadius||1)),z:p.z};}
  valid(e,maxRange=this.range,anyAngle=false){
    if(!e || !e.alive || !e.group)return false;
    const p=this.game.player.pos,q=e.group.position;
    const dx=q.x-p.x,dz=q.z-p.z,dist=Math.hypot(dx,dz);
    if(dist>maxRange+(e.hitRadius||0))return false;
    if(!anyAngle){
      const yaw=this.game.player.yaw;
      const dot=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/Math.max(0.001,dist);
      if(dot<0.15)return false;
    }
    return hasLineOfSight(this.game,this.origin(),this.center(e));
  }
  candidates(maxRange=this.range,anyAngle=false){
    const player=this.game.player, p=player.pos, yaw=player.yaw;
    const list=this.game.combat.collectTargets(), result=[];
    for(const e of list){
      if(!this.valid(e,maxRange,anyAngle))continue;
      const q=e.group.position,dx=q.x-p.x,dz=q.z-p.z,dist=Math.hypot(dx,dz);
      const dot=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/Math.max(dist,0.001);
      result.push({e,score:dist+Math.max(0,1-dot)*8});
    }
    result.sort((a,b)=>a.score-b.score);
    return result.map(x=>x.e);
  }
  acquire(maxRange=this.range){
    return this.candidates(maxRange,false)[0]||null;
  }
  get(maxRange=this.range){
    if(this.valid(this.locked,maxRange,true))return this.locked;
    if(this.valid(this.soft,maxRange,false))return this.soft;
    return this.acquire(maxRange);
  }
  toggle(){
    if(this.locked){this.locked=null;this.game.hud.notify('Objetivo libre');return;}
    this.locked=this.acquire();
    this.game.hud.notify(this.locked?'Objetivo fijado: '+this.locked.name:'No hay objetivo visible');
  }
  next(){
    const list=this.candidates(this.range,true);
    if(!list.length){this.locked=null;this.game.hud.notify('Sin objetivos visibles');return;}
    const i=list.indexOf(this.locked);
    this.locked=list[(i+1)%list.length];
    this.game.hud.notify('Objetivo: '+this.locked.name);
  }
  cancel(){this.locked=null;this.soft=null;}
  update(dt){
    if(this.locked && !this.valid(this.locked,this.range,true))this.locked=null;
    this.scanT-=dt;
    if(this.scanT<=0){this.scanT=0.16;this.soft=this.acquire();}
    const jp=this.game.input.justPressed;
    if(jp.has('KeyL'))this.toggle();
    if(jp.has('KeyR'))this.next();
    if(jp.has('KeyX'))this.cancel();
  }
}
