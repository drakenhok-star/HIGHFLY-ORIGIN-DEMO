import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEM_DB,Inventory} from '../src/systems/inventory.js';
import {P187ProfessionRuntime} from '../src/world/professions-runtime-p187.js';
import {SIGRID_STARTER_RECIPES_P191} from '../src/world/sigrid-forge-p191.js';
import {recipePreviewP192} from '../src/ui/crafting-preview-p192.js';
import {GEAR_RECIPES_P192,craftGearP192,verifyGearCraftP192} from '../src/world/gear-crafting-p192.js';
import {P192Hamlets,HAMLET_QUESTS_P192,P192_TRAINER_MODELS,
 safeHamletSiteP192,findHamletSiteP192,newHamletQuestStateP192} from '../src/world/hamlets-p192.js';
import {INICIOS_HUBS_P186,INICIOS_TRAINERS_P186,
 INICIOS_PROFESSIONS_P186} from '../src/world/inicios-v2-p186.js';
import {HUD_LAYOUT_KEY,HUD_DEFAULTS,sanitizeHudLayout} from '../src/ui/p10-layout.js';
import {P183B_CAMPS,P183B_COAST_TEMPLATE} from '../src/world/biome-families-p183b.js';
import {P183_BONUS_TABLES} from '../src/systems/loot-table-p183.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=JSON.parse(source('docs/audit/WOC0447_WIKI_CROSSWALK_P192.json'));
const entireRecipes=JSON.parse(source('docs/audit/WOC0447_RECIPES_209_P192.json'));
const completeWorld=JSON.parse(source('docs/audit/WOC0447_BESTIARY_78_WORLD_15_P192.json'));
assert.equal(entireRecipes.rows.length,209,'all wiki recipe details retained');
assert.equal(completeWorld.families.flatMap(f=>f.creatures).length,78);
assert.equal(completeWorld.zones.length,15);
assert.equal(completeWorld.dungeons.length,6);
assert.ok(entireRecipes.rows.every(x=>!x.output?.url),
 'no copyrighted visual GLB or icon URLs included');

assert.equal(index.professions.length,15,'all WOC wiki profession routes examined');
assert.equal(index.professions.filter(x=>x.category==='crafting').length,10);
assert.equal(index.professions.filter(x=>x.category==='gathering').length,5);
assert.equal(index.professions.reduce((s,p)=>s+(p.recipeCount||0),0),209);
assert.equal(index.world.zones.length,15);
assert.equal(index.world.dungeons.length,6);
assert.equal(index.bestiary.reduce((s,x)=>s+x.count,0),78);
assert.deepEqual(
 index.professions.map(x=>x.id).sort(),
 INICIOS_PROFESSIONS_P186.map(x=>x.id).sort()
);
// Audit real LIVE W0 drops, not merely registered inventory IDs. Each
// gathering errand and starter crafting input must be earnable from P183B
// families (or original guaranteed wolf/draugr/spider loot).
const obtainable=new Set(['wolf_pelt','draugr_bone','spider_silk']);
for(const camp of [...P183B_CAMPS,P183B_COAST_TEMPLATE])obtainable.add(camp.drop);
for(const rolls of Object.values(P183_BONUS_TABLES))
 for(const entry of rolls)obtainable.add(entry.id);
for(const q of HAMLET_QUESTS_P192)
 assert.ok(obtainable.has(q.item),'P192 quest drop is not really obtainable: '+q.item);
for(const recipe of GEAR_RECIPES_P192)
 for(const item of recipe.inputs)
  assert.ok(obtainable.has(item.id),'P192 gear material not really obtainable: '+item.id);
assert.equal(HAMLET_QUESTS_P192.length,7);
assert.equal(INICIOS_HUBS_P186.length,8);
assert.equal(Object.keys(P192_TRAINER_MODELS).length,13);
for(const q of HAMLET_QUESTS_P192){
 assert.ok(ITEM_DB[q.item],'quest material must be in real game loot catalogue: '+q.item);
 assert.ok(q.qty>0);
 assert.ok(INICIOS_HUBS_P186.some(h=>h.id===q.hubId));
}
assert.equal(GEAR_RECIPES_P192.length,7);
const gearSlots=new Set(GEAR_RECIPES_P192.map(x=>ITEM_DB[x.result]?.gearSlot));
assert.deepEqual([...gearSlots].sort(),
 ['boots','gloves','head','legs','neck','rings','shoulders']);
for(const r of GEAR_RECIPES_P192){
 assert.ok(ITEM_DB[r.result]?.type==='gear',r.result);
 assert.ok(r.inputs.every(x=>ITEM_DB[x.id]&&x.qty>0));
 assert.ok(INICIOS_TRAINERS_P186.some(t=>t.id===r.trainerId));
 assert.ok(r.gold>0);
}
assert.equal(SIGRID_STARTER_RECIPES_P191.length,2);

const notifications=[],game={
 p192Build:true,state:'dialogue',player:{pos:{x:16.5,z:49.5}},
 stats:{level:10,addXP(x){this.xp=(this.xp||0)+x;}},
 npcs:{list:[{id:'sigrid',pos:{x:16.5,z:49.5}},
  {id:'master_tanner',p192TrainerId:'master_tanner',pos:{x:2,z:3}}]},
 hud:{notify(s){notifications.push(s);},questBanner(s){notifications.push(s);}},
 quests:{onItemAcquired(){}},audio:{play(){}},
 saveSys:{count:0,save(){this.count++}}
};
game.inventory=new Inventory(game);
game.p187Professions=new P187ProfessionRuntime(game);
assert.equal(verifyGearCraftP192(game,'sigrid','hunter_hood').reason,'PROFESSION_NOT_LEARNED');
assert.equal(game.p187Professions.learnAtTrainer('armorcrafting','sigrid').ok,true);
game.inventory.slots.set('wolf_pelt',3);
game.inventory.slots.set('boar_hide',2);
game.inventory.gold=100;
const p=recipePreviewP192(game,GEAR_RECIPES_P192[0]);
assert.equal(p.ready,true);assert.equal(p.inputs[0].owned,3);
assert.equal(game.inventory.slots.get('hunter_hood')||0,0,
 'opening recipe preview does NOT craft anything');
const a=craftGearP192(game,'sigrid','hunter_hood');
assert.equal(a.ok,true);
assert.equal(game.inventory.slots.get('hunter_hood'),1);
assert.equal(game.inventory.slots.get('wolf_pelt'),1);
assert.equal(game.inventory.gold,72);
assert.equal(game.p187Professions.state.experience.armorcrafting,2);
game.inventory.useOrEquip('hunter_hood','head');
assert.equal(game.inventory.equipped.head,'hunter_hood');
assert.ok(game.inventory.armorValue()>=8);
const saved=game.inventory.serialize();
const restored=new Inventory(game);restored.applyData(saved);
assert.equal(restored.equipped.head,'hunter_hood');
assert.equal(restored.armorValue(),game.inventory.armorValue());
const beforeGold=game.inventory.gold;
assert.equal(craftGearP192(game,'sigrid','hunter_hood').reason,'MISSING_MATERIALS');
assert.equal(game.inventory.gold,beforeGold,'insufficient mats cannot cost gold');

assert.equal(newHamletQuestStateP192().fishing_hamlet,'available');
const flat={waterY:-2,getHeight(x,z){return x>10?-2:4.5;},getSlope:()=>0};
assert.equal(safeHamletSiteP192(flat,{colliders:[]},0,0,{shore:true}),true);
assert.equal(safeHamletSiteP192({waterY:-2,getHeight:()=>4.5,getSlope:()=>0},
 {colliders:[]},0,0,{shore:true}),false,'no artificial inland fishing village');
assert.equal(safeHamletSiteP192(flat,{colliders:[]},11,0),false,'no underwater house');

const terrain={waterY:-2,getHeight:(x,z)=>4.5,getSlope:()=>0};
const structures={colliders:[],_buildHouse(){return {};}};game.terrain=terrain;
game.structures=structures;
const world=new P192Hamlets(game);game.p192Hamlets=world;
assert.equal(world.sites.size,7);
assert.equal(world.sites.get('fishing_hamlet').pos,null,'no fake sea in flat terrain');
const quest=HAMLET_QUESTS_P192[0];
assert.equal(world.accept(quest.hubId),true);
assert.equal(world.status(quest.hubId),'active');
assert.equal(world.turnIn(quest.hubId),false);
game.inventory.slots.set(quest.item,3);
const totalGold=game.inventory.gold;
assert.equal(world.turnIn(quest.hubId),true);
assert.equal(world.status(quest.hubId),'done');
assert.equal(game.inventory.gold,totalGold+quest.gold);
assert.equal(world.turnIn(quest.hubId),false,'no repeat quest payouts');
const state=world.serialize();
const another=new P192Hamlets(game);another.applyData(state);
assert.equal(another.status(quest.hubId),'done');
another.reset();assert.equal(another.status(quest.hubId),'available');
assert.equal(HUD_LAYOUT_KEY,'hf_p812_hud_layout_v2');
const config=sanitizeHudLayout({s1:{x:.48,y:.72,size:68},
 skillCancel:{x:.12,y:.33,size:43},radar:{x:.81,y:.03}});
assert.equal(config.skillCancel.x,.12,'edited CANCELAR never reset');
assert.equal(config.radar.x,.81,'existing HUD positions preserved');
const npc=source('src/entities/npc.js');
assert.ok(npc.includes('openCraftPreviewP192(this,npc,recipe'));
assert.ok(npc.includes('hamletDialogueP192(npc)'));
const menus=source('src/ui/menus.js');
assert.ok(menus.includes('this.dlgRecipe'));
assert.ok(menus.includes('if(opt.disabled)'));
assert.ok(source('src/ui/crafting-preview-p192.js').includes('consumed=true'));
const hud=source('src/ui/hud.js');
assert.ok(hud.includes('new ActivityFeedP192(game)'));
assert.ok(hud.includes('if(this.p192Feed){this.p192Feed.push(text);return;}'));
assert.ok(source('src/ui/activity-feed-p192.js').includes('REGISTRO'));
const saveSource=source('src/systems/save.js');
assert.ok(saveSource.includes("const KEY_P192 = 'highfly_p192_save'"));
assert.ok(saveSource.includes('hamletsP192:g.p192Hamlets.serialize()'));
assert.ok(saveSource.includes('g.p192Hamlets?.applyData(d.hamletsP192)'));
const bridge=source('src/combat/skill-bridge-p186.js');
assert.ok(!bridge.includes("fx.sparks(pos.clone().add(V(0,1.32,0))"));
assert.ok(!bridge.includes('cf.fireCharge(pos,dir);'));
console.log('P192 PASS: official wiki crosswalk 15 professions/209 recipes/15 zones/78 creatures; seven real hamlet quests/trainers and safe sites; gear + preview + preserve HUD/saves; no caster Fireball residual.');
