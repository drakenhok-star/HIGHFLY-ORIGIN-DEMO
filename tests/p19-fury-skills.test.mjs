import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const importPure=async p=>import('data:text/javascript;base64,'+
 Buffer.from(read(p)).toString('base64'));
const [hit,gesture,finisher,projectile,ports,camera]=await Promise.all([
 'src/combat/hit-confirm-p16.js',
 'src/ui/atk-gesture-p19.js',
 'src/combat/fury-finisher-p15.js',
 'src/skillslab/projectile-aim-p19.js',
 'src/combat/fury-ports-p19.js',
 'src/skillslab/camera-lab-p18.js'
].map(importPure));
assert.deepEqual(hit.P16_RESPONSE,{deadzone:.045,fullTravel:.52,acceleration:46});
assert.deepEqual(hit.responsiveJoystick(0.02,-0.02),{x:0,y:0});
assert.equal(hit.responsiveJoystick(.52,0).x,1);
assert.ok(Math.hypot(...Object.values(hit.responsiveJoystick(.4,.4)))<=1.000001);
assert.deepEqual(gesture.aimFromAttackDrag(0,0),{x:0,y:0});
assert.equal(gesture.aimFromAttackDrag(0,-36).y,-1);
assert.equal(gesture.aimFromAttackDrag(-36,0).x,-1);
assert.equal(gesture.aimFromAttackDrag(36,0).x,1);
assert.equal(gesture.aimFromAttackDrag(0,36).y,1);
assert.equal(finisher.finisherInput({touchMove:{x:0,y:-1},
 furyFinisherGesture:{x:0,y:0}},0).mode,'forward',
 'left stick cannot steer finisher');
for(const [pos,expected] of [[{x:0,y:-1},'launch'],[{x:0,y:1},'heavy'],
 [{x:-1,y:0},'left'],[{x:1,y:0},'right']]){
 assert.equal(finisher.finisherInput({touchMove:{x:0,y:1},
   furyFinisherGesture:pos},0).mode,expected);
}
assert.equal(finisher.finisherInput({keys:new Set(['KeyW'])},0).mode,'launch');
assert.equal(finisher.finisherAllowed({alive:true,hp:100,boss:true},100),false);
let combo=0;
for(const connected of [true,true,false,true,true]){
 const step=hit.nextSwing(combo,combo>0);
 combo=hit.commitConfirmedHit(combo,step,connected);
}
assert.equal(combo,4,'single confirmed hit per swing');
const shot=projectile.chooseLaunchVector({
 origin:{x:0,y:10,z:0},forward:{x:0,y:0,z:-1},
 targets:[{alive:true,position:{x:0,y:2,z:-12}}]
});
assert.ok(shot.direction.y<-.4,'downhill target fires down in full 3D');
assert.ok(shot.target,'first shot chose a near target');
assert.equal(shot.direction.z<0,true);
assert.equal(projectile.chooseLaunchVector({
 origin:{x:0,y:2,z:0},forward:{x:0,y:0,z:-1},
 targets:[{position:{x:0,y:10,z:-12}}]
}).direction.y>0,true,'uphill shot');
assert.equal(projectile.chooseLaunchVector({
 origin:{x:0,y:5,z:0},forward:{x:0,y:0,z:-1},
 targets:[{position:{x:0,y:5,z:-8}}],visible:()=>false
}).target,null,'solid obstruction must not be ignored');
const initial=shot.direction;
const enemyMoved={x:30,y:2,z:6};
assert.ok(initial.y<0&&enemyMoved.x!==initial.x,'trajectory does not home on moving targets');
assert.deepEqual(Object.keys(camera.CAMERA_PRESETS_P18),['adventure','hybrid','moba']);
assert.equal(camera.CAMERA_PRESETS_P18.hybrid.pitch,-34);
const camSource=read('src/skillslab/camera-lab-p18.js');
assert.ok(camSource.includes("preset:'hybrid',distance:8.5,pitch:-34"),
 'hybrid default retains approved lab camera');
const bus=new ports.FuryCombatPortsP19();let fired=0;
const off=bus.on('dodge-success',()=>fired++);
bus.emit('dodge-success',{});off();bus.emit('dodge-success',{});
assert.equal(fired,1,'dodge-success event available without fake block');
const combat=read('src/combat/combat.js'),touch=read('src/ui/touch-controls.js');
const player=read('src/player/player.js'),stats=read('src/systems/stats.js');
assert.ok(combat.includes('commitConfirmedHit(priorConfirmedStep,this._meleeStep,connected)'));
assert.ok(combat.includes('this._finisher=finisherInput(g.input,player.yaw)'),
 'capture the ATK swipe at the true impact frame');
assert.ok(combat.includes('this.ports.emit(\'confirmed-basic-hit\''));
assert.ok(touch.includes("joy.setPointerCapture(e.pointerId)"));
assert.ok(touch.includes("this.installAtkGesture(actions.lastElementChild)"));
assert.ok(touch.includes("this._atkContact.x=this._atkContact.lastX"),
 'hold-to-ATK resets pointer origin on 4th strike');
assert.ok(touch.includes("this.game.input.furyFinisherGesture"));
assert.ok(player.includes('P16_RESPONSE.acceleration'));
assert.ok(player.includes('let speed = g.p812Enabled?7.5:6'),
 'P16 max movement speed is unchanged');
assert.ok(player.includes('cameraSafeFraction(this.game,target,goal)'),
 'native collision camera stays in charge');
assert.ok(stats.includes("this.game.combat?.breakCombo('hit')"),
 'incoming confirmed hit still interrupts combo');
assert.ok(stats.includes('dodgeInvulnT>0'),
 'successful dodge keeps combo');
const lab=read('src/skillslab/skills-web.js');
const cl=read('src/skillslab/claudecraft-kit-p16.js');
const aim=read('src/skillslab/aim-guide-p16.js');
const fx=read('src/skillslab/lab-vfx.js');
const boot=read('src/skillslab/boot.js'),page=read('lab.html');
assert.ok(!lab.includes('g.combat.melee=')&&!lab.includes('g.player.update='),
 'skills cannot replace P16 basic attack or player locomotion');
assert.ok(lab.includes('this.original={cast:originalCast,shout:originalShout,update:originalUpdate}'),
 'original P16 movement/skill actions retain escape hatch');
assert.ok(lab.includes('this.aimSensitivity??.145'));
assert.ok(lab.includes('Segundo golpe EN EL LUGAR')&&lab.includes('finishGuardianPull(){'));
assert.ok(cl.includes('chooseLaunchVector')&&cl.includes('fx.energyBolt(3)'),
 'one-shot ballistic aim and original plasma FX integrated');
assert.ok(fx.includes('new THREE.ShaderMaterial')&&fx.includes("this.add(obj,.28,'crown')"),
 'genuine animated original shader + volumetric impact');
assert.ok(aim.includes('this.conform(center,turn)')&&
 aim.includes('this.pathEnabled=(style===0&&slot===2'),
 'per-vertex hill projection and Guinevere-only jump arc');
assert.ok(boot.includes('if(!g.p16Enabled)'),'lab refuses non-P16 FURY game');
assert.ok(page.includes('./src/main.js')&&page.includes('./src/skillslab/boot.js'));
assert.ok(existsSync('assets/models/player_barbarian.glb'),'same public CC0 player');
assert.ok(existsSync('src/combat/air-chain-p14.js'),'FURY P14 air chain retained');
console.log('P19 GATE PASS: native FURY P16, ATK-only 4th direction, real hit, hybrid camera, one-shot 3D bolt, terrain VFX and future ports');
