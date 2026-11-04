import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/noise.js';

// 风暮地穴 BOSS 厅尽头龙吼石墙的世界坐标。structures.js 导入它注册 wordWalls 条目；
// 墙体网格与符文材质由本模块构建，并在构造时回填该条目的 setLearned/resetLearned。
export const WULD_WALL_POS = { x: -3000, y: 34, z: -2940.5 };

const ROOM_Y = 34;
const HOUSE_X = 3000;
const HOUSE_Z = 3000;
const BARROW_X = -3000;
const BARROW_Z = -3000;

// 地穴可行走区（局部坐标，对应 _buildBarrow 的五段布局；hx 为半宽，已留 0.4 墙边距）。
// 墙体无碰撞网格，玩家位置靠 constrain() 夹取在这些段内，防旋风冲刺/步行穿墙出屋。
const BARROW_WALK_SEGS = [
  { z0: -4.6, z1: 5, hx: 5.6 },   // 入口厅
  { z0: 5, z1: 19, hx: 1.6 },     // 回廊
  { z0: 19, z1: 35, hx: 7.6 },    // 圆厅
  { z0: 35, z1: 43, hx: 1.6 },    // 短廊
  { z0: 43, z1: 60.6, hx: 9.6 },  // BOSS 厅
];

// 白色径向光斑贴图：壁炉烟雾 Sprite 用
function puffTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

// 黑底白刻痕的棱角符文条：作 emissiveMap，只有刻痕发光
function runeTexture(seed) {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  const rng = mulberry32(seed);
  ctx.strokeStyle = '#dff2ff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const glyphs = 16;
  const cw = cv.width / glyphs;
  for (let i = 0; i < glyphs; i++) {
    const x0 = i * cw + cw * 0.22;
    const x1 = i * cw + cw * 0.78;
    const yTop = 26;
    const yBot = 102;
    ctx.beginPath();
    // 主竖杆 + 2-3 道斜枝，模仿龙语楔形刻痕
    const sx = x0 + rng() * (x1 - x0) * 0.3;
    ctx.moveTo(sx, yTop);
    ctx.lineTo(sx + (rng() - 0.5) * 8, yBot);
    const branches = 2 + Math.floor(rng() * 2);
    for (let b = 0; b < branches; b++) {
      const ys = yTop + rng() * (yBot - yTop) * 0.8;
      ctx.moveTo(sx, ys);
      ctx.lineTo(x1, ys + (rng() - 0.5) * 46);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 静态小件合并前的就位变换：依次 rotateX -> rotateZ -> rotateY 再平移（调用处按此顺序给欧拉角）
function tGeo(geo, x, y, z, rx = 0, rz = 0, ry = 0) {
  if (rx) geo.rotateX(rx);
  if (rz) geo.rotateZ(rz);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return geo;
}

export class Interiors {
  constructor(game) {
    this.game = game;
    this.inside = null;
    this.currentDoor = null;
    this.doors = [];
    this.rooms = {};
    this._busy = false;
    this._busyT = 0;

    this.root = new THREE.Group();
    game.scene.add(this.root);

    this.flames = [];
    this.smoke = [];
    this._coneGeo = new THREE.ConeGeometry(0.3, 0.8, 6);
    this._puffTex = puffTexture();

    // 木屋内饰：与室外建筑同族色板（墙 0x8f6e4d 系，地板更深的木板色）
    this.matWallIn = new THREE.MeshStandardMaterial({ color: 0x7d6044, roughness: 0.88, metalness: 0 });
    this.matFloorIn = new THREE.MeshStandardMaterial({ color: 0x53402d, roughness: 0.92, metalness: 0 });
    this.matCeilIn = new THREE.MeshStandardMaterial({ color: 0x47372a, roughness: 0.95, metalness: 0 });
    this.matBeam = new THREE.MeshStandardMaterial({ color: 0x3c2f21, roughness: 0.9, metalness: 0 });
    this.matDoorIn = new THREE.MeshStandardMaterial({ color: 0x4f3e2c, roughness: 0.82, metalness: 0 });
    this.matFurn = new THREE.MeshStandardMaterial({ color: 0x6b4f37, roughness: 0.8, metalness: 0 });
    this.matFurnDark = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.85, metalness: 0 });
    this.matShelf = new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 0.85, metalness: 0 });
    this.matRug = new THREE.MeshStandardMaterial({ color: 0x77392c, roughness: 1, metalness: 0 });
    this.matBedding = new THREE.MeshStandardMaterial({ color: 0xbfb094, roughness: 0.95, metalness: 0 });
    this.matPillow = new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 0.95, metalness: 0 });
    this.matBlanket = new THREE.MeshStandardMaterial({ color: 0x7a4434, roughness: 1, metalness: 0 });
    this.matCandle = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.7, metalness: 0 });
    this.matMetal = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.35, metalness: 0.7 });
    this.matBlade = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, roughness: 0.3, metalness: 0.8 });
    this.matAnvilIn = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.5, metalness: 0.7 });
    this.matStoneIn = new THREE.MeshStandardMaterial({ color: 0x7b7873, roughness: 1, metalness: 0 });
    this.matSoot = new THREE.MeshStandardMaterial({ color: 0x16120e, roughness: 1, metalness: 0 });
    this.matWater = new THREE.MeshStandardMaterial({ color: 0x27414c, roughness: 0.2, metalness: 0 });
    // 假窗窗纸：emissiveIntensity 由 update() 按 sky.nightFactor 驱动（白天≈0.9 透亮、夜里≈0.15）
    this.matWindowIn = new THREE.MeshStandardMaterial({ color: 0xcdb188, emissive: 0xffdfae, emissiveIntensity: 0.9, transparent: true, opacity: 0.88, roughness: 0.9, metalness: 0 });
    this.matBread = new THREE.MeshStandardMaterial({ color: 0xa9764b, roughness: 0.9, metalness: 0 });
    this.matCheese = new THREE.MeshStandardMaterial({ color: 0xd8b055, roughness: 0.75, metalness: 0 });
    // 火焰/炭床（炭床发光强度在 update 里整体脉动）
    this.matFlame = new THREE.MeshStandardMaterial({ color: 0xff8c3a, emissive: 0xff8c3a, emissiveIntensity: 2.2 });
    this.matCandleFlame = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffd9a0, emissiveIntensity: 1.8 });
    this.matCoal = new THREE.MeshStandardMaterial({ color: 0x2a1410, emissive: 0xff5a22, emissiveIntensity: 1.2 });
    // 地穴石材（0x6e6b64 系）
    this.matCrypt = new THREE.MeshStandardMaterial({ color: 0x6e6b64, roughness: 1, metalness: 0 });
    this.matCryptDark = new THREE.MeshStandardMaterial({ color: 0x57544e, roughness: 1, metalness: 0 });
    this.matCryptFloor = new THREE.MeshStandardMaterial({ color: 0x4e4b45, roughness: 1, metalness: 0 });
    this.matBone = new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.9, metalness: 0 });
    this.matSlab = new THREE.MeshStandardMaterial({ color: 0x67645d, roughness: 1, metalness: 0, side: THREE.DoubleSide });

    this._buildInn();
    this._buildOlafHouse();
    this._buildSmithy();
    this._buildBarrow();
    this._attachWuldEntry();
  }

  // ---------- 基础几何工具 ----------

  _box(w, h, d, mat, x, y, z, parent, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // 沿 x 方向的墙（z 固定）；gap = {c, w, hh} 在 c 处留宽 w、高 hh 的门洞，洞顶补楣
  _wallX(parent, mat, z, x0, x1, h, t, gap) {
    if (!gap) {
      this._box(x1 - x0, h, t, mat, (x0 + x1) / 2, h / 2, z, parent);
      return;
    }
    const gl = gap.c - gap.w / 2;
    const gr = gap.c + gap.w / 2;
    if (gl > x0) this._box(gl - x0, h, t, mat, (x0 + gl) / 2, h / 2, z, parent);
    if (x1 > gr) this._box(x1 - gr, h, t, mat, (gr + x1) / 2, h / 2, z, parent);
    if (h > gap.hh) this._box(gap.w, h - gap.hh, t, mat, gap.c, gap.hh + (h - gap.hh) / 2, z, parent);
  }

  // 沿 z 方向的墙（x 固定）
  _wallZ(parent, mat, x, z0, z1, h, t, gap) {
    if (!gap) {
      this._box(t, h, z1 - z0, mat, x, h / 2, (z0 + z1) / 2, parent);
      return;
    }
    const gl = gap.c - gap.w / 2;
    const gr = gap.c + gap.w / 2;
    if (gl > z0) this._box(t, h, gl - z0, mat, x, h / 2, (z0 + gl) / 2, parent);
    if (z1 > gr) this._box(t, h, z1 - gr, mat, x, h / 2, (gr + z1) / 2, parent);
    if (h > gap.hh) this._box(t, h - gap.hh, gap.w, mat, x, gap.hh + (h - gap.hh) / 2, gap.c, parent);
  }

  // 木屋外壳：地板+天花+四墙，门洞在 +z 墙，门洞由视觉门板封住（即出口触发处）
  _roomShell(g, w, d, h, doorW, doorH) {
    const t = 0.35;
    // 地板顶面压在地形上方 3cm：盖住地形又不抬脚（玩家仍走解析地形高度 34）
    this._box(w + 2 * t, 0.12, d + 2 * t, this.matFloorIn, 0, -0.03, 0, g, false);
    // 天花保留投影：白天屋顶为室内遮挡直射阳光
    this._box(w + 2 * t, 0.28, d + 2 * t, this.matCeilIn, 0, h + 0.14, 0, g);
    this._wallX(g, this.matWallIn, d / 2 + t / 2, -w / 2 - t, w / 2 + t, h, t, { c: 0, w: doorW, hh: doorH });
    this._wallX(g, this.matWallIn, -d / 2 - t / 2, -w / 2 - t, w / 2 + t, h, t, null);
    this._wallZ(g, this.matWallIn, -w / 2 - t / 2, -d / 2, d / 2, h, t, null);
    this._wallZ(g, this.matWallIn, w / 2 + t / 2, -d / 2, d / 2, h, t, null);
    this._box(doorW + 0.18, doorH, 0.14, this.matDoorIn, 0, doorH / 2, d / 2 + t / 2, g);
  }

  _houseRoom(id, name, cx, cz, w, d, h) {
    const g = new THREE.Group();
    g.position.set(cx, ROOM_Y, cz);
    this.root.add(g);
    this._roomShell(g, w, d, h, 1.5, 2.45);
    for (const bz of [-d / 3, 0, d / 3]) this._box(w, 0.2, 0.24, this.matBeam, 0, h - 0.1, bz, g);
    // 暖色环境补光（decay=1 缓衰减）：让屋内整体读得出来，火光只做主调
    const fill = new THREE.PointLight(0xffd2a8, 7, 20, 1);
    fill.position.set(0, h - 0.4, 0);
    g.add(fill);
    this.rooms[id] = {
      id,
      kind: 'house',
      name,
      center: new THREE.Vector3(cx, ROOM_Y, cz),
      // 出生点离门内 3.2m：第三人称相机（进屋时压到 3m）不会落到墙外
      spawnPos: new THREE.Vector3(cx, ROOM_Y, cz + d / 2 - 3.2),
      spawnYaw: 0, // 朝 -z（进屋方向）
      exitPos: new THREE.Vector3(cx, ROOM_Y, cz + d / 2 - 0.4),
      // 可行走矩形（留 0.4 墙边距）：constrain() 用，防穿墙出屋
      bounds: { minX: cx - w / 2 + 0.4, maxX: cx + w / 2 - 0.4, minZ: cz - d / 2 + 0.4, maxZ: cz + d / 2 - 0.4 },
    };
    return g;
  }

  // 静态小件按材质合并成单 mesh：控制室内 draw call / 独立 Mesh 数
  _merged(parent, geos, mat, cast = false) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // 三间木屋共通精修：假窗 + 天花斜椽/吊筋 + 地板缝条。wins = [[side(±1), z], ...]
  // 窗全部件压在墙内面 |x|=w/2 以内，不穿外壳；窗纸共用 matWindowIn 以便昼夜统一驱动
  _houseDecor(g, w, d, h, wins) {
    const hw = w / 2;
    const wood = [];
    const papers = [];
    for (const [side, zc] of wins) {
      const xf = side * (hw - 0.06);
      wood.push(tGeo(new THREE.BoxGeometry(0.1, 0.09, 1.08), xf, 2.545, zc));
      wood.push(tGeo(new THREE.BoxGeometry(0.1, 0.09, 1.08), xf, 1.355, zc));
      wood.push(tGeo(new THREE.BoxGeometry(0.1, 1.1, 0.09), xf, 1.95, zc - 0.495));
      wood.push(tGeo(new THREE.BoxGeometry(0.1, 1.1, 0.09), xf, 1.95, zc + 0.495));
      wood.push(tGeo(new THREE.BoxGeometry(0.06, 0.05, 0.9), xf, 1.95, zc));
      wood.push(tGeo(new THREE.BoxGeometry(0.06, 1.1, 0.05), xf, 1.95, zc));
      papers.push(tGeo(new THREE.BoxGeometry(0.03, 1.1, 0.9), side * (hw - 0.02), 1.95, zc));
    }
    // 斜椽成对贴天花（外端低内端高），跳过与既有平梁 z=0/±d/3 重合的位置
    const rise = 0.34;
    const ang = Math.atan2(rise, hw);
    const len = Math.hypot(hw, rise);
    for (let zr = -d / 2 + 1; zr <= d / 2 - 0.9; zr += 2) {
      if (Math.abs(zr) < 0.6 || Math.abs(Math.abs(zr) - d / 3) < 0.6) continue;
      wood.push(tGeo(new THREE.BoxGeometry(len, 0.09, 0.14), -hw / 2, h - 0.25, zr, 0, ang));
      wood.push(tGeo(new THREE.BoxGeometry(len, 0.09, 0.14), hw / 2, h - 0.25, zr, 0, -ang));
    }
    // 吊筋两根挂脊线，底端约 h-0.64 仍高于人身，不占行走空间
    wood.push(tGeo(new THREE.BoxGeometry(0.13, 0.55, 0.13), 0, h - 0.36, -d / 4));
    wood.push(tGeo(new THREE.BoxGeometry(0.13, 0.55, 0.13), 0, h - 0.36, d / 4));
    this._merged(g, wood, this.matBeam);
    this._merged(g, papers, this.matWindowIn);
    // 地板缝条/错色窄板条：x 避开中轴走道 |x|<0.9，极薄贴地打破大平板感
    const seams = [];
    seams.push(tGeo(new THREE.BoxGeometry(0.05, 0.014, d * 0.78), -hw * 0.56, 0.037, -0.4));
    seams.push(tGeo(new THREE.BoxGeometry(0.05, 0.014, d * 0.78), hw * 0.32, 0.037, 0.5));
    seams.push(tGeo(new THREE.BoxGeometry(0.34, 0.016, d * 0.55), hw * 0.68, 0.038, -0.2));
    this._merged(g, seams, this.matFurnDark);
  }

  // ---------- 道具构件 ----------

  _addFlame(parent, x, y, z, s, mat, lightDef) {
    const flame = new THREE.Mesh(this._coneGeo, mat);
    flame.position.set(x, y, z);
    flame.scale.setScalar(s);
    parent.add(flame);
    let light = null;
    if (lightDef) {
      light = new THREE.PointLight(lightDef.color, lightDef.i, lightDef.d);
      if (lightDef.decay !== undefined) light.decay = lightDef.decay;
      light.position.set(x, y + 0.35 * s, z);
      parent.add(light);
    }
    this.flames.push({ flame, light, phase: this.flames.length * 2.13, baseI: lightDef ? lightDef.i : 0, baseS: s });
    return flame;
  }

  _candle(parent, x, yTop, z, withLight) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 6), this.matCandle);
    c.position.set(x, yTop + 0.11, z);
    parent.add(c);
    this._addFlame(parent, x, yTop + 0.28, z, 0.18, this.matCandleFlame, withLight ? { color: 0xffd9a0, i: 2.2, d: 9 } : null);
  }

  _addSmoke(parent, x, y0, z, n) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteMaterial({ map: this._puffTex, color: 0x8d8780, transparent: true, opacity: 0, depthWrite: false });
      const spr = new THREE.Sprite(mat);
      spr.position.set(x, y0, z);
      parent.add(spr);
      this.smoke.push({ spr, mat, x, y0, z, life: 2.6, age: (i / n) * 2.6, phase: i * 1.7 });
    }
  }

  // 壁炉：石质围框 + 炭床 + 火焰锥 + 闪烁点光，opening 朝局部 +z
  _fireplace(parent, x, z, rotY, s, ceilH, withSmoke) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    parent.add(g);
    const MS = this.matStoneIn;
    this._box(2.6 * s, 0.22, 1.5 * s, MS, 0, 0.11, 0, g);
    this._box(0.55 * s, 2.1 * s, 1.1 * s, MS, -1.02 * s, 0.22 + 1.05 * s, 0, g);
    this._box(0.55 * s, 2.1 * s, 1.1 * s, MS, 1.02 * s, 0.22 + 1.05 * s, 0, g);
    this._box(2.6 * s, 2.1 * s, 0.3, MS, 0, 0.22 + 1.05 * s, -0.45 * s, g);
    this._box(1.5 * s, 1.3 * s, 0.8 * s, this.matSoot, 0, 0.22 + 0.65 * s, -0.12 * s, g);
    const lintelY = 0.22 + 2.1 * s;
    this._box(2.6 * s, 0.45 * s, 1.15 * s, MS, 0, lintelY + 0.225 * s, 0, g);
    const flueBase = lintelY + 0.45 * s;
    if (ceilH > flueBase) this._box(1.6 * s, ceilH - flueBase, 0.95 * s, MS, 0, flueBase + (ceilH - flueBase) / 2, -0.05 * s, g);
    // 柴堆与炭床
    for (const [lx, ry] of [[-0.12 * s, 0.35], [0.14 * s, -0.4]]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.1 * s, 0.85 * s, 6), this.matFurnDark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = ry;
      log.position.set(lx, 0.34, 0.1 * s);
      g.add(log);
    }
    this._box(1.1 * s, 0.07, 0.6 * s, this.matCoal, 0, 0.27, 0.08 * s, g, false);
    // decay=1 缓衰减让火光铺满半间屋，壁炉是房间的主光源
    this._addFlame(g, 0, 0.3 + 0.45 * s, 0.08 * s, 1.05 * s, this.matFlame, { color: 0xff8c3a, i: 9 * s, d: 24, decay: 1 });
    if (withSmoke) this._addSmoke(g, 0, 1.15, 0.55 * s, 4);
    return g;
  }

  // 地穴火盆：石座 + 火碗 + 炭 + 火焰（复用火把式闪烁）
  _brazier(parent, x, z, withLight) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.95, 8), this.matCryptDark);
    ped.position.y = 0.475;
    ped.castShadow = true;
    ped.receiveShadow = true;
    g.add(ped);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.24, 0.32, 8), this.matCrypt);
    bowl.position.y = 1.06;
    bowl.castShadow = true;
    g.add(bowl);
    const coal = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 8), this.matCoal);
    coal.position.y = 1.2;
    g.add(coal);
    this._addFlame(g, 0, 1.6, 0, 0.8, this.matFlame, withLight ? { color: 0xff9a4a, i: 6, d: 20, decay: 1 } : null);
  }

  _bonePile(parent, x, y, z, rng, n) {
    for (let i = 0; i < n; i++) {
      const w = 0.1 + rng() * 0.22;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.5, w * (1.4 + rng())), this.matBone);
      m.position.set(x + (rng() - 0.5) * 0.7, y + 0.05 + rng() * 0.08, z + (rng() - 0.5) * 0.7);
      m.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.4);
      m.receiveShadow = true;
      parent.add(m);
    }
  }

  // 走廊安葬壁龛：近黑内板 + 凸出石框 + 龛底白骨；side=-1 西墙 / +1 东墙（走廊半宽 2）
  _niche(parent, side, z, rng) {
    const xFace = side * 2;
    this._box(0.1, 1.5, 1.7, this.matSoot, xFace - side * 0.02, 1.35, z, parent, false);
    this._box(0.34, 0.2, 1.95, this.matCryptDark, xFace - side * 0.1, 2.2, z, parent);
    this._box(0.34, 0.2, 1.95, this.matCryptDark, xFace - side * 0.1, 0.5, z, parent);
    this._box(0.34, 1.9, 0.22, this.matCryptDark, xFace - side * 0.1, 1.35, z - 0.97, parent);
    this._box(0.34, 1.9, 0.22, this.matCryptDark, xFace - side * 0.1, 1.35, z + 0.97, parent);
    this._bonePile(parent, side * 1.6, 0.6, z, rng, 3);
  }

  _sarcophagus(parent, x, z, rotY) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    parent.add(g);
    this._box(2.6, 0.3, 1.5, this.matCryptDark, 0, 0.15, 0, g);
    this._box(2.2, 0.85, 1.15, this.matCrypt, 0, 0.72, 0, g);
    const lid = this._box(2.3, 0.22, 1.25, this.matCryptDark, 0.16, 1.24, 0, g);
    lid.rotation.z = 0.06; // 棺盖微微推开
  }

  // ---------- 三间木屋 ----------

  _buildInn() {
    const g = this._houseRoom('inn', '暖炉客栈', HOUSE_X - 60, HOUSE_Z, 10, 14, 3.6);
    const rng = mulberry32(7001);

    // 大壁炉（西墙中段，火光照亮全屋）
    this._fireplace(g, -4.5, -2.0, Math.PI / 2, 1.05, 3.6, true);

    // 长桌 + 条凳
    const table = (tx, tz) => {
      this._box(1.25, 0.1, 3.4, this.matFurn, tx, 0.78, tz, g);
      this._box(1.05, 0.73, 0.14, this.matFurnDark, tx, 0.365, tz - 1.45, g);
      this._box(1.05, 0.73, 0.14, this.matFurnDark, tx, 0.365, tz + 1.45, g);
      for (const bx of [-0.95, 0.95]) {
        this._box(0.4, 0.07, 3.1, this.matFurn, tx + bx, 0.5, tz, g);
        this._box(0.34, 0.47, 0.12, this.matFurnDark, tx + bx, 0.235, tz - 1.35, g);
        this._box(0.34, 0.47, 0.12, this.matFurnDark, tx + bx, 0.235, tz + 1.35, g);
      }
    };
    table(-1.7, 0.9);
    table(1.8, 0.9);

    // 桌面酒杯与木盘
    for (const [tx, tz] of [[-1.9, 0.0], [-1.5, 1.6], [1.6, 0.4], [2.0, 1.8]]) {
      const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 6), this.matMetal);
      tk.position.set(tx, 0.91, tz);
      tk.rotation.y = rng() * Math.PI;
      g.add(tk);
    }
    for (const [px, pz] of [[-1.7, 0.8], [1.8, -0.5]]) {
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 8), this.matFurnDark);
      pl.position.set(px, 0.845, pz);
      g.add(pl);
    }

    // 吧台（东墙）+ 搁板酒瓶 + 挂毯
    this._box(0.95, 1.02, 4.2, this.matFurnDark, 3.85, 0.51, -3.0, g);
    this._box(1.15, 0.07, 4.5, this.matBeam, 3.85, 1.06, -3.0, g);
    this._box(0.3, 0.06, 3.6, this.matShelf, 4.68, 1.6, -3.0, g);
    this._box(0.3, 0.06, 3.6, this.matShelf, 4.68, 2.15, -3.0, g);
    const bottleCols = [0x7a8c5a, 0x9c6a4a, 0x6a7a9c, 0x8c5a72];
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6),
        new THREE.MeshStandardMaterial({ color: bottleCols[i % 4], roughness: 0.35 }),
      );
      b.position.set(4.68, (i < 4 ? 1.6 : 2.15) + 0.18, -4.3 + (i % 4) * 0.85 + (i < 4 ? 0 : 0.4));
      g.add(b);
    }
    this._box(0.06, 1.7, 1.1, this.matRug, 4.86, 2.3, 0.6, g, false);

    // 烛光两处、地毯、北墙酒桶
    this._candle(g, -1.7, 0.83, -0.2, true);
    this._candle(g, 3.85, 1.1, -1.4, true);
    this._box(3.4, 0.04, 5.4, this.matRug, 0.0, 0.07, 0.9, g, false);
    for (const [bx, bz, br, bh] of [[-3.8, -6.0, 0.45, 1.0], [-2.85, -6.2, 0.38, 0.8]]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(br, br, bh, 10), this.matFurn);
      barrel.position.set(bx, bh / 2, bz);
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      g.add(barrel);
    }

    // 客栈宝箱：用 structures 的同款工厂追加（开盖动画/开箱逻辑沿用既有契约）
    const s = this.game.structures;
    if (s && typeof s._makeChest === 'function') {
      s._makeChest(HOUSE_X - 60 - 3.8, ROOM_Y + 0.03, HOUSE_Z + 5.5, 2.3, ['health_potion', 'mana_potion'], 60);
    }

    this._houseDecor(g, 10, 14, 3.6, [[-1, -5.4], [-1, 2.6], [1, 2.6], [1, 5.2]]);

    // 壁炉炖锅：横杆架在两侧石柱间（柱在 z=-2±1.02*1.05），链两节交错 + 半球锅，锅底悬在火苗顶(≈1.28)上方
    const iron = [];
    iron.push(tGeo(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), -4.42, 2.0, -2.0, Math.PI / 2));
    iron.push(tGeo(new THREE.TorusGeometry(0.05, 0.013, 4, 6), -4.42, 1.88, -2.0));
    iron.push(tGeo(new THREE.TorusGeometry(0.05, 0.013, 4, 6), -4.42, 1.79, -2.0, 0, 0, Math.PI / 2));
    iron.push(tGeo(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), -4.42, 1.66, -2.0));
    this._merged(g, iron, this.matAnvilIn);

    // 吧台后墙鹿角：骨色细锥拼装，挂在搁板(z<-1.2)与挂毯(z>0.05)之间的空档
    const antler = [];
    antler.push(tGeo(new THREE.BoxGeometry(0.06, 0.28, 0.2), 4.9, 2.45, -0.5));
    for (const az of [-1, 1]) {
      antler.push(tGeo(new THREE.ConeGeometry(0.03, 0.6, 5), 4.84, 2.72, -0.5 + az * 0.2, az * 0.7, 0.3));
      antler.push(tGeo(new THREE.ConeGeometry(0.02, 0.32, 5), 4.84, 2.92, -0.5 + az * 0.34, az * 1.15, 0.15));
      antler.push(tGeo(new THREE.ConeGeometry(0.02, 0.26, 5), 4.86, 2.6, -0.5 + az * 0.44, az * 1.5, 0.08));
    }
    this._merged(g, antler, this.matBone);

    // 烛环吊灯：蜡烛克隆同一几何，火焰沿用闪烁但不带点光（控制灯数）；挂高 2.62 不碰头
    const ring = [];
    ring.push(tGeo(new THREE.BoxGeometry(0.06, 0.95, 0.06), 0, 3.1, 0.9));
    ring.push(tGeo(new THREE.TorusGeometry(0.5, 0.035, 6, 14), 0, 2.62, 0.9, Math.PI / 2));
    this._merged(g, ring, this.matSoot);
    const candGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.2, 6);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const cx = Math.cos(a) * 0.5;
      const cz = 0.9 + Math.sin(a) * 0.5;
      const cm = new THREE.Mesh(candGeo, this.matCandle);
      cm.position.set(cx, 2.75, cz);
      g.add(cm);
      this._addFlame(g, cx, 2.9, cz, 0.15, this.matCandleFlame, null);
    }

    // 桌上吃食：面包 + 奶酪轮
    const bread = this._box(0.3, 0.11, 0.17, this.matBread, -1.95, 0.885, 1.3, g, false);
    bread.rotation.y = 0.5;
    const cheese = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.09, 10), this.matCheese);
    cheese.position.set(2.15, 0.875, 1.2);
    g.add(cheese);
  }

  _buildOlafHouse() {
    const g = this._houseRoom('olaf_house', '村长家', HOUSE_X, HOUSE_Z, 8, 10, 3.2);
    const rng = mulberry32(7002);

    // 床（西北角）
    this._box(1.5, 0.3, 2.5, this.matFurnDark, -2.7, 0.2, -3.3, g);
    this._box(1.5, 0.85, 0.12, this.matFurnDark, -2.7, 0.55, -4.49, g);
    this._box(1.36, 0.16, 2.3, this.matBedding, -2.7, 0.43, -3.3, g);
    this._box(0.85, 0.13, 0.5, this.matPillow, -2.7, 0.56, -4.15, g);
    this._box(1.38, 0.09, 1.2, this.matBlanket, -2.7, 0.53, -2.75, g);

    this._fireplace(g, -3.6, 1.8, Math.PI / 2, 0.8, 3.2, false);

    // 方桌与圆凳
    this._box(1.5, 0.1, 1.5, this.matFurn, 1.6, 0.76, -1.2, g);
    for (const [lx, lz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      this._box(0.12, 0.72, 0.12, this.matFurnDark, 1.6 + lx, 0.36, -1.2 + lz, g);
    }
    for (const [sx, sz] of [[0.55, -0.2], [2.6, -0.4]]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.5, 8), this.matFurn);
      st.position.set(sx, 0.25, sz);
      st.castShadow = true;
      g.add(st);
    }

    // 东墙搁架 + 杂物
    this._box(0.32, 0.07, 2.2, this.matShelf, 3.7, 1.5, 0.3, g);
    this._box(0.32, 0.07, 2.2, this.matShelf, 3.7, 2.05, 0.3, g);
    const bookCols = [0x5a3b2e, 0x3e4a5a, 0x6a5a3a, 0x4a5a42];
    for (let i = 0; i < 6; i++) {
      const bw = 0.1 + rng() * 0.1;
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3 + rng() * 0.08, bw), new THREE.MeshStandardMaterial({ color: bookCols[i % 4], roughness: 0.9 }));
      bk.position.set(3.7, (i < 3 ? 1.5 : 2.05) + 0.2, -0.5 + (i % 3) * 0.55 + rng() * 0.1);
      g.add(bk);
    }

    // 柜子、烛、地毯
    this._box(1.1, 1.3, 0.5, this.matFurnDark, 3.2, 0.65, 4.0, g);
    this._candle(g, 1.6, 0.81, -1.2, true);
    this._box(2.4, 0.04, 3.0, this.matRug, 0.4, 0.07, 0.8, g, false);

    // 西窗躲开床(z<-2.05)与壁炉(z>0.76)，东窗躲开搁架与柜子
    this._houseDecor(g, 8, 10, 3.2, [[-1, -1.0], [1, -2.8], [1, 2.6]]);

    // 桌角展开的羊皮卷：薄片 + 两端卷轴（羊皮色复用 matBedding）
    const scroll = [];
    scroll.push(tGeo(new THREE.BoxGeometry(0.34, 0.012, 0.24), 2.05, 0.816, -1.65));
    scroll.push(tGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.26, 6), 1.87, 0.838, -1.65, Math.PI / 2));
    scroll.push(tGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.26, 6), 2.23, 0.838, -1.65, Math.PI / 2));
    this._merged(g, scroll, this.matBedding);

    // 床头小柜 + 铜盘烛台（烛火不带点光，控制灯数）
    this._box(0.55, 0.52, 0.45, this.matFurnDark, -1.35, 0.26, -4.7, g);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.03, 8), this.matMetal);
    dish.position.set(-1.35, 0.535, -4.7);
    g.add(dish);
    this._candle(g, -1.35, 0.55, -4.7, false);

    // 北墙挂毯：matRug 色系三层拼菱形图案（层间 z 递进防 z-fighting）
    this._box(1.5, 1.7, 0.045, this.matRug, 1.2, 2.15, -4.95, g, false);
    const tapMid = this._box(0.72, 0.72, 0.04, this.matBlanket, 1.2, 2.15, -4.905, g, false);
    tapMid.rotation.z = Math.PI / 4;
    const tapCore = this._box(0.3, 0.3, 0.035, this.matBedding, 1.2, 2.15, -4.86, g, false);
    tapCore.rotation.z = Math.PI / 4;
  }

  _buildSmithy() {
    const g = this._houseRoom('smithy', '铁匠铺', HOUSE_X + 60, HOUSE_Z, 8, 10, 3.2);

    // 锻炉（西北角）：石台 + 炭床辉光 + 排烟罩
    const f = new THREE.Group();
    f.position.set(-2.5, 0, -3.0);
    g.add(f);
    this._box(1.9, 0.85, 1.9, this.matStoneIn, 0, 0.425, 0, f);
    this._box(2.1, 0.16, 2.1, this.matCryptDark, 0, 0.93, 0, f);
    this._box(1.3, 0.1, 1.3, this.matCoal, 0, 1.06, 0, f, false);
    this._box(1.5, 0.55, 1.5, this.matSoot, 0, 2.0, 0, f);
    this._box(0.8, 0.95, 0.8, this.matSoot, 0, 2.75, 0, f);
    this._addFlame(f, 0.15, 1.35, 0, 0.5, this.matFlame, { color: 0xff6a2a, i: 6, d: 18, decay: 1 });

    // 铁砧
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.7, 8), this.matFurn);
    stump.position.set(0.3, 0.35, -0.9);
    stump.castShadow = true;
    stump.receiveShadow = true;
    g.add(stump);
    const anvil = this._box(1.05, 0.34, 0.45, this.matAnvilIn, 0.3, 0.87, -0.9, g);
    anvil.rotation.y = 0.5;

    // 东墙武器架 + 三柄装饰剑
    this._box(0.12, 1.9, 0.12, this.matFurnDark, 3.82, 0.95, -1.3, g);
    this._box(0.12, 1.9, 0.12, this.matFurnDark, 3.82, 0.95, 1.3, g);
    this._box(0.1, 0.12, 2.8, this.matFurnDark, 3.8, 1.55, 0, g);
    for (const sz of [-0.9, 0, 0.9]) {
      const sw = new THREE.Group();
      sw.position.set(3.72, 0.25, sz);
      sw.rotation.z = -0.1;
      g.add(sw);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), this.matSoot);
      grip.position.y = 0.13;
      sw.add(grip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), this.matMetal);
      guard.position.y = 0.29;
      sw.add(guard);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.15, 0.09), this.matBlade);
      blade.position.y = 0.9;
      blade.castShadow = true;
      sw.add(blade);
    }

    // 工作台 + 铁锤、淬火槽、木桶
    this._box(0.95, 0.1, 2.6, this.matFurn, -3.45, 0.92, 1.9, g);
    this._box(0.85, 0.87, 0.12, this.matFurnDark, -3.45, 0.435, 1.0, g);
    this._box(0.85, 0.87, 0.12, this.matFurnDark, -3.45, 0.435, 2.8, g);
    this._box(0.22, 0.12, 0.12, this.matAnvilIn, -3.5, 1.03, 1.4, g);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), this.matFurnDark);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-3.3, 1.0, 1.4);
    g.add(handle);
    this._box(1.2, 0.5, 0.65, this.matFurnDark, 1.9, 0.25, -3.5, g);
    this._box(1.08, 0.04, 0.53, this.matWater, 1.9, 0.46, -3.5, g, false);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.0, 10), this.matFurn);
    barrel.position.set(2.9, 0.5, 3.6);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    g.add(barrel);

    // 顶梁吊灯
    this._box(0.22, 0.3, 0.22, this.matSoot, 0, 2.72, 1.6, g, false);
    this._addFlame(g, 0, 2.66, 1.6, 0.22, this.matCandleFlame, { color: 0xffc080, i: 2.2, d: 12, decay: 1 });

    // 西窗躲开锻炉(z<-2.05)，其一落在工作台(顶0.97)上方；东窗躲开武器架(z<1.36)
    this._houseDecor(g, 8, 10, 3.2, [[-1, -0.5], [-1, 2.2], [1, 2.4]]);

    // 北墙工具排：挂板+木柄合并、铁件合并（锤×2/钳/马蹄铁/锉），躲开锻炉排烟罩 x∈[-2.9,-2.1]
    const toolWood = [];
    toolWood.push(tGeo(new THREE.BoxGeometry(2.4, 0.14, 0.07), 1.6, 2.0, -4.9));
    toolWood.push(tGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 6), 0.7, 1.7, -4.88));
    toolWood.push(tGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 6), 1.25, 1.73, -4.88));
    this._merged(g, toolWood, this.matFurnDark);
    const toolIron = [];
    toolIron.push(tGeo(new THREE.BoxGeometry(0.22, 0.09, 0.09), 0.7, 1.93, -4.88));
    toolIron.push(tGeo(new THREE.BoxGeometry(0.16, 0.07, 0.07), 1.25, 1.93, -4.88));
    toolIron.push(tGeo(new THREE.BoxGeometry(0.035, 0.5, 0.02), 1.77, 1.72, -4.88, 0, 0.16));
    toolIron.push(tGeo(new THREE.BoxGeometry(0.035, 0.5, 0.02), 1.83, 1.72, -4.88, 0, -0.16));
    toolIron.push(tGeo(new THREE.TorusGeometry(0.11, 0.022, 5, 10, Math.PI * 1.25), 2.35, 1.85, -4.88, 0, -Math.PI * 0.125));
    toolIron.push(tGeo(new THREE.BoxGeometry(0.05, 0.4, 0.02), 2.75, 1.78, -4.88, 0, 0.1));
    this._merged(g, toolIron, this.matMetal);

    // 锻炉边铁料堆：贴西墙，落在锻炉(z<-2.05)与工作台(z>0.6)之间
    const stock = [];
    stock.push(tGeo(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), -3.6, 0.08, -1.2, Math.PI / 2));
    stock.push(tGeo(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 6), -3.42, 0.075, -1.15, Math.PI / 2, 0, 0.12));
    stock.push(tGeo(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 6), -3.5, 0.16, -1.25, Math.PI / 2, 0, -0.08));
    stock.push(tGeo(new THREE.BoxGeometry(0.09, 0.05, 1.0), -3.54, 0.23, -1.1, 0, 0, 0.15));
    this._merged(g, stock, this.matAnvilIn);

    // 进门右侧成品架：两面木盾斜倚东墙（克隆同几何），窗(y>1.35)在其上方不冲突
    const shieldGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.05, 14);
    const bossGeo = new THREE.SphereGeometry(0.09, 8, 6);
    for (const [sz, tilt] of [[2.1, 0.16], [3.05, 0.2]]) {
      const sh = new THREE.Mesh(shieldGeo, this.matFurn);
      sh.position.set(3.72, 0.52, sz);
      sh.rotation.z = Math.PI / 2 - tilt;
      sh.castShadow = true;
      g.add(sh);
      const bs = new THREE.Mesh(bossGeo, this.matMetal);
      bs.position.set(3.67, 0.53, sz);
      g.add(bs);
    }
  }

  // ---------- 风暮地穴 ----------
  // 布局沿 +z 深入（与 enemies.js 尸鬼摆位一致）：
  // 入口厅 z[-5,5] -> 回廊 z[5,19] -> 圆厅 z[19,35] -> 短廊 z[35,43] -> BOSS 厅 z[43,61]

  _buildBarrow() {
    const g = new THREE.Group();
    g.position.set(BARROW_X, ROOM_Y, BARROW_Z);
    this.root.add(g);
    const M = this.matCrypt;
    const MD = this.matCryptDark;
    const t = 0.5;
    const rng = mulberry32(8181);

    // 整条地穴的石板地面（顶面 +0.03）
    this._box(23, 0.12, 68, this.matCryptFloor, 0, -0.03, 28, g, false);

    // 三个厅各给一盏冷色弱补光（decay=1）：保住「阴森但读得清」的底亮度
    for (const [fy, fz, fi] of [[3.8, 0, 6.5], [3.8, 27, 6.5], [4.0, 52, 7.5]]) {
      const fill = new THREE.PointLight(0x9db4c8, fi, 22, 1);
      fill.position.set(0, fy, fz);
      g.add(fill);
    }

    // —— 入口厅 12x10 ——
    this._wallX(g, M, -5 - t / 2, -6 - t, 6 + t, 4.5, t, { c: 0, w: 2.0, hh: 2.9 });
    this._box(2.2, 2.9, 0.16, this.matSoot, 0, 1.45, -5 - t / 2, g); // 门洞黑板（出口触发处）
    this._wallX(g, M, 5, -6 - t, 6 + t, 4.5, t, { c: 0, w: 2.4, hh: 2.8 });
    this._wallZ(g, M, -6 - t / 2, -5, 5, 4.5, t, null);
    this._wallZ(g, M, 6 + t / 2, -5, 5, 4.5, t, null);
    this._box(14, 0.3, 12, MD, 0, 4.65, 0, g);
    // 火盆拱卫通往回廊的内门（玩家进门即见火光指路）
    this._brazier(g, -3.4, 2.4, true);
    this._brazier(g, 3.4, 2.4, true);
    this._bonePile(g, -5.2, 0.03, 3.8, rng, 4);
    this._bonePile(g, 5.0, 0.03, 4.2, rng, 3);
    this._box(2.2, 0.45, 0.7, MD, -4.6, 0.255, 1.0, g); // 石凳

    // —— 回廊 z 5..19（两侧安葬壁龛）——
    this._wallZ(g, M, -2 - t / 2, 5, 19, 3.2, t, null);
    this._wallZ(g, M, 2 + t / 2, 5, 19, 3.2, t, null);
    this._box(5.8, 0.3, 14.6, MD, 0, 3.35, 12, g);
    this._niche(g, -1, 8, rng);
    this._niche(g, -1, 12, rng);
    this._niche(g, -1, 16, rng);
    this._niche(g, 1, 10, rng);
    this._niche(g, 1, 14, rng);
    this._niche(g, 1, 18, rng);
    this._brazier(g, 1.35, 7.2, true);

    // —— 圆厅 16x16 z 19..35（四角立柱 + 双石棺）——
    this._wallX(g, M, 19, -8 - t, 8 + t, 4.5, t, { c: 0, w: 2.4, hh: 2.8 });
    this._wallX(g, M, 35, -8 - t, 8 + t, 4.5, t, { c: 0, w: 2.4, hh: 2.8 });
    this._wallZ(g, M, -8 - t / 2, 19, 35, 4.5, t, null);
    this._wallZ(g, M, 8 + t / 2, 19, 35, 4.5, t, null);
    this._box(18, 0.3, 17.6, MD, 0, 4.65, 27, g);
    for (const [px, pz] of [[-6.3, 20.8], [6.3, 20.8], [-6.3, 33.2], [6.3, 33.2]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 4.5, 10), M);
      col.position.set(px, 2.25, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      g.add(col);
    }
    this._sarcophagus(g, -4.6, 26.4, 0.12);
    this._sarcophagus(g, 4.8, 26.0, -0.1);
    this._brazier(g, -6.4, 27, true);
    this._brazier(g, 6.4, 27, true);
    this._bonePile(g, -6.8, 0.03, 21.6, rng, 5);
    this._bonePile(g, 7.0, 0.03, 33.0, rng, 4);

    // —— 短廊 z 35..43 ——
    this._wallZ(g, M, -2 - t / 2, 35, 43, 3.2, t, null);
    this._wallZ(g, M, 2 + t / 2, 35, 43, 3.2, t, null);
    this._box(5.8, 0.3, 8.6, MD, 0, 3.35, 39, g);
    this._niche(g, -1, 39, rng);
    this._niche(g, 1, 40.5, rng);

    // —— BOSS 厅 20x18 z 43..61 ——
    this._wallX(g, M, 43, -10 - t, 10 + t, 4.8, t, { c: 0, w: 2.4, hh: 2.8 });
    this._wallX(g, M, 61 + t / 2, -10 - t, 10 + t, 4.8, t, null);
    this._wallZ(g, M, -10 - t / 2, 43, 61, 4.8, t, null);
    this._wallZ(g, M, 10 + t / 2, 43, 61, 4.8, t, null);
    this._box(22, 0.35, 19.6, MD, 0, 4.98, 52, g);
    // 中央祭台压得很矮：尸鬼领主就站在台上，避免陷脚穿模
    const dais1 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.12, 18), MD);
    dais1.position.set(0, 0.06, 52);
    dais1.receiveShadow = true;
    g.add(dais1);
    const dais2 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.1, 18), M);
    dais2.position.set(0, 0.17, 52);
    dais2.receiveShadow = true;
    g.add(dais2);
    this._brazier(g, -7, 46.5, true);
    this._brazier(g, 7, 46.5, true);
    this._brazier(g, -7, 57, true);
    this._brazier(g, 7, 57, true);
    this._bonePile(g, -8.6, 0.03, 59.0, rng, 5);
    this._bonePile(g, 8.4, 0.03, 44.8, rng, 4);
    for (let i = 0; i < 6; i++) {
      const sc = 0.3 + rng() * 0.5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 0), MD);
      rock.position.set((rng() - 0.5) * 17, sc * 0.4, 44 + rng() * 12);
      rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      rock.castShadow = true;
      rock.receiveShadow = true;
      g.add(rock);
    }

    this._buildWordWall(g);

    this.rooms.barrow = {
      id: 'barrow',
      kind: 'dungeon',
      name: '风暮地穴',
      center: new THREE.Vector3(BARROW_X, ROOM_Y, BARROW_Z + 28),
      spawnPos: new THREE.Vector3(BARROW_X, ROOM_Y, BARROW_Z - 1.5),
      spawnYaw: Math.PI, // 朝 +z（深入地穴方向）
      exitPos: new THREE.Vector3(BARROW_X, ROOM_Y, BARROW_Z - 4.4),
    };
  }

  // BOSS 厅尽头的龙语墙：弧形石板 + 符文发光条（未习得时脉冲，习得后压暗到 0.15）
  _buildWordWall(g) {
    const ww = new THREE.Group();
    ww.position.set(0, 0, 53.75); // 弧心；内凹面朝 -z（朝向大厅）
    g.add(ww);
    const arc = 1.3;
    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(5.7, 5.7, 3.5, 14, 1, true, -arc / 2, arc),
      this.matSlab,
    );
    slab.position.y = 1.75;
    slab.castShadow = true;
    slab.receiveShadow = true;
    ww.add(slab);

    this.runeMat = new THREE.MeshStandardMaterial({
      color: 0x4c4a45,
      roughness: 0.92,
      metalness: 0,
      emissive: 0x7fd4ff,
      emissiveMap: runeTexture(4242),
      emissiveIntensity: 1.0,
      side: THREE.BackSide,
    });
    const strip = new THREE.Mesh(
      new THREE.CylinderGeometry(5.56, 5.56, 1.0, 14, 1, true, -arc / 2 + 0.07, arc - 0.14),
      this.runeMat,
    );
    strip.position.y = 1.95;
    ww.add(strip);

    // 楣石、立柱、基台
    this._box(7.8, 0.55, 1.5, this.matCryptDark, 0, 3.75, 5.0, ww);
    this._box(0.95, 4.1, 0.95, this.matCrypt, -3.95, 2.05, 4.7, ww);
    this._box(0.95, 4.1, 0.95, this.matCrypt, 3.95, 2.05, 4.7, ww);
    this._box(9.0, 0.12, 2.2, this.matCryptDark, 0, 0.06, 4.4, ww, false);

    this.runeLight = new THREE.PointLight(0x7fd4ff, 6, 18);
    this.runeLight.position.set(0, 2.3, 3.4);
    ww.add(this.runeLight);
  }

  // 把 wuld 龙语墙的材质钩子接到 structures.wordWalls 登记的条目上
  _attachWuldEntry() {
    const s = this.game.structures;
    let entry = null;
    if (s && Array.isArray(s.wordWalls)) {
      for (const w of s.wordWalls) {
        if (w.id === 'wuld') {
          entry = w;
          break;
        }
      }
    }
    if (!entry) {
      entry = {
        id: 'wuld',
        shoutId: 'wuld',
        pos: new THREE.Vector3(WULD_WALL_POS.x, WULD_WALL_POS.y, WULD_WALL_POS.z),
        learned: false,
      };
    }
    const runeMat = this.runeMat;
    const runeLight = this.runeLight;
    entry.setLearned = () => {
      runeMat.emissiveIntensity = 0.15;
      runeLight.intensity = 0.8;
    };
    entry.resetLearned = () => {
      entry.learned = false;
      runeMat.emissiveIntensity = 1.0;
      runeLight.intensity = 6;
    };
    this._wuldEntry = entry;
  }

  // ---------- 进出与存档 ----------

  _fade(onBlack) {
    const hud = this.game.hud;
    if (hud && typeof hud.fade === 'function') {
      if (hud.fading) return false; // hud.fade 忙时会静默忽略回调，这里直接拒绝本次进出
      hud.fade(onBlack);
      return true;
    }
    onBlack();
    return true;
  }

  enter(door) {
    if (this._busy || this.inside || !door) return;
    const room = this.rooms[door.id];
    const player = this.game.player;
    if (!room || !player) return;
    // 记住门外站位：exit() 与室内存档（savePosition）都回落到这里
    door.outsidePos = player.pos.clone();
    door.outsidePos.y = this.game.terrain.getHeight(door.outsidePos.x, door.outsidePos.z);
    this._busy = true;
    this._busyT = 0;
    const ok = this._fade(() => {
      this.currentDoor = door;
      this.inside = room;
      player.group.position.copy(room.spawnPos);
      player.vel.set(0, 0, 0);
      player.yaw = room.spawnYaw;
      player.bodyYaw = room.spawnYaw;
      player.pitch = -0.08;
      // 室内把第三人称相机拉近，避免相机落到墙外
      this._prevCamDist = player.camDist;
      player.camDist = Math.min(player.camDist, 3.0);
      this._syncDoors();
      const audio = this.game.audio;
      if (audio && typeof audio.setInterior === 'function') audio.setInterior(room.kind === 'house');
      this._busy = false;
    });
    if (!ok) this._busy = false;
  }

  exit() {
    if (this._busy || !this.inside) return;
    const g = this.game;
    const player = g.player;
    if (!player) return;
    this._busy = true;
    this._busyT = 0;
    const door = this.currentDoor;
    const ok = this._fade(() => {
      let target = null;
      if (door && door.outsidePos) {
        target = door.outsidePos.clone();
      } else if (door && door.pos) {
        target = new THREE.Vector3(door.pos.x, 0, door.pos.z);
      } else {
        target = new THREE.Vector3(8, 0, 70); // 兜底：村口
      }
      target.y = g.terrain.getHeight(target.x, target.z);
      player.group.position.copy(target);
      player.vel.set(0, 0, 0);
      if (this._prevCamDist) {
        player.camDist = this._prevCamDist;
        this._prevCamDist = 0;
      }
      if (door && door.pos) {
        const dx = target.x - door.pos.x;
        const dz = target.z - door.pos.z;
        if (dx * dx + dz * dz > 1e-4) {
          // 面朝离门方向
          player.yaw = Math.atan2(-dx, -dz);
          player.bodyYaw = player.yaw;
        }
      }
      this.inside = null;
      this.currentDoor = null;
      this._syncDoors();
      const audio = g.audio;
      if (audio && typeof audio.setInterior === 'function') audio.setInterior(false);
      this._busy = false;
    });
    if (!ok) this._busy = false;
  }

  // 存档位置：室内时存当前门的门外站位，读档永远落在户外
  savePosition() {
    if (this.inside && this.currentDoor) {
      const p = this.currentDoor.outsidePos || this.currentDoor.pos;
      const v = new THREE.Vector3(p.x, p.y, p.z);
      v.y = this.game.terrain.getHeight(v.x, v.z);
      return v;
    }
    const player = this.game.player;
    return player ? player.pos.clone() : new THREE.Vector3();
  }

  // 存档朝向：室内存档时位置落在门外，朝向也对应取离门方向（与 exit() 一致），户外取玩家当前朝向
  saveYaw() {
    const door = this.currentDoor;
    if (this.inside && door && door.pos && door.outsidePos) {
      const dx = door.outsidePos.x - door.pos.x;
      const dz = door.outsidePos.z - door.pos.z;
      if (dx * dx + dz * dz > 1e-4) return Math.atan2(-dx, -dz);
    }
    const player = this.game.player;
    return player ? player.yaw : 0;
  }

  // 新游戏/读档（resetAll）：不走淡入淡出，直接恢复户外状态
  forceOutside() {
    this._busy = false;
    this._busyT = 0;
    this._prevCamDist = 0;
    this.inside = null;
    this.currentDoor = null;
    this._syncDoors();
    const audio = this.game.audio;
    if (audio && typeof audio.setInterior === 'function') audio.setInterior(false);
  }

  // 室内墙体无碰撞网格：把玩家水平位置夹取在房间可行走范围内
  // （普通移动与旋风冲刺共用调用点，防止穿墙冲出室外导致 inside 状态脱节）
  constrain(p, prevX, prevZ) {
    const room = this.inside;
    if (!room) return;
    if (room.bounds) {
      const b = room.bounds;
      if (p.x < b.minX) p.x = b.minX;
      else if (p.x > b.maxX) p.x = b.maxX;
      if (p.z < b.minZ) p.z = b.minZ;
      else if (p.z > b.maxZ) p.z = b.maxZ;
      return;
    }
    if (room.id !== 'barrow') return;
    const lx = p.x - BARROW_X;
    const lz = p.z - BARROW_Z;
    if (this._barrowWalkable(lx, lz)) return;
    // 轴分离滑动：先试保留新 x（z 退回），再试保留新 z（x 退回），都不行整体退回
    if (this._barrowWalkable(lx, prevZ - BARROW_Z)) {
      p.z = prevZ;
      return;
    }
    if (this._barrowWalkable(prevX - BARROW_X, lz)) {
      p.x = prevX;
      return;
    }
    p.x = prevX;
    p.z = prevZ;
  }

  _barrowWalkable(lx, lz) {
    for (const s of BARROW_WALK_SEGS) {
      if (lz >= s.z0 && lz <= s.z1 && lx >= -s.hx && lx <= s.hx) return true;
    }
    return false;
  }

  _syncDoors() {
    if (this.inside) {
      this.doors = [{ kind: 'exit', pos: this.inside.exitPos, label: '离开 ' + this.inside.name }];
    } else {
      this.doors = [];
    }
  }

  // ---------- 每帧 ----------

  update(dt) {
    const g = this.game;
    const el = g.time.elapsed;

    // 防 hud.fade 异常未回调导致进出永久锁死
    if (this._busy) {
      this._busyT += dt;
      if (this._busyT > 1.6) this._busy = false;
    }

    // 重开新游戏/读档等外部传送：玩家已远离房间则视为离开室内
    if (this.inside && g.player && g.player.pos.distanceToSquared(this.inside.center) > 150 * 150) {
      this.inside = null;
      this.currentDoor = null;
      this._syncDoors();
      const audio = g.audio;
      if (audio && typeof audio.setInterior === 'function') audio.setInterior(false);
    }

    // 火焰摇曳 + 灯光闪烁（壁炉/火盆/烛火共用）
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      f.flame.scale.y = f.baseS * (1 + 0.16 * Math.sin(el * 9.5 + f.phase));
      f.flame.rotation.y += dt * 2.2;
      if (f.light) {
        // 确定性多正弦替代 Math.random：抖动观感相当（合计幅度 ±0.11*baseI）且可复现、不随帧率变糙
        f.light.intensity = f.baseI * (0.86 + 0.14 * Math.sin(el * 12 + f.phase)
          + 0.07 * Math.sin(el * 23.7 + f.phase * 3.1)
          + 0.04 * Math.sin(el * 41.3 + f.phase * 1.7));
      }
    }

    // 炭床辉光脉动（壁炉炭、锻炉炭、火盆炭共用一份材质）
    this.matCoal.emissiveIntensity = 1.05 + 0.35 * Math.sin(el * 2.7) + 0.12 * Math.sin(el * 7.3);

    // 窗纸昼夜：白天透亮夜里转暗；nightFactor 本身已 smoothstep 平滑，直接线性映射即可
    this.matWindowIn.emissiveIntensity = 0.9 - 0.75 * (g.sky ? g.sky.nightFactor : 0);

    // 龙语墙符文脉冲；习得后由 setLearned 定格 0.15，不再驱动
    const wuld = this._wuldEntry;
    if (wuld && !wuld.learned) {
      this.runeMat.emissiveIntensity = 0.85 + 0.45 * Math.sin(el * 2.2);
      this.runeLight.intensity = 5 + 2.2 * Math.sin(el * 2.2);
    }

    // 壁炉烟雾上升
    for (let i = 0; i < this.smoke.length; i++) {
      const p = this.smoke[i];
      p.age += dt;
      if (p.age >= p.life) p.age -= p.life;
      const t = p.age / p.life;
      p.spr.position.set(p.x + Math.sin(el * 0.9 + p.phase) * 0.08, p.y0 + t * 1.6, p.z - t * 0.35);
      const sc = 0.22 + 0.55 * t;
      p.spr.scale.set(sc, sc, 1);
      p.mat.opacity = Math.sin(Math.PI * t) * 0.32;
    }
  }
}
