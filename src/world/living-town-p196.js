/**
 * HIGHFLY P196 — real NPC living-town movement with deterministic safe homes.
 * Training/quest identifiers, dialogue, saves and city structures remain intact.
 * Targets are rejected on water, cliff edges and house colliders; no pathfinding
 * invented through obstacles. Zero extra updates in World Forge editor mode.
 */
import {worldDayPeriodP18} from './world-registry-p18.js';

const R=60;
export function safeTownWalkP196(game,x,z){
  const terrain=game.terrain;
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(Math.hypot(x,z-40)>R)return false;
  const y=terrain.getHeight(x,z);
  if(y<=terrain.waterY+2.35||terrain.getSlope(x,z)>.38)return false;
  // All four feet/approach checks: avoid walkable center but submerged edges.
  for(const [dx,dz] of [[-2.3,0],[2.3,0],[0,-2.3],[0,2.3]]){
    const h=terrain.getHeight(x+dx,z+dz);
    if(h<=terrain.waterY+1.8||Math.abs(y-h)>1.5)return false;
  }
  if(game.structures.colliders.some(c=>Math.hypot(c.x-x,c.z-z)<4.3))return false;
  return true;
}
function safeHome(game,npc){
  const x=npc.pos.x,z=npc.pos.z;
  if(safeTownWalkP196(game,x,z))return {x,z};
  // Search in small concentric rings around the profession's CURRENT desk,
  // not another village or unrelated workshop.
  for(let radius=3;radius<=28;radius+=2.5){
    for(let i=0;i<36;i++){
      const a=i*Math.PI/18+(.173*radius),cx=x+radius*Math.cos(a),cz=z+radius*Math.sin(a);
      if(!safeTownWalkP196(game,cx,cz))continue;
      if(game.npcs.list.some(p=>p!==npc&&Math.hypot(p.pos.x-cx,p.pos.z-cz)<2.2))continue;
      return {x:cx,z:cz};
    }
  }
  return null;
}
export function setLivingTownNPCP196(game,npc){
  const home=safeHome(game,npc);
  if(!home){
    npc.p196Town={safe:false,reason:'NO_DRY_ROUTE'};
    return false;
  }
  const shifted=Math.hypot(npc.pos.x-home.x,npc.pos.z-home.z)>.05;
  if(shifted){
    npc.pos.set(home.x,game.terrain.getHeight(home.x,home.z),home.z);
  }
  // If the object was moved with the editor, this is its new home.
  npc.wander={
    homeX:home.x,homeZ:home.z,r:3.8,target:null,
    idleT:3+(npc.id.length%6),p196Safe:true
  };
  npc.p196Town={
    safe:true,profession:npc.p192TrainerId||npc.id,
    homeX:home.x,homeZ:home.z,shifted,restAtNight:true
  };
  return true;
}
export function installLivingTownP196(game){
  const audit={total:0,safe:0,relocated:0,unsafe:[]};
  for(const npc of game.npcs.list){
    // Sigrid works at her real anvil, and Olaf's existing council routine stays
    // unchanged. Bjorn retains his original wandering implementation.
    if(!npc.p192TrainerId)continue;
    audit.total++;
    if(setLivingTownNPCP196(game,npc)){
      audit.safe++;if(npc.p196Town.shifted)audit.relocated++;
    }else audit.unsafe.push(npc.id);
  }
  game.p196TownAudit=audit;
  return audit;
}
export function trainerMayWanderP196(game,npc){
  if(!npc.p196Town)return false;
  return worldDayPeriodP18(game.time.dayTime)!=='night';
}
