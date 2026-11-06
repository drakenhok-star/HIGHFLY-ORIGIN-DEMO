/**
 * HIGHFLY P190: six equal RPG skill slots, classless.
 *
 * 15 carried-over L27 skills + 3 native Tianjie word-wall skills are ALL
 * ordinary learnable skills. No "ultimate", "special" or class hierarchy.
 * Old P188 3-slot saves migrate without altering their original save key.
 *
 * NEW characters don't inherit the native FUS implementation's internal
 * compatibility seed: they must actually find/earn a skill to equip it.
 */
import {HIGHFLY_SKILL_EXPORT_L26} from '../skillslab/skill-catalog-export-l26.js';
import {ABILITIES_P6} from './abilities-p6.js';
import {SKILL_QUEST_REWARDS_P188,SKILL_ORIGINS_P188} from './skill-progression-p188.js';

const RUNE_SKILLS=Object.freeze([
 Object.freeze({id:'native_fus',name:'Onda de fuerza',kit:'TIANJIE_NATIVE',nativeId:'fus',slot:1,resource:'ENERGY',cost:ABILITIES_P6.S2.cost,cd:ABILITIES_P6.S2.cd,kind:'native'}),
 Object.freeze({id:'native_frost',name:'Aliento helado',kit:'TIANJIE_NATIVE',nativeId:'frost',slot:2,resource:'MP',cost:ABILITIES_P6.S3.cost,cd:ABILITIES_P6.S3.cd,kind:'native'}),
 Object.freeze({id:'native_wuld',name:'Embestida veloz',kit:'TIANJIE_NATIVE',nativeId:'wuld',slot:3,resource:'ENERGY',cost:ABILITIES_P6.S4.cost,cd:ABILITIES_P6.S4.cd,kind:'native'})
]);
export const HIGHFLY_SKILLS_P190=Object.freeze([...HIGHFLY_SKILL_EXPORT_L26,...RUNE_SKILLS]);
export const SKILL_SLOT_COUNT_P190=6;
export const SKILL_SCHEMA_P190=190;
export const SKILL_ORIGINS_P190=Object.freeze([
 ...SKILL_ORIGINS_P188,
 ...RUNE_SKILLS.map(skill=>Object.freeze({
  id:skill.id,name:skill.name,kit:skill.kit,
  source:'Piedras de conocimiento · exploración del mundo',
  questId:null,recommendedLevel:null,implemented:true,acquisition:'word_wall'
 }))
]);
const allowed=new Set(HIGHFLY_SKILLS_P190.map(s=>s.id));
const nativeIds=new Map(RUNE_SKILLS.map(s=>[s.nativeId,s.id]));
const cleanFlags=(raw)=>{
 const out=Object.create(null);
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))
  for(const [k,v] of Object.entries(raw))
   if(allowed.has(k)&&v===true)out[k]=true;
 return out;
};
export function newSkillStateP190(raw){
 const data=raw&&[188,190].includes(raw.schemaVersion)?raw:null;
 const discovered=cleanFlags(data?.discovered),learned=cleanFlags(data?.learned);
 for(const id of Object.keys(learned))discovered[id]=true;
 const equipped=Array(SKILL_SLOT_COUNT_P190).fill(null);
 for(let i=0;i<SKILL_SLOT_COUNT_P190;i++){
  const id=data?.equipped?.[i];
  if(typeof id==='string'&&learned[id]&&!equipped.includes(id))equipped[i]=id;
 }
 return {schemaVersion:190,discovered,learned,equipped};
}
export function learnSkillP190(raw,id){
 const state=newSkillStateP190(raw);
 if(!allowed.has(id)||!state.discovered[id])
  return {state,ok:false,reason:'UNDISCOVERED'};
 if(state.learned[id])return {state,ok:false,reason:'ALREADY_LEARNED'};
 state.learned[id]=true;return {state,ok:true};
}
export function equipSkillP190(raw,id,slot){
 const state=newSkillStateP190(raw);
 if(!Number.isInteger(slot)||slot<1||slot>6)
  return {state,ok:false,reason:'SLOT'};
 if(id!==null&&(!allowed.has(id)||!state.learned[id]))
  return {state,ok:false,reason:'NOT_LEARNED'};
 if(id!==null)for(let i=0;i<6;i++)if(state.equipped[i]===id)state.equipped[i]=null;
 state.equipped[slot-1]=id;
 return {state,ok:true};
}
export function rewardQuestSkillP190(raw,questId){
 const state=newSkillStateP190(raw),id=SKILL_QUEST_REWARDS_P188[questId];
 if(!allowed.has(id)||state.discovered[id])return {state,awardedId:null};
 state.discovered[id]=true;
 return {state,awardedId:id};
}
export class SkillProgressP190{
 constructor(game){this.game=game;this.reset();}
 reset(){this.state=newSkillStateP190();this._sync=0;}
 serialize(){return newSkillStateP190(this.state);}
 applyData(raw){this.state=newSkillStateP190(raw);}
 rewardQuest(q){
  const {state,awardedId}=rewardQuestSkillP190(this.state,q);
  this.state=state;
  return awardedId;
 }
 syncExistingQuests(){
  for(const [q,id] of Object.entries(SKILL_QUEST_REWARDS_P188))
   if(!this.state.discovered[id]&&this.game.quests?.getState?.(q)==='done')
    this.rewardQuest(q);
 }
 /**
  * On importing P189/P188 ONLY, old learned word-wall shouts are real
  * preexisting character progress. The fourth button becomes a normal S4.
  * For fresh P190 saves this is NOT run: unequipping stays permanent.
  */
 migratePriorCombat(combatData){
  if(!combatData||!Array.isArray(combatData.learned))return;
  for(const native of combatData.learned){
   const id=nativeIds.get(native);
   if(!id)continue;
   this.state.discovered[id]=true;
   this.state.learned[id]=true;
  }
  const selected=nativeIds.get(combatData.equipped);
  if(selected&&this.state.learned[selected]&&!this.state.equipped.includes(selected)&&
    !this.state.equipped[3])
   this.state.equipped[3]=selected;
 }
 /** The legacy world owns the actual word wall and skill acquisition event. */
 syncWorldRunes(){
  const walls=this.game?.structures?.wordWalls;
  if(!Array.isArray(walls))return;
  for(const wall of walls){
   if(!wall?.learned||!wall.shoutId)continue;
   const id=nativeIds.get(wall.shoutId);
   if(!id||this.state.learned[id])continue;
   this.state.discovered[id]=true;this.state.learned[id]=true;
   this.game?.hud?.notify?.('Nueva habilidad aprendida: '+HIGHFLY_SKILLS_P190.find(s=>s.id===id).name);
   this.game?.saveSys?.save?.({silent:true});
  }
 }
 tick(dt){
  this._sync+=Number.isFinite(dt)?dt:0;
  if(this._sync>=.9){this._sync=0;this.syncExistingQuests();this.syncWorldRunes();}
 }
 discover(id,questId){
  const origin=SKILL_ORIGINS_P190.find(s=>s.id===id);
  if(!origin?.questId||origin.questId!==questId||
    this.game.quests?.getState?.(questId)!=='done')return false;
  return !!this.rewardQuest(questId);
 }
 learn(id){
  const sk=HIGHFLY_SKILLS_P190.find(s=>s.id===id);
  // Word-wall skills must be learned at their actual location, NOT bought
  // through a fake free "APRENDER" button from a text description.
  if(!sk||sk.kind==='native'&&!this.state.learned[id])return false;
  const x=learnSkillP190(this.state,id);this.state=x.state;
  if(x.ok)this.game.saveSys?.save?.({silent:true});
  return x.ok;
 }
 equip(id,slot){
  const x=equipSkillP190(this.state,id,slot);this.state=x.state;
  if(x.ok)this.game.saveSys?.save?.({silent:true});
  return x.ok;
 }
 selected(slot){
  if(!Number.isInteger(slot)||slot<1||slot>6)return null;
  return HIGHFLY_SKILLS_P190.find(s=>s.id===this.state.equipped[slot-1])||null;
 }
}
