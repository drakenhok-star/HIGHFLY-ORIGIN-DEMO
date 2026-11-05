/** HIGHFLY L25 — opt-in aerial ATK, isolated to Skill Lab.
 * No changes to FURY P16 melee/combo/camera/joystick, no extra enemy or GLB.
 * Gameplay VFX are original shader-free Three.js procedural objects.
 */
import * as THREE from 'three';
import {hasLineOfSight} from '../combat/targeting-p6.js';
import {enemyChest22,isFlying22} from './aerial-aim-l22.js';
import {focusedFlightShot23} from './monster-focus-l23.js';

export const L25_AIR=Object.freeze({
  hitsToBreak:4,hitWindow:4.5,downSeconds:5.5,
  shotCooldown:.42,shotRange:32,shotSpeed:43,shotDamage:28,
  groundedOffset:.45,descentSpeed:12,ascentSpeed:3.2
});
export function countedAirHit25(hits,lastAt,now,window=L25_AIR.hitWindow){
  return (Number.isFinite(lastAt)&&now-lastAt<=window?hits:0)+1;
}
export function canRupture25(e,terrain){
  return !!(e?.alive&&e?.trainingDragon&&e?.group&&typeof terrain==='function'&&
    isFlying22(e,terrain));
}

function shotMesh25(){
  const root=new THREE.Group();
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.25,1),
    new THREE.MeshBasicMaterial({color:0x9aefff,depthWrite:false}));
  root.add(core);
  const shellMat=new THREE.MeshBasicMaterial({color:0x4498fc,transparent:true,
    opacity:.35,side:THREE.DoubleSide,depthWrite:false,
    blending:THREE.AdditiveBlending});
  const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(.40,1),shellMat);
  root.add(shell);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.44,.045,4,14),
    new THREE.MeshBasicMaterial({color:0xc9faff,transparent:true,opacity:.7,
      depthWrite:false,blending:THREE.AdditiveBlending}));
  halo.position.z=-.05;root.add(halo);
  root.userData.updateVfx=(dt)=>{
    core.rotation.y+=dt*7;
    shell.rotation.x+=dt*4;
    halo.rotation.z+=dt*9;
  };
  return root;
}

export class L25AerialRupture {
  constructor(lab){
    this.lab=lab;
    this.game=lab.game;
    this.lastShot=-1e9;
    this.lastWarning=-1e9;
    this.hits=new WeakMap();
    this.landed=new Set();
  }
  now(){return this.lab.now();}
  ground(){return (x,z)=>this.game.terrain.getHeight(x,z);}
  isFlyer(enemy){return !!(enemy?.alive&&enemy?.group&&
    isFlying22(enemy,this.ground()));}
  reset(){
    for(const enemy of this.landed){
      if(enemy?.trainingDragon)enemy.flightOffset=enemy._l25NormalFlight||7;
      if(enemy)enemy._l25DownUntil=0;
    }
    this.landed.clear();
    this.hits=new WeakMap();
    this.lastShot=-1e9;
  }
  /** Return true ONLY for an explicitly focused, currently airborne monster.
   * Caller falls through to the original P16 melee in every other case.
   */
  tryFire(){
    const enemy=this.lab.focusTarget,g=this.game,t=this.now();
    if(g.state!=='playing'||!enemy||!this.isFlyer(enemy))return false;
    if(t-this.lastShot<L25_AIR.shotCooldown)return true;
    const p=g.player.pos,from=new THREE.Vector3(p.x,p.y+1.35,p.z);
    const shot=focusedFlightShot23(from,enemy,this.ground(),{
      range:L25_AIR.shotRange,
      visible:(_e,chest)=>hasLineOfSight(g,from,chest)
    });
    if(!shot){
      if(t-this.lastWarning>1.15){
        this.lab.announce('ENFOCAR · El dragón está fuera de alcance o sin línea de visión');
        this.lastWarning=t;
      }
      return true; // Don't waste a terrestrial combo by swinging at empty sky.
    }
    const dir=new THREE.Vector3(shot.direction.x,shot.direction.y,shot.direction.z);
    const muzzle=from.addScaledVector(dir,.62);
    const mesh=shotMesh25();
    mesh.position.copy(muzzle);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
    g.scene.add(mesh);
    this.lab.projectiles.push({mesh,dir,speed:L25_AIR.shotSpeed,
      remaining:L25_AIR.shotRange,damage:L25_AIR.shotDamage,
      style:0,aerialBasic:true,target:enemy});
    this.lastShot=t;
    g.player.castT=0;g.player._castAnimStarted=false;
    this.lab.fx.sparks(muzzle,'#7eeaff',12,2.1,.26,.08);
    return true;
  }
  confirm(enemy,point){
    if(!canRupture25(enemy,this.ground()))return;
    const now=this.now();
    const prior=this.hits.get(enemy)||{n:0,at:-1e9};
    const n=countedAirHit25(prior.n,prior.at,now);
    if(n<L25_AIR.hitsToBreak){
      this.hits.set(enemy,{n,at:now});
      this.lab.announce('RUPTURA AÉREA · '+n+'/'+L25_AIR.hitsToBreak+' impactos confirmados');
      return;
    }
    this.hits.set(enemy,{n:0,at:-1e9});
    enemy._l25NormalFlight=enemy._l25NormalFlight||enemy.flightOffset||7;
    enemy._l25DownUntil=now+L25_AIR.downSeconds;
    this.landed.add(enemy);
    this.lab.fx.signature.chains(point.clone(),'#8ff1ff',3.4,.85);
    this.lab.fx.signature.upwardPillar(point.clone(),'#9df6ff',4.1,.65);
    this.lab.announce('¡RUPTURA AÉREA! Dragón descendiendo · ATK 1-2-3-4 y skills terrestres');
  }
  update(dt){
    const now=this.now();
    for(const e of this.landed){
      if(!e?.alive||e?.removed||!e?.trainingDragon){
        this.landed.delete(e);continue;
      }
      const target=now<e._l25DownUntil?L25_AIR.groundedOffset:
        (e._l25NormalFlight||7);
      const rate=target<e.flightOffset?L25_AIR.descentSpeed:L25_AIR.ascentSpeed;
      const current=e.flightOffset||0;
      e.flightOffset=current+Math.sign(target-current)*
        Math.min(Math.abs(target-current),rate*Math.max(0,dt));
      if(now>=e._l25DownUntil && Math.abs(e.flightOffset-target)<.01){
        this.landed.delete(e);
        this.hits.delete(e);
        if(this.lab.focusTarget===e)
          this.lab.announce('El dragón recuperó su vuelo · ATK aéreo disponible');
      }
    }
  }
}
