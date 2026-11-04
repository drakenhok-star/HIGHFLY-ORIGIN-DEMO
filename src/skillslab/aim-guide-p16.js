import * as THREE from 'three';
import { hasLineOfSight, insideBlockingObject } from '../combat/targeting-p6.js';

// HIGHFLY gameplay telegraphs. These numbers are P16 HIGHFLY design values,
// not values or visual content copied from Mobile Legends/ClaudeCraft.
const p=(kind,range,width,radius,halfAngle=0)=>Object.freeze({kind,range,width,radius,halfAngle});
export const AIM_PROFILES=Object.freeze([
  [p('line',17,1.7,0),p('zone',7.4,.18,2.45),p('self',0,0,4.0)],
  [p('cone',6.7,0,0,47),p('dash',6.2,2.9,0),p('line',10,3.4,0)],
  [p('cone',7,0,0,57),p('dash',5.9,3.3,0),p('self',0,0,4.8)],
  [p('line',22,1.5,0),p('zone',20,.18,4.15),p('self',0,0,5.0)],
  [p('cone',3.35,0,0,34),p('cone',3.25,0,0,40),p('dash',8,2.65,0)]
]);
const COLORS=[0xbb79ff,0xff648c,0xffd487,0xff904f,0x71e1fe];
const mats=(color,opacity=.32)=>new THREE.MeshBasicMaterial({
  color,transparent:true,opacity,depthWrite:false,depthTest:true,
  side:THREE.DoubleSide,blending:THREE.AdditiveBlending
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export class TianjieAimGuide {
  constructor(game){
    this.game=game;
    this.root=new THREE.Group();
    this.path=new THREE.Group();
    this.game.scene.add(this.root,this.path);
    this.root.visible=false;this.path.visible=false;
    this.profile=null;this.shape=null;this.valid=true;
    this.lastArcPoint=null;this.arc=null;
    this.mainColor=COLORS[0];
    this.state=null;
  }
  mesh(geo,color,opacity=.3,parent=this.root){
    const node=new THREE.Mesh(geo,mats(color,opacity));
    node.renderOrder=9;node.frustumCulled=false;
    parent.add(node);
    return node;
  }
  box(x,y,z,w,h,len,color,opacity=.68,parent=this.root){
    const node=this.mesh(new THREE.BoxGeometry(w,h,len),color,opacity,parent);
    node.position.set(x,y,z);
    return node;
  }
  ring(radius,color,opacity=.92,y=.065,parent=this.root){
    const node=this.mesh(new THREE.TorusGeometry(radius,.095,6,68),color,opacity,parent);
    node.rotation.x=Math.PI/2;node.position.y=y;
    return node;
  }
  disk(radius,color,opacity=.23,parent=this.root){
    const node=this.mesh(new THREE.CylinderGeometry(radius,radius,.028,64),color,opacity,parent);
    node.position.y=.037;
    return node;
  }
  sector(len,halfAngle,color){
    const N=36,positions=[];
    const angle=halfAngle*Math.PI/180;
    for(let i=0;i<N;i++){
      const a=-angle+2*angle*(i/N),b=-angle+2*angle*((i+1)/N);
      positions.push(0,.035,0,Math.sin(a)*len,.035,-Math.cos(a)*len,
        Math.sin(b)*len,.035,-Math.cos(b)*len);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.computeVertexNormals();
    this.mesh(geo,color,.21);
    for(const sign of [-1,1]){
      const a=sign*angle;
      this.box(Math.sin(a)*len*.5,.065,-Math.cos(a)*len*.5,
        .13,.033,len,color,.94).rotation.y=-a;
    }
    const arc=[];
    for(let i=0;i<=40;i++){
      const a=-angle+2*angle*i/40;
      arc.push(v(Math.sin(a)*len,.06,-Math.cos(a)*len));
    }
    this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc),48,.072,5,false),
      color,.92);
  }
  chevron(z,size,color){
    const points=[
      -size,.08,z+size*.52,
      0,.08,z-size*.38,
      size,.08,z+size*.52,
    ];
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    geo.computeVertexNormals();
    this.mesh(geo,color,.83);
  }
  corridor(len,width,color,isDash=false){
    this.box(0,.039,-len/2,width,.026,len,color,isDash?.28:.20);
    for(const side of [-1,1])this.box(side*width/2,.066,-len/2,
      .14,.035,len,color,.96);
    this.box(0,.07,-len,width+.2,.04,.17,color,.95);
    this.ring(Math.min(1.1,width*.52),color,.8);
    for(let dist=1.25;dist<len-0.5;dist+=isDash?1.5:2.1){
      this.chevron(-dist,Math.min(width*.35,.7),color);
    }
  }
  clearGroup(group){
    while(group.children.length){
      const obj=group.children[0];
      group.remove(obj);
      obj.traverse(child=>{
        child.geometry?.dispose?.();
        const m=child.material;
        if(Array.isArray(m))for(const v of m)v.dispose?.();
        else m?.dispose?.();
      });
    }
  }
  begin(style,slot,override=null){
    this.clear();
    this.profile=override||AIM_PROFILES[style]?.[slot-1]||AIM_PROFILES[0][0];
    this.mainColor=COLORS[style]||COLORS[0];
    const pr=this.profile;
    switch(pr.kind){
      case 'zone':
        this.disk(pr.radius,this.mainColor,.28);
        this.ring(pr.radius,this.mainColor,1);
        this.ring(pr.radius*.7,0xf7ffff,.6,.092);
        this.ring(.45,0xfaffff,1,.112);
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          const bx=Math.sin(a)*pr.radius,bz=Math.cos(a)*pr.radius;
          this.box(bx,.11,bz,.28,.035,.12,0xfaffff,.75).rotation.y=a;
        }
        this.pathBeam=this.box(0,.065,-.5,.19,.03,1,0xf9e8ff,.7,this.path);
        this.pathBeam.position.z=-.5;
        break;
      case 'self':
        this.disk(pr.radius,this.mainColor,.23);
        this.ring(pr.radius,this.mainColor,1);
        this.ring(pr.radius*.66,this.mainColor,.58);
        this.ring(.7,0xf5ffff,.85);
        break;
      case 'cone':
        this.sector(pr.range,pr.halfAngle,this.mainColor);
        for(let d=2;d<pr.range;d+=2.1)this.chevron(-d,.55,0xe9f9ff);
        break;
      case 'line':
        this.corridor(pr.range,pr.width,this.mainColor,false);
        break;
      case 'dash':
        this.corridor(pr.range,pr.width,this.mainColor,true);
        this.ring(.9,this.mainColor,.72);
        break;
    }
    this.root.visible=true;
    this.path.visible=pr.kind==='zone';
  }
  guideOrigin(){return this.game.player.pos;}
  updateAim(direction,target=null){
    if(!this.profile)return;
    const pr=this.profile,g=this.game,origin=this.guideOrigin();
    const dir=direction?.clone()?.setY(0)?.normalize()||g.player.getForward();
    const yaw=Math.atan2(-dir.x,-dir.z);
    let center=origin.clone();
    if(pr.kind==='zone'){
      const preferred=target?.clone()||origin.clone().addScaledVector(dir,pr.range*.78);
      const diff=preferred.clone().sub(origin).setY(0);
      const length=Math.max(.3,diff.length());
      diff.multiplyScalar(Math.min(length,pr.range)/length);
      center=origin.clone().add(diff);
    }
    center.y=g.terrain?.getHeight?.(center.x,center.z)??origin.y;
    let blocked=false;
    if(pr.kind==='zone'){
      blocked=insideBlockingObject(g,center.x,center.y+1,center.z,.6)||
        !hasLineOfSight(g,
          {x:origin.x,y:origin.y+1.15,z:origin.z},
          {x:center.x,y:center.y+1.15,z:center.z});
    }else if(pr.kind==='dash'){
      const end=origin.clone().addScaledVector(dir,pr.range);
      end.y=g.terrain.getHeight(end.x,end.z);
      blocked=insideBlockingObject(g,end.x,end.y+1,end.z,.4)||
        !hasLineOfSight(g,
          {x:origin.x,y:origin.y+1,z:origin.z},
          {x:end.x,y:end.y+1,z:end.z});
    }
    this.valid=!blocked;
    this.root.position.set(center.x,center.y+.075,center.z);
    this.root.rotation.y=(pr.kind==='zone'||pr.kind==='self')?0:yaw;
    this.root.visible=true;
    if(pr.kind==='zone'){
      const dx=center.x-origin.x,dz=center.z-origin.z;
      const len=Math.hypot(dx,dz);
      this.path.position.set(origin.x,origin.y+.09,origin.z);
      this.path.rotation.y=Math.atan2(-dx,-dz);
      this.pathBeam.position.z=-len/2;
      this.pathBeam.scale.z=len;
      if(this.lastArcPoint?.distanceToSquared(center)>.18 || !this.arc){
        if(this.arc){
          this.path.remove(this.arc);
          this.arc.geometry.dispose();this.arc.material.dispose();
        }
        const peak=pr.range<=9?2.35:4.8;
        const curve=new THREE.QuadraticBezierCurve3(
          v(0,.2,0),v(0,peak,-len*.48),v(0,.18,-len));
        this.arc=this.mesh(new THREE.TubeGeometry(curve,23,.085,6,false),
          this.mainColor,.83,this.path);
        this.lastArcPoint=center.clone();
      }
    }
    const displayedColor=this.valid?this.mainColor:0xff435f;
    for(const node of this.root.children){
      if(node.material?.color)node.material.color.setHex(displayedColor);
    }
    return {direction:dir,target:center.clone(),valid:this.valid};
  }
  clear(){
    this.profile=null;this.state=null;this.valid=true;
    this.clearGroup(this.root);
    this.clearGroup(this.path);
    this.root.visible=false;this.path.visible=false;
    this.arc=null;this.lastArcPoint=null;this.pathBeam=null;
  }
}
