/** P18.3c radar reads LIVE entities, never static promised spawns. */
import { realForestP183c,banditTrailP183c } from '../world/habitat-p183c.js';
export const ECO_NAMES_P183C=Object.freeze({
 boar:'Jabalí',crab:'Cangrejo',goblin:'Goblin',orc:'Orco',fox:'Zorro',stag:'Ciervo',
 forest_wolf:'Lobo forestal',prairie_wolf:'Lobo común',prairie_alpha:'Lobo alfa Greyjaw',snow_alpha:'Lobo alfa',yeti:'Yeti',
 bandit:'Bandido',forest_spider:'Araña'
});
export const ECO_COLORS_P183C=Object.freeze({
 boar:'#cfb27b',crab:'#58d3e9',goblin:'#eca96a',orc:'#ff787b',fox:'#e2b85f',
 stag:'#9cda9f',forest_wolf:'#b2b2ff',prairie_wolf:'#bdb6a9',prairie_alpha:'#ffd286',snow_alpha:'#9ee3ff',
 yeti:'#e2d2fa',bandit:'#ee8a8a',forest_spider:'#b693e8'
});
export function liveEcologyP183c(game){
 return (game?.enemies?.list||[]).filter(e=>e.alive&&!e.removed&&
  (e.p183bSpec||e.type==='spider')&&e.group?.position);
}
export function ecologyZoneP183c(game,pos){
 if(!game?.terrain||!pos)return 'Tierras salvajes';
 const t=game.terrain,water=t.waterY;
 const x=pos.x,z=pos.z,h=t.getHeight(x,z);
 if(Math.hypot(x,z-40)<78)return 'Aldea segura';
 if(h>=54)return 'Meseta de nieve';
 if(realForestP183c(t,x,z))return 'Bosque de Pinos';
 if(Math.hypot(x+220,z+180)<54)return 'Ruinas antiguas';
 if(banditTrailP183c(x,z)>.05||Math.hypot(x-215,z+112)<34)return 'Sendero de bandidos';
 const waterNear=[[12,0],[-12,0],[0,12],[0,-12]].some(([dx,dz])=>t.getHeight(x+dx,z+dz)<water);
 if(h<water+7&&waterNear)return 'Costa y ribera';
 return 'Pradera abierta';
}
export function ecologyCampsP183c(game){
 const enemies=liveEcologyP183c(game);
 const rows=[];
 for(const {spec,site} of game?.enemies?.p183bSites||[]){
  const occupants=enemies.filter(e=>e.p183bSpec?.id===spec.id);
  rows.push({id:spec.id,type:spec.type,name:ECO_NAMES_P183C[spec.type]||spec.type,
   biome:spec.biome,x:site.x,z:site.z,alive:occupants.length,
   color:ECO_COLORS_P183C[spec.type]||'#cfa6f3',actor:occupants[0]||null});
 }
 const spiders=enemies.filter(e=>e.type==='spider');
 if(spiders.length)rows.push({id:'forest_spiders',type:'forest_spider',name:'Arañas del bosque',
  biome:'forest',x:spiders[0].home.x,z:spiders[0].home.z,alive:spiders.length,
  color:ECO_COLORS_P183C.forest_spider,actor:spiders[0]});
 return rows;
}
export function ecologyNearbyP183c(game,pos,radius=125){
 if(!pos)return [];
 const source=liveEcologyP183c(game);
 return source.filter(e=>Math.hypot(e.group.position.x-pos.x,e.group.position.z-pos.z)<=radius);
}
export function ecologyRadarSummaryP183c(game,pos){
 const zone=ecologyZoneP183c(game,pos),near=ecologyNearbyP183c(game,pos,110);
 const groups=[...new Set(near.map(e=>ECO_NAMES_P183C[e.speciesId]||ECO_NAMES_P183C[e.type]||e.name))];
 return {zone,creatures:groups.slice(0,3),near:near.length};
}
