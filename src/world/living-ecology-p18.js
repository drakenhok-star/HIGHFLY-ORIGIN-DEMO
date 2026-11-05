/**
 * HIGHFLY P18 / W0.1 — fauna + monster ecology contract.
 * It DOES NOT spawn or modify the live P16.3 enemies (not published).
 * Available visual keys are asserted against the real AssetLib / manifest.
 * Future species remain disabled until a specifically approved CC0 model/rig exists.
 */
import { WORLD_REGIONS_P18,worldIsSafeP18 } from './world-registry-p18.js';

const current = (id,model,family,behavior,zones,groupCap=3) =>
  Object.freeze({id,model,family,behavior,zoneIds:Object.freeze(zones),
    groupCap,assetApproved:true,implementedInP16:true});
const planned = (id,family,behavior,zones) =>
  Object.freeze({id,model:null,family,behavior,zoneIds:Object.freeze(zones),
    groupCap:0,assetApproved:false,implementedInP16:false});

export const LIVE_CREATURES_P18 = Object.freeze([
  current('wolf','wolf','beast','pack_hunt',['wolf_north_01','wolf_west_01','wolf_south_01']),
  current('ice_wolf','wolf','beast','pack_hunt',['frost_plateau_01'],4),
  current('draugr_warrior','skeleton_warrior','undead','melee_guard',['stones_01','barrow_01']),
  current('draugr_mage','skeleton_mage','undead','ranged_cast',['stones_01','barrow_01']),
  current('ancient_dragon','dragon','dragon','boss_phase',['dragon_tower_01'],1),
  Object.freeze({id:'wolf_sentinel',model:'wolf',family:'beast',behavior:'pack_alert',
    zoneIds:Object.freeze(['wolf_edge_east_01','wolf_edge_west_01']),groupCap:2,
    assetApproved:true,implementedInP16:false,implementedInP18:true})
]);
export const PLANNED_CREATURES_P18 = Object.freeze([
  planned('wild_boar','beast','charge_flee',['wolf_north_01','clearing_01']),
  planned('forest_deer','beast','graze_flee',['clearing_01','wolf_west_01']),
  planned('forest_spider','beast','ambush_web',['wolf_south_01']),
  planned('goblin_scout','humanoid','scout_alert',['stones_01']),
  planned('crypt_wraith','undead','patrol_caster',['barrow_01'])
]);
export const CREATURES_P18 = Object.freeze([...LIVE_CREATURES_P18,...PLANNED_CREATURES_P18]);
const MAP = new Map(CREATURES_P18.map(x=>[x.id,x]));
export function creatureSpecP18(id){return MAP.get(id)||null;}
export function creatureSpawnableP18(id,regionId){
  const c=creatureSpecP18(id);
  const region=WORLD_REGIONS_P18.find(z=>z.id===regionId);
  if(!c||!c.assetApproved||!(c.implementedInP16||c.implementedInP18)||!c.model||!region)return false;
  if(region.kind==='safe_city'||!region.spawnsEnemies)return false;
  return c.zoneIds.includes(regionId);
}
/**
 * Future integration gate: do not spawn new species until licensed assets and
 * animation/scale have been validated and installed (no geometric placeholders).
 */
export function newSpeciesReadyP18(spec,manifestKeys,allowlist){
  return !!spec && spec.assetApproved===true && spec.model &&
    Array.isArray(manifestKeys) && manifestKeys.includes(spec.model) &&
    Array.isArray(allowlist) && allowlist.includes(spec.id);
}

/**
 * Physics/quest/combat must remain live for engaged mobs; dormant policy applies
 * only to mobs at rest, with their pending respawn timers advanced separately.
 * These are proposed mobile budgets, NOT benchmark-validated thresholds.
 */
export function monsterSimulationTierP18({distanceSq,engaged=false,questRequired=false,boss=false}={}){
  if(engaged||questRequired||boss)return 'full';
  if(!Number.isFinite(distanceSq)||distanceSq<0)return 'dormant';
  if(distanceSq<=75*75)return 'full';
  if(distanceSq<=190*190)return 'low_frequency';
  return 'dormant';
}
export const P18_PROPOSED_MOBILE_LIMITS = Object.freeze({
  maxNearHostiles:14,maxAmbientHostiles:24,maxPackAssist:4
});

/** Returns a pure *proposal*, not a direct spawn count or gameplay mutation. */
export function zoneSpawnProposalP18({x,z,regionId,creatureId,alreadyActive=0,partySize=1}={}){
  if(!Number.isFinite(x)||!Number.isFinite(z)||worldIsSafeP18(x,z))return Object.freeze({allowed:false,count:0,reason:'safe-zone'});
  if(!creatureSpawnableP18(creatureId,regionId))return Object.freeze({allowed:false,count:0,reason:'unapproved-or-wrong-biome'});
  const spec=creatureSpecP18(creatureId);
  const active=Math.max(0,Math.floor(Number(alreadyActive)||0));
  const party=Math.max(1,Math.floor(Number(partySize)||1));
  const count=Math.max(0,Math.min(spec.groupCap,party,P18_PROPOSED_MOBILE_LIMITS.maxNearHostiles-active));
  return Object.freeze({allowed:count>0,count,reason:count?'eligible':'budget-full'});
}
