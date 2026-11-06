import * as THREE from 'three';
import {entityForP193} from './world-layout-p193.js';

/**
 * HIGHFLY P196 - bilingual-friendly sign and landmark lighting, all authored
 * procedurally in the game. No unverified external pack textures or GLBs.
 * Stores world transforms using the same P193 layout contract as the editor.
 */
export const TOWN_LANTERN_COORDS_P196=Object.freeze([
 {id:'plaza_n',x:-8,z:53},{id:'plaza_s',x:8,z:29},
 {id:'tavern',x:-26,z:69},{id:'smithy',x:21,z:61},
 {id:'market',x:25,z:46},{id:'workshop',x:-33,z:40},
 {id:'botica',x:-24,z:19},{id:'arcane',x:25,z:22},
 {id:'textile',x:4,z:6},{id:'north_gate',x:-3,z:65},
 {id:'south_path',x:15,z:3}
]);
const icons={communal:'◆',tavern:'✦',workshop:'⚒',olaf:'⌂',
 market:'✦',smithy:'⚒',apothecary:'✧',arcane:'✧',textile:'◆'};
function signTexture(label,district){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const c=canvas.getContext('2d');
 const grad=c.createLinearGradient(0,0,0,256);
 grad.addColorStop(0,'#433324');grad.addColorStop(.55,'#2a211d');grad.addColorStop(1,'#181d22');
 c.fillStyle=grad;c.fillRect(0,0,1024,256);
 c.strokeStyle='#e7bf73';c.lineWidth=14;c.strokeRect(12,13,1000,230);
 c.strokeStyle='#70503b';c.lineWidth=5;c.strokeRect(27,27,970,202);
 c.fillStyle='#f5d69b';c.textBaseline='middle';
 c.font='bold 70px sans-serif';c.textAlign='center';
 const name=String(label).split(' · ')[0].toLocaleUpperCase('es-AR').slice(0,36);
 c.fillText(name,565,129,820);
 c.font='bold 96px sans-serif';c.fillText(icons[district]||'◆',92,127,110);
 for(const x of [30,994])for(const y of [30,226]){
  c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fillStyle='#b69b64';c.fill();
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=4;
 return texture;
}
export function premiumSignP196(house,label,district){
 // Billboard rotates only visually toward camera; stays anchored to editable
 // house transform, unlike flat roof labels that vanish from bird's-eye view.
 const tex=signTexture(label,district);
 const mat=new THREE.SpriteMaterial({map:tex,depthTest:true,depthWrite:false,
  transparent:true,color:0xffffff});
 const sprite=new THREE.Sprite(mat);
 sprite.name='HIGHFLY_P196_SIGN_'+district;
 sprite.position.set(0,6.6,0);
 sprite.scale.set(8.8,2.2,1);
 house.add(sprite);
 return sprite;
}
const allowed=(g,x,z)=>{
 const t=g.terrain;
 if(Math.hypot(x,z-40)>69)return false;
 if(t.getHeight(x,z)<=t.waterY+2||t.getSlope(x,z)>.55)return false;
 return !g.structures.colliders.some(c=>Math.hypot(c.x-x,c.z-z)<2.3);
};
export function installTownLanternsP196(game){
 const posts=[],wood=new THREE.MeshStandardMaterial({color:0x624330,roughness:1}),
 metal=new THREE.MeshStandardMaterial({color:0x756d5b,metalness:.45,roughness:.55}),
 flame=new THREE.MeshStandardMaterial({color:0xffcf76,emissive:0xffa53b,
  emissiveIntensity:2.8,roughness:.4});
 const poleG=new THREE.CylinderGeometry(.14,.20,3.05,6),
  capG=new THREE.ConeGeometry(.60,.54,6),
  glowG=new THREE.OctahedronGeometry(.39,0);
 for(const [i,a] of TOWN_LANTERN_COORDS_P196.entries()){
  if(!allowed(game,a.x,a.z))continue;
  const id='p196:lantern:'+a.id;
  const saved=entityForP193(game,id);
  const x=saved?.x??a.x,z=saved?.z??a.z;
  if(!allowed(game,x,z))continue;
  const group=new THREE.Group();group.position.set(x,game.terrain.getHeight(x,z),z);
  const pole=new THREE.Mesh(poleG,wood);pole.position.y=1.53;group.add(pole);
  const collar=new THREE.Mesh(capG,metal);collar.position.y=3.40;group.add(collar);
  const crystal=new THREE.Mesh(glowG,flame);crystal.position.y=3.16;group.add(crystal);
  if(i%3===0){
    const light=new THREE.PointLight(0xffc07a,8.5,20,2);
    light.position.set(0,3.25,0);light.castShadow=false;
    group.add(light);
  }
  if(saved){group.rotation.y=saved.rotation;group.scale.setScalar(saved.scale);
   group.visible=!saved.hidden;}
  game.structures.root.add(group);
  posts.push({id,label:'Antorcha · '+a.id,kind:'model',group});
 }
 return posts;
}
