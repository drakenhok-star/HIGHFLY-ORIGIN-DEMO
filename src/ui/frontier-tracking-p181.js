/**
 * P18.1 FRONTIER TARGETS
 * Pure spatial view model, no mutable Three.js vectors, no new game entities.
 * A mission has TWO distinctive patrol locations, not a reused normal-wolf dot.
 */
export const FRONTIER_ZONES_P181 = Object.freeze([
  Object.freeze({id:'wolf_edge_east_01',label:'Lobo centinela · ESTE',x:110,z:95}),
  Object.freeze({id:'wolf_edge_west_01',label:'Lobo centinela · OESTE',x:-112,z:76})
]);
export const FRONTIER_QUEST_ID_P181='p18_frontier';
const point=(obj,x,z)=>({id:obj.id,label:obj.label,x,z,type:'sentinel'});

/**
 * Prefer live alpha position, then any live patrol member, and finally the
 * known zone anchor so the radar never goes blank during 115s respawn.
 */
export function frontierTargetsP181(packs=[]){
  const parts=Array.isArray(packs)?packs:[];
  return FRONTIER_ZONES_P181.map(zone=>{
    const pack=parts.find(p=>p?.p18&&p.regionId===zone.id);
    const alive=(pack?.members||[]).filter(e=>e?.alive && !e.removed);
    const target=alive.find(e=>e.p18Role==='alpha')||alive[0];
    const x=target?.group?.position?.x??pack?.home?.x??zone.x;
    const z=target?.group?.position?.z??pack?.home?.z??zone.z;
    return point(zone,x,z);
  });
}
/** The normal q1 wolves and ice wolves are NEVER frontend targets here. */
export function frontierQuestTargetsP181(game){
  if(!game?.p18Enabled)return [];
  const status=game.livingWorld?.quest?.status;
  if(status==='active')return frontierTargetsP181(game.enemies?.packs);
  if(status==='complete'){
    const bjorn=game.npcs?.list?.find(n=>n.id==='bjorn');
    if(!bjorn)return [];
    const p=bjorn.group?.position||bjorn.pos;
    return [{id:'bjorn_return',label:'Entregar misión · Bjorn',x:p.x,z:p.z,type:'turnin'}];
  }
  return [];
}
export function nearestFrontierTargetP181(game){
  const targets=frontierQuestTargetsP181(game);
  const p=game?.player?.pos;
  if(!p||!targets.length)return null;
  let best=null,min=Infinity;
  for(const t of targets){
    const d=(p.x-t.x)**2+(p.z-t.z)**2;
    if(d<min){min=d;best=t;}
  }
  return best;
}
