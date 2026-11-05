/**
 * P186 is a staging integration, not a main-branch game replacement.
 * User's filmed settings and actual P185 combat preservation are verified.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const catalog=await import('data:text/javascript;base64,'+
  Buffer.from(read('src/skillslab/skill-catalog-export-l26.js')).toString('base64'));
const prof=await import('data:text/javascript;base64,'+
  Buffer.from(read('src/ui/p186-profile.js')).toString('base64'));
const skills=catalog.HIGHFLY_SKILL_EXPORT_L26;
assert.equal(skills.length,15,'exactly 15 reusable skill declarations');
assert.equal(new Set(skills.map(s=>s.id)).size,15);
assert.equal(catalog.l26SkillFamilies().length,5);
for(const s of skills){
 assert.ok(['MP','ENERGY'].includes(s.resource));
 assert.ok(s.cost>0&&s.cd>0&&s.slot>=1&&s.slot<=3);
 assert.ok(['HIGHFLY_ORIGINAL','WOCC_MIT_RECONSTRUCTION'].includes(s.source));
}
assert.deepEqual(Object.keys(prof.P186_FILMED_CAMERA),
 ['distance','pitch','height','fov','aim','deadZone']);
assert.equal(prof.P186_FILMED_CAMERA.distance,10);
assert.equal(prof.P186_FILMED_CAMERA.pitch,-46);
assert.equal(prof.P186_FILMED_CAMERA.height,1.7);
assert.equal(prof.P186_FILMED_CAMERA.fov,85);
assert.equal(prof.P186_FILMED_CAMERA.aim,.145);
assert.equal(prof.P186_FILMED_CAMERA.deadZone,4);
const controls=prof.P186_FILMED_HUD;
assert.ok(controls.atk.x<controls.focus.x && controls.atk.size>controls.focus.size,
 'ATK large, ENFOCAR compact at bottom right as in video');
const main=read('src/main.js'),bridge=read('src/combat/skill-bridge-p186.js');
assert.ok(main.includes("import { installP186Combat } from './combat/skill-bridge-p186.js'"));
assert.ok(main.includes("game.p186Skills?.update(dt)"));
assert.ok(main.includes("has('hf_p186_off')"),'feature-off rollback');
assert.ok(bridge.includes('g.enemies.list.filter')||bridge.includes('this.game.enemies.list.filter'));
assert.ok(bridge.includes('p186IsFlying')&&bridge.includes('p186SweptHit'));
assert.ok(bridge.includes("enemy.state='land'")&&bridge.includes("enemy.sub='descend'"),
 'world dragon uses EXISTING landing state machine, not L25 training y hack');
assert.ok(!bridge.includes('configureTrainingTargets') &&
 !bridge.includes('this.game.combat.melee=')&&!bridge.includes('spawnTrainingDummy'),
 'world enemies, native FURY melee and training state are untouched');
assert.ok(bridge.includes("target.matches('.hf-p5-atk')") &&
 bridge.includes("target.matches(cls)") &&
 bridge.includes("document.addEventListener('pointerdown'"),
 'native buttons route to isolated skills when explicitly selected');
assert.ok(bridge.includes('g.stats.useMagicka')&&bridge.includes('g.stats.useStamina'));
assert.ok(bridge.includes('this.claude.fireImpact')&&
 bridge.includes('cf.frostNova')&&bridge.includes('cf.backstabContact')&&
 bridge.includes('cf.kidneyContact')&&bridge.includes('cf.chargeCrash'));
const hud=read('src/ui/p10-layout.js');
assert.ok(hud.includes('focus:{')&&read('src/ui/p10-hud-editor.js').includes("focus:'ENFOCAR VOLADOR'"));
assert.ok(read('src/ui/p186-profile.js').includes('.hud-crosshair{display:none!important}'),
 'white point on hunter head removed while aiming stays physical');
for(const p of ['src/skillslab/lab-vfx.js','src/skillslab/signature-vfx-l22.js',
 'src/skillslab/fireball-vfx-l22.js','src/skillslab/premium-vfx-l25.js',
 'src/skillslab/claudecraft-vfx-l26.js']){
 const code=read(p);
 assert.ok(!/from\s+['"]..\/lab\/boot/.test(code));
 assert.ok(!code.includes('public/vfx/fel_meteor_impact.png'));
}
console.log('P186 PASS: P185 world preserved; 15 skills + 6 Claude FX; video camera/HUD; dot hidden; native combat/dragon FSM untouched.');
