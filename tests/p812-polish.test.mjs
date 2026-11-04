import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const src=Object.fromEntries(await Promise.all([
 'src/main.js','src/player/player.js','src/ui/touch-controls.js','src/ui/p810-ui.js',
 'src/ui/p9-panels.js','src/ui/p10-hud-editor.js','src/ui/p812-polish.js',
 'src/ui/inventory-p7.js','src/ui/world-map-p34.js','src/ui/performance-p2.js',
 'src/systems/save.js','src/systems/stats.js','src/entities/npc.js'
].map(async p=>[p,await read(p)])));
const checks=[
 ['player speed 7.5',src['src/player/player.js'].includes('g.p812Enabled?7.5:6')],
 ['sprint 11.2',src['src/player/player.js'].includes('g.p812Enabled?11.2:10')],
 ['velocity smoothing faster',src['src/player/player.js'].includes('g.p812Enabled?17:10')],
 ['run toggles on touch',src['src/ui/touch-controls.js'].includes('this.runToggle=!this.runToggle')],
 ['run button stays visible',src['src/ui/touch-controls.js'].includes("this.runButton?.classList.toggle('hf-p812-running'")],
 ['thermal saving DPR',src['src/ui/performance-p2.js'].includes('game.p812Eco?.72:.88')],
 ['thermal FPS cap',src['src/main.js'].includes('time-lastEcoFrame<1000/30')],
 ['direct FLUID no composer',src['src/main.js'].includes('game.renderer.render(game.scene,game.camera)')],
 ['no render under inventory',src['src/main.js'].includes("game.state==='inventory'||game.state==='quests'")],
 ['only one perf widget',src['src/ui/p812-polish.js'].includes('body.hf-p812 #hf-audit')],
 ['combo top',src['src/ui/p812-polish.js'].includes('#hf-p810-combo')],
 ['pin tracks quest',src['src/ui/world-map-p34.js'].includes('trackQuest(id)')],
 ['map pin resolves actual npc',src['src/ui/world-map-p34.js'].includes("id==='q2'?'sigrid':'olaf'")],
 ['map pin sees selected mission',src['src/ui/p9-panels.js'].includes('worldMapP34?.trackQuest(q.id)')],
 ['bag scrolling',src['src/ui/p812-polish.js'].includes('grid-auto-rows')],
 ['no torch button in details',src['src/ui/inventory-p7.js'].includes('if(!this.game.p812Enabled)')],
 ['empty slot offers bag',src['src/ui/inventory-p7.js'].includes('ABRIR MOCHILA · ')],
 ['stats moved to settings',src['src/ui/p9-panels.js'].includes('ESTADÍSTICAS REALES')],
 ['editor minimizable',src['src/ui/p10-hud-editor.js'].includes("this.panel.classList.toggle('hf-p812-mini')")],
 ['prompt translated',src['src/player/player.js'].includes("'Hablar con '+npc.name")],
 ['autosave translated',src['src/systems/save.js'].includes("Guardado automático")],
 ['isolated save',src['src/systems/save.js'].includes("highfly_p812_save")]
];
for(const [label,ok] of checks)assert.ok(ok,'P812 missing: '+label);
const layoutText=await read('src/ui/p10-layout.js');
const layout=await import('data:text/javascript;base64,'+Buffer.from(layoutText).toString('base64'));
assert.equal(layout.HUD_LAYOUT_KEY,'hf_p812_hud_layout_v2');
assert.ok(layout.HUD_DEFAULTS.combo.y<.08);
for(const id of ['run','jump','dash','use','s1','atk'])
 assert.ok(layout.HUD_DEFAULTS[id].size>40,id+' button smaller than expected');
assert.equal(layout.sanitizeHudLayout({atk:{hidden:true}}).atk.hidden,false);
console.log('HIGHFLY P812: action core, selected quest pins, visual cleanup, scrollable bag, isolated save, ECO — PASS');
