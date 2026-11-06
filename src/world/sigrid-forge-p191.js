/**
 * P191 — REAL early W0 craftsmanship through the pre-existing Sigrid NPC.
 * No new NPC, fake building, dummy resources, debug grants or invented mesh.
 * Wolf pelts and prairie wolf fangs already drop from live enemies.
 * Armor/steel sword already exist in ITEM_DB and Inventory equipment.
 */
export const SIGRID_STARTER_RECIPES_P191=Object.freeze([
 Object.freeze({id:'starter_steel_blade',profession:'weaponcrafting',
  name:'Forjar espada reforzada',inputs:Object.freeze([Object.freeze({id:'wolf_fang',qty:2})]),
  gold:25,result:'steel_sword',exp:3}),
 Object.freeze({id:'starter_hide_armor',profession:'armorcrafting',
  name:'Confeccionar armadura de cazador',
  inputs:Object.freeze([Object.freeze({id:'wolf_pelt',qty:2})]),
  gold:20,result:'hide_armor',exp:3})
]);
const map=new Map(SIGRID_STARTER_RECIPES_P191.map(x=>[x.id,x]));
export function canCraftWithSigridP191(game,id){
 const recipe=map.get(id);
 if(!recipe)return {ok:false,reason:'UNKNOWN_RECIPE'};
 const npc=game?.npcs?.list?.find(n=>n.id==='sigrid');
 const p=game?.player?.pos;
 if(game?.state!=='dialogue'||!npc||!p||
    (npc.pos.x-p.x)**2+(npc.pos.z-p.z)**2>144)
   return {ok:false,reason:'NOT_AT_FORGE'};
 if(!game?.p187Professions?.isLearned(recipe.profession))
   return {ok:false,reason:'PROFESSION_NOT_LEARNED'};
 const inv=game?.inventory;
 if(!inv||recipe.inputs.some(entry=>(inv.slots.get(entry.id)||0)<entry.qty))
   return {ok:false,reason:'MISSING_MATERIALS'};
 if(inv.gold<recipe.gold)return {ok:false,reason:'MISSING_GOLD'};
 return {ok:true,recipe};
}
/** One verified in-world material transaction -> one item -> one profession award. */
export function craftWithSigridP191(game,id){
 const check=canCraftWithSigridP191(game,id);
 if(!check.ok)return check;
 const {recipe}=check,inv=game.inventory,prof=game.p187Professions;
 // Guard all quantities before touching the inventory; this process is
 // synchronous with no yield and impossible to double-consume via one tap.
 for(const item of recipe.inputs)inv.removeItem(item.id,item.qty);
 inv.gold-=recipe.gold;
 inv.addItem(recipe.result,1);
 const prefix='p191_forge_'+recipe.id+'_';
 const times=Object.keys(prof.state.awarded).filter(x=>x.startsWith(prefix)).length;
 const award=prof.grantFromVerifiedActivity(recipe.profession,prefix+(times+1),recipe.exp);
 game.audio?.play?.('craft');
 game.hud?.notify?.('Sigrid: '+recipe.name+' · Oficio +'+(award.delta||0));
 game.saveSys?.save?.({silent:true});
 return {ok:true,recipeId:id,itemId:recipe.result,profession:recipe.profession,
  experienceAwarded:award.delta||0,goldSpent:recipe.gold};
}
