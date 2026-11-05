import { realForestP183c } from './habitat-p183c.js';
/**
 * HIGHFLY P18.3b: stable, explicitly separated family/camp registry.
 * All mobs exist independently of quest acceptance.
 * Coordinates in the existing Tianjie overworld. Never move the old wolf packs.
 */
export const P183B_FAMILIES=Object.freeze({
  beast:'Fauna terrestre',arachnid:'Arácnidos',goblinoid:'Goblinoides',
  humanoid:'Bandidos',crustacean:'Crustáceos',mountain:'Criaturas de nieve'
});
const camp=(id,type,biome,x,z,count,opts={})=>Object.freeze({id,type,biome,x,z,count,
  family:opts.family||'beast',aggressive:opts.aggressive!==false,model:opts.model||type,
  hp:opts.hp||38,dmg:opts.dmg||7,speed:opts.speed||4,
  aggro:opts.aggressive===false?0:(opts.aggro??15),attackRange:opts.range||1.8,attackCd:opts.cd||1.6,
  respawn:opts.respawn||105,rarity:opts.rarity||'common',
  xp:opts.xp||20,drop:opts.drop||'wolf_pelt',gold:opts.gold||6,
  clips:Object.freeze(opts.clips||{idle:'Idle',walk:'Walk',attack:'Attack',death:'Death'}),
  behavior:opts.behavior||'chase',tint:opts.tint||null
});
const q=(model,clips={idle:'Idle',walk:'Walk',attack:'Attack',death:'Death'})=>({model,clips});
export const P183B_CAMPS=Object.freeze([
  camp('pradera_jabali','boar','prairie',207,153,3,{family:'beast',hp:56,dmg:11,speed:5.2,aggro:16,
    behavior:'charge',xp:33,drop:'boar_hide',gold:10,respawn:115,
    clips:{idle:'idle',walk:'walk',attack:'attack',death:'dead'}}),
  camp('pradera_jabali_2','boar','prairie',272,65,3,{family:'beast',hp:49,dmg:10,speed:4.8,aggro:15,
    behavior:'charge',xp:30,drop:'boar_meat',gold:8,respawn:130,
    clips:{idle:'idle',walk:'walk',attack:'attack',death:'dead'}}),
  // Original Quaternius CC0 wolf.glb from ClaudeCraft, independent of HIGHFLY wolf packs.
  camp('pradera_lobos_claude','prairie_wolf','prairie',-320,135,5,{model:'wolf_claude',family:'beast',hp:49,dmg:9,speed:7.7,aggro:20,
    behavior:'pack_frenzy',xp:29,drop:'wolf_pelt',gold:8,respawn:105,tint:0x827a6d,
    clips:{idle:'Idle',walk:'Gallop',attack:'Attack',death:'Death'}}),
  // Greyjaw is an MIT BEHAVIOUR inspiration, NOT the project-only Tripo asset.
  camp('pradera_alfa','prairie_alpha','prairie',-420,72,1,{model:'wolf_claude',family:'beast',hp:165,dmg:16,speed:8.1,aggro:25,
    behavior:'old_greyjaw_frenzy',xp:105,drop:'greyjaw_fang',gold:46,respawn:215,tint:0x555d60,
    clips:{idle:'Idle',walk:'Gallop',attack:'Attack',death:'Death'}}),
  camp('bosque_goblins','goblin','forest',-190,505,2,{family:'goblinoid',hp:40,dmg:9,speed:5.1,
    behavior:'social',xp:32,drop:'goblin_token',gold:11,respawn:125,
    clips:q('goblin',{idle:'Idle',walk:'Run',attack:'Attack',death:'Death'}).clips}),
  camp('bosque_zorros','fox','forest',-180,340,1,{aggressive:false,hp:24,speed:6.8,aggro:0,
    behavior:'flee',xp:12,drop:'fox_fur',gold:0,respawn:160,
    clips:{idle:'Idle',walk:'Gallop',attack:'Attack',death:'Death'}}),
  camp('pradera_ciervos','stag','prairie',-180,278,1,{aggressive:false,hp:38,speed:6.6,aggro:0,
    behavior:'flee',xp:15,drop:'deer_antler',gold:0,respawn:180,
    clips:{idle:'Idle',walk:'Gallop',attack:'Attack_Headbutt',death:'Death'}}),
  camp('bosque_lobos','forest_wolf','forest',-350,470,2,{model:'wolf',family:'beast',hp:39,dmg:9,speed:7.1,
    behavior:'pack',xp:25,drop:'wolf_pelt',gold:7,respawn:110,tint:0x806e56,
    clips:{idle:'Idle',walk:'Gallop',attack:'Attack',death:'Death'}}),
  camp('nieve_lobo_alfa','snow_alpha','snow',450,-72,1,{model:'wolf',family:'mountain',
    hp:82,dmg:15,speed:8,aggro:25,behavior:'pack',xp:68,drop:'frost_essence',gold:20,
    respawn:160,tint:0xc7e1fa,clips:{idle:'Idle',walk:'Gallop',attack:'Attack',death:'Death'}}),
  camp('nieve_yeti','yeti','snow',505,-238,1,{family:'mountain',hp:140,dmg:19,speed:3.2,aggro:18,
    range:2.3,cd:2.5,xp:110,drop:'yeti_fur',gold:40,respawn:220,
    clips:{idle:'Idle',walk:'Walk',attack:'Bite_Front',death:'Death'}}),
  camp('camino_bandidos','bandit','road',215,-112,5,{model:'npc_rogue',family:'humanoid',hp:63,dmg:11,speed:4.9,
    behavior:'social',xp:46,drop:'bandit_emblem',gold:22,respawn:150,
    clips:{idle:'Idle',walk:'Walking_A',attack:'1H_Melee_Attack_Chop',death:'Death_A'}}),
  camp('ruinas_orco','orc','ruins',-470,-300,1,{family:'goblinoid',hp:98,dmg:17,speed:3.5,aggro:17,
    xp:78,drop:'orc_tusk',gold:18,respawn:190,
    clips:{idle:'Idle',walk:'Walk',attack:'Punch',death:'Death'}})
]);
export const P183B_COAST_COUNT=2;
export const P183B_COAST_TEMPLATE=camp('costa_cangrejos','crab','coast',0,0,1,{
 family:'crustacean',hp:29,dmg:6,speed:2.8,aggro:8,range:1.4,cd:2,
 xp:19,drop:'crab_shell',gold:3,respawn:105,
 clips:{idle:'Idle',walk:'Walk',attack:'Bite_Front',death:'Death'}
});
export function biomeValidP183b(terrain,x,z,biome,allow=()=>true){
 if(!terrain||!Number.isFinite(x)||!Number.isFinite(z)||!allow(x,z))return false;
 const h=terrain.getHeight(x,z),water=terrain.waterY;
 if(!Number.isFinite(h)||h<water+.55)return false;
 if(biome==='snow' ? h<54 : biome!=='coast' && h>50)return false;
 if(biome==='coast'){
   if(h>water+7.0)return false;
   // Traverse shoreline: allow up to 24 m from water so a real shore
   // never demands an impossibly steep 8m elevation drop.
   if(![[24,0],[-24,0],[0,24],[0,-24],[17,17],[17,-17],[-17,17],[-17,-17]]
      .some(([dx,dz])=>terrain.getHeight(x+dx,z+dz)<water-.03))return false;
 }
 if(typeof terrain.getSlope==='function'&&terrain.getSlope(x,z)>(biome==='snow'?.8:biome==='coast'?.95:.65))return false;
 if(biome==='forest'&&!realForestP183c(terrain,x,z))return false;
 return true;
}
export function resolveBiomeCampP183b(terrain,camp,allow=()=>true){
 const radial=[0,12,24,38,56,80,110,150];
 for(const radius of radial)for(let i=0;i<(radius?12:1);i++){
   const a=i*Math.PI/6,x=camp.x+radius*Math.cos(a),z=camp.z+radius*Math.sin(a);
   if(biomeValidP183b(terrain,x,z,camp.biome,allow))return {x,z,y:terrain.getHeight(x,z)};
 }
 return null;
}
export function resolveCoastSitesP183b(terrain,allow=()=>true){
 const spots=[];
 for(const radius of [120,155,190,235,290,350,420,500,600,730,880,1040]){
   for(let i=0;i<36;i++){
     const theta=i*Math.PI/18,x=Math.round(Math.cos(theta)*radius),z=Math.round(40+Math.sin(theta)*radius);
     if(!biomeValidP183b(terrain,x,z,'coast',allow))continue;
     if(spots.every(s=>Math.hypot(s.x-x,s.z-z)>=75))spots.push({x,z,y:terrain.getHeight(x,z)});
     if(spots.length>=P183B_COAST_COUNT)return spots;
   }
 }
 return spots;
}
export function p183bCampSlug(type){return String(type).replace(/[^a-z0-9_]/gi,'_');}
