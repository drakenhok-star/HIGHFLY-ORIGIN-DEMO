import * as THREE from 'three';
import { hasLineOfSight, insideBlockingObject } from '../combat/targeting-p6.js';
import { TianjieSkillVfx } from './lab-vfx.js';

// Tianjie FURY P14 remains authoritative for camera, physics, KayKit rig,
// locomotion, jump, dash, aerial combos, ATK and world RPG. This module owns
// ONLY extra skill rules, skill-specific enemy states and lab HUD input.
export const LAB_STYLES = Object.freeze([
  Object.freeze({ name:'HECHICERA AÉREA',short:'AÉREA',cost:[14,23,40],cd:[4.4,15,40],
    names:['LANZA VIOLETA','ASCENSO / RECAST','TEMPESTAD'] }),
  Object.freeze({ name:'ASALTANTE ABISAL',short:'ABISAL',cost:[18,25,42],cd:[5,12,32],
    names:['CORTES DE FURIA','PASO / RECAST','CORTE FINAL'] }),
  Object.freeze({ name:'GUARDIÁN GRAVITACIONAL',short:'GUARDIÁN',cost:[18,25,42],cd:[6,14,44],
    names:['ONDA DE HIERRO','EMBESTIDA / RECAST','COLAPSO'] })
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
    this.aim=null;
    this.preview=null;
    this.aimPoint=null;
    this.enemiesList=null;
    this.training=[];
    this.lastHud=-1;
    this.lastSpawn=-1;
    this.lastPlay=false;
    this.quality=1;
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
    this.style=clamp(i|0,0,2);
    // Keep cooldowns per style; only old recast gets cleared.
    this.recastUntil=0;this.recastStyle=-1;
    this.renderHud(true);
  }
  cooldown(slot){
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
    if(request&&request.lengthSq()>0.01)return request.clone().setY(0).normalize();
    const g=this.game,p=g.player;
    const target=g.targeting?.get(maxRange);
    if(target?.alive){
      const d=target.group.position.clone().sub(p.pos).setY(0);
      if(d.lengthSq()>0.01)return d.normalize();
    }
    const f=p.getCombatForward();
    return f.lengthSq()>0.01?f.normalize():p.getForward();
  }
  candidates(center,range,dir=null,halfAngle=180){
    const g=this.game,origin={x:center.x,y:center.y+1.2,z:center.z};
    return g.combat.collectTargets().filter(e=>{
      if(!e?.alive||!e.group)return false;
      const diff=e.group.position.clone().sub(center);
      diff.y=0;
      if(diff.length()>range+(e.hitRadius||.6))return false;
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
    const enemies=this.candidates(center,radius);
    for(const e of enemies){
      const direction=e.group.position.clone().sub(center).setY(0).normalize();
      this.struck(e,damage,direction,opts);
    }
    return enemies.length;
  }
  hitCone(center,dir,radius,halfAngle,damage,opts={}){
    const enemies=this.candidates(center,radius,dir,halfAngle);
    for(const e of enemies)this.struck(e,damage,dir,opts);
    return enemies.length;
  }
  schedule(delay,fn){this.events.push({at:this.now()+delay,fn});}
  consume(slot){
    const def=this.styleDef(),price=def.cost[slot-1],stats=this.game.stats;
    return this.style===0?stats.useMagicka(price):stats.useStamina(price);
  }
  cast(slot,requested=null,origin='touch'){
    const g=this.game;
    if(g.state!=='playing'||slot<1||slot>3)return false;
    if(g.stats.hp<=0)return false;
    const t=this.now(),dir=this.aimDirection(requested);
    if(slot===2&&this.canRecast()){
      if(g.player.dashT>=0)return false;
      this.recastUntil=0;
      g.player.startDash({direction:{x:dir.x,z:dir.z},speed:24,duration:.18,style:'dodge'});
      this.fx.launch(g.player.pos.clone(),dir,this.style);
      if(this.style===1)this.schedule(.18,()=>{
        this.hitCone(g.player.pos,dir,3.3,65,68,{expose:true});
        this.fx.impact(g.player.pos.clone(),1,2.9);
      });
      if(this.style===2)this.schedule(.18,()=>{
        this.hitSphere(g.player.pos,2.8,55,{launch:true,stun:.55});
        this.fx.impact(g.player.pos.clone(),2,2.8);
      });
      return true;
    }
    if(this.cooldown(slot)>0.01||t<this.busyUntil)return false;
    if(slot===2&&g.player.dashT>=0)return false;
    if(!this.consume(slot)){this.announce(this.style===0?'MANÁ insuficiente':'ENERGÍA insuficiente');return false;}
    this.ready[this.style][slot-1]=t+this.styleDef().cd[slot-1];
    this.busyUntil=t+(slot===3?.30:.12);
    if(slot===2){
      this.recastStyle=this.style;
      this.recastUntil=t+3.5;
    }
    if(this.style===0)this.aerial(slot,dir);
    else if(this.style===1)this.rift(slot,dir);
    else this.guardian(slot,dir);
    this.animatePlayer(slot);
    this.renderHud(true);
    return true;
  }
  animatePlayer(slot){
    const p=this.game.player;
    // Combat animations use the actual KayKit barbarian animation controller.
    // There is no new animation rig and never a substituted test avatar.
    if(this.style===0){
      p.castT=0;p._castAnimStarted=false;
    }else{
      p.attackT=0;p._attackAnimStarted=false;
      p.attackClip=slot===1?'1H_Melee_Attack_Slice_Horizontal':
        slot===2?'1H_Melee_Attack_Slice_Diagonal':'1H_Melee_Attack_Chop';
    }
    p.actionDuration=slot===3?.42:.32;
  }
  aerial(slot,dir){
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
      if(p.onGround)p.vel.y=Math.max(p.vel.y,8.3);
      p.startDash({direction:{x:dir.x,z:dir.z},speed:17,duration:.4,style:'dodge'});
      this.fx.launch(at,dir,0);
      this.schedule(.41,()=>{
        const hit=this.hitSphere(g.player.pos,2.45,84,{launch:true,stun:1.15});
        this.fx.impact(g.player.pos.clone(),0,2.45);
        if(hit)this.announce('¡ELEVACIÓN! Encadená S3.');
      });
    }
    if(slot===3){
      this.busyUntil=this.now()+.25;
      for(let tick=0;tick<11;tick++){
        this.schedule(tick*(2/11),()=>{
          this.hitSphere(g.player.pos,4.0,tick===10?55:22,{launch:true,stun:.34});
          this.fx.tick(g.player.pos.clone(),0,tick);
        });
      }
    }
  }
  rift(slot,dir){
    const p=this.game.player,at=p.pos.clone();
    if(slot===1){
      this.hitCone(p.pos,dir,6.7,47,54);
      this.fx.slash(at,dir,1);
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
      for(const e of this.candidates(p.pos,7,dir,57)){
        this.struck(e,50,dir);
        e.applySlow?.(.55,1.3);
      }
      this.fx.slash(at,dir,2);
      this.fx.ring(at,5,PALETTE[2],.5);
    }
    if(slot===2){
      p.startDash({direction:{x:dir.x,z:dir.z},speed:17,duration:.36,style:'dodge'});
      this.fx.launch(at,dir,2);
      this.schedule(.37,()=>{
        this.hitSphere(p.pos,3,45,{push:4.6});
        this.fx.impact(p.pos.clone(),2,3);
      });
    }
    if(slot===3){
      const center=at.add(dir.clone().multiplyScalar(1.4));
      this.fx.vortex(center,4.8,2);
      for(let tick=0;tick<8;tick++)this.schedule(tick*.09,()=>{
        for(const e of this.candidates(center,4.8)){
          if(e.boss||e.type==='dragon')continue;
          const pull=center.clone().sub(e.group.position).setY(0);
          if(pull.lengthSq()<.25)continue;
          e.kbVel?.add(pull.normalize().multiplyScalar(3.7));
          e.applySlow?.(.08,.24);
        }
        if(tick===7){
          this.hitSphere(center,4.8,105,{launch:true,stun:1.25});
          this.fx.impact(center,2,4.8);
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
    }
    if(this.lastSpawn<0){
      this.lastSpawn=now; // one real CC0 training group per session reset
      this.spawnTraining(false);
    }
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
            this.struck(e,65,pr.dir);
            e.applySlow?.(.72,1.3);
            this.fx.impact(closest,0,1.5);
            impact=true;break;
          }
        }
      }
      if(impact||pr.remaining<=0){
        g.scene.remove(pr.mesh);
        pr.mesh.geometry.dispose();pr.mesh.material.dispose();
        this.projectiles.splice(i,1);
      }
    }
    this.fx.update(dt);
    if(now-this.lastHud>.11){this.lastHud=now;this.renderHud();}
  }

  spawnTraining(manual=true){
    const g=this.game,p=g.player;
    if(g.state!=='playing')return;
    this.training=this.training.filter(e=>e?.alive);
    if(this.training.length>=5){
      if(manual)this.announce('Ya hay enemigos de entrenamiento.');
      return;
    }
    const forward=p.getForward(),right=vec(-forward.z,0,forward.x);
    let added=0;
    for(const [dist,side] of [[7,-3],[9,0],[7,3]]){
      if(this.training.length+added>=6)break;
      const offset=forward.clone().multiplyScalar(dist).addScaledVector(right,side);
      const x=p.pos.x+offset.x,z=p.pos.z+offset.z;
      const y=g.terrain.getHeight(x,z);
      if(insideBlockingObject(g,x,y+1,z,1.1))continue;
      const e=g.enemies._spawnDraugr(x,z,added%2?'mage':'warrior');
      if(!e)continue;
      e.hp=e.maxHp=240;
      e.dmg=2;e.speed=1.7;e.aggroR=15;
      e.awakened=true;
      e.name='Draugr de entrenamiento';
      this.training.push(e);
      added++;
    }
    if(manual)this.announce(added?'Draugr CC0 preparados para practicar.':'Buscá terreno abierto y reintentá ENTRENAR.');
  }

  installHud(){
    const root=document.createElement('div');
    root.id='hf-tianjie-skills-lab';
    root.setAttribute('translate','no');
    root.innerHTML=`<div class="hf-lab-top">
      <strong class="hf-lab-title">HIGHFLY <span>TIANJIE · SKILLS LAB P15</span></strong>
      <div class="hf-lab-modes">
        <button type="button" data-style="0">✦ AÉREA</button>
        <button type="button" data-style="1">⚔ ABISAL</button>
        <button type="button" data-style="2">◉ GUARDIÁN</button>
      </div>
      <div class="hf-lab-sub">
        <span id="hf-lab-readout">S1 · S2 · S3 NUEVAS | S4 WULD ORIGINAL</span>
        <button type="button" id="hf-lab-train">+ ENTRENAR</button>
        <button type="button" id="hf-lab-quality">FX: MEDIO</button>
        <button type="button" id="hf-lab-cancel" hidden>CANCELAR</button>
      </div>
      <div id="hf-lab-message" role="status">Mismo personaje KayKit · FURY P14 intacto · ATK y SALTO originales</div>
    </div>`;
    document.body.appendChild(root);
    this.root=root;
    this.readout=root.querySelector('#hf-lab-readout');
    this.note=root.querySelector('#hf-lab-message');
    this.cancelBtn=root.querySelector('#hf-lab-cancel');
    for(const b of root.querySelectorAll('[data-style]'))
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.setStyle(Number(b.dataset.style));});
    root.querySelector('#hf-lab-train').addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();this.spawnTraining(true);
    });
    root.querySelector('#hf-lab-quality').addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      this.quality=(this.quality+1)%3;
      this.fx.setQuality(this.quality);
      e.currentTarget.textContent='FX: '+['BAJO','MEDIO','ALTO'][this.quality];
    });
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
    this.readout.textContent=def.name+' · '+(this.style===0?'MANÁ':'ENERGÍA')+
      ' · S1 '+def.names[0]+' | S2 '+(this.canRecast()?'¡RECAST DISPONIBLE!':def.names[1])+
      ' | S3 '+def.names[2];
    // Use EXISTING P14 S1-S3 buttons, not duplicates. CSS shows labels from
    // data attribute while original updates may continue under the hood.
    for(let slot=1;slot<=3;slot++){
      const b=document.querySelector('.hf-p5-s'+slot);
      if(!b)continue;
      const cd=this.cooldown(slot);
      b.dataset.hfLabLabel=(slot===2&&this.canRecast()?'S2 ↻':
        'S'+slot)+(cd>.05?'\n'+Math.ceil(cd)+'s':'');
      b.setAttribute('aria-label',def.names[slot-1]);
      b.classList.toggle('hf-lab-cooling',cd>.05);
      b.classList.remove('hf-p5-locked');
    }
  }
  bindKeyboard(){
    document.addEventListener('keydown',e=>{
      if(this.game.state!=='playing'||e.repeat)return;
      const n={Digit5:0,Digit6:1,Digit7:2}[e.code];
      if(n!==undefined)this.setStyle(n);
      if(e.code==='Escape'&&this.aim)this.cancelAim();
    },true);
  }
  attachTouchButtons(){
    for(let slot=1;slot<=3;slot++){
      const b=document.querySelector('.hf-p5-s'+slot);
      if(!b||b.dataset.hfLabBound)continue; // idempotent per element
      b.dataset.hfLabBound='1';
      b.addEventListener('pointerdown',e=>{
        if(this.game.state!=='playing')return;
        if(this.game.input.hudEditing)return;
        e.preventDefault();e.stopImmediatePropagation();
        this.cancelAim();
        b.setPointerCapture(e.pointerId);
        this.aim={slot,id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false,button:b,dir:null};
        this.cancelBtn.hidden=false;
        this.makePreview(slot);
      },true);
      b.addEventListener('pointermove',e=>{
        if(!this.aim||this.aim.id!==e.pointerId)return;
        e.preventDefault();e.stopImmediatePropagation();
        const dx=e.clientX-this.aim.x,dy=e.clientY-this.aim.y;
        if(Math.hypot(dx,dy)>15)this.aim.dragged=true;
        if(this.aim.dragged){
          const p=this.game.player,forward=p.getForward(),right=vec(-forward.z,0,forward.x);
          const dir=right.multiplyScalar(dx).addScaledVector(forward,-dy).setY(0);
          if(dir.lengthSq()>.001)this.aim.dir=dir.normalize();
          this.movePreview(this.aim.dir||this.aimDirection(null));
        }
      },true);
      b.addEventListener('pointerup',e=>{
        if(!this.aim||this.aim.id!==e.pointerId)return;
        e.preventDefault();e.stopImmediatePropagation();
        const aimed=this.aim.dir;
        this.cancelAim();
        this.cast(slot,aimed,'pointer');
      },true);
      b.addEventListener('pointercancel',e=>{if(this.aim?.id===e.pointerId)this.cancelAim();},true);
      b.addEventListener('lostpointercapture',e=>{if(this.aim?.id===e.pointerId)this.cancelAim();},true);
    }
  }
  makePreview(slot){
    if(this.preview)return;
    const geo=new THREE.BufferGeometry().setFromPoints([vec(),vec()]);
    const mat=new THREE.LineBasicMaterial({color:PALETTE[this.style],transparent:true,opacity:.93});
    this.preview=new THREE.Line(geo,mat);
    this.preview.frustumCulled=false;
    this.game.scene.add(this.preview);
    this.movePreview(this.aimDirection(null));
  }
  movePreview(direction){
    if(!this.preview||!direction)return;
    const p=this.game.player.pos;
    const distance=this.aim?.slot===1?16:this.aim?.slot===2?7:4.6;
    const arr=this.preview.geometry.attributes.position;
    arr.setXYZ(0,p.x,p.y+.18,p.z);
    arr.setXYZ(1,p.x+direction.x*distance,p.y+.18,p.z+direction.z*distance);
    arr.needsUpdate=true;
  }
  cancelAim(){
    this.aim=null;
    if(this.cancelBtn)this.cancelBtn.hidden=true;
    if(this.preview){
      this.game.scene.remove(this.preview);
      this.preview.geometry.dispose();this.preview.material.dispose();
      this.preview=null;
    }
  }
}
