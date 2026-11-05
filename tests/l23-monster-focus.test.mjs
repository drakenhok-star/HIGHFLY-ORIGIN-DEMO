import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(p,'utf8');
const rawAerial=src('src/skillslab/aerial-aim-l22.js');
const rawFocus=src('src/skillslab/monster-focus-l23.js');
const composed=rawAerial+'\n'+rawFocus.replace(
  "import {isFlying22,lockedLaunchDirection22} from './aerial-aim-l22.js';",'');
const focus=await import('data:text/javascript;base64,'+Buffer.from(composed).toString('base64'));
const ground=()=>2,from={x:0,y:3,z:0};
const flyer={alive:true,name:'OBJETIVO AÉREO',hitRadius:.9,
 group:{position:{x:0,y:8,z:-10}}};
const walker={alive:true,name:'OBJETIVO TERRESTRE',hitRadius:.9,
 group:{position:{x:0,y:2,z:-5}}};
const rows=focus.availableMonsters23([flyer,walker],from,ground,{range:25});
assert.equal(rows.length,2);
assert.equal(rows[0].enemy,walker,'monster chooser sorts by real distance');
assert.equal(rows[0].air,false,'ground monster explicitly marked terrestrial');
assert.equal(rows[1].enemy,flyer,'flying monster appears in same menu');
assert.equal(rows[1].air,true,'flying monster explicitly marked aerial');
assert.equal(focus.focusedFlightShot23(from,null,ground),null,
  'unfocused projectile NEVER seeks an enemy, even airborne');
assert.equal(focus.focusedFlightShot23(from,walker,ground),null,
  'selecting ground mob NEVER redirects Fireball');
const flyShot=focus.focusedFlightShot23(from,flyer,ground,{range:22});
assert.ok(flyShot&&flyShot.direction.y>.25,
  'user-selected airborne monster can aim one-time elevated launch');
assert.equal(focus.focusedFlightShot23(from,flyer,ground,{manualGesture:true}),null,
  'manual AIM overrides focused air target');
assert.equal(focus.focusedFlightShot23(from,flyer,ground,{range:3}),null,
  'focus never bypasses skill range');
assert.equal(focus.focusedFlightShot23(from,flyer,ground,{visible:()=>false}),null,
  'focus never bypasses terrain or obstacle collision');
assert.equal(focus.focusedFlightShot23(from,{...flyer,alive:false},ground),null,
  'dead target cannot attract shots');
assert.deepEqual(focus.availableMonsters23([flyer,walker],from,ground,{
 range:25,visible:(e)=>e!==flyer}).map(e=>e.name),[walker.name],
 'selector excludes occluded targets');
const skills=src('src/skillslab/skills-web.js');
const claude=src('src/skillslab/claudecraft-kit-p16.js');
const aim=src('src/skillslab/aim-guide-p16.js');
const css=src('src/skillslab/lab.css');
const save=src('src/systems/save.js');
const camera=src('src/skillslab/camera-lab-p18.js');
assert.ok(skills.includes('id="hf-l23-focus"')&&
 skills.includes('id="hf-l23-target-panel"'),'one focus button and one monster chooser');
assert.ok(skills.includes("item.air?'🪽 AÉREO · ':'⚔ TIERRA · '"),
 'selector explains aerial/ground combat behavior');
assert.ok(skills.includes('this.focusTarget=item.enemy'),
 'only user tapping an explicit monster can set focus');
assert.ok(skills.includes('focusedFlightShot23(origin,this.focusTarget'),
 'projectile preview follows explicitly selected flyer');
assert.ok(skills.includes('focusedFlightShot23(from,this.focusTarget'),
 'violet orb launches toward explicitly selected flyer');
assert.ok(claude.includes('focusedFlightShot23(muzzle,lab.focusTarget'),
 'Fireball uses explicit opt-in focus only');
assert.ok(!skills.includes('aerialDirection22('),
 'skill gesture no longer pitches projectile into the sky');
assert.ok(!skills.includes('flyingAutoTarget22(')&&
 !claude.includes('chooseLaunchVector('),
 'NO soft automatic targeting, not even on unselected flyers');
assert.ok(aim.includes('this.airborneLine&&trueDir.y>.065'),
 '3D beam only shown for a focused flyer, never ordinary aim');
assert.ok(css.includes('#hf-l23-target-panel[hidden]')&&
 css.includes('pointer-events:auto'),
 'selector is touch accessible and hides correctly');
assert.ok(save.includes('highfly_fury_skill_lab_l23_save') &&
 !save.includes('highfly_fury_skill_lab_l22_save'),
 'L23 save isolated from L22 and main P16');
assert.ok(camera.includes('hf_l23_fury_p16_camera_settings'),
 'L23 camera preference separate from L22');
assert.ok(skills.includes('if(shouldCancel)return; // zero resource, zero cooldown'));
assert.ok(skills.includes("this.fx.signature.groundWave("),
 'new wave visuals preserved in L23');
assert.ok(skills.includes("this.fx.signature.gravityFunnel("),
 'new vortex visuals preserved in L23');
console.log('PASS L23: monster selector + FLYER focus only; ground pure manual AIM; no sky-drag; saves isolated.');
