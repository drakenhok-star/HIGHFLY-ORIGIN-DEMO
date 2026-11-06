import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SIGRID_STARTER_RECIPES_P191,canCraftWithSigridP191,craftWithSigridP191}
 from '../src/world/sigrid-forge-p191.js';
import {P187ProfessionRuntime} from '../src/world/professions-runtime-p187.js';
import {HUD_DEFAULTS,sanitizeHudLayout,HUD_LAYOUT_KEY} from '../src/ui/p10-layout.js';
import {ITEM_DB} from '../src/systems/inventory.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(SIGRID_STARTER_RECIPES_P191.length,2);
for(const recipe of SIGRID_STARTER_RECIPES_P191){
 assert.ok(ITEM_DB[recipe.result],recipe.result);
 assert.ok(recipe.inputs.every(i=>ITEM_DB[i.id]&&i.qty>0));
 assert.ok(recipe.gold>0);
}
const game={
 state:'dialogue',stats:{level:8},
 npcs:{list:[{id:'sigrid',pos:{x:16.5,z:49.5}}]},
 player:{pos:{x:16.5,z:49.5}},
 inventory:{gold:50,slots:new Map([['wolf_fang',2],['wolf_pelt',2]]),
  removeItem(id,n){this.slots.set(id,this.slots.get(id)-n);},
  addItem(id,n){this.slots.set(id,(this.slots.get(id)||0)+n);}},
 hud:{messages:[],notify(text){this.messages.push(text);}},
 audio:{play(){}},saveSys:{writes:0,save(){this.writes++}}
};
game.p187Professions=new P187ProfessionRuntime(game);
assert.equal(canCraftWithSigridP191(game,'starter_steel_blade').reason,'PROFESSION_NOT_LEARNED');
game.p187Professions.learnAtTrainer('weaponcrafting','sigrid');
game.p187Professions.learnAtTrainer('armorcrafting','sigrid');
assert.equal(canCraftWithSigridP191(game,'starter_steel_blade').ok,true);
const crafting=craftWithSigridP191(game,'starter_steel_blade');
assert.equal(crafting.ok,true);
assert.equal(crafting.itemId,'steel_sword');
assert.equal(game.inventory.slots.get('steel_sword'),1);
assert.equal(game.inventory.slots.get('wolf_fang'),0);
assert.equal(game.inventory.gold,25);
assert.equal(game.p187Professions.state.experience.weaponcrafting,3);
assert.equal(game.saveSys.writes,1);
const saved=game.p187Professions.serialize();
assert.equal(craftWithSigridP191(game,'starter_steel_blade').reason,'MISSING_MATERIALS');
assert.equal(game.inventory.gold,25,'failed craft must not consume currency');
const armor=craftWithSigridP191(game,'starter_hide_armor');
assert.equal(armor.ok,true);
assert.equal(game.inventory.slots.get('hide_armor'),1);
assert.equal(game.inventory.gold,5);
assert.equal(game.p187Professions.state.experience.armorcrafting,3);
game.p187Professions.applyData(saved);
assert.equal(game.p187Professions.state.experience.weaponcrafting,3);
assert.equal(game.p187Professions.state.experience.armorcrafting,0);
game.player.pos.x=999;
const goldBefore=game.inventory.gold;
assert.equal(craftWithSigridP191(game,'starter_hide_armor').reason,'NOT_AT_FORGE');
assert.equal(game.inventory.gold,goldBefore);
game.player.pos.x=16.5;game.state='playing';
assert.equal(canCraftWithSigridP191(game,'starter_hide_armor').reason,'NOT_AT_FORGE');
const invalid=craftWithSigridP191(game,'__proto__');
assert.equal(invalid.ok,false);
assert.equal(invalid.reason,'UNKNOWN_RECIPE');

assert.equal(HUD_LAYOUT_KEY,'hf_p812_hud_layout_v2','no HUD settings reset');
const old=sanitizeHudLayout({s1:{x:.83,y:.6,size:55},s6:{x:.57,y:.42,size:49},
 perf:{x:.61,y:.19,size:164},radar:{x:.78,y:.03,size:133}});
assert.equal(old.s1.x,.83);
assert.equal(old.s6.x,.57);
assert.equal(old.perf.size,164);
assert.equal(old.radar.size,133);

const book=read('src/ui/rpg-books-p188.js');
assert.ok(book.includes('const previousInnerTop='));
assert.ok(book.includes('container.scrollTop=previousInnerTop'));
assert.ok(book.includes("E('div','hf-p191-skill-acquired'"));
assert.ok(book.includes("E('div','hf-p191-skill-hidden'"));
assert.ok(book.indexOf("E('div','hf-p191-skill-acquired'")<
 book.indexOf("E('div','hf-p191-skill-hidden'"));
assert.ok(book.includes("hf-p191-slot-grid"));
assert.ok(book.includes('EQUIPAR EN PRIMER SLOT LIBRE'));
assert.ok(book.includes('SIGRID_STARTER_RECIPES_P191'));
const editor=read('src/ui/p10-hud-editor.js');
assert.ok(editor.includes("'6 SKILLS %'"));
assert.ok(editor.includes("'TAMAÑO %'"));
assert.ok(editor.includes('equalizeSkillSizes(percent)'));
assert.ok(editor.includes("this.editing?'auto':'none'"));
const overlay=read('src/ui/p810-ui.js');
assert.ok(overlay.includes("this.perf.textContent='FPS '+real+' · '"));
assert.ok(overlay.includes('map.coords?.parentElement!==document.body'));
assert.ok(overlay.includes("coords.style.top="));
assert.ok(!overlay.includes("' · P95 '+p95"));
const casting=read('src/combat/skill-bridge-p186.js');
assert.ok(casting.includes("if(style<3 && !(style===0&&skillSlot===1))"));
assert.ok(casting.includes("fx.sparks(start.clone().addScaledVector(dir,.4)"));
assert.ok(!casting.includes("fx.launch(pos,dir,0);"));
const perf2=read('src/ui/performance-p2.js');
assert.ok(perf2.includes("this.apply(game.p191Build?'CLARITY':'FLUID')"));
assert.ok(perf2.includes("id: 'CLARITY'"));
assert.ok(read('src/ui/performance-p163.js').includes("'CLARITY'"));
const n=read('src/entities/npc.js');
assert.ok(n.includes('craftWithSigridP191(this.game,recipe.id)'));
assert.ok(n.includes('this.game.p191Build'));
const save=read('src/systems/save.js');
assert.ok(save.includes("const KEY_P190 = 'highfly_p190_save'"));
console.log('P191 PASS: crafted real wolf loot with Sigrid, preserved saves, learned skillbook sorting/scroll, percent-sized HUD and clarity feature.');
