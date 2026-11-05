/** HIGHFLY L25 — original premium accent layers for all 15 Skill Lab skills.
 * Visual grammar informed by the MIT ability_vfx_full_specs.ts in WoC 0.44.7.
 * No WoC textures, icons, sound or "With the project only" assets.
 * Works with L22's shared capped VFX lifetime and scene cleanup.
 */
import * as THREE from 'three';

export const L25_SKILL_VFX_MATRIX=Object.freeze([
  ['violet-bolt','skyward-lift','storm-vortex'],
  ['triple-shear','blood-step','dark-execution'],
  ['iron-wave','steel-onrush','gravity-collapse'],
  ['ember-orb','meteor-skyshaft','frost-pillars'],
  ['shadow-thrust','blood-bind','steel-charge']
]);
const PAL=[
  ['#ab79ff','#f3b9ff'],['#f54472','#ffc0bb'],
  ['#dfb35c','#fff2c8'],['#ff7431','#ffe2a6'],
  ['#7bddfa','#eefaff']
];
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export class L25PremiumSkillVfx{
  constructor(fx){this.fx=fx;this.game=fx.game;}
  /** One batched untextured mesh; glow rings never use 1px WebGL line primitives. */
  sigil(pos,radius,color,life=.65,spokes=8){
    const xyz=[],level=this.game.terrain.getHeight(pos.x,pos.z)+.15;
    const quad=(a,b,c,d)=>xyz.push(...a,...b,...c,...a,...c,...d);
    const w=Math.max(.065,radius*.038);
    for(let i=0;i<48;i++){
      const a=i*Math.PI/24,b=(i+1)*Math.PI/24;
      const at=(r,t)=>[pos.x+Math.cos(t)*r,level,pos.z+Math.sin(t)*r];
      quad(at(radius-w,a),at(radius+w,a),at(radius+w,b),at(radius-w,b));
    }
    for(let i=0;i<spokes;i++){
      const a=i*2*Math.PI/spokes;
      const p=(r,da)=>[pos.x+Math.cos(a+da)*r,level,pos.z+Math.sin(a+da)*r];
      quad(p(radius*.55,-.025),p(radius*.93,-.025),p(radius*.93,.025),p(radius*.55,.025));
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.80,
      side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.frustumCulled=false;
    return this.fx.add(mesh,life,'sigil');
  }
  /** Adds a distinctive lightweight pre-impact composition per skill.
   * Damage/cooldown still live in skills-web and P16, never here.
   */
  onCast(style,slot,origin,direction,groundTarget=null){
    const f=this.fx,s=f.signature;
    const c=PAL[style]||PAL[0],at=origin.clone(),dir=direction.clone();
    const key=L25_SKILL_VFX_MATRIX[style]?.[slot-1];
    if(!key)return;
    const ahead=at.clone().addScaledVector(dir,2.1);
    // Only 1-3 accent emitters per cast to preserve mobile draw-call budget.
    switch(key){
      case 'violet-bolt':
        s.rushLines(at.clone().add(vec(0,1.15,0)),dir,c[0],.32);
        break;
      case 'skyward-lift':
        this.sigil(groundTarget||ahead,2.25,c[0],.83,6);
        break;
      case 'storm-vortex':
        this.sigil(at,4.0,c[0],1.45,12);
        f.sparks(at.clone().add(vec(0,1.5,0)),c[1],24,3.8,.46,.12);
        break;
      case 'triple-shear':
        s.crescent(ahead,dir,'#ff477a',.34,.75);
        break;
      case 'blood-step':
        s.rushLines(at.clone().add(vec(0,1.1,0)),dir,'#ff779b',.38);
        break;
      case 'dark-execution':
        this.sigil(ahead,1.9,'#632646',.41,5);
        break;
      case 'iron-wave':
        s.groundWave(at,dir,3.2,'#ffe4ab',.4,55,.26);
        break;
      case 'steel-onrush':
        s.rushLines(at.clone().add(vec(0,.85,0)),dir,'#f9e2ae',.36);
        break;
      case 'gravity-collapse':
        this.sigil(at,4.8,'#d9bb75',1.52,10);
        break;
      case 'ember-orb':
        f.sparks(at.clone().add(vec(0,1.4,0)),'#ffb65d',22,1.7,.45,.13);
        break;
      case 'meteor-skyshaft':
        if(groundTarget){
          this.sigil(groundTarget,3.8,'#ff8e39',.74,10);
          s.upwardPillar(groundTarget,'#ffb65b',10.5,.74);
        }
        break;
      case 'frost-pillars':
        this.sigil(at,4.8,'#a5ecff',1.13,12);
        break;
      case 'shadow-thrust':
        // Backstab must be quiet, precise and ringless (upstream MIT grammar).
        s.shadowStrike(ahead,dir,'#67d8ff',.35);
        break;
      case 'blood-bind':
        s.chains(ahead,'#e55a90',2.3,.65);
        break;
      case 'steel-charge':
        s.rushLines(at.clone().add(vec(0,.9,0)),dir,'#9cf3ff',.39);
        break;
    }
  }
}
