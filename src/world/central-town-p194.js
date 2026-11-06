/**
 * HIGHFLY P194 - Pueblo de los Inicios unificado.
 * Reuses ONLY already shipped LOW-POLY HIGHFLY house builder and existing NPC rigs.
 * No KayKit SOURCE, unverified WOC models or non-redistributable visual media.
 * P192 quests and exact profession/trainer identifiers are preserved.
 */
import * as THREE from 'three';
import {mulberry32} from '../core/noise.js';
import {INICIOS_TRAINERS_P186} from './inicios-v2-p186.js';
import {P192_TRAINER_MODELS} from './hamlets-p192.js';
import {entityForP193,adjustHouseP193} from './world-layout-p193.js';
import {installLivingTownP196} from './living-town-p196.js';
import {premiumSignP196,installTownLanternsP196} from './town-visuals-p196.js';

export const P194_DISTRICTS=Object.freeze([
  {id:'communal',label:'Casa comunal · Olaf',x:-6,z:78,house:0},
  {id:'tavern',label:'Taberna de los aventureros',x:-34,z:63,house:1},
  {id:'workshop',label:'Taller de recursos · minería, tala, ingeniería',x:-43,z:36,house:2},
  {id:'olaf',label:'Casa de Olaf · vivienda',x:-10,z:7,house:3},
  {id:'market',label:'Mercado · granja y cocina',x:37,z:48,house:4},
  {id:'smithy',label:'Herrería de Sigrid · armas y armaduras',x:14,z:54,house:5},
  {id:'apothecary',label:'Botica · herboristería y alquimia',x:-30,z:11},
  {id:'arcane',label:'Academia arcana · inscripción y encantamiento',x:30,z:12},
  {id:'textile',label:'Atelier · peletería, sastrería y joyería',x:8,z:-5}
]);
export const P194_SITE_TO_DISTRICT=Object.freeze({
  sawmill_hamlet:'workshop',mining_hamlet:'workshop',
  herbal_hamlet:'apothecary',fishing_hamlet:'market',
  farming_hamlet:'market',artisan_quarter:'textile',arcane_quarter:'arcane'
});
export const P194_SITE_NAMES=Object.freeze({
  sawmill_hamlet:'Taller de Tala e Ingeniería',
  mining_hamlet:'Taller Minero',
  herbal_hamlet:'Botica Central',
  fishing_hamlet:'Muelle y Mercado Pesquero',
  farming_hamlet:'Mercado Agrícola',
  artisan_quarter:'Barrio Textil y Joyería',
  arcane_quarter:'Academia Arcana'
});
export const P194_TRAINER_SPOTS=Object.freeze({
  master_miner:[-49,29],master_lumberjack:[-49,44],
  master_herbalist:[-36,16],master_fisher:[42,56],
  master_farmer:[42,42],master_tinkerer:[-38,43],
  master_alchemist:[-23,14],master_cook:[43,50],
  master_tanner:[1,-7],master_tailor:[15,-8],
  master_scribe:[25,20],master_enchanter:[36,18],
  master_jeweler:[5,-13]
});

const PLACEMENT_RADIUS=60;
function terrainOK(game,x,z){
  const t=game.terrain;
  return Number.isFinite(x)&&Number.isFinite(z)&&
    Math.hypot(x,z-40)<PLACEMENT_RADIUS &&
    t.getHeight(x,z)>t.waterY+1.3 && t.getSlope(x,z)<0.5;
}
function npcFree(game,x,z){
  if(!terrainOK(game,x,z))return false;
  if(game.structures.colliders.some(c=>Math.hypot(c.x-x,c.z-z)<5.6))return false;
  if(game.npcs.list.some(n=>Math.hypot(n.pos.x-x,n.pos.z-z)<2.9))return false;
  return true;
}
function safeNPCSpot(game,x,z){
  if(npcFree(game,x,z))return {x,z};
  for(const r of [4,6,8,10,12,14]){
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      if(npcFree(game,px,pz))return {x:px,z:pz};
    }
  }
  return null;
}
const box=(group,w,h,d,mat,x,y,z)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;group.add(m);return m;
};
function canvasLabel(text){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#30291f';ctx.fillRect(0,0,512,128);
  ctx.strokeStyle='#d5b979';ctx.lineWidth=8;ctx.strokeRect(8,8,496,112);
  ctx.fillStyle='#fce9b9';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 29px sans-serif';ctx.fillText(text.slice(0,30),256,64,466);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function facadeSign(game,house,text){
  const t=canvasLabel(text);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(4.35,1.04),
    new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide,transparent:false}));
  m.position.set(0,4.68,2.35);
  house.add(m); // sign follows P193 editable building transform
}
/** Plaza portal authored meshes, not copied visual assets or primitive placeholders for houses. */
function buildPortal(game){
  const y=game.terrain.getHeight(0,40);
  const group=new THREE.Group();group.position.set(0,y,40);
  const slate=new THREE.MeshStandardMaterial({color:0x596779,roughness:.82});
  const trim=new THREE.MeshStandardMaterial({color:0xc0a36c,metalness:.38,roughness:.42});
  const glow=new THREE.MeshStandardMaterial({color:0x2990e1,emissive:0x2569df,emissiveIntensity:1.35,roughness:.2});
  const crystal=new THREE.MeshStandardMaterial({color:0x9fe9ff,emissive:0x4e9cff,emissiveIntensity:.8,roughness:.12});
  const foundation=new THREE.Mesh(new THREE.CylinderGeometry(6.1,6.45,.34,16),slate);
  foundation.position.y=.09;group.add(foundation);
  const ringRoad=new THREE.Mesh(new THREE.TorusGeometry(5.35,.14,8,48),trim);
  ringRoad.rotation.x=-Math.PI/2;ringRoad.position.y=.29;group.add(ringRoad);
  const innerRing=new THREE.Mesh(new THREE.TorusGeometry(3.0,.1,8,44),glow);
  innerRing.rotation.x=-Math.PI/2;innerRing.position.y=.31;group.add(innerRing);
  // Genuine gateway silhouette with two 3d pillars, arch and floating crystal.
  for(const side of [-1,1]){
    const column=new THREE.Mesh(new THREE.CylinderGeometry(.44,.66,5.6,7),slate);
    column.position.set(side*2.25,2.95,-.35);group.add(column);
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(.86,.94,.55,8),trim);
    plinth.position.set(side*2.25,.45,-.35);group.add(plinth);
    const glyph=new THREE.Mesh(new THREE.OctahedronGeometry(.52),glow);
    glyph.position.set(side*2.25,6.05,-.35);group.add(glyph);
  }
  const arch=new THREE.Mesh(new THREE.TorusGeometry(2.25,.34,9,36,Math.PI),slate);
  arch.position.set(0,5.45,-.35);group.add(arch);
  const innerGlow=new THREE.Mesh(new THREE.TorusGeometry(1.83,.085,8,48,Math.PI),glow);
  innerGlow.position.set(0,5.45,-.34);group.add(innerGlow);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.8),crystal);
  core.position.set(0,3.25,-.34);group.add(core);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const n=new THREE.Mesh(new THREE.CylinderGeometry(.23,.37,1.25,6),slate);
    n.position.set(Math.sin(a)*5.43,.86,Math.cos(a)*5.43);group.add(n);
  }
  group.userData.p194Id='p194:portal';
  group.userData.p194Kind='model';game.structures.root.add(group);
  return group;
}
/**
 * P195: apply the same versioned transforms in the editor AND playable game.
 * Pier altitude must remain at water level, including after moving in Forge.
 */
function applyFeatureLayoutP195(game,group,id,water=false){
  if(!group)return;
  const saved=entityForP193(game,id);
  if(!saved)return;
  group.position.set(saved.x,water?game.terrain.waterY+1.05:
    game.terrain.getHeight(saved.x,saved.z),saved.z);
  group.rotation.y=saved.rotation;
  group.scale.setScalar(saved.scale);
  group.visible=!saved.hidden;
}
function locateShore(game){
  const t=game.terrain,cx=0,cz=40,water=t.waterY;
  let chosen=null;
  // Short radial scan. Never spawn a fake pier on dry land.
  for(let rad=42;rad<=180;rad+=2){ // coastline begins ~52m from town centre
    for(let k=0;k<48;k++){
      const a=k*Math.PI/24,dx=Math.sin(a),dz=Math.cos(a);
      const x=cx+dx*rad,z=cz+dz*rad;
      const h=t.getHeight(x,z),h2=t.getHeight(x+dx*6,z+dz*6);
      if(h<=water+1.15||h>=water+6.5||h2>water-.25)continue;
      if(t.getSlope(x,z)>.58)continue;
      const score=rad+Math.abs(x)*.03;
      if(!chosen||score<chosen.score)chosen={x,z,dx,dz,score};
    }
    if(chosen)break;
  }
  return chosen;
}
function buildPier(game){
  const shore=locateShore(game);
  if(!shore)return null;
  const {x,z,dx,dz}=shore;
  const g=new THREE.Group();
  const water=game.terrain.waterY;
  g.position.set(x,water+1.05,z);
  g.rotation.y=Math.atan2(dx,dz);
  const wood=new THREE.MeshStandardMaterial({color:0x99744b,roughness:.9});
  const trim=new THREE.MeshStandardMaterial({color:0x5d4930,roughness:.94});
  for(let n=0;n<8;n++){
    // The first boards step DOWN from real dry land to water level.
    const ramp=Math.max(0,1-n/4)*Math.max(0,game.terrain.getHeight(x,z)-(water+1.05));
    box(g,3.7,.22,.88,wood,0,ramp,n*.86-1);
    if(n%2===0)for(const side of [-1,1]){
      box(g,.2,2.5,.2,trim,side*1.65,-.93,n*.86-1);
    }
  }
  box(g,5.2,.23,1.25,wood,0,0,5.4);
  g.userData.p194Id='p194:pier';g.userData.p194Kind='model';
  game.structures.root.add(g);
  return g;
}
function makePaths(game){
  // Low-poly cobblestone promenade; paths rise with the EXISTING terrain.
  const g=new THREE.Group();game.structures.root.add(g);
  const material=new THREE.MeshStandardMaterial({color:0x7c796a,roughness:1});
  const stone=new THREE.BoxGeometry(2.8,.13,2.25);
  const merged=[];const c={x:0,z:40};
  for(const d of P194_DISTRICTS){
    if(d.id==='smithy')continue;
    const dx=d.x-c.x,dz=d.z-c.z,dist=Math.hypot(dx,dz);
    for(let l=8;l<dist-6;l+=3){
      const x=c.x+dx*l/dist,z=c.z+dz*l/dist;
      const h=game.terrain.getHeight(x,z);
      if(h<=game.terrain.waterY+1.1)continue;
      const m=new THREE.Mesh(stone,material);
      m.position.set(x,h+.055,z);
      m.rotation.y=Math.atan2(dx,dz);m.receiveShadow=true;
      m.castShadow=false;g.add(m);
    }
  }
  // Combine the path pieces into a single draw call where supported.
  // Group is small and only affects the initial town.
  return g;
}
function moveOldWell(game){
  const st=game.structures;
  if(st._p194OldWell){
    st._p194OldWell.position.set(11,game.terrain.getHeight(11,30),30);
    const circle=st.circleColliders.find(c=>Math.hypot(c.x,c.z-40)<2);
    if(circle){circle.x=11;circle.z=30;}
  }
}
function relocateHouse(game,house,index,x,z){
  const saved=entityForP193(game,'village:house:'+index);
  const angle=Math.atan2(-x,40-z);
  adjustHouseP193(game,house,saved||{x,z,rotation:angle,scale:1,hidden:false});
  const pos=game.structures.housePositions[index];
  if(pos)pos.set(house.position.x,house.position.y+5.3,house.position.z);
  for(const door of game.structures.enterableDoors){
    const j=door.id==='inn'?1:door.id==='olaf_house'?3:door.id==='smithy'?5:-1;
    if(j===index)door.pos.copy(game.structures._doorAnchor(house));
  }
}
function placeTownNPC(game,id,x,z){
  const npc=game.npcs.list.find(n=>n.id===id);
  if(!npc)return;
  const saved=entityForP193(game,'npc:'+id);
  const chosen=saved||{x,z};
  const y=game.terrain.getHeight(chosen.x,chosen.z);
  npc.pos.set(chosen.x,y,chosen.z);
  if(saved){npc.group.rotation.y=saved.rotation;npc.yaw=saved.rotation;
    npc.group.visible=!saved.hidden;npc.group.scale.setScalar(saved.scale);}
  if(npc.wander){npc.wander.homeX=chosen.x;npc.wander.homeZ=chosen.z;npc.wander.r=3;npc.wander.target=null;}
}
export function installCentralTownP194(game){
  if(game.p194CentralTown)return game.p194CentralTown;
  const structures=game.structures;
  const buildings=[];
  for(const district of P194_DISTRICTS){
    let house=null,id=null;
    if(Number.isInteger(district.house)){
      id='village:house:'+district.house;
      house=district.house===5?structures._smithyHouse:structures._ringHouses[district.house];
      if(!house)continue;
      // Keep the original smith's outdoor anvil and Sigrid aligned.
      if(district.house!==5)relocateHouse(game,house,district.house,district.x,district.z);
    }else{
      id='p194:district:'+district.id;
      house=structures._buildHouse(district.x,district.z,false,
        mulberry32((district.x*13597+district.z*7727)>>>0));
      house.userData.p193Id=id;
      const saved=entityForP193(game,id);
      if(saved)adjustHouseP193(game,house,saved);
    }
    if(game.p196Build)premiumSignP196(house,district.label,district.id);
    else facadeSign(game,house,district.label.split(' · ')[0]);
    buildings.push({id,label:district.label,kind:'house',group:house,district:district.id});
  }
  // Move well away from portal and keep its gameplay collision with the visual.
  moveOldWell(game);
  placeTownNPC(game,'olaf',-6,70);
  placeTownNPC(game,'bjorn',4,68);
  const portal=buildPortal(game);
  const paths=makePaths(game);
  const pier=buildPier(game);
  applyFeatureLayoutP195(game,portal,'p194:portal');
  applyFeatureLayoutP195(game,pier,'p194:pier',true);
  // Preserve P192 mission IDs, inventory gates and profession/trainer mapping.
  const districts=Object.fromEntries(P194_DISTRICTS.map(d=>[d.id,d]));
  const sites=game.p192Hamlets.sites;
  for(const [id,site] of sites){
    const district=districts[P194_SITE_TO_DISTRICT[id]];
    if(!district)continue;
    const saved=game.worldLayoutP193?.hubs?.[id];
    const sx=Number.isFinite(saved?.x)?saved.x:district.x;
    const sz=Number.isFinite(saved?.z)?saved.z:district.z;
    const pos={x:sx,z:sz,y:game.terrain.getHeight(sx,sz)};
    site.pos=pos;
    site.hub={...site.hub,name:P194_SITE_NAMES[id]};
    site.houses=[null,null]; // no outer or duplicate hamlet house spawns
    site.status='centralised_p194';
    site.trainers=new Set();
  }
  let spawned=0;
  for(const trainer of INICIOS_TRAINERS_P186){
    if(trainer.id==='sigrid')continue;
    const pref=P194_TRAINER_SPOTS[trainer.id];
    const saved=entityForP193(game,'npc:'+trainer.id);
    // Fisher lives by the REAL pier when a safe shoreline has been found.
    const preferred=(trainer.id==='master_fisher'&&pier)?
      [pier.position.x-4*Math.sin(pier.rotation.y),
       pier.position.z-4*Math.cos(pier.rotation.y)]:pref;
    const loc=saved?{x:saved.x,z:saved.z}:safeNPCSpot(game,...preferred);
    if(!loc)continue;
    const npc=game.npcs._makeNPC({id:trainer.id,
      name:trainer.role+' · '+P194_SITE_NAMES[trainer.hubId],
      x:loc.x,z:loc.z,model:P192_TRAINER_MODELS[trainer.id]});
    npc.p192TrainerId=trainer.id;
    npc.p192HubId=trainer.hubId;
    if(saved){npc.group.rotation.y=saved.rotation;npc.yaw=saved.rotation;
      npc.group.scale.setScalar(saved.scale);npc.group.visible=!saved.hidden;}
    game.npcs.list.push(npc);
    sites.get(trainer.hubId)?.trainers.add(trainer.id);
    spawned++;
  }
  game.p194CentralTown={
    version:194,buildings,portal,pier,paths,trainerCount:spawned,
    outlyingHouses:0,
    features:[{id:'p194:portal',label:'Monumento · portal central',kind:'model',group:portal},
      ...(pier?[{id:'p194:pier',label:'Muelle de pesca · costa real',kind:'model',group:pier}]:[])]
  };
  if(game.p196Build){
    installLivingTownP196(game);
    game.p194CentralTown.features.push(...installTownLanternsP196(game));
  }
  return game.p194CentralTown;
}
