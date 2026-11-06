/**
 * HIGHFLY World Forge 2.0 - editor-only environment.
 * No edits to the gameplay sky, water, day/night cycle or save game.
 * The celestial sprites have world-space positions only AFTER sky.update(0).
 */
import * as THREE from 'three';

export function prepareEditorEnvironmentP195(game){
  if(!game.p193EditorMode)return;
  // Fix the giant white/grey disc: moon (radius 40), sun disc and halo
  // were left at origin because the editor bypasses the normal sky update.
  game.sky.update(0);
  // World Forge is an architectural editor: remove the costly camera-dependent
  // depth/reflection/refraction shader, whose render targets were never updated
  // by the intentionally paused gameplay simulation.
  const water=game.water;
  water.p195GameMaterial=water.mesh.material;
  const material=new THREE.MeshStandardMaterial({
    color:0x16758a,roughness:0.48,metalness:0.06,
    side:THREE.DoubleSide,depthWrite:true,fog:true
  });
  water.mesh.material=material;
  // The editor remains strictly static. The ordinary game keeps the
  // original water shader and all gameplay interactions.
  game.scene.background=game.scene.background||new THREE.Color(0x93b5c3);
  game.p195EditorEnvironment={ready:true,waterMode:'static',celestialInitialized:true};
}
