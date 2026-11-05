import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const FILES = {
  player: './assets/models/player_barbarian.glb',
  sword: './assets/models/weapon_sword.glb',
  npc_mage: './assets/models/npc_chief_mage.glb',
  npc_knight: './assets/models/npc_blacksmith_knight.glb',
  npc_rogue: './assets/models/npc_villager_rogue.glb',
  skeleton_warrior: './assets/models/draugr_skeleton_warrior.glb',
  skeleton_mage: './assets/models/draugr_skeleton_mage.glb',
  skeleton_blade: './assets/models/draugr_weapon_skeleton_blade.glb',
  wolf: './assets/models/wolf_quaternius.glb',
  spider: './assets/models/spider_quaternius_cc0.glb',
  dragon: './assets/models/dragon_evolved_quaternius.glb',
  pine1: './assets/models/env_pine_01.glb',
  pine2: './assets/models/env_pine_02.glb',
  pine_snow: './assets/models/env_pine_snow.glb',
  rock1: './assets/models/env_rock_01.glb',
  rock_large: './assets/models/env_rock_large.glb'
};

// KayKit 角色自带可切换道具网格，按角色隐藏（保留 Barbarian_Hat / Barbarian_Cape）
const HIDDEN_PROPS = {
  player: ['1H_Axe', '1H_Axe_Offhand', '2H_Axe', 'Barbarian_Round_Shield', 'Mug'],
  npc_mage: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff'],
  npc_knight: ['1H_Sword', '1H_Sword_Offhand', '2H_Sword', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', 'Knight_Helmet'],
  npc_rogue: ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable']
};

// 人形按 nativeHeight 归一；wolf/dragon 用固定缩放。
// 注意：Quaternius GLB 的厘米->米换算烤在 Armature 节点里，蒙皮顶点跟随骨骼世界矩阵渲染，
// 与原始几何单位（wolf ~270、dragon ~492）无关。实测蒙皮世界尺寸推导：
// wolf 每单位缩放渲染长 5.27u -> 0.28 约 1.5u 长；dragon 每单位翼展 3.16u -> 3.9 约 12.3u 宽。
const SCALE = {
  player: { targetHeight: 1.9 },
  npc_mage: { targetHeight: 1.9 },
  npc_knight: { targetHeight: 1.9 },
  npc_rogue: { targetHeight: 1.9 },
  skeleton_warrior: { targetHeight: 1.85 },
  skeleton_mage: { targetHeight: 1.85 },
  wolf: { fixed: 0.28 },
  spider: { targetHeight: 0.85 },
  dragon: { fixed: 3.9 }
};

const WEAPON_ATTACH = {
  player: { weaponKey: 'sword', bone: 'handslotr' },
  skeleton_warrior: { weaponKey: 'skeleton_blade', bone: 'handslotr' }
};

// 命中节点名或其 '_' 后缀变体（如 Mug_1）；命中组节点时子网格随渲染层级一并隐藏
function matchesProp(name, names) {
  for (const n of names) {
    if (name === n || name.startsWith(n + '_')) return true;
  }
  return false;
}

function applyHiddenProps(root, key) {
  const names = HIDDEN_PROPS[key];
  if (!names) return;
  root.traverse((o) => {
    if (matchesProp(o.name, names)) o.visible = false;
  });
}

// 只统计可见网格的包围盒高度（隐藏道具如法师杖会显著撑高 bbox）
function measureVisibleHeight(root) {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  const walk = (o) => {
    if (!o.visible) return;
    if (o.isMesh && o.geometry) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      box.union(tmp);
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  if (box.isEmpty()) return 1;
  return Math.max(box.max.y - box.min.y, 0.001);
}

function cloneMaterials(mesh) {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((m) => m.clone());
  } else if (mesh.material) {
    mesh.material = mesh.material.clone();
  }
}

class Rig {
  constructor(root, animations) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    // shortName 去掉 'AnimalArmature|' 之类前缀；wolf 的重复双套片段在 Map 里自然去重
    this.clips = new Map();
    for (const clip of animations) {
      const short = clip.name.includes('|') ? clip.name.slice(clip.name.lastIndexOf('|') + 1) : clip.name;
      this.clips.set(short, clip);
    }
    this._current = null;
    this._currentName = '';
    this._finishListener = null;
    this._warned = new Set();
    this._upperMixer=null;
    this._upperCache=new Map();
    this._upperCurrent=null;
  }

  _upperClip(name){
    if(this._upperCache.has(name))return this._upperCache.get(name);
    const clip=this.clips.get(name);
    if(!clip){this._upperCache.set(name,null);return null;}
    // Use actual animated upper-body bones; hips and legs remain locomotion-owned.
    const tracks=clip.tracks.filter(t=>{
      const n=t.name.toLowerCase();
      return /(spine|chest|shoulder|clavicle|upper.?arm|lower.?arm|fore.?arm|hand|wrist|neck|head|arm[_ .|])/.test(n)
        && !/(hips|pelvis|thigh|calf|leg|foot|toe|root\.position)/.test(n);
    });
    const layer=tracks.length>=2?new THREE.AnimationClip('hf-upper-'+name,clip.duration,tracks):null;
    this._upperCache.set(name,layer);
    return layer;
  }

  supportsUpperBody(name){return !!this._upperClip(name);}
  playUpperBody(name,opts={}){
    const clip=this._upperClip(name);if(!clip)return false;
    if(!this._upperMixer)this._upperMixer=new THREE.AnimationMixer(this.root);
    const action=this._upperMixer.clipAction(clip);
    if(this._upperCurrent&&this._upperCurrent!==action)this._upperCurrent.fadeOut(.04);
    action.reset();action.setLoop(THREE.LoopOnce,1);
    action.clampWhenFinished=false;
    action.setEffectiveTimeScale(opts.timeScale||1);
    action.setEffectiveWeight(1);
    action.fadeIn(opts.fade||.045);action.play();
    this._upperCurrent=action;return true;
  }
  stopUpperBody(fade=.065){
    if(!this._upperCurrent)return;
    if(fade<=0)this._upperCurrent.stop();
    else this._upperCurrent.fadeOut(fade);
    this._upperCurrent=null;
  }

  get currentName() {
    return this._currentName;
  }

  play(name, opts = {}) {
    const { fade = 0.25, once = false, timeScale = 1, onDone } = opts;
    const clip = this.clips.get(name);
    if (!clip) {
      if (!this._warned.has(name)) {
        this._warned.add(name);
        console.warn(`[assets] 缺少动画片段: ${name}`);
      }
      // 片段缺失也要触发 onDone，否则等回调的调用方（如 NPC busy 标志）会永久卡死
      if (once && onDone) queueMicrotask(onDone);
      return null;
    }

    if (name === this._currentName && !once && this._current) {
      this._current.setEffectiveTimeScale(timeScale);
      return this._current;
    }

    // 被打断的 once 动作不再回调 onDone（淡出中的旧 action 播完仍会派发 finished）
    if (this._finishListener) {
      this.mixer.removeEventListener('finished', this._finishListener);
      this._finishListener = null;
    }

    const action = this.mixer.clipAction(clip);
    const prev = this._current;
    action.reset();
    action.setEffectiveTimeScale(timeScale);
    action.setEffectiveWeight(1);
    if (once) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      if (onDone) {
        const listener = (e) => {
          if (e.action !== action) return;
          this.mixer.removeEventListener('finished', listener);
          if (this._finishListener === listener) this._finishListener = null;
          onDone();
        };
        this._finishListener = listener;
        this.mixer.addEventListener('finished', listener);
      }
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }

    if (prev && prev !== action) prev.fadeOut(fade);
    action.fadeIn(fade);
    action.play();
    this._current = action;
    this._currentName = name;
    return action;
  }

  update(dt) {
    this.mixer.update(dt);
    if(this._upperMixer)this._upperMixer.update(dt);
  }
}

export class AssetLib {
  constructor() {
    this._lib = {};
    this._partsCache = new Map();
  }

  async loadAll(onProgress) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder); // MIT, vendored locally for Quaternius rigs
    const entries = Object.entries(FILES);
    const total = entries.length;
    let done = 0;
    await Promise.all(entries.map(async ([key, url]) => {
      const gltf = await loader.loadAsync(url);
      // 在源场景上隐藏道具：克隆继承 visible，且 nativeHeight 不被道具撑高
      applyHiddenProps(gltf.scene, key);
      const nativeHeight = measureVisibleHeight(gltf.scene);
      this._lib[key] = { gltf, nativeHeight };
      done += 1;
      if (onProgress) onProgress(done, total);
    }));
  }

  has(key) { return !!this._lib[key]; }

  spawn(key) {
    const entry = this._lib[key];
    if (!entry) throw new Error(`[assets] 未加载的资源: ${key}`);

    const model = skeletonClone(entry.gltf.scene);
    applyHiddenProps(model, key);

    const cfg = SCALE[key];
    let s = 1;
    if (cfg) s = cfg.fixed !== undefined ? cfg.fixed : cfg.targetHeight / entry.nativeHeight;
    model.scale.setScalar(s);

    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = false;
      // 每实例独立材质：受击红闪不串台
      if (o.isSkinnedMesh) cloneMaterials(o);
    });

    const attach = WEAPON_ATTACH[key];
    if (attach && this._lib[attach.weaponKey]) {
      const bone = model.getObjectByName(attach.bone);
      if (bone) {
        const weapon = this._lib[attach.weaponKey].gltf.scene.clone(true);
        weapon.name = 'attached_weapon';
        weapon.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.receiveShadow = false;
          cloneMaterials(o);
        });
        bone.add(weapon);
      } else {
        console.warn(`[assets] ${key} 缺少挂点骨骼: ${attach.bone}`);
      }
    }

    const root = new THREE.Group();
    root.name = `rig_${key}`;
    root.add(model);
    return new Rig(root, entry.gltf.animations);
  }

  staticParts(key) {
    if (this._partsCache.has(key)) return this._partsCache.get(key);
    const entry = this._lib[key];
    if (!entry) throw new Error(`[assets] 未加载的资源: ${key}`);

    const scene = entry.gltf.scene;
    scene.updateWorldMatrix(true, true);
    const parts = [];
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      parts.push({
        geometry: o.geometry,
        material: o.material,
        matrix: o.matrixWorld.clone()
      });
    });
    this._partsCache.set(key, parts);
    return parts;
  }
}
