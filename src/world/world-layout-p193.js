/**
 * HIGHFLY P193 — versioned, non-destructive world-layout adapter.
 * P192 owns the procedural terrain, towns, monsters and quests.
 * This file only applies overrides. Empty JSON = exact P192 world.
 */
import * as THREE from 'three';
import {mulberry32} from '../core/noise.js';

export const WORLD_LAYOUT_SCHEMA_P193 = 193;
export const WORLD_LAYOUT_PATH_P193 = './assets/world-layout-p193.json';
export const WORLD_FORGE_DRAFT_KEY_P195='hf_p195_world_forge_v2_draft';
export const P193_REFERENCE_MODELS = Object.freeze([
  'player','sword','skeleton_warrior','skeleton_mage','skeleton_blade','wolf','wolf_claude',
  'spider','crab','goblin','orc','stag','fox','yeti','yeti_highland','boar','dragon'
]);
export const P193_LIBRARY = Object.freeze([
  {id:'house',label:'Casa HIGHFLY',type:'house',license:'Código propio'},
  {id:'pine1',label:'Pino',type:'model',license:'Asset existente en HIGHFLY; verificar licencia individual'},
  {id:'pine2',label:'Pino alternativo',type:'model',license:'Asset existente en HIGHFLY; verificar licencia individual'},
  {id:'pine_snow',label:'Pino nevado',type:'model',license:'Asset existente en HIGHFLY; verificar licencia individual'},
  {id:'rock1',label:'Roca',type:'model',license:'Asset existente en HIGHFLY; verificar licencia individual'},
  {id:'rock_large',label:'Roca grande',type:'model',license:'Asset existente en HIGHFLY; verificar licencia individual'},
  {id:'npc_mage',label:'NPC maga',type:'npc',license:'KayKit existente en HIGHFLY'},
  {id:'npc_knight',label:'NPC guerrero',type:'npc',license:'KayKit existente en HIGHFLY'},
  {id:'npc_rogue',label:'NPC aldeano',type:'npc',license:'KayKit existente en HIGHFLY'}
]);

const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const goodId = id => typeof id === 'string' && /^[a-z0-9:_-]{2,96}$/.test(id)
  && !['__proto__','constructor','prototype'].includes(id);
const num = (x,min,max) => Number.isFinite(x) && x>=min && x<=max;
export function validPointP193(value) {
  return isRecord(value) && num(value.x,-12000,12000) && num(value.z,-12000,12000);
}
export function safeTransformP193(value) {
  if(!validPointP193(value))return null;
  return {
    x:value.x,z:value.z,
    rotation:num(value.rotation,-1000,1000)?value.rotation:0,
    scale:num(value.scale,0.3,4)?value.scale:1,
    hidden:value.hidden===true
  };
}
export function emptyWorldLayoutP193(){
  return {schemaVersion:WORLD_LAYOUT_SCHEMA_P193,worldId:'village_01',
    hubs:{},entities:{},added:[]};
}
export function normalizeWorldLayoutP193(input){
  if(!isRecord(input) || input.schemaVersion!==WORLD_LAYOUT_SCHEMA_P193 ||
      input.worldId!=='village_01')throw Error('Este archivo no es un mapa HIGHFLY P193 válido');
  const out=emptyWorldLayoutP193();
  if(isRecord(input.hubs))for(const [id,v] of Object.entries(input.hubs)){
    if(goodId(id)&&validPointP193(v))out.hubs[id]={x:v.x,z:v.z};
  }
  if(isRecord(input.entities))for(const [id,v] of Object.entries(input.entities)){
    const p=safeTransformP193(v);
    if(goodId(id)&&p)out.entities[id]=p;
  }
  if(Array.isArray(input.added)){
    for(const v of input.added.slice(0,250)){
      const p=safeTransformP193(v);
      const asset=P193_LIBRARY.find(a=>a.id===v?.asset);
      if(!p||!goodId(v.id)||!asset||v.asset==='house'&&v.kind!=='house')continue;
      if(v.kind!==asset.type)continue;
      out.added.push({...p,id:v.id,kind:asset.type,asset:asset.id});
    }
  }
  return out;
}
export async function loadWorldLayoutP193(){
  // Preview is explicitly opt-in: production saves and published layout never
  // ingest a local draft unless the player visits ?hf_world_draft=1.
  if(new URLSearchParams(location.search).get('hf_world_draft')==='1'){
    try{
      const raw=localStorage.getItem(WORLD_FORGE_DRAFT_KEY_P195);
      if(raw)return normalizeWorldLayoutP193(JSON.parse(raw));
    }catch(error){
      console.warn('[HIGHFLY P195] Borrador invalido; se usa el mapa publicado',error);
    }
  }
  try{
    const response=await fetch(WORLD_LAYOUT_PATH_P193,{cache:'no-cache'});
    if(!response.ok)return emptyWorldLayoutP193();
    return normalizeWorldLayoutP193(await response.json());
  }catch(error){
    console.warn('[HIGHFLY P193] Mapa no disponible; se usa el original P192.',error);
    return emptyWorldLayoutP193();
  }
}
export function siteForP193(game,hubId,fallback){
  const v=game.worldLayoutP193?.hubs?.[hubId];
  if(!validPointP193(v))return fallback;
  return {x:v.x,z:v.z,y:game.terrain.getHeight(v.x,v.z)};
}
export function entityForP193(game,id){
  return safeTransformP193(game.worldLayoutP193?.entities?.[id]);
}

export function adjustHouseP193(game,group,transform){
  if(!group||!transform)return;
  const st=game.structures;
  const px=group.position.x,pz=group.position.z,oldRotation=group.rotation.y;
  const oldChimney=st.chimneyTops?.find(c=>Math.hypot(c.x-px,c.z-pz)<4);
  const oldLocal=oldChimney?{
    x:(oldChimney.x-px)*Math.cos(oldRotation)-(oldChimney.z-pz)*Math.sin(oldRotation),
    z:(oldChimney.x-px)*Math.sin(oldRotation)+(oldChimney.z-pz)*Math.cos(oldRotation)
  }:null;
  const collider=st.colliders.find(c=>Math.hypot(c.x-px,c.z-pz)<.05);
  const scale=transform.scale||1;
  group.position.set(transform.x,game.terrain.getHeight(transform.x,transform.z),transform.z);
  group.rotation.y=transform.rotation;
  group.scale.setScalar(scale);
  group.visible=!transform.hidden;
  if(collider){
    if(!group.userData.p193BaseCollider)group.userData.p193BaseCollider={hw:collider.hw,hd:collider.hd};
    collider.x=transform.x;collider.z=transform.z;collider.ry=transform.rotation;
    collider.hw=group.userData.p193BaseCollider.hw*scale;
    collider.hd=group.userData.p193BaseCollider.hd*scale;
    group.userData.p193Collider=collider;
  }
  if(oldChimney&&oldLocal){
    oldChimney.set(
      transform.x+oldLocal.x*Math.cos(transform.rotation)+oldLocal.z*Math.sin(transform.rotation),
      group.position.y+5.3*scale,
      transform.z-oldLocal.x*Math.sin(transform.rotation)+oldLocal.z*Math.cos(transform.rotation)
    );
  }
}
export function applyCentralLayoutP193(game){
  const st=game.structures;
  const houses=[...(st._ringHouses||[]),st._smithyHouse].filter(Boolean);
  for(let i=0;i<houses.length;i++){
    const house=houses[i],key='village:house:'+i;
    house.userData.p193Id=key;
    const saved=entityForP193(game,key);
    if(saved)adjustHouseP193(game,house,saved);
    if(st.housePositions[i])st.housePositions[i].set(house.position.x,house.position.y+5.3,house.position.z);
  }
  for(const door of st.enterableDoors||[]){
    const idx=door.id==='inn'?1:door.id==='olaf_house'?3:door.id==='smithy'?5:-1;
    if(idx>=0&&houses[idx])door.pos.copy(st._doorAnchor(houses[idx]));
  }
  for(const npc of game.npcs.list){
    const saved=entityForP193(game,'npc:'+npc.id);
    if(!saved)continue;
    npc.pos.set(saved.x,game.terrain.getHeight(saved.x,saved.z),saved.z);
    npc.yaw=saved.rotation;
    npc.group.rotation.y=saved.rotation;
    npc.group.scale.setScalar(saved.scale);
    npc.group.visible=!saved.hidden;
    if(npc.wander){npc.wander.homeX=saved.x;npc.wander.homeZ=saved.z;npc.wander.target=null;}
  }
  game.p193Added=[];
  for(const item of game.worldLayoutP193?.added||[]){
    const object=spawnAddedP193(game,item);
    if(object)game.p193Added.push(object);
  }
}

/** Creates only already-shipped, successfully loaded asset models. */
export function spawnAddedP193(game,item){
  const p=safeTransformP193(item);
  const def=P193_LIBRARY.find(a=>a.id===item?.asset && a.type===item?.kind);
  if(!p||!def)return null;
  let object=null,npc=null,group=null;
  if(item.kind==='house'){
    const before=game.structures.colliders.length;
    group=game.structures._buildHouse(p.x,p.z,false,mulberry32(193+(item.id.length*7)));
    const collider=game.structures.colliders[before];
    if(collider)group.userData.p193Collider=collider;
    adjustHouseP193(game,group,p);
  }else if(item.kind==='npc'){
    if(!game.assets._lib[item.asset])return null;
    npc=game.npcs._makeNPC({id:item.id,name:'NPC '+item.id,
      x:p.x,z:p.z,model:item.asset});
    group=npc.group;
    group.rotation.y=p.rotation;group.scale.setScalar(p.scale);
    group.visible=!p.hidden;
    npc.yaw=p.rotation;
    game.npcs.list.push(npc);
  }else{
    if(!game.assets._lib[item.asset])return null;
    const parts=game.assets.staticParts(item.asset);
    if(!parts?.length)return null;
    group=new THREE.Group();
    for(const part of parts){
      const mesh=new THREE.Mesh(part.geometry,part.material);
      mesh.matrix.copy(part.matrix);mesh.matrixAutoUpdate=false;
      mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    }
    group.position.set(p.x,game.terrain.getHeight(p.x,p.z),p.z);
    group.rotation.y=p.rotation;group.scale.setScalar(p.scale);
    group.visible=!p.hidden;
    game.scene.add(group);
  }
  group.userData.p193Id='added:'+item.id;
  object={...item,group,npc};
  return object;
}
