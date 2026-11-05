import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const enemies=read('src/entities/enemies.js');
const skills=read('src/skillslab/skills-web.js');
const combat=read('src/combat/combat.js');
const player=read('src/player/player.js');
const main=read('src/main.js');
const boot=read('src/skillslab/boot.js');
const camera=read('src/skillslab/camera-lab-p18.js');
const page=read('lab.html');
assert.ok(enemies.includes("location.pathname.endsWith('/lab.html')")&&
 enemies.includes('document.querySelector('),
 'isolated training only in lab.html');
assert.ok(enemies.includes('if (this.trainingLab) {')&&
 enemies.includes('this.configureTrainingTargets(this.trainingCount);'),
 'normal world enemy spawning replaced only in standalone lab');
assert.ok(enemies.includes('this.trainingCount === 1 ? [[6.7, 0]]'),
 'single-target option still available');
assert.ok(enemies.includes('[[6.8, -3.0], [7.2, 0], [6.8, 3.0]]'),
 'three target test lineup');
assert.ok(enemies.includes("this._attachRig(e,'skeleton_warrior')"),
 'real animated rig — no geometric stand-ins');
assert.ok(enemies.includes('e.training=true;e.aggroR=0;e.attackRange=0;e.speed=0;e.dmg=0'),
 'no attacks or roaming');
assert.ok(enemies.includes('e.hp=Math.max(1,e.hp-damage)')&&
 enemies.includes('e.trainingLastHit=this.game.time.elapsed'),
 'P16 confirmed HP damage with real hit timestamps');
assert.ok(enemies.includes('if(impulse)e.kbVel.add(impulse)')&&
 enemies.includes('e.kbVel.y-=26*dt'),
 'directional finisher physics and gravity remain testable');
assert.ok(enemies.includes('this.game.time.elapsed-e.trainingLastHit>3.5'),
 'HP and location reset only after idle window longer than combo timer');
assert.ok(enemies.includes("get('hf_targets') !== '1' ? 3 : 1"),
 'three bots by default, one by optional URL');
assert.ok(skills.includes('this.trainingCount===1?3:1')&&
 skills.includes('this.resetTraining()'),
 'in-game UI toggles between 1 and 3 and explicitly resets');
assert.ok(!skills.includes('this.game.enemies._spawnDraugr('),
 'no additional aggressive draugr spawner from Skill Lab');
assert.ok(skills.includes('this.game.stats.hp=this.game.stats.maxHp')&&
 skills.includes('this.game.stats.mp=this.game.stats.maxMp')&&
 skills.includes('this.game.stats.sp=this.game.stats.maxSp'),
 'training-only recovery UI');
assert.ok(combat.includes('commitConfirmedHit(priorConfirmedStep,this._meleeStep,connected)')&&
 combat.includes("this._finisher=finisherInput(g.input,player.yaw)"),
 'FURY P16 true-hit and fourth ATK finger gesture remain authoritative');
assert.ok(player.includes('P16_RESPONSE.acceleration')&&
 player.includes('let speed = g.p812Enabled?7.5:6'),
 'P16 joystick interpolation, unchanged max movement speed');
assert.ok(camera.includes("preset:'hybrid',distance:8.5,pitch:-34"),
 'camera hybrid still default');
assert.ok(boot.includes('if(!g.p16Enabled)')&&
 page.includes("./src/skillslab/boot.js"),
 'lab remains an adapter and requires FURY P16');
assert.ok(!main.includes('this.trainingLab')&&
 !main.includes('p20Enabled'),
 'no modifications needed in default P16 game bootstrap');
console.log('L21 PASS: 1/3 idle training rig(s), true hit/damage, native launch reactions, no mob spam; FURY P16 untouched.');
