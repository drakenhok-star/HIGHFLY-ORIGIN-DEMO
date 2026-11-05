import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(await read('src/combat/hit-confirm-p16.js')).toString('base64'));
const {responsiveJoystick,nextSwing,confirmedDamage,commitConfirmedHit,shouldClaimJoyContact}=m;
assert.deepEqual(responsiveJoystick(0,0),{x:0,y:0});
assert.deepEqual(responsiveJoystick(.01,-.01),{x:0,y:0});
assert.ok(responsiveJoystick(.28,0).x>.35,'partial thumb drag must respond promptly');
assert.equal(responsiveJoystick(.7,0).x,1,'full speed reached before rim');
const diagonal=responsiveJoystick(.5,.5);
assert.ok(Math.abs(diagonal.x-diagonal.y)<1e-6,'symmetrical diagonals');
assert.ok(Math.hypot(diagonal.x,diagonal.y)<=1.000001,'no diagonal speed exploit');
assert.deepEqual(responsiveJoystick(NaN,Infinity),{x:0,y:0});
assert.equal(shouldClaimJoyContact(78,300,{left:80,top:310,right:205,bottom:435},24),true);
assert.equal(shouldClaimJoyContact(280,300,{left:80,top:310,right:205,bottom:435},24),false);
assert.equal(confirmedDamage(100,80),true);
assert.equal(confirmedDamage(100,100),false);
assert.equal(nextSwing(0,false),1);
assert.equal(nextSwing(1,true),2);
assert.equal(nextSwing(2,true),3);
assert.equal(nextSwing(3,true),4);
assert.equal(nextSwing(3,false),1);
assert.equal(nextSwing(4,true),1);
let combo=0;
for(const [landed,expected] of [[true,1],[true,2],[false,2],[true,3],[false,3],[true,4]]){
 const attempt=nextSwing(combo,combo>0);
 combo=commitConfirmedHit(combo,attempt,landed);
 assert.equal(combo,expected,'misses do not advance verified chain');
}
const paths=['src/main.js','src/systems/save.js','src/combat/combat.js','src/player/player.js','src/ui/touch-controls.js','src/core/assets.js','src/entities/enemies.js'];
const S=Object.fromEntries(await Promise.all(paths.map(async p=>[p,await read(p)])));
const checks=[
 ['runtime P16',S['src/main.js'].includes('this.p16Enabled=this.p15Enabled')],
 ['isolated save',S['src/systems/save.js'].includes('highfly_p16_save')],
 ['swing counts after damage',S['src/combat/combat.js'].includes('this.comboStep=commitConfirmedHit(priorConfirmedStep,this._meleeStep,connected)')],
 ['real HP hit check',S['src/combat/combat.js'].includes('confirmedDamage(beforeHP,e.hp)')],
 ['no timer renewal on swing',S['src/combat/combat.js'].includes('if(!g.p16Enabled)this.comboTimer=')],
 ['air miss no grace',S['src/combat/combat.js'].includes('!g.p16Enabled)this.keepAirCombo')],
 ['fast acceleration',S['src/player/player.js'].includes('P16_RESPONSE.acceleration')],
 ['running upper-body',S['src/player/player.js'].includes('playUpperBody(name')],
 ['feet keep running',S['src/player/player.js'].includes("this.rig.play('Running_A'")],
 ['upper layer real bones',S['src/core/assets.js'].includes('supportsUpperBody(name)')],
 ['cached pointer bounds',S['src/ui/touch-controls.js'].includes('this._joyRect||joy.getBoundingClientRect()')],
 ['padded touch pickup',S['src/ui/touch-controls.js'].includes('shouldClaimJoyContact(')],
 ['trainer only opt-in',S['src/entities/enemies.js'].includes("new URLSearchParams(location.search).has('hf_training')")],
 ['trainer immortal',S['src/entities/enemies.js'].includes('e.hp=Math.max(1,e.hp-damage)')]
];
for(const [label,ok] of checks)assert.ok(ok,label);
console.log('HIGHFLY P16 PASS: responsive joystick, confirmed 4-hit chain, training dummy, running attack and safe save');
