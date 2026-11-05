import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const pure=async p=>import('data:text/javascript;base64,'+Buffer.from(read(p)).toString('base64'));
const layout=await pure('src/ui/p10-layout.js');
assert.ok(layout.HUD_IDS.includes('focus'),'ENFOCAR is a first-class HUD editor ID');
const d=layout.sanitizeHudLayout();
assert.ok(d.focus.size>=40&&d.focus.size<=60,'focus starts compact');
const changed=layout.sanitizeHudLayout({focus:{x:.52,y:.73,size:88,opacity:.6,hidden:false}});
assert.equal(changed.focus.size,88,'can grow focus control');
assert.equal(changed.focus.x,.52,'focus position persists');
assert.equal(changed.focus.y,.73,'focus vertical position persists');
assert.equal(changed.focus.opacity,.6,'focus opacity persists');
const pos=layout.placeHudItem(changed.focus,915,412,1);
assert.ok(pos.left>430&&pos.left<530,'editor placement normalized to S23 landscape');
const editor=read('src/ui/p10-hud-editor.js');
assert.ok(editor.includes("focus:'ENFOCAR VOLADOR'")&&
 editor.includes("'bag','menu','focus'].includes(id)")&&
 editor.includes('this.elements.set(id,el)')&&
 editor.includes('localStorage.setItem(HUD_LAYOUT_KEY,'),
 'native editor supports focus dragging, scaling, opacity and saving');
const lab=read('src/skillslab/skills-web.js'),
 css=read('src/skillslab/lab.css');
assert.ok(lab.includes("editor.register('focus',this.focusBtn)")&&
 lab.includes('this.ensureFocusEditor();')&&
 lab.includes("Object.assign(editor.layout.atk,{x:.83,y:.535,size:83})")&&
 lab.includes("Object.assign(editor.layout.use,{x:.71,y:.835,size:49})")&&
 lab.includes("Object.assign(editor.layout.focus,{x:.91,y:.835,size:43})"),
 'new lab layout puts ATK over USAR/ENFOCAR without modifying saved layout');
assert.ok(!lab.includes('position(this.focusBtn,'),
 'focus must NEVER be repositioned over saved editor placement');
assert.ok(lab.includes("position(this.cancelBtn,document.querySelector('#hf-p810-bag'),46)"),
 'CANCELAR stays near editable MOCHILA without editor focus interference');
assert.ok(css.includes('/* L25: flight-only ENFOCAR')&&css.includes('#hf-l23-focus'),
 'visual focus is visible and button remains isolated from P16');
const source=read('src/skillslab/claudecraft-vfx-l26.js');
for(const name of ['fireCharge','fireImpact','meteorSkybeam','meteorDetonate',
 'frostNova','frostBind','backstabContact','kidneyContact','chargeWindup','chargeCrash'])
 assert.ok(source.includes(name+'('),'missing dedicated VFX event '+name);
const binding=read('src/skillslab/claudecraft-kit-p16.js');
for(const event of ['fireCharge','meteorSkybeam','meteorDetonate','frostNova',
 'backstabContact','kidneyContact','chargeWindup','chargeCrash'])
 assert.ok(binding.includes('lab.claudeFx.'+event+'('),
  'VFX must connect to the gameplay moment: '+event);
assert.ok(lab.includes('this.claudeFx.fireImpact(closest)'),
 'Fireball impact is triggered by confirmed swept projectile collision');
assert.ok(binding.includes('lab.schedule(.75,()=>{')&&
 binding.indexOf('lab.claudeFx.meteorDetonate(center)')>binding.indexOf('lab.schedule(.75,()=>{'),
 'Meteor detonates ONLY after scheduled fall, not at button press');
assert.ok(binding.includes('for(const enemy of foes){')&&
 binding.includes('lab.claudeFx.kidneyContact(enemy,direction)'),
 'rogue stun effect appears only when the target actually takes a hit');
assert.ok(source.includes('new THREE.InstancedMesh')&&
 source.includes("'l26-ice-rise'")&&source.includes("'l26-skyshaft'"),
 'ice shards/meteor rays use batched geometry and lifetime management');
const fx=read('src/skillslab/lab-vfx.js');
assert.ok(fx.includes("a.kind==='l26-ice-rise'")&&
 fx.includes("a.kind==='l26-skyshaft'"),'frost and fire animations progress per frame');
for(const bad of ['/public/vfx/','fel_meteor_impact.png','CraftPix','textures/vfx/contact/',
 'production_fragments.glb']){
 assert.ok(!source.includes(bad),'NO restricted media dependency: '+bad);
}
const specs=source.match(/ fireball:\[| meteor:\[| frost_nova:\[| backstab:\[| kidney_shot:\[| charge:\[/g)||[];
assert.equal(specs.length,6,'all six ClaudeCraft abilities have independent visual specs');
const own=read('src/skillslab/premium-vfx-l25.js');
assert.equal((own.match(/case '[-a-z]+':/g)||[]).length,15,
 'original HIGHFLY 9 MOBA kits and six Claude specs remain part of the full 15 matrix');
assert.ok(existsSync('src/skillslab/rupture-state-l25.js') &&
 existsSync('assets/models/dragon_evolved_quaternius.glb'));
assert.ok(!read('src/combat/combat.js').includes('L26')&&
 !read('src/player/player.js').includes('L26'),
 'original P16 combat and movement are untouched');
console.log('PASS L26: draggable ENFOCAR; original 6 MIT-grammar VFX on real hit; 15 profiles; no P16/game core modifications.');
