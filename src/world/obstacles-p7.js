/** P7 fixed-grid nature collision, registered from actual instanced placements. */
export class NatureObstaclesP7 {
 constructor(cellSize=12){this.cellSize=cellSize;this.cells=new Map();this.count=0;}
 cell(x,z){return Math.floor(x/this.cellSize)+','+Math.floor(z/this.cellSize);}
 register(x,z,r,minY=-Infinity,maxY=Infinity,kind='obstacle'){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(r)||r<=0)return;
  const obj={x,z,r,minY,maxY,kind};this.count++;
  const a=Math.floor((x-r)/this.cellSize),b=Math.floor((x+r)/this.cellSize);
  const c=Math.floor((z-r)/this.cellSize),d=Math.floor((z+r)/this.cellSize);
  for(let ix=a;ix<=b;ix++)for(let iz=c;iz<=d;iz++){
   const key=ix+','+iz;let items=this.cells.get(key);
   if(!items){items=[];this.cells.set(key,items);}items.push(obj);
  }
 }
 query(x,z,range=1){
  const found=new Set(),out=[];
  for(let ix=Math.floor((x-range)/this.cellSize);ix<=Math.floor((x+range)/this.cellSize);ix++)
   for(let iz=Math.floor((z-range)/this.cellSize);iz<=Math.floor((z+range)/this.cellSize);iz++){
    for(const v of this.cells.get(ix+','+iz)||[])if(!found.has(v)){found.add(v);out.push(v);}
   }
  return out;
 }
 collide(position,radius=0.42,footY=null){
  const neighbors=this.query(position.x,position.z,radius+3);
  // Two passes converge when rock/tree radii overlap, without a global mesh raycast.
  for(let pass=0;pass<2;pass++)for(const o of neighbors){
   if(footY!==null && (footY>o.maxY||footY+1.4<o.minY))continue;
   const dx=position.x-o.x,dz=position.z-o.z,limit=radius+o.r;
   const dist2=dx*dx+dz*dz;
   if(dist2>=limit*limit)continue;
   if(dist2>1e-12){const scale=limit/Math.sqrt(dist2);position.x=o.x+dx*scale;position.z=o.z+dz*scale;}
   else position.x=o.x+limit;
  }
  return position;
 }
 blocked(x,y,z,pad=0){
  for(const o of this.query(x,z,pad+2)){
   if(y<o.minY||y>o.maxY)continue;
   if(Math.hypot(x-o.x,z-o.z)<o.r+pad)return true;
  }
  return false;
 }
}
