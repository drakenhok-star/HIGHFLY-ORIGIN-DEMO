/**
 * World Forge P196 authoring handles only.
 * Rings are editor gizmos, NOT substitute models. The actual mobs use their
 * original assets, AI, drops and respawn in the game preview.
 */
import * as THREE from 'three';
import {WILDERNESS_SPOTS_P196} from '../world/wilderness-spots-p196.js';
import {entityForP193} from '../world/world-layout-p193.js';
export function installEditorSpawnHandlesP196(game){
 if(!game.p193EditorMode||!game.p196Build)return [];
 if(game.p196SpotMarkers)return game.p196SpotMarkers;
 const result=[],mat=new THREE.MeshBasicMaterial({color:0xffae56,transparent:true,
   opacity:.75,depthWrite:false,side:THREE.DoubleSide});
 const geo=new THREE.TorusGeometry(7,.18,5,36);
 for(const spec of WILDERNESS_SPOTS_P196){
  const saved=entityForP193(game,'p196:spot:'+spec.id);
  const actual=game.enemies.p196Spots?.find(p=>p.id===spec.id)?.center;
  const x=saved?.x??actual?.x??spec.x,z=saved?.z??actual?.z??spec.z;
  const group=new THREE.Group();
  group.position.set(x,game.terrain.getHeight(x,z)+.3,z);
  const ring=new THREE.Mesh(geo,mat);ring.rotation.x=-Math.PI/2;group.add(ring);
  const pin=new THREE.Mesh(new THREE.ConeGeometry(.65,2.2,6),
    new THREE.MeshBasicMaterial({color:0xffba70}));
  pin.position.y=1.9;group.add(pin);
  group.userData.p196SpotId=spec.id;
  game.scene.add(group);
  result.push({id:'p196:spot:'+spec.id,label:'SPOT 5 · '+spec.label,
    kind:'model',group,source:spec});
 }
 game.p196SpotMarkers=result;
 return result;
}
