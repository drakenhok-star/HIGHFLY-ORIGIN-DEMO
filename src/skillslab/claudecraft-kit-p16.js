import * as THREE from 'three';
import {hasLineOfSight} from '../combat/targeting-p6.js';
import {chooseLaunchVector} from './projectile-aim-p19.js';

// Mechanics adapted for HIGHFLY from World of ClaudeCraft v0.44.7 MIT code:
// commit 493c35a108cef6c8aa290e8793107b1cd117886e
// Source names: fireball (Cinderbolt), meteor (Skystone), frost_nova
// (Icebind), backstab (Craven Thrust), kidney_shot (Low Blow), charge
// (Onrush). All visual effects here are ORIGINAL procedural Three.js;
// no upstream models, sprites, sounds, textures, copied clip data or
// "with the project only" media imported.
// Cost/cooldown/damage/geometry are HIGHFLY P16 proposals, NOT source stats.

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export function castClaudeSkill(lab,slot,direction,target=null){
  const g=lab.game,p=g.player,fx=lab.fx,pos=p.pos.clone();
  if(lab.style===3){
    if(slot===1){
      fx.launch(pos,direction,3);
      const muzzle=pos.clone().add(vec(0,1.25,0))
        .addScaledVector(direction,.65);
      // Only an INITIAL aim correction; never steer after launch.
      // From a hill, aim at the enemy chest instead of firing horizontally.
      const visible=(e,p)=>hasLineOfSight(g,
        {x:muzzle.x,y:muzzle.y,z:muzzle.z},{x:p.x,y:p.y,z:p.z});
      const targets=g.combat.collectTargets().filter(e=>e.alive&&e.group)
        .map(e=>({enemy:e,alive:e.alive,
          position:{x:e.group.position.x,
            y:e.group.position.y+Math.min(1.3,Math.max(.75,e.hitRadius||.9)),
            z:e.group.position.z}}));
      const chosen=chooseLaunchVector({
        origin:muzzle,forward:direction,targets,range:22,halfAngle:17,visible
      });
      const shot=new THREE.Vector3(chosen.direction.x,chosen.direction.y,
        chosen.direction.z).normalize();
      const mesh=fx.energyBolt(3);
      mesh.position.copy(muzzle);
      g.scene.add(mesh);
      lab.projectiles.push({
        mesh,dir:shot,speed:31,remaining:22,style:3,
        damage:73,burn:{ticks:4,perTick:7,interval:.42}
      });
      return;
    }
    if(slot===2){
      const center=(target||pos.clone().addScaledVector(direction,13))
        .clone();
      center.y=g.terrain.getHeight(center.x,center.z);
      fx.meteorWarning(center,4.15);
      fx.fallingMeteor(center,.75);
      // Visible wind-up + falling meteor; resolves once, at destination,
      // not instantly on button release.
      lab.schedule(.75,()=>{
        const hit=lab.hitSphere(center,4.15,138,{});
        fx.meteorImpact(center,4.15);
        for(const enemy of lab.candidates(center,4.15)){
          enemy.applySlow?.(.57,1.2);
          lab.applyBurn(enemy,3,6,.45);
        }
        if(hit)lab.announce('¡METEORITO! '+hit+' impacto(s)');
      });
      return;
    }
    if(slot===3){
      const hit=lab.hitSphere(pos,5,32,{});
      for(const enemy of lab.candidates(pos,5)){
        enemy.applySlow?.(.04,1.8);
        if(!enemy.boss&&enemy.type!=='dragon'){
          enemy.cdT=Math.max(enemy.cdT||0,1.35);
        }
      }
      fx.frostNova(pos,5);
      if(hit)lab.announce('¡CONGELACIÓN! '+hit+' objetivo(s)');
      return;
    }
  }
  if(lab.style===4){
    if(slot===1){
      const foes=lab.candidates(pos,3.35,direction,34);
      let critical=false;
      for(const enemy of foes){
        const facing=vec(-Math.sin(enemy.yaw||0),0,-Math.cos(enemy.yaw||0));
        const targetToPlayer=pos.clone().sub(enemy.group.position).setY(0).normalize();
        const behind=facing.dot(targetToPlayer)<-.43;
        critical ||= behind;
        lab.struck(enemy,behind?130:72,direction);
      }
      fx.backstab(pos,direction);
      if(critical)lab.announce('¡ATAQUE POR LA ESPALDA! Daño crítico');
      return;
    }
    if(slot===2){
      const foes=lab.candidates(pos,3.25,direction,40);
      for(const enemy of foes){
        lab.struck(enemy,65,direction);
        enemy.applySlow?.(.04,1.1);
        if(!enemy.boss&&enemy.type!=='dragon'){
          enemy.cdT=Math.max(enemy.cdT||0,1.1);
          enemy.hitPending=-1;
        }
      }
      fx.slash(pos,direction,4);
      if(foes.length)lab.announce('¡GOLPE BAJO! Control breve');
      return;
    }
    if(slot===3){
      p.startDash({direction:{x:direction.x,z:direction.z},
        speed:22,duration:.36,style:'dodge'});
      fx.launch(pos,direction,4);
      lab.schedule(.37,()=>{
        const hits=lab.hitCone(p.pos,direction,3.3,65,82,{
          launch:true,stun:.65
        });
        fx.landing(p.pos.clone(),4,3.1);
        if(hits)lab.announce('¡EMBESTIDA! '+hits+' objetivo(s)');
      });
    }
  }
}
