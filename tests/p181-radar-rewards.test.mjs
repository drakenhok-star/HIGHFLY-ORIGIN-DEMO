import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 FRONTIER_ZONES_P181,FRONTIER_QUEST_ID_P181,
 frontierTargetsP181,frontierQuestTargetsP181,nearestFrontierTargetP181
} from '../src/ui/frontier-tracking-p181.js';
import {SaveSys} from '../src/systems/save.js';

assert.equal(FRONTIER_QUEST_ID_P181,'p18_frontier');
assert.equal(FRONTIER_ZONES_P181.length,2);
assert.equal(FRONTIER_ZONES_P181[0].label,'Lobo centinela · ESTE');
assert.equal(FRONTIER_ZONES_P181[1].label,'Lobo centinela · OESTE');
const sentinel=(x,z,role='alpha',alive=true)=>({
 p18Frontier:true,p18Role:role,alive,group:{position:{x,z}}
});
const wolf=sentinel(111,99);
const packs=[
 {p18:true,regionId:'wolf_edge_east_01',home:{x:110,z:95},
  members:[wolf,sentinel(114,98,'scout')]},
 {p18:true,regionId:'wolf_edge_west_01',home:{x:-112,z:76},
  members:[sentinel(-110,75,'scout')]}
];
const game={
 p18Enabled:true,p812Enabled:true,p810Enabled:true,state:'playing',
 livingWorld:{quest:{status:'active',progress:1}},
 player:{pos:{x:65,z:70},yaw:0},
 enemies:{packs},npcs:{list:[{id:'bjorn',pos:{x:3,z:43},group:{position:{x:3,z:43}}}]},
 quests:{getState(id){return id==='p18_frontier'?game.livingWorld.quest.status:'active';}},
 worldMapP34:null
};
const targets=frontierQuestTargetsP181(game);
assert.equal(targets.length,2);
assert.equal(targets[0].x,111,'alpha actual world position is primary target');
assert.equal(targets[1].x,-110,'alive scout is target if alpha is missing');
assert.equal(nearestFrontierTargetP181(game).id,'wolf_edge_east_01');
assert.equal(frontierTargetsP181([])[0].x,110,'zone anchor always available');
wolf.alive=false;
packs[0].members[1].alive=false;
assert.equal(frontierQuestTargetsP181(game)[0].x,110,'marker never vanishes during respawn');
assert.equal(frontierQuestTargetsP181(game)[0].z,95);
game.livingWorld.quest.status='complete';
assert.equal(frontierQuestTargetsP181(game).length,1);
assert.equal(frontierQuestTargetsP181(game)[0].label,'Entregar misión · Bjorn');
game.livingWorld.quest.status='done';
assert.deepEqual(frontierQuestTargetsP181(game),[],'no tracked objective after turn-in');
game.livingWorld.quest.status='active';

// Evaluate the actual map class without importing Three or rendering WebGL.
const srcMap=(await readFile(new URL('../src/ui/world-map-p34.js',import.meta.url),'utf8'))
 .replace(/^import \{[\s\S]*?\} from '\.\/frontier-tracking-p181\.js';\s*/,'')
 .replace('export class WorldMapP34','class WorldMapP34');
const fakeDocument={createElement(){return {style:{},appendChild(){},setAttribute(){}}}};
const fakeWindow={innerWidth:1080,innerHeight:480,setInterval(){}};
const MapClass=Function('FRONTIER_ZONES_P181','FRONTIER_QUEST_ID_P181',
 'frontierQuestTargetsP181','nearestFrontierTargetP181','document','window',
 srcMap+'\nreturn WorldMapP34;')(
 FRONTIER_ZONES_P181,FRONTIER_QUEST_ID_P181,
 frontierQuestTargetsP181,nearestFrontierTargetP181,fakeDocument,fakeWindow);
const map=Object.create(MapClass.prototype);
map.game=game;map.pinnedQuestId=null;map.pinnedLabel='';
map.drawMini=()=>{};
assert.equal(map.trackQuest('p18_frontier'),true,'P18 quest may be tracked');
assert.equal(map.pinnedQuestId,'p18_frontier');
assert.match(map.pinnedLabel,/Lobo centinela/);
assert.equal(map.trackQuest('q1'),true,'old quests still track');
assert.equal(map.trackQuest('invalid'),false);
map.trackQuest('p18_frontier');
assert.equal(map.missionPosition().x,110,'track returns respawn fallback');
game.livingWorld.quest.status='complete';
assert.equal(map.missionPosition().x,3,'turn-in points to Bjorn');
game.livingWorld.quest.status='active';

const op=[];
const ctx=new Proxy({}, {get(t,k){
 if(typeof t[k]!=='undefined')return t[k];
 return (...args)=>{if(k==='fillText')op.push(String(args[0]));};
},set(t,k,v){t[k]=v;return true;}});
map.miniCanvas={width:192,getContext:()=>ctx};
map.coords={textContent:''};map.atlasReady=false;
map.drawMini=MapClass.prototype.drawMini.bind(map);
map.drawMini();
assert.equal(op.filter(x=>x==='C').length,2,'both sentinel diamonds drawn on radar');
assert.ok(map.pointsOfInterest().some(x=>/Lobo centinela/.test(x[0])));
map.frontierLabel={style:{},textContent:''};
map.mini={getBoundingClientRect:()=>({right:1000,bottom:201})};
map.updateFrontierLabel();
assert.match(map.frontierLabel.textContent,/LOBO CENTINELA/);
assert.match(map.frontierLabel.textContent,/1\/3/);
assert.equal(map.frontierLabel.style.display,'block');
game.livingWorld.quest.status='complete';
map.updateFrontierLabel();
assert.match(map.frontierLabel.textContent,/BJORN/);

// Render actual P9 quest panel with a minimal DOM. This reproduced the
// previously undefined REWARDS[q.id].gold crash / blank black menu.
const p9source=(await readFile(new URL('../src/ui/p9-panels.js',import.meta.url),'utf8'))
 .replace(/^import [^\n]+;\s*$/gm,'')
 .replace('export class HighflyPanelsP9','class HighflyPanelsP9');
class Node {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.textContent='';this.className='';}
 appendChild(n){this.children.push(n);return n;}
 replaceChildren(...nodes){this.children=[...nodes];}
 addEventListener(){}
 querySelector(){return null;}
}
const P9=Function('document','PremiumInventoryP7','ITEM_DB',p9source+'\nreturn HighflyPanelsP9;')({
 createElement:tag=>new Node(tag)
},null,{});
const ui=Object.create(P9.prototype);
ui.hud={list:new Node('div'),detail:new Node('div'),hide(){}};
const qfrontier={id:'p18_frontier',name:'Centinelas de la frontera',desc:'Eliminá 3 lobos centinela',
 state:'active',progress:1,need:3,rewardGold:75,rewardXp:60,
 giver:'Bjorn · aldea',kind:'secundaria',secret:false};
const qold={id:'q1',name:'Amenaza de lobos',desc:'Eliminá 5 lobos',
 state:'active',progress:0,need:5};
ui.game={quests:{list:()=>[qold,qfrontier]},worldMapP34:{trackQuest:()=>true},
 hud:{notify(){}}};
ui.questGroup='all';ui.questSearch='';ui.selectedQuest='p18_frontier';
ui.renderQuests();
function allText(node){return [node.textContent,...node.children.flatMap(allText)].join('|');}
assert.match(allText(ui.hud.detail),/75 oro/);
assert.match(allText(ui.hud.detail),/60 XP/);
assert.match(allText(ui.hud.detail),/Bjorn/);
assert.doesNotMatch(allText(ui.hud.detail),/\? oro/,'known rewards not secret');
ui.questGroup='secundaria';
ui.renderQuests();
assert.match(allText(ui.hud.list),/Centinelas de la frontera/,'new quest belongs in secondary tab');

// Autosave and milestone save stay real, but no dark stacked save toast.
const store=new Map(),notifications=[];
globalThis.localStorage={
 getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)
};
const saverGame={
 p18Build:true,p16Enabled:true,state:'playing',time:{dayTime:.5},
 player:{pos:{x:1,y:2,z:3},yaw:0},
 stats:{serialize:()=>({})},inventory:{serialize:()=>({})},
 quests:{serialize:()=>({})},combat:null,
 structures:{chests:[]},enemies:{dragon:{alive:true}},interiors:{inside:null},
 livingWorld:{serialize:()=>({schemaVersion:18})},
 p18Enabled:true,hud:{notify:s=>notifications.push(s)}
};
const saver=new SaveSys(saverGame);
saver.update(60.1);
assert.ok(store.has('highfly_p18_save'),'autosave still writes P18');
assert.equal(notifications.length,0,'autosave no longer shows two black toast cards');
saver.save({silent:true});
assert.equal(notifications.length,0,'silent bounty saves');
saver.save();
assert.equal(notifications.length,1,'manual save still reports once');
assert.equal(store.has('highfly_p16_save'),false,'P16 not overwritten');

// Prevent double quest credit: centinelas have own species identifier.
const enemySource=await readFile(new URL('../src/entities/enemies.js',import.meta.url),'utf8');
assert.match(enemySource,/e\.speciesId='wolf_sentinel'/);
assert.match(enemySource,/e\.p18Frontier \? 'wolf_sentinel'/);
const npcSource=await readFile(new URL('../src/entities/npc.js',import.meta.url),'utf8');
assert.match(npcSource,/Recompensa: 75 oro y 60 XP/);
const questSource=await readFile(new URL('../src/systems/quests.js',import.meta.url),'utf8');
assert.match(questSource,/rewardGold:P18_FRONTIER_QUEST\.rewardGold/);
assert.match(questSource,/nearestFrontierTargetP181/);
console.log('P18.1 PASS: 2 labeled radar zones incl offscreen/respawn, P9 rewards renderer no blank panel, auto-tracking, turn-in, distinct species, silent autosave');
