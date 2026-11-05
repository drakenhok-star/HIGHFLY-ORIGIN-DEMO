import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const text=p=>readFileSync(p,'utf8');
const pure=async p=>import('data:text/javascript;base64,'+Buffer.from(text(p)).toString('base64'));
const a=await pure('src/skillslab/aerial-aim-l22.js');
const epsilon=(x,y,tol=.000001)=>Math.abs(x-y)<tol;
const f={x:0,y:0,z:-1};
const straight=a.aerialDirection22(f,0,0);
assert.ok(epsilon(straight.y,0)&&epsilon(straight.z,-1));
const upward=a.aerialDirection22(f,0,-80);
assert.ok(upward.y>.5&&upward.z<0,'drag up aims into the sky');
const downward=a.aerialDirection22(f,0,80);
assert.ok(downward.y<-.5,'drag down aims below the caster');
const right=a.aerialDirection22(f,50,0);
assert.ok(right.x>0,'drag right rotates projectile toward positive X');
const onAxis=a.aerialDirection22({x:1,y:0,z:0},0,0);
assert.ok(onAxis.x>.99&&epsilon(onAxis.z,0),'zero Z must not become negative one');
for(const dir of [straight,upward,downward,right,onAxis])
 assert.ok(epsilon(Math.hypot(dir.x,dir.y,dir.z),1),'every 3D fire vector unit length');
const terrain=()=>2;
const enemy={group:{position:{x:0,y:8,z:-8}},hitRadius:.9};
const aim=a.enemyChest22(enemy);
assert.ok(a.isFlying22(enemy,terrain),'flying monster detected relative to ground');
assert.ok(a.flightHeight22(enemy,terrain)>5);
assert.ok(a.directionToTarget22({x:0,y:3.25,z:0},aim).y>.3,
  'flight target has positive angle from muzzle');
assert.equal(a.targetWithinSkillVolume22({x:0,y:2,z:-8},enemy,4,2.1),false,
  'GROUND meteor must not damage 6u-high flyer');
assert.equal(a.targetWithinSkillVolume22({x:0,y:2,z:-8},enemy,4,7.3),true,
  'AERIAL vortex has vertical clearance for flyer');
assert.equal(a.isCancelDrop22(950,30,{left:910,right:1000,top:10,bottom:85}),true);
assert.equal(a.isCancelDrop22(100,30,{left:910,right:1000,top:10,bottom:85}),false);
const skills=text('src/skillslab/skills-web.js');
const vfx=text('src/skillslab/lab-vfx.js');
const guide=text('src/skillslab/aim-guide-p16.js');
const mock=text('src/entities/enemies.js');
const combat=text('src/combat/combat.js');
const cam=text('src/skillslab/camera-lab-p18.js');
const settings=text('src/ui/p9-panels.js');
const save=text('src/systems/save.js');
const claude=text('src/skillslab/claudecraft-kit-p16.js');
for(const key of ['isCancelDrop22','targetWithinSkillVolume22','aerialDirection22',
                  'directionToTarget22','enemyChest22'])assert.ok(skills.includes(key));
assert.ok(skills.includes('root.appendChild(this.cancelBtn)'),'fixed X anchored to screen');
assert.ok(skills.includes('if(shouldCancel)return'),'X cancel never triggers cast');
assert.ok(guide.includes('lastArcOrigin.distanceToSquared(origin)'),
 'Guinevere path must redraw when player moves while destination stays fixed');
assert.ok(guide.includes('this.aerialBeam.visible=true'),'aerial tracer must visualize height');
assert.ok(mock.includes('new URLSearchParams(location.search).has(\'hf_fly\')'),
 'flight training only in explicit lab query');
assert.ok(mock.includes('OBJETIVO AÉREO · PRUEBA 3D'),'real rig aerial training target');
assert.ok(combat.includes('g.enemies?.trainingLab?0:'),
 'basic ATK free only in isolated lab; P16 production has original cost');
assert.ok(vfx.includes('this.arc(world,dir,2.5,p[2],.38)')&&
 vfx.includes('if(style!==0&&style!==3)'),
 'no decorative curved arc in straight projectiles');
assert.ok(vfx.includes('tornado(world,radius=4'),'volumetric rotating ultimate');
assert.ok(skills.includes('for(let i=0;i<3;i++)this.schedule(.11*i'),
 'three actual Dyrroth wave hits');
assert.ok(skills.includes('for(let i=0;i<3;i++)this.schedule(.12*i'),
 'three actual Tigreal wave hits');
assert.ok(skills.includes('¡GANCHO ASCENDENTE!'),'second Tigreal S2 is rising strike');
assert.ok(skills.includes('updateGuardianDash()'),'first Tigreal S2 pushes in transit');
assert.ok(skills.includes('if(t>=state.expires){this.finishGuardianPull();return;}'),
 'Tigreal S3 auto-finishes');
assert.ok(claude.includes('{height:2.15}')&&claude.includes('{height:2.8}'),
 'meteor & frost are GROUND spells, not unlimited vertical cylinders');
assert.ok(cam.includes("const STORE='hf_l22_fury_p16_camera_settings'"),
 'camera settings do not overwrite L21 values');
assert.ok(settings.includes("st==='camera'&&window.highflyCameraLab"),
 'hybrid camera tuning moves to native AJUSTES');
assert.ok(!skills.includes('id="hf-lab-quality"'),'premium default no visual quality toggle');
assert.ok(skills.includes('this.quality=2;')&&skills.includes('this.fx.setQuality(2)'));
assert.ok(save.includes('highfly_fury_skill_lab_l22_save'),'L22 cannot import P16 or L21 progression');
assert.ok(existsSync('docs/L22_VFX_AUDIT_AND_AERIAL_TARGETING.md'));
assert.ok(!skills.includes('g.combat.melee='),'native P16 melee remains owned by FURY');
console.log('HIGHFLY L22 PASS: vertical aiming & volume, air simulator, corner X, 3-wave melee, tornado, free ATK and native camera settings.');
