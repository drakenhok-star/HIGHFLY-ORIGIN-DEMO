import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {P183B_CAMPS,P183B_COAST_TEMPLATE,biomeValidP183b,resolveBiomeCampP183b,resolveCoastSitesP183b} from '../src/world/biome-families-p183b.js';
import {ITEM_DB} from '../src/systems/inventory.js';
import {P183_BONUS_TABLES} from '../src/systems/loot-table-p183.js';
const types=new Set(P183B_CAMPS.map(x=>x.type));
for(const t of ['boar','goblin','fox','stag','forest_wolf','snow_alpha','yeti','bandit','orc'])assert.ok(types.has(t));
const biomes=new Set(P183B_CAMPS.map(x=>x.biome));
for(const b of ['prairie','forest','snow','road','ruins'])assert.ok(biomes.has(b));
assert.equal(P183B_COAST_TEMPLATE.type,'crab');
const campIds=new Set();
for(const c of P183B_CAMPS){
 assert.ok(!campIds.has(c.id),'unique camp IDs');campIds.add(c.id);
 assert.ok(c.count<=5,'P18.3d cap: at most five per camp');assert.ok(c.respawn>85);
 assert.equal(ITEM_DB[c.drop].type,'misc','real inventory material '+c.type);
 assert.equal(ITEM_DB[c.drop].damage,undefined,'equipment does not affect Core');
 assert.equal(ITEM_DB[c.drop].armor,undefined,'material is not armor');
 assert.ok(c.clips.idle&&c.clips.walk&&c.clips.attack&&c.clips.death);
}
const t={waterY:0,getHeight(x){return x<0?-2:1;},getSlope(){return 0;}};
assert.equal(biomeValidP183b(t,4,0,'coast'),true);
assert.equal(biomeValidP183b(t,-4,0,'coast'),false);
assert.equal(biomeValidP183b(t,4,0,'coast',()=>false),false);
assert.ok(resolveCoastSitesP183b(t).length<=2);
assert.equal(resolveBiomeCampP183b(t,{x:10,z:0,biome:'forest'},()=>false),null);
const snowy={waterY:-2,getHeight(){return 70;},getSlope(){return .2;}};
assert.ok(biomeValidP183b(snowy,120,130,'snow'));
assert.ok(!biomeValidP183b(snowy,120,130,'forest'));
for(const [name,expected,clips] of [
 ['crab_quaternius_cc0',7,['Walk','Bite_Front','Idle','Death']],
 ['goblin_quaternius_cc0',12,['Run','Attack','Idle','Death']],
 ['orc_quaternius_cc0',43,['Walk','Punch','Idle','Death']],
 ['stag_quaternius_cc0',38,['Gallop','Idle','Death']],
 ['fox_quaternius_cc0',51,['Gallop','Idle','Death']],
 ['yeti_quaternius_cc0',4,['Walk','Bite_Front','Idle','Death']],
]){
 const file=new URL('../assets/models/'+name+'.glb',import.meta.url);
 const buf=await readFile(file);
 assert.equal(buf.toString('ascii',0,4),'glTF');
 const len=buf.readUInt32LE(12),json=JSON.parse(buf.toString('utf8',20,20+len));
 const joints=json.skins?.[0]?.joints?.length;
 assert.equal(joints,expected,name+' rig intact');
 for(const c of clips)assert.ok(json.animations.some(a=>a.name===c),name+' missing '+c);
 assert.ok(json.extensionsUsed?.includes('EXT_meshopt_compression'),name+' requires local meshopt');
}
if(process.env.HF_REQUIRE_BOAR==='1'){
 const file=new URL('../assets/models/boar_gobkit_cc0.glb',import.meta.url);
 assert.ok(existsSync(file),'CI must source original Gobkit CC0 model');
 const buf=await readFile(file);
 assert.equal(buf.toString('ascii',0,4),'glTF');
 const len=buf.readUInt32LE(12),json=JSON.parse(buf.toString('utf8',20,20+len));
 assert.ok(json.skins?.length>0,'real boar must be skinned');
 for(const key of ['idle','attack','walk','dead'])assert.ok(json.animations?.some(a=>a.name.toLowerCase()===key),'Gobkit must have '+key);
}
const assets=await readFile(new URL('../src/core/assets.js',import.meta.url),'utf8');
const enemies=await readFile(new URL('../src/entities/enemies.js',import.meta.url),'utf8');
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(assets,/setKTX2Loader\(ktx2\)/);
assert.match(assets,/boar_gobkit_cc0\.glb/);
assert.match(enemies,/_spawnBiomeWorldP183b\(/);
assert.match(enemies,/resolveCoastSitesP183b\(/);
assert.match(enemies,/other\.type!==e\.type/);
assert.match(enemies,/e\.type==='boar'/);
assert.match(main,/p183bEnabled/);
for(const entry of Object.entries(P183_BONUS_TABLES))for(const obj of entry[1])assert.ok(ITEM_DB[obj.id]);
console.log('P18.3b BIOME PASS: camps, shorelines, materials, 6 Quaternius rigs, AI wiring, optional CC0 boar');
