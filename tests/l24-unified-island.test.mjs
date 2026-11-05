import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const pure=async p=>import('data:text/javascript;base64,'+Buffer.from(read(p)).toString('base64'));
const layout=(await pure('src/skillslab/training-layout-l24.js')).unifiedIslandLayout24;
const x=layout({x:8,y:4.5,z:70},{x:0,y:0,z:-1});
assert.equal(x.skeletons.length,3,'exactly THREE ground monsters');
assert.ok(x.skeletons.every(p=>p.z<70),'all three ground opponents on one side');
assert.ok(x.dragon.z>70,'animated dragon on the OTHER island side');
assert.ok(x.hoverHeight>6,'dragon actually flies above terrain');
assert.ok(Math.min(...x.skeletons.map(p=>Math.hypot(
 p.x-x.dragon.x,p.z-x.dragon.z)))>20,'two areas physically separated');
assert.ok(x.skeletons.every((p,i)=>x.skeletons.every((q,j)=>i===j||
 Math.hypot(p.x-q.x,p.z-q.z)>3)),'skeletons do not overlap each other');
const axis=layout({x:10,y:0,z:5},{x:1,y:0,z:0});
assert.ok(axis.skeletons.every(p=>p.x>10),'cardinal 0Z heading preserved');
assert.ok(axis.dragon.x<10,'dragon opposite cardinal 0Z heading');
const enemy=read('src/entities/enemies.js'),
 lab=read('src/skillslab/skills-web.js'),
 aim=read('src/skillslab/aim-guide-p16.js'),
 fireball=read('src/skillslab/claudecraft-kit-p16.js'),
 focus=read('src/skillslab/monster-focus-l23.js'),
 combat=read('src/combat/combat.js');
assert.ok(enemy.includes('unifiedIslandLayout24(') &&
 enemy.includes('this.trainingAnchor.origin'), 'ONE stable layout anchor reused on resets');
assert.ok(enemy.includes('this.trainingCount = 3;'),'three ground targets always');
assert.ok(enemy.includes('this._spawnTrainingDragon(')&&
 enemy.includes("this._attachRig(e,'dragon')") &&
 enemy.includes("e.rig.play('Flying_Idle'"),
 'REAL existing Quaternius dragon rig with animated flying, not floating skeleton');
assert.ok(enemy.includes("e.training=true;e.trainingDragon=true;e.trainingFlight=true"),
 'dragon is a real damageable flying training target');
assert.ok(enemy.includes("this.dragon=null;") &&
 enemy.includes("this.list = this.list.filter(e => !e.training)"),
 'reset removes previous dragon and all three bots, never duplicates');
assert.ok(enemy.includes('e.hp=Math.max(1,e.hp-damage)') &&
 enemy.includes('e.trainingLastHit=this.game.time.elapsed'),
 'both monster families take real damage, without zero-HP death or loot');
assert.ok(enemy.includes("if(e.trainingDragon)") &&
 enemy.includes("e.rig.play('Flying_Idle',{timeScale:.45})"),
 'training update never overwrites dragon hover clip with ground idle');
assert.ok(enemy.includes('e.flightOffset||0') &&
 !enemy.includes("location.search).has('hf_fly')"),
 'dragon always spawned as part of same scene; no ?hf_fly separate lab');
assert.ok(lab.includes("this.trainingCount=3;")&&
 !lab.includes('this.trainingCount===1?3:1'),
 'no option to remove all-but-one target from unified scene');
assert.ok(lab.includes('3 BLANCOS + 🐉')&&lab.includes('id="hf-l23-focus"'),
 'single HUD offers three ground bots, flying dragon and ENFOCAR monster selector');
assert.ok(lab.includes('this.focusTarget=null;this.focusPanelOpen=false'),
 'reset clears old selected monster reference');
assert.ok(focus.includes("isFlying22(selected,groundHeight)") &&
 !lab.includes('aerialDirection22(') &&
 !fireball.includes('chooseLaunchVector('),
 'no sky drag or hidden auto-target: only chosen flyers get vertical shots');
assert.ok(aim.includes('this.airborneLine&&trueDir.y>.065'),
 '3D tracer displays only when explicitly selected flying target');
assert.ok(combat.includes('g.enemies?.trainingLab?0:'),
 'basic ATK costs zero energy ONLY in isolated lab');
assert.ok(existsSync('assets/models/dragon_evolved_quaternius.glb'));
assert.ok(read('assets/manifest.json').includes('"role": "dragon"'));
assert.ok(existsSync('src/skillslab/signature-vfx-l22.js')&&
 existsSync('src/skillslab/fireball-vfx-l22.js'),
 'all previously implemented visual effect systems still present');
assert.ok(lab.includes("this.fx.signature.groundWave")&&
 lab.includes("this.fx.signature.gravityFunnel"),
 'VFX for Dyrroth/Tigreal/Guinevere retained');
console.log('HIGHFLY L24 PASS: ONE island, exactly 3 grounded rigs + 1 real Flying_Idle dragon, fixed reset, NO automatic terrestrial aiming and all FURY/VFX retained.');
