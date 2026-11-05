import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 FRONTIER_ZONES_P181,FRONTIER_QUEST_ID_P181,
 frontierQuestTargetsP181,nearestFrontierTargetP181
} from '../src/ui/frontier-tracking-p181.js';
import {LivingWorldP18} from '../src/world/living-world-runtime-p18.js';

// Regression: previously an unconditional P181_ALL_POIS left two yellow dots
// after a mission was fully claimed. Not a mission target, but STATIC POIs.
const mapText=await readFile(new URL('../src/ui/world-map-p34.js',import.meta.url),'utf8');
const stripped=mapText.replace(/^import \{[\s\S]*?\} from '\.\/frontier-tracking-p181\.js';\s*/,'')
 .replace('export class WorldMapP34','class WorldMapP34');
const POIclass=Function('FRONTIER_ZONES_P181','FRONTIER_QUEST_ID_P181','frontierQuestTargetsP181',
  'nearestFrontierTargetP181','document','window',stripped+'\nreturn WorldMapP34;')(
  FRONTIER_ZONES_P181,FRONTIER_QUEST_ID_P181,frontierQuestTargetsP181,
  nearestFrontierTargetP181,{},{}
);
const game={
 p18Enabled:true,state:'playing',player:{pos:{x:0,y:4,z:40}},
 enemies:{packs:[
   {ice:false,p18:false,home:{x:120,z:160}},
   {ice:false,p18:false,home:{x:-170,z:85}},
   {ice:false,p18:false,home:{x:125,z:-260}},
   {ice:true,p18:false,home:{x:380,z:-150}},
   {ice:false,p18:true,regionId:'wolf_edge_east_01',home:{x:110,z:95}},
   {ice:false,p18:true,regionId:'wolf_edge_west_01',home:{x:-166,z:76}}
 ]},
 npcs:{list:[{id:'bjorn',pos:{x:0,z:40}}]},
 quests:{getState(id){return id==='p18_frontier'?game.livingWorld.quest.status:'active';}},
 inventory:{gold:0},stats:{xp:0,addXP(v){this.xp+=v}},
 hud:{questBanner(){},notify(){}},saveSys:{save(){}}
};
const map=Object.create(POIclass.prototype);
map.game=game;map.pinnedQuestId=null;map.pinnedLabel='';
let drawCount=0;map.drawMini=()=>drawCount++;
game.worldMapP34=map;
const fakeEl=()=>({style:{display:''},dataset:{},textContent:'',setAttribute(){}});
globalThis.document={createElement:fakeEl,body:{appendChild(){}},head:{appendChild(){}}};
globalThis.window={};
const w=new LivingWorldP18(game);
game.livingWorld=w;
assert.equal(map.pointsOfInterest().length,9,'no quest: no extra yellow patrol POIs');
assert.equal(map.pointsOfInterest().filter(x=>/Lobo centinela/.test(x[0])).length,0);
w.quest.status='active';
assert.equal(map.trackQuest('p18_frontier'),true);
assert.equal(map.pointsOfInterest().length,11,'active hunt: two zone markers');
assert.equal(map.pointsOfInterest()[10][1],-166,'uses relocated dry spawn position');
w.quest.status='complete';
assert.equal(map.pointsOfInterest().length,9,'complete kills: hide patrol dots; Bjorn is only target');
assert.equal(frontierQuestTargetsP181(game)[0].id,'bjorn_return');
assert.equal(map.missionPosition().x,0,'return-to-NPC position');
assert.equal(w.turnInFrontier(),true,'give one real mission reward');
assert.equal(game.stats.xp,60);assert.equal(game.inventory.gold,75);
assert.equal(map.pinnedQuestId,null,'tracked completed quest is cleared immediately');
assert.equal(map.pinnedLabel,'');
assert.equal(map.pointsOfInterest().length,9,'after reward NO extra yellow patrol POIs');
assert.equal(frontierQuestTargetsP181(game).length,0,'after reward no return-to-Bjorn target');
assert.equal(w.turnInFrontier(),false,'reward cannot be taken twice');
assert.equal(map.pointsOfInterest().filter(x=>/Lobo centinela/.test(x[0])).length,0);
assert.equal(map.clearTrackedQuest('p18_frontier'),false,'idempotent clear');
assert.ok(drawCount>0,'immediate radar re-render on clear');
map.pinnedQuestId='q1';map.pinnedLabel='Lobos normales';
assert.equal(map.clearTrackedQuest('p18_frontier'),false,'clearing P18 cannot erase a different tracked quest');
assert.equal(map.pinnedQuestId,'q1');
w.applyData({schemaVersion:18,frontier:{status:'done',progress:3}});
assert.equal(map.pinnedQuestId,'q1','load of completed P18 does not clear unrelated tracked q1');
map.pinnedQuestId='p18_frontier';
w.applyData({schemaVersion:18,frontier:{status:'done',progress:3}});
assert.equal(map.pinnedQuestId,null,'loading claimed mission clears stale selection');
console.log('P18.2.1 PASS: active=2 patrol dots; complete=only Bjorn; claimed=0 yellow dots; reload clears stale selection; unrelated quests intact');
