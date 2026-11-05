import * as THREE from 'three';
import { makeNoise2D, fbm } from '../core/noise.js';
import { banditTrailP183c } from './habitat-p183c.js';

const CHUNK = 200;
const RES = 96;
const VIEW_RADIUS = 2;
const BUILD_PER_FRAME = 3;
const P161_CHUNK_STEP_MS = 2.0;
const P161_CHUNK_MAX_VERTICES = 1024;

const FLATTEN_SPOTS = [
  { x: 0, z: 40, r: 75, y: 4.5 },
  { x: -220, z: -180, r: 50, y: 12 },
  { x: 150, z: 150, r: 25, y: 8 },
  { x: 3000, z: 3000, r: 150, y: 34 },
  { x: -3000, z: -3000, r: 120, y: 34 },
  { x: 380, z: -150, r: 40, y: 70 },
];

function smooth01(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

export class Terrain {
  constructor(game) {
    this.game = game;
    this.waterY = -2;
    this.noise = makeNoise2D(1337);
    this.chunks = new Map();
    this.p161TerrainEnabled = new URLSearchParams(location.search).get('hf_p161_terrain') === '1' ||
      (!!game.p163Enabled && new URLSearchParams(location.search).get('hf_p161_terrain') !== '0');
    this._p161ChunkJob = null;
    this.p161TerrainStats = this.p161TerrainEnabled ? {
      enabled:true,completed:0,cancelled:0,pending:false,lastVertices:0,lastChunkMs:0,lastStepMs:0
    } : null;

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.93,
      metalness: 0,
    });

    this._cSnow = new THREE.Color(0xe8edf2);
    this._cSnowShade = new THREE.Color(0xd7e0ea);
    this._cRockA = new THREE.Color(0x6b6862);
    this._cRockB = new THREE.Color(0x5c5650);
    this._cSand = new THREE.Color(0x7e7460);
    this._cSubmerged = new THREE.Color(0x2e4438);
    this._cRoadP183c = new THREE.Color(0x88785c);
    this._cGrassA = new THREE.Color(0x55763f);
    this._cGrassB = new THREE.Color(0x6f8347);
    this._tmpColor = new THREE.Color();
    this._tmpSnow = new THREE.Color();

    if (this.p161TerrainEnabled) {
      // Guarantee a walkable/visible central tile immediately; build surrounding
      // terrain over subsequent menu frames instead of blocking a gameplay frame.
      const start = game.camera.position;
      this._buildChunk(Math.floor(start.x / CHUNK), Math.floor(start.z / CHUNK));
    }
    this.update(0);
  }

  // 纯解析函数：仅依赖坐标与固定种子，与区块加载状态无关
  getHeight(x, z) {
    const n = this.noise;
    let h = fbm(n, x * 0.0015, z * 0.0015, 5) * 30;

    // 山脉遮罩：朝东北方向（+x / -z）抬升，约 35% 区域为山地
    const mRaw = fbm(n, x * 0.0008 + 37, z * 0.0008 + 91, 3);
    let bias = (x - z) / 1600;
    if (bias < -0.2) bias = -0.2;
    else if (bias > 0.4) bias = 0.4;
    const mask = smooth01((mRaw * 0.5 + 0.5 + bias - 0.46) / 0.3);
    if (mask > 0) {
      const ridge = 1 - Math.abs(fbm(n, x * 0.004 + 7, z * 0.004 + 13, 4));
      h += ridge * ridge * 95 * mask;
    }

    for (let i = 0; i < FLATTEN_SPOTS.length; i++) {
      const s = FLATTEN_SPOTS[i];
      const dx = x - s.x;
      const dz = z - s.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < s.r) {
        const f = smooth01((d - s.r * 0.55) / (s.r * 0.45));
        h = s.y + (h - s.y) * f;
      }
    }
    return h;
  }

  getSlope(x, z) {
    const e = 1.5;
    const gx = (this.getHeight(x + e, z) - this.getHeight(x - e, z)) / (2 * e);
    const gz = (this.getHeight(x, z + e) - this.getHeight(x, z - e)) / (2 * e);
    return Math.sqrt(gx * gx + gz * gz);
  }

  _vertexColor(wx, wz, y, slope) {
    const c = this._tmpColor;
    const n = this.noise;

    if (slope > 1.1) {
      // 崖面地层条带：高度量化 + 噪声扰动，避免水平直线
      const strat = n(wx * 0.05 + 641, wz * 0.05 + 733) * 1.5;
      const band = ((Math.floor(y * 0.8 + strat) % 2) + 2) % 2;
      c.copy(band === 0 ? this._cRockA : this._cRockB);
    } else {
      const macro = n(wx * 0.002 + 311, wz * 0.002 + 157) * 0.5 + 0.5;
      c.copy(this._cGrassA).lerp(this._cGrassB, macro);
      const speckle = n(wx * 0.15 + 87, wz * 0.15 + 43);
      c.multiplyScalar(1 + speckle * 0.06);
    }

    // 雪线 46..54 软过渡，阈值噪声抖动；陡坡背阴雪偏蓝
    const jitter = n(wx * 0.04 + 501, wz * 0.04 + 367) * 3;
    const snowT = smooth01((y - 46 - jitter) / 8);
    if (snowT > 0) {
      const shade = smooth01((slope - 0.6) / 0.9);
      this._tmpSnow.copy(this._cSnow).lerp(this._cSnowShade, shade);
      c.lerp(this._tmpSnow, snowT);
    }

    // Visible dirt trail by the bandit camp. Terrain paint only: no fake road boxes.
    if(this.game.p183cEnabled&&y>this.waterY+.85&&y<40){
      const track=banditTrailP183c(wx,wz);
      if(track>0)c.lerp(this._cRoadP183c,track*.91);
    }
    if (y < 0.3) {
      c.lerp(this._cSand, smooth01((0.3 - y) / 0.8));
      const subT = smooth01((this.waterY + 0.6 - y) / 2.0);
      if (subT > 0) c.lerp(this._cSubmerged, subT);
    }
    return c;
  }

  _buildChunk(cx, cz) {
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, RES, RES);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const ox = (cx + 0.5) * CHUNK;
    const oz = (cz + 0.5) * CHUNK;

    for (let i = 0; i < count; i++) {
      const wx = ox + pos.getX(i);
      const wz = oz + pos.getZ(i);
      const y = this.getHeight(wx, wz);
      pos.setY(i, y);
      const slope = this.getSlope(wx, wz);
      const c = this._vertexColor(wx, wz, y, slope);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(ox, 0, oz);
    mesh.receiveShadow = true;
    mesh.userData.cx = cx;
    mesh.userData.cz = cz;
    this.game.scene.add(mesh);
    this.chunks.set(cx + ',' + cz, mesh);
  }


  // P16.1 EXPERIMENTAL: incremental construction of the exact P16 heightfield.
  // The original synchronous _buildChunk remains the instant rollback path.
  _beginChunkJob(cx, cz) {
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, RES, RES);
    geo.rotateX(-Math.PI / 2);
    this._p161ChunkJob = {
      cx, cz, geo, pos:geo.attributes.position,
      colors:new Float32Array(geo.attributes.position.count * 3),
      index:0, startedAt:performance.now()
    };
    this.p161TerrainStats.pending = true;
  }

  _stepChunkJob() {
    const job = this._p161ChunkJob;
    if (!job) return;
    const start = performance.now();
    const ox = (job.cx + 0.5) * CHUNK;
    const oz = (job.cz + 0.5) * CHUNK;
    let vertices = 0;
    while (job.index < job.pos.count) {
      const i = job.index++;
      const wx = ox + job.pos.getX(i);
      const wz = oz + job.pos.getZ(i);
      const y = this.getHeight(wx, wz);
      job.pos.setY(i, y);
      const slope = this.getSlope(wx, wz);
      const c = this._vertexColor(wx, wz, y, slope);
      job.colors[i * 3] = c.r;
      job.colors[i * 3 + 1] = c.g;
      job.colors[i * 3 + 2] = c.b;
      vertices++;
      if (vertices >= P161_CHUNK_MAX_VERTICES ||
          ((vertices & 31) === 0 && performance.now() - start >= P161_CHUNK_STEP_MS)) {
        break;
      }
    }
    this.p161TerrainStats.lastStepMs = performance.now() - start;
    if (job.index < job.pos.count) return;
    // Normals and mesh creation only once, after all positions/colors are ready.
    job.geo.setAttribute('color', new THREE.BufferAttribute(job.colors, 3));
    job.geo.computeVertexNormals();
    const mesh = new THREE.Mesh(job.geo, this.material);
    mesh.position.set(ox, 0, oz);
    mesh.receiveShadow = true;
    mesh.userData.cx = job.cx;
    mesh.userData.cz = job.cz;
    this.game.scene.add(mesh);
    this.chunks.set(job.cx + ',' + job.cz, mesh);
    this._p161ChunkJob = null;
    this.p161TerrainStats.pending = false;
    this.p161TerrainStats.completed++;
    this.p161TerrainStats.lastVertices = job.pos.count;
    this.p161TerrainStats.lastChunkMs = performance.now() - job.startedAt;
  }

  _updateBudgetedTerrain(ccx, ccz) {
    let job = this._p161ChunkJob;
    // If player crosses into a not-yet-built chunk, it must take priority
    // over an unfinished distant chunk; this avoids extending near-field gaps.
    const centerMissing = !this.chunks.has(ccx + ',' + ccz);
    if (job && (
      Math.max(Math.abs(job.cx - ccx), Math.abs(job.cz - ccz)) > VIEW_RADIUS + 1 ||
      (centerMissing && (job.cx !== ccx || job.cz !== ccz))
    )) {
      // Teleports cancel unfinished geometry so stale work never leaks resources.
      job.geo.dispose();
      this._p161ChunkJob = null;
      this.p161TerrainStats.cancelled++;
      this.p161TerrainStats.pending = false;
      job = null;
    }
    if (!job) {
      for (let ring = 0; ring <= VIEW_RADIUS && !job; ring++) {
        for (let cx = ccx - ring; cx <= ccx + ring && !job; cx++) {
          for (let cz = ccz - ring; cz <= ccz + ring; cz++) {
            if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) !== ring) continue;
            if (this.chunks.has(cx + ',' + cz)) continue;
            this._beginChunkJob(cx, cz);
            job = this._p161ChunkJob;
            break;
          }
        }
      }
    }
    if (job) this._stepChunkJob();

    // Preserve the P16 cleanup and draw radius exactly.
    for (const [key, mesh] of this.chunks) {
      const dx = Math.abs(mesh.userData.cx - ccx);
      const dz = Math.abs(mesh.userData.cz - ccz);
      if (Math.max(dx, dz) > VIEW_RADIUS + 1) {
        this.game.scene.remove(mesh);
        mesh.geometry.dispose();
        this.chunks.delete(key);
      }
    }
  }

  update(dt) {
    const p = this.game.player ? this.game.player.pos : this.game.camera.position;
    const ccx = Math.floor(p.x / CHUNK);
    const ccz = Math.floor(p.z / CHUNK);

    if (this.p161TerrainEnabled) {
      this._updateBudgetedTerrain(ccx, ccz);
      return;
    }

    let built = 0;
    for (let ring = 0; ring <= VIEW_RADIUS && built < BUILD_PER_FRAME; ring++) {
      for (let cx = ccx - ring; cx <= ccx + ring && built < BUILD_PER_FRAME; cx++) {
        for (let cz = ccz - ring; cz <= ccz + ring && built < BUILD_PER_FRAME; cz++) {
          if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) !== ring) continue;
          if (!this.chunks.has(cx + ',' + cz)) {
            this._buildChunk(cx, cz);
            built++;
          }
        }
      }
    }

    for (const [key, mesh] of this.chunks) {
      const dx = Math.abs(mesh.userData.cx - ccx);
      const dz = Math.abs(mesh.userData.cz - ccz);
      if (Math.max(dx, dz) > VIEW_RADIUS + 1) {
        this.game.scene.remove(mesh);
        mesh.geometry.dispose();
        this.chunks.delete(key);
      }
    }
  }
}
