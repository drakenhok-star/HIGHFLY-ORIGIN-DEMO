import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const source = await read('src/world/terrain.js');

// Minimal geometry implementation for a deterministic, GPU-free exactness test.
class PlaneGeometry {
  constructor(width, depth, nx, nz) {
    const n = (nx + 1) * (nz + 1);
    const data = new Float32Array(n * 3);
    let i = 0;
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      data[i++] = (ix / nx - .5) * width;
      data[i++] = 0;
      data[i++] = (iz / nz - .5) * depth;
    }
    this.attributes = { position: {
      count:n,
      getX:i => data[i*3],
      getZ:i => data[i*3+2],
      setY:(i,v) => { data[i*3+1]=v; },
      array:data
    }};
    this.disposed = false;
  }
  rotateX() { return this; }
  setAttribute(k,v) { this.attributes[k] = v; }
  computeVertexNormals() { this.normalsComputed=true; }
  dispose() { this.disposed=true; }
}
class BufferAttribute { constructor(array,itemSize) { this.array=array; this.itemSize=itemSize; } }
class Mesh {
  constructor(geometry,material) {
    this.geometry=geometry; this.material=material;
    this.userData={};
    this.position={set:(x,y,z)=>{this.xyz=[x,y,z];}};
  }
}
const THREE = { PlaneGeometry, BufferAttribute, Mesh };
const Terrain = Function('THREE', source.replace(/^import .*;\s*$/gm,'')
  .replace('export class Terrain','class Terrain') + '\nreturn Terrain;')(THREE);
const setup = (mode) => {
  const instances = [];
  const terrain = Object.create(Terrain.prototype);
  terrain.game = {
    player:{pos:{x:3,z:30}},
    camera:{position:{x:3,z:30}},
    scene:{
      add:m=>instances.push(m),
      remove:m=>instances.splice(instances.indexOf(m),1)
    }
  };
  terrain.material = {};
  terrain.chunks = new Map();
  terrain.p161TerrainEnabled = mode;
  terrain._p161ChunkJob = null;
  terrain.p161TerrainStats = {enabled:mode,completed:0,cancelled:0,pending:false,
    lastVertices:0,lastChunkMs:0,lastStepMs:0};
  terrain.getHeight=(x,z)=>x*.08 + z*.013 + Math.sin(x*.04)*3;
  terrain.getSlope=(x,z)=>Math.abs(Math.cos(x*.04))*.13 + Math.abs(z*.001);
  terrain._vertexColor=(x,z,y,slope)=>({r:y*.003,g:slope*.5,b:(x+z)*.001});
  return terrain;
};

const unchanged=setup(false);
unchanged.update(0);
assert.equal(unchanged.chunks.size,3,'unflagged P16 still builds up to three chunks per frame');

const baseline=setup(false);
baseline._buildChunk(0,0);
const budget=setup(true);
budget._beginChunkJob(0,0);
assert.ok(budget._p161ChunkJob);
let iterations=0;
while(budget._p161ChunkJob && iterations++ < 5000) budget._stepChunkJob();
assert.ok(iterations < 5000, 'budgeted build finishes');
assert.equal(budget.p161TerrainStats.completed,1);
assert.equal(budget.p161TerrainStats.lastVertices,9409);
const old=baseline.chunks.get('0,0');
const fresh=budget.chunks.get('0,0');
assert.ok(fresh);
assert.deepEqual(fresh.geometry.attributes.position.array,old.geometry.attributes.position.array,
  'all heightfield vertices match unchanged P16 geometry');
assert.deepEqual(fresh.geometry.attributes.color.array,old.geometry.attributes.color.array,
  'all vertex colors match P16 geometry');
assert.ok(fresh.geometry.normalsComputed && old.geometry.normalsComputed);
assert.deepEqual(fresh.xyz,old.xyz);

// Check disposal on teleport: no half-built chunk should survive cancellation.
const teleport=setup(true);
teleport._beginChunkJob(7,7);
const partiallyBuilt=teleport._p161ChunkJob.geo;
teleport.game.player.pos={x:0,z:0};
teleport._updateBudgetedTerrain(0,0);
assert.equal(partiallyBuilt.disposed,true);
assert.equal(teleport.p161TerrainStats.cancelled,1);
assert.equal(teleport.p161TerrainStats.pending,true);

// Source-level integration: default P16 synchronous behavior still exists.
assert.ok(source.includes("get('hf_p161_terrain') === '1'"));
assert.ok(source.includes('if (this.p161TerrainEnabled)'));
assert.ok(source.includes('this._buildChunk(cx, cz);'));
assert.ok(source.includes('const BUILD_PER_FRAME = 3'));
console.log('HIGHFLY P16.1 PASS: exact terrain arrays, incremental budget, teleport disposal, original P16 path');
