import * as THREE from 'three';
import { hasLineOfSight, insideBlockingObject } from '../combat/targeting-p6.js';
import { TianjieSkillVfx } from './lab-vfx.js';
import { TianjieAimGuide, AIM_PROFILES } from './aim-guide-p16.js';
import { castClaudeSkill } from './claudecraft-kit-p16.js';
import {targetWithinSkillVolume22,isCancelDrop22,sweptProjectileHit22,enemyChest22} from './aerial-aim-l22.js';
import {availableMonsters23,focusedFlightShot23} from './monster-focus-l23.js';
import {L25AerialRupture} from './aerial-rupture-l25.js';
import {L25PremiumSkillVfx} from './premium-vfx-l25.js';
import {ClaudeVfxL26} from './claudecraft-vfx-l26.js';

// FURY P16 hit-confirm and ATK gesture are authoritative for movement and combat.
// This skill lab never replaces g.combat.melee or g.player.update.
// Tianjie FURY P16 remains authoritative for camera, physics, KayKit rig,
// locomotion, jump, dash, aerial combos, ATK and world RPG. This module owns
// ONLY extra skill rules, skill-specific enemy states and lab HUD input.
export const LAB_STYLES = Object.freeze([
  Object.freeze({ name:'HECHICERA AÉREA',short:'AÉREA',cost:[14,23,40],cd:[4.4,15,40],
    names:['LANZA VIOLETA','ASCENSO / RECAST','TEMPESTAD'] }),
  Object.freeze({ name:'ASALTANTE ABISAL',short:'ABISAL',cost:[18,25,42],cd:[5,12,32],
    names:['CORTES DE FURIA','PASO / RECAST','CORTE FINAL'] }),
  Object.freeze({ name:'GUARDIÁN GRAVITACIONAL',short:'GUARDIÁN',cost:[18,25,42],cd:[6,14,44],
    names:['ONDA DE HIERRO','EMBESTIDA / RECAST','COLAPSO'] }),
  Object.freeze({ name:'CLAUDECRAFT · MAGO',short:'CLAUDE MAGO',cost:[20,42,27],cd:[3.8,17,13],
    names:['FIREBALL · CINDERBOLT','METEOR · SKYSTONE','FROST NOVA · ICEBIND'] }),
  Object.freeze({ name:'CLAUDECRAFT · PÍCARO',short:'CLAUDE PÍCARO',cost:[17,25,22],cd:[3.2,12,10],
    names:['BACKSTAB · CRAVEN THRUST','KIDNEY SHOT · LOW BLOW','CHARGE · ONRUSH'] })
]);
const PALETTE=['#ac79ff','#ff607f','#f0c976'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export class TianjieMobaSkillsLab {
  constructor(game){
    this.game=game;
    this.style=0;
    this.ready=LAB_STYLES.map(()=>[0,0,0]);
    this.recastUntil=0;
    this.recastStyle=-1;
    this.busyUntil=0;
    this.events=[];
    this.projectiles=[];
    this.exposed=new WeakMap();
    this.fx=new TianjieSkillVfx(game);
    this.premiumFx=new L25PremiumSkillVfx(this.fx);
    this.claudeFx=new ClaudeVfxL26(this.fx);
    this.airRupture=new L25AerialRupture(this);
    this.aimGuide=new TianjieAimGuide(game);
    this.activeLeap=null;
    this.guardianPull=null;
    this.guardianDash=null;
    this.focusTarget=null; // L23: only user-selected monster gets opt-in aerial focus.
    this.focusPanelOpen=false;
    this.focusEditor=null;
    this.aim=null;
    this.preview=null;
    this.aimPoint=null;
    // Adjustable live during gameplay by P18 camera/aim lab.
    this.aimSensitivity=.145;
    this.aimDragThreshold=4;
    this.enemiesList=null;
    this.training=[];
    this.trainingCount=game.enemies?.trainingCount||1;
    this.lastHud=-1;
    this.lastSpawn=-1;
    this.lastPlay=false;
    this.quality=2;
    this.fx.setQuality(2); // Premium default; optimize implementations, not quality slider.
    this.installCombatBridge();
    this.installHud();
    this.bindKeyboard();
    this.attachTouchButtons();
    this.bindingCheck=setInterval(()=>{
      this.attachTouchButtons();
      this.ensureFocusEditor(); // HUD P10 initializes asynchronously.
      // Boot/start transitions can precede the first graphics update frame.
      if(this.root)this.root.classList.toggle('playing',this.game.state==='playing');
    },700);
  }
  now(){return this.game.time.elapsed;}
  styleDef(){return LAB_STYLES[this.style];}
  announce(s){this.note.textContent=s;this.game.hud?.notify?.(s);}
  setStyle(i){
    this.cancelAim();
    this.guardianPull=null; // switching kits cancels the staged pull
    this.style=clamp(i|0,0,LAB_STYLES.length-1);
    // P16 preserves all per-style cooldowns, including off-screen styles.
    // Recast closes on switch but cannot reset a skill cooldown.
    this.recastUntil=0;this.recastStyle=-1;
    this.renderHud(true);
  }
  cooldown(slot){
    if(this.style===2&&slot===3&&this.guardianPull&&this.now()<this.guardianPull.expires)return 0;
    if(slot===2&&this.recastStyle===this.style&&this.now()<this.recastUntil)return 0;
    return Math.max(0,this.ready[this.style][slot-1]-this.now());
  }
  canRecast(){return this.style===this.recastStyle&&this.now()<this.recastUntil;}

  installCombatBridge(){
    const g=this.game;
    const originalMelee=g.combat.melee.bind(g.combat);
    const originalCast=g.combat.cast.bind(g.combat);
    const originalShout=g.combat.shout.bind(g.combat);
    const originalUpdate=g.combat.update.bind(g.combat);
    // Aerial ATK replaces melee ONLY while an explicitly focused flyer is airborne.
    // On the ground FURY P16 1-2-3-4 stays the only attack implementation.
    g.combat.melee=(...args)=>this.airRupture.tryFire()?undefined:originalMelee(...args);
    // The lab HTML is the sole entrypoint installing these wrappers.
    // Keep original melee(), movement, WULD/dash, quests and HUD intact.
    g.combat.cast=(...args)=>this.cast(1,null,'keyboard')||undefined;
    g.combat.shout=(id,...args)=>{
      const selected=id||g.combat.equippedShout;
      if(selected==='fus')return this.cast(2,null,'keyboard');
      if(selected==='frost')return this.cast(3,null,'keyboard');
      return originalShout(id,...args); // S4 WULD remains Tianjie.
    };
    g.combat.update=(dt)=>{
      originalUpdate(dt);
      if(g.state==='playing')this.update(dt);
      else this.cancelAim();
    };
    this.original={melee:originalMelee,cast:originalCast,shout:originalShout,update:originalUpdate};
  }

  aimDirection(request,maxRange=17,slot=1){
    // Always PURE MANUAL horizontal aiming unless a flying monster has been
    // deliberately selected through ENFOCAR. Swipe never controls altitude.
    if(request&&request.lengthSq()>.01)return request.clone().normalize();
    const g=this.game,p=g.player,f=p.getCombatForward();
    const forward=f.lengthSq()>.01?f.normalize():p.getForward();
    const profile=AIM_PROFILES[this.style]?.[slot-1];
    if((this.style===0||this.style===3)&&profile?.kind==='line'){
      const pos=p.pos,origin={x:pos.x,y:pos.y+1.25,z:pos.z};
      const aimed=focusedFlightShot23(origin,this.focusTarget,
        (x,z)=>g.terrain.getHeight(x,z),{
          range:maxRange,visible:(_enemy,target)=>hasLineOfSight(g,origin,target)
        });
      if(aimed)return vec(aimed.direction.x,aimed.direction.y,aimed.direction.z);
    }
    return forward.setY(0).normalize();
  }
  candidates(center,range,dir=null,halfAngle=180,verticalRange=2.6){
    const g=this.game,origin={x:center.x,y:center.y+1.2,z:center.z};
    return g.combat.collectTargets().filter(e=>{
      if(!e?.alive||!e.group)return false;
      const diff=e.group.position.clone().sub(center);
      diff.y=0;
      if(!targetWithinSkillVolume22(center,e,range,verticalRange))return false;
      if(dir&&diff.lengthSq()>.01 && diff.normalize().dot(dir)<Math.cos(halfAngle*Math.PI/180))return false;
      if(!hasLineOfSight(g,origin,{x:e.group.position.x,y:e.group.position.y+1.1,z:e.group.position.z}))return false;
      return true;
    });
  }
  struck(e,damage,dir,opts={}){
    if(!e?.alive)return false;
    const exposed=(this.exposed.get(e)||0)>this.now();
    const amount=damage*(exposed?1.2:1);
    const kb=vec((dir?.x||0)*1.6,0,(dir?.z||0)*1.6);
    if(opts.launch && !e.boss && e.type!=='dragon' && (e.hitRadius||1)<1.8){
      kb.y=6.5;
      e.applySlow?.(.05,Math.max(.4,opts.stun||1));
      e.animLock=Math.max(e.animLock||0,.2);
    }
    if(opts.push && !e.boss && e.type!=='dragon')kb.add(dir.clone().multiplyScalar(opts.push));
    e.takeDamage(amount,kb);
    this.game.hud?.showEnemyHP?.(e);
    if(opts.expose)this.exposed.set(e,this.now()+2.6);
    return true;
  }
  hitSphere(center,radius,damage,opts={}){
    const enemies=this.candidates(center,radius,null,180,opts.height??radius);
    for(const e of enemies){
      const direction=e.group.position.clone().sub(center).setY(0).normalize();
      this.struck(e,damage,direction,opts);
    }
    return enemies.length;
  }
  hitCone(center,dir,radius,halfAngle,damage,opts={}){
    const enemies=this.candidates(center,radius,dir,halfAngle,opts.height??2.6);
    for(const e of enemies)this.struck(e,damage,dir,opts);
    return enemies.length;
  }
  schedule(delay,fn){this.events.push({at:this.now()+delay,fn});}
  consume(slot){
    const def=this.styleDef(),price=def.cost[slot-1],stats=this.game.stats;
    return (this.style===0||this.style===3)?stats.useMagicka(price):stats.useStamina(price);
  }
  cast(slot,requested=null,origin='touch',requestedTarget=null,aimMode='auto'){
    const g=this.game;
    if(g.state!=='playing'||slot<1||slot>3)return false;
    if(g.stats.hp<=0)return false;
    const t=this.now(),dir=this.aimDirection(requested,17,slot);
    // Gravity ultimate has two explicit phases; second press is free.
    if(this.style===2&&slot===3&&this.guardianPull){
      if(t>this.guardianPull.started+.12){this.finishGuardianPull();return true;}
      return false;
    }
    if(this.activeLeap&&this.style===0&&slot===3){
      this.announce('Esperá a aterrizar para encadenar TEMPESTAD');
      return false;
    }
    const pr=AIM_PROFILES[this.style]?.[slot-1];
    let groundTarget=null;
    if(pr?.kind==='zone' && !(slot===2&&this.canRecast())){
      // Ground circles follow the player's AIM, never a locked ground enemy.
      const raw=requestedTarget?.clone() ||
        g.player.pos.clone().addScaledVector(dir,pr.range*.76);
      const delta=raw.clone().sub(g.player.pos).setY(0);
      if(delta.length()>pr.range)delta.setLength(pr.range);
      groundTarget=g.player.pos.clone().add(delta);
      groundTarget.y=g.terrain.getHeight(groundTarget.x,groundTarget.z);
      const forbidden=insideBlockingObject(g,groundTarget.x,groundTarget.y+1,groundTarget.z,.5)||
        !hasLineOfSight(g,
          {x:g.player.pos.x,y:g.player.pos.y+1.1,z:g.player.pos.z},
          {x:groundTarget.x,y:groundTarget.y+1.1,z:groundTarget.z});
      if(forbidden){this.announce('Destino bloqueado: apuntá a una zona despejada');return false;}
    }
    if(slot===2&&this.canRecast()){
      const at=g.player.pos.clone();
      // ABISAL: stationary second hit, NEVER a second teleport/dash.
      if(this.style===1){
        this.recastUntil=0;
        this.hitCone(at,dir,3.8,65,80,{expose:true});
        this.fx.slash(at,dir,1);
        this.fx.landing(at.clone().addScaledVector(dir,1.2),1,3.1);
        this.announce('¡RUPTURA! Segundo golpe EN EL LUGAR');
        this.animatePlayer(2);
        return true;
      }
      if(g.player.dashT>=0)return false;
      this.recastUntil=0;
      if(this.style===2){
        // Tigreal S2 second phase: rising hook NOW, never a second dash.
        const hits=this.hitCone(at,dir,3.8,80,70,{launch:true,stun:1.05,height:3.8});
        this.fx.slash(at,dir,2);
        this.fx.impact(at.clone().addScaledVector(dir,1.2),2,2.8);
        this.fx.signature.upwardPillar(at.clone().addScaledVector(dir,1.8),'#f5d58c',4.6,.62);
        this.announce('¡GANCHO ASCENDENTE! '+hits+' enemigo(s) elevados');
        this.animatePlayer(2);
        return true;
      }
      g.player.startDash({direction:{x:dir.x,z:dir.z},speed:19,duration:.17,style:'dodge'});
      this.fx.launch(at,dir,this.style);
      if(this.style===2)this.schedule(.18,()=>{
        this.hitSphere(g.player.pos,2.8,55,{launch:true,stun:.55});
        this.fx.landing(g.player.pos.clone(),2,2.8);
      });
      return true;
    }
    if(this.cooldown(slot)>0.01||t<this.busyUntil)return false;
    if(slot===2&&g.player.dashT>=0)return false;
    if(!this.consume(slot)){this.announce(this.style===0?'MANÁ insuficiente':'ENERGÍA insuficiente');return false;}
    this.ready[this.style][slot-1]=t+this.styleDef().cd[slot-1];
    this.busyUntil=t+(slot===3?.30:.12);
    if(slot===2&&this.style>0&&this.style<3){
      this.recastStyle=this.style;
      this.recastUntil=t+3.5;
    }
    // AERIAL recast starts only after actual ground impact, not takeoff.
    if(this.style===0)this.aerial(slot,dir,groundTarget,{manualAim:aimMode==='manual'});
    else if(this.style===1)this.rift(slot,dir);
    else if(this.style===2)this.guardian(slot,dir);
    else castClaudeSkill(this,slot,dir,groundTarget,{manualAim:aimMode==='manual'});
    // L25 accent pass: all 15 skills, separate from damage and cooldown rules.
    if(this.style<3)this.premiumFx.onCast(this.style,slot,g.player.pos,dir,groundTarget);
    this.animatePlayer(slot);
    this.renderHud(true);
    return true;
  }
  animatePlayer(slot){
    const p=this.game.player;
    // Combat animations use the actual KayKit barbarian animation controller.
    // There is no new animation rig and never a substituted test avatar.
    if(this.style===0||this.style===3){
      p.castT=0;p._castAnimStarted=false;
    }else{
      p.attackT=0;p._attackAnimStarted=false;
      p.attackClip=slot===1?'1H_Melee_Attack_Slice_Horizontal':
        slot===2?'1H_Melee_Attack_Slice_Diagonal':'1H_Melee_Attack_Chop';
    }
    p.actionDuration=slot===3?.42:.32;
  }
  aerial(slot,dir,landingTarget=null,options={}){
    const g=this.game,p=g.player,at=p.pos.clone();
    if(slot===1){
      let shotDir=dir.clone();
      // L23: no automatic sky steering. Only an explicitly selected flying
      // monster can elevate a projectile, and only without a manual drag.
      if(!options.manualAim&&this.focusTarget){
        const from={x:at.x,y:at.y+1.2,z:at.z};
        const shot=focusedFlightShot23(from,this.focusTarget,
          (x,z)=>g.terrain.getHeight(x,z),{
            range:17,visible:(_enemy,q)=>hasLineOfSight(g,from,q)
          });
        if(shot)shotDir=vec(shot.direction.x,shot.direction.y,shot.direction.z);
      }
      this.fx.launch(at,shotDir,0);
      // Violet cast now gets a proper multi-layer 3D projectile and instanced sparks.
      const mesh=this.fx.energyBolt(0);
      mesh.position.copy(at).add(vec(0,1.2,0)).add(shotDir.clone().multiplyScalar(.7));
      mesh.quaternion.setFromUnitVectors(vec(0,0,1),shotDir);
      g.scene.add(mesh);
      this.projectiles.push({mesh,dir:shotDir.clone(),speed:28,remaining:17,style:0});
    }
    if(slot===2){
      // Authentic skill ordering: AIM GROUND -> TAKE OFF -> TRAVEL -> LAND
      // -> AoE impact -> lift enemies. Never deal damage at dash start.
      // FURY owns physical movement/collisions/terrain and KayKit pose.
      const raw=landingTarget?.clone()||at.clone().addScaledVector(dir,6);
      const toward=raw.clone().sub(at).setY(0);
      const distance=clamp(toward.length(),0,7.4);
      const travelDir=toward.lengthSq()>.01?toward.normalize():dir;
      if(p.onGround){
        p.onGround=false;p._jumpCount=Math.max(1,p._jumpCount||0);
        p._jumpBufferT=0;g.combat?.keepAirCombo?.('jump');
      }
      p.vel.y=Math.max(p.vel.y,8.6);
      if(distance>.65)p.startDash({direction:{x:travelDir.x,z:travelDir.z},
        speed:distance/.36,duration:.36,style:'dodge'});
      this.activeLeap={started:this.now(),deadline:this.now()+1.6,
        intended:raw.clone(),initial:at.clone(),landed:false};
      this.fx.ascend(at,travelDir);
      this.fx.signature.upwardPillar(at,'#b870ff',3.4,.58);
      this.fx.landingMarker(raw,2.45,1.17,0);
      this.announce('ASCENSO: ¡el daño y la elevación ocurren al aterrizar!');
    }
    if(slot===3){
      this.busyUntil=this.now()+.25;
      this.fx.tornado(g.player.pos.clone(),4,0,2.15);
      this.fx.signature.gravityFunnel(g.player.pos.clone(),'#b879fa',3.5,4.6,1.8);
      for(let tick=0;tick<11;tick++){
        this.schedule(tick*(2/11),()=>{
          this.hitSphere(g.player.pos,4.0,tick===10?55:22,{launch:true,stun:.34,height:7.3});
          this.fx.tick(g.player.pos.clone(),0,tick);
        });
      }
    }
  }
  rift(slot,dir){
    const p=this.game.player,at=p.pos.clone();
    if(slot===1){
      // Dyrroth S1: THREE distinct travelling slash-wave hit beats.
      for(let i=0;i<3;i++)this.schedule(.11*i,()=>{
        const now=p.pos.clone(),forward=dir.clone();
        this.hitCone(now,forward,4.7+i*.95,47,i===2?30:21,{height:2.7});
        this.fx.signature.groundWave(now,forward,3.3+i*1.25,
          i===2?'#ffb1a4':'#ee446f',.43,47,.40);
        this.fx.sparks(now.clone().addScaledVector(forward,1.6+i*.7),
          '#ff84a4',12,2.4,.30,.12);
      });
    }
    if(slot===2){
      p.startDash({direction:{x:dir.x,z:dir.z},speed:23,duration:.27,style:'dodge'});
      this.fx.launch(at,dir,1);
      this.fx.signature.rushLines(at,dir,'#ec5c9a',.45);
      this.schedule(.28,()=>{
        this.hitCone(p.pos,dir,3.0,70,60,{expose:true});
        this.fx.impact(p.pos.clone(),1,3);
        this.fx.signature.crescent(p.pos.clone(),dir,'#ff6f9f',.51,1.0);
      });
    }
    if(slot===3){
      this.fx.signature.darkExecution(at,dir,.70);
      this.schedule(.29,()=>{
        for(const e of this.candidates(p.pos,10,dir,15)){
          const d=e.group.position.clone().sub(p.pos).setY(0);
          const along=d.dot(dir),side=Math.abs(d.cross(dir).y);
          if(along<0||along>10||side>1.8+(e.hitRadius||0))continue;
          const missing=1-e.hp/Math.max(1,e.maxHp);
          this.struck(e,105+85*clamp(missing,0,1),dir);
        }
        const end=p.pos.clone().add(dir.clone().multiplyScalar(5));
        this.fx.impact(end,1,3.4);
        this.fx.signature.crescent(end,dir,'#ff728a',.54,1.65);
      });
    }
  }
  guardian(slot,dir){
    const p=this.game.player,at=p.pos.clone();
    if(slot===1){
      // Tigreal S1: three expanding iron-wave fronts, each individually hittable.
      for(let i=0;i<3;i++)this.schedule(.12*i,()=>{
        const now=p.pos.clone();
        for(const e of this.candidates(now,3.7+i*1.7,dir,57,2.6)){
          this.struck(e,22,dir);e.applySlow?.(.55,1.3);
        }
        this.fx.signature.groundWave(now,dir,3.0+i*1.7,
          i===2?'#fff4c8':'#dfba6a',.47,57,.38);
      });
    }
    if(slot===2){
      p.startDash({direction:{x:dir.x,z:dir.z},speed:17,duration:.36,style:'dodge'});
      this.guardianDash={until:this.now()+.36,dir:dir.clone(),touched:new Set()};
      this.fx.launch(at,dir,2);
      this.fx.signature.rushLines(at,dir,'#f2cc7e',.45);
      this.schedule(.37,()=>{
        this.guardianDash=null;
        this.hitSphere(p.pos,2.5,34,{push:1.8,height:2.8});
        this.fx.impact(p.pos.clone(),2,3);
      });
    }
    if(slot===3){
      // Tigreal ultimate: automatic suction, then terminal slam once.
      this.guardianPull={started:this.now(),expires:this.now()+1.75,lastTick:-1,
        targets:new Set()};
      this.fx.vortex(p.pos.clone(),4.8,2);
      this.fx.signature.gravityFunnel(p.pos.clone(),'#dfb967',4.8,4.9,1.65);
      this.announce('COLAPSO: absorbiendo enemigos hasta impacto final');
    }
  }

  updateGuardianDash(){
    const state=this.guardianDash;if(!state)return;
    if(this.now()>=state.until){this.guardianDash=null;return;}
    const center=this.game.player.pos,dir=state.dir;
    for(const e of this.candidates(center,2.1,dir,75,2.7)){
      if(e.boss||e.type==='dragon')continue;
      if(!state.touched.has(e)){
        state.touched.add(e);this.struck(e,16,dir,{height:2.7});
      }
      // Training targets travel IN FRONT of the caster on dash, not only at its end.
      const goal=center.clone().addScaledVector(dir,1.6);
      e.group.position.x+=(goal.x-e.group.position.x)*.6;
      e.group.position.z+=(goal.z-e.group.position.z)*.6;
      if(e.kbVel){e.kbVel.x=0;e.kbVel.z=0;}
    }
  }
  updateGuardianPull(){
    const state=this.guardianPull;
    if(!state)return;
    const t=this.now();
    if(t>=state.expires){this.finishGuardianPull();return;}
    if(state.lastTick>=0&&t-state.lastTick<.085)return;
    state.lastTick=t;
    const center=this.game.player.pos.clone();
    for(const enemy of this.candidates(center,4.8,null,180,5.5)){
      if(enemy.boss||enemy.type==='dragon')continue;
      const pull=center.clone().sub(enemy.group.position).setY(0);
      if(pull.lengthSq()<.3)continue;
      const impulse=Math.min(2.2,pull.length()*.55);
      enemy.kbVel?.add(pull.normalize().multiplyScalar(impulse));
      enemy.applySlow?.(.03,.17);
      state.targets.add(enemy);
    }
    if(Math.floor((t-state.started)*3)!==Math.floor((t-state.started-.09)*3))
      this.fx.orbit(center,3.4,2,.32);
  }
  finishGuardianPull(){
    if(!this.guardianPull)return 0;
    this.guardianPull=null;
    const center=this.game.player.pos.clone();
    const hits=this.hitSphere(center,4.8,105,{launch:true,stun:1.25,height:5.5});
    this.fx.landing(center,2,4.8);
    this.fx.signature.upwardPillar(center,'#fff0b8',4.8,.62);
    this.announce('¡IMPACTO DE GRAVEDAD! '+hits+' elevados · S3 completada');
    this.animatePlayer(3);
    return hits;
  }
  updateLeap(){
    const leap=this.activeLeap;
    if(!leap)return;
    const t=this.now(),p=this.game.player;
    if(t>leap.started+.28&&p.onGround&&p.dashT<0){
      // The real Tianjie collision/physics system confirmed ground contact.
      // Landing AoE at the ACTUAL position even if an obstacle shortened dash.
      const impactPoint=p.pos.clone();
      this.activeLeap=null;
      const count=this.hitSphere(impactPoint,2.45,84,{
        launch:true,stun:1.15
      });
      this.fx.landing(impactPoint,0,2.45);
      this.fx.signature.upwardPillar(impactPoint,'#d5aaff',3.2,.59);
      this.recastStyle=0;
      this.recastUntil=t+3.5;
      this.announce(count?
        '¡IMPACTO TERRESTRE! '+count+' enemigo(s) elevados · S3 → S2 ↻':
        '¡ATERRIZAJE! S3 y S2 ↻ disponibles');
    }else if(t>leap.deadline){
      // Never fake an impact while still airborne, submerged or blocked.
      this.activeLeap=null;
      this.recastStyle=0;this.recastUntil=t+2.0;
      this.announce('Ascenso interrumpido: sin golpe hasta tocar suelo');
    }
  }

  applyBurn(enemy,ticks=4,perTick=7,interval=.42){
    const n=Math.max(0,Math.min(8,ticks|0));
    for(let i=1;i<=n;i++){
      this.schedule(i*interval,()=>{
        if(!enemy?.alive)return;
        enemy.takeDamage(perTick,vec());
        if(i===n&&enemy.group?.position){
          this.fx.sparks(enemy.group.position.clone().add(vec(0,1,0)),
            '#ffae67',11,1.8,.35,.13);
        }
      });
    }
  }

  update(dt){
    const now=this.now(),g=this.game;
    if(this.focusTarget&&(!this.focusTarget.alive||this.focusTarget.removed||!this.focusTarget.group)){
      this.focusTarget=null;this.renderFocusLabel();
    }
    if(this.enemiesList!==g.enemies.list){
      this.enemiesList=g.enemies.list;this.training=[];this.lastSpawn=-1;
      this.events.length=0;
      this.ready=LAB_STYLES.map(()=>[0,0,0]);
      this.recastUntil=0;
      this.activeLeap=null;
      this.guardianPull=null;
      this.guardianDash=null;
      this.busyUntil=0;
    }
    if(this.lastSpawn<0){
      // EnemyManager owns the ONLY 1-3 skeleton targets: no extra spawns here.
      this.lastSpawn=now;
      this.training=g.enemies.list.filter(e=>e.training&&e.alive);
      this.trainingCount=g.enemies.trainingCount||1;
      this.syncTrainingUI();
    }
    this.updateLeap();
    this.updateGuardianDash();
    this.updateGuardianPull();
    this.airRupture.update(dt);
    for(let i=this.events.length-1;i>=0;i--){
      const ev=this.events[i];
      if(ev.at>now)continue;
      this.events.splice(i,1);
      if(now-ev.at<.24)ev.fn();
    }
    for(let i=this.projectiles.length-1;i>=0;i--){
      const pr=this.projectiles[i],old=pr.mesh.position.clone();
      const step=Math.min(pr.speed*dt,pr.remaining);
      pr.mesh.position.addScaledVector(pr.dir,step);
      if(pr.mesh.material?.uniforms?.uTime)
        pr.mesh.material.uniforms.uTime.value+=dt;
      pr.mesh.userData?.updateVfx?.(dt,pr.speed/30);
      if(pr.style===3)pr.mesh.rotateZ(dt*1.8);
      else pr.mesh.rotation.y+=dt*4;
      pr.remaining-=step;
      this.fx.projectile(pr.mesh.position.clone(),pr.style);
      let impact=false;
      if(!hasLineOfSight(g,{x:old.x,y:old.y,z:old.z},{
        x:pr.mesh.position.x,y:pr.mesh.position.y,z:pr.mesh.position.z}))impact=true;
      if(!impact){
        // Full 3D swept hitbox. Never filter flying targets using ground distance.
        const possible=g.combat.collectTargets();
        for(const e of possible){
          if(!e?.alive||!e.group)continue;
          if(pr.aerialBasic&&e!==pr.target)continue; // focused shot has one real target
          const contact=sweptProjectileHit22(old,pr.mesh.position,
            enemyChest22(e),Math.max(.4,e.hitRadius||.9)+.39);
          if(contact){
            const closest=old.clone().lerp(pr.mesh.position,contact.t);
            this.struck(e,pr.damage??65,pr.dir);
            if(pr.aerialBasic)this.airRupture.confirm(e,closest);
            if(pr.style===3 && pr.burn)this.claudeFx.fireImpact(closest);
            if(pr.burn)this.applyBurn(e,pr.burn.ticks,pr.burn.perTick,pr.burn.interval);
            else e.applySlow?.(.72,1.3);
            this.fx.impact(closest,pr.style,1.5);
            impact=true;break;
          }
        }
      }
      if(impact||pr.remaining<=0){
        g.scene.remove(pr.mesh);
        pr.mesh.traverse(obj=>{
          obj.geometry?.dispose();
          if(obj.material)
            for(const m of (Array.isArray(obj.material)?obj.material:[obj.material]))m.dispose();
        });
        this.projectiles.splice(i,1);
      }
    }
    this.fx.update(dt);
    if(this.aim)this.refreshPreview();
    if(now-this.lastHud>.11){this.lastHud=now;this.renderHud();}
  }

  spawnTraining(manual=true,count=this.trainingCount){
    const g=this.game;
    if(g.state!=='playing'||!g.enemies?.trainingLab)return false;
    this.trainingCount=3;
    g.enemies.configureTrainingTargets(3);
    // A recreated target is a NEW entity: never keep a stale focus pointer.
    this.focusTarget=null;this.focusPanelOpen=false;
    this.renderMonsterSelector();
    this.training=g.enemies.list.filter(e=>e.training&&e.alive);
    this.enemiesList=g.enemies.list;
    this.lastSpawn=this.now();
    this.syncTrainingUI();
    if(manual)this.announce('UNA ISLA · 3 esqueletos delante · DRAGÓN volador detrás · Sin IA · Daño real');
    return true;
  }
  resetTraining(){
    const done=this.spawnTraining(false,3);
    if(!done)return;
    // A training reset is explicit; it must not change P16 damage/combo rules.
    this.game.stats.hp=this.game.stats.maxHp;
    this.game.stats.mp=this.game.stats.maxMp;
    this.game.stats.sp=this.game.stats.maxSp;
    this.ready=LAB_STYLES.map(()=>[0,0,0]);
    this.recastUntil=0;this.recastStyle=-1;
    this.airRupture.reset();
    this.game.combat.breakCombo?.('training-reset');
    this.announce('Prueba reiniciada · HP/MP/Energía recuperados');
    this.renderHud(true);
  }
  syncTrainingUI(){
    const button=this.root?.querySelector('#hf-lab-train');
    if(button){
      button.textContent='3 BLANCOS + 🐉';
      button.setAttribute('aria-label',
        'Una isla de entrenamiento con tres enemigos terrestres y un dragón volador');
    }
  }

  installHud(){
    const root=document.createElement('div');
    root.id='hf-tianjie-skills-lab';
    root.setAttribute('translate','no');
    root.innerHTML=`<div class="hf-lab-top">
      <strong class="hf-lab-title">HIGHFLY <span>FURY P16 · LAB L26 ÚNICO · VFX RECUPERADOS · HUD EDITABLE</span></strong>
      <div class="hf-lab-modes">
        <button type="button" data-style="0">✦ AÉREA</button>
        <button type="button" data-style="1">⚔ ABISAL</button>
        <button type="button" data-style="2">◉ GUARDIÁN</button>
        <button type="button" data-style="3">☄ CLAUDE MAGO</button>
        <button type="button" data-style="4">✦ CLAUDE PÍCARO</button>
      </div>
      <div class="hf-lab-sub">
        <span id="hf-lab-readout">S1 · S2 · S3 NUEVAS | S4 WULD ORIGINAL</span>
        <button type="button" id="hf-lab-train">3 BLANCOS + 🐉</button>
        <button type="button" id="hf-lab-reset">REINICIAR</button>
        <button type="button" id="hf-l23-focus" aria-expanded="false" aria-label="Enfocar monstruo volador">◎ ENFOCAR</button>

        <button type="button" id="hf-lab-cancel" hidden>CANCELAR</button>
      </div>
      <div id="hf-lab-message" role="status">FURY P16 intacto · Objetivos inmóviles · Daño real · Sin agresión</div>
    </div><div id="hf-l23-target-panel" hidden aria-label="Seleccionar monstruo"></div>`;
    document.body.appendChild(root);
    this.root=root;
    this.readout=root.querySelector('#hf-lab-readout');
    this.note=root.querySelector('#hf-lab-message');
    this.cancelBtn=root.querySelector('#hf-lab-cancel');
    this.focusBtn=root.querySelector('#hf-l23-focus');
    this.focusPanel=root.querySelector('#hf-l23-target-panel');
    // Move X outside the transformed top dock: CSS fixed must anchor to screen.
    root.appendChild(this.cancelBtn);
    // The control must live beside ATK/USAR in the NATIVE touch HUD.
    // Keeping it under the lab overlay leaves a zero-size hidden ancestor
    // on some mobile boot/selection frames and defeats editing.
    this.focusBtn.classList.add('hf-p810-control','hf-p810-icon','hf-l26-focus');
    this.game.touch.root.appendChild(this.focusBtn);
    for(const b of root.querySelectorAll('[data-style]'))
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.setStyle(Number(b.dataset.style));});
    root.querySelector('#hf-lab-train').addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      this.announce('ISLA ÚNICA: enfrente 3 monstruos quietos; detrás el dragón volador · ENFOCAR para seleccionarlo');
    });
    root.querySelector('#hf-lab-reset').addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();this.resetTraining();
    });
    this.syncTrainingUI();
    this.focusBtn.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      const flyers=this.aerialFocusCandidates();
      if(flyers.length===1){
        const selected=flyers[0].enemy;
        this.focusTarget=this.focusTarget===selected?null:selected;
        this.focusPanelOpen=false;
        this.renderMonsterSelector();
        if(this.focusTarget)this.game.hud?.showEnemyHP?.(selected);
        this.announce(this.focusTarget?'Dragón enfocado · ATK = energía aérea':'Enfoque liberado · AIM manual');
      }else{
        this.focusPanelOpen=!this.focusPanelOpen;
        this.renderMonsterSelector();
      }
    });
    this.renderFocusLabel();

    this.cancelBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.cancelAim();});
    this.renderHud(true);
  }
  renderHud(force=false){
    if(!this.root)return;
    const playing=this.game.state==='playing';
    this.root.classList.toggle('playing',playing);
    this.renderFocusLabel();
    if(!playing&&!force)return;
    const def=this.styleDef();
    for(const b of this.root.querySelectorAll('[data-style]'))
      b.classList.toggle('active',Number(b.dataset.style)===this.style);
    this.ensureFocusEditor();
    this.syncControlAnchors();
    this.readout.textContent=def.name+' · '+((this.style===0||this.style===3)?'MANÁ':'ENERGÍA')+
      (this.style===2&&this.guardianPull?' · S3 SEGUNDA FASE DISPONIBLE':'')+
      ' · S1 '+def.names[0]+' | S2 '+(this.canRecast()?'¡RECAST DISPONIBLE!':def.names[1])+
      ' | S3 '+def.names[2];
    // Use EXISTING P14 S1-S3 buttons, not duplicates. CSS shows labels from
    // data attribute while original updates may continue under the hood.
    for(let slot=1;slot<=3;slot++){
      const b=document.querySelector('.hf-p5-s'+slot);
      if(!b)continue;
      const cd=this.cooldown(slot);
      b.dataset.hfLabLabel=(slot===3&&this.style===2&&this.guardianPull?'S3 ↻':
        slot===2&&this.canRecast()?'S2 ↻':'S'+slot)+
        (cd>.05?'\n'+Math.ceil(cd)+'s':'');
      b.setAttribute('aria-label',def.names[slot-1]);
      b.classList.toggle('hf-lab-cooling',cd>.05);
      b.classList.remove('hf-p5-locked');
    }
  }
  renderFocusLabel(){
    if(!this.focusBtn)return;
    const e=this.focusTarget;
    if(e&&(!e.alive||!e.group||e.removed))this.focusTarget=null;
    const f=this.focusTarget;
    const flying=f&&this.airRupture.isFlyer(f);
    this.focusBtn.textContent=f?(flying?'◎ ENFOCADO':'◎ EN TIERRA'):'◎ ENFOCAR';
    this.focusBtn.title=f?(flying?'ATK dispara al volador enfocado':'Dragón derribado: ATK terrestre FURY'):'Enfocar monstruo volador';
    this.focusBtn.classList.toggle('active',!!f);
    this.focusBtn.setAttribute('aria-expanded',String(!!this.focusPanelOpen));
  }
  aerialFocusCandidates(){
    const g=this.game,p=g.player.pos,from={x:p.x,y:p.y+1.25,z:p.z};
    return availableMonsters23(g.combat.collectTargets(),from,
      (x,z)=>g.terrain.getHeight(x,z),{
        range:38,visible:(_enemy,q)=>hasLineOfSight(g,from,q)
      }).filter(item=>item.air);
  }
  ensureFocusEditor(){
    // L26: the ENFOCAR control participates in the real P10 editor, including
    // drag, size, opacity, and persistent normalized coordinates. Never pin it
    // to the ATK rect on every frame: that would undo the user's changes.
    const editor=this.game.touch?.premium?.p810?.editor;
    if(!editor||this.focusEditor===editor)return;
    const hadSavedLayout=(()=>{
      try{return !!localStorage.getItem('hf_p812_hud_layout_v2');}
      catch(_){return true;}
    })();
    editor.register('focus',this.focusBtn);
    this.focusEditor=editor;
    if(!hadSavedLayout){
      // Fresh LAB default:        ATK
      //                     USAR     ENFOCAR
      // Existing customized HUD layouts remain untouched.
      Object.assign(editor.layout.atk,{x:.83,y:.535,size:83});
      Object.assign(editor.layout.use,{x:.71,y:.835,size:49});
      Object.assign(editor.layout.focus,{x:.91,y:.835,size:43});
    }
    editor.apply();
  }
  syncControlAnchors(){
    // CANCELAR is contextual and follows MOCHILA; ENFOCAR never follows ATK.
    const position=(button,anchor,size)=>{
      if(!button||!anchor)return;
      const r=anchor.getBoundingClientRect();
      if(r.width<10||r.height<10)return;
      let x=r.right+7;
      if(x+size>innerWidth-7)x=r.left-size-7;
      const y=Math.max(5,Math.min(innerHeight-size-5,r.top+(r.height-size)/2));
      button.style.left=Math.max(5,x)+'px';
      button.style.top=y+'px';
    };
    position(this.cancelBtn,document.querySelector('#hf-p810-bag'),46);
  }
  renderMonsterSelector(){
    const panel=this.focusPanel;if(!panel)return;
    panel.hidden=!this.focusPanelOpen;
    this.renderFocusLabel();
    if(!this.focusPanelOpen)return;
    panel.replaceChildren();
    const heading=document.createElement('div');
    heading.className='hf-l23-panel-title';
    heading.textContent='ENFOCAR · SOLO MONSTRUOS VOLADORES';
    panel.appendChild(heading);
    const clear=document.createElement('button');
    clear.type='button';clear.textContent='✕ LIBERAR ENFOQUE';
    clear.addEventListener('pointerdown',ev=>{
      ev.preventDefault();ev.stopPropagation();
      this.focusTarget=null;this.focusPanelOpen=false;
      this.renderMonsterSelector();this.announce('Enfoque liberado · AIM manual');
    });
    panel.appendChild(clear);
    const g=this.game;
    const candidates=this.aerialFocusCandidates();
    if(!candidates.length){
      const note=document.createElement('p');
      note.textContent='No hay voladores visibles dentro del alcance.';
      panel.appendChild(note);return;
    }
    for(const item of candidates.slice(0,14)){
      const b=document.createElement('button');b.type='button';
      b.className='hf-l23-target-row';
      const selected=this.focusTarget===item.enemy;
      b.textContent=(selected?'✓ ':'○ ')+'🪽 AÉREO · '+item.name+' · ATK de energía';
      b.addEventListener('pointerdown',ev=>{
        ev.preventDefault();ev.stopPropagation();
        this.focusTarget=item.enemy;
        this.focusPanelOpen=false;this.renderMonsterSelector();
        g.hud?.showEnemyHP?.(item.enemy);
        this.announce('Enfocado: '+item.name+' · ATK energía / Ruptura Aérea');
      });
      panel.appendChild(b);
    }
  }
  bindKeyboard(){
    document.addEventListener('keydown',e=>{
      if(this.game.state!=='playing'||e.repeat)return;
      const n={Digit5:0,Digit6:1,Digit7:2,Digit8:3,Digit9:4}[e.code];
      if(n!==undefined)this.setStyle(n);
      if(e.code==='Escape'&&this.aim)this.cancelAim();
    },true);
  }
  attachTouchButtons(){
    // Intercept ORIGINAL S1-S3 controls, no second overlapping buttons.
    // Pointer capture works with drag from the skill icon to any direction.
    for(let slot=1;slot<=3;slot++){
      const b=document.querySelector('.hf-p5-s'+slot);
      if(!b||b.dataset.hfLabBound)continue;
      b.dataset.hfLabBound='p16';
      b.addEventListener('pointerdown',e=>{
        if(this.game.state!=='playing'||this.game.input.hudEditing)return;
        e.preventDefault();e.stopImmediatePropagation();
        this.cancelAim();
        if(this.focusPanelOpen){this.focusPanelOpen=false;this.renderMonsterSelector();}
        try{b.setPointerCapture(e.pointerId);}catch(_){}
        const p=this.game.player;
        this.aim={
          slot,id:e.pointerId,x:e.clientX,y:e.clientY,
          dragged:false,button:b,dir:null,target:null,
          startOrigin:p.pos.clone(),baseForward:p.getForward(),
          pointerX:e.clientX,pointerY:e.clientY,cancelHovered:false,
          valid:true
        };
        this.cancelBtn.hidden=false;
        this.makePreview(slot);
      },true);
      b.addEventListener('pointermove',e=>{
        if(!this.aim||this.aim.id!==e.pointerId)return;
        e.preventDefault();e.stopImmediatePropagation();
        const a=this.aim,dx=e.clientX-a.x,dy=e.clientY-a.y;
        a.pointerX=e.clientX;a.pointerY=e.clientY;
        a.cancelHovered=isCancelDrop22(e.clientX,e.clientY,this.cancelBtn.getBoundingClientRect());
        this.cancelBtn.classList.toggle('hf-cancel-hover',a.cancelHovered);
        if(a.cancelHovered)return;
        if(Math.hypot(dx,dy)>(this.aimDragThreshold??4))a.dragged=true;
        if(!a.dragged)return;
        const pr=this.aimGuide.profile||AIM_PROFILES[this.style][slot-1];
        if(pr.kind==='self'){
          this.refreshPreview();return;
        }
        const forward=a.baseForward,right=vec(-forward.z,0,forward.x);
        if(pr.kind==='zone'){
          const forwardDist=Math.min(pr.range*.76,pr.range<9?5.4:13);
          const sensitivity=this.aimSensitivity??.145;
          const delta=right.multiplyScalar(dx*sensitivity)
            .addScaledVector(forward,clamp(forwardDist-dy*sensitivity,.2,pr.range));
          if(delta.length()>pr.range)delta.setLength(pr.range);
          const target=this.game.player.pos.clone().add(delta);
          target.y=this.game.terrain.getHeight(target.x,target.z);
          a.target=target;
          if(delta.lengthSq()>.001)a.dir=delta.normalize();
        }else{
          const aimScale=(this.aimSensitivity??.145)/.145;
          const delta=right.multiplyScalar(dx*1.35*aimScale)
            .addScaledVector(forward,18-dy*1.35*aimScale);
          if(delta.lengthSq()>.005)a.dir=delta.normalize();
        }
        this.refreshPreview();
      },true);
      b.addEventListener('pointerup',e=>{
        if(!this.aim||this.aim.id!==e.pointerId)return;
        e.preventDefault();e.stopImmediatePropagation();
        const a=this.aim,dir=a.dir,target=a.target,valid=this.aimGuide.valid;
        // Pointer captured by skill button; coordinates still reach the top-right X.
        const shouldCancel=isCancelDrop22(e.clientX,e.clientY,this.cancelBtn.getBoundingClientRect());
        this.cancelAim();
        if(shouldCancel)return; // zero resource, zero cooldown
        if(!valid){
          this.announce('Apuntado bloqueado: elegí un lugar libre');
          return; // no cooldown, no resource spent
        }
        this.cast(slot,dir,'pointer',target,a.dragged?'manual':'auto');
      },true);
      for(const type of ['pointercancel','lostpointercapture'])
        b.addEventListener(type,e=>{
          if(this.aim?.id===e.pointerId)this.cancelAim();
        },true);
    }
  }
  makePreview(slot){
    if(!this.aim)return;
    // Aerial S2 recast is a directional blink, not the landing circle.
    const recast=this.style===0&&slot===2&&this.canRecast();
    const recastProfile=recast?{kind:'dash',range:4.4,width:2.7,radius:0}:null;
    this.aimGuide.begin(this.style,slot,recastProfile);
    this.preview=this.aimGuide.root;
    let dir=this.aimDirection(null,this.aimGuide.profile.range||17,slot);
    // Start with airborne-only lock/assist from aimDirection; never snap to
    // the floor targets merely because they're currently targeted.
    this.aim.dir=dir;
    this.refreshPreview();
  }
  refreshPreview(){
    if(!this.aim)return;
    const a=this.aim,p=this.game.player;
    const prof=this.aimGuide.profile||AIM_PROFILES[this.style][a.slot-1];
    // While preparing a focused shot the beam follows a moving flyer.
    if(!a.dragged)a.dir=this.aimDirection(null,prof.range||17,a.slot);
    const dir=a.dir||this.aimDirection(null,prof.range||17,a.slot);
    let target=a.target;
    if(prof.kind==='zone'&&!target){
      // Terrain telegraphs always start from the player's own direction.
      target=p.pos.clone().addScaledVector(dir,
        Math.min(prof.range*.76,prof.range<9?5.4:13));
    }
    const result=this.aimGuide.updateAim(dir,target);
    if(result){
      a.valid=result.valid;
      if(prof.kind==='zone'){
        a.target=result.target;
        const d=result.target.clone().sub(p.pos).setY(0);
        if(d.lengthSq()>.001)a.dir=d.normalize();
      }
    }
  }
  cancelAim(){
    this.aim=null;
    if(this.cancelBtn){this.cancelBtn.hidden=true;this.cancelBtn.classList.remove('hf-cancel-hover');}
    this.preview=null;
    this.aimGuide?.clear();
  }

}
