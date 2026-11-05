// P15 directional fourth ATK: pure mechanics + strict integration.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+
 Buffer.from(await read('src/combat/fury-finisher-p15.js')).toString('base64'));
const {finisherInput,finisherAllowed,FURY_FINISHER_P15}=m;
const test=(x,y,yaw=0)=>finisherInput({furyFinisherGesture:{x,y},touchMove:{x:-1,y:1}},yaw);
const almost=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,actual+' != '+expected);
const up=test(0,-1),left=test(-1,0),right=test(1,0),down=test(0,1),neutral=test(0,0);
assert.equal(up.mode,'launch','UP launches enemy vertically');
assert.equal(left.mode,'left','LEFT knockback is camera-left');
assert.equal(right.mode,'right','RIGHT knockback is camera-right');
assert.equal(down.mode,'heavy','DOWN is heavy push, NOT fake ragdoll/knockdown');
assert.equal(neutral.mode,'forward','neutral is ordinary directional finisher');
assert.ok(up.vy>8.5,'launch uses enemy existing vertical-velocity physics');
assert.ok(right.vx>10,'right knockback is visibly lateral at yaw=0');
assert.ok(left.vx<-10,'left knockback is visibly lateral at yaw=0');
assert.ok(down.vz<-11,'down shoves enemy forward with high impulse');
assert.ok(neutral.vz<0,'neutral uses camera-facing orientation');
assert.equal(test(.15,-.3).mode,'forward','micro-adjustments do not accidentally trigger a CC');
assert.equal(test(.7,-.8).mode,'launch','dominant diagonal up launches');
assert.equal(test(-.9,-.35).mode,'left','dominant diagonal left flings left');
const rotated=test(1,0,Math.PI/2);
almost(rotated.vx,1.1*-1);
almost(rotated.vz,-FURY_FINISHER_P15.sideImpulse);
const keys=new Set(['KeyW']);
assert.equal(finisherInput({keys,touchMove:{x:0,y:0}},0).mode,'launch','keyboard support for desktop QA');
const enemy={alive:true,hp:100,hitRadius:.65,type:'wolf',boss:false};
assert.equal(finisherAllowed(enemy,100),true);
assert.equal(finisherAllowed({...enemy,boss:true},100),false);
assert.equal(finisherAllowed({...enemy,type:'dragon'},100),false);
assert.equal(finisherAllowed({...enemy,hitRadius:2.1},100),false);
assert.equal(finisherAllowed({...enemy,blocking:true},100),false,'later block mechanic can prevent directional CC');
assert.equal(finisherAllowed({...enemy,defending:true},100),false);
assert.equal(finisherAllowed({...enemy,ccImmune:true},100),false);
assert.equal(finisherAllowed({...enemy,alive:false},100),false);
assert.equal(finisherAllowed(enemy,0),false,'dead enemies receive no forced CC');
const fight=await read('src/combat/combat.js');
for(const [name,bound] of [
 ['finisher picks fourth strike only',"this._finisher=g.p15Enabled && step===4?finisherInput(g.input,g.player.yaw):null"],
 ['arms a dedicated ATK gesture before the fourth hit','g.touch?.armFinisherGesture?.()'],
 ['locks gesture at impact time','this._finisher=finisherInput(g.input,player.yaw)'],
 ['dedicated touch gesture has no joystick coupling','furyFinisherGesture'],
 ['only real hit receives impulse','finisherAllowed(e,e.hp-dmg)'],
 ['reuse existing knockback vector','this._hitImpulse.set(this._finisher.vx,this._finisher.vy,this._finisher.vz)'],
 ['enemy physics directly receives 3D knockback','e.takeDamage(dmg,this._hitImpulse)'],
 ['blocked attacks have no CC stun','!e.blocking && !e.defending && !e.ccImmune'],
 ['P14 aerial launch disabled in P15','g.p14Enabled&&!g.p15Enabled&&strike.launch'],
 ['finisher resets on new game','this._finisher=null;']
])assert.ok(fight.includes(bound),name);
const original=structuredClone({x:0,y:-1});
const initial=finisherInput({touchMove:original,furyFinisherGesture:{x:0,y:-1}},0);
original.y=1;
assert.equal(initial.mode,'launch','launch vector detached from movement joystick');
assert.equal(finisherInput({touchMove:{x:1,y:-1},
 furyFinisherGesture:{x:0,y:0}},0).mode,'forward',
 'movement joystick must NOT steer ATK remate');
assert.equal(finisherInput({touchMove:{x:1,y:-1}},0).mode,'forward',
 'without ATK gesture movement joystick is ignored');
console.log('HIGHFLY P19 ATK DIRECCIONAL: ↑ lanzamiento, ←→ golpes laterales, ↓ empuje, neutro frontal, jefes/guardia inmunes — PASS');
