import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';

const SNOW_COUNT = 1400;
// 雪粒回收盒 80x50x80（半径 40/25/40），以玩家为中心
const SNOW_WRAP_X = 80, SNOW_WRAP_Y = 50, SNOW_WRAP_Z = 80;
const CLOUD_COUNT = 7;
const SMOKE_PER_HOUSE = 12;
const SMOKE_LIFE = 6;
const FIREFLY_COUNT = 60;
const MIST_LAKE_COUNT = 12;
const MIST_MARSH_COUNT = 3;

// 烟团重生抖动的种子随机流：取值受帧时序影响无妨，只为消除 Math.random 依赖
const smokeRng = mulberry32(6021);

// 黑底 + 白色径向渐变斑块：亮度即透明度，走 alphaMap 避免画布预乘 alpha 的暗边
function blobCanvas(w, h, blobs) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  for (const b of blobs) {
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, `rgba(255,255,255,${b.a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  return new THREE.CanvasTexture(canvas);
}

function smooth01(x) {
  x = Math.min(1, Math.max(0, x));
  return x * x * (3 - 2 * x);
}

// [a,b] 区间内为 1，区间外沿宽度 e 平滑降到 0
function rampWindow(t, a, b, e) {
  return smooth01((t - (a - e)) / e) * (1 - smooth01((t - b) / e));
}

export class Ambience {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    game.scene.add(this.root);

    const rng = mulberry32(game.worldSeed + 77);
    this._initSnow(rng);
    this._initClouds(rng);
    this._initSmoke(rng);
    this._initFireflies(rng);
    this._initMist(rng);
  }

  _initSnow(rng) {
    const pos = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3] = (rng() - 0.5) * SNOW_WRAP_X;
      pos[i * 3 + 1] = 20 + rng() * SNOW_WRAP_Y;
      pos[i * 3 + 2] = (rng() - 0.5) * SNOW_WRAP_Z;
    }
    const geo = new THREE.BufferGeometry();
    this.snowPos = new THREE.BufferAttribute(pos, 3);
    this.snowPos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.snowPos);
    this.snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.snow = new THREE.Points(geo, this.snowMat);
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.root.add(this.snow);
  }

  _initClouds(rng) {
    const blobs = [];
    for (let i = 0; i < 14; i++) {
      blobs.push({
        x: 40 + rng() * 176,
        y: 38 + rng() * 52,
        r: 18 + rng() * 16,
        a: 0.4 + rng() * 0.25,
      });
    }
    this.cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      alphaMap: blobCanvas(256, 128, blobs),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      fog: false,
    });
    this.clouds = [];
    const geo = new THREE.PlaneGeometry(220, 90);
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const m = new THREE.Mesh(geo, this.cloudMat);
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 900;
      m.position.set(Math.cos(a) * r, 230 + rng() * 70, Math.sin(a) * r);
      m.frustumCulled = false;
      this.root.add(m);
      this.clouds.push(m);
    }
  }

  _initSmoke(rng) {
    const tex = blobCanvas(64, 64, [
      { x: 32, y: 32, r: 30, a: 0.85 },
      { x: 32, y: 32, r: 16, a: 0.5 },
    ]);
    this.smokePuffs = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    // 锚定烟囱口世界坐标；chimneyTops 缺失时回退旧的房屋位锚点
    const s = this.game.structures;
    const anchors = s.chimneyTops && s.chimneyTops.length ? s.chimneyTops : s.housePositions;
    for (const hp of anchors) {
      for (let i = 0; i < SMOKE_PER_HOUSE; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xb0aeaa,
          alphaMap: tex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const m = new THREE.Mesh(geo, mat);
        m.frustumCulled = false;
        this.root.add(m);
        this.smokePuffs.push({
          mesh: m,
          base: hp,
          age: ((i + rng()) / SMOKE_PER_HOUSE) * SMOKE_LIFE,
          jx: (rng() - 0.5) * 0.9,
          jz: (rng() - 0.5) * 0.9,
          phase: rng() * Math.PI * 2,
        });
      }
    }
  }

  _initFireflies(rng) {
    const pos = new Float32Array(FIREFLY_COUNT * 3);
    this.fireflyBase = new Float32Array(FIREFLY_COUNT * 3);
    this.fireflyPhase = new Float32Array(FIREFLY_COUNT);
    const vc = this.game.structures.villageCenter;
    const terrain = this.game.terrain;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 40;
      const x = vc.x + Math.cos(a) * r;
      const z = vc.z + Math.sin(a) * r;
      const y = terrain.getHeight(x, z) + 0.5 + rng() * 1.8;
      const j = i * 3;
      this.fireflyBase[j] = pos[j] = x;
      this.fireflyBase[j + 1] = pos[j + 1] = y;
      this.fireflyBase[j + 2] = pos[j + 2] = z;
      this.fireflyPhase[i] = rng() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    this.fireflyPos = new THREE.BufferAttribute(pos, 3);
    this.fireflyPos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.fireflyPos);
    this.fireflyMat = new THREE.PointsMaterial({
      color: 0xd9f08a,
      size: 0.18,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.fireflies = new THREE.Points(geo, this.fireflyMat);
    this.fireflies.frustumCulled = false;
    this.fireflies.visible = false;
    this.root.add(this.fireflies);
  }

  _initMist(rng) {
    const blobs = [];
    for (let i = 0; i < 8; i++) {
      blobs.push({
        x: 90 + rng() * 332,
        y: 55 + rng() * 146,
        r: 40 + rng() * 48,
        a: 0.25 + rng() * 0.3,
      });
    }
    const tex = blobCanvas(512, 256, blobs);
    const terrain = this.game.terrain;
    const geo = new THREE.PlaneGeometry(46, 18);
    this.mistSheets = [];

    const addSheet = (x, z) => {
      // 岸边地面可能高于水面，雾片贴着两者中较高的一个浮
      const y = Math.max(terrain.waterY, terrain.getHeight(x, z)) + 1.2 + rng() * 1.4;
      const mat = new THREE.MeshBasicMaterial({
        color: 0xc8d4dc,
        alphaMap: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.set(-Math.PI / 2, 0, rng() * Math.PI * 2);
      m.position.set(x, y, z);
      // 水面 renderOrder 1 且不写深度；雾片在水面之上，必须更晚画才不被水色盖掉
      m.renderOrder = 2;
      m.visible = false;
      this.root.add(m);
      this.mistSheets.push({ mesh: m, baseX: x, baseZ: z, phase: rng() * Math.PI * 2 });
    };

    // 湖岸：绕村心 35-90m 环带确定性扫描低地，每个方位最多取一点，沿岸线铺开
    const vc = this.game.structures.villageCenter;
    let found = 0;
    for (let ai = 0; ai < 48 && found < MIST_LAKE_COUNT; ai++) {
      const a = (ai / 48) * Math.PI * 2;
      for (let r = 35; r <= 90; r += 11) {
        const x = vc.x + Math.cos(a) * r;
        const z = vc.z + Math.sin(a) * r;
        if (terrain.getHeight(x, z) >= 0.5) continue;
        if (this.mistSheets.some((s) => (s.baseX - x) ** 2 + (s.baseZ - z) ** 2 < 18 * 18)) continue;
        addSheet(x, z);
        found++;
        break;
      }
    }

    // 立石沼泽 (-220,-180) r40：黄金角螺旋扫描低地
    found = 0;
    for (let i = 0; i < 64 && found < MIST_MARSH_COUNT; i++) {
      const a = i * 2.39996;
      const r = 40 * Math.sqrt(i / 64);
      const x = -220 + Math.cos(a) * r;
      const z = -180 + Math.sin(a) * r;
      if (terrain.getHeight(x, z) >= 2) continue;
      if (this.mistSheets.some((s) => (s.baseX - x) ** 2 + (s.baseZ - z) ** 2 < 20 * 20)) continue;
      addSheet(x, z);
      found++;
    }
  }

  update(dt) {
    const nf = this.game.sky.nightFactor;
    this._updateSnow(dt);
    this._updateClouds(dt, 1 - nf);
    this._updateSmoke(dt, nf);
    this._updateFireflies(nf);
    this._updateMist();
  }

  _updateSnow(dt) {
    const player = this.game.player;
    // 室内不下雪（地穴在 z<-260 高纬区，必须显式排除），沿用下方渐隐逻辑淡出
    const indoor = !!(this.game.interiors && this.game.interiors.inside);
    const active = !indoor && !!player && (player.pos.y > 38 || player.pos.z < -260);
    const target = active ? 0.85 : 0;
    const mat = this.snowMat;
    if (mat.opacity !== target) {
      const step = dt * 0.85;
      mat.opacity = mat.opacity < target
        ? Math.min(target, mat.opacity + step)
        : Math.max(target, mat.opacity - step);
    }
    this.snow.visible = mat.opacity > 0.01;
    if (!this.snow.visible || !player) return;

    const time = this.game.time.elapsed;
    const p = player.pos;
    const a = this.snowPos.array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const j = i * 3;
      let x = a[j] + Math.sin(time * 0.8 + i * 1.37) * dt * 0.8;
      let y = a[j + 1] - 2.2 * dt;
      let z = a[j + 2];
      // 对玩家取模回卷：落底回顶，玩家移动/传送也不丢粒子
      let d = x - p.x; d -= Math.floor(d / SNOW_WRAP_X + 0.5) * SNOW_WRAP_X; x = p.x + d;
      d = y - p.y; d -= Math.floor(d / SNOW_WRAP_Y + 0.5) * SNOW_WRAP_Y; y = p.y + d;
      d = z - p.z; d -= Math.floor(d / SNOW_WRAP_Z + 0.5) * SNOW_WRAP_Z; z = p.z + d;
      a[j] = x; a[j + 1] = y; a[j + 2] = z;
    }
    this.snowPos.needsUpdate = true;
  }

  _updateClouds(dt, dayFactor) {
    this.cloudMat.opacity = 0.08 + 0.30 * dayFactor;
    const cam = this.game.camera.position;
    for (const m of this.clouds) {
      m.position.x += 1.5 * dt;
      if (m.position.x > 1100) m.position.x -= 2200;
      m.rotation.y = Math.atan2(cam.x - m.position.x, cam.z - m.position.z);
    }
  }

  _updateSmoke(dt, nightFactor) {
    const cam = this.game.camera.position;
    const time = this.game.time.elapsed;
    const emit = 0.4 + 0.8 * nightFactor;
    for (const p of this.smokePuffs) {
      p.age += dt;
      if (p.age >= SMOKE_LIFE) {
        p.age %= SMOKE_LIFE;
        p.jx = (smokeRng() - 0.5) * 0.9;
        p.jz = (smokeRng() - 0.5) * 0.9;
      }
      const t = p.age / SMOKE_LIFE;
      const m = p.mesh;
      const x = p.base.x + p.jx + Math.sin(time * 0.6 + p.phase) * 0.35 + p.age * 0.25;
      const y = p.base.y + p.age * 1.2;
      const z = p.base.z + p.jz;
      m.position.set(x, y, z);
      const s = 0.25 + 1.35 * t;
      m.scale.set(s, s, 1);
      m.rotation.y = Math.atan2(cam.x - x, cam.z - z);
      m.material.opacity = Math.sin(Math.PI * t) * 0.5 * emit;
    }
  }

  _updateFireflies(nightFactor) {
    // nightFactor 本身随昼夜平滑变化，斜坡映射即自然淡入淡出
    const mat = this.fireflyMat;
    mat.opacity = Math.min(1, Math.max(0, (nightFactor - 0.5) / 0.2)) * 0.9;
    this.fireflies.visible = mat.opacity > 0.01;
    if (!this.fireflies.visible) return;

    const time = this.game.time.elapsed;
    const a = this.fireflyPos.array;
    const b = this.fireflyBase;
    const ph = this.fireflyPhase;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const j = i * 3;
      const p = ph[i];
      a[j] = b[j] + Math.sin(time * 0.7 + p * 1.3) * 0.6;
      a[j + 1] = b[j + 1] + Math.sin(time * 1.6 + p) * 0.35;
      a[j + 2] = b[j + 2] + Math.cos(time * 0.6 + p * 2.1) * 0.6;
    }
    this.fireflyPos.needsUpdate = true;
  }

  _updateMist() {
    // 晨昏窗口峰值 0.55，深夜保留 0.25，其余时段淡出
    const t = this.game.time.dayTime;
    const dawnDusk = Math.max(rampWindow(t, 0.26, 0.38, 0.04), rampWindow(t, 0.70, 0.80, 0.04));
    const night = Math.min(1, Math.max(0, (this.game.sky.nightFactor - 0.8) / 0.15));
    const base = Math.max(0.55 * dawnDusk, 0.25 * night);

    const time = this.game.time.elapsed;
    for (const s of this.mistSheets) {
      const m = s.mesh;
      const o = base * (0.8 + 0.2 * Math.sin(time * 0.35 + s.phase * 2.3));
      m.material.opacity = o;
      m.visible = o > 0.01;
      if (!m.visible) continue;
      // 双轴异频正弦漂移，峰值速度约 0.3/s，且不会飘离岸线
      m.position.x = s.baseX + Math.sin(time * 0.05 + s.phase) * 6;
      m.position.z = s.baseZ + Math.cos(time * 0.041 + s.phase * 1.7) * 6;
      const sc = 1 + 0.06 * Math.sin(time * 0.21 + s.phase);
      m.scale.set(sc, sc, 1);
    }
  }
}
