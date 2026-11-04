import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const moduleFrom=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const air=await import(moduleFrom(await src('src/combat/air-chain-p14.js')));
assert.equal(air.airStrikeProfile(1,false,{type:'wolf',hitRadius:.75}).damageMultiplier,1);
assert.equal(air.airStrikeProfile(1,true,{type:'wolf',hitRadius:.75}).damageMultiplier,1.15);
assert.equal(air.airStrikeProfile(4,true,{type:'wolf',hitRadius:.75}).launch,true);
assert.equal(air.airStrikeProfile(4,true,{type:'dragon',hitRadius:1.2}).launch,false,'boss/dragon immune to aerial launch');
assert.equal(air.airStrikeProfile(4,true,{type:'wolf',hitRadius:2.2}).launch,false,'big enemies resist juggle');
let t=air.advanceComboClock(.6,1.5,.2,false,2);
assert.equal(t.timer,.6,'jump should not silently erase the existing combo');
assert.ok(t.grace<1.5);
t=air.advanceComboClock(.6,.0,.2,false,2);
assert.ok(t.timer<.6,'air-grace is bounded, not invincible');
t=air.advanceComboClock(.6,1.5,.2,true,2);
assert.ok(t.timer<.6,'combo expires normally on ground');
assert.equal(air.canMaintainAirChain(2,false,.3),true);
assert.equal(air.canMaintainAirChain(2,true,.3),false);
const surfText=await src('src/player/fury-surfaces-p13.js');
const travelText=(await src('src/player/fury-traversal-p13.js')).replace("'./fury-surfaces-p13.js'",JSON.stringify(moduleFrom(surfText)));
const {FuryTraversalP13}=await import(moduleFrom(travelText));
const rock={x:0,z:0,r:1,minY:-.5,maxY:2.2,kind:'rock'};
const p={pos:{x:1.5,y:1.1,z:0},vel:{x:0,y:-2,z:0},onGround:false,dashT:-1,
 bodyYaw:0,_jumpCount:1,_jumpBufferT:0,rig:{root:{rotation:{x:0,z:0},position:{y:0}}}};
const input={touchUseHold:false,keys:new Set()};
const stats={sp:40,useStamina(n){if(this.sp<n)return false;this.sp-=n;return true;}};
const game={p14Enabled:true,input,stats,player:p,scatter:{obstacles:{query:()=>[rock]}},
 terrain:{getHeight:()=>0},structures:{colliders:[]},interiors:{inside:false}};
const f=new FuryTraversalP13(game,p);
f.update(.016,true,-1,0);
assert.notEqual(f.mode,'HANG','no automatic magnet grab without USAR');
input.touchUseHold=true;f.reset();p.pos={x:1.5,y:1.1,z:0};p.vel.y=-2;
f.update(.016,true,-1,0);
assert.equal(f.mode,'HANG','hold USAR catches the rock ledge');
input.touchUseHold=false;f.update(.016,true,-1,0);
assert.equal(f.mode,'AIR','release USAR releases the ledge');
const before=stats.sp;
assert.equal(f.beginFlip(1,0),true);
assert.equal(stats.sp,before,'flip is a no-cost visual of already-paid second jump');
const ps=['src/main.js','src/player/player.js','src/combat/combat.js','src/ui/p10-hud-editor.js','src/ui/p810-ui.js',
 'src/ui/p14-polish.js','src/ui/touch-controls.js','src/world/structures.js','src/systems/save.js'];
const files=Object.fromEntries(await Promise.all(ps.map(async p=>[p,await src(p)])));
const checks=[
 ['P14 isolated runtime',files['src/main.js'].includes('this.p14Enabled=this.p13Enabled')],
 ['sprint consumes no energy',files['src/player/player.js'].includes('g.p14Enabled || stats.useStamina')],
 ['air transitions preserve chain',files['src/player/player.js'].includes("g.combat?.keepAirCombo('double-jump')")],
 ['air combo ticks under clock',files['src/combat/combat.js'].includes('advanceComboClock(')],
 ['aerial melee has vertical reach',files['src/combat/combat.js'].includes('bodyVertical>strike.maxVerticalDistance')],
 ['launcher uses enemy vertical knockback',files['src/combat/combat.js'].includes('e.kbVel.y=Math.max')],
 ['touch grip state',files['src/ui/touch-controls.js'].includes('touchUseHold=pressed')],
 ['no combo ghost at menu',files['src/ui/p810-ui.js'].includes("this.combo.style.setProperty('display'")],
 ['editor suppresses empty combo',files['src/ui/p10-hud-editor.js'].includes("id==='combo'&&this.game.p14Enabled&&!el.textContent")],
 ['bag physical row gap',files['src/ui/p14-polish.js'].includes('row-gap:12px')],
 ['authored rock colliders',files['src/world/structures.js'].includes("'tower-rock'")],
 ['monolith colliders',files['src/world/structures.js'].includes("'stone-pillar'")],
 ['P14 write key independent',files['src/systems/save.js'].includes("highfly_p14_save")]
];
for(const [name,ok] of checks)assert.ok(ok,name);
console.log('HIGHFLY P14: air-chain, launch policy, USAR grip/release, no double-cost flips, collision/UI/save gates — PASS');
