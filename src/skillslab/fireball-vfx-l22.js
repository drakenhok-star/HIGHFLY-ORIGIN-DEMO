import * as THREE from 'three';

/**
 * HIGHFLY L22 — adapted Mage Fireball travel presentation.
 * MIT source inspiration/structure: World of ClaudeCraft 0.44.7,
 * src/render/fireball_travel_visual.ts, Levy Street.
 * Original commit 493c35a108cef6c8aa290e8793107b1cd117886e.
 * All shapes/materials generated in Three.js, no external icon,
 * shader, sprite, GLB, audio or project-only art imported.
 * See root LICENSE for retained MIT terms.
 */
export function makeFireballVisual22(style='fire'){
  const violet=style==='violet';
  const colors=violet?{core:0xcaaaff,glow:0x7739fd,flame:0x9e67ff,ember:0xf6d6ff}:
    {core:0xffaa25,glow:0xff5218,flame:0xff7925,ember:0xffe58d};
  const root=new THREE.Group();
  root.name='highfly-l22-fireball';
  const emissive=(color,intensity=1)=>new THREE.MeshStandardMaterial({
    color,emissive:color,emissiveIntensity:intensity,roughness:.42,flatShading:true
  });
  const glow=(color,opacity)=>new THREE.MeshBasicMaterial({
    color,transparent:true,opacity,depthWrite:false,
    side:THREE.DoubleSide,blending:THREE.AdditiveBlending
  });
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.32,2),emissive(colors.core,2.6));
  const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,2),glow(colors.glow,.51));
  shell.renderOrder=8;root.add(core,shell);
  const tail=new THREE.Group();tail.position.z=-.45;root.add(tail);
  const flames=new THREE.InstancedMesh(
    new THREE.ConeGeometry(.18,.78,6),
    glow(colors.flame,.71),5
  );
  const tmp=new THREE.Object3D();
  for(let i=0;i<5;i++){
    const a=i*2*Math.PI/5;
    tmp.position.set(Math.cos(a)*(i? .25:0),Math.sin(a)*(i? .25:0),-.30);
    tmp.rotation.set(-Math.PI/2,0,0);
    tmp.scale.setScalar(i? .7:1.0);
    tmp.updateMatrix();flames.setMatrixAt(i,tmp.matrix);
  }
  flames.instanceMatrix.needsUpdate=true;tail.add(flames);
  const embers=new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(.052,0),glow(colors.ember,.9),12
  );
  embers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(embers);
  let time=0;
  root.userData.updateVfx=(dt,travelRate=1)=>{
    time+=Math.max(0,dt);
    const pulse=1+.06*Math.sin(time*8.4);
    shell.scale.setScalar(pulse);
    shell.rotation.set(Math.sin(time*2)*.09,time*1.5,0);
    tail.scale.z=.85+Math.min(1.6,travelRate)*.85;
    for(let i=0;i<12;i++){
      const phase=time*(2.2+(i%3)*.2)+i*2.399;
      const radius=.41+(i%4)*.075;
      tmp.position.set(Math.cos(phase)*radius,
        Math.sin(phase*1.3)*radius,
        Math.sin(phase)*radius-.18-(i%5)*.10);
      tmp.rotation.set(0,0,0);
      tmp.scale.setScalar(.65+.25*Math.sin(phase*2));
      tmp.updateMatrix();embers.setMatrixAt(i,tmp.matrix);
    }
    embers.instanceMatrix.needsUpdate=true;
  };
  root.userData.updateVfx(0);
  return root;
}
