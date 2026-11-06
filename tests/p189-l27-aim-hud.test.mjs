import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {AIM_PROFILES} from '../src/skillslab/aim-guide-p16.js';
import {
 AIM_SPECS_P189,getLabAimProfileP189,computeLabAimDragP189
} from '../src/combat/l27-aim-adapter-p189.js';
import {
 HUD_DEFAULTS,HUD_LAYOUT_KEY,sanitizeHudLayout,placeHudItem
} from '../src/ui/p10-layout.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(AIM_PROFILES.length,5);
assert.equal(AIM_PROFILES.flat().length,15);
assert.equal(Object.keys(AIM_SPECS_P189).length,15);
assert.equal(getLabAimProfileP189({kit:'CLAUDE_MAGE',slot:2}).kind,'zone');
assert.equal(getLabAimProfileP189({kit:'GUINEVERE',slot:2},true).kind,'dash');
assert.equal(getLabAimProfileP189({kit:'CLAUDE_ROGUE',slot:1}).kind,'cone');
assert.equal(getLabAimProfileP189({kit:'CLAUDE_MAGE',slot:1}).kind,'line');
const forward=new Vector3(0,0,-1);
const profile=getLabAimProfileP189({kit:'CLAUDE_MAGE',slot:1});
const idle=computeLabAimDragP189({dx:2,dy:0,forward,profile});
assert.equal(idle.dragged,false);
const aiming=computeLabAimDragP189({dx:80,dy:-70,forward,profile});
assert.equal(aiming.dragged,true);
assert.ok(aiming.direction.x>.1,'L27 drag selects rightward direction');
assert.ok(aiming.direction.z<0,'L27 drag retains forward influence');
const zone=getLabAimProfileP189({kit:'CLAUDE_MAGE',slot:2});
const target=computeLabAimDragP189({
 dx:80,dy:-20,forward,profile:zone,playerPos:new Vector3(0,2,0),
 terrain:{getHeight:()=>3}
});
assert.equal(target.dragged,true);
assert.ok(target.target.distanceTo(new Vector3(0,2,0))<zone.range+4);
assert.equal(target.target.y,3,'target circle follows real terrain');
const self=getLabAimProfileP189({kit:'CLAUDE_MAGE',slot:3});
assert.equal(computeLabAimDragP189({dx:100,dy:100,forward,profile:self}).dragged,false);
assert.equal(HUD_LAYOUT_KEY,'hf_p812_hud_layout_v2',
 'P189 cannot overwrite the saved player HUD namespace');
assert.equal(HUD_DEFAULTS.skillCancel.size,45);
assert.equal(HUD_DEFAULTS.skillCancel.opacity,.70);
const migrated=sanitizeHudLayout({joy:{x:.11,y:.5,size:188,opacity:.61},
 menu:{x:.94,y:.26,size:59},skillCancel:{x:.66,y:.21,size:38,opacity:.55}});
assert.equal(migrated.joy.size,188);
assert.equal(migrated.menu.y,.26);
assert.equal(migrated.skillCancel.x,.66);
assert.equal(migrated.skillCancel.opacity,.55);
assert.equal(placeHudItem(migrated.skillCancel,1030,480).size,38);
const newLegacy=sanitizeHudLayout({joy:{x:.11}});
assert.equal(newLegacy.skillCancel.opacity,.70,'old saves get translucent cancel');
for(const p of ['src/skillslab/aim-guide-p16.js','src/combat/l27-aim-adapter-p189.js']){
 assert.match(source(p),/TianjieAimGuide/);
}
const bridge=source('src/combat/skill-bridge-p186.js');
const editor=source('src/ui/p10-hud-editor.js');
assert.ok(bridge.includes("this.game.p189Build?new L27AimAdapterP189(game)"));
assert.ok(bridge.includes("editor.register('skillCancel',this.cancelButton)"));
assert.ok(bridge.includes("b.className='hf-p810-control hf-p189-skill-cancel'"));
assert.ok(bridge.includes("b.textContent='✕'"));
assert.ok(bridge.includes('border-radius:50%'));
assert.ok(bridge.includes('this.syncCancelButton()'));
assert.ok(bridge.includes('result?.valid===false'));
assert.ok(editor.includes('this.editing||!!this.game.p186Skills?.pendingAim'));
assert.ok(editor.includes("'skillCancel'"));
assert.ok(editor.includes("skillCancel:'✕ CANCELAR SKILL'"));
const book=source('src/ui/rpg-books-p188.js');
assert.ok(book.includes('HABILIDADES FÍSICAS'));
assert.ok(book.includes('HABILIDADES MÁGICAS'));
assert.ok(book.includes('DESCRIPTIONS=Object.freeze'));
assert.ok(!book.includes('VFX actual:'),'developer VFX codes never appear in the RPG');
assert.ok(book.includes('S4 · TÉCNICA ESPECIAL'));
assert.ok(book.includes('combat.equippedShout=shout.id'));
const hud=source('src/ui/premium-hud-p5.js');
assert.ok(hud.includes("this.game.p189Build?this.game.combat.equippedShout:'wuld'"));
const map=source('src/ui/world-map-p34.js');
assert.ok(map.includes('const nearMenu=box'));
assert.ok(source('src/ui/p810-ui.js').includes("menu.style.setProperty('z-index','77','important')"));
console.log('P189 PASS: authentic L27 aim, valid zones, editable circular red CANCELAR, no HUD reset, classless skill book and learned S4 selection.');
