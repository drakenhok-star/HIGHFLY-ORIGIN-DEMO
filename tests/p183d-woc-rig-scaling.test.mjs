import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const blob=await readFile(new URL('../assets/models/wolf_claudecraft_quaternius_cc0.glb',import.meta.url));
assert.equal(blob.toString('ascii',0,4),'glTF');
assert.equal(blob.readUInt32LE(4),2);
assert.equal(blob.readUInt32LE(8),blob.length);
assert.equal(blob.length,336460);
const length=blob.readUInt32LE(12),j=JSON.parse(blob.toString('utf8',20,20+length));
for(const n of ['Walk','Idle','Gallop','Attack','Death'])assert.ok(j.animations.some(a=>a.name===n),n);
assert.equal(j.skins[0].joints.length,51);
assert.ok(j.extensionsRequired.includes('EXT_meshopt_compression'));
const assets=await readFile(new URL('../src/core/assets.js',import.meta.url),'utf8');
assert.match(assets,/animatedSkinBoundsP183d\(gltf\)/);
assert.match(assets,/applyBoneTransform\(i,point\)/);
assert.match(assets,/model\.position\.y=-entry\.footMinY\*s/);
assert.match(assets,/wolf_claudecraft_quaternius_cc0\.glb/);
for(const model of ['spider','crab','goblin','orc','stag','fox','yeti','wolf_claude'])
 assert.match(assets,new RegExp(model+': \\{ targetHeight: [0-9.]+, animatedBounds: true'),model);
console.log('P183d PASS: CC0 WOC Wolf GLB, 51 bones, WOC animated skin bounds, offset and 8 species');
