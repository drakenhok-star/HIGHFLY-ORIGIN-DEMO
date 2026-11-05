/**
 * HIGHFLY P186: selective five-kit / fifteen-skill bridge for the REAL P185
 * world. Its original AI, quests, portals, inventory, save, P16 melee, joystick,
 * 4th directional hit, camera and HUD remain the owner of their own systems.
 * Source: HIGHFLY L26 audited procedural VFX, not its laboratory bootstrap.
 * NOT importing training bots, lab resets, map or captured copyrighted media.
 */
import * as THREE from 'three';
import {HIGHFLY_SKILL_EXPORT_L26} from '../skillslab/skill-catalog-export-l26.js';
import {TianjieSkillVfx} from '../skillslab/lab-vfx.js';
import {L25PremiumSkillVfx} from '../skillslab/premium-vfx-l25.js';
import {ClaudeVfxL26} from '../skillslab/claudecraft-vfx-l26.js';
import {applyP186VideoCamera,installP186VisualSafety,applyP186FilmedHudIfNew}
  from '../ui/p186-profile.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const KITS=['GUINEVERE','DYRROTH','TIGREAL','CLAUDE_MAGE','CLAUDE_ROGUE'];
const LABELS=['AÉREA','ABISAL','GUARDIÁN','MAGO','PÍCARO'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const trimYaw=(p)=>V(-Math.sin(p.yaw),0,-Math.cos(p.yaw)).normalize();
const BODY_RADIUS=.65;
export function p186IsFlying(e,g){
 if(!e?.alive||!e.group)return false;
 const at=e.group.position,y=g.terrain.getHeight(at.x,at.z);
 return (e.type==='dragon'||e.trainingFlight===true)&&
   at.y-y>6 && e.state!=='land' && e.state!=='perch';
}
export function p186CanCast(slot,kit,stats,cd,now){
 const skill=HIGHFLY_SKILL_EXPORT_L26.find(s=>s.kit===kit&&s.slot===slot);
 if(!skill)return {ok:false,reason:'missing'};
 if(now<(cd?.[skill.id]||0))return {ok:false,reason:'cooldown',skill};
 const left=skill.resource==='MP'?stats.mp:stats.sp;
 if(left<skill.cost)return {ok:false,reason:'resource',skill};
 return {ok:true,skill};
}
export function p186SweptHit(start,end,point,radius){
 const delta=end.clone().sub(start),to=point.clone().sub(start);
 const t=clamp(to.dot(delta)/Math.max(1e-6,delta.lengthSq()),0,1);
 return start.clone().addScaledVector(delta,t).distanceToSquared(point)<=radius*radius;
}
const disposable=o=>{
 o.traverse(node=>{
  node.geometry?.dispose();
  if(node.material)
   for(const m of Array.isArray(node.material)?node.material:[node.material])
    m.dispose();
 });
};
export class P186CombatBridge{
 constructor(game){
  this.game=game;
  this.fx=new TianjieSkillVfx(game);
  this.fx.setQuality(1);
  this.premium=new L25PremiumSkillVfx(this.fx);
  this.claude=new ClaudeVfxL26(this.fx);
  this.style=this.loadStyle();
  this.cooldowns=Object.create(null);
  this.tasks=[];this.projectiles=[];
  this.recast=null;this.focus=null;this.focusButton=null;
  this.menuInstalled=false;this.editor=null;
  this.prevState='';this._cameraApplied=false;
  this.airHits={enemy:null,count:0,lastAt:-999};
  this.enabled=true;this._uiRefresh=0;
  installP186VisualSafety();
  document.addEventListener('pointerdown',e=>this.onPointer(e),true);
  document.addEventListener('keydown',e=>this.onKey(e),true);
 }
 loadStyle(){
  try{const x=Number(localStorage.getItem('hf_p186_skill_style'));
   return Number.isInteger(x)&&x>=0&&x<5?x:3;}
  catch(_){return 3;}
 }
 saveStyle(){try{localStorage.setItem('hf_p186_skill_style',String(this.style));}catch(_){}}
 get skills(){return HIGHFLY_SKILL_EXPORT_L26.filter(s=>s.kit===KITS[this.style]);}
 now(){return this.game.time.elapsed;}
 targetPoint(e){return e.group.position.clone().add(V(0,Math.min(1.6,e.hitRadius||1),0));}
 ground(x,z){return this.game.terrain.getHeight(x,z);}
 facing(){return trimYaw(this.game.player);}
 playersAt(){return this.game.player.pos.clone();}
 message(t){this.game.hud?.notify?.(t);}
 living(){return this.game.enemies.list.filter(e=>e.alive&&!e.removed&&e.group);}
 enemiesNear(center,radius,height=3.5,forward=null,degrees=180){
  return this.living().filter(e=>{
   const p=e.group.position;
   const diff=p.clone().sub(center),h=Math.hypot(diff.x,diff.z);
   if(h>radius+(e.hitRadius||.5)||Math.abs(diff.y)>height+(e.hitRadius||.5))return false;
   if(!forward||h<.05)return true;
   return V(diff.x,0,diff.z).normalize().dot(forward)>=Math.cos(degrees*Math.PI/180);
  });
 }
 damage(e,amount,origin,options={}){
  if(!e?.alive||!e.takeDamage)return false;
  const dir=e.group.position.clone().sub(origin).setY(0).normalize();
  const hp=e.hp;
  e.takeDamage(amount,options.knockback?dir.multiplyScalar(options.knockback):undefined);
  const hit=e.hp<hp;
  if(hit){
   this.game.hud?.showEnemyHP?.(e);
   if(options.slow)e.applySlow?.(options.slow,options.duration||1);
   if(options.stun && e.type!=='dragon'){
    e.hitPending=-1;e.cdT=Math.max(e.cdT||0,options.stun);
    e.hitstunT=Math.max(e.hitstunT||0,options.stun);
   }
   this.game.effects.spawnBurst(this.targetPoint(e),options.color||'#efeaff',
     10,2.5,.37,.13);
  }
  return hit;
 }
 sphere(center,radius,damage,height=3,options={}){
  let hits=0;
  for(const e of this.enemiesNear(center,radius,height)){
   if(this.damage(e,damage,center,options))hits++;
  }
  return hits;
 }
 cone(center,dir,radius,angle,damage,options={}){
  let hits=0;
  for(const e of this.enemiesNear(center,radius,options.height||3,dir,angle)){
   if(this.damage(e,damage,center,options))hits++;
  }
  return hits;
 }
 schedule(seconds,fn){this.tasks.push({at:this.now()+seconds,fn});}
 onPointer(event){
  const g=this.game;
  if(g.state!=='playing'||g.input.hudEditing)return;
  const target=event.target?.closest?.('button');if(!target)return;
  if(this.focus&&p186IsFlying(this.focus,g)&&target.matches('.hf-p5-atk')){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   this.airAttack();return;
  }
  for(const [cls,slot] of [['.hf-p5-s1',1],['.hf-p5-s2',2],['.hf-p5-s3',3]]){
   if(!target.matches(cls))continue;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   this.cast(slot);return;
  }
 }
 onKey(event){
  if(this.game.state!=='playing'||this.game.input.hudEditing||event.repeat)return;
  const key={Digit1:1,Digit2:2,Digit3:3}[event.code];
  if(!key)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  this.cast(key);
 }
 cast(slot){
  const g=this.game,now=this.now(),pos=this.playersAt(),dir=this.facing();
  const oldRecast=this.recast&&this.recast.slot===slot&&
   this.recast.style===this.style&&now<=this.recast.until;
  let skill;
  if(oldRecast){skill=HIGHFLY_SKILL_EXPORT_L26.find(s=>s.kit===KITS[this.style]&&s.slot===slot);}
  else{
   const verdict=p186CanCast(slot,KITS[this.style],g.stats,this.cooldowns,now);
   if(!verdict.ok){
    if(verdict.reason==='resource')this.message('No tenés suficiente '+verdict.skill.resource);
    else if(verdict.reason==='cooldown')this.message('Skill en cooldown');
    return false;
   }
   skill=verdict.skill;
   if(skill.resource==='MP'? !g.stats.useMagicka(skill.cost):!g.stats.useStamina(skill.cost))
    return false;
   this.cooldowns[skill.id]=now+skill.cd;
  }
  if(!skill)return false;
  if(oldRecast)this.recast=null;
  if(skill.resource==='MP'){
   g.player.castT=0;g.player._castAnimStarted=false;
  }
  this.execute(this.style,slot,pos,dir,oldRecast);
  if(this.style<3)this.premium.onCast(this.style,slot,pos,dir);
  this.drawSkillButtons();
  return true;
 }
 execute(style,slot,pos,dir,recast){
  const g=this.game,fx=this.fx,cf=this.claude;
  const ahead=(range)=>pos.clone().addScaledVector(dir,range);
  if(style===0){
   if(slot===1){
    const start=pos.clone().add(V(0,1.25,0));
    fx.launch(pos,dir,0);
    this.spawnBolt(start,dir,0,47,17,65);
   }else if(slot===2){
    if(!recast){
     const landing=ahead(5.8);
     landing.y=this.ground(landing.x,landing.z);
     fx.landingMarker(landing,2.5,1.12,0);
     g.player.vel.y=Math.max(g.player.vel.y,8.5);
     this.recast={slot:2,style,until:this.now()+3.0};
     this.schedule(.85,()=>{
      const p=this.playersAt();
      const hits=this.sphere(p,2.6,64,3,{stun:.48,color:'#d7aaff'});
      fx.landing(p,0,2.7);
      if(hits)this.message('¡ASCENSO! '+hits+' enemigos');
     });
    }else{
     this.sphere(pos,3.1,38,4,{stun:.3,color:'#efc8ff'});
     fx.landing(pos,0,3.2);
    }
   }else{
    fx.tornado(pos,4,0,2.6);
    for(let n=1;n<=8;n++)this.schedule(n*.23,()=>{
      this.sphere(this.playersAt(),4.2,n===8?54:18,5,{slow:.72,duration:.65});
      fx.sparks(this.playersAt().add(V(0,1,0)),'#a77bff',18,2.5,.32,.13);
    });
   }
  }else if(style===1){
   if(slot===1){
    for(let n=0;n<3;n++)this.schedule(n*.18,()=>{
      const at=this.playersAt();
      this.cone(at,dir,4.9,65,n===2?53:27,{height:3,color:'#ff627f'});
      fx.signature.crescent(at,dir,'#ff5481',.42,1);
    });
   }else if(slot===2){
    if(!recast){
     g.player.startDash({direction:{x:dir.x,z:dir.z},speed:18,duration:.3,style:'dodge'});
     this.recast={slot:2,style,until:this.now()+4};
     fx.signature.rushLines(pos,dir,'#ff789e',.4);
     this.schedule(.31,()=>this.cone(this.playersAt(),dir,3,70,45,{height:3,color:'#ff789e'}));
    }else{
     fx.signature.crescent(pos,dir,'#fa426d',.52,1.35);
     this.cone(pos,dir,4.3,64,88,{height:4,stun:.3,color:'#ff5075'});
    }
   }else{
    const end=ahead(9.5);
    this.cone(pos,dir,10.5,22,112,{height:4,color:'#ff5c79'});
    fx.signature.darkExecution(pos,dir,.75);
    this.sphere(end,2,52,4,{color:'#ff607b'});
   }
  }else if(style===2){
   if(slot===1){
    for(let i=0;i<3;i++)this.schedule(i*.23,()=>{
      this.cone(this.playersAt(),dir,6.5,58,i===2?51:28,{color:'#f5d48b'});
      fx.signature.groundWave(this.playersAt(),dir,4.4,'#e9d392',.54,57,.24);
    });
   }else if(slot===2){
    g.player.startDash({direction:{x:dir.x,z:dir.z},speed:18,duration:.35,style:'dodge'});
    fx.signature.rushLines(pos,dir,'#f5d98f',.5);
    this.schedule(.38,()=>{
      const at=this.playersAt();
      this.cone(at,dir,3.8,80,82,{height:3,stun:.42,color:'#f6dda3'});
      fx.landing(at,2,3.2);
    });
   }else{
    fx.signature.gravityFunnel(pos,'#dfc888',4.8,4.3,1.4);
    this.schedule(.85,()=>{
      const center=this.playersAt();
      for(const e of this.enemiesNear(center,5.3,4)){
       if(e.boss||e.type==='dragon')continue;
       const pull=center.clone().sub(e.group.position).setY(0).normalize();
       e.kbVel?.addScaledVector(pull,6);
      }
      const n=this.sphere(center,4.6,117,5,{stun:1.1,color:'#ffebb2'});
      fx.landing(center,2,4.5);
      if(n)this.message('¡COLAPSO! '+n+' impactos');
    });
   }
  }else if(style===3){
   if(slot===1){
    fx.launch(pos,dir,3);cf.fireCharge(pos,dir);
    const start=pos.clone().add(V(0,1.32,0)).addScaledVector(dir,.45);
    const airborne=this.focus&&p186IsFlying(this.focus,g)?this.focus:null;
    const aim=airborne?this.targetPoint(airborne).sub(start).normalize():dir;
    this.spawnBolt(start,aim,3,75,23,73,{burn:4});
   }else if(slot===2){
    const target=ahead(12.5);target.y=this.ground(target.x,target.z);
    fx.meteorWarning(target,4);fx.fallingMeteor(target,.75);
    cf.meteorSkybeam(target,.75);
    this.schedule(.75,()=>{
      const n=this.sphere(target,4.15,138,3,{slow:.62,duration:1.2,color:'#ff8942'});
      cf.meteorDetonate(target);
      if(n)this.message('¡METEORITO! '+n+' impactos');
    });
   }else{
    const targets=this.enemiesNear(pos,5.1,3);
    for(const e of targets)this.damage(e,36,pos,{slow:.04,duration:1.9,color:'#b9faff'});
    fx.frostNova(pos,5);
    cf.frostNova(pos,targets);
   }
  }else if(style===4){
   if(slot===1){
    let critical=false,hits=0;
    for(const e of this.enemiesNear(pos,3.45,3,dir,34)){
      const face=V(-Math.sin(e.yaw||0),0,-Math.cos(e.yaw||0));
      const targetToPlayer=pos.clone().sub(e.group.position).setY(0).normalize();
      const behind=face.dot(targetToPlayer)<-.43;
      if(this.damage(e,behind?133:74,pos,{color:'#81cfff'})){
       hits++;critical||=behind;cf.backstabContact(e,dir,behind);
      }
    }
    if(critical)this.message('¡ATAQUE POR LA ESPALDA!');
    else if(!hits)this.message('Backstab: sin contacto');
   }else if(slot===2){
    const foes=this.enemiesNear(pos,3.25,3,dir,40);
    for(const e of foes)if(this.damage(e,65,pos,{slow:.04,duration:1.1,stun:1.1,color:'#f46e92'}))
      cf.kidneyContact(e,dir);
   }else{
    g.player.startDash({direction:{x:dir.x,z:dir.z},speed:22,duration:.36,style:'dodge'});
    cf.chargeWindup(pos,dir);
    this.schedule(.37,()=>{
      const at=this.playersAt();
      const n=this.cone(at,dir,3.35,70,82,{height:3,stun:.6,color:'#a0eaff'});
      cf.chargeCrash(at,dir,n);
    });
   }
  }
 }
 spawnBolt(origin,dir,style,damage,range,speed,opts={}){
  if(this.projectiles.length>=9)this.removeProjectile(this.projectiles[0]);
  const mesh=this.fx.energyBolt(style);
  mesh.position.copy(origin);
  const forward=dir.clone().normalize();
  mesh.quaternion.setFromUnitVectors(V(0,0,1),forward);
  this.game.scene.add(mesh);
  this.projectiles.push({mesh,from:origin.clone(),dir:forward,style,damage,range,
   speed,age:0,opts,target:opts.target||null});
 }
 removeProjectile(pr){
  this.game.scene.remove(pr.mesh);
  disposable(pr.mesh);
  const idx=this.projectiles.indexOf(pr);if(idx>=0)this.projectiles.splice(idx,1);
 }
 airAttack(){
  const g=this.game,target=this.focus;
  if(!p186IsFlying(target,g))return;
  if(this.airShotCD>this.now())return;
  const from=this.playersAt().add(V(0,1.6,0));
  const to=this.targetPoint(target);
  if(from.distanceTo(to)>115){this.message('Dragón fuera de alcance');return;}
  this.airShotCD=this.now()+.43;
  const dir=to.sub(from).normalize();
  this.spawnBolt(from,dir,4,28,115,70,{target,aerialBasic:true});
 }
 airConfirmed(enemy){
  if(enemy!==this.focus||!p186IsFlying(enemy,this.game))return;
  const now=this.now();
  if(this.airHits.enemy!==enemy||now-this.airHits.lastAt>5.5)this.airHits={enemy,count:0,lastAt:now};
  this.airHits.count++;this.airHits.lastAt=now;
  if(this.airHits.count<4){
    this.message('IMPACTO AÉREO '+this.airHits.count+'/4');return;
  }
  this.airHits={enemy:null,count:0,lastAt:-999};
  // P185 dragon already implements a native 'land' -> 'descend' -> 'ground'
  // behavior; reuse it rather than imposing the L25 training Y offset.
  const player=this.game.player.pos;
  const diff=enemy.group.position.clone().sub(player).setY(0);
  if(diff.lengthSq()<.01)diff.set(1,0,0);
  diff.normalize().multiplyScalar(9);
  enemy.landPos.set(player.x+diff.x,0,player.z+diff.z);
  enemy.landPos.y=this.ground(enemy.landPos.x,enemy.landPos.z);
  enemy.state='land';enemy.sub='descend';enemy.subT=0;
  enemy.hitPending=-1;enemy.vel.set(0,0,0);
  this.game.effects.spawnBurst(this.targetPoint(enemy),'#a4e8ff',36,4,.7,.2);
  this.message('¡RUPTURA AÉREA! El dragón desciende para luchar');
  this.focus=null;this.renderFocus();
 }
 updateShots(dt){
  for(const pr of [...this.projectiles]){
   const before=pr.mesh.position.clone();
   const distance=Math.min(pr.range,pr.speed*dt);
   const after=before.clone().addScaledVector(pr.dir,distance);
   pr.mesh.position.copy(after);
   pr.range-=distance;pr.age+=dt;
   if(pr.mesh.material?.uniforms?.uTime)pr.mesh.material.uniforms.uTime.value+=dt;
   if(pr.style===4)this.fx.sparks(after,'#84e9ff',4,1.5,.24,.08);
   else this.fx.projectile(after,pr.style);
   let collided=false;
   const targets=pr.target?[pr.target]:this.living();
   for(const e of targets){
    if(!e.alive||!e.group)continue;
    const center=this.targetPoint(e);
    if(!p186SweptHit(before,after,center,(e.hitRadius||BODY_RADIUS)+.8))continue;
    if(this.damage(e,pr.damage,before,{color:pr.style===3?'#ffab57':'#d6f8ff'})){
     collided=true;
     if(pr.style===3){
      this.claude.fireImpact(center);
      if(pr.opts.burn)for(let n=1;n<=pr.opts.burn;n++)this.schedule(n*.43,()=>{
       if(e.alive)this.damage(e,6,center,{color:'#ff7540'});
      });
     }else if(pr.opts.aerialBasic)this.airConfirmed(e);
     else this.fx.impact(center,pr.style,1.8);
    }
    break;
   }
   if(collided||pr.range<=0||pr.age>4.5)this.removeProjectile(pr);
  }
 }
 ensureHud(){
  const g=this.game,ui=g.touch?.premium?.p810;
  if(!ui?.editor||!g.touch?.root)return;
  const editor=ui.editor;
  if(!this.focusButton){
   const b=document.createElement('button');
   b.type='button';b.id='hf-p186-focus';b.className='hf-p810-control';
   b.textContent='◎ ENFOCAR';b.setAttribute('aria-label','Enfocar solo monstruos voladores');
   g.touch.root.appendChild(b);
   b.addEventListener('pointerdown',e=>{
    if(g.input.hudEditing)return;
    e.preventDefault();e.stopPropagation();
    const flyers=this.living().filter(en=>p186IsFlying(en,g));
    if(!flyers.length){this.focus=null;this.message('No hay monstruos voladores al alcance');}
    else{
      const nearest=flyers.sort((a,b)=>a.group.position.distanceToSquared(g.player.pos)-
        b.group.position.distanceToSquared(g.player.pos))[0];
      this.focus=this.focus===nearest?null:nearest;
      this.message(this.focus?'ENFOCAR activo · ATK = energía aérea':'Enfoque desactivado');
    }
    this.renderFocus();
   });
   this.focusButton=b;
   editor.register('focus',b);
   applyP186FilmedHudIfNew(editor);
  }
  if(!this.menuInstalled&&ui.quick){
   this.menuInstalled=true;
   const open=document.createElement('button');
   open.type='button';open.textContent='⚔ ESTILOS · 15 SKILLS';
   ui.quick.appendChild(open);
   open.addEventListener('click',()=>{
    ui.toggleQuickMenu(false);
    this.openStyleMenu();
   });
  }
  this.editor=editor;
  this.drawSkillButtons();
 }
 openStyleMenu(){
  if(this.stylePanel){this.stylePanel.remove();this.stylePanel=null;return;}
  const panel=document.createElement('div');panel.id='hf-p186-styles';
  panel.style.cssText='position:fixed;z-index:250;right:5%;top:7%;width:330px;max-width:88vw;max-height:82vh;overflow-y:auto;touch-action:pan-y;background:#140d36f5;border:2px solid #a978ff;border-radius:16px;color:white;padding:12px;font:700 13px system-ui;display:flex;flex-direction:column;gap:7px';
  const heading=document.createElement('strong');
  heading.textContent='HIGHFLY · 15 HABILIDADES';panel.appendChild(heading);
  for(let i=0;i<5;i++){
   const row=document.createElement('button');row.type='button';
   row.textContent=(i===this.style?'● ':'○ ')+LABELS[i]+' · '+HIGHFLY_SKILL_EXPORT_L26.filter(s=>s.kit===KITS[i]).length+' SKILLS';
   row.style.cssText='background:#402869;color:white;border:1px solid #895cdf;border-radius:9px;padding:8px';
   row.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    this.style=i;this.recast=null;this.saveStyle();this.drawSkillButtons();
    this.message('Estilo equipado: '+LABELS[i]);panel.remove();this.stylePanel=null;
   });
   panel.appendChild(row);
   // All 15 skill cards remain browseable without leaving the game or spending resources.
   const cards=document.createElement('div');cards.className='hf-p187-skill-cards';
   cards.style.cssText='display:grid;gap:4px;margin:0 0 6px';
   for(const sk of HIGHFLY_SKILL_EXPORT_L26.filter(s=>s.kit===KITS[i])){
    const card=document.createElement('article');
    card.style.cssText='background:#27204a;border:1px solid #5f4b8f;border-radius:9px;padding:7px 9px;display:grid;gap:3px';
    const name=document.createElement('strong');name.textContent='S'+sk.slot+' · '+sk.name;
    const info=document.createElement('small');
    info.textContent=sk.cost+' '+(sk.resource==='MP'?'MANÁ':'ENERGÍA')+
      ' · CD '+sk.cd+' s · VFX '+sk.vfx.replaceAll('-',' ');
    info.style.color='#e2d8fa';card.append(name,info);cards.appendChild(card);
   }
   panel.appendChild(cards);
  }
  const close=document.createElement('button');close.textContent='CERRAR';
  close.addEventListener('click',()=>{panel.remove();this.stylePanel=null;});
  panel.appendChild(close);
  document.body.appendChild(panel);this.stylePanel=panel;
 }
 drawSkillButtons(){
  if(!this.game.touch?.premium?.p810)return;
  const kit=KITS[this.style],now=this.now();
  for(const sk of HIGHFLY_SKILL_EXPORT_L26.filter(s=>s.kit===kit)){
   const btn=this.game.touch.root.querySelector('.hf-p5-s'+sk.slot);
   if(!btn)continue;
   const t=Math.ceil(Math.max(0,(this.cooldowns[sk.id]||0)-now));
   const short={1:'S1',2:'S2',3:'S3'}[sk.slot];
   const title=sk.name.length>10?sk.name.split(' ')[0]:sk.name;
   const copy=short+'\n'+title+(t?'\n'+t+'s':'');
   if(btn.textContent!==copy)btn.textContent=copy;
  }
 }
 renderFocus(){
  if(!this.focusButton)return;
  const active=this.focus&&p186IsFlying(this.focus,this.game);
  this.focusButton.classList.toggle('active',!!active);
  this.focusButton.textContent=active?'◎ DRAGÓN':'◎ ENFOCAR';
 }
 enterPlaying(){
  if(this.prevState==='playing')return;
  applyP186VideoCamera(this.game);
  this.prevState='playing';
  this.ensureHud();
 }
 reset(){
  this.recast=null;this.focus=null;
  this.airHits={enemy:null,count:0,lastAt:-999};
  this.cooldowns=Object.create(null);this.tasks.length=0;
  for(const p of [...this.projectiles])this.removeProjectile(p);
  this.fx.active.splice(0).forEach(ev=>this.fx.free(ev));
  this.prevState='';this._cameraApplied=false;
 }
 update(dt){
  const g=this.game;
  if(g.state!=='playing'){this.prevState=g.state;return;}
  if(this.prevState!=='playing')this.enterPlaying();
  this._uiRefresh+=dt;
  if(this._uiRefresh>.35){
   this._uiRefresh=0;this.ensureHud();this.renderFocus();
  }
  if(this.focus&&!p186IsFlying(this.focus,g))this.focus=null;
  const now=this.now();
  for(let i=this.tasks.length-1;i>=0;i--){
   const task=this.tasks[i];
   if(task.at>now)continue;
   this.tasks.splice(i,1);task.fn();
  }
  this.updateShots(dt);
  this.fx.setQuality(g.performanceP2?.preset==='FLUID'?0:1);
  this.fx.update(dt);
 }
}
export function installP186Combat(game){return new P186CombatBridge(game);}
