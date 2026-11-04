import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';

const PLANE_SIZE = 1400;
const PLANE_SEGS = 224;
const GRID_STEP = PLANE_SIZE / PLANE_SEGS; // 6.25m，跟随玩家时按此步长吸附，避免顶点游移
const REFLECTION_SIZE = 768;
const CLIP_BIAS = 0.05;
const RING_POOL = 8;
const RING_LIFE = 0.7;

// 3 组 Gerstner 波：方向 / 波长 / 振幅 / 速度
const WAVES = [
  { dir: [1, 0.35], len: 22, amp: 0.18, speed: 1.0 },
  { dir: [-0.7, 0.6], len: 11, amp: 0.1, speed: 1.5 },
  { dir: [0.25, -1], len: 5.5, amp: 0.05, speed: 2.0 },
];
const TOTAL_AMP = WAVES.reduce((s, w) => s + w.amp, 0);
const STEEPNESS = 0.55;

function num(x) {
  return x.toFixed(7);
}

// 生成波形 GLSL：位移函数 + 解析法线（GPU Gems Gerstner 公式）
function buildWaveGLSL() {
  let off = '';
  let nrm = '';
  for (const w of WAVES) {
    const inv = 1 / Math.hypot(w.dir[0], w.dir[1]);
    const dx = w.dir[0] * inv;
    const dz = w.dir[1] * inv;
    const k = (2 * Math.PI) / w.len;
    const wa = k * w.amp;
    const q = STEEPNESS / (wa * WAVES.length);
    const phaseSpeed = w.speed * k;
    off += `
  {
    float ph = ${num(k)} * dot(vec2(${num(dx)}, ${num(dz)}), xz) - ${num(phaseSpeed)} * t;
    float s = sin(ph);
    float c = cos(ph);
    off.xz += vec2(${num(dx)}, ${num(dz)}) * (${num(q * w.amp)} * c);
    off.y += ${num(w.amp)} * s;
  }`;
    nrm += `
  {
    float ph = ${num(k)} * dot(vec2(${num(dx)}, ${num(dz)}), xz) - ${num(phaseSpeed)} * t;
    float s = sin(ph);
    float c = cos(ph);
    n.x -= ${num(dx * wa)} * c;
    n.z -= ${num(dz * wa)} * c;
    n.y -= ${num(q * wa)} * s;
  }`;
  }
  return `
vec3 waveOffset(vec2 xz, float t) {
  vec3 off = vec3(0.0);${off}
  return off;
}
vec3 waveNormal(vec2 xz, float t) {
  vec3 n = vec3(0.0, 1.0, 0.0);${nrm}
  return normalize(n);
}`;
}

const WAVE_GLSL = buildWaveGLSL();

const VERTEX_SHADER = `
uniform float uTime;
uniform mat4 uTextureMatrix;

varying vec3 vWorldPos;
varying float vViewZ;
varying float vCrest;
varying vec4 vMirrorCoord;

${WAVE_GLSL}

void main() {
  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 off = waveOffset(wp.xz, uTime);
  wp += off;
  vWorldPos = wp;
  vCrest = clamp(off.y / ${num(TOTAL_AMP)} * 0.5 + 0.5, 0.0, 1.0);
  vMirrorCoord = uTextureMatrix * vec4(wp, 1.0);
  vec4 viewPos = viewMatrix * vec4(wp, 1.0);
  vViewZ = viewPos.z;
  gl_Position = projectionMatrix * viewPos;
}`;

const FRAGMENT_SHADER = `
#include <packing>

uniform sampler2D uMirror;
uniform sampler2D uDepth;
uniform sampler2D uFoamTex;
uniform vec2 uResolution;
uniform float uTime;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec3 uSunDir;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uFoamColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uNight;

varying vec3 vWorldPos;
varying float vViewZ;
varying float vCrest;
varying vec4 vMirrorCoord;

${WAVE_GLSL}

void main() {
  vec3 normal = waveNormal(vWorldPos.xz, uTime);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  // 场景深度差 → 沿视线的水深：浅滩透明、深水浓重
  vec2 screenUV = gl_FragCoord.xy / uResolution;
  float sceneViewZ = perspectiveDepthToViewZ(texture2D(uDepth, screenUV).x, uCameraNear, uCameraFar);
  float waterDepth = max(vViewZ - sceneViewZ, 0.0);

  float waterAlpha = mix(0.45, 0.96, smoothstep(0.0, 7.0, waterDepth));
  vec3 waterColor = mix(uShallowColor, uDeepColor, smoothstep(0.0, 9.0, waterDepth));

  // 夜间压暗固有色（反射贴图本身已随天空变暗）
  float dim = mix(1.0, 0.22, uNight);
  waterColor *= dim;

  vec2 ruv = vMirrorCoord.xy / vMirrorCoord.w + normal.xz * 0.06;
  vec3 reflection = texture2D(uMirror, ruv).rgb;

  float fresnel = clamp(pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0), 0.04, 0.85);

  // 泡沫：岸线带 + 浪尖，纹理流动扰动
  vec2 fuv = vWorldPos.xz * 0.085 + uTime * 0.04 * vec2(1.0, 0.6) + normal.xz * 0.4;
  float foamTex = texture2D(uFoamTex, fuv).r;
  float foamShore = 1.0 - smoothstep(0.0, 1.6, waterDepth);
  float crestFoam = smoothstep(0.65, 1.0, vCrest) * 0.5;
  float foam = clamp(max(foamShore, crestFoam) * foamTex, 0.0, 1.0);

  // 泡沫在 fresnel 混合前并入，并削减镜面占比，保证掠射角下仍可见
  vec3 base = mix(waterColor, uFoamColor * dim, foam);
  vec3 col = mix(base, reflection, fresnel * (1.0 - 0.8 * foam));

  float dayB = clamp(uSunDir.y, 0.0, 1.0);
  float glint = pow(max(dot(reflect(-uSunDir, normal), viewDir), 0.0), 180.0) * 1.2 * dayB;
  col += vec3(1.0, 0.92, 0.78) * glint;

  float alpha = max(waterAlpha, foam * 0.9);

  // 线性雾，uniform 每帧从 scene.fog 同步（ShaderMaterial 不走内置雾）
  float fogFactor = smoothstep(uFogNear, uFogFar, -vViewZ);
  col = mix(col, uFogColor, fogFactor);

  gl_FragColor = vec4(col, alpha);
}`;

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function makeGrid(rand, n) {
  const g = new Float32Array(n * n);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  return g;
}

function sampleGrid(grid, n, fx, fy) {
  const xi = Math.floor(fx);
  const yi = Math.floor(fy);
  const tx = smooth(fx - xi);
  const ty = smooth(fy - yi);
  const x0 = xi % n;
  const y0 = yi % n;
  const x1 = (x0 + 1) % n;
  const y1 = (y0 + 1) % n;
  const v00 = grid[y0 * n + x0];
  const v10 = grid[y0 * n + x1];
  const v01 = grid[y1 * n + x0];
  const v11 = grid[y1 * n + x1];
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}

// 两个 octave 的程序化泡沫噪声，保底亮度让岸线始终成形
function buildFoamTexture(seed) {
  const size = 256;
  const rand = mulberry32(seed);
  const n1 = 8;
  const n2 = 20;
  const grid1 = makeGrid(rand, n1);
  const grid2 = makeGrid(rand, n2);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const raw = sampleGrid(grid1, n1, u * n1, v * n1) + 0.5 * sampleGrid(grid2, n2, u * n2, v * n2);
      const t = Math.min(1, Math.max(0, (raw / 1.5 - 0.34) / 0.38));
      const val = (0.22 + 0.78 * smooth(t)) * 255;
      const i = (y * size + x) * 4;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildRingTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.66, 'rgba(255,255,255,0)');
  grad.addColorStop(0.84, 'rgba(255,255,255,1)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export class WaterSurface {
  constructor(game) {
    this.game = game;
    this.waterY = game.terrain.waterY;

    // —— 平面反射：镜像相机 + textureMatrix（参照 addon Water 的斜裁剪方案） ——
    this.reflectionRT = new THREE.WebGLRenderTarget(REFLECTION_SIZE, REFLECTION_SIZE);
    this._mirrorCamera = new THREE.PerspectiveCamera();
    this._textureMatrix = new THREE.Matrix4();
    this._mirrorPlane = new THREE.Plane();
    this._planeNormal = new THREE.Vector3();
    this._mirrorPos = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._rotMat = new THREE.Matrix4();
    this._lookAt = new THREE.Vector3();
    this._view = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._clipPlane = new THREE.Vector4();
    this._q = new THREE.Vector4();
    this._size = new THREE.Vector2();
    this._reflectionCleared = false; // 跳过反射渲染时是否已清过 RT，避免每帧重复清
    this._prevClearColor = new THREE.Color();

    // —— 场景深度：半分辨率 RT，主相机渲染（水体隐藏），用于浅滩透明 + 岸线泡沫 ——
    game.renderer.getDrawingBufferSize(this._size);
    const dw = Math.max(1, Math.floor(this._size.x / 2));
    const dh = Math.max(1, Math.floor(this._size.y / 2));
    const depthTexture = new THREE.DepthTexture(dw, dh);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;
    this.depthRT = new THREE.WebGLRenderTarget(dw, dh, { depthTexture });

    this.foamTex = buildFoamTexture(game.worldSeed + 101);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTextureMatrix: { value: this._textureMatrix },
        uMirror: { value: this.reflectionRT.texture },
        uDepth: { value: depthTexture },
        uFoamTex: { value: this.foamTex },
        uResolution: { value: new THREE.Vector2(this._size.x, this._size.y) },
        uCameraNear: { value: game.camera.near },
        uCameraFar: { value: game.camera.far },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uShallowColor: { value: new THREE.Color(0x2e6e74) },
        uDeepColor: { value: new THREE.Color(0x0d2b40) },
        uFoamColor: { value: new THREE.Color(0xe8f2f4) },
        uFogColor: { value: new THREE.Color(0xb8cfe0) },
        uFogNear: { value: 110 },
        uFogFar: { value: 1100 },
        uNight: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, PLANE_SEGS, PLANE_SEGS),
      this.material
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = this.waterY;
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    game.scene.add(this.mesh);

    // —— 溅水环池 ——
    this.rings = [];
    const ringTex = buildRingTexture();
    const ringGeo = new THREE.RingGeometry(0.3, 0.45, 48);
    for (let i = 0; i < RING_POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ringTex,
        color: 0xdfeef4,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 2;
      game.scene.add(mesh);
      this.rings.push({ mesh, mat, t: 0, targetScale: 1, active: false });
    }
  }

  splash(pos, strength) {
    const s = Math.min(1, Math.max(0, strength || 0));
    let ring = null;
    for (const r of this.rings) {
      if (!r.active) {
        ring = r;
        break;
      }
      if (!ring || r.t > ring.t) ring = r; // 无空闲时复用最旧的
    }
    ring.active = true;
    ring.t = 0;
    ring.targetScale = 2.5 + 3 * s;
    ring.mesh.position.set(pos.x, this.waterY + 0.08, pos.z);
    ring.mesh.scale.setScalar(1);
    ring.mat.opacity = 0.8;
    ring.mesh.visible = true;

    if (this.game.effects) {
      this.game.effects.spawnBurst(pos, '#dcecf2', Math.round(10 + 10 * s), 4 + 4 * s, 0.5, 0.12);
    }
  }

  update(dt) {
    const game = this.game;
    const u = this.material.uniforms;

    u.uTime.value += dt;

    // 跟随玩家，按顶点网格步长吸附
    const p = game.player && game.player.pos ? game.player.pos : game.camera.position;
    this.mesh.position.x = Math.round(p.x / GRID_STEP) * GRID_STEP;
    this.mesh.position.z = Math.round(p.z / GRID_STEP) * GRID_STEP;
    this.mesh.updateMatrixWorld();

    u.uSunDir.value.copy(game.sky.sunDir);
    u.uNight.value = game.sky.nightFactor;
    const fog = game.scene.fog;
    if (fog) {
      u.uFogColor.value.copy(fog.color);
      u.uFogNear.value = fog.near;
      u.uFogFar.value = fog.far;
    }
    u.uCameraNear.value = game.camera.near;
    u.uCameraFar.value = game.camera.far;

    // 分辨率 / 深度 RT 跟随窗口
    game.renderer.getDrawingBufferSize(this._size);
    u.uResolution.value.set(this._size.x, this._size.y);
    const dw = Math.max(1, Math.floor(this._size.x / 2));
    const dh = Math.max(1, Math.floor(this._size.y / 2));
    if (this.depthRT.width !== dw || this.depthRT.height !== dh) {
      this.depthRT.setSize(dw, dh);
    }

    this._renderDepth();
    this._renderReflection();

    for (const ring of this.rings) {
      if (!ring.active) continue;
      ring.t += dt;
      const k = ring.t / RING_LIFE;
      if (k >= 1) {
        ring.active = false;
        ring.mesh.visible = false;
        ring.mat.opacity = 0;
        continue;
      }
      const e = 1 - (1 - k) * (1 - k);
      ring.mesh.scale.setScalar(1 + (ring.targetScale - 1) * e);
      ring.mat.opacity = 0.8 * (1 - k);
    }
  }

  _renderDepth() {
    const renderer = this.game.renderer;
    const prevRT = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.autoUpdate;
    const prevXr = renderer.xr.enabled;

    this.mesh.visible = false;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;

    renderer.setRenderTarget(this.depthRT);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(this.game.scene, this.game.camera);

    this.mesh.visible = true;
    renderer.xr.enabled = prevXr;
    renderer.shadowMap.autoUpdate = prevShadow;
    renderer.setRenderTarget(prevRT);
  }

  _renderReflection() {
    const renderer = this.game.renderer;
    const camera = this.game.camera;
    camera.updateMatrixWorld();

    this._mirrorPos.setFromMatrixPosition(this.mesh.matrixWorld);
    this._camPos.setFromMatrixPosition(camera.matrixWorld);

    // 相机在水面以下：跳过反射渲染，但需清掉陈旧反射贴图
    if (this._camPos.y < this.waterY) {
      this._clearReflection();
      return;
    }

    this._rotMat.extractRotation(this.mesh.matrixWorld);
    const normal = this._planeNormal.set(0, 0, 1).applyMatrix4(this._rotMat);

    const view = this._view.subVectors(this._mirrorPos, this._camPos);
    if (view.dot(normal) > 0) {
      // 背面朝向时不渲染，同样清成中性色防陈旧采样
      this._clearReflection();
      return;
    }

    view.reflect(normal).negate();
    view.add(this._mirrorPos);

    this._rotMat.extractRotation(camera.matrixWorld);
    this._lookAt.set(0, 0, -1).applyMatrix4(this._rotMat).add(this._camPos);

    const target = this._target.subVectors(this._mirrorPos, this._lookAt);
    target.reflect(normal).negate();
    target.add(this._mirrorPos);

    const mirrorCamera = this._mirrorCamera;
    mirrorCamera.position.copy(view);
    mirrorCamera.up.set(0, 1, 0);
    mirrorCamera.up.applyMatrix4(this._rotMat);
    mirrorCamera.up.reflect(normal);
    mirrorCamera.lookAt(target);

    mirrorCamera.far = camera.far;
    mirrorCamera.updateMatrixWorld();
    mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);

    this._textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this._textureMatrix.multiply(mirrorCamera.projectionMatrix);
    this._textureMatrix.multiply(mirrorCamera.matrixWorldInverse);

    // 斜近裁剪面（Lengyel oblique clipping）：只反射水面以上的内容
    this._mirrorPlane.setFromNormalAndCoplanarPoint(normal, this._mirrorPos);
    this._mirrorPlane.applyMatrix4(mirrorCamera.matrixWorldInverse);

    const clipPlane = this._clipPlane.set(
      this._mirrorPlane.normal.x,
      this._mirrorPlane.normal.y,
      this._mirrorPlane.normal.z,
      this._mirrorPlane.constant
    );

    const projectionMatrix = mirrorCamera.projectionMatrix;
    const q = this._q;
    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    projectionMatrix.elements[10] = clipPlane.z + 1.0 - CLIP_BIAS;
    projectionMatrix.elements[14] = clipPlane.w;

    const prevRT = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.autoUpdate;
    const prevXr = renderer.xr.enabled;

    this.mesh.visible = false;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;

    renderer.setRenderTarget(this.reflectionRT);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(this.game.scene, mirrorCamera);

    this.mesh.visible = true;
    renderer.xr.enabled = prevXr;
    renderer.shadowMap.autoUpdate = prevShadow;
    renderer.setRenderTarget(prevRT);
    this._reflectionCleared = false;
  }

  // 潜水/背面视角跳过反射渲染时调用：把反射 RT 清成雾色（水面继续采样也是中性色），
  // 布尔标志保证只在「渲染态 → 跳过态」切换时清一次
  _clearReflection() {
    if (this._reflectionCleared) return;
    const renderer = this.game.renderer;
    const prevRT = renderer.getRenderTarget();
    const prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this._prevClearColor);

    const fog = this.game.scene.fog;
    renderer.setClearColor(fog ? fog.color : this.material.uniforms.uFogColor.value, 1);
    renderer.setRenderTarget(this.reflectionRT);
    renderer.clear();

    renderer.setRenderTarget(prevRT);
    renderer.setClearColor(this._prevClearColor, prevAlpha);
    this._reflectionCleared = true;
  }
}
