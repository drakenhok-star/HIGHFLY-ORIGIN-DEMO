import * as THREE from 'three';
import { hasLineOfSight, insideBlockingObject } from '../combat/targeting-p6.js';
import { TianjieSkillVfx } from './lab-vfx.js';
import { TianjieAimGuide, AIM_PROFILES } from './aim-guide-p16.js';
import { castClaudeSkill } from './claudecraft-kit-p16.js';
import {aerialDirection22,enemyChest22,directionToTarget22,targetWithinSkillVolume22,isCancelDrop22} from './aerial-aim-l22.js';

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
    this.aimGuide=new TianjieAimGuide(game);
    this.activeLeap=null;
    this.guardianPull=null;
    this.guardianDash=null;
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
    this.bindingCheck=setInterval(()=>this.attachTouchButtons(),700);
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
    const originalCast=g.combat.cast.bind(g.combat);
    const originalShout=g.combat.shout.bind(g.combat);
    const originalUpdate=g.combat.update.bind(g.combat);
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
    this.original={cast:originalCast,shout:originalShout,update:originalUpdate};
  }

  aimDirection(request,maxRange=17){
    // Preserve actual elevation for projectile skills; all others stay terrain-facing.
    if(request&&request.lengthSq()>0.01){
      if((this.style===0||this.style===3)&&request.y!==undefined)
        return request.clone().normalize();
      return request.clone().setY(0).normalize();
    }
    const g=this.game,p=g.player;
    const target=g.targeting?.get(maxRange);
    if(target?.alive){
      const d=target.group.position.clone().sub(p.pos).setY(0);
      if(d.lengthSq()>0.01)return d.normalize();
    }
    const f=p.getCombatForward();
    return f.lengthSq()>0.01?f.normalize():p.getForward();
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
  cast(slot,requested=null,origin='touch',requestedTarget=null){
    const g=this.game;
    if(g.state!=='playing'||slot<1||slot>3)return false;
    if(g.stats.hp<=0)return false;
    const t=this.now(),dir=this.aimDirection(requested);
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
      const raw=requestedTarget?.clone() ||
        this.game.targeting?.get(pr.range)?.group?.position?.clone() ||
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
    if(this.style===0)this.aerial(slot,dir,groundTarget);
    else if(this.style===1)this.rift(slot,dir);
    else if(this.style===2)this.guardian(slot,dir);
    else castClaudeSkill(this,slot,dir,groundTarget);
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
  aerial(slot,dir,landingTarget=null){
    const g=this.game,p=g.player,at=p.pos.clone();
    if(slot===1){
      this.fx.launch(at,dir,0);
      const geo=new THREE.SphereGeometry(.27,10,8);
      const mat=new THREE.MeshStandardMaterial({
        color:0xa46aff,emissive:0xaa55ff,emissiveIntensity:2.3
      });
      const mesh=new THREE.Mesh(geo,mat);
      mesh.position.copy(at).add(vec(0,1.2,0)).add(dir.clone().multiplyScalar(.7));
      g.scene.add(mesh);
      this.projectiles.push({mesh,dir:dir.clone(),speed:28,remaining:17,style:0});
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
      this.fx.landingMarker(raw,2.45,1.17,0);
      this.announce('ASCENSO: ¡el daño y la elevación ocurren al aterrizar!');
    }
    if(slot===3){
      this.busyUntil=this.now()+.25;
      this.fx.tornado(g.player.pos.clone(),4,0,2.15);
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
        this.fx.slash(now.clone().addScaledVector(forward,i*.6),forward,1);
      });
    }
    if(slot===2){
      p.startDash({direction:{x:dir.x,z:dir.z},speed:23,duration:.27,style:'dodge'});
      this.fx.launch(at,dir,1);
      this.schedule(.28,()=>{
        this.hitCone(p.pos,dir,3.0,70,60,{expose:true});
        this.fx.impact(p.pos.clone(),1,3);
      });
    }
    if(slot===3){
      this.fx.slash(at.clone().add(dir.clone().multiplyScalar(3)),dir,1);
      this.schedule(.29,()=>{
        for(const e of this.candidates(p.pos,10,dir,15)){
          const d=e.group.position.clone().sub(p.pos).setY(0);
          const along=d.dot(dir),side=Math.abs(d.cross(dir).y);
          if(along<0||along>10||side>1.8+(e.hitRadius||0))continue;
          const missing=1-e.hp/Math.max(1,e.maxHp);
          this.struck(e,105+85*clamp(missing,0,1),dir);
        }
        this.fx.impact(p.pos.clone().add(dir.clone().multiplyScalar(5)),1,3.4);
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
        this.fx.slash(now.clone().addScaledVector(dir,i*.85),dir,2);
        this.fx.ring(now,2.8+i*.7,PALETTE[2],.32);
      });
    }
    if(slot===2){
      p.startDash({direction:{x:dir.x,z:dir.z},speed:17,duration:.36,style:'dodge'});
      this.guardianDash={until:this.now()+.36,dir:dir.clone(),touched:new Set()};
      this.fx.launch(at,dir,2);
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
        const possible=this.candidates(old,step+1.3);
        for(const e of possible){
          const to=e.group.position.clone().add(vec(0,1,0)).sub(old);
          const projection=clamp(to.dot(pr.dir),0,step);
          const closest=old.clone().addScaledVector(pr.dir,projection);
          if(closest.distanceTo(e.group.position.clone().add(vec(0,1,0)))<(e.hitRadius||1)+.39){
            this.struck(e,pr.damage??65,pr.dir);
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
    this.trainingCount=count===3?3:1;
    g.enemies.configureTrainingTargets(this.trainingCount);
    this.training=g.enemies.list.filter(e=>e.training&&e.alive);
    this.enemiesList=g.enemies.list;
    this.lastSpawn=this.now();
    this.syncTrainingUI();
    if(manual)this.announce(this.trainingCount===3
      ?'3 objetivos quietos · Sin IA ni ataques · Reciben daño real'
      :'1 objetivo quieto · Sin IA ni ataques · Recibe daño real');
    return true;
  }
  resetTraining(){
    const done=this.spawnTraining(false,this.trainingCount);
    if(!done)return;
    // A training reset is explicit; it must not change P16 damage/combo rules.
    this.game.stats.hp=this.game.stats.maxHp;
    this.game.stats.mp=this.game.stats.maxMp;
    this.game.stats.sp=this.game.stats.maxSp;
    this.ready=LAB_STYLES.map(()=>[0,0,0]);
    this.recastUntil=0;this.recastStyle=-1;
    this.game.combat.breakCombo?.('training-reset');
    this.announce('Prueba reiniciada · HP/MP/Energía recuperados');
    this.renderHud(true);
  }
  syncTrainingUI(){
    const button=this.root?.querySelector('#hf-lab-train');
    if(button){
      button.textContent='OBJ: '+this.trainingCount+' / 3';
      button.setAttribute('aria-label',
        'Cambiar entre uno y tres objetivos estáticos');
    }
  }

  installHud(){
    const root=document.createElement('div');
    root.id='hf-tianjie-skills-lab';
    root.setAttribute('translate','no');
    root.innerHTML=`<div class="hf-lab-top">
      <strong class="hf-lab-title">HIGHFLY <span>FURY P16 + SKILL LAB L22 · CÁMARA HÍBRIDA</span></strong>
      <div class="hf-lab-modes">
        <button type="button" data-style="0">✦ AÉREA</button>
        <button type="button" data-style="1">⚔ ABISAL</button>
        <button type="button" data-style="2">◉ GUARDIÁN</button>
        <button type="button" data-style="3">☄ CLAUDE MAGO</button>
        <button type="button" data-style="4">✦ CLAUDE PÍCARO</button>
      </div>
      <div class="hf-lab-sub">
        <span id="hf-lab-readout">S1 · S2 · S3 NUEVAS | S4 WULD ORIGINAL</span>
        <button type="button" id="hf-lab-train">OBJ: 1 / 3</button>
        <button type="button" id="hf-lab-reset">REINICIAR</button>

        <button type="button" id="hf-lab-cancel" hidden>CANCELAR</button>
      </div>
      <div id="hf-lab-message" role="status">FURY P16 intacto · Objetivos inmóviles · Daño real · Sin agresión</div>
    </div>`;
    document.body.appendChild(root);
    this.root=root;
    this.readout=root.querySelector('#hf-lab-readout');
    this.note=root.querySelector('#hf-lab-message');
    this.cancelBtn=root.querySelector('#hf-lab-cancel');
    // Move X outside the transformed top dock: CSS fixed must anchor to screen.
    root.appendChild(this.cancelBtn);
    for(const b of root.querySelectorAll('[data-style]'))
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.setStyle(Number(b.dataset.style));});
    root.querySelector('#hf-lab-train').addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      this.spawnTraining(true,this.trainingCount===1?3:1);
    });
    root.querySelector('#hf-lab-reset').addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();this.resetTraining();
    });
    this.syncTrainingUI();

    this.cancelBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.cancelAim();});
    this.renderHud(true);
  }
  renderHud(force=false){
    if(!this.root)return;
    const playing=this.game.state==='playing';
    this.root.classList.toggle('playing',playing);
    if(!playing&&!force)return;
    const def=this.styleDef();
    for(const b of this.root.querySelectorAll('[data-style]'))
      b.classList.toggle('active',Number(b.dataset.style)===this.style);
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
        }else if(pr.kind==='line'&&(this.style===0||this.style===3)&&slot===1){
          const v=aerialDirection22(forward,dx,dy,(this.aimSensitivity??.145)/.145);
          a.dir=vec(v.x,v.y,v.z);
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
        this.cast(slot,dir,'pointer',target);
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
    let dir=this.aimDirection(null,this.aimGuide.profile.range||17);
    if((this.style===0||this.style===3)&&slot===1){
      const e=this.game.targeting?.get(this.aimGuide.profile.range||17);
      const p=this.game.player.pos,enemy=e?enemyChest22(e):null;
      const launch={x:p.x,y:p.y+1.25,z:p.z};
      const v=directionToTarget22(launch,enemy);
      if(v)dir=vec(v.x,v.y,v.z);
    }
    this.aim.dir=dir;
    this.refreshPreview();
  }
  refreshPreview(){
    if(!this.aim)return;
    const a=this.aim,p=this.game.player;
    const prof=this.aimGuide.profile||AIM_PROFILES[this.style][a.slot-1];
    const dir=a.dir||this.aimDirection(null,prof.range||17);
    let target=a.target;
    if(prof.kind==='zone'&&!target){
      const lock=this.game.targeting?.get(prof.range);
      if(lock?.alive&&lock.group)target=lock.group.position.clone();
      else target=p.pos.clone().addScaledVector(dir,
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
