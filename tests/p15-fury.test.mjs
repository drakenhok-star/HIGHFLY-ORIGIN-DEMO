// HIGHFLY P15 FURY Combat 2.0 — no browser or GPU required.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const loaded=await import('data:text/javascript;base64,'+
 Buffer.from(await read('src/combat/fury-combat-p15.js')).toString('base64'));
const {FURY_STRIKES_P15,strikeProfile,resolveCombatContext,canCancelAction,
  reactionPolicy,pickMeleeTarget,buildSkillContract}=loaded;
assert.equal(FURY_STRIKES_P15.length,4);
assert.deepEqual(FURY_STRIKES_P15.map(x=>x.step),[1,2,3,4]);
assert.deepEqual(FURY_STRIKES_P15.map(x=>x.clip),[
 '1H_Melee_Attack_Slice_Diagonal','1H_Melee_Attack_Slice_Horizontal',
 '1H_Melee_Attack_Stab','1H_Melee_Attack_Chop']);
for(let step=1;step<=4;step++){
 const p=strikeProfile(step,'ground');
 assert.ok(p.hitAt<p.recoveryAt&&p.recoveryAt<p.duration,'physical hit occurs before cancel and recovery');
 assert.ok(p.cooldown>=p.recoveryAt,'cannot reopen attack before recovery begins');
 assert.ok(p.fade<=.1,'animation crossfade should be short on mobile');
 assert.equal(canCancelAction({kind:'attack',elapsed:p.hitAt-.005,step,request:'dash'}),false);
 assert.equal(canCancelAction({kind:'attack',elapsed:p.recoveryAt+.005,step,request:'dash'}),true);
 assert.equal(canCancelAction({kind:'attack',elapsed:p.hitAt+.005,step,request:'jump'}),true);
 assert.equal(canCancelAction({kind:'attack',elapsed:p.hitAt-.005,step,request:'jump'}),false);
}
assert.equal(strikeProfile(4,'plunge').hitAt,strikeProfile(4,'ground').hitAt+.025);
assert.equal(resolveCombatContext({grounded:false,verticalSpeed:-7}),'plunge');
assert.equal(resolveCombatContext({grounded:false,verticalSpeed:4}),'air');
assert.equal(resolveCombatContext({grounded:true,dashRecovery:true}),'dash-followup');
assert.equal(resolveCombatContext({grounded:true,runSpeed:11}),'running');
assert.equal(resolveCombatContext({grounded:true,runSpeed:0}),'ground');
assert.ok(reactionPolicy({type:'wolf',step:4,airborne:true}).launch);
assert.ok(reactionPolicy({type:'wolf',step:4,airborne:true}).stun>.2);
assert.equal(reactionPolicy({type:'dragon',step:4,airborne:true}).launch,false);
assert.equal(reactionPolicy({type:'draugr',boss:true,step:4,airborne:true}).stun,0);
assert.equal(reactionPolicy({type:'wolf',step:4,airborne:true,remainingHp:0}).stun,0);
const o={x:0,z:0},enemy=(x,z,name)=>({alive:true,hitRadius:.7,name,group:{position:{x,z}}});
const wolfA=enemy(1,0,'a'),wolfB=enemy(2,0,'b'),far=enemy(10,0,'far');
assert.equal(pickMeleeTarget([far,wolfB,wolfA],o),wolfA);
assert.equal(pickMeleeTarget([wolfB,wolfA],o,wolfB),wolfB,'target stickiness across chained strikes');
assert.equal(pickMeleeTarget([wolfB,wolfA],o,wolfB,wolfA),wolfA,'manual lock beats previous target');
assert.equal(pickMeleeTarget([far],o),null);
const fireball=buildSkillContract({id:'fireball',kind:'magic',aim:'line',
 cost:18,cooldown:2,clip:'Spellcast_Shoot',allowAir:true});
assert.equal(fireball.resource,'mp');
assert.equal(fireball.allowAir,true);
const slash=buildSkillContract({id:'aerial_slash',kind:'physical',aim:'melee',
 cost:12,cooldown:.8,allowAir:true,allowWall:false});
assert.equal(slash.resource,'energy');
assert.throws(()=>buildSkillContract({id:'bad',kind:'magic',aim:'broken',cost:0,cooldown:0}));
assert.throws(()=>buildSkillContract({id:'bad',kind:'magic',aim:'self',cost:-1,cooldown:0}));
const files=['src/main.js','src/player/player.js','src/combat/combat.js','src/ui/p810-ui.js',
 'src/ui/premium-hud-p5.js','src/entities/enemies.js','src/systems/save.js'];
const src=Object.fromEntries(await Promise.all(files.map(async p=>[p,await read(p)])));
for(const [name,result] of [
 ['P15 isolated branch flag',src['src/main.js'].includes('this.p15Enabled=this.p14Enabled')],
 ['removed playtest parkour teleports',src['src/ui/p810-ui.js'].includes('this.game.p14Enabled && !this.game.p15Enabled')],
 ['combat uses contextual profile',src['src/combat/combat.js'].includes('strikeProfile(step,context)')],
 ['dash queue uses recovery window',src['src/ui/premium-hud-p5.js'].includes('g.combat?.canCancelDash()') && src['src/combat/combat.js'].includes('canCancelAction({kind:')],
 ['queued dash executes',src['src/player/player.js'].includes('g.touch?.premium?.tryDash()')],
 ['attack clip crossfade respects context',src['src/player/player.js'].includes('this.game.p15Enabled?this._attackFade')],
 ['projectile segment projection avoids clone',src['src/combat/combat.js'].includes('this._v3.copy(c).sub(this._segmentA)')],
 ['melee impulse is allocation-free',src['src/combat/combat.js'].includes('this._hitImpulse.copy(forward)')],
 ['enemy hitstun suppresses attacks',src['src/entities/enemies.js'].includes('e.hitstunT=Math.max(0,e.hitstunT-dt)')],
 ['P15 save is isolated',src['src/systems/save.js'].includes('highfly_p15_save')],
])assert.ok(result,'missing integration: '+name);
console.log('HIGHFLY P15: real GLB attack clips, cancel windows, target stickiness, hitstun, skill adapter, rendering hygiene, save isolation — PASS');
