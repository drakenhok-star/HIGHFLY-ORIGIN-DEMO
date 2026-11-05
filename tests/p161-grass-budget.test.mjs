import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const src = await read('src/world/grass-cursor-p161.js');
const { GridDiskCursorP161 } = await import('data:text/javascript;base64,' +
  Buffer.from(src).toString('base64'));

// Same grid/disk accept/reject and row-major traversal as original P16.
for (const [x, z, spacing, radius] of [[0, 0, .72, 68], [12.25, -31.6, .72, 68], [-90, 110, .72, 68]]) {
  const cursor = new GridDiskCursorP161(x, z, spacing, radius);
  const pairs = [];
  while (cursor.next()) pairs.push(cursor.ix + ',' + cursor.iz);
  assert.equal(cursor.next(), false);
  const ref = [];
  const centerX = Math.round(x / spacing), centerZ = Math.round(z / spacing);
  const cells = Math.floor(radius / spacing);
  for (let iz = centerZ - cells; iz <= centerZ + cells; iz++) {
    for (let ix = centerX - cells; ix <= centerX + cells; ix++) {
      const dx = ix * spacing - x, dz = iz * spacing - z;
      if (dx * dx + dz * dz <= radius * radius) ref.push(ix + ',' + iz);
    }
  }
  assert.deepEqual(pairs, ref, 'must scan exactly the original P16 grass circle in the same order');
}
assert.throws(() => new GridDiskCursorP161(0,0,0,68), RangeError);

// Integration smoke with mock GPU buffers / fake cells. Do not need WebGL.
let scatterSource = await read('src/world/scatter.js');
scatterSource = scatterSource.replace(/^import .*;\s*$/gm, '');
scatterSource = 'const GridDiskCursorP161 = globalThis.__GridDiskCursorP161;\n' + scatterSource;
globalThis.__GridDiskCursorP161 = GridDiskCursorP161;
const { Scatter } = await import('data:text/javascript;base64,' +
  Buffer.from(scatterSource).toString('base64'));
const mkBuffer = () => ({
  visible: false, count: 0, instanceMatrix: {}, instanceColor: {},
  matrices: 0, colors: 0,
  setMatrixAt() { this.matrices++; },
  setColorAt() { this.colors++; }
});
const position = { x: 0, y: 3, z: 40,
  clone() { return { x:this.x, y:this.y, z:this.z }; }
};
const grass = Object.create(Scatter.prototype);
grass.game = { structures: {}, player: { pos: position } };
grass.p161GrassEnabled = true;
grass.grassMat = { userData: { uTime: { value: 0 } } };
grass._grassAnchor = { x: 1e9, y:0, z:1e9,
  copy(o) { this.x=o.x; this.y=o.y; this.z=o.z; } };
grass.grassMesh = mkBuffer();
grass._grassStandby = mkBuffer();
grass._grassCache = new Map();
grass._grassExclusions = () => [];
grass._gM = { compose() {} };
grass._gQ = { setFromEuler() {} };
grass._gE = { set() {} };
grass._gP = { set() {} };
grass._gS = { set() {} };
grass._gC = { setRGB() {} };
grass.p161GrassStats = { enabled: true, completed: 0, restarted: 0,
  pending: false, lastCells: 0, lastBuildMs: 0, lastStepMs: 0 };
grass._computeGrassCell = (ix, iz) => ((ix + iz) % 3 === 0 ?
  [ix, 3, iz, 0, 1, 1, 1, 1] : null);

let ticks=0;
grass.update(0.016);
assert.ok(grass._grassJob, 'grass build starts');
const original = grass.grassMesh;
while (grass._grassJob && ticks++ < 5000) {
  assert.equal(grass.grassMesh, original, 'old grass stays active until atomic swap');
  assert.equal(original.visible, false, 'first grass field is hidden until ready');
  grass.update(.016);
}
assert.ok(ticks < 5000, 'work must finish eventually');
assert.equal(grass.p161GrassStats.completed, 1);
assert.ok(grass.grassMesh.visible, 'complete mesh becomes visible');
assert.ok(grass.grassMesh.count > 0);
assert.equal(grass.grassMesh.matrices, grass.grassMesh.count, 'no 36k unused zero-matrix writes');
assert.ok(grass.grassMesh.instanceMatrix.needsUpdate);
assert.ok(grass.grassMesh.instanceColor.needsUpdate);
assert.equal(grass._grassAnchor.z, 40);

// Second rebuild reuses hidden buffer. First visible field remains intact.
const firstVisible = grass.grassMesh;
position.x += 8;
grass.update(.016);
assert.ok(grass._grassJob);
assert.equal(firstVisible.visible, true);
ticks=0;
while (grass._grassJob && ticks++ < 5000) grass.update(.016);
assert.ok(ticks < 5000);
assert.equal(firstVisible.visible, false);
assert.equal(grass.p161GrassStats.completed, 2);

const main = await read('src/main.js');
assert.ok(main.includes('game.scatter.update(dt)'), 'movement loop keeps grass');
assert.ok((await read('src/world/scatter.js')).includes("get('hf_p161_grass') === '1'"));
assert.ok((await read('src/world/scatter.js')).includes('if (!this.p161GrassEnabled)'), 'P16 legacy path protected');
console.log('HIGHFLY P16.1 PASS: deterministic disk, incremental grass, atomic swap, preserved legacy mode');
