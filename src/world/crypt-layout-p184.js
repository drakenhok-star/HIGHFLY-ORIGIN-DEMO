/**
 * HIGHFLY P18.4 — premium crypt blueprint (DATA ONLY, NOT YET PLAYABLE).
 * This pure, MIT-compatible module defines the layout once for rendering,
 * navigation, doors, collisions, enemy encounters and quest checkpoints.
 * It creates NO placeholder meshes, downloads NO assets and changes NO game.
 * Existing visuals must be mapped to individually CC0-verified KayKit pieces.
 */
export const P184_LAYOUT_VERSION=1;
export const P184_CRYPTOGRAPHY_UNUSED=true; // not a security boundary
export const P184_WALL_HEIGHT=4.5;
export const P184_WALL_THICKNESS=.55;

const room=(id,label,x,z,w,d,kind,encounters,feature=null)=>
  Object.freeze({id,label,x,z,width:w,depth:d,kind,
    encounterSlots:Object.freeze(encounters.map(e=>Object.freeze(e))),
    feature});
export const P184_CRYPT_ROOMS=Object.freeze([
  room('entrance','Vestíbulo olvidado',0,0,14,12,'entrance',[],'return_portal'),
  room('gallery','Galería de los guardianes',0,-17,14,22,'combat',[
    {species:'draugr_warrior',dx:-3,dz:0},{species:'draugr_warrior',dx:3,dz:-5},
    {species:'draugr_mage',dx:1,dz:-9}
  ]),
  room('ritual','Santuario del sello',-17,-17,20,22,'puzzle',[
    {species:'draugr_mage',dx:-3,dz:2}
  ],'sigil'),
  room('ante','Antecámara de los caídos',0,-39,14,22,'combat',[
    {species:'draugr_warrior',dx:-3,dz:0},{species:'draugr_mage',dx:3,dz:-7}
  ],'checkpoint'),
  room('boss','Trono del guardián',0,-61,24,22,'boss',[
    {species:'draugr_boss',dx:0,dz:-5}
  ],'boss_reward_and_exit')
]);
const door=(id,from,to,axis,at,center,width,gate)=>
  Object.freeze({id,from,to,axis,at,center,width,gate});
export const P184_CRYPT_DOORS=Object.freeze([
  door('door_entry','entrance','gallery','z',-6,0,3.2,'open'),
  door('door_ritual','gallery','ritual','x',-7,-17,3.2,'gallery_clear'),
  door('door_ante','gallery','ante','z',-28,0,3.2,'gallery_clear'),
  door('door_boss','ante','boss','z',-50,0,3.2,'sigil')
]);
export const P184_APPROVED_VISUAL_KEYS=Object.freeze({
  // Future verified KayKit Dungeon Remastered / Halloween Bits inventory.
  // Intentionally absent to prohibit geometry stand-ins.
  walls:null,floor:null,door:null,columns:null,decor:null,chest:null
});
export function p184HasVisuals(availableKeys){
  if(!Array.isArray(availableKeys))return false;
  return Object.values(P184_APPROVED_VISUAL_KEYS)
    .every(v=>typeof v==='string'&&v.length>0&&availableKeys.includes(v));
}
export function p184RoomById(id){return P184_CRYPT_ROOMS.find(r=>r.id===id)||null;}
export function p184RoomContains(room,x,z){
  return !!room&&Number.isFinite(x)&&Number.isFinite(z)&&
    x>=room.x-room.width/2&&x<=room.x+room.width/2&&
    z>=room.z-room.depth/2&&z<=room.z+room.depth/2;
}
const near=(a,b)=>Math.abs(a-b)<1e-5;
const round=(n)=>Math.round(n*10000)/10000;
/**
 * Derive wall colliders directly from the SAME rooms/doors used by rendering.
 * Door gaps never collide with a wall, and shared walls are deduplicated.
 * Output is DATA (axis-aligned wall intervals), not Three.js meshes.
 */
export function p184WallSegments(){
  const lines=[];
  const roomEdge=(r,axis,at,min,max)=>{
    const openings=P184_CRYPT_DOORS.filter(d=>d.axis===axis&&near(d.at,at)&&
      (d.from===r.id||d.to===r.id)&&d.center>=min&&d.center<=max)
      .map(d=>[Math.max(min,d.center-d.width/2),Math.min(max,d.center+d.width/2)])
      .sort((a,b)=>a[0]-b[0]);
    let from=min;
    for(const [left,right] of openings){
      if(left>from)lines.push({axis,at:round(at),min:round(from),max:round(left)});
      from=Math.max(from,right);
    }
    if(max>from)lines.push({axis,at:round(at),min:round(from),max:round(max)});
  };
  for(const r of P184_CRYPT_ROOMS){
    const x0=r.x-r.width/2,x1=r.x+r.width/2;
    const z0=r.z-r.depth/2,z1=r.z+r.depth/2;
    roomEdge(r,'z',z0,x0,x1);roomEdge(r,'z',z1,x0,x1);
    roomEdge(r,'x',x0,z0,z1);roomEdge(r,'x',x1,z0,z1);
  }
  const seen=new Set();
  return lines.filter(seg=>{
    const key=[seg.axis,seg.at,seg.min,seg.max].join(':');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}
export function p184CollisionBoxes(){
  return p184WallSegments().map(s=>s.axis==='z'
    ? Object.freeze({cx:(s.min+s.max)/2,cz:s.at,
      w:s.max-s.min,d:P184_WALL_THICKNESS,h:P184_WALL_HEIGHT})
    : Object.freeze({cx:s.at,cz:(s.min+s.max)/2,
      w:P184_WALL_THICKNESS,d:s.max-s.min,h:P184_WALL_HEIGHT}));
}
export function createCryptRunP184(difficulty='normal',seed=1337){
  if(!['normal','heroic'].includes(difficulty))throw new TypeError('Unknown difficulty');
  return {schemaVersion:P184_LAYOUT_VERSION,difficulty,seed,
    clearedRooms:[],sigil:false,bossDefeated:false,rewardClaimed:false,
    visitedRooms:['entrance']};
}
export function p184DoorUnlocked(run,id){
  const door=P184_CRYPT_DOORS.find(x=>x.id===id);
  if(!run||!door)return false;
  if(door.gate==='open')return true;
  if(door.gate==='gallery_clear')return run.clearedRooms.includes('gallery');
  if(door.gate==='sigil')return run.sigil===true && run.clearedRooms.includes('ante');
  return false;
}
/** Pure transition: invalid or repeated rewards cannot advance the run. */
export function p184ApplyEvent(run,event){
  if(!run||run.schemaVersion!==P184_LAYOUT_VERSION||!event)return run;
  const copy={...run,clearedRooms:[...run.clearedRooms],visitedRooms:[...run.visitedRooms]};
  if(event.type==='clear_room'&&p184RoomById(event.roomId)&&
      ['gallery','ritual','ante'].includes(event.roomId)){
    if(!copy.clearedRooms.includes(event.roomId))copy.clearedRooms.push(event.roomId);
  } else if(event.type==='pickup_sigil'&&copy.clearedRooms.includes('ritual')&&
      p184DoorUnlocked(copy,'door_ritual')){
    copy.sigil=true;
  } else if(event.type==='boss_defeated'&&p184DoorUnlocked(copy,'door_boss')){
    copy.bossDefeated=true;
  } else if(event.type==='claim_reward'&&copy.bossDefeated){
    copy.rewardClaimed=true; // consumer must award only on false -> true
  } else if(event.type==='visit_room'&&p184RoomById(event.roomId) &&
      !copy.visitedRooms.includes(event.roomId)){
    copy.visitedRooms.push(event.roomId);
  }
  return copy;
}
