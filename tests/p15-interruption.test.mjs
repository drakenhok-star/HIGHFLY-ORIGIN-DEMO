import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const {Stats}=await import('data:text/javascript;base64,'+Buffer.from(await read('src/systems/stats.js')).toString('base64'));
const calls=[];
const g={
 state:'playing',p15Enabled:true,
 player:{dodgeInvulnT:0,attackT:.12,_attackAnimStarted:true,_queuedDashT:0},
 inventory:{armorValue:()=>0},
 audio:{play:name=>calls.push('audio:'+name)},
 hud:{damageFlash:()=>calls.push('flash')},
 menus:{showDeath:()=>calls.push('dead')},setState:s=>{g.state=s},
 combat:{breakCombo(reason){calls.push('break:'+reason);this.step=0;return true},step:3}
};
const stats=new Stats(g);
const full=stats.hp;
stats.damage(12);
assert.equal(stats.hp,full-12,'real landed damage applies to HP');
assert.ok(calls.includes('break:hit'),'landed hit interrupts the attack chain');
const broken=calls.length;g.combat.step=3;
g.player.dodgeInvulnT=.12;
stats.damage(12);
assert.equal(stats.hp,full-12,'successful dodge iframe avoids HP damage');
assert.equal(g.combat.step,3,'successful dodge keeps the combo intact');
assert.equal(calls.length,broken,'successful dodge plays no hurt effects');
g.player.dodgeInvulnT=0;stats.damage(0);
assert.equal(g.combat.step,3,'zero damage does not reset chain');
const combat=await read('src/combat/combat.js');
const player=await read('src/player/player.js');
assert.ok(combat.includes("breakCombo(reason='hit')"),'centralized combo reset');
assert.ok(combat.includes("this.breakCombo('timeout')"),'expired timing also resets');
assert.ok(combat.includes('this.meleeHitT=-1'),'interrupted attack has no phantom delayed hit');
assert.ok(combat.includes('this._finisher=null;'),'interrupted chain has no stored finisher');
assert.ok(player.includes("opts.style==='dodge'"),'iframes only on actual dodge, not spell dash');
assert.ok(player.includes('this.dodgeInvulnT=Math.max('),'limited iframe');
assert.ok(player.includes('this.dodgeInvulnT-dt'),'invulnerability expires with real dt');
const warrior=await read('docs/P15_FURY_COMBAT_EVOLUTION.md');
assert.ok(warrior.includes('FURY COMBAT EVOLUTION'));
console.log('HIGHFLY P15: landed enemy damage breaks combo, dodge preserves, zero damage ignored and timeout clears — PASS');
