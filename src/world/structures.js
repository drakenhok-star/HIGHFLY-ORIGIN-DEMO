import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/noise.js';
import { WULD_WALL_POS } from './interiors.js';

export class Structures {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    game.scene.add(this.root);

    this.windowMats = [];
    this.torches = [];
    this.chests = [];
    // y 为烟囱口高度（地面 +5.3）；炊烟正式锚点已改为 chimneyTops，这里只是 ambience 的兜底；箱子摆放只读 x/z
    this.housePositions = [];
    // 烟囱口世界坐标，顺序与 housePositions 一致（5 环形屋后铁匠铺），供 ambience 炊烟锚定
    this.chimneyTops = [];
    // 室外碰撞：房屋 OBB（player 做位置推出用）/ 水井圆柱
    this.colliders = [];
    this.circleColliders = [];

    // 反照率再提一档：曝光 0.5 + 物理光照下 hemi 漫反射被 /π，背光面原值仍读近黑
    this.matWall = new THREE.MeshStandardMaterial({ color: 0x8f6e4d, roughness: 0.82, metalness: 0 });
    this.matRoof = new THREE.MeshStandardMaterial({ color: 0x665245, roughness: 0.95, metalness: 0 });
    this.matDoor = new THREE.MeshStandardMaterial({ color: 0x4f3e2c, roughness: 0.82, metalness: 0 });
    this.matStone = new THREE.MeshStandardMaterial({ color: 0x807d76, roughness: 1, metalness: 0 });
    this.matDarkStone = new THREE.MeshStandardMaterial({ color: 0x6e6b64, roughness: 1, metalness: 0 });
    this.matWood = new THREE.MeshStandardMaterial({ color: 0x73543f, roughness: 0.82, metalness: 0 });
    // 深色木件也随全局提亮一档：阴面/正午竖直面只吃半球光，原 0x5a4230/0x7d5f41 会沉成纯黑
    this.matLog = new THREE.MeshStandardMaterial({ color: 0x6b5138, roughness: 0.9, metalness: 0 });
    this.matPlankDark = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9, metalness: 0 });
    this.matPlankLight = new THREE.MeshStandardMaterial({ color: 0x9c7a55, roughness: 0.85, metalness: 0 });
    this.matTrim = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.4, metalness: 0.6 });
    this.matChest = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 0.85, metalness: 0 });
    this.matAnvil = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.5, metalness: 0.7 });
    this.matWindow = new THREE.MeshStandardMaterial({ color: 0xffb45e, emissive: 0xffb45e, emissiveIntensity: 0 });
    this.windowMats.push(this.matWindow);
    this.matFlame = new THREE.MeshStandardMaterial({ color: 0xff8c3a, emissive: 0xff8c3a, emissiveIntensity: 2.2 });
    this.matMound = new THREE.MeshStandardMaterial({ color: 0x4e5a40, roughness: 1, metalness: 0 });
    this.matBarrowDoor = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.95, metalness: 0, emissive: 0x223a4d, emissiveIntensity: 0.35 });
    this.matSnowDrift = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 1, metalness: 0 });

    const terrain = game.terrain;
    this.villageCenter = new THREE.Vector3(0, terrain.getHeight(0, 40), 40);
    this.stonesCenter = new THREE.Vector3(-220, terrain.getHeight(-220, -180), -180);
    this.perchPos = new THREE.Vector3(300, 0, -300);

    const rng = mulberry32(1340);
    this._buildVillage(rng);
    this._questChestSpot = this._buildStones(rng);
    this._towerChestSpot = this._buildTower(rng);

    // chest array order is a save-file contract: [stones, village, clearing, tower]
    const qs = this._questChestSpot;
    this._makeChest(qs.x, qs.y, qs.z, qs.rotY, ['ancient_sword'], 50);

    const hp = this.housePositions[0];
    const hd = Math.atan2(hp.x - this.villageCenter.x, hp.z - this.villageCenter.z);
    const vcx = hp.x + Math.sin(hd) * 4.5;
    const vcz = hp.z + Math.cos(hd) * 4.5;
    this._makeChest(vcx, terrain.getHeight(vcx, vcz), vcz, hd + Math.PI, ['health_potion', 'health_potion'], 30);

    this._makeChest(150, terrain.getHeight(150, 150), 150, Math.atan2(0 - 150, 40 - 150), ['hide_armor', 'mana_potion'], 40);

    const ts = this._towerChestSpot;
    this._makeChest(ts.x, ts.y, ts.z, ts.rotY, ['health_potion', 'mana_potion'], 120);

    // —— 资料片扩展：以下内容全部追加在原有建造与宝箱之后（保持随机序列与宝箱索引不变）——
    this.wordWalls = [];
    const rng2 = mulberry32(9120);
    const barrowDoorPos = this._buildBarrow();
    this._buildPlateau(rng2); // 内含霜之龙语墙 + 第 5 个宝箱（索引 4）

    // 地穴内的 wuld 龙语墙：网格由 interiors 构建，这里仅登记；方法由 interiors 构造时覆写
    this.wordWalls.push({
      id: 'wuld', shoutId: 'wuld',
      pos: new THREE.Vector3(WULD_WALL_POS.x, WULD_WALL_POS.y, WULD_WALL_POS.z),
      learned: false,
      setLearned() {},
      resetLearned() { this.learned = false; },
    });

    this.enterableDoors = [
      { id: 'inn', pos: this._doorAnchor(this._ringHouses[1]), label: 'Entrar a la taberna' },
      { id: 'olaf_house', pos: this._doorAnchor(this._ringHouses[3]), label: 'Entrar a la casa de Olaf' },
      { id: 'smithy', pos: this._doorAnchor(this._smithyHouse), label: 'Entrar a la herrería' },
      { id: 'barrow', pos: barrowDoorPos, label: 'Entrar a la cripta' },
    ];
  }

  // 门前锚点：沿房屋朝向（含随机偏转后的最终朝向）向外偏移
  _doorAnchor(g, dist = 2.5) {
    const ry = g.rotation.y;
    return new THREE.Vector3(
      g.position.x + Math.sin(ry) * dist,
      g.position.y,
      g.position.z + Math.cos(ry) * dist,
    );
  }

  _box(w, h, d, mat, x, y, z, parent, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // 细节几何按材质收集，_mergeFlush 时合并成单 Mesh（6 座精细房若逐件建 Mesh 会有几百 draw call）
  _mergeAdd(bag, mat, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    m.setPosition(x, y, z);
    geo.applyMatrix4(m);
    const arr = bag.get(mat);
    if (arr) arr.push(geo);
    else bag.set(mat, [geo]);
  }

  _mergeFlush(bag, parent) {
    for (const [mat, geos] of bag) {
      const merged = mergeGeometries(geos);
      for (const src of geos) src.dispose();
      const mesh = new THREE.Mesh(merged, mat);
      // 窗玻璃薄片沿用旧行为不投影不受影，避免发光面上出现阴影纹
      mesh.castShadow = mat !== this.matWindow;
      mesh.receiveShadow = mat !== this.matWindow;
      parent.add(mesh);
    }
    bag.clear();
  }

  // 客栈招牌吊板：程序化简笔酒杯（写法参考 _makeRuneTexture；不画文字，位图字体丑）
  _makeSignTexture() {
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#4f3e2c';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 116, 116);
    ctx.fillStyle = '#e8d9b0';
    ctx.fillRect(42, 46, 34, 46);
    ctx.strokeStyle = '#e8d9b0';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(82, 68, 13, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = '#f7f3e8';
    ctx.beginPath();
    ctx.arc(50, 44, 8, 0, Math.PI * 2);
    ctx.arc(60, 40, 9, 0, Math.PI * 2);
    ctx.arc(70, 44, 8, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _buildHouse(x, z, isSmithy, rng, opts = {}) {
    const g = new THREE.Group();
    g.position.set(x, this.game.terrain.getHeight(x, z), z);
    g.rotation.y = Math.atan2(this.villageCenter.x - x, this.villageCenter.z - z);

    // 细节随机全部走坐标哈希 PRNG；共享 rng 只保留末尾那 1 次朝向抖动（序列契约）
    const hr = mulberry32(((x * 73856093) ^ (z * 19349663)) >>> 0);
    const bag = new Map();

    const w = 5.2, d = 4.2, wallH = 2.9, rise = 1.6;
    this._box(w + 1.8, 1.6, d + 1.8, this.matStone, 0, -0.45, 0, g, false);
    this._mergeAdd(bag, this.matWall, new THREE.BoxGeometry(w, wallH, d), 0, 0.35 + wallH / 2, 0);
    this._mergeAdd(bag, this.matWall, new THREE.BoxGeometry(w * 0.94, 1.35, d * 0.5), 0, 0.35 + wallH + 0.6, 0);

    // 四角原木柱 + 三道环墙原木条纹（明暗交替），营造原木叠墙感
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.36, wallH + 0.4, 0.36),
          sx * (w / 2 - 0.02), 1.77, sz * (d / 2 - 0.02));
      }
    }
    const stripYs = [0.95, 1.62, 2.42];
    for (let i = 0; i < stripYs.length; i++) {
      const yy = stripYs[i] + (hr() - 0.5) * 0.1;
      const mat = i % 2 === 0 ? this.matPlankDark : this.matPlankLight;
      for (const sz of [-1, 1]) {
        this._mergeAdd(bag, mat, new THREE.BoxGeometry(w + 0.1, 0.16, 0.07), 0, yy, sz * (d / 2 + 0.015));
      }
      for (const sx of [-1, 1]) {
        this._mergeAdd(bag, mat, new THREE.BoxGeometry(0.07, 0.16, d + 0.1), sx * (w / 2 + 0.015), yy, 0);
      }
    }

    const half = d / 2 + 0.55;
    const ang = Math.atan2(rise, half);
    const slabLen = Math.sqrt(half * half + rise * rise) + 0.35;
    const sy = 0.35 + wallH + rise / 2 + 0.05;
    const sinA = Math.sin(ang), cosA = Math.cos(ang);
    for (const side of [1, -1]) {
      const cz = side * half / 2;
      this._mergeAdd(bag, this.matRoof, new THREE.BoxGeometry(w + 1.4, 0.18, slabLen), 0, sy, cz, side * ang, 0, 0);
      // 木瓦条：沿坡面参数 u（脊负檐正）铺 3 道，位置 = 坡心 + u*坡向 + 0.125*法向
      for (let i = 0; i < 3; i++) {
        const u = -1.05 + i * 0.95 + (hr() - 0.5) * 0.12;
        this._mergeAdd(bag, i % 2 === 0 ? this.matPlankDark : this.matPlankLight,
          new THREE.BoxGeometry(w + 1.5, 0.07, 0.62),
          0, sy - u * sinA + 0.125 * cosA, cz + side * (u * cosA + 0.125 * sinA), side * ang, 0, 0);
      }
      // 山墙封檐板：贴在坡板两端下沿
      for (const sx of [-1, 1]) {
        this._mergeAdd(bag, this.matPlankDark, new THREE.BoxGeometry(0.14, 0.26, slabLen * 0.96),
          sx * (w / 2 + 0.66), sy - 0.18 * cosA, cz - side * 0.18 * sinA, side * ang, 0, 0);
      }
      // 檐下椽头
      for (let i = 0; i < 4; i++) {
        this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.16, 0.16, 0.55),
          -2.1 + i * 1.4, 3.18, side * (d / 2 + 0.32), side * ang, 0, 0);
      }
    }
    // 屋脊盖梁
    this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(w + 1.6, 0.18, 0.34),
      0, sy + (slabLen / 2) * sinA + 0.05, 0);

    // 门：门板 + 门框 + 门带/把手 + 石阶
    this._mergeAdd(bag, this.matDoor, new THREE.BoxGeometry(1.1, 2.0, 0.12), 0, 1.35, d / 2 + 0.05);
    for (const sx of [-1, 1]) {
      this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.2, 2.3, 0.22), sx * 0.66, 1.4, d / 2 + 0.06);
    }
    this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(1.7, 0.22, 0.24), 0, 2.62, d / 2 + 0.06);
    for (const yy of [0.95, 1.75]) {
      this._mergeAdd(bag, this.matTrim, new THREE.BoxGeometry(0.96, 0.1, 0.05), 0, yy, d / 2 + 0.13);
    }
    this._mergeAdd(bag, this.matTrim, new THREE.BoxGeometry(0.1, 0.2, 0.08), 0.38, 1.32, d / 2 + 0.14);
    this._mergeAdd(bag, this.matStone, new THREE.BoxGeometry(1.7, 0.24, 0.95), 0, 0.12, d / 2 + 0.6);

    // 正面双窗：玻璃沿用共享 matWindow（夜光统一调），外加窗框/窗台/十字窗棂
    for (const wx of [-1.7, 1.7]) {
      this._mergeAdd(bag, this.matWindow, new THREE.PlaneGeometry(0.72, 0.86), wx, 2.05, d / 2 + 0.08);
      for (const sy2 of [-1, 1]) {
        this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.94, 0.1, 0.1), wx, 2.05 + sy2 * 0.48, d / 2 + 0.09);
      }
      for (const sx of [-1, 1]) {
        this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.1, 0.86, 0.1), wx + sx * 0.42, 2.05, d / 2 + 0.09);
      }
      this._mergeAdd(bag, this.matPlankLight, new THREE.BoxGeometry(1.05, 0.09, 0.24), wx, 1.54, d / 2 + 0.12);
      this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.05, 0.86, 0.04), wx, 2.05, d / 2 + 0.105);
      this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.72, 0.05, 0.04), wx, 2.05, d / 2 + 0.105);
    }
    // 部分房子加外开木百叶窗板：绕窗侧铰点旋开 open 弧度
    if (hr() < 0.65) {
      const open = 0.35 + hr() * 0.75;
      for (const wx of [-1.7, 1.7]) {
        for (const sx of [-1, 1]) {
          this._mergeAdd(bag, this.matDoor, new THREE.BoxGeometry(0.34, 0.86, 0.05),
            wx + sx * (0.47 + 0.17 * Math.cos(open)), 2.05, d / 2 + 0.1 + 0.17 * Math.sin(open), 0, -sx * open, 0);
        }
      }
    }
    // 部分房子的侧墙小窗（同 matWindow，夜里一起亮）
    if (hr() < 0.5) {
      const sx = hr() < 0.5 ? -1 : 1;
      this._mergeAdd(bag, this.matWindow, new THREE.PlaneGeometry(0.6, 0.7),
        sx * (w / 2 + 0.08), 2.0, 0.7, 0, sx * Math.PI / 2, 0);
      for (const sy2 of [-1, 1]) {
        this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.1, 0.1, 0.8), sx * (w / 2 + 0.09), 2.0 + sy2 * 0.4, 0.7);
      }
      for (const sz of [-1, 1]) {
        this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.1, 0.7, 0.1), sx * (w / 2 + 0.09), 2.0, 0.7 + sz * 0.36);
      }
    }

    // 石砌烟囱：普通屋在屋脊线上 x=±1.1 收分三段；铁匠铺沿用旧石盒位改成更粗的锻造烟囱。口顶统一地面 +5.3
    const chimX = isSmithy ? w / 2 - 0.6 : (hr() < 0.5 ? -1.1 : 1.1);
    const chimZ = isSmithy ? -0.9 : 0;
    if (isSmithy) {
      this._mergeAdd(bag, this.matStone, new THREE.BoxGeometry(1.15, 2.3, 1.15), chimX, 3.95, chimZ);
      this._mergeAdd(bag, this.matStone, new THREE.BoxGeometry(0.95, 0.6, 0.95), chimX, 4.95, chimZ);
      this._mergeAdd(bag, this.matStone, new THREE.BoxGeometry(1.3, 0.26, 1.3), chimX, 5.17, chimZ);
    } else {
      this._mergeAdd(bag, this.matStone, new THREE.BoxGeometry(0.85, 1.9, 0.85), chimX, 4.1, chimZ);
      this._mergeAdd(bag, this.matStone, new THREE.BoxGeometry(0.68, 0.5, 0.68), chimX, 5.02, chimZ);
      this._mergeAdd(bag, this.matStone, new THREE.BoxGeometry(0.95, 0.24, 0.95), chimX, 5.18, chimZ);
    }

    if (opts.inn) {
      // 客栈招牌：门旁横臂 + 吊板
      this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.09, 0.09, 0.85), 1.05, 2.95, d / 2 + 0.32);
      this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.05, 0.32, 0.05), 1.05, 2.75, d / 2 + 0.62);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ map: this._makeSignTexture(), roughness: 0.85, metalness: 0 }));
      sign.position.set(1.05, 2.4, d / 2 + 0.62);
      sign.castShadow = true;
      sign.receiveShadow = true;
      g.add(sign);
    }

    if (isSmithy) {
      // 雨棚罩住屋侧露天铁砧区；立柱留了余量，含朝向抖动后仍离铁砧与铁匠工作位 ≥1.2m
      for (const pz of [-1.5, 3.4]) {
        this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.2, 2.7, 0.2), -5.5, 1.1, pz);
      }
      this._mergeAdd(bag, this.matRoof, new THREE.BoxGeometry(3.4, 0.12, 5.9), -4.3, 2.8, 0.95, 0, 0, 0.215);
      this._mergeAdd(bag, this.matLog, new THREE.BoxGeometry(0.16, 0.16, 5.4), -5.5, 2.42, 0.95);
    }

    this._mergeFlush(bag, g);

    g.rotation.y += (rng() - 0.5) * 0.2;

    // 烟囱口世界坐标要用含抖动的最终朝向手工旋转局部偏移（局部→世界：wx=lx·cos+lz·sin, wz=-lx·sin+lz·cos）
    const ry = g.rotation.y;
    this.chimneyTops.push(new THREE.Vector3(
      x + chimX * Math.cos(ry) + chimZ * Math.sin(ry),
      g.position.y + 5.3,
      z - chimX * Math.sin(ry) + chimZ * Math.cos(ry),
    ));
    // 墙体半宽 2.6 / 半深 2.1 + 0.15 余量
    this.colliders.push({ x, z, ry, hw: 2.75, hd: 2.25 });

    this.root.add(g);
    return g;
  }

  _buildVillage(rng) {
    const terrain = this.game.terrain;
    const cx = this.villageCenter.x, cz = this.villageCenter.z;

    const ring = [
      { a: 100, r: 22 }, { a: 152, r: 27 }, { a: 208, r: 20 }, { a: 266, r: 29 }, { a: 330, r: 24 },
    ];
    this._ringHouses = [];
    for (let i = 0; i < ring.length; i++) {
      const h = ring[i];
      const rad = (h.a * Math.PI) / 180;
      const hx = cx + Math.cos(rad) * h.r;
      const hz = cz + Math.sin(rad) * h.r;
      this.housePositions.push(new THREE.Vector3(hx, terrain.getHeight(hx, hz) + 5.3, hz));
      this._ringHouses.push(this._buildHouse(hx, hz, false, rng, { inn: i === 1 }));
    }

    this._smithyHouse = this._buildHouse(14, 54, true, rng);
    this.housePositions.push(new THREE.Vector3(14, terrain.getHeight(14, 54) + 5.3, 54));
    const ax = 16, az = 51, ay = terrain.getHeight(16, 51);
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.7, 8), this.matWood);
    stump.position.set(ax, ay + 0.35, az);
    stump.castShadow = true;
    stump.receiveShadow = true;
    this.root.add(stump);
    const anvil = this._box(1.0, 0.32, 0.42, this.matAnvil, ax, ay + 0.86, az, this.root);
    anvil.rotation.y = 0.6;

    const well = new THREE.Group();
    well.position.copy(this.villageCenter);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.5, 12), this.matStone);
    base.position.y = 0.1;
    base.receiveShadow = true;
    well.add(base);
    const ringM = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 1.1, 10), this.matStone);
    ringM.position.y = 0.85;
    ringM.castShadow = true;
    ringM.receiveShadow = true;
    well.add(ringM);
    this._box(0.16, 1.9, 0.16, this.matWood, -1.05, 2.2, 0, well);
    this._box(0.16, 1.9, 0.16, this.matWood, 1.05, 2.2, 0, well);
    const wAng = Math.atan2(0.6, 0.85);
    const wLen = Math.sqrt(0.85 * 0.85 + 0.6 * 0.6) + 0.2;
    const r1 = this._box(2.9, 0.12, wLen, this.matRoof, 0, 3.45, 0.45, well);
    r1.rotation.x = wAng;
    const r2 = this._box(2.9, 0.12, wLen, this.matRoof, 0, 3.45, -0.45, well);
    r2.rotation.x = -wAng;
    this.root.add(well);

    const torchSpots = [[6, 33], [-8, 46], [10, 49]];
    for (let i = 0; i < torchSpots.length; i++) {
      const tx = torchSpots[i][0], tz = torchSpots[i][1];
      const ty = terrain.getHeight(tx, tz);
      const tg = new THREE.Group();
      tg.position.set(tx, ty, tz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 2.6, 6), this.matWood);
      pole.position.y = 1.3;
      pole.castShadow = true;
      tg.add(pole);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.264, 0.66, 6), this.matFlame);
      flame.position.y = 2.85;
      tg.add(flame);
      const light = new THREE.PointLight(0xff9a4a, 1.8, 22);
      light.position.y = 2.95;
      tg.add(light);
      this.root.add(tg);
      this.torches.push({ light, flame, phase: i * 2.13 });
    }

    // —— 生活化陈设：独立 PRNG 只做角度/微偏移，绝不动共享 rng 序列。
    // 摆放硬约束：离火把/宝箱 ≥1.5m、门前锚点 2.2m 内禁放、环形屋[0] 背村心侧（宝箱 (-4.6,66.1)）6m 内不放，
    // 坐标手挑固定值满足约束，抖动量不足以破坏 ——
    const vrng = mulberry32(5150);
    const vbag = new Map();

    // 柴堆 ×2（客栈旁 / 铁匠铺旁）：横放原木交错堆三层
    for (const [px, pz] of [[-26.5, 55.5], [17.2, 56.5]]) {
      const py = terrain.getHeight(px, pz);
      const yaw = vrng() * Math.PI;
      const layers = [[-0.36, 0, 0.36], [-0.18, 0.18], [0]];
      for (let li = 0; li < layers.length; li++) {
        for (const lo of layers[li]) {
          this._mergeAdd(vbag, this.matWood, new THREE.CylinderGeometry(0.15, 0.15, 1.3 + vrng() * 0.25, 7),
            px + lo * Math.sin(yaw), py + 0.16 + li * 0.27, pz + lo * Math.cos(yaw), 0, yaw, Math.PI / 2);
        }
      }
    }

    // 木桶 + 木箱 ×3 组
    for (const [px, pz] of [[18.5, 24.8], [-20.9, 27.5], [-20.0, 55.8]]) {
      const py = terrain.getHeight(px, pz);
      const yaw = vrng() * Math.PI * 2;
      this._mergeAdd(vbag, this.matWood, new THREE.CylinderGeometry(0.3, 0.34, 0.78, 9), px, py + 0.39, pz);
      for (const hy of [0.22, 0.6]) {
        this._mergeAdd(vbag, this.matTrim, new THREE.CylinderGeometry(0.345, 0.345, 0.06, 9), px, py + hy, pz);
      }
      const bx = px + Math.sin(yaw) * 0.85, bz = pz + Math.cos(yaw) * 0.85;
      this._mergeAdd(vbag, this.matPlankLight, new THREE.BoxGeometry(0.62, 0.62, 0.62), bx, py + 0.31, bz, 0, vrng() * Math.PI, 0);
      if (vrng() < 0.6) {
        this._mergeAdd(vbag, this.matPlankLight, new THREE.BoxGeometry(0.45, 0.45, 0.45), bx, py + 0.85, bz, 0, vrng() * Math.PI, 0);
      }
    }

    // 村口矮木栅栏（西侧一列，沿进村小径）：立柱 + 双横杆
    const fencePts = [[10.4, 57.6], [8.4, 58.7], [6.4, 59.8], [4.4, 60.9]];
    for (let i = 0; i < fencePts.length; i++) {
      const [fx, fz] = fencePts[i];
      const fy = terrain.getHeight(fx, fz);
      this._mergeAdd(vbag, this.matLog, new THREE.BoxGeometry(0.15, 1.15, 0.15), fx, fy + 0.55, fz);
      if (i > 0) {
        const [axp, azp] = fencePts[i - 1];
        const mx = (fx + axp) / 2, mz = (fz + azp) / 2;
        const my = (fy + terrain.getHeight(axp, azp)) / 2;
        const len = Math.hypot(fx - axp, fz - azp);
        const ryaw = Math.atan2(fx - axp, fz - azp);
        for (const hy of [0.45, 0.85]) {
          this._mergeAdd(vbag, this.matWood, new THREE.BoxGeometry(0.09, 0.09, len + 0.2), mx, my + hy, mz, 0, ryaw, 0);
        }
      }
    }

    // 水井补细节：双柱间卷轴 + 轴端摇柄 + 吊绳吊桶（well 组未旋转，直接用世界坐标）
    const wy0 = this.villageCenter.y;
    this._mergeAdd(vbag, this.matLog, new THREE.CylinderGeometry(0.09, 0.09, 2.5, 8), cx, wy0 + 2.05, cz, 0, 0, Math.PI / 2);
    this._mergeAdd(vbag, this.matLog, new THREE.BoxGeometry(0.07, 0.4, 0.07), cx + 1.22, wy0 + 1.88, cz);
    this._mergeAdd(vbag, this.matLog, new THREE.BoxGeometry(0.07, 0.07, 0.3), cx + 1.22, wy0 + 1.68, cz + 0.12);
    this._mergeAdd(vbag, this.matDoor, new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5), cx, wy0 + 1.86, cz);
    this._mergeAdd(vbag, this.matWood, new THREE.CylinderGeometry(0.17, 0.14, 0.26, 8), cx, wy0 + 1.55, cz);
    this._mergeAdd(vbag, this.matTrim, new THREE.CylinderGeometry(0.175, 0.175, 0.05, 8), cx, wy0 + 1.64, cz);

    this._mergeFlush(vbag, this.root);

    // 水井圆形碰撞（覆盖井圈，低台沿可走）
    this.circleColliders.push({ x: cx, z: cz, r: 1.7 });
  }

  _buildStones(rng) {
    const terrain = this.game.terrain;
    const sc = this.stonesCenter;

    const stoneGeo = new THREE.BoxGeometry(1, 1, 1);
    stoneGeo.translate(0, 0.5, 0);
    const pa = stoneGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      if (pa.getY(i) > 0.5) {
        pa.setX(i, pa.getX(i) * 0.55);
        pa.setZ(i, pa.getZ(i) * 0.62);
      }
    }
    stoneGeo.computeVertexNormals();

    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const sx = sc.x + Math.cos(a) * 13;
      const sz = sc.z + Math.sin(a) * 13;
      const m = new THREE.Mesh(stoneGeo, this.matDarkStone);
      m.position.set(sx, terrain.getHeight(sx, sz) - 0.4, sz);
      m.scale.set(1.5 + rng() * 0.5, 4.6 + rng() * 1.8, 1.0 + rng() * 0.35);
      m.rotation.y = a + (rng() - 0.5) * 0.6;
      m.rotation.x = (rng() - 0.5) * 0.14;
      m.rotation.z = (rng() - 0.5) * 0.14;
      m.castShadow = true;
      m.receiveShadow = true;
      this.root.add(m);
      if(this.game.p14Enabled)this.game.scatter?.obstacles?.register(sx,sz,
        Math.max(.60,m.scale.x*.52),m.position.y,m.position.y+m.scale.y,'stone-pillar');
    }

    this._box(4.4, 0.4, 3.2, this.matDarkStone, sc.x, sc.y + 0.1, sc.z, this.root, false);
    this._box(3.2, 0.8, 2.0, this.matDarkStone, sc.x, sc.y + 0.7, sc.z, this.root);

    const qx = sc.x, qz = sc.z - 3.4;
    return { x: qx, y: terrain.getHeight(qx, qz), z: qz, rotY: 0 };
  }

  _buildTower(rng) {
    const terrain = this.game.terrain;
    const tx = 300, tz = -300;
    const ty = terrain.getHeight(tx, tz);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.8, 2.4, 14), this.matStone);
    base.position.set(tx, ty + 0.6, tz);
    base.castShadow = true;
    base.receiveShadow = true;
    this.root.add(base);
    const floorTop = ty + 1.8;

    const segs = 12, R = 4.8, bh = 1.7;
    let maxTop = floorTop;
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      let colH;
      if (s >= 3 && s <= 6) {
        colH = 1 + Math.floor(rng() * 2);
      } else {
        colH = 4 + Math.floor(rng() * 3);
      }
      for (let l = 0; l < colH; l++) {
        const b = this._box(2.7, bh, 1.3, this.matStone,
          tx + Math.cos(a) * R + (rng() - 0.5) * 0.18,
          floorTop + bh / 2 + l * bh,
          tz + Math.sin(a) * R + (rng() - 0.5) * 0.18,
          this.root);
        b.rotation.y = -(a + Math.PI / 2) + (rng() - 0.5) * 0.08;
      }
      maxTop = Math.max(maxTop, floorTop + colH * bh);
    }

    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2;
      const rr = 6.5 + rng() * 4.5;
      const rx = tx + Math.cos(a) * rr;
      const rz = tz + Math.sin(a) * rr;
      const sc = 0.7 + rng() * 1.3;
      const rock = new THREE.Mesh(rockGeo, this.matStone);
      rock.position.set(rx, terrain.getHeight(rx, rz) + sc * 0.25, rz);
      rock.scale.set(sc, sc * (0.6 + rng() * 0.5), sc * (0.7 + rng() * 0.5));
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.root.add(rock);
      // These authored tower rocks are not instanced scatter; P13 never collided with them.
      if(this.game.p14Enabled)this.game.scatter?.obstacles?.register(rx,rz,
        Math.max(.55,sc*.82),rock.position.y-rock.scale.y,rock.position.y+rock.scale.y,'tower-rock');
    }

    this.perchPos.set(tx, maxTop + 0.4, tz);

    const ca = (4.5 / segs) * Math.PI * 2;
    const cx = tx + Math.cos(ca) * 8;
    const cz = tz + Math.sin(ca) * 8;
    return { x: cx, y: terrain.getHeight(cx, cz), z: cz, rotY: Math.atan2(Math.cos(ca), Math.sin(ca)) };
  }

  // 立式石火盆：石柱 + 火碗 + 火苗 + 橙色点光，光照闪烁复用火把更新逻辑
  _makeBrazier(parent, x, y, z, phase) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 1.0, 8), this.matDarkStone);
    ped.position.y = 0.5;
    ped.castShadow = true;
    ped.receiveShadow = true;
    g.add(ped);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.28, 0.36, 10), this.matDarkStone);
    bowl.position.y = 1.14;
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    g.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.72, 6), this.matFlame);
    flame.position.y = 1.6;
    g.add(flame);
    const light = new THREE.PointLight(0xff9a4a, 1.6, 18);
    light.position.y = 1.75;
    g.add(light);
    parent.add(g);
    this.torches.push({ light, flame, phase });
    return g;
  }

  // 风暮地穴入口：嵌入山坡的封土堆 + 石门框 + 幽暗门洞 + 守门火盆
  _buildBarrow() {
    const terrain = this.game.terrain;
    const bx = -243, bz = -157;
    const by = terrain.getHeight(bx, bz);
    const g = new THREE.Group();
    g.position.set(bx, by, bz);
    g.rotation.y = Math.atan2(this.stonesCenter.x - bx, this.stonesCenter.z - bz);
    this.root.add(g);

    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), this.matMound);
    mound.position.set(0, -0.6, -4.5);
    mound.scale.set(8.5, 4.6, 6.0);
    mound.castShadow = true;
    mound.receiveShadow = true;
    g.add(mound);

    // 甬道石领（衔接封土堆与门框）
    this._box(3.0, 3.2, 1.6, this.matDarkStone, 0, 1.5, 0.9, g);
    // 石门框：双柱 + 门楣
    this._box(0.75, 3.4, 0.8, this.matDarkStone, -1.25, 1.7, 2.1, g);
    this._box(0.75, 3.4, 0.8, this.matDarkStone, 1.25, 1.7, 2.1, g);
    const lintel = this._box(3.6, 0.75, 0.95, this.matDarkStone, 0, 3.55, 2.1, g);
    lintel.rotation.z = 0.03;
    // 门洞石板（夜里隐隐透蓝）
    this._box(1.9, 3.0, 0.3, this.matBarrowDoor, 0, 1.5, 1.78, g);
    // 两侧挡土石
    const f1 = this._box(2.6, 2.6, 0.9, this.matDarkStone, -2.9, 1.0, 1.4, g);
    f1.rotation.y = 0.35;
    const f2 = this._box(2.6, 2.6, 0.9, this.matDarkStone, 2.9, 1.0, 1.4, g);
    f2.rotation.y = -0.35;
    // 门前石阶
    this._box(3.4, 0.35, 1.8, this.matStone, 0, 0.12, 3.0, g, false);

    this._makeBrazier(g, -2.2, 0.05, 3.6, 4.7);
    this._makeBrazier(g, 2.2, 0.05, 3.6, 5.9);

    return this._doorAnchor(g, 3.3);
  }

  // 程序化符文条纹理：深色石底 + 棱角分明的笔画
  _makeRuneTexture() {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0d1014';
    ctx.fillRect(0, 0, 1024, 128);
    const rng = mulberry32(777);
    ctx.strokeStyle = '#e6f4ff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'square';
    for (let i = 0; i < 14; i++) {
      const gx = 26 + i * 70, gw = 44, gy = 22, gh = 84;
      const mx = gx + gw * (0.3 + rng() * 0.4);
      ctx.beginPath();
      ctx.moveTo(mx, gy);
      ctx.lineTo(mx, gy + gh);
      ctx.stroke();
      const strokes = 2 + Math.floor(rng() * 3);
      for (let s = 0; s < strokes; s++) {
        const y1 = gy + rng() * gh;
        const x2 = gx + rng() * gw;
        const y2 = gy + rng() * gh;
        ctx.beginPath();
        ctx.moveTo(mx, y1);
        ctx.lineTo(x2, y2);
        if (rng() < 0.5) ctx.lineTo(x2, Math.min(gy + gh, y2 + 10 + rng() * 22));
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // 霜之龙语墙：弧形竖石 + 发光符文条，未习得时脉动
  _buildWordWall(x, z) {
    const terrain = this.game.terrain;
    const y = terrain.getHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(this.villageCenter.x - x, this.villageCenter.z - z); // 凹面朝来路
    this.root.add(g);

    // 基座台阶
    this._box(8.6, 0.5, 3.4, this.matDarkStone, 0, 0.25, 0.6, g, false);
    this._box(7.4, 0.4, 2.4, this.matDarkStone, 0, 0.65, 0.2, g, false);

    // 弧形石板：5 块竖石沿圆弧排列（圆心在局部 z=+R 处，凹面朝 +z）
    const R = 5.5;
    const heights = [2.9, 3.3, 3.5, 3.3, 2.9];
    const arcHalf = 0.66;
    for (let i = 0; i < 5; i++) {
      const a = -arcHalf + (i / 4) * arcHalf * 2;
      const h = heights[i];
      const b = this._box(1.48, h, 0.55, this.matDarkStone,
        Math.sin(a) * R, 0.85 + h / 2, R - Math.cos(a) * R, g);
      b.rotation.y = Math.PI - a;
    }
    // 顶部残破压顶石
    const cap1 = this._box(1.7, 0.4, 0.8, this.matStone, Math.sin(-arcHalf) * R, 3.95, R - Math.cos(-arcHalf) * R, g);
    cap1.rotation.y = Math.PI + arcHalf + 0.08;
    const cap2 = this._box(1.7, 0.4, 0.8, this.matStone, Math.sin(arcHalf) * R, 3.95, R - Math.cos(arcHalf) * R, g);
    cap2.rotation.y = Math.PI - arcHalf - 0.08;

    // 符文条：贴着竖石凹面的弧形条带
    const runeTex = this._makeRuneTexture();
    const runeMat = new THREE.MeshStandardMaterial({
      map: runeTex,
      emissive: 0x7fd4ff,
      emissiveMap: runeTex,
      emissiveIntensity: 1.0,
      roughness: 0.85,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const stripGeo = new THREE.CylinderGeometry(5.18, 5.18, 0.95, 32, 1, true, Math.PI - 0.575, 1.15);
    const strip = new THREE.Mesh(stripGeo, runeMat);
    strip.position.set(0, 2.05, R);
    g.add(strip);

    const runeLight = new THREE.PointLight(0x7fd4ff, 0.9, 14);
    runeLight.position.set(0, 2.2, 1.6);
    g.add(runeLight);

    const entry = {
      id: 'frost', shoutId: 'frost',
      pos: new THREE.Vector3(x, y, z),
      learned: false,
      runeMat, runeLight,
      setLearned() {
        this.runeMat.emissiveIntensity = 0.15;
        this.runeLight.intensity = 0.1;
      },
      resetLearned() {
        this.learned = false;
        this.runeMat.emissiveIntensity = 1.0;
        this.runeLight.intensity = 0.9;
      },
    };
    this.wordWalls.push(entry);
    return entry;
  }

  // 雪原高台布景：龙语墙 + 火盆环 + 雪堆 + 宝箱（追加索引 4）
  _buildPlateau(rng) {
    const terrain = this.game.terrain;
    const px = 380, pz = -150;
    this._buildWordWall(px, pz);

    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * (Math.PI / 2);
      const bx = px + Math.cos(a) * 7.2;
      const bz = pz + Math.sin(a) * 7.2;
      this._makeBrazier(this.root, bx, terrain.getHeight(bx, bz), bz, 7.3 + i * 1.71);
    }

    const driftGeo = new THREE.SphereGeometry(1, 10, 7);
    for (let i = 0; i < 7; i++) {
      const a = rng() * Math.PI * 2;
      const r = 11 + rng() * 22;
      const dx = px + Math.cos(a) * r;
      const dz = pz + Math.sin(a) * r;
      const m = new THREE.Mesh(driftGeo, this.matSnowDrift);
      const s = 2.2 + rng() * 2.6;
      m.scale.set(s, 0.45 + rng() * 0.4, s * (0.7 + rng() * 0.5));
      m.position.set(dx, terrain.getHeight(dx, dz) + 0.05, dz);
      m.rotation.y = rng() * Math.PI;
      m.receiveShadow = true;
      this.root.add(m);
    }

    const cx = 377.1, cz = -145.7;
    this._makeChest(cx, terrain.getHeight(cx, cz), cz, Math.atan2(px - cx, pz - cz), ['steel_sword', 'mana_potion'], 90);
  }

  _makeChest(x, y, z, rotY, loot, gold) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    this._box(1.2, 0.62, 0.8, this.matChest, 0, 0.31, 0, group);
    this._box(1.28, 0.07, 0.88, this.matTrim, 0, 0.14, 0, group);
    this._box(1.28, 0.07, 0.88, this.matTrim, 0, 0.46, 0, group);
    this._box(0.18, 0.22, 0.06, this.matTrim, 0, 0.5, 0.41, group);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.62, -0.4);
    group.add(lidPivot);
    this._box(1.26, 0.18, 0.86, this.matChest, 0, 0.09, 0.42, lidPivot);
    this._box(0.16, 0.2, 0.88, this.matTrim, 0, 0.1, 0.42, lidPivot);

    this.root.add(group);
    const chest = {
      group, lidPivot,
      pos: group.position.clone(),
      opened: false, openAnim: 0,
      loot: loot.slice(), gold,
      baseLoot: loot.slice(), baseGold: gold,
    };
    this.chests.push(chest);
    return chest;
  }

  update(dt) {
    const el = this.game.time.elapsed;
    for (let i = 0; i < this.torches.length; i++) {
      const tc = this.torches[i];
      // 高频异相多正弦替代 Math.random 抖动：视觉等效且确定性（世界生成/世界视觉层不用非种子随机；audio/effects 等运行时特效不在此约定内）
      tc.light.intensity = 1.5 + 0.5 * Math.sin(el * 13 + tc.phase)
        + 0.15 * Math.sin(el * 47.3 + tc.phase * 3.1)
        + 0.09 * Math.sin(el * 29.7 + tc.phase * 5.3);
    }
    const nf = (this.game.sky && this.game.sky.nightFactor) || 0;
    // 白天（nightFactor < 0.25）完全无残余辉光，夜里平滑亮起
    this.matWindow.emissiveIntensity = 1.6 * THREE.MathUtils.smoothstep(nf, 0.25, 0.75);
    for (let i = 0; i < this.chests.length; i++) {
      const c = this.chests[i];
      if (c.opened && c.openAnim < 1) c.openAnim = Math.min(1, c.openAnim + dt * 2.5);
      c.lidPivot.rotation.x = -1.9 * c.openAnim;
    }
    // 龙语墙符文：未习得时呼吸脉动（习得后 setLearned 调暗并停止）
    for (let i = 0; i < this.wordWalls.length; i++) {
      const w = this.wordWalls[i];
      if (!w.runeMat || w.learned) continue;
      const pulse = 0.85 + 0.45 * Math.sin(el * 2.4 + i * 1.3);
      w.runeMat.emissiveIntensity = pulse;
      if (w.runeLight) w.runeLight.intensity = pulse * 0.8;
    }
  }

  reset() {
    for (const c of this.chests) {
      c.opened = false;
      c.openAnim = 0;
      c.lidPivot.rotation.x = 0;
      c.loot = c.baseLoot.slice();
      c.gold = c.baseGold;
    }
  }
}
