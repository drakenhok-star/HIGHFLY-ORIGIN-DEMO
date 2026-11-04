import * as THREE from 'three';
import { makeNoise2D, mulberry32, fbm } from '../core/noise.js';
import { NatureObstaclesP7 } from './obstacles-p7.js';

const REGION = 700;
const GRASS_COUNT = 36000;
const GRASS_SPACING = 0.72;
const GRASS_RADIUS = 68;
const GRASS_REBUILD_DIST = 7;
const TUFT_W = 0.16;
const TUFT_H = 0.46;
const VILLAGE = { x: 0, z: 40, r: 78 };
const STONES = { x: -220, z: -180, r: 52 };
const CLEARING = { x: 150, z: 150, r: 26 };

function outsideLandmarks(x, z) {
  const dv = (x - VILLAGE.x) * (x - VILLAGE.x) + (z - VILLAGE.z) * (z - VILLAGE.z);
  if (dv < VILLAGE.r * VILLAGE.r) return false;
  const ds = (x - STONES.x) * (x - STONES.x) + (z - STONES.z) * (z - STONES.z);
  if (ds < STONES.r * STONES.r) return false;
  const dc = (x - CLEARING.x) * (x - CLEARING.x) + (z - CLEARING.z) * (z - CLEARING.z);
  if (dc < CLEARING.r * CLEARING.r) return false;
  return true;
}

// 网格单元确定性哈希：同一 (ix, iz, salt) 永远同值，草场与重建顺序无关。
function cellHash(ix, iz, salt) {
  let h = (Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(salt, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1597334677);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class Scatter {
  constructor(game) {
    this.game = game;
    this.meshes = [];
    this.obstacles = game.p7Enabled ? new NatureObstaclesP7(12) : null;
    this.forestNoise = makeNoise2D(1338);
    this.rand = mulberry32(1339);
    this.buildPines();
    this.buildRocks();
    this.buildGrass();
    for (const m of this.meshes) game.scene.add(m);
  }

  // 每个 GLB 部件一个 InstancedMesh；实例矩阵 = 摆放 TRS × 部件根相对矩阵。
  buildInstancedParts(key, trsList) {
    const parts = this.game.assets.staticParts(key);
    const m = new THREE.Matrix4();
    for (const part of parts) {
      if (!part.material.fog) {
        part.material.fog = true;
        part.material.needsUpdate = true;
      }
      // 嵌入贴图偏暗，色乘提亮一次（>1 合法）；按材质名区分叶/皮
      if (!part.material.userData.tinted) {
        part.material.userData.tinted = true;
        if (part.material.name === 'Leaves_Pine') part.material.color.setRGB(1.45, 1.5, 1.35);
        else if (part.material.name === 'Bark_NormalTree') part.material.color.setRGB(1.3, 1.3, 1.3);
        else if (part.material.name === 'Green') part.material.color.multiplyScalar(1.25);
      }
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, trsList.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (let i = 0; i < trsList.length; i++) {
        m.multiplyMatrices(trsList[i], part.matrix);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.meshes.push(mesh);
    }
  }

  buildPines() {
    const terrain = this.game.terrain;
    const rand = this.rand;
    // 变体选择用独立 PRNG，避免打乱 this.rand 序列改变树/石/草的确定性摆放。
    const vrand = mulberry32(2401);
    const placements = [];

    for (let i = 0; i < 9000; i++) {
      const x = (rand() * 2 - 1) * REGION;
      const z = (rand() * 2 - 1) * REGION;
      const s = 0.7 + rand() * 0.8;
      const rot = rand() * Math.PI * 2;
      if (fbm(this.forestNoise, x * 0.002, z * 0.002, 3) <= 0.12) continue;
      if (!outsideLandmarks(x, z)) continue;
      const y = terrain.getHeight(x, z);
      if (y <= 1 || y >= 50) continue;
      if (terrain.getSlope(x, z) >= 0.95) continue;
      placements.push({ x, y, z, s, rot });
    }

    // 按接受顺序定变体：高海拔雪松（原生 3.34u，放大 ~2.2x 才齐其他松），低处 pine1/pine2 五五开。
    const variants = { pine_snow: [], pine1: [], pine2: [] };
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();

    for (const t of placements) {
      let key;
      let scale;
      if (t.y > 35) {
        key = 'pine_snow';
        // GLB 内部烘焙缩放使实际身高 ≈ 1.05m/单位系数（清单标称 3.34u 不含该链），7.0 才齐 pine1
        scale = 7.0 + (vrand() * 2 - 1) * 0.8;
      } else {
        key = vrand() < 0.5 ? 'pine1' : 'pine2';
        // 接受循环抽出的 s∈[0.7,1.5] 重映射到 0.9-1.4，沿用同一随机值保持确定性。
        scale = 0.9 + (t.s - 0.7) * 0.625;
      }
      e.set(0, t.rot, 0);
      q.setFromEuler(e);
      p.set(t.x, t.y - 0.2, t.z);
      sc.set(scale, scale, scale);
      variants[key].push(new THREE.Matrix4().compose(p, q, sc));
      if(this.obstacles)this.obstacles.register(t.x,t.z,
        this.game.p13Enabled ? Math.max(.64,key==='pine_snow'?1.08:scale*.59)
          : key==='pine_snow'?.9:Math.max(.45,scale*.48),t.y-.8,t.y+10,'tree');
    }

    for (const key of Object.keys(variants)) {
      if (variants[key].length) this.buildInstancedParts(key, variants[key]);
    }
  }

  buildRocks() {
    const terrain = this.game.terrain;
    const rand = this.rand;
    const TARGET = 600;
    const small = [];
    const large = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();

    let kept = 0;
    for (let i = 0; i < 60000 && kept < TARGET; i++) {
      const x = (rand() * 2 - 1) * REGION;
      const z = (rand() * 2 - 1) * REGION;
      const s = 0.5 + rand() * 2.5;
      const rx = rand() * Math.PI * 2;
      const ry = rand() * Math.PI * 2;
      const rz = rand() * Math.PI * 2;
      const jx = 0.6 + rand() * 0.8;
      const jy = 0.6 + rand() * 0.8;
      const jz = 0.6 + rand() * 0.8;
      if (!outsideLandmarks(x, z)) continue;
      const y = terrain.getHeight(x, z);
      if (y <= -1) continue;
      kept++;
      if (kept % 40 === 0) {
        // 每第 40 块改成地标巨石：扁平大石只绕 Y 转并略下沉，避免翻滚悬空。
        e.set(0, ry, 0);
        q.setFromEuler(e);
        p.set(x, y - 0.3, z);
        const base = 0.7 + (s - 0.5) * 0.3;
        sc.set(base * jx, base * jy, base * jz);
        large.push(new THREE.Matrix4().compose(p, q, sc));
        if(this.obstacles)this.obstacles.register(x,z,
          this.game.p13Enabled?Math.max(1.05,Math.min(2.3,base*Math.max(jx,jz)*1.16))
            :Math.max(.8,Math.min(1.7,base*1.12)),y-.7,
          this.game.p13Enabled?y+Math.max(1.6,base*jy*1.8):y+2.2,'large-rock');
      } else {
        e.set(rx, ry, rz);
        q.setFromEuler(e);
        p.set(x, y, z);
        // rock1 原生仅 0.6u，旧 1u 十二面体的 3 倍补齐体量。
        sc.set(s * jx * 3, s * jy * 3, s * jz * 3);
        small.push(new THREE.Matrix4().compose(p, q, sc));
        if(this.obstacles)this.obstacles.register(x,z,
          this.game.p13Enabled?Math.max(.53,Math.min(2.55,s*Math.max(jx,jz)*.86))
            :Math.max(.38,Math.min(1.4,s*.41)),y-.6,
          this.game.p13Enabled?y+Math.max(.65,Math.min(3.8,s*jy*1.48)):y+1.9,'rock');
      }
    }

    this.buildInstancedParts('rock1', small);

    // 巨石数量少，逐块摆个体 Mesh。
    const parts = this.game.assets.staticParts('rock_large');
    for (const trs of large) {
      for (const part of parts) {
        if (!part.material.fog) {
          part.material.fog = true;
          part.material.needsUpdate = true;
        }
        const mesh = new THREE.Mesh(part.geometry, part.material);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(trs).multiply(part.matrix);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.meshes.push(mesh);
      }
    }
  }

  buildGrass() {
    // 三片 60° 交叉面片草丛：12 顶点 18 索引，uv.y 根部 0 → 梢部 1，梢部沿面片法线微外倾。
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(36);
    const normals = new Float32Array(36);
    const uvs = new Float32Array(24);
    const indices = [];
    const halfW = TUFT_W / 2;
    const lean = 0.07;
    // 法线整体上偏：草片光照贴近地表，避免逆光面发黑成"黑刺"
    const nLen = Math.sqrt(0.35 * 0.35 + 0.9 * 0.9);
    for (let qd = 0; qd < 3; qd++) {
      const a = (qd * Math.PI) / 3;
      const dx = Math.cos(a), dz = Math.sin(a);
      const nx = -Math.sin(a), nz = Math.cos(a);
      // 根左、根右、梢右、梢左；梢部略收窄
      const corners = [
        [-halfW * dx, 0, -halfW * dz, 0, 0],
        [halfW * dx, 0, halfW * dz, 1, 0],
        [halfW * 0.22 * dx + lean * nx, TUFT_H, halfW * 0.22 * dz + lean * nz, 1, 1],
        [-halfW * 0.22 * dx + lean * nx, TUFT_H, -halfW * 0.22 * dz + lean * nz, 0, 1]
      ];
      const base = qd * 4;
      for (let i = 0; i < 4; i++) {
        const vi = base + i;
        positions[vi * 3] = corners[i][0];
        positions[vi * 3 + 1] = corners[i][1];
        positions[vi * 3 + 2] = corners[i][2];
        normals[vi * 3] = (nx * 0.35) / nLen;
        normals[vi * 3 + 1] = 0.9 / nLen;
        normals[vi * 3 + 2] = (nz * 0.35) / nLen;
        uvs[vi * 2] = corners[i][3];
        uvs[vi * 2 + 1] = corners[i][4];
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const uTime = { value: 0 };
    const tipColor = new THREE.Color(0x93a763);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide
    });
    mat.userData.uTime = uTime;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vTipGrass;')
        .replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          `vTipGrass = clamp( position.y / ${TUFT_H.toFixed(2)}, 0.0, 1.0 );`,
          // 远距收缩：58→66m 顶点缩向根部归零，顶点级淡出免透明排序
          'vec3 rootG = ( modelMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;',
          'float fadeG = 1.0 - smoothstep( 58.0, 66.0, distance( cameraPosition, rootG ) );',
          'transformed *= fadeG;',
          // 风场：双频摆动 + 低频阵风，越靠梢部弯曲越大
          'vec3 wpG = ( modelMatrix * instanceMatrix * vec4( position, 1.0 ) ).xyz;',
          'float swayG = pow( vTipGrass, 1.6 );',
          'float gustG = max( 0.0, sin( uTime * 0.6 + wpG.x * 0.05 + wpG.z * 0.04 ) ) * sin( uTime * 2.6 + wpG.x * 0.3 + wpG.z * 0.45 );',
          'float bendG = ( sin( uTime * 1.7 + wpG.x * 0.35 + wpG.z * 0.22 ) + 0.5 * sin( uTime * 3.1 + wpG.x * 0.8 ) ) * swayG * 0.22 + gustG * swayG * 0.1;',
          'transformed.x += bendG * fadeG;',
          'transformed.z += bendG * 0.55 * fadeG;'
        ].join('\n'));
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vTipGrass;')
        .replace('#include <normal_fragment_begin>', [
          '#include <normal_fragment_begin>',
          // 双面草片：撤销 DOUBLE_SIDED 的背面法线翻转，否则上偏法线被翻成朝下，背光面全黑成"黑刺"
          'normal = normalize( vNormal );',
          'nonPerturbedNormal = normal;'
        ].join('\n'))
        .replace('#include <color_fragment>', [
          '#include <color_fragment>',
          // 梢部向亮黄绿提亮，模拟透光
          `diffuseColor.rgb = mix( diffuseColor.rgb, vec3( ${tipColor.r.toFixed(4)}, ${tipColor.g.toFixed(4)}, ${tipColor.b.toFixed(4)} ), vTipGrass * 0.3 );`
        ].join('\n'));
    };
    this.grassMat = mat;

    const mesh = new THREE.InstancedMesh(geo, mat, GRASS_COUNT);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GRASS_COUNT * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.grassMesh = mesh;
    this.meshes.push(mesh);

    // 与地形宏观色同种子同频率同偏移，草色随地表过渡
    this.macroNoise = makeNoise2D(1337);
    this._cGrassLo = new THREE.Color(0x5a7a42);
    this._cGrassHi = new THREE.Color(0x74904e);
    this._grassCache = new Map();
    this._grassExcl = null;
    this._grassAnchor = new THREE.Vector3(1e9, 0, 1e9);
    this._gM = new THREE.Matrix4();
    this._gQ = new THREE.Quaternion();
    this._gE = new THREE.Euler();
    this._gP = new THREE.Vector3();
    this._gS = new THREE.Vector3();
    this._gC = new THREE.Color();
    this._gV = new THREE.Vector3();
  }

  // 排除圈：房屋 r5.5 / 水井 r2.5 / 火把 r2，首次重建时从 structures 读取并缓存
  _grassExclusions() {
    if (this._grassExcl) return this._grassExcl;
    const s = this.game.structures;
    const list = [];
    for (const hp of s.housePositions) list.push({ x: hp.x, z: hp.z, r2: 5.5 * 5.5 });
    list.push({ x: s.villageCenter.x, z: s.villageCenter.z, r2: 2.5 * 2.5 });
    for (const tc of s.torches) {
      tc.light.getWorldPosition(this._gV);
      list.push({ x: this._gV.x, z: this._gV.z, r2: 2 * 2 });
    }
    this._grassExcl = list;
    return list;
  }

  // 单元格确定性求值：null = 拒绝；否则 [x, y, z, yaw, scale, r, g, b]
  _computeGrassCell(ix, iz, excl) {
    const terrain = this.game.terrain;
    const x = ix * GRASS_SPACING + (cellHash(ix, iz, 1) - 0.5) * GRASS_SPACING * 0.9;
    const z = iz * GRASS_SPACING + (cellHash(ix, iz, 2) - 0.5) * GRASS_SPACING * 0.9;
    const y = terrain.getHeight(x, z);
    if (y <= 0.4 || y >= 30 || y <= terrain.waterY + 1.2) return null;
    // 前向差分坡度：共用中心采样，比 getSlope 少两次取高（全量重建 3.6 万格，省得值）
    const e = 1.2;
    const gx = (terrain.getHeight(x + e, z) - y) / e;
    const gz = (terrain.getHeight(x, z + e) - y) / e;
    if (gx * gx + gz * gz >= 0.36) return null;
    for (let i = 0; i < excl.length; i++) {
      const ex = x - excl[i].x;
      const ez = z - excl[i].z;
      if (ex * ex + ez * ez < excl[i].r2) return null;
    }
    const macro = this.macroNoise(x * 0.002 + 311, z * 0.002 + 157) * 0.5 + 0.5;
    const c = this._gC.copy(this._cGrassLo).lerp(this._cGrassHi, macro);
    // 明度哈希抖动 ±7%
    c.multiplyScalar(1 + (cellHash(ix, iz, 3) - 0.5) * 0.14);
    const out = new Float32Array(8);
    out[0] = x;
    out[1] = y - 0.03;
    out[2] = z;
    out[3] = cellHash(ix, iz, 4) * Math.PI * 2;
    out[4] = 0.85 + cellHash(ix, iz, 5) * 0.4;
    out[5] = c.r;
    out[6] = c.g;
    out[7] = c.b;
    return out;
  }

  _rebuildGrass(anchor) {
    const mesh = this.grassMesh;
    const excl = this._grassExclusions();
    const acx = Math.round(anchor.x / GRASS_SPACING);
    const acz = Math.round(anchor.z / GRASS_SPACING);
    const cells = Math.floor(GRASS_RADIUS / GRASS_SPACING);
    const r2 = GRASS_RADIUS * GRASS_RADIUS;
    const m = this._gM, q = this._gQ, e = this._gE, p = this._gP, sc = this._gS, c = this._gC;
    let used = 0;

    for (let iz = acz - cells; iz <= acz + cells && used < GRASS_COUNT; iz++) {
      const dz = iz * GRASS_SPACING - anchor.z;
      for (let ix = acx - cells; ix <= acx + cells && used < GRASS_COUNT; ix++) {
        const dx = ix * GRASS_SPACING - anchor.x;
        if (dx * dx + dz * dz > r2) continue;
        const key = ix * 131072 + iz;
        let data = this._grassCache.get(key);
        if (data === undefined) {
          data = this._computeGrassCell(ix, iz, excl);
          this._grassCache.set(key, data);
        }
        if (data === null) continue;
        e.set(0, data[3], 0);
        q.setFromEuler(e);
        p.set(data[0], data[1], data[2]);
        sc.set(data[4], data[4], data[4]);
        m.compose(p, q, sc);
        mesh.setMatrixAt(used, m);
        c.setRGB(data[5], data[6], data[7]);
        mesh.setColorAt(used, c);
        used++;
      }
    }

    // 未用实例置零矩阵隐藏
    m.makeScale(0, 0, 0);
    for (let i = used; i < GRASS_COUNT; i++) mesh.setMatrixAt(i, m);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this._grassAnchor.copy(anchor);
    if (this._grassCache.size > 150000) this._grassCache.clear();
  }

  update(dt) {
    this.grassMat.userData.uTime.value += dt;
    if (!this.game.structures) return;
    const p = this.game.player ? this.game.player.pos : this.game.camera.position;
    const dx = p.x - this._grassAnchor.x;
    const dz = p.z - this._grassAnchor.z;
    if (dx * dx + dz * dz > GRASS_REBUILD_DIST * GRASS_REBUILD_DIST) this._rebuildGrass(p);
  }
}
