import * as THREE from 'three';
import {makeFireballVisual22} from './fireball-vfx-l22.js';
import {L22SignatureVfx} from './signature-vfx-l22.js';

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
    this.poolLimit=48;
    this.signature=new L22SignatureVfx(this);
    this.quality=1;
    this._sparkAt=0;
  }
  setQuality(n) { this.quality=Math.max(0,Math.min(2,n|0)); }
  palette(style) { return PALETTES[style]||(
    style===3?['#ff914f','#ffd069','#fff2b3']:
    style===4?['#62dfff','#b4f4ff','#ffffff']:PALETTES[0]); }
  free(ev) {
    this.game.scene.remove(ev.mesh);
    ev.mesh.traverse(obj=>{
      obj.geometry?.dispose();
      if(obj.material)for(const mat of (Array.isArray(obj.material)?obj.material:[obj.material]))mat.dispose();
    });
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
    const p=[],count=40,t=this.game.terrain,w=Math.max(.10,radius*.09);
    for(let i=0;i<count;i++){
      const a=2*Math.PI*i/count,b=2*Math.PI*(i+1)/count;
      const v=(r,angle)=>{
        const x=world.x+Math.sin(angle)*r,z=world.z+Math.cos(angle)*r;
        return [x,t.getHeight(x,z)+.20,z];
      };
      const A=v(Math.max(.12,radius-w),a),B=v(radius,a),C=v(radius,b),D=v(Math.max(.12,radius-w),b);
      p.push(...A,...B,...C,...A,...C,...D);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.84,
      side:THREE.DoubleSide,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
    const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
    return this.add(mesh,life,'terrain-ring');
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
    // Hardware WebGL linewidth is effectively 1px on most Android GPUs.
    // Use a real tubular luminous ribbon instead of invisible fine lines.
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.085,5,false);
    const mat=new THREE.MeshBasicMaterial({
      color,transparent:true,opacity:.95,side:THREE.DoubleSide,
      depthWrite:false,blending:THREE.AdditiveBlending
    });
    return this.add(new THREE.Mesh(geo,mat),life,'arc');
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
    // Do not draw fictitious curved launch lines behind straight projectiles.
    if(style!==0&&style!==3)this.arc(world,dir,2.5,p[2],.38);
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
    if(this.quality>0)this.crown(world,style,radius);
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
  tornado(world,radius=4,style=0,life=2.15){
    // Original volumetric-looking spiral, no external proprietary texture.
    // Mesh has LOCAL points, so it rotates around the real player, not world (0,0).
    const pts=[],turns=4.5,steps=90;
    for(let i=0;i<=steps;i++){
      const t=i/steps,a=turns*2*Math.PI*t;
      const r=radius*(.28+.65*t);
      pts.push(new THREE.Vector3(Math.cos(a)*r, .12+5.3*t, Math.sin(a)*r));
    }
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),steps,.13,5,false);
    const mat=new THREE.MeshBasicMaterial({color:this.palette(style)[0],transparent:true,
      opacity:.87,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.copy(world);mesh.frustumCulled=false;
    this.add(mesh,life,'tornado');
    this.orbit(world,radius*.83,style,.8);
    return mesh;
  }
  crown(world,style=0,radius=3){
    const verts=[],n=this.quality===2?14:10;
    const terrain=this.game.terrain;
    const at=(theta,r,height)=>{
      const x=world.x+Math.cos(theta)*r,z=world.z+Math.sin(theta)*r;
      return [x,terrain.getHeight(x,z)+height,z];
    };
    for(let i=0;i<n;i++){
      const a=i*2*Math.PI/n,b=(i+.5)*2*Math.PI/n,c=(i+1)*2*Math.PI/n;
      verts.push(...at(a,radius*.45,.20),
        ...at(b,radius*.8,1.0+radius*.2),...at(c,radius*.45,.20));
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    const m=new THREE.MeshBasicMaterial({color:this.palette(style)[1],
      transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,
      blending:THREE.AdditiveBlending});
    const obj=new THREE.Mesh(g,m);obj.frustumCulled=false;
    return this.add(obj,.28,'crown');
  }
  energyBolt(style=3){
    // L22: actual MIT-port fireball structure, not an isolated prototype sphere.
    if(style===3)return makeFireballVisual22();
    if(style===0)return makeFireballVisual22('violet');
    // Original GLSL animated plasma. No copyrighted textures/audio/mesh.
    const palette=this.palette(style);
    const mat=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},
        uCore:{value:new THREE.Color(palette[2])},uEdge:{value:new THREE.Color(palette[0])}},
      vertexShader:`
        varying vec3 vN;varying vec3 vE;varying vec3 vP;
        void main(){
          vec4 eye=modelViewMatrix*vec4(position,1.);
          vN=normalize(normalMatrix*normal);
          vE=normalize(-eye.xyz);
          vP=position;
          gl_Position=projectionMatrix*eye;
        }`,
      fragmentShader:`
        uniform float uTime;uniform vec3 uCore,uEdge;
        varying vec3 vN;varying vec3 vE;varying vec3 vP;
        void main(){
          float plasma=sin(vP.y*21.+uTime*14.)*
                       sin(vP.x*17.-uTime*12.)*
                       cos(vP.z*19.+uTime*9.);
          float rim=pow(1.-abs(dot(normalize(vN),normalize(vE))),2.);
          vec3 color=mix(uCore,uEdge,clamp(.35+.35*plasma+.5*rim,0.,1.));
          gl_FragColor=vec4(color*1.35,clamp(.84+.14*plasma+.15*rim,.55,1.));
        }`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
    });
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),mat);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.51,12,8),
      new THREE.MeshBasicMaterial({color:palette[0],transparent:true,opacity:.16,
        depthWrite:false,blending:THREE.AdditiveBlending}));
    orb.add(halo);
    return orb;
  }
  landingMarker(world,radius=2.45,life=1.12,style=0){
    const c=this.palette(style);
    this.ring(world,radius,c[1],life);
    this.ring(world,radius*.6,c[0],life);
    this.sparks(world.clone().add(new THREE.Vector3(0,.09,0)),c[0],17,1,.52,.11);
  }
  fallingMeteor(world,life=.75){
    const geo=new THREE.IcosahedronGeometry(.95,1);
    const mat=new THREE.MeshBasicMaterial({color:0xff9448,transparent:true,opacity:1,depthWrite:false});
    const meteor=new THREE.Mesh(geo,mat);
    const landingY=world.y+.9;
    meteor.position.set(world.x,landingY+11.5,world.z);
    this.add(meteor,life,'meteor');
    const ev=this.active[this.active.length-1];
    ev.landingY=landingY;
    ev.fallHeight=11.5;
    this.orbit(world,3,3,.7);
    return meteor;
  }
  // P16 original particle/mesh effects: no copied animations or textures.
  pulse(world,radius,color,life=.5){
    const mesh=this.ring(world,radius,color,life);
    mesh.scale.setScalar(.18);
    return mesh;
  }
  orbit(world,radius,style=0,life=.6){
    const c=this.palette(style),count=this.quality===0?8:this.quality===1?12:20;
    const pts=[];
    for(let i=0;i<=count*3;i++){
      const t=i/(count*3),a=t*Math.PI*6,r=radius*(.2+t*.8);
      pts.push(new THREE.Vector3(
        world.x+Math.cos(a)*r,
        world.y+.4+(1-t)*2.25,
        world.z+Math.sin(a)*r));
    }
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),count*3,.06,5,false);
    const mat=new THREE.MeshBasicMaterial({color:c[0],transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending});
    this.add(new THREE.Mesh(geo,mat),life,'arc');
  }
  ascend(world,dir){
    this.launch(world,dir,0);
    this.orbit(world,2.1,0,.66);
    this.sparks(world.clone().add(new THREE.Vector3(0,2,0)),'#e9b9ff',38,3.2,.65,.2);
  }
  landing(world,style=0,radius=2.45){
    this.impact(world,style,radius);
    this.pulse(world,radius*1.4,this.palette(style)[2],.63);
    this.orbit(world,Math.min(radius,2),style,.52);
    this.sparks(world.clone().add(new THREE.Vector3(0,.18,0)),this.palette(style)[1],55,5.5,.7,.22);
    this.game.player.addShake?.(.18);
  }
  projectileGlow(world,style=3){
    const color=this.palette(style)[0];
    const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));
    mesh.position.copy(world);
    return this.add(mesh,.46,'spark');
  }
  meteorWarning(world,radius){
    this.pulse(world,radius,'#ffb46d',.8);
    this.ring(world,radius*.76,'#ff6334',.75);
    this.sparks(world.clone().add(new THREE.Vector3(0,.2,0)),'#ffb56c',30,2,.6,.14);
  }
  meteorImpact(world,radius=4.15){
    this.landing(world,1,radius);
    for(let i=0;i<(this.quality===0?3:7);i++){
      const a=i*Math.PI*2/7;
      const spot=world.clone().add(new THREE.Vector3(Math.sin(a)*radius*.75,.8,Math.cos(a)*radius*.75));
      this.sparks(spot,'#ffb363',12,4.7,.62,.19);
    }
    this.pulse(world,radius*1.2,'#ffe7ad',.8);
  }
  frostNova(world,radius=5){
    this.pulse(world,radius,'#83e4ff',.72);
    this.ring(world,radius*.7,'#d2f9ff',.55);
    this.ring(world,radius*.38,'#b1cbff',.42);
    const num=this.quality===0?6:12;
    for(let i=0;i<num;i++){
      const a=i*2*Math.PI/num;
      const x=world.x+Math.cos(a)*radius*.78,z=world.z+Math.sin(a)*radius*.78;
      this.sparks(new THREE.Vector3(x,world.y+.65,z),'#94f0ff',8,1.8,.85,.20);
    }
  }
  backstab(world,dir){
    this.arc(world,dir,3.6,'#77e6ff',.4,.12);
    this.arc(world.clone().add(new THREE.Vector3(0,.4,0)),dir,2.8,'#f2faff',.27);
    this.sparks(world.clone().add(new THREE.Vector3(0,1.1,0)),'#89eaff',28,4,.36,.12);
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
      if(a.kind==='terrain-ring'||a.kind==='crown')a.mesh.material.opacity=(1-t)*.84;
      if(a.kind==='ring'){
        const scale=.25+t*1.5;
        a.mesh.scale.setScalar(scale);
        a.mesh.rotation.z+=dt*.32;
      }
      if(a.kind==='l26-ice-rise')a.mesh.scale.y=.06+.94*Math.min(1,t/.34);
      if(a.kind==='l26-skyshaft')a.mesh.scale.y=.08+.92*Math.min(1,t/.70);
      if(a.kind==='tornado'){a.mesh.rotation.y+=dt*3.6;}
      if(a.kind==='meteor'){
        a.mesh.position.y=a.landingY+a.fallHeight*Math.pow(1-t,1.35);
        a.mesh.rotation.y+=dt*2.7;
        a.mesh.scale.setScalar(.75+t*.58);
      }
    }
  }
}
