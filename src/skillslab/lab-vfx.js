import * as THREE from 'three';

// Fully original shader-free Three.js VFX, specifically for the Tianjie WebGL
// renderer. Uses the existing particle emitter and owns/disposes added meshes.
// No MLBB assets, no Unity shaders, no commercial external media.
const PALETTES = [
  ['#9b66ff','#ff8bea','#f6ecff'],
  ['#f3406c','#ff9950','#ffe3c8'],
  ['#eec775','#ffe6a1','#fff8dd']
];

export class TianjieSkillVfx {
  constructor(game) {
    this.game=game;
    this.active=[];
    this.poolLimit=28;
    this.quality=1;
    this._sparkAt=0;
  }
  setQuality(n) { this.quality=Math.max(0,Math.min(2,n|0)); }
  palette(style) { return PALETTES[style]||PALETTES[0]; }
  free(ev) {
    this.game.scene.remove(ev.mesh);
    ev.mesh.geometry?.dispose();
    ev.mesh.material?.dispose();
  }
  add(mesh, life, kind='ring', rot=0) {
    if(this.active.length>=this.poolLimit) {
      const ev=this.active.shift();
      this.free(ev);
    }
    this.game.scene.add(mesh);
    this.active.push({mesh,life,remain:life,kind,rot});
    return mesh;
  }
  ring(world,radius,color,life=.46) {
    const geo=new THREE.RingGeometry(Math.max(.1,radius*.88),Math.max(.13,radius),40);
    const mat=new THREE.MeshBasicMaterial({
      color,transparent:true,opacity:.85,side:THREE.DoubleSide,
      depthWrite:false,blending:THREE.AdditiveBlending
    });
    const ring=new THREE.Mesh(geo,mat);
    ring.rotation.x=-Math.PI/2;
    ring.position.copy(world);ring.position.y+=.11;
    ring.scale.setScalar(.25);
    return this.add(ring,life);
  }
  arc(origin,dir,length,color,life=.35,offset=0) {
    const n=20;
    const orth=new THREE.Vector3(-dir.z,0,dir.x);
    const pts=[];
    for(let i=0;i<=n;i++){
      const t=i/n, spread=Math.sin(Math.PI*t);
      pts.push(new THREE.Vector3(
        origin.x+dir.x*(.55+t*length)+orth.x*(t-.5)*length*.46,
        origin.y+.6+spread*1.35+offset,
        origin.z+dir.z*(.55+t*length)+orth.z*(t-.5)*length*.46));
    }
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const mat=new THREE.LineBasicMaterial({
      color,linewidth:2,transparent:true,opacity:1,
      depthWrite:false,blending:THREE.AdditiveBlending
    });
    return this.add(new THREE.Line(geo,mat),life,'arc');
  }
  sparks(world,color,count=16,velocity=3,life=.52,size=.12){
    if(this.quality===0)count=Math.min(count,11);
    else if(this.quality===1)count=Math.min(count,24);
    this.game.effects.spawnBurst(world,color,count,velocity,life,size);
  }
  launch(world,dir,style){
    const p=this.palette(style);
    this.ring(world,1.7,p[0],.4);
    this.ring(world,2.6,p[1],.65);
    this.arc(world,dir,2.5,p[2],.38);
    this.sparks(world.clone().add(new THREE.Vector3(0,1,0)),p[0],28,3.2,.55);
  }
  projectile(world,style){
    const p=this.palette(style);
    if(this.game.time.elapsed-this._sparkAt< (this.quality===0?.15:.06))return;
    this._sparkAt=this.game.time.elapsed;
    this.sparks(world,p[0],this.quality===0?3:8,1.5,.26,.10);
  }
  impact(world,style,radius=2){
    const p=this.palette(style);
    this.ring(world,radius,p[0],.52);
    this.ring(world,radius*.72,p[1],.38);
    this.sparks(world.clone().add(new THREE.Vector3(0,.7,0)),p[2],42,4.4,.5,.19);
    this.game.player.addShake?.(.10);
  }
  slash(world,dir,style){
    const p=this.palette(style);
    this.arc(world,dir,4.1,p[0],.44);
    this.arc(world.clone().add(new THREE.Vector3(0,.24,0)),dir,3.4,p[1],.3);
    this.sparks(world.clone().add(dir.clone().multiplyScalar(2.7)).add(new THREE.Vector3(0,1,0)),p[2],22,3.5,.43,.13);
  }
  tick(world,style,index,total=11){
    const p=this.palette(style);
    const a=index*2.39996323;
    const r=1.3+(index%4)*.5;
    const pos=world.clone().add(new THREE.Vector3(Math.sin(a)*r,.85+(index%3)*.38,Math.cos(a)*r));
    this.sparks(pos,p[index%2],index===total-1?40:20,3.6,.39,.13);
    if(index===0||index===4||index===8)this.ring(world,3.9,p[1],.4);
    if(index===total-1)this.impact(world,style,4.5);
  }
  vortex(world,radius,style=2){
    const p=this.palette(style);
    for(let i=0;i<(this.quality===0?2:4);i++){
      this.ring(world,radius*(1-i*.18),i%2?p[1]:p[0],.55+i*.1);
    }
    this.sparks(world.clone().add(new THREE.Vector3(0,.55,0)),p[2],38,1.8,.7,.16);
  }
  update(dt){
    for(let i=this.active.length-1;i>=0;i--){
      const a=this.active[i];
      a.remain-=dt;
      if(a.remain<=0){
        this.active.splice(i,1);
        this.free(a);
        continue;
      }
      const t=1-a.remain/a.life;
      a.mesh.material.opacity=Math.min(1,(1-t)*1.2);
      if(a.kind==='ring'){
        const scale=.25+t*1.5;
        a.mesh.scale.setScalar(scale);
        a.mesh.rotation.z+=dt*.32;
      }
    }
  }
}
