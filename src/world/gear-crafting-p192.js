/**
 * P192 genuine early RPG equipment recipes; logical equipment attributes
 * only, NO fabricated visual armor mesh. Materials are existing W0 drops.
 * Profession ids follow verified WOC v0.44.7 MIT code taxonomy.
 */
import {ITEM_DB} from '../systems/inventory.js';
export const GEAR_RECIPES_P192=Object.freeze([
 {id:'hunter_hood',trainerId:'sigrid',profession:'armorcrafting',name:'Capucha del cazador',
  inputs:[{id:'wolf_pelt',qty:2},{id:'boar_hide',qty:1}],gold:28,result:'hunter_hood',exp:2,requiredSkill:0},
 {id:'hunter_shoulders',trainerId:'sigrid',profession:'armorcrafting',name:'Hombreras del guardabosques',
  inputs:[{id:'boar_hide',qty:2},{id:'wolf_fang',qty:1}],gold:30,result:'hunter_shoulders',exp:3,requiredSkill:0},
 {id:'hunter_gloves',trainerId:'master_tanner',profession:'leatherworking',name:'Guantes de cuero',
  inputs:[{id:'boar_hide',qty:1},{id:'fox_fur',qty:1}],gold:18,result:'hunter_gloves',exp:2,requiredSkill:0},
 {id:'trail_leggings',trainerId:'master_tailor',profession:'tailoring',name:'Pantalones del sendero',
  inputs:[{id:'spider_silk',qty:2},{id:'wolf_pelt',qty:1}],gold:27,result:'trail_leggings',exp:3,requiredSkill:0},
 {id:'trail_boots',trainerId:'master_tailor',profession:'tailoring',name:'Botas de explorador',
  inputs:[{id:'wolf_pelt',qty:1},{id:'boar_hide',qty:1}],gold:22,result:'trail_boots',exp:2,requiredSkill:0},
 {id:'antler_pendant',trainerId:'master_jeweler',profession:'jewelcrafting',name:'Colgante de astas',
  inputs:[{id:'deer_antler',qty:1},{id:'wolf_fang',qty:1}],gold:38,result:'antler_pendant',exp:3,requiredSkill:0},
 {id:'shore_ring',trainerId:'master_jeweler',profession:'jewelcrafting',name:'Anillo del litoral',
  inputs:[{id:'crab_shell',qty:2},{id:'spider_silk',qty:1}],gold:42,result:'shore_ring',exp:4,requiredSkill:0}
].map(x=>Object.freeze({...x,inputs:Object.freeze(x.inputs.map(Object.freeze))})));
const byId=new Map(GEAR_RECIPES_P192.map(x=>[x.id,x]));
export function verifyGearCraftP192(game,trainerId,recipeId){
 const recipe=byId.get(recipeId);
 if(!recipe||recipe.trainerId!==trainerId)return {ok:false,reason:'WRONG_TRAINER'};
 const npc=game.npcs?.list.find(n=>n.id===trainerId);
 const p=game.player?.pos;
 if(game.state!=='dialogue'||!npc||!p||
   (npc.pos.x-p.x)**2+(npc.pos.z-p.z)**2>144)
   return {ok:false,reason:'NOT_AT_TRAINER'};
 if(!game.p187Professions?.isLearned(recipe.profession))
   return {ok:false,reason:'PROFESSION_NOT_LEARNED'};
 const points=game.p187Professions.state.experience[recipe.profession]||0;
 if(points<recipe.requiredSkill)return {ok:false,reason:'SKILL_TOO_LOW'};
 const inv=game.inventory;
 if(!ITEM_DB[recipe.result]||
  recipe.inputs.some(x=>(inv.slots.get(x.id)||0)<x.qty))
   return {ok:false,reason:'MISSING_MATERIALS'};
 if(inv.gold<recipe.gold)return {ok:false,reason:'MISSING_GOLD'};
 return {ok:true,recipe};
}
export function craftGearP192(game,trainerId,recipeId){
 const check=verifyGearCraftP192(game,trainerId,recipeId);
 if(!check.ok)return check;
 const recipe=check.recipe,inv=game.inventory;
 for(const item of recipe.inputs)inv.removeItem(item.id,item.qty);
 inv.gold-=recipe.gold;
 inv.addItem(recipe.result,1);
 const prefix='p192_gear_'+recipe.id+'_';
 const prof=game.p187Professions;
 const n=Object.keys(prof.state.awarded).filter(x=>x.startsWith(prefix)).length;
 const award=prof.grantFromVerifiedActivity(recipe.profession,prefix+(n+1),recipe.exp);
 game.audio?.play?.('craft');game.saveSys?.save?.({silent:true});
 return {ok:true,itemId:recipe.result,recipeId,experienceAwarded:award.delta||0};
}
