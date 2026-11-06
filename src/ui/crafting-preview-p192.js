/**
 * P192 — explicit, inspectable crafting confirmation (never craft on recipe tap).
 * Source of truth for materials and payment remains crafting runtime at confirm.
 */
import {ITEM_DB} from '../systems/inventory.js';
export function recipePreviewP192(game,recipe){
 const inv=game.inventory;
 const inputs=(recipe.inputs||[]).map(i=>{
  const owned=inv.slots.get(i.id)||0;
  return {id:i.id,name:ITEM_DB[i.id]?.name||i.id,needed:i.qty,owned,ok:owned>=i.qty};
 });
 const result=ITEM_DB[recipe.result];
 return {
  id:recipe.id,name:recipe.name,inputs,
  gold:recipe.gold||0,ownedGold:inv.gold,
  result:result?.name||recipe.result,
  resultId:recipe.result,
  ready:inputs.every(i=>i.ok)&&inv.gold>=recipe.gold
 };
}
export function openCraftPreviewP192(npcs,npc,recipe,commit){
 const game=npcs.game,menus=game.menus;
 const data=recipePreviewP192(game,recipe);
 let consumed=false;
 const back=()=>npcs.startDialogue(npc);
 menus.showDialogue({
  name:npc.name+' · MESA DE FABRICACIÓN',
  text:'RECETA: '+data.name+'. Elegí FORJAR 1 para confirmar un solo objeto. No se crean objetos al tocar la receta.',
  craftPreview:data,
  options:[
   {label:data.ready?'✓ FORJAR 1 · CONFIRMAR':'✕ FALTAN MATERIALES U ORO',
    disabled:!data.ready,action:()=>{
     if(consumed||game.state!=='dialogue')return;
     const current=recipePreviewP192(game,recipe);
     if(!current.ready){
      game.hud.notify('Materiales insuficientes para '+recipe.name);
      back();return;
     }
     consumed=true;
     const outcome=commit();
     if(!outcome?.ok){
      consumed=false;game.hud.notify('No se pudo fabricar: '+(outcome?.reason||'revisá materiales'));
      back();return;
     }
     // No automatic return to the clickable recipe list. A second craft
     // always requires selecting its recipe AND confirming again.
     menus.showDialogue({
      name:npc.name+' · FABRICACIÓN COMPLETADA',
      text:'✔ Creaste 1 × '+data.result+'. Materiales y oro descontados. El objeto ya está en tu mochila.',
      options:[
       {label:'VER OTRAS RECETAS',action:back},
       {label:'TERMINAR',action:()=>menus.closeDialogue()}
      ]
     });
    }},
   {label:'VOLVER SIN FABRICAR',action:back}
  ]
 });
}
