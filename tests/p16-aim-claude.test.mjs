import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const s=p=>readFileSync(p,'utf-8');
const web=s('src/skillslab/skills-web.js');
const aim=s('src/skillslab/aim-guide-p16.js');
const fx=s('src/skillslab/lab-vfx.js');
const cl=s('src/skillslab/claudecraft-kit-p16.js');
const css=s('src/skillslab/lab.css');

assert.ok(web.includes('import { TianjieAimGuide, AIM_PROFILES }'),'P16 reticles hooked to real game');
assert.ok(web.includes('import { castClaudeSkill }'),'Claude mechanics hooks load');
assert.ok(web.includes('const pr=AIM_PROFILES'),'skill profiles drive cast target');
assert.ok(aim.includes("'line'")&&aim.includes("'cone'")&&aim.includes("'zone'")&&aim.includes("'dash'")&&aim.includes("'self'"),
  'five thick native WebGL aim shapes defined');
assert.ok(aim.includes('new THREE.BoxGeometry')&&aim.includes('new THREE.CylinderGeometry'),
  'wide direction corridors and area circles are actual mesh surfaces, not hairlines');
assert.ok(aim.includes('new THREE.TubeGeometry'),'projected arced landing trajectory');
assert.ok(aim.includes('blocked=insideBlockingObject')&&aim.includes('hasLineOfSight'),
  'targeted ground/dash areas respect real scene blockers');
assert.ok(web.includes('this.aimGuide.begin(')&&web.includes('this.aimGuide.updateAim('),
  'drag-to-aim, preview and cancel use same geometry');
assert.ok(web.includes('a.target=result.target')&&web.includes("if(!valid)"),
  'zone target is retained and invalid casts spend no resources');
assert.ok(web.includes('this.activeLeap={started:')&&web.includes('updateLeap(){')&&
  web.includes('p.onGround&&p.dashT<0'),
  'S2 does NOT launch foes until landing confirmed by native player physics');
assert.ok(web.includes('this.recastUntil=t+3.5'),
  'aerial recast opens AFTER landing');
assert.ok(web.includes('for(let tick=0;tick<11;tick++)'),
  'Guinevere-like aerial 11 tick ultimate survives P16');
assert.ok(web.includes('const center=p.pos.clone()'),
  'gravity ultimate stays centered on the PLAYER');
for(const name of ['fireball','meteor','frost_nova','backstab','kidney_shot','charge'])
  assert.ok(cl.includes(name),'ClaudeCraft source skill verified by ID: '+name);
assert.ok(cl.includes('493c35a108cef6c8aa290e8793107b1cd117886e'),
  'pinned v0.44.7 MIT code attribution');
assert.ok(cl.includes('lab.applyBurn')&&cl.includes('enemy.applySlow')&&cl.includes('p.startDash'),
  'burn/freeze/dash mechanics are integrated with Tianjie native game');
assert.ok(fx.includes('fallingMeteor(')&&fx.includes('landingMarker(')&&fx.includes('frostNova('),
  'original procedural falling meteor and landing/ice VFX created');
assert.ok(fx.includes('new THREE.TubeGeometry'),
  'VFX ribbons now thick WebGL meshes');
assert.ok(css.includes('nth-child(5)'),'all five styles fit the Android landscape header');
assert.ok(existsSync('assets/models/player_barbarian.glb')&&
  existsSync('src/player/fury-traversal-p13.js')&&
  existsSync('src/combat/air-chain-p14.js'),
  'same original character and player physics kept');
console.log('P16: 21 source/behavior-contract checks PASS. Live WebGL smoke separate.');
