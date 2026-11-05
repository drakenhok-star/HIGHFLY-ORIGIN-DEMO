/**
 * HIGHFLY P18.5 — Multiworld + gathering contracts (foundation only).
 *
 * Does not render a portal, load GLBs, mutate the active Game, or change Saves.
 * World 2 is NOT playable until it has its own terrain/runtime and safe landings.
 * Public MIT/CC0-safe metadata only. Private KayKit SOURCE must not be committed.
 */
export const WORLD_SCHEMA_P185 = 185;
export const WORLD_START_P185 = 'village_01';

const world = spec => Object.freeze({
  ...spec,
  gather: Object.freeze([...spec.gather]),
  species: Object.freeze([...spec.species]),
  features: Object.freeze([...spec.features])
});

export const WORLD_ZONES_P185 = Object.freeze([
  world({
    id:'village_01', name:'Aldea de Aprendizaje', seed:1337,
    terrainProfile:'origin_tianjie_w0', climate:'templado',
    waterProfile:'origin_streams', foliageProfile:'origin_mixed',
    sceneReady:true, town:'Aldea inicial', safeArrivalPolicy:'existing_spawn',
    features:['aldea segura','pradera','caminos','ruinas'],
    gather:['herbs_common','wood_common','stone_common','freshwater_fish'],
    species:['wolf','boar','deer']
  }),
  world({
    id:'forest_falls_01', name:'Bosque de las Cascadas', seed:825173,
    terrainProfile:'forest_falls_terraces', climate:'humedo_bosque',
    waterProfile:'river_cascades', foliageProfile:'giant_forest',
    sceneReady:false, town:'Santuario del Bosque (futuro)',
    safeArrivalPolicy:'dry_riverbank_clearing',
    features:['cascadas','arroyos','puentes naturales','claros de hadas','grutas'],
    gather:['herbs_common','herbs_forest','wood_common','wood_ancient','river_fish'],
    species:['forest_wolf','goblin','spider','fox']
  }),
  world({
    id:'port_tides_01', name:'Costa de las Mareas', seed:937410,
    terrainProfile:'coast_bays_islands', climate:'costero',
    waterProfile:'ocean_tides', foliageProfile:'coastal',
    sceneReady:false, town:'Puerto Mercante (futuro)',
    safeArrivalPolicy:'dry_coastal_plateau',
    features:['bahias','muelles futuros','islas','cuevas marinas'],
    gather:['driftwood','salt','shells','sea_fish'],
    species:['crab','coastal_birds']
  }),
  world({
    id:'snow_veil_01', name:'Nevadas del Velo', seed:486132,
    terrainProfile:'snow_valleys_ridges', climate:'nevado',
    waterProfile:'frozen_lakes', foliageProfile:'snow_conifers',
    sceneReady:false, town:'Refugio del Hielo (futuro)',
    safeArrivalPolicy:'sheltered_frozen_valley',
    features:['lagos helados','pinos','cavernas','pasos de montaña'],
    gather:['frost_herbs','icy_ore','frozen_wood'],
    species:['yeti','snow_wolf']
  }),
  world({
    id:'desert_dunes_01', name:'Mar de Dunas', seed:302918,
    terrainProfile:'desert_dunes_canyons', climate:'arido',
    waterProfile:'oases', foliageProfile:'arid_sparse',
    sceneReady:false, town:'Ciudad del Oasis (futuro)',
    safeArrivalPolicy:'oasis_edge',
    features:['dunas','cañones','oasis','ruinas enterradas'],
    gather:['desert_herbs','desert_ore','oasis_fish'],
    species:['desert_creatures']
  }),
  world({
    id:'lava_heart_01', name:'Corazón de Lava', seed:651427,
    terrainProfile:'volcanic_ridges', climate:'volcanico',
    waterProfile:'lava_rivers', foliageProfile:'ash_sparse',
    sceneReady:false, town:'Forja Ígnea (futuro)',
    safeArrivalPolicy:'solid_ash_plateau',
    features:['crateres','ríos de lava','obsidiana','cuevas de fuego'],
    gather:['obsidian','sulfur','ember_ore'],
    species:['fire_creatures']
  }),
  world({
    id:'wind_peaks_01', name:'Cumbres del Viento', seed:719055,
    terrainProfile:'sheer_cliffs_canyons', climate:'montana',
    waterProfile:'high_rivers', foliageProfile:'alpine',
    sceneReady:false, town:'Ciudad de las Alturas (futuro)',
    safeArrivalPolicy:'protected_lower_shelf',
    features:['acantilados','cañones','ascenso con habilidades','puentes elevados'],
    gather:['alpine_herbs','rare_stone','highland_wood'],
    species:['mountain_creatures']
  }),
  world({
    id:'abyss_shade_01', name:'Abismo de las Sombras', seed:240693,
    terrainProfile:'gloom_ravines', climate:'sombrio',
    waterProfile:'black_marsh', foliageProfile:'twisted_forest',
    sceneReady:false, town:'Bastión del Ocaso (futuro)',
    safeArrivalPolicy:'safe_high_ground',
    features:['pantanos','niebla','cementerios','criptas','bosques espectrales'],
    gather:['spectral_herbs','dark_ore','ancient_wood'],
    species:['ghost','undead']
  })
]);

export const WORLD_ZONE_BY_ID_P185 = Object.freeze(Object.fromEntries(
  WORLD_ZONES_P185.map(z=>[z.id,z])
));

/** Anchor policies are unresolved until real terrain and collisions are built. */
export const WORLD_PORTALS_P185 = Object.freeze([
  Object.freeze({
    id:'village_forest_01',source:'village_01',destination:'forest_falls_01',
    anchorPolicy:'village_outer_east',arrivalPolicy:'dry_riverbank_clearing',
    returnPortalId:'forest_village_01',requiresFlag:'forest_invitation'
  }),
  Object.freeze({
    id:'forest_village_01',source:'forest_falls_01',destination:'village_01',
    anchorPolicy:'forest_arrival_clearing',arrivalPolicy:'existing_spawn',
    returnPortalId:'village_forest_01',requiresFlag:null
  })
]);

export const WORLD_PORTAL_BY_ID_P185 = Object.freeze(Object.fromEntries(
  WORLD_PORTALS_P185.map(p=>[p.id,p])
));

const resource = r => Object.freeze(r);
/**
 * The node system will decide positions by actual terrain, safe zones and tools.
 * Values are planned resource families, not existing GLB assets or inventory IDs.
 */
export const GATHER_RESOURCES_P185 = Object.freeze([
  resource({id:'herbs_common',action:'RECOLECTAR',tool:'hands',zone:'village_or_field',respawnSeconds:240}),
  resource({id:'wood_common',action:'TALAR',tool:'axe',zone:'managed_woodlot',respawnSeconds:600}),
  resource({id:'stone_common',action:'MINAR',tool:'pickaxe',zone:'quarry',respawnSeconds:720}),
  resource({id:'freshwater_fish',action:'PESCAR',tool:'fishing_rod',zone:'freshwater',respawnSeconds:180}),
  resource({id:'herbs_forest',action:'RECOLECTAR',tool:'hands',zone:'forest_falls',respawnSeconds:420}),
  resource({id:'wood_ancient',action:'TALAR',tool:'axe',zone:'forest_falls',respawnSeconds:900}),
  resource({id:'river_fish',action:'PESCAR',tool:'fishing_rod',zone:'forest_falls',respawnSeconds:300})
]);

const validId = s => typeof s==='string' && /^[a-z][a-z0-9_]{1,63}$/.test(s) &&
  !['constructor','prototype','__proto__'].includes(s);

function copyBooleanMap(value) {
  const copy={};
  if(!value||typeof value!=='object'||Array.isArray(value))return copy;
  for(const [id,flag] of Object.entries(value))if(validId(id)&&flag===true)copy[id]=true;
  return copy;
}

/** Separate progress for travel. Does not change training, stats or equipment. */
export function createWorldTravelStateP185(data=null) {
  return {
    schemaVersion:WORLD_SCHEMA_P185,
    zoneId:validId(data?.zoneId)&&WORLD_ZONE_BY_ID_P185[data.zoneId]
      ?data.zoneId:WORLD_START_P185,
    visited:copyBooleanMap(data?.visited),
    unlocked:copyBooleanMap(data?.unlocked),
    nodes:copyBooleanMap(data?.nodes)
  };
}
export function unlockPortalP185(state,flag) {
  if(!validId(flag))throw Error('Invalid unlock flag');
  const next=createWorldTravelStateP185(state);
  next.unlocked[flag]=true;
  return next;
}

/**
 * PREPARE is intentionally read-only. No active world is unloaded here.
 * The renderer must verify the target is built and a collision-safe dry
 * landing exists BEFORE committing a transfer.
 */
export function preparePortalTripP185(state,portalId) {
  const s=createWorldTravelStateP185(state);
  const p=WORLD_PORTAL_BY_ID_P185[portalId];
  if(!p)return Object.freeze({ok:false,reason:'PORTAL_UNKNOWN'});
  if(p.source!==s.zoneId)return Object.freeze({ok:false,reason:'WRONG_WORLD'});
  if(p.requiresFlag&&!s.unlocked[p.requiresFlag])
    return Object.freeze({ok:false,reason:'PORTAL_LOCKED'});
  const destination=WORLD_ZONE_BY_ID_P185[p.destination];
  if(!destination?.sceneReady)
    return Object.freeze({ok:false,reason:'DESTINATION_NOT_BUILT',destinationId:p.destination});
  return Object.freeze({
    ok:true,phase:'PREPARED',portalId:p.id,from:s.zoneId,to:p.destination,
    landingPolicy:p.arrivalPolicy
  });
}

export function completePortalTripP185(state,prepared,{landingVerified=false}={}) {
  const s=createWorldTravelStateP185(state);
  if(prepared?.ok!==true||prepared.phase!=='PREPARED'||prepared.from!==s.zoneId)
    throw Error('Portal transfer was not prepared from this world');
  if(!landingVerified)throw Error('Unsafe landing: terrain collision not verified');
  const p=WORLD_PORTAL_BY_ID_P185[prepared.portalId];
  if(!p||p.destination!==prepared.to)throw Error('Portal destination mismatch');
  if(!WORLD_ZONE_BY_ID_P185[prepared.to]?.sceneReady)
    throw Error('Destination scene is not built');
  s.zoneId=prepared.to;
  s.visited[prepared.to]=true;
  return s;
}

/** Prevent accidental same-map reuse or asset injection in registry data. */
export function auditWorldDefinitionsP185() {
  const ids=WORLD_ZONES_P185.map(z=>z.id);
  if(new Set(ids).size!==ids.length)throw Error('Duplicate zone ID');
  if(new Set(WORLD_ZONES_P185.map(z=>z.seed)).size!==ids.length)
    throw Error('World seeds must differ');
  if(!WORLD_ZONE_BY_ID_P185[WORLD_START_P185]?.sceneReady)
    throw Error('Starting world unavailable');
  for(const p of WORLD_PORTALS_P185){
    if(!WORLD_ZONE_BY_ID_P185[p.source]||!WORLD_ZONE_BY_ID_P185[p.destination])
      throw Error('Portal zone missing: '+p.id);
    if(p.source===p.destination)throw Error('Portal goes to the same world');
    if(WORLD_PORTAL_BY_ID_P185[p.returnPortalId]?.returnPortalId!==p.id)
      throw Error('Portal return path mismatch');
  }
  return Object.freeze({zones:ids.length,portals:WORLD_PORTALS_P185.length,ready:WORLD_ZONES_P185.filter(z=>z.sceneReady).length});
}
