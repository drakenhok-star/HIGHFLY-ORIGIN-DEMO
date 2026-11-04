// HIGHFLY P8+P9+P10: normalized HUD + gameplay/UI contracts without browser bundles.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const importSource=async p=>import('data:text/javascript;base64,'+Buffer.from(await source(p)).toString('base64'));
const {HUD_LAYOUT_KEY,HUD_IDS,HUD_DEFAULTS,sanitizeHudLayout,placeHudItem}=await importSource('src/ui/p10-layout.js');
assert.equal(HUD_LAYOUT_KEY,'hf_p10_hud_layout_v1');
assert.ok(HUD_IDS.includes('radar')&&HUD_IDS.includes('atk')&&HUD_IDS.includes('combo'));
const defaults=sanitizeHudLayout();
const comboPlace=placeHudItem(defaults.combo,915,412,1,true);
assert.ok(comboPlace.top>360,'combo notification remains at bottom, not mid-screen');
const sequence=['run','jump','dash','use','s1','atk'];
assert.deepEqual(sequence,sequence.toSorted((a,b)=>defaults[a].x-defaults[b].x),
 'primary row is CORRER / SALTO / DASH / USAR / S1 / ATK');
for(const size of [{width:915,height:412},{width:740,height:360},{width:1280,height:720}]){
 for(const id of HUD_IDS){
  const p=placeHudItem(defaults[id],size.width,size.height,.85);
  assert.ok(p.left>=0&&p.top>=0,'must fit viewport '+id);
  assert.ok(p.left+p.size<=size.width&&p.top+p.size<=size.height,'control within viewport '+id);
 }
}
const sanitized=sanitizeHudLayout({atk:{x:Infinity,y:-5,size:900,opacity:-4,hidden:true},menu:{hidden:true},joy:{hidden:true},s4:{hidden:true}});
assert.equal(sanitized.atk.hidden,false);
assert.equal(sanitized.menu.hidden,false);
assert.equal(sanitized.joy.hidden,false);
assert.equal(sanitized.s4.hidden,true);
assert.equal(sanitized.atk.size,350);
assert.equal(sanitized.atk.y,0);
assert.equal(sanitized.atk.opacity,.25);
assert.equal(defaults.atk.x,HUD_DEFAULTS.atk.x);
const files=Object.fromEntries(await Promise.all([
 'src/main.js','src/ui/touch-controls.js','src/player/player.js','src/combat/combat.js',
 'src/ui/p810-ui.js','src/ui/p10-hud-editor.js','src/ui/p9-panels.js',
 'src/ui/premium-hud-p5.js','src/systems/save.js','src/ui/world-map-p34.js',
 'src/systems/inventory.js'
].map(async p=>[p,await source(p)])));
assert.ok(files['src/main.js'].includes("this.touch?.enabled)) return"),'mobile synthetic mouse ATK suppression');
assert.ok(files['src/main.js'].includes('this.enterImmersive();'),'official click-to-play fullscreen');
assert.ok(files['src/player/player.js'].includes('_torchStashedOffhand'),'smart torch offhand');
assert.ok(files['src/player/player.js'].includes('this._jumpAnimT=0'),'second jump neutralization');
assert.ok(files['src/combat/combat.js'].includes('g.player.dashT<0.065'),'safe dash->attack cancel');
assert.ok(files['src/combat/combat.js'].includes('if(!g.p810Enabled)g.hud.notify'),'combo not in center');
assert.ok(files['src/ui/p810-ui.js'].includes("this.combo.textContent"),'dedicated bottom-center combo');
assert.ok(files['src/ui/p810-ui.js'].includes("GPU —"),'no fictitious GPU usage');
assert.ok(files['src/ui/p810-ui.js'].includes("this.editor.register('radar',map.mini)"),'moveable real radar');
assert.ok(files['src/ui/p10-hud-editor.js'].includes("document.addEventListener('pointerdown',this.onDown,true)"),'input capture for safe editing');
assert.ok(files['src/ui/p10-hud-editor.js'].includes("localStorage.setItem(HUD_LAYOUT_KEY"),'persist HUD');
assert.ok(files['src/ui/p9-panels.js'].includes("this.inv.render('equipment')"),'INVENTARIO -> equipo');
assert.ok(files['src/ui/p9-panels.js'].includes("this.inv.render('all')"),'MOCHILA -> all items');
assert.ok(files['src/ui/p9-panels.js'].includes("this.game.quests.list()"),'mission screen uses live quests');
assert.ok(files['src/systems/save.js'].includes("highfly_p810_save"),'new save key for independent preview');
assert.ok(files['src/ui/world-map-p34.js'].includes("this.zoom||120"),'zoomable minimap');
assert.ok(files['src/systems/inventory.js'].includes("this.game.player._torchStashedOffhand=null"),'weapon cancels torch stash');
console.log('HIGHFLY P8+P9+P10: normalized landscape layout, input isolation, 360 combat, slot semantics, preview saves and HUD editor — PASS');
