/**
 * HIGHFLY P197 · First playable MIT quest-data migration from WOC v0.44.7.
 * Source: levy-street/world-of-claudecraft @
 * 493c35a108cef6c8aa290e8793107b1cd117886e
 * src/sim/content/zone1.ts, ZONE1_QUESTS
 * MIT code and quest definitions only; NO WOC models, music or non-CC0 icons.
 * 
 * Copper rewards are mapped to the HIGHFLY gold economy at numerical parity
 * for beta balancing, deliberately not claiming unchanged economic value.
 * Character models/dialogue targets use already existing HIGHFLY CC0 resources.
 * Quests use isolated IDs, preserving original quest IDs as sourceId.
 */
export const CC_QUESTS_P197=Object.freeze([
 Object.freeze({id:'cc_q_wolves',sourceId:'q_wolves',name:'Lobos a las puertas',
   giver:'olaf',sourceGiver:'marshal_redbrook',needLevel:1,requires:'q1',
   desc:'Derrotá 8 lobos del bosque. Se contabilizan desde que aceptás este encargo.',
   kills:Object.freeze({wolf:8}),collect:null,rewardXp:250,rewardGold:75,
   origin:'Eastbrook Vale · Wolves at the Door'}),
 Object.freeze({id:'cc_q_boars',sourceId:'q_boars',name:'Cueros de jabalí',
   giver:'master_tanner',sourceGiver:'trader_wilkes',needLevel:1,requires:null,
   desc:'Traé 5 cueros de jabalí para preparar mochilas de viaje.',
   kills:null,collect:Object.freeze({item:'boar_hide',qty:5}),
   rewardXp:350,rewardGold:120,
   origin:'Eastbrook Vale · Bristly Boar Hides'}),
 Object.freeze({id:'cc_q_spiders',sourceId:'q_spiders',name:'Amenaza de las telarañas',
   giver:'master_herbalist',sourceGiver:'apothecary_lin',needLevel:2,requires:null,
   desc:'Derrotá 6 arañas y entregá 4 sedas de araña para la botica.',
   kills:Object.freeze({spider:6}),collect:Object.freeze({item:'spider_silk',qty:4}),
   rewardXp:420,rewardGold:140,
   origin:'Eastbrook Vale · Sableweb Menace'})
]);
export const CC_QUESTS_BY_ID_P197=Object.freeze(Object.fromEntries(CC_QUESTS_P197.map(q=>[q.id,q])));
const validProgress=(x)=>Math.min(10000,Math.max(0,Number.isSafeInteger(x)?x:0));
export class ClaudeQuestBridgeP197 {
 constructor(game){this.game=game;this.reset();}
 reset(){this.states=Object.fromEntries(CC_QUESTS_P197.map(q=>[q.id,'available']));
   this.kills=Object.fromEntries(CC_QUESTS_P197.map(q=>[q.id,{}]));}
 getState(id){
   const q=CC_QUESTS_BY_ID_P197[id];if(!q)return 'unknown';
   const state=this.states[id];
   if(state==='done')return 'done';
   if(state==='active'&&this.ready(id))return 'complete';
   return state;
 }
 unlocked(q){
   if(this.game.stats.level<q.needLevel)return false;
   return !q.requires||this.game.quests.getState(q.requires)==='done';
 }
 accept(id){
   const q=CC_QUESTS_BY_ID_P197[id];
   if(!q||this.states[id]!=='available'||!this.unlocked(q))return false;
   this.states[id]='active';this.kills[id]={};
   this.game.hud.questBanner('Misión aceptada: '+q.name);
   this.game.saveSys.save({silent:true});
   return true;
 }
 onEnemyKilled(type){
   for(const q of CC_QUESTS_P197){
     if(this.states[q.id]!=='active'||!q.kills||!(type in q.kills))continue;
     const current=this.kills[q.id][type]||0;
     this.kills[q.id][type]=Math.min(q.kills[type],current+1);
     if(this.ready(q.id))this.game.hud.questBanner('Objetivo completado: '+q.name);
   }
 }
 itemsHeld(q){return q.collect?(this.game.inventory.slots.get(q.collect.item)||0):0;}
 ready(id){
   const q=CC_QUESTS_BY_ID_P197[id];
   if(!q||this.states[id]!=='active')return false;
   if(q.kills&&Object.entries(q.kills).some(([kind,need])=>
     (this.kills[id]?.[kind]||0)<need))return false;
   return !q.collect||this.itemsHeld(q)>=q.collect.qty;
 }
 turnIn(id,npcId){
   const q=CC_QUESTS_BY_ID_P197[id];
   if(!q||npcId!==q.giver||!this.ready(id))return false;
   const inv=this.game.inventory;
   if(q.collect){
     if((inv.slots.get(q.collect.item)||0)<q.collect.qty)return false;
     inv.removeItem(q.collect.item,q.collect.qty);
   }
   this.states[id]='done';
   inv.gold+=q.rewardGold;this.game.stats.addXP(q.rewardXp);
   this.game.hud.questBanner('Misión completada: '+q.name);
   this.game.hud.notify('+'+q.rewardGold+' oro · +'+q.rewardXp+' XP');
   this.game.audio.play('quest');
   this.game.saveSys.save({silent:true});return true;
 }
 list(){
   return CC_QUESTS_P197.map(q=>{
     const kills=Object.entries(q.kills||{});
     const steps=kills.map(([type,need])=>Math.min(need,this.kills[q.id]?.[type]||0));
     const itemCount=q.collect?Math.min(q.collect.qty,this.itemsHeld(q)):0;
     const need=kills.reduce((a,[_,n])=>a+n,0)+(q.collect?.qty||0);
     return {id:q.id,name:q.name,desc:q.desc,state:this.getState(q.id),
       locked:!this.unlocked(q),progress:steps.reduce((a,n)=>a+n,0)+itemCount,
       need,rewardGold:q.rewardGold,rewardXp:q.rewardXp,
       giver:q.giver,kind:'secundaria',secret:false,
       sourceId:q.sourceId};
   });
 }
 dialogueOptions(npcId,reopen){
   const out=[];
   for(const q of CC_QUESTS_P197.filter(q=>q.giver===npcId)){
     const state=this.getState(q.id);
     if(state==='done')continue;
     if(state==='available'&&this.unlocked(q))out.push({
       label:'CLAUDECRAFT · '+q.name+' · '+q.rewardXp+' XP',
       action:()=>{this.accept(q.id);reopen();}
     });
     if(state==='active')out.push({
       label:'MISIÓN · '+q.name+' ('+this.list().find(v=>v.id===q.id).progress+'/'+this.list().find(v=>v.id===q.id).need+')',
       action:()=>{this.game.hud.notify(q.desc);reopen();}
     });
     if(state==='complete')out.push({
       label:'ENTREGAR · '+q.name+' · '+q.rewardGold+' oro',
       action:()=>{this.turnIn(q.id,npcId);reopen();}
     });
   }
   return out;
 }
 serialize(){return {schemaVersion:197,states:{...this.states},
   kills:Object.fromEntries(Object.entries(this.kills).map(([id,obj])=>[id,{...obj}]))};}
 applyData(raw){
   if(!raw||raw.schemaVersion!==197)return;
   for(const q of CC_QUESTS_P197){
     if(['available','active','done'].includes(raw.states?.[q.id]))
       this.states[q.id]=raw.states[q.id];
     for(const type of Object.keys(q.kills||{}))
       this.kills[q.id][type]=Math.min(q.kills[type],validProgress(raw.kills?.[q.id]?.[type]));
   }
 }
}
