// HIGHFLY P7: real lightweight logic, controller behavior and source safety.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const load=async path=>{
 const src=await readFile(new URL('../'+path,import.meta.url),'utf8');
 return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
};
const motion=await load('src/combat/motion-p7.js');
const {NatureObstaclesP7}=await load('src/world/obstacles-p7.js');
const nearly=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,'Expected '+a+'≈'+b);
nearly(motion.worldMove(0,-1,0).z,-1);
nearly(motion.worldMove(1,0,0).x,1);
nearly(motion.worldMove(1,-1,0).strength,1);
nearly(motion.worldMove(0,-1,Math.PI/2).x,-1);
nearly(motion.worldMove(.25,0,0).strength,.25);
const dash=motion.resolveDashDirection({x:-1,y:0},0,{x:0,z:-1},0);
nearly(dash.x,-1);
assert.equal(motion.relativeDodgeClip(dash,0),'Dodge_Left');
assert.equal(motion.relativeDodgeClip({x:0,z:1},0),'Dodge_Backward');
assert.equal(motion.relativeDodgeClip({x:1,z:0},0),'Dodge_Right');
assert.equal(motion.comboStep(0,false),1);
assert.equal(motion.comboStep(1,true),2);
assert.equal(motion.comboStep(2,true),3);
assert.equal(motion.comboStep(3,true),4);
assert.equal(motion.comboStep(4,true),1);
assert.equal(motion.comboStep(3,false),1);
assert.equal(motion.canAirDash(0,70),true);
assert.equal(motion.canAirDash(1,32),true);
assert.equal(motion.canAirDash(2,70),false);
assert.equal(motion.canJump(1,false,12),true);
assert.equal(motion.canJump(2,false,100),false);
const target=motion.closestAttackTarget([
 {id:'behind',alive:true,visible:true,distance:2,hitRadius:.5},
 {id:'front',alive:true,visible:true,distance:3,hitRadius:.5},
 {id:'wall',alive:true,visible:false,distance:1,hitRadius:.5}
],4.5);
assert.equal(target.id,'behind','auto target must include enemies behind the player');
assert.equal(motion.closestAttackTarget([{id:'far',alive:true,visible:true,distance:20}],4.5),null);
const grid=new NatureObstaclesP7(12);
grid.register(0,0,.8,0,7,'tree');
grid.register(12,0,1.2,0,3,'rock');
assert.equal(grid.count,2);
assert.equal(grid.blocked(.2,1,.1),true);
assert.equal(grid.blocked(.2,20,.1),false);
assert.equal(grid.blocked(6,1,6),false);
const position={x:.2,z:0};
grid.collide(position,.43,1);
assert.ok(Math.hypot(position.x,position.z)>=1.22,'physical radius must repel player');
assert.equal(grid.query(200,200,1).length,0);
const texts=Object.fromEntries(await Promise.all([
 'src/player/player.js','src/combat/combat.js','src/combat/targeting-p6.js',
 'src/ui/premium-hud-p5.js','src/ui/inventory-p7.js','src/world/scatter.js',
 'src/systems/save.js','src/systems/inventory.js','src/main.js'
].map(async p=>[p,await readFile(new URL('../'+p,import.meta.url),'utf8')])));
assert.ok(texts['src/player/player.js'].includes('resolveDashDirection'));
assert.ok(texts['src/player/player.js'].includes('g.scatter.obstacles.collide'));
assert.ok(texts['src/combat/combat.js'].includes('attackTarget(4.5)'));
assert.ok(texts['src/ui/premium-hud-p5.js'].includes('new PremiumInventoryP7(this)'));
assert.ok(texts['src/ui/inventory-p7.js'].includes('skeletonClone'));
assert.ok(texts['src/ui/inventory-p7.js'].includes('EQUIPAR MANO SECUNDARIA'));
assert.ok(texts['src/systems/save.js'].includes('highfly_p7_save'));
assert.ok(texts['src/systems/inventory.js'].includes('offhandDamage'));
assert.ok(texts['src/main.js'].includes('p7Enabled'));
console.log('P7: 360-degree attack, analog direction, dodge clips, double dash budget, combo, spatial obstacles, inventory, save isolation — PASS');
