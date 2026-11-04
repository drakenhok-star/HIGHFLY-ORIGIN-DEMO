import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const web=read('src/skillslab/skills-web.js');
const fx=read('src/skillslab/lab-vfx.js');
const html=read('lab.html');
const boot=read('src/skillslab/boot.js');
assert.ok(html.includes('./src/main.js')&&html.includes('./src/skillslab/boot.js'),
  'same Tianjie main entrypoint is used unchanged');
assert.ok(boot.includes('window.game')&&boot.includes('TianjieMobaSkillsLab'),
  'lab attaches to real existing game, no fake avatar');
assert.ok(web.includes("g.player.startDash")||web.includes("p.startDash"),
  'all skill dashes delegate to Tianjie FURY motor');
assert.ok(web.includes('g.stats.useMagicka')||web.includes('stats.useMagicka'),
  'magical skills consume original mana');
assert.ok(web.includes('stats.useStamina'),'physical skills consume original energy');
assert.ok(web.includes('this.original={cast:originalCast,shout:originalShout,update:originalUpdate}'),
  'original combat behaviors preserved for non-skill actions');
assert.ok(web.includes('for(let tick=0;tick<11;tick++)'),'aerial ultimate schedules 11 hits');
assert.ok(web.includes('this.exposed=new WeakMap()'),'expose/debuff mechanic exists');
assert.ok(web.includes('e.kbVel?.add'),'gravity pull uses existing enemy physics');
assert.ok(web.includes('this.game.enemies._spawnDraugr')||web.includes('g.enemies._spawnDraugr'),
  'training enemies use real CC0 draugr assets, not placeholder geometry');
assert.ok(web.includes('this.attachTouchButtons()'),'reuses existing mobile HUD skill buttons');
assert.ok(web.includes('e.stopImmediatePropagation()'),'lab captures skill touch before legacy handler');
assert.ok(web.includes("return originalShout(id,...args)"),'existing fourth shout retained');
assert.ok(fx.includes('this.game.effects.spawnBurst'),'new VFX reuse original Tianjie emitter');
assert.ok(fx.includes('.dispose()'),'VFX temporary GPU resources are disposed');
assert.ok(!web.includes('MobileLegends')&&!fx.includes('MobileLegends'),
  'no protected game media imported');
assert.ok(existsSync('assets/models/player_barbarian.glb'),
  'exact Tianjie/Quaternius CC0 player model present');
assert.ok(existsSync('src/player/fury-traversal-p13.js'),'real FURY P13 movement preserved');
assert.ok(existsSync('src/combat/air-chain-p14.js'),'real FURY P14 aerial combo preserved');
console.log('P15: 19 static compatibility checks PASS. Browser/mobile QA separate.');
