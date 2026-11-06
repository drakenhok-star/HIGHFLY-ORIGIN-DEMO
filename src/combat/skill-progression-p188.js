/**
 * HIGHFLY P188 — permanent RPG skill progression.
 *
 * Canonical 15 ids from the L26 combat export. Skills have THREE distinct
 * states: unknown (not discovered), discovered (can learn), learned (can equip).
 * A learned skill is usable ONLY if explicitly equipped to an S1-S3 slot.
 * No laboratory "unlock all", no classes and no extra base character stats.
 *
 * The four real legacy quest rewards are RETROACTIVE on migrating a P187 save;
 * all remaining sources require future actual quest completions, not a level-up
 * shortcut. A quest id can be rewarded once; learning/equipping is a player act.
 */
import {HIGHFLY_SKILL_EXPORT_L26} from '../skillslab/skill-catalog-export-l26.js';
export const SKILL_STATE_VERSION_P188=188;
const Q=Object.freeze({
  q1:'woc_fireball',
  q2:'tig_iron_wave',
  q3:'guin_violet_lance',
  p18_frontier:'dyr_fury_slashes'
});
export const SKILL_QUEST_REWARDS_P188=Q;
const planned={
 guin_ascension:['quest_skyward_training','Escuela de combate aéreo · misión futura',8],
 guin_tempest:['quest_mountain_tempest','Ruinas de la tormenta · misión futura',17],
 dyr_step:['quest_shadow_steps','Maestro de movilidad · misión futura',9],
 dyr_final_cut:['quest_abyss_trial','Desafío de la oscuridad · misión futura',19],
 tig_charge:['quest_guardian_charge','Entrenamiento de escudo · misión futura',10],
 tig_collapse:['quest_crystal_collapse','Caverna de cristales · misión futura',18],
 woc_meteor:['quest_meteor_cave','Investigación arcana · misión futura',15],
 woc_frost_nova:['quest_frost_tutor','Boticaria de hielo · misión futura',12],
 woc_backstab:['quest_rogue_shadow','Reconocimiento de bandidos · misión futura',6],
 woc_kidney_shot:['quest_rogue_precision','Maestro pícaro · misión futura',11],
 woc_charge:['quest_combat_charge','Entrenamiento del cazador · misión futura',7]
};
export const SKILL_ORIGINS_P188=Object.freeze(HIGHFLY_SKILL_EXPORT_L26.map(skill=>{
 const legacy=Object.entries(Q).find(([,id])=>id===skill.id);
 const future=planned[skill.id];
 return Object.freeze({
  id:skill.id,name:skill.name,kit:skill.kit,
  questId:legacy?.[0]||future?.[0],
  source:legacy?{
   q1:'Olaf: Amenaza de lobos',
   q2:'Sigrid: Espada ancestral',
   q3:'Olaf: Amenaza del dragón',
   p18_frontier:'Bjorn: Patrullas fronterizas'
  }[legacy[0]]:future?.[1],
  recommendedLevel:legacy?{q1:2,q2:3,q3:12,p18_frontier:5}[legacy[0]]:future?.[2],
  implemented:!!legacy
 });
}));
const allowed=new Set(HIGHFLY_SKILL_EXPORT_L26.map(s=>s.id));
const safeMap=raw=>{
 const m=Object.create(null);
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))
  for(const [id,v] of Object.entries(raw))if(allowed.has(id)&&v===true)m[id]=true;
 return m;
};
export function newSkillStateP188(raw){
 const data=raw?.schemaVersion===SKILL_STATE_VERSION_P188?raw:null;
 const discovered=safeMap(data?.discovered);
 const learned=safeMap(data?.learned);
 // Every learned skill is, by definition, already discovered.
 for(const id of Object.keys(learned))discovered[id]=true;
 const equipped=[null,null,null];
 const source=Array.isArray(data?.equipped)?data.equipped:[];
 for(let i=0;i<3;i++){
  const id=source[i];
  if(typeof id==='string'&&learned[id]&&!equipped.includes(id))
   equipped[i]=id;
 }
 return {schemaVersion:188,discovered,learned,equipped};
}
export function rewardQuestSkillP188(current,questId){
 const id=Q[questId];
 const next=newSkillStateP188(current);
 if(!id)return {state:next,awardedId:null};
 if(next.discovered[id])return {state:next,awardedId:null};
 next.discovered[id]=true;
 return {state:next,awardedId:id};
}
export function learnSkillP188(current,id){
 const next=newSkillStateP188(current);
 if(!allowed.has(id)||!next.discovered[id])return {state:next,ok:false,reason:'UNDISCOVERED'};
 if(next.learned[id])return {state:next,ok:false,reason:'ALREADY_LEARNED'};
 next.learned[id]=true;return {state:next,ok:true};
}
export function equipSkillP188(current,id,slot){
 const next=newSkillStateP188(current);
 if(!Number.isInteger(slot)||slot<1||slot>3)return {state:next,ok:false,reason:'SLOT'};
 if(id!==null&&(!allowed.has(id)||!next.learned[id]))return {state:next,ok:false,reason:'NOT_LEARNED'};
 next.equipped=next.equipped.map(x=>x===id&&x!==null?null:x);
 next.equipped[slot-1]=id;
 return {state:next,ok:true};
}
export class SkillProgressP188{
 constructor(game){this.game=game;this.reset();}
 reset(){this.state=newSkillStateP188();}
 serialize(){return newSkillStateP188(this.state);}
 applyData(data){this.state=newSkillStateP188(data);}
 rewardQuest(id){
  const {state,awardedId}=rewardQuestSkillP188(this.state,id);
  this.state=state;
  return awardedId;
 }
 syncExistingQuests(){
  const q=this.game.quests;
  for(const questId of ['q1','q2','q3','p18_frontier'])
   if(q?.getState?.(questId)==='done')this.rewardQuest(questId);
 }
 discover(id,questId){
  const src=SKILL_ORIGINS_P188.find(s=>s.id===id);
  // Future quests must pass through a completed quest entry; no debug grant.
  if(!src||src.questId!==questId||src.implemented!==true ||
     this.game?.quests?.getState?.(questId)!=='done')return false;
  return !!this.rewardQuest(questId);
 }
 learn(id){
  const x=learnSkillP188(this.state,id);this.state=x.state;
  if(x.ok)this.game?.saveSys?.save?.({silent:true});
  return x.ok;
 }
 equip(id,slot){
  const x=equipSkillP188(this.state,id,slot);this.state=x.state;
  if(x.ok)this.game?.saveSys?.save?.({silent:true});
  return x.ok;
 }
 selected(slot){
  return Number.isInteger(slot)&&slot>=1&&slot<=3
   ?HIGHFLY_SKILL_EXPORT_L26.find(s=>s.id===this.state.equipped[slot-1])||null
   :null;
 }
}
