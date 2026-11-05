/**
 * HIGHFLY P18.6 — safe candidate search for W0's profession hamlets.
 * Does NOT place objects; returns no result unless every inspection hook is
 * present. Avoids fake fishing ponds and landmarks on top of wolf territories.
 *
 * Must always validate again after runtime environment changes or when actual
 * model footprints, animation extents and navigation routes are known.
 */
import {WORLD_REGIONS_P18} from './world-registry-p18.js';
import {INICIOS_HUBS_P186} from './inicios-v2-p186.js';

const DANGER=Object.freeze(WORLD_REGIONS_P18
  .filter(r=>r.layer==='overworld'&&r.spawnsEnemies)
  .map(r=>Object.freeze({id:r.id,x:r.x,z:r.z,radius:r.radius})));

const DISTANCES=Object.freeze([0,10,20,32,44,60,78,100]);
const PI2=Math.PI*2;
const inside=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<r;

function positionOK(terrain,opts,hub,x,z){
  const y=terrain.getHeight(x,z);
  if(!Number.isFinite(y)||y<=terrain.waterY+1.5)return null;
  if(!Number.isFinite(terrain.getSlope(x,z))||terrain.getSlope(x,z)>0.33)return null;
  // Check entire landing and building footprint, not only the pivot.
  for(let i=0;i<8;i++){
    const a=PI2*i/8;
    const px=x+Math.cos(a)*7,pz=z+Math.sin(a)*7;
    const h=terrain.getHeight(px,pz);
    if(!Number.isFinite(h)||h<=terrain.waterY+1.5)return null;
    if(terrain.getSlope(px,pz)>0.45)return null;
    if(Math.abs(h-y)>1.9)return null;
    if(opts.isBlocked(px,pz,4)||opts.isDangerous(px,pz,16))return null;
  }
  if(opts.isBlocked(x,z,9)||opts.isDangerous(x,z,24))return null;
  if(DANGER.some(r=>inside({x,z},r,r.radius+30)))return null;
  if(!opts.hasSafeRoute({x:0,z:40},{x,z}))return null;
  if(!opts.matchesHabitat(hub.sitePolicy,{x,z,y}))return null;
  if(hub.sitePolicy==='walkable_real_shoreline' && !opts.hasWaterAccess({x,z,y}))
    return null;
  return Object.freeze({x,y,z,verifiedTerrain:true,verifiedRoute:true,
    validatedBy:'runtime_collision_navigation_habitat'});
}

/**
 * Missing collision, pathfinding, habitat or water evidence = NO SITE.
 * This is deliberate: the old experience with false mini-houses/floaters
 * should not be repeated in the 2.0 village.
 */
export function findIniciosHubSiteP186(hubId,terrain,opts={}){
  const hub=INICIOS_HUBS_P186.find(h=>h.id===hubId);
  if(!hub)return Object.freeze({ok:false,reason:'UNKNOWN_HUB'});
  if(hub.id==='central_village')
    return Object.freeze({ok:true,reason:'EXISTING_TOWN',
      site:Object.freeze({x:0,z:40}),constructionAllowed:false});
  if(!terrain||typeof terrain.getHeight!=='function'||
      typeof terrain.getSlope!=='function'||!Number.isFinite(terrain.waterY)||
      typeof opts.isBlocked!=='function'||typeof opts.isDangerous!=='function'||
      typeof opts.hasSafeRoute!=='function'||typeof opts.matchesHabitat!=='function')
    return Object.freeze({ok:false,reason:'MISSING_WORLD_VALIDATORS'});
  if(hub.sitePolicy==='walkable_real_shoreline'&&
     (typeof opts.hasWaterAccess!=='function'||!Array.isArray(opts.shoreSamples)))
    return Object.freeze({ok:false,reason:'MISSING_REAL_SHORELINE'});
  if(!hub.anchorHint&&hub.sitePolicy!=='walkable_real_shoreline')
    return Object.freeze({ok:false,reason:'ANCHOR_SURVEY_REQUIRED'});

  const sample = (x,z)=>{
    const site=positionOK(terrain,opts,hub,x,z);
    return site?Object.freeze({ok:true,hubId,site,
      constructionAllowed:false,reason:'CANDIDATE_REQUIRES_VISUAL_AUDIT'}):null;
  };
  if(hub.sitePolicy==='walkable_real_shoreline'){
    for(const pos of opts.shoreSamples){
      if(!Number.isFinite(pos?.x)||!Number.isFinite(pos?.z))continue;
      const found=sample(pos.x,pos.z);
      if(found)return found;
    }
  }else{
    for(const radius of DISTANCES){
      const steps=radius===0?1:16;
      for(let i=0;i<steps;i++){
        const angle=PI2*i/steps;
        const x=hub.anchorHint.x+Math.cos(angle)*radius;
        const z=hub.anchorHint.z+Math.sin(angle)*radius;
        const found=sample(x,z);
        if(found)return found;
      }
    }
  }
  return Object.freeze({ok:false,hubId,reason:'NO_SAFE_PLACE_FOUND'});
}

export const INICIOS_CONNECTIVITY_P186 = Object.freeze([
  Object.freeze({from:'central_village',to:'sawmill_hamlet',theme:'forest_path'}),
  Object.freeze({from:'central_village',to:'mining_hamlet',theme:'stone_track'}),
  Object.freeze({from:'central_village',to:'herbal_hamlet',theme:'flower_path'}),
  Object.freeze({from:'central_village',to:'fishing_hamlet',theme:'waterside_track'}),
  Object.freeze({from:'central_village',to:'farming_hamlet',theme:'farm_lane'}),
  Object.freeze({from:'central_village',to:'artisan_quarter',theme:'village_lane'}),
  Object.freeze({from:'central_village',to:'arcane_quarter',theme:'village_lane'})
]);

export function auditIniciosConnectivityP186(){
  const idSet=new Set(INICIOS_HUBS_P186.map(h=>h.id));
  for(const link of INICIOS_CONNECTIVITY_P186)
    if(!idSet.has(link.from)||!idSet.has(link.to)||link.from===link.to)
      throw Error('Invalid hamlet route');
  return Object.freeze({hubs:idSet.size,routes:INICIOS_CONNECTIVITY_P186.length});
}
