import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const p='src/skillslab/';
const state=await import('data:text/javascript;base64,'+
  Buffer.from(read(p+'rupture-state-l25.js')).toString('base64'));
const cfg=state.L25_AIR;
assert.equal(cfg.hitsToBreak,4,'four actual flying hits required');
assert.ok(cfg.downSeconds>=4&&cfg.downSeconds<=8,'useful limited grounding window');
assert.equal(state.countedAirHit25(0,-1e9,10),1);
assert.equal(state.countedAirHit25(3,10,14.5),4,'hits within window count');
assert.equal(state.countedAirHit25(3,10,14.501),1,'expired combo resets');
assert.equal(state.advanceFlightOffset25(7,.45,12,.25),4,'dragon descends smoothly');
assert.equal(state.advanceFlightOffset25(.5,.45,12,1),.45,'descent clamps exactly');
assert.equal(state.advanceFlightOffset25(.45,7,3.2,1),3.6500000000000004,
 'rise has a bounded speed and never teleports');
assert.equal(state.advanceFlightOffset25(.45,7,3.2,10),7);
assert.equal(state.advanceFlightOffset25(7,.45,12,-3),7,'negative delta cannot move');
const air=read(p+'aerial-rupture-l25.js'),
  lab=read(p+'skills-web.js'),fx=read(p+'premium-vfx-l25.js'),
  css=read(p+'lab.css'),combat=read('src/combat/combat.js'),
  enemies=read('src/entities/enemies.js');
assert.ok(air.includes('focusedFlightShot23(from,enemy')&&
 air.includes('visible:(_e,chest)=>hasLineOfSight')&&
 air.includes('this.lab.projectiles.push('),
 'aerial shot is optical, range-limited, collision-tested and shared with projectile update');
assert.ok(air.includes('this.lastShot<L25_AIR.shotCooldown')&&
 air.includes('canRupture25(enemy,this.ground())'),
 'ATK has shot rate limit and only actual training dragon collision breaks stability');
assert.ok(lab.includes('if(pr.aerialBasic&&e!==pr.target)continue')&&
 lab.includes('this.airRupture.confirm(e,closest)')&&
 lab.includes('sweptProjectileHit22(old,pr.mesh.position'),
 'four hits count at real swept impact, never at button press');
assert.ok(lab.includes('g.combat.melee=(...args)=>this.airRupture.tryFire()?undefined:originalMelee(...args)'),
 'only focused flyers replace ATK, otherwise P16 melee');
assert.ok(!combat.includes('L25_AIR')&&!enemies.includes('L25_AIR')&&
 !read('src/player/player.js').includes('L25_AIR'),
 'P16 combat/player/enemy core is not patched for L25');
assert.ok(lab.includes('}).filter(item=>item.air);')&&
 lab.includes('this.focusTarget=this.focusTarget===selected?null:selected'),
 'only flyers eligible, with explicit one-tap toggle');
assert.ok(lab.includes('this.game.touch.root.appendChild(this.focusBtn)')&&
 lab.includes("editor.register('focus',this.focusBtn)")&&
 lab.includes("document.querySelector('#hf-p810-bag')"),
 'L26 focus is editable by HUD and cancel follows original MOCHILA');
assert.ok(css.includes('/* L25: flight-only ENFOCAR')&&
 css.includes('#hf-lab-cancel[hidden]'));
assert.ok(lab.includes('if(shouldCancel)return; // zero resource, zero cooldown'),
 'CANCELAR still refunds resources/cooldown');
assert.equal((fx.match(/case '[-a-z]+':/g)||[]).length,15,
 'all 15 original premium VFX profiles are uniquely dispatched');
assert.ok(fx.includes('new THREE.BufferGeometry()')&&
 fx.includes("this.fx.add(mesh,life,'sigil')"),
 'premium accents are batched original procedural geometry with shared lifetime');
assert.ok(existsSync('assets/models/dragon_evolved_quaternius.glb'),
 'original animated Quaternius dragon retained');
assert.ok(lab.includes('this.fx.setQuality(2)'),
 'premium VFX remains the default');
console.log('HIGHFLY L25 PASS: 15 VFX, hit-confirmed opt-in air ATK, 4-hit rupture, smooth descent, P16 preserved.');
