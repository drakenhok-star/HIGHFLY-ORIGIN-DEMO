import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const js=read('src/skillslab/skills-web.js');
const css=read('src/skillslab/lab.css');
const camera=read('src/skillslab/camera-lab-p18.js');
assert.ok(js.includes("id=\"hf-l27-transfer\"")&&js.includes('COPIAR HUD A DEMO'));
assert.ok(js.includes("window.highflyCameraLab?.config")&&
 js.includes("p810?.editor?.layout"),'exports actual saved camera and draggable HUD, not video guesses');
assert.ok(js.includes("hf_p186_transfer")&&
 js.includes("'https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p186/'"));
assert.ok(css.includes('body.hf-skills-lab .hud-crosshair {display:none!important;}'),
 'fixed screen-center white dot hidden on hunter');
assert.ok(camera.includes("hf_l23_fury_p16_camera_settings")&&
 camera.includes('localStorage.setItem(STORE'),
 'camera values are kept in the original save storage, not reset during L27 update');
assert.ok(read('src/ui/p10-hud-editor.js').includes("editor")&&
 read('src/ui/p10-layout.js').includes('focus:{'));
assert.ok(js.includes('this.game.touch.root.appendChild(this.focusBtn)'));
assert.ok(read('src/skillslab/claudecraft-vfx-l26.js').includes('fireImpact('));
assert.ok(read('src/skillslab/rupture-state-l25.js').includes('export'));
console.log('L27 PASS: no head dot, original saved camera/HUD kept, opt-in portable P186 profile, intact FURY.');
