/**
 * HIGHFLY P196 — isolated wilderness camp configuration.
 * Three ADDITIONAL spots of five existing CC0 creatures; canonical monsters,
 * loot, boss coordinates and legacy wolf packs remain unchanged.
 * Spots can be moved through the normal WORLD FORGE entity layout.
 */
export const WILDERNESS_SPOTS_P196=Object.freeze([
  Object.freeze({id:'boar_meadow_p196',label:'Pradera · manada de 5 jabalíes',
    x:345,z:185,biome:'prairie',sourceCamp:'pradera_jabali',kind:'boar',count:5}),
  Object.freeze({id:'goblin_woods_p196',label:'Bosque · 5 goblins',
    x:-440,z:565,biome:'forest',sourceCamp:'bosque_goblins',kind:'goblin',count:5}),
  Object.freeze({id:'spider_grove_p196',label:'Arboleda · 5 arañas',
    x:-475,z:335,biome:'forest',sourceCamp:null,kind:'spider',count:5}),
]);
export const WILDERNESS_MIN_TOWN_RADIUS_P196=115;
export const WILDERNESS_MIN_BOSS_DISTANCE_P196=115;
export const PROTECTED_BOSS_ANCHORS_P196=Object.freeze([
  Object.freeze({id:'dragon_tower',x:300,z:-300}),
  Object.freeze({id:'greyjaw_alpha',x:-420,z:72}),
  Object.freeze({id:'glacial_alpha',x:450,z:-72}),
  Object.freeze({id:'ruins',x:-220,z:-180})
]);
export function validWildernessSpawnP196(terrain,x,z,biome,biomeValid){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 if(Math.hypot(x,z-40)<WILDERNESS_MIN_TOWN_RADIUS_P196)return false;
 if(PROTECTED_BOSS_ANCHORS_P196.some(p=>Math.hypot(x-p.x,z-p.z)<WILDERNESS_MIN_BOSS_DISTANCE_P196))return false;
 return biomeValid(terrain,x,z,biome,(px,pz)=>
   Math.hypot(px,pz-40)>=WILDERNESS_MIN_TOWN_RADIUS_P196 &&
   PROTECTED_BOSS_ANCHORS_P196.every(p=>Math.hypot(px-p.x,pz-p.z)>=WILDERNESS_MIN_BOSS_DISTANCE_P196));
}
