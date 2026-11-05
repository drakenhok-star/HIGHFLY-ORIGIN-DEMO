/**
 * HIGHFLY P18 / W0 — verified existing-world anchors and read-only registry.
 *
 * All anchor coordinates originate in P16.3 Tianjie sources:
 * Structures.villageCenter, stonesCenter, perchPos, Enemies WOLF_PACK_HOMES,
 * ICE_PACK_HOME, Interiors BARROW_ORIGIN.
 * Pure data, no graphics/model dependency, no new spawns or save mutation.
 * Scene layer matters: the crypt is an instanced interior, not an overworld tile.
 */
export const WORLD_P18_SCHEMA = 18;
export const WORLD_P18_CELL_METERS = 200; // existing Terrain CHUNK: do not change mesh alignment
const region = spec => Object.freeze(spec);

export const WORLD_REGIONS_P18 = Object.freeze([
  region({id:'village_01',name:'Aldea inicial',layer:'overworld',kind:'safe_city',x:0,z:40,radius:78,priority:100,spawnsEnemies:false}),
  region({id:'stones_01',name:'Ruinas antiguas',layer:'overworld',kind:'ruins',x:-220,z:-180,radius:52,priority:80,spawnsEnemies:true}),
  region({id:'clearing_01',name:'Claro del bosque',layer:'overworld',kind:'field',x:150,z:150,radius:26,priority:75,spawnsEnemies:false}),
  region({id:'wolf_north_01',name:'Bosque de lobos norte',layer:'overworld',kind:'field',x:120,z:160,radius:55,priority:60,spawnsEnemies:true}),
  region({id:'wolf_west_01',name:'Bosque de lobos oeste',layer:'overworld',kind:'field',x:-150,z:120,radius:55,priority:60,spawnsEnemies:true}),
  region({id:'wolf_south_01',name:'Bosque de lobos sur',layer:'overworld',kind:'field',x:80,z:-180,radius:55,priority:60,spawnsEnemies:true}),
  region({id:'frost_plateau_01',name:'Meseta helada',layer:'overworld',kind:'field',x:380,z:-150,radius:55,priority:70,spawnsEnemies:true}),
  region({id:'dragon_tower_01',name:'Torre del dragón',layer:'overworld',kind:'boss',x:300,z:-300,radius:60,priority:80,spawnsEnemies:true}),
  region({id:'barrow_01',name:'Cripta de los draugr',layer:'interior',kind:'dungeon',x:-3000,z:-3000,radius:95,priority:90,spawnsEnemies:true})
]);
export const WILDERNESS_P18 = Object.freeze({
  id:'wilderness',name:'Tierras salvajes',layer:'overworld',
  kind:'field',spawnsEnemies:false,priority:0
});
export function worldCellP18(x,z,size=WORLD_P18_CELL_METERS){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(size)||size<=0)
    throw Error('Invalid world cell coordinates');
  const cx=Math.floor(x/size),cz=Math.floor(z/size);
  return Object.freeze({cx,cz,key:cx+','+cz});
}
export function regionAtP18(x,z,layer='overworld'){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  let best=null;
  for(const region of WORLD_REGIONS_P18){
    if(region.layer!==layer)continue;
    const dx=x-region.x,dz=z-region.z;
    if(dx*dx+dz*dz>region.radius*region.radius)continue;
    if(!best||region.priority>best.priority)best=region;
  }
  return best||(layer==='overworld'?WILDERNESS_P18:null);
}
export function worldIsSafeP18(x,z,layer='overworld'){
  return regionAtP18(x,z,layer)?.kind==='safe_city';
}

/**
 * Existing asset-safe characters. Schedule is LOGICAL, not teleport/navigation:
 * until pathfinding + collision budget are validated, never move an NPC through walls.
 * Schedule anchors reference existing door IDs, not invented coordinates.
 */
export const NPC_SCHEDULES_P18 = Object.freeze({
  olaf:Object.freeze({
    model:'npc_mage',home:'olaf_house',cityId:'village_01',
    dawn:'village_guard',day:'village_council',dusk:'inn_guest',night:'home'
  }),
  sigrid:Object.freeze({
    model:'npc_knight',home:'smithy',cityId:'village_01',
    dawn:'smithy_work',day:'smithy_work',dusk:'inn_guest',night:'home'
  }),
  bjorn:Object.freeze({
    model:'npc_rogue',home:'village_01',cityId:'village_01',
    dawn:'village_wander',day:'village_wander',dusk:'inn_guest',night:'rest'
  })
});
export function worldDayPeriodP18(dayFraction){
  if(!Number.isFinite(dayFraction))return 'day';
  const t=((dayFraction%1)+1)%1;
  if(t<.19||t>=.82)return 'night';
  if(t<.32)return 'dawn';
  if(t<.70)return 'day';
  return 'dusk';
}
export function npcRoutineP18(npcId,dayFraction){
  const spec=NPC_SCHEDULES_P18[npcId];
  if(!spec)return null;
  const period=worldDayPeriodP18(dayFraction);
  return Object.freeze({
    npcId,cityId:spec.cityId,period,activity:spec[period],
    home:spec.home,model:spec.model
  });
}
/** Pure future scheduler tier; NEVER force active enemy AI into dormant mode. */
export function npcSimulationTierP18(distanceSquared){
  if(!Number.isFinite(distanceSquared)||distanceSquared<0)return 'dormant';
  if(distanceSquared<=45*45)return 'near'; // normal animation/interactions
  if(distanceSquared<=140*140)return 'ambient'; // later scheduler, no heavy rig updates
  return 'dormant'; // later world state only; no scene object needed
}

const ID=/^[a-z0-9_-]{2,64}$/;
function validId(id){return typeof id==='string'&&ID.test(id);}
export function createWorldStateP18(data=null){
  const seed=data&&typeof data==='object'&&!Array.isArray(data)&&data.schemaVersion===WORLD_P18_SCHEMA?data:null;
  const copySafeMap=val=>{
    const out={};
    if(!val||typeof val!=='object'||Array.isArray(val))return out;
    for(const [k,v] of Object.entries(val)){
      if(!validId(k))continue;
      if(typeof v==='boolean'||(Number.isInteger(v)&&v>=0&&v<=1000000))out[k]=v;
    }
    return out;
  };
  return {
    schemaVersion:WORLD_P18_SCHEMA,
    visited:copySafeMap(seed?.visited),
    npcTalks:copySafeMap(seed?.npcTalks),
    resources:copySafeMap(seed?.resources),
    portals:copySafeMap(seed?.portals),
    questFlags:copySafeMap(seed?.questFlags)
  };
}
/** World-state-only event reducer; quests, XP, loot & STR/AGI/VIT/PER/INT stay untouched. */
export function applyWorldEventP18(state,event){
  if(!event||typeof event!=='object'||Array.isArray(event))throw Error('Invalid world event');
  if(!validId(event.id))throw Error('Invalid world event id');
  const current=createWorldStateP18(state);
  const mapping={
    areaVisited:'visited',
    npcTalked:'npcTalks',
    resourceGathered:'resources',
    portalOpened:'portals',
    questCompleted:'questFlags'
  };
  const bucket=mapping[event.type];
  if(!bucket)throw Error('Unknown world event type: '+event.type);
  const key=event.id;
  const old=current[bucket][key];
  if(event.type==='npcTalked'){
    current[bucket][key]=Math.min(1000000,(Number.isInteger(old)?old:0)+1);
  }else{
    current[bucket][key]=true;
  }
  return current;
}
export function worldSnapshotP18(state){
  return JSON.parse(JSON.stringify(createWorldStateP18(state)));
}
