/**
 * P192: Seven visitable W0 satellite settlements and artisan/arcane districts.
 *
 * REUSE FIRST: all houses are existing completed HIGHFLY house builder,
 * NPC rigs are existing KayKit CC0 models. No cube stand-ins, fake fish,
 * unlicensed props, model imports or teleport/debug targets.
 * Houses/NPCs spawn incrementally ONLY near player; fixed daily map sites.
 *
 * Seven starter errands are actual inventory-gated missions using drops
 * present in the W0 ITEM_DB. 13 real in-world trainers unlock professions,
 * with original WOC canonical profession IDs (not WOC visuals).
 */
import {mulberry32} from '../core/noise.js';
import {ITEM_DB} from '../systems/inventory.js';
import {INICIOS_HUBS_P186,INICIOS_TRAINERS_P186,INICIOS_PROFESSIONS_P186}
 from './inicios-v2-p186.js';

export const HAMLET_QUESTS_P192=Object.freeze([
 {hubId:'sawmill_hamlet',name:'Sendero de los leñadores',
  desc:'Traé un colmillo de lobo para probar que el sendero al aserradero es seguro.',
  item:'wolf_fang',qty:1,gold:35,xp:35},
 {hubId:'mining_hamlet',name:'Ecos de la Primera Veta',
  desc:'Llevá un resto de draugr de la cripta; el capataz investiga la veta antigua.',
  item:'draugr_bone',qty:1,gold:55,xp:60},
 {hubId:'herbal_hamlet',name:'Ingredientes de la boticaria',
  desc:'Traé una pata de araña para las primeras preparaciones de alquimia.',
  item:'spider_leg',qty:1,gold:40,xp:45},
 {hubId:'fishing_hamlet',name:'Protegé la costa',
  desc:'Llevá un caparazón de cangrejo a la villa pesquera.',
  item:'crab_shell',qty:1,gold:40,xp:45},
 {hubId:'farming_hamlet',name:'Despensa del granero',
  desc:'Traé carne de jabalí para organizar la cocina del pueblo agrícola.',
  item:'boar_meat',qty:1,gold:40,xp:45},
 {hubId:'artisan_quarter',name:'Materiales del taller',
  desc:'Conseguí cuero de jabalí para el barrio de artesanos.',
  item:'boar_hide',qty:1,gold:40,xp:45},
 {hubId:'arcane_quarter',name:'Hilo de los estudios',
  desc:'Traé seda de araña para los escribas e investigadores.',
  item:'spider_silk',qty:1,gold:60,xp:55}
].map(Object.freeze));
const Q=new Map(HAMLET_QUESTS_P192.map(x=>[x.hubId,x]));
export const P192_TRAINER_MODELS=Object.freeze({
 master_miner:'npc_knight',master_lumberjack:'npc_rogue',
 master_herbalist:'npc_mage',master_fisher:'npc_rogue',
 master_farmer:'npc_rogue',master_tinkerer:'npc_knight',
 master_alchemist:'npc_mage',master_cook:'npc_mage',
 master_tanner:'npc_knight',master_tailor:'npc_rogue',
 master_scribe:'npc_mage',master_enchanter:'npc_mage',
 master_jeweler:'npc_knight'
});
const ALL_TRAINERS=INICIOS_TRAINERS_P186.filter(x=>x.id!=='sigrid');
const SITE_PREFS=Object.freeze({
 sawmill_hamlet:{x:-90,z:195},
 mining_hamlet:{x:-125,z:-70},
 herbal_hamlet:{x:170,z:220},
 fishing_hamlet:{x:202,z:-86},
 farming_hamlet:{x:115,z:15},
 artisan_quarter:{x:-56,z:56},
 arcane_quarter:{x:58,z:-24}
});
const KNOWN_PACKS=[[-150,120],[120,160],[80,-180]];
export function safeHamletSiteP192(terrain,structures,x,z,{shore=false}={}){
 const water=terrain.waterY||-2,y=terrain.getHeight(x,z);
 if(!Number.isFinite(y)||y<=water+1.2||terrain.getSlope(x,z)>.32)return false;
 for(const dx of [-4,0,4])for(const dz of [-4,0,4]){
  const h=terrain.getHeight(x+dx,z+dz);
  if(h<=water+.7||Math.abs(h-y)>1.75)return false;
 }
 for(const c of structures?.colliders||[])
  if(Math.hypot(c.x-x,c.z-z)<10.5)return false;
 for(const [px,pz] of KNOWN_PACKS)
  if(Math.hypot(px-x,pz-z)<35)return false;
 if(shore){
  const h=[[-14,0],[14,0],[0,14],[0,-14],
   [21,0],[-21,0],[0,21],[0,-21]]
   .some(([dx,dz])=>terrain.getHeight(x+dx,z+dz)<water+.65);
  if(!h||y>water+11)return false;
 }
 return true;
}
export function findHamletSiteP192(terrain,structures,id){
 const origin=SITE_PREFS[id];if(!origin)return null;
 const shore=id==='fishing_hamlet';
 const step=shore?13:12,max=shore?156:68;
 // Deterministic nearest valid site, preserving the proposed biomes.
 for(let radius=0;radius<=max;radius+=step){
  for(let a=0;a<16;a++){
   if(radius===0&&a>0)break;
   const t=a*Math.PI*2/16;
   const x=Math.round(origin.x+Math.cos(t)*radius);
   const z=Math.round(origin.z+Math.sin(t)*radius);
   if(safeHamletSiteP192(terrain,structures,x,z,{shore}))
    return Object.freeze({x,z,y:terrain.getHeight(x,z)});
  }
 }
 return null;
}
export function newHamletQuestStateP192(raw){
 const state=Object.create(null);
 for(const q of HAMLET_QUESTS_P192){
  const value=raw?.[q.hubId];
  state[q.hubId]=['available','active','done'].includes(value)?value:'available';
 }
 return state;
}
export class P192Hamlets{
 constructor(game){
  this.game=game;this.quests=newHamletQuestStateP192();
  this.sites=new Map();this._acc=0;this._lastHub=null;
  for(const hub of INICIOS_HUBS_P186.filter(x=>x.id!=='central_village')){
   const pos=findHamletSiteP192(game.terrain,game.structures,hub.id);
   this.sites.set(hub.id,{hub,pos,houses:[],trainers:new Set(),
    status:pos?'approved_existing_model_site':'unsafe_site_skipped'});
  }
 }
 reset(){this.quests=newHamletQuestStateP192();}
 serialize(){return {schemaVersion:192,quests:{...this.quests}};}
 applyData(raw){this.quests=newHamletQuestStateP192(raw?.quests);}
 status(hubId){return this.quests[hubId]||'available';}
 ready(hubId){
  const q=Q.get(hubId);
  return !!q&&this.status(hubId)==='active'&&
   (this.game.inventory.slots.get(q.item)||0)>=q.qty;
 }
 accept(hubId){
  if(!Q.has(hubId)||this.status(hubId)!=='available')return false;
  this.quests[hubId]='active';
  this.game.hud.questBanner('Misión aceptada: '+Q.get(hubId).name);
  this.game.saveSys.save({silent:true});
  return true;
 }
 turnIn(hubId){
  if(!this.ready(hubId))return false;
  const q=Q.get(hubId),inv=this.game.inventory;
  if(inv.slots.get(q.item)<q.qty)return false;
  inv.removeItem(q.item,q.qty);this.quests[hubId]='done';
  inv.gold+=q.gold;this.game.stats.addXP(q.xp);
  this.game.hud.questBanner('Misión completada: '+q.name);
  this.game.hud.notify('Recompensa '+q.gold+' oro · '+q.xp+' XP');
  this.game.saveSys.save({silent:true});
  return true;
 }
 questList(){
  return HAMLET_QUESTS_P192.map(q=>({
   id:'p192_'+q.hubId,name:q.name,desc:q.desc,
   state:this.ready(q.hubId)?'complete':this.status(q.hubId),
   progress:Math.min(q.qty,this.game.inventory.slots.get(q.item)||0),
   need:q.qty,rewardGold:q.gold,rewardXp:q.xp,
   giver:this.sites.get(q.hubId)?.hub.name||q.hubId,
   kind:'secundaria',secret:false
  }));
 }
 markers(){
  return HAMLET_QUESTS_P192.filter(q=>this.ready(q.hubId)).map(q=>{
   const pos=this.sites.get(q.hubId)?.pos;
   return pos?{pos,label:'Entregar: '+q.name}:null;
  }).filter(Boolean);
 }
 learnAtTrainer(npc,professionId){
  const p=INICIOS_PROFESSIONS_P186.find(x=>x.id===professionId);
  if(!p||p.trainerId!==npc.id||this.status(p.hubId)!=='done')return {ok:false,reason:'MISIÓN_PENDIENTE'};
  const dx=this.game.player.pos.x-npc.pos.x,dz=this.game.player.pos.z-npc.pos.z;
  if(dx*dx+dz*dz>144)return {ok:false,reason:'ALEJADO'};
  const outcome=this.game.p187Professions.learnAtTrainer(professionId,npc.id);
  if(outcome.ok)this.game.saveSys.save({silent:true});
  return outcome;
 }
 trainersFor(hubId){return ALL_TRAINERS.filter(x=>x.hubId===hubId);}
 update(dt){
  const g=this.game,p=g.player?.pos;
  if(!p||g.state!=='playing')return;
  this._acc+=dt;if(this._acc<.36)return;this._acc=0;
  let nextBuild=null,nextTrainer=null;
  for(const [id,site] of this.sites){
   if(!site.pos)continue;
   const {x,z}=site.pos,d=Math.hypot(x-p.x,z-p.z);
   if(d<37&&this._lastHub!==id){
    this._lastHub=id;
    g.hud?.notify?.('🏘️ Llegaste a '+site.hub.name);
   }
   if(d>37&&this._lastHub===id)this._lastHub=null;
   if(d>190)continue;
   if(site.houses.length<2&&!nextBuild)nextBuild=site;
   if(d<155){
    for(const trainer of this.trainersFor(id)){
     if(!site.trainers.has(trainer.id)&&!nextTrainer){
      nextTrainer={site,trainer};break;
     }
    }
   }
  }
  if(nextBuild){
   const site=nextBuild,i=site.houses.length,{x,z}=site.pos;
   // Existing *finished* house builder, not geometry placeholders.
   const ox=i===0?0:14,oz=i===0?0:4;
   if(safeHamletSiteP192(g.terrain,g.structures,x+ox,z+oz)){
    const house=g.structures._buildHouse(x+ox,z+oz,false,
      mulberry32((x*1019+z*37+i*2229)>>>0));
    site.houses.push(house);
   }else site.houses.push(null);
   return; // one house max per update slice
  }
  if(nextTrainer){
   const {site,trainer}=nextTrainer;
   const base=site.pos;
   let chosen=null;
   // NPCs must stand on a WALKABLE footpath 4–24m from the real houses.
   // House footprint safety differs from house-building 10.5m clearance.
   for(let radius=8;radius<=24&&!chosen;radius+=4)
    for(let i=0;i<20;i++){
     const t=2*Math.PI*i/20+site.trainers.size*.3;
     const x=base.x+Math.round(Math.cos(t)*radius);
     const z=base.z+Math.round(Math.sin(t)*radius);
     const height=g.terrain.getHeight(x,z);
     if(height<=g.terrain.waterY+.8||g.terrain.getSlope(x,z)>.55)continue;
     if(g.structures.colliders.some(h=>Math.hypot(h.x-x,h.z-z)<4.1))continue;
     if(g.npcs.list.some(n=>Math.hypot(n.pos.x-x,n.pos.z-z)<3.3))continue;
     chosen={x,z};break;
    }
   if(chosen){
    // Spawn and animate ONLY genuine pre-existing KayKit NPC rigs.
    const npc=g.npcs._makeNPC({id:trainer.id,
      name:trainer.role+' · '+site.hub.name,
      x:chosen.x,z:chosen.z,model:P192_TRAINER_MODELS[trainer.id]});
    npc.p192TrainerId=trainer.id;
    npc.p192HubId=site.hub.id;
    g.npcs.list.push(npc);
    site.trainers.add(trainer.id);
   }else site.trainers.add(trainer.id); // unplaced; never fabricate an invalid NPC location
  }
 }
 report(){
  return [...this.sites].map(([id,v])=>({id,center:v.pos,
   houses:v.houses.filter(Boolean).length,npcs:v.trainers.size,status:v.status,
   quest:this.quests[id]}));
 }
}
