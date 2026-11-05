/**
 * HIGHFLY / Pueblo de los Inicios v2 (P18.6).
 * Curriculum + professions + build-safe territorial contracts for World 0.
 *
 * Canonical source of the FIFTEEN IDs:
 * World of ClaudeCraft 0.44.7
 * commit 493c35a108cef6c8aa290e8793107b1cd117886e
 * src/sim/content/professions.ts: GATHERING_PROFESSIONS + CRAFT_RING.
 *
 * Adaptation is HIGHFLY-only original data. This module DOES NOT spawn NPCs,
 * instantiate 3D objects, modify inventory, or modify current saves. A trainer
 * and first lesson being REGISTERED never means its visual model exists yet.
 */
export const INICIOS_SCHEMA_P186 = 186;
export const INICIOS_WORLD_P186 = 'village_01';
export const INICIOS_LEVEL_RANGE_P186 = Object.freeze([1,20]);

const freeze = spec => Object.freeze(spec);
const hub = (id,name,kind,levelRange,roles,sitePolicy,anchorHint) => freeze({
  id,name,kind,levelRange:Object.freeze(levelRange),roles:Object.freeze(roles),
  sitePolicy,anchorHint:anchorHint?freeze(anchorHint):null,
  built:id==='central_village', // Existing town, not the new schools and props.
  needsTerrainValidation:id!=='central_village'
});

/**
 * Coordinates below are CANDIDATE SEARCH ORIGINS, not placements.
 * W0 town center is real from Structures.villageCenter (x=0,z=40).
 * Existing cities, monsters, wetlands, roads and steep slopes must be checked
 * at runtime before a prop/NPC is ever placed.
 */
export const INICIOS_HUBS_P186 = Object.freeze([
  hub('central_village','Pueblo de los Inicios','capital',[1,20],
    ['tutorial','quests','combat_school','market','bank','inn','forge','armor'],
    'existing_structures',{x:0,z:40}),
  hub('sawmill_hamlet','Villa del Aserradero','satellite',[3,9],
    ['logging','timber','toolworks','wood_shop'],
    'dry_forested_route',{x:-90,z:195}),
  hub('mining_hamlet','Poblado Minero','satellite',[5,13],
    ['mining','ore','quarry','mine_dungeon'],
    'dry_rocky_route',{x:-125,z:-70}),
  hub('herbal_hamlet','Aldea de los Herbolarios','satellite',[2,10],
    ['herbalism','alchemy','inscription','apothecary'],
    'dry_botanical_clearing',{x:170,z:220}),
  hub('fishing_hamlet','Villa de los Pescadores','satellite',[3,11],
    ['fishing','fish_market','cooking','pier'],
    'walkable_real_shoreline',null),
  hub('farming_hamlet','Pueblo de las Granjas','satellite',[4,12],
    ['farming','plots','crops','kitchens'],
    'flat_safe_farmland',{x:115,z:15}),
  hub('artisan_quarter','Barrio de Artesanos','quarter',[3,20],
    ['leatherworking','tailoring','jewelcrafting','weaponcrafting','armorcrafting'],
    'inside_existing_town_or_safe_outskirt',null),
  hub('arcane_quarter','Barrio de Estudios','quarter',[8,20],
    ['enchanting','inscription','alchemy','engineering','basic_magic_skills'],
    'inside_existing_town_or_safe_outskirt',null)
]);

const prof = (id,name,category,hubId,trainerId,introLevel,maxSkill,starterLesson) =>
  freeze({id,name,category,hubId,trainerId,introLevel,maxSkill,starterLesson,
    introQuestId:'prof_intro_'+id,registered:true,playable:false,
    // Endgame systems come later; do not misrepresent the current runtime.
    visualStatus:'pending_cc0_model',source:'woc_0447_id_highfly_adapter'});

/** The five WOC gathering IDs, exact and in original source order. */
export const INICIOS_GATHERING_P186 = Object.freeze([
  prof('mining','Minería','gathering','mining_hamlet','master_miner',5,100,'mina_primera_veta'),
  prof('logging','Tala','gathering','sawmill_hamlet','master_lumberjack',3,100,'tala_arbol_marcado'),
  prof('herbalism','Herboristería','gathering','herbal_hamlet','master_herbalist',2,100,'recolecta_hierbas'),
  prof('fishing','Pesca','gathering','fishing_hamlet','master_fisher',3,200,'captura_pez_comun'),
  prof('farming','Agricultura','gathering','farming_hamlet','master_farmer',4,100,'siembra_y_cosecha')
]);

/**
 * The ten crafting IDs preserve canonical CRAFT_RING ordering.
 * 125 is WOC's maxSkill ceiling, not character level (which is 1..20 here).
 * Carpenter is not a sixteenth WOC profession; a wood shop belongs under
 * engineering/weaponcrafting recipes until a distinct HIGHFLY craft is approved.
 */
export const INICIOS_CRAFT_RING_P186 = Object.freeze([
  prof('engineering','Ingeniería','crafting','sawmill_hamlet','master_tinkerer',6,125,'herramienta_basica'),
  prof('alchemy','Alquimia','crafting','herbal_hamlet','master_alchemist',4,125,'pocion_sencilla'),
  prof('cooking','Cocina','crafting','fishing_hamlet','master_cook',3,125,'pescado_asado'),
  prof('leatherworking','Peletería','crafting','artisan_quarter','master_tanner',6,125,'guantes_de_cuero'),
  prof('tailoring','Sastrería','crafting','artisan_quarter','master_tailor',6,125,'ropa_simple'),
  prof('inscription','Inscripción','crafting','arcane_quarter','master_scribe',10,125,'pergamino_basico'),
  prof('enchanting','Encantamiento','crafting','arcane_quarter','master_enchanter',12,125,'encantamiento_primario'),
  prof('jewelcrafting','Joyería','crafting','artisan_quarter','master_jeweler',8,125,'colgante_simple'),
  prof('weaponcrafting','Fabricación de armas','crafting','central_village','sigrid',2,125,'espada_inicial'),
  prof('armorcrafting','Fabricación de armaduras','crafting','central_village','sigrid',2,125,'armadura_inicial')
]);

export const INICIOS_PROFESSIONS_P186 = Object.freeze([
  ...INICIOS_GATHERING_P186,...INICIOS_CRAFT_RING_P186
]);
export const INICIOS_PROFESSION_BY_ID_P186 = freeze(Object.fromEntries(
  INICIOS_PROFESSIONS_P186.map(p=>[p.id,p])
));

export const INICIOS_TRAINERS_P186 = Object.freeze([
  freeze({id:'sigrid',hubId:'central_village',role:'herrera',existing:true}),
  ...[
    ['master_miner','mining_hamlet','capataz'],
    ['master_lumberjack','sawmill_hamlet','leñador'],
    ['master_herbalist','herbal_hamlet','boticario'],
    ['master_fisher','fishing_hamlet','pescador'],
    ['master_farmer','farming_hamlet','granjero'],
    ['master_tinkerer','sawmill_hamlet','ingeniero'],
    ['master_alchemist','herbal_hamlet','alquimista'],
    ['master_cook','fishing_hamlet','cocinero'],
    ['master_tanner','artisan_quarter','curtidor'],
    ['master_tailor','artisan_quarter','sastre'],
    ['master_scribe','arcane_quarter','escriba'],
    ['master_enchanter','arcane_quarter','encantador'],
    ['master_jeweler','artisan_quarter','joyero']
  ].map(([id,hubId,role])=>freeze({id,hubId,role,existing:false,modelId:null}))
]);

/**
 * A proposed tutorial progression. All trades BEGIN in W0; their more
 * demanding recipes, resources and skill ranks can require other worlds.
 * Levels here are intended narrative bands, not hardcoded inventory gates.
 */
export const INICIOS_CHAPTERS_P186 = Object.freeze([
  freeze({id:'awakening',title:'El comienzo del cazador',levels:freeze([1,4]),
    systems:freeze(['dialogue','combat_basic','loot','equip','quests','gathering_intro'])}),
  freeze({id:'craft_routes',title:'Los caminos de los oficios',levels:freeze([4,8]),
    systems:freeze(['herbalism','logging','mining','fishing','farming','tools','crafting_intro'])}),
  freeze({id:'village_network',title:'Las villas del oficio',levels:freeze([8,12]),
    systems:freeze(['commerce','advanced_trainer','recipes','mine_dungeon','support_skills'])}),
  freeze({id:'ruins_expedition',title:'Las ruinas olvidadas',levels:freeze([12,16]),
    systems:freeze(['barrow_dungeon','intermediate_gear','runic_skills','reputation'])}),
  freeze({id:'forest_gate',title:'El llamado del portal',levels:freeze([16,20]),
    systems:freeze(['regional_boss','quest_chain','forest_invitation','world_portals'])})
]);

export const INICIOS_DUNGEONS_P186 = Object.freeze([
  freeze({id:'inicios_mine_01',name:'Galerías de la Primera Veta',hubId:'mining_hamlet',
    levelRange:freeze([7,12]),kind:'mine',sourceRoomId:null,stage:'design',
    rooms:freeze(['entrada','galeria','bifurcacion','mini_boss','tesoro','salida'])}),
  freeze({id:'inicios_barrow_01',name:'Cripta de los Guardianes',hubId:'central_village',
    levelRange:freeze([12,20]),kind:'crypt',sourceRoomId:'barrow',
    stage:'existing_basic_room_requires_p184_upgrade',
    rooms:freeze(['vestibulo','guardianes','sello','antecámara','jefe','retorno'])})
]);

const res = (id,professionId,where,toolTier,level,rarity='common') =>
  freeze({id,professionId,zoneId:where,toolTier,level,rarity,ready:false});
export const INICIOS_RESOURCES_P186 = Object.freeze([
  res('herb_common','herbalism','village_01',1,2),
  res('timber_common','logging','village_01',1,3),
  res('ore_copper','mining','village_01',1,5),
  res('fish_river_common','fishing','village_01',1,3),
  res('crop_wheat','farming','village_01',1,4),
  res('forest_ancient_wood','logging','forest_falls_01',2,21,'uncommon'),
  res('forest_moon_herb','herbalism','forest_falls_01',2,21,'uncommon'),
  res('forest_river_pearl','fishing','forest_falls_01',2,21,'rare')
]);
export const INICIOS_RESOURCE_BY_ID_P186 = freeze(Object.fromEntries(
  INICIOS_RESOURCES_P186.map(r=>[r.id,r])
));
export function canGatherMaterialP186(id,zoneId,toolTier,level){
  const r=INICIOS_RESOURCE_BY_ID_P186[id];
  return !!r && r.zoneId===zoneId && Number.isInteger(toolTier) &&
    toolTier>=r.toolTier && Number.isInteger(level) && level>=r.level;
}

const validKey = id => typeof id==='string' &&
  /^[a-z][a-z0-9_]{1,63}$/.test(id) &&
  !['__proto__','constructor','prototype'].includes(id);
function boolMap(v) {
  const result={};
  if(!v||typeof v!=='object'||Array.isArray(v))return result;
  for(const [id,val] of Object.entries(v))if(validKey(id)&&val===true)result[id]=true;
  return result;
}

/**
 * One place to persist profession initiation and future skill progress.
 * Does not pretend to be integrated with Inventory, SaveSys or NPC dialogue.
 */
export function newIniciosProfessionStateP186(data=null){
  const learned={};
  const previous=data?.schemaVersion===INICIOS_SCHEMA_P186?boolMap(data.learned):{};
  for(const id of Object.keys(previous)){
    if(Object.hasOwn(INICIOS_PROFESSION_BY_ID_P186,id))learned[id]=true;
  }
  const experience={};
  for(const p of INICIOS_PROFESSIONS_P186){
    const raw=data?.schemaVersion===INICIOS_SCHEMA_P186?data?.experience?.[p.id]:null;
    experience[p.id]=Number.isInteger(raw) ? Math.min(Math.max(raw,0),p.maxSkill):0;
  }
  return {
    schemaVersion:INICIOS_SCHEMA_P186,learned,experience,
    awarded: data?.schemaVersion===INICIOS_SCHEMA_P186?boolMap(data.awarded):{}
  };
}
export function learnIniciosProfessionP186(data,professionId){
  const p=INICIOS_PROFESSION_BY_ID_P186[professionId];
  if(!p)throw Error('Unknown founding profession');
  const next=newIniciosProfessionStateP186(data);
  next.learned[p.id]=true;
  return next;
}
export function awardIniciosProficiencyP186(data,professionId,awardId,points=1){
  const p=INICIOS_PROFESSION_BY_ID_P186[professionId];
  if(!p)throw Error('Unknown founding profession');
  if(!validKey(awardId)||!Number.isInteger(points)||points<1||points>10)
    throw Error('Invalid profession award');
  const next=newIniciosProfessionStateP186(data);
  if(!next.learned[professionId])throw Error('Profession not learned');
  if(next.awarded[awardId])return next; // no duplicate grant from a reloaded node.
  next.awarded[awardId]=true;
  next.experience[professionId]=Math.min(p.maxSkill,next.experience[professionId]+points);
  return next;
}

export function auditIniciosDefinitionsP186(){
  const unique = (rows,field)=>new Set(rows.map(row=>row[field])).size===rows.length;
  if(!unique(INICIOS_PROFESSIONS_P186,'id')||INICIOS_GATHERING_P186.length!==5||
     INICIOS_CRAFT_RING_P186.length!==10)throw Error('Expected exactly 15 unique professions');
  if(!unique(INICIOS_HUBS_P186,'id')||!unique(INICIOS_TRAINERS_P186,'id'))
    throw Error('Duplicated hub or trainer');
  if(!unique(INICIOS_RESOURCES_P186,'id')||!unique(INICIOS_DUNGEONS_P186,'id'))
    throw Error('Duplicated resource or dungeon');
  const hubs = new Set(INICIOS_HUBS_P186.map(x=>x.id));
  const trainers = new Map(INICIOS_TRAINERS_P186.map(x=>[x.id,x]));
  for(const p of INICIOS_PROFESSIONS_P186){
    if(p.introLevel>20||p.introLevel<1)throw Error('Profession not taught by level 20');
    if(!hubs.has(p.hubId))throw Error('Profession missing district: '+p.id);
    const teacher=trainers.get(p.trainerId);
    if(!teacher)throw Error('Profession missing mentor: '+p.id);
    if(p.trainerId!=='sigrid'&&teacher.hubId!==p.hubId)
      throw Error('Mentor is in wrong hub: '+p.id);
  }
  for(const r of INICIOS_RESOURCES_P186){
    if(!INICIOS_PROFESSION_BY_ID_P186[r.professionId])
      throw Error('Resource missing profession');
    if(r.zoneId==='village_01'&&r.level>20)throw Error('Late resource in starting world');
    if(r.zoneId==='forest_falls_01'&&r.level<=20)
      throw Error('Exclusive resource appears in tutorial world range');
  }
  return freeze({professions:15,gathering:5,crafting:10,hubs:8,
    trainers:INICIOS_TRAINERS_P186.length,
    dungeons:INICIOS_DUNGEONS_P186.length,resources:INICIOS_RESOURCES_P186.length});
}
