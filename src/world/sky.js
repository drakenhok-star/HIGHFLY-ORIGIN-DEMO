import * as THREE from 'three';
import { Sky as SkyDome } from 'three/addons/objects/Sky.js';
import { mulberry32 } from '../core/noise.js';

const AURORA_VERT = `
uniform float uTime;
uniform float uFreq;
uniform float uPhase;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.y += sin(p.x * uFreq + uTime + uPhase) * 12.0;
  p.y += sin(p.x * uFreq * 2.3 - uTime * 0.7 + uPhase * 2.0) * 4.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const AURORA_FRAG = `
uniform float uOpacity;
uniform float uTime;
uniform float uPhase;
varying vec2 vUv;
void main() {
  float band = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
  float curtain = 0.7 + 0.3 * sin(vUv.x * 42.0 + uTime * 0.6 + uPhase);
  curtain *= 0.85 + 0.15 * sin(vUv.x * 9.0 - uTime * 0.25 + uPhase * 3.0);
  vec3 green = vec3(0.224, 0.902, 0.627);
  vec3 teal = vec3(0.169, 0.714, 0.788);
  vec3 col = mix(green, teal, vUv.y);
  float a = band * curtain * uOpacity;
  gl_FragColor = vec4(col * a * 1.7, a);
}
`;

const COL_SUN_NOON = new THREE.Color(0xfff4e0);
const COL_SUN_HORIZON = new THREE.Color(0xff9a5a);
const COL_HEMI_SKY_DAY = new THREE.Color(0xbcd3e8);
const COL_HEMI_SKY_NIGHT = new THREE.Color(0x3a4f75);
const COL_HEMI_GND_DAY = new THREE.Color(0x5a5446);
const COL_HEMI_GND_NIGHT = new THREE.Color(0x232a38);
const COL_BG_NIGHT = new THREE.Color(0x16213a);
const COL_BG_DUSK = new THREE.Color(0xc77b4a);
const COL_BG_DAY = new THREE.Color(0x8fa9bd);

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class Sky {
  constructor(game) {
    this.game = game;
    this.nightFactor = 0;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this._auroraTime = 0;

    const scene = game.scene;

    this.sun = new THREE.DirectionalLight(0xfff4e0, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 30;
    sc.far = 620;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.moon = new THREE.DirectionalLight(0xa9c0e2, 0.3);
    // 月影照抄 sun 的 shadow camera：夜里房屋/树木有影子才分得清形体层次
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const mc = this.moon.shadow.camera;
    mc.left = -70;
    mc.right = 70;
    mc.top = 70;
    mc.bottom = -70;
    mc.near = 30;
    mc.far = 620;
    this.moon.shadow.bias = -0.0005;
    scene.add(this.moon);
    scene.add(this.moon.target);

    this.hemi = new THREE.HemisphereLight(0xbcd3e8, 0x5a5446, 0.55);
    scene.add(this.hemi);

    // sky shell / stars / moon disc / aurora all ride along with the player
    this.skyGroup = new THREE.Group();
    scene.add(this.skyGroup);

    this.skyMesh = new SkyDome();
    this.skyMesh.scale.setScalar(2000);
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -1;
    this.skyUniforms = this.skyMesh.material.uniforms;
    this.skyUniforms.turbidity.value = 2.0;
    this.skyUniforms.rayleigh.value = 2.6;
    this.skyUniforms.mieCoefficient.value = 0.0025;
    this.skyUniforms.mieDirectionalG.value = 0.8;
    this.skyGroup.add(this.skyMesh);

    const rand = mulberry32(1337 + 53);
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = rand() * Math.PI * 2;
      const y = 0.06 + rand() * 0.94;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      starPos[i * 3] = Math.cos(theta) * r * 1700;
      starPos[i * 3 + 1] = y * 1700;
      starPos[i * 3 + 2] = Math.sin(theta) * r * 1700;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xdfe8ff,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.frustumCulled = false;
    this.skyGroup.add(this.stars);

    this.moonMat = new THREE.MeshBasicMaterial({
      color: 0xe8eef5,
      transparent: true,
      opacity: 1,
      fog: false,
      depthWrite: false,
    });
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(40, 18, 12), this.moonMat);
    this.moonMesh.frustumCulled = false;
    this.skyGroup.add(this.moonMesh);

    const makeGlowTex = (innerStop, midAlpha) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const ctx = cv.getContext('2d');
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(innerStop, 'rgba(255,244,220,' + midAlpha + ')');
      grad.addColorStop(1, 'rgba(255,210,150,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    this.sunDiscMat = new THREE.SpriteMaterial({
      map: makeGlowTex(0.18, 0.95),
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.sunDisc = new THREE.Sprite(this.sunDiscMat);
    this.sunDisc.scale.setScalar(95);
    this.skyGroup.add(this.sunDisc);
    this.sunHaloMat = new THREE.SpriteMaterial({
      map: makeGlowTex(0.5, 0.35),
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.45,
    });
    this.sunHalo = new THREE.Sprite(this.sunHaloMat);
    this.sunHalo.scale.setScalar(340);
    this.skyGroup.add(this.sunHalo);
    this._sunTint = new THREE.Color();

    this.auroraGroup = new THREE.Group();
    this.skyGroup.add(this.auroraGroup);
    this.auroraMats = [];
    const ribbons = [
      { x: -130, y: 215, z: -700, freq: 0.025, phase: 0.0, ry: 0.18, rx: 0.08, rz: 0.05 },
      { x: 70, y: 265, z: -735, freq: 0.018, phase: 2.1, ry: -0.14, rx: 0.12, rz: -0.06 },
      { x: -20, y: 312, z: -675, freq: 0.031, phase: 4.4, ry: 0.06, rx: 0.16, rz: 0.03 },
    ];
    for (const rb of ribbons) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFreq: { value: rb.freq },
          uPhase: { value: rb.phase },
          uOpacity: { value: 0 },
        },
        vertexShader: AURORA_VERT,
        fragmentShader: AURORA_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(500, 70, 96, 1), mat);
      mesh.position.set(rb.x, rb.y, rb.z);
      mesh.rotation.set(rb.rx, rb.ry, rb.rz);
      mesh.frustumCulled = false;
      this.auroraGroup.add(mesh);
      this.auroraMats.push(mat);
    }

    if (!(scene.background instanceof THREE.Color)) {
      scene.background = new THREE.Color(0xb8cfe0);
    }
    scene.fog = new THREE.Fog(0xb8cfe0, 80, 1100);

    this._moonDir = new THREE.Vector3();
    this._bg = new THREE.Color();
  }

  update(dt) {
    const game = this.game;
    const t = game.time;
    t.dayTime = (t.dayTime + dt / t.dayLength) % 1;
    this._auroraTime += dt;

    const sunAngle = (t.dayTime - 0.25) * Math.PI * 2;
    const elev = Math.sin(sunAngle);
    const dayFactor = smoothstep(-0.06, 0.18, elev);
    this.nightFactor = 1 - dayFactor;

    const anchor = game.player ? game.player.pos : game.camera.position;

    this.sunDir.set(Math.cos(sunAngle) * 0.95, elev, -0.35).normalize();
    this._moonDir.copy(this.sunDir).negate();

    this.skyUniforms.sunPosition.value.copy(this.sunDir).multiplyScalar(100);

    this.sun.position.copy(anchor).addScaledVector(this.sunDir, 300);
    this.sun.target.position.copy(anchor);
    this.sun.color.lerpColors(COL_SUN_HORIZON, COL_SUN_NOON, smoothstep(0, 0.55, elev));
    this.sun.intensity = 6.5 * dayFactor;
    this.sun.visible = dayFactor > 0.003;

    this.moon.position.copy(anchor).addScaledVector(this._moonDir, 300);
    this.moon.target.position.copy(anchor);
    this.moon.intensity = 3.0 * this.nightFactor;
    this.moon.visible = this.nightFactor > 0.02;

    this.hemi.color.lerpColors(COL_HEMI_SKY_NIGHT, COL_HEMI_SKY_DAY, dayFactor);
    this.hemi.groundColor.lerpColors(COL_HEMI_GND_NIGHT, COL_HEMI_GND_DAY, dayFactor);
    this.hemi.intensity = 0.75 + 0.65 * dayFactor;

    // 室内：在正常昼夜公式算完之后整体压暗（不污染上面的存量公式）
    if (game.interiors && game.interiors.inside) {
      this.hemi.intensity *= 0.15;
      this.sun.intensity *= 0.35;
      // moon 是平行光会穿墙，夜间调亮后不压会把室内染成一片蓝
      this.moon.intensity *= 0.1;
    }

    const glow = Math.pow(1 - Math.min(1, Math.abs(elev) * 3.2), 1.5);
    this._bg.lerpColors(COL_BG_NIGHT, COL_BG_DAY, dayFactor);
    this._bg.lerp(COL_BG_DUSK, glow * 0.45);

    game.scene.background.copy(this._bg);
    game.scene.fog.color.copy(this._bg);
    game.scene.fog.near = 110;
    game.scene.fog.far = 720 + 780 * dayFactor;

    this.starMat.opacity = this.nightFactor;
    this.stars.visible = this.nightFactor > 0.01;

    this.moonMesh.position.copy(this._moonDir).multiplyScalar(1500);
    this.moonMesh.visible = this._moonDir.y > -0.08;
    this.moonMat.opacity = 0.25 + 0.75 * this.nightFactor;

    // 日盘贴地平线变暖变大，正午小而白；山体可遮挡（depthTest 默认开）
    this._sunTint.copy(COL_SUN_NOON).lerp(COL_SUN_HORIZON, glow);
    this.sunDisc.position.copy(this.sunDir).multiplyScalar(1500);
    this.sunHalo.position.copy(this.sunDir).multiplyScalar(1480);
    const sunVis = this.sunDir.y > -0.06;
    this.sunDisc.visible = sunVis;
    this.sunHalo.visible = sunVis;
    this.sunDiscMat.color.copy(this._sunTint);
    this.sunHaloMat.color.copy(this._sunTint);
    this.sunDiscMat.opacity = smoothstep(-0.05, 0.06, this.sunDir.y);
    this.sunHaloMat.opacity = 0.45 * smoothstep(-0.05, 0.1, this.sunDir.y) * (0.6 + 0.4 * glow);
    const discScale = 95 * (1 + glow * 0.9);
    this.sunDisc.scale.setScalar(discScale);
    this.sunHalo.scale.setScalar(340 * (1 + glow * 0.5));

    const auroraOpacity = this.nightFactor * 0.55;
    this.auroraGroup.visible = auroraOpacity > 0.01;
    for (const mat of this.auroraMats) {
      mat.uniforms.uTime.value = this._auroraTime;
      mat.uniforms.uOpacity.value = auroraOpacity;
    }

    this.skyGroup.position.set(anchor.x, 0, anchor.z);
  }
}
