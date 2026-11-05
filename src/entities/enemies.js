import * as THREE from 'three';
import { worldIsSafeP18 } from '../world/world-registry-p18.js';
import { dryPackCenterP182, groundedStepP182 } from '../world/terrestrial-habitat-p182.js';
import { shallowStepP183, waterSpeedP183 } from '../world/shallow-water-p183.js';
import { rollBonusLootP183 } from '../systems/loot-table-p183.js';
import { P183_PENDING_SPECIES, speciesReadyP183 } from '../world/species-gate-p183.js';
import { P183B_CAMPS,P183B_COAST_TEMPLATE,resolveBiomeCampP183b,resolveCoastSitesP183b,biomeValidP183b } from '../world/biome-families-p183b.js';
import { realForestP183c } from '../world/habitat-p183c.js';

const P183_SPIDER_DENS = [{x:-210,z:420},{x:-220,z:432},{x:-196,z:436},{x:-230,z:414},{x:-201,z:405}]; // 5 WOC-inspired Sableweb spiders // independent spawn / no quest ownership
const WOLF_PACK_HOMES = [
  { x: 120, z: 160 },
  { x: -150, z: 120 },
  { x: 80, z: -180 },
];
const WOLF_OFFSETS = [[0, 0], [4.2, 2.6], [-3.6, 3.4]];
// P18: two border patrols use the already-approved CC0 wolf model.
// 4 extra rigs in total, away from the safe 78m town; no asset downloads.
const P18_FRONTIER_PACKS = [{x:110,z:95,id:'wolf_edge_east_01'}, {x:-112,z:76,id:'wolf_edge_west_01'}];
const P18_FRONTIER_OFFSETS = [[0,0],[4,3.4]];
const COS35 = Math.cos((35 * Math.PI) / 180);

// 雪原高台Lobo helado群（PLATEAU 380,-150，4 只一群，120s 重生）
const ICE_PACK_HOME = { x: 380, z: -150 };
const ICE_WOLF_OFFSETS = [[0, 0], [4.5, 2.5], [-4, 3.5], [2, -4.5]];
const ICE_TINT = new THREE.Color(0xcfe0ea);

// 风暮地穴Draugr（BARROW_ORIGIN -3000,34,-3000，沿入口->回廊->圆厅->王座厅路径摆放）
const BARROW_ORIGIN = { x: -3000, z: -3000 };
const BARROW_DRAUGR = [
  { dx: 0, dz: 16, variant: 'warrior' },   // 回廊
  { dx: 2.6, dz: 31, variant: 'warrior' }, // 圆厅
  { dx: -2.6, dz: 33, variant: 'mage' },   // 圆厅
];
const BARROW_BOSS_OFFSET = { dx: 0, dz: 52 }; // 王座厅

const MAGE_MIN_DIST = 10;
const MAGE_MAX_DIST = 16;
const MAGE_CAST_CD = 2.4;
const MAGE_BOLT_SPEED = 18;
const MAGE_BOLT_LIFE = 2.5;
const AWAKEN_SEC = 1.5;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function angLerp(a, b, t) { return a + angDiff(b, a) * t; }

export class Enemies {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.lootDrops = [];
    this.bolts = [];
    this.dragon = null;
    this.packs = [];
    this.pendingRespawns = [];
    this.p183VenomTicks=0;this.p183VenomTime=0;
    this.p183bSites=[];
    this.p183cSpawnAudit=[];
    this.geoCache = new Map();
    this.sackMat = new THREE.MeshStandardMaterial({ color: 0x7a5c34, roughness: 0.8, metalness: 0, emissive: 0xc9a86a, emissiveIntensity: 0.45 });
    // Reuse existing loot sack geometry; only material changes with rarity.
    // No additional meshes or draw calls per sack relative to P18.2.1.
    this.p183SackMats = {
      common:this.sackMat,
      uncommon:new THREE.MeshStandardMaterial({color:0x37856c,roughness:.8,emissive:0x256b53,emissiveIntensity:.3}),
      rare:new THREE.MeshStandardMaterial({color:0x366bac,roughness:.8,emissive:0x2459a1,emissiveIntensity:.4}),
      epic:new THREE.MeshStandardMaterial({color:0x7741a6,roughness:.8,emissive:0x7737b4,emissiveIntensity:.5}),
      legendary:new THREE.MeshStandardMaterial({color:0xb7892b,roughness:.8,emissive:0xc89c3a,emissiveIntensity:.6})
    };
    this.knotMat = new THREE.MeshStandardMaterial({ color: 0x5a4426, roughness: 1, metalness: 0 });
    this.boltGeo = new THREE.SphereGeometry(0.16, 8, 6);
    this.boltMat = new THREE.MeshBasicMaterial({
      color: 0x7fd4ff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.spawnAll();
  }

  _geo(key, make) {
    let g = this.geoCache.get(key);
    if (!g) { g = make(); this.geoCache.set(key, g); }
    return g;
  }

  _boxGeo(w, h, d) {
    return this._geo('b' + w + ',' + h + ',' + d, () => new THREE.BoxGeometry(w, h, d));
  }

  _groundAt(x, z) {
    const t = this.game.terrain;
    return Math.max(t.getHeight(x, z), t.waterY + 0.3);
  }

  _attachRig(e, key, parent = e.group) {
    const rig = this.game.assets.spawn(key);
    // Skinned Quaternius GLBs can carry stale static bounding boxes; disable
    // false frustum rejection for a handful of the new species only.
    if(this.game.p183cEnabled&&['goblin','spider','crab','yeti','orc'].includes(key)){
      rig.root.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false;});
    }
    e.rig = rig;
    parent.add(rig.root);
    rig.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      // AssetLib 只对 SkinnedMesh 做了 per-spawn 材质克隆；挂在骨骼上的静态武器仍共享材质，
      // 这里补克隆，避免受击红闪串到其他个体
      if (!o.isSkinnedMesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.emissive) e.mats.push({ m, e: m.emissive.getHex(), i: m.emissiveIntensity });
      }
    });
    return rig;
  }

  _loco(e, name, timeScale = 1) {
    if (e.animLock > 0) return;
    e.rig.play(name, { timeScale });
  }

  // fitSec > 0 时把片段压缩/拉伸到 fitSec 秒；返回前禁止 locomotion 覆盖
  _once(e, name, fitSec = 0) {
    const clip = e.rig.clips.get(name);
    const dur = clip ? clip.duration : Math.max(fitSec, 0.5);
    const timeScale = fitSec > 0 ? dur / fitSec : 1;
    e.rig.play(name, { once: true, timeScale, fade: 0.12 });
    e.animLock = Math.max(e.animLock, fitSec > 0 ? fitSec : dur);
  }

  spawnAll() {
    this.packs = WOLF_PACK_HOMES.map((h) => ({ home: h, members: [], respawnT: -1, ice: false, respawnDelay: 90 }));
    this.packs.push({ home: ICE_PACK_HOME, members: [], respawnT: -1, ice: true, respawnDelay: 120 });
    if (this.game.p18Enabled) {
      for (const spec of P18_FRONTIER_PACKS) this.packs.push({
        home:{x:spec.x,z:spec.z},regionId:spec.id,p18:true,
        members:[],respawnT:-1,ice:false,respawnDelay:115
      });
    }
    for (let pi = 0; pi < this.packs.length; pi++) this._spawnPack(pi);
    const sc = this.game.structures.stonesCenter;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const variant = (i === 1 || i === 4) ? 'mage' : 'warrior';
      this._spawnDraugr(sc.x + Math.cos(a) * 22, sc.z + Math.sin(a) * 22, variant);
    }
    this._spawnBarrowDraugr();
    this._spawnDragon();
    if(this.game.p183Enabled){
      const spec=P183_PENDING_SPECIES.find(s=>s.id==='forest_spider');
      if(speciesReadyP183(spec,['spider'].filter(k=>this.game.assets.has(k)))){
        for(const den of P183_SPIDER_DENS)this._spawnSpider(den.x,den.z);
      }
    }
    if(this.game.p183bEnabled)this._spawnBiomeWorldP183b();
    if(this.game.p16Enabled && new URLSearchParams(location.search).has('hf_training'))
      this._spawnTrainingDummy();
  }

  _spawnTrainingDummy(){
    const p=this.game.player.group.position;
    const e=this._base('training','ENTRENAMIENTO · 4 IMPACTOS',99999,.9,p.x+5,p.z-3);
    this._attachRig(e,'skeleton_warrior');
    e.training=true;e.aggroR=0;e.attackRange=0;e.speed=0;
    e.rig.play('Idle');
    // Noncombat QA target. No kill, XP, quest progress, drops or rewards.
    e.takeDamage=amount=>{
      const damage=Math.max(0,Math.min(200,Number(amount)||0));
      if(!damage)return;
      e.hp=Math.max(1,e.hp-damage);
      e.flashT=.12;
      for(const mat of e.mats){mat.m.emissive.setHex(0xff3030);mat.m.emissiveIntensity=.9;}
    };
    return e;
  }

  _spawnPack(pi) {
    const pack = this.packs[pi];
    const offs = pack.p18 ? P18_FRONTIER_OFFSETS : pack.ice ? ICE_WOLF_OFFSETS : WOLF_OFFSETS;
    if(this.game.p18Enabled){
      // Single shared land choice for the whole pack; never float wolves on
      // waterY+0.3 (the legacy _groundAt clamp only concealed underwater ground).
      // Cache this home so timed respawn never rescans or causes a frame spike.
      if(!pack.p182DryHome){
        pack.p182DryHome=dryPackCenterP182(this.game.terrain,pack.home,offs,
          (x,z)=>!worldIsSafeP18(x,z) &&
            offs.every(([ox,oz])=>!worldIsSafeP18(x+ox,z+oz)));
        if(pack.p182DryHome)pack.home={x:pack.p182DryHome.x,z:pack.p182DryHome.z};
      }
      if(!pack.p182DryHome){
        pack.members=[];pack.respawnT=30;
        return; // no valid terrestrial habitat: do not spawn anything
      }
    }
    pack.members = offs.map((o,j) => this._spawnWolf(
      pack.home.x + o[0], pack.home.z + o[1], pi, pack.ice,
      pack.p18 ? (j===0?'alpha':'scout') : null
    ));
    pack.respawnT = -1;
  }

  _spawnBarrowDraugr() {
    for (let i = 0; i < BARROW_DRAUGR.length; i++) {
      const d = BARROW_DRAUGR[i];
      this._spawnDraugr(BARROW_ORIGIN.x + d.dx, BARROW_ORIGIN.z + d.dz, d.variant);
    }
    const boss = this._spawnDraugr(
      BARROW_ORIGIN.x + BARROW_BOSS_OFFSET.dx,
      BARROW_ORIGIN.z + BARROW_BOSS_OFFSET.dz,
      'warrior'
    );
    if(!boss)return; // dry-habitat guard, only relevant to future dungeon layouts
    boss.boss = true;
    boss.name = 'Señor draugr';
    boss.hp = boss.maxHp = 150;
    boss.dmg = 22;
    boss.speed = 4.6;
    boss.aggroR = 16;
    boss.hitRadius = 1.2;
    boss.attackRange = 2.8;
    boss.rig.root.scale.multiplyScalar(1.15);
  }

  _base(type, name, hp, hitRadius, x, z) {
    const group = new THREE.Group();
    const y = this._groundAt(x, z);
    group.position.set(x, y, z);
    const e = {
      type, name, group,
      hp, maxHp: hp, alive: true, hitRadius,
      state: 'idle',
      home: new THREE.Vector3(x, y, z),
      yaw: Math.random() * Math.PI * 2,
      kbVel: new THREE.Vector3(),
      hitstunT:0,
      wanderTarget: new THREE.Vector3(x, y, z),
      wanderT: Math.random() * 3,
      cdT: 0, aggroT: 0, hitPending: -1, boltPending: -1,
      variant: '', awakened: true, awakenT: 0,
      animLock: 0,
      flashT: 0, deadT: 0, fallV: 0,
      slowT: 0, slowDur: 0, slowFactor: 1,
      fading: false, removed: false,
      rig: null, mats: [],
    };
    group.rotation.y = e.yaw;
    e.takeDamage = (dmg, kb) => this._takeDamage(e, dmg, kb);
    e.applySlow = (factor, seconds) => this._applySlow(e, factor, seconds);
    this.game.scene.add(group);
    this.list.push(e);
    return e;
  }

  _applySlow(e, factor, seconds) {
    if (!e.alive) return;
    let f = clamp(factor, 0, 1);
    if (e.type === 'dragon') f = Math.max(f, 0.7); // 巨龙体魄强健，减速效果打折
    e.slowFactor = f;
    e.slowT = Math.max(e.slowT, seconds);
    e.slowDur = Math.max(e.slowDur, seconds);
  }

  // Lobo helado皮毛染冰白色（per-spawn 克隆材质，安全），并把冰蓝微光写回 mats 基准值
  _tintIce(e) {
    e.rig.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.color) m.color.lerp(ICE_TINT, 0.6);
        if (m.emissive) {
          m.emissive.setHex(0x6fa8c8);
          m.emissiveIntensity = 0.06;
        }
      }
    });
    for (let i = 0; i < e.mats.length; i++) {
      e.mats[i].e = e.mats[i].m.emissive.getHex();
      e.mats[i].i = e.mats[i].m.emissiveIntensity;
    }
  }

  _spawnWolf(x, z, packIdx, ice = false, p18Role = null) {
    const hp = ice ? 45 : 30 + (this.game.stats.level - 1) * 5;
    const e = this._base('wolf', ice ? 'Lobo helado' : 'Lobo', hp, 1.0, x, z);
    e.dmg = ice ? 12 : 8;
    e.speed = ice ? 8 : 7.5;
    e.aggroR = 28; e.attackRange = 2.3; e.attackCd = 1.3;
    e.packIdx = packIdx;
    e.ice = ice;
    if (this.game.p18Enabled && p18Role) {
      e.p18Frontier = true;
      e.p18Pack = true;
      e.p18Role = p18Role;
      e.name = p18Role==='alpha' ? 'Lobo centinela alfa' : 'Lobo centinela explorador';
      e.speciesId='wolf_sentinel'; // distinct objective identity, wolf rig/combat remains compatible
      e.hp = e.maxHp = p18Role==='alpha' ? 64 : 37;
      e.dmg = p18Role==='alpha' ? 12 : 9;
      e.speed = p18Role==='alpha' ? 8.1 : 7.5;
      e.aggroR = 26;
    }
    this._attachRig(e, 'wolf');
    if (ice) this._tintIce(e);
    if (e.p18Role === 'alpha') {
      e.rig.root.scale.multiplyScalar(1.13);
      // Quaternius CC0 wolf, visually distinguished only by a warm coat tint.
      e.rig.root.traverse(o => {
        if (!o.isMesh || !o.material) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m.color) m.color.lerp(new THREE.Color(0xaa7254),.30);
      });
      // Restore hit-flash originals to the actual per-instance materials.
      for (const m of e.mats) {m.e=m.m.emissive.getHex();m.i=m.m.emissiveIntensity;}
    }
    e.rig.play('Idle');
    e.rig.update(0.3 + Math.random() * 1.5);
    return e;
  }


  _spawnBiomeWorldP183b(){
    const t=this.game.terrain,allow=(x,z)=>!worldIsSafeP18(x,z)&&Math.abs(x)<1100&&Math.abs(z)<1100;
    this.p183bSites=[];
    this.p183cSpawnAudit=[];
    for(const spec of P183B_CAMPS){
      if(!this.game.assets.has(spec.model)){
        this.p183cSpawnAudit.push({id:spec.id,type:spec.type,status:'modelo-no-cargado',spawned:0});
        continue;
      }
      const site=resolveBiomeCampP183b(t,spec,allow);
      if(!site){
        this.p183cSpawnAudit.push({id:spec.id,type:spec.type,status:'terreno-no-valido',spawned:0});
        continue;
      }
      let count=0;
      for(let k=0;k<spec.count;k++){
        let x=site.x+(k%2)*4.1,z=site.z+(k?3.3:0);
        if(this.game.p183dEnabled){
          // Classic ClaudeCraft uses spaced camp discs rather than a vertical
          // list of near-overlapping mobs. Existing k=0/1 are unchanged.
          const offsets=spec.biome==='road'
            ?[[0,0],[-15,2],[-31,5],[14,9],[29,19]]
            :[[0,0],[4.1,3.3],[-12,9],[13,-10],[-6,-14],[17,13]];
          let found=false;
          const preferred=offsets[k]||[Math.cos(k*2.4)*17,Math.sin(k*2.4)*17];
          const probes=[preferred,[preferred[0]*.6,preferred[1]*.6],[0,0]];
          for(const [dx,dz] of probes){
            const cx=site.x+dx,cz=site.z+dz;
            if(!biomeValidP183b(t,cx,cz,spec.biome,allow))continue;
            // The short dirt track is the actual bandit habitat, not grassland.
            if(spec.biome==='road'&&this.game.p183dEnabled){
              const roadOk=Math.hypot(cx-215,cz+112)<34;
              if(!roadOk)continue;
            }
            x=cx;z=cz;found=true;break;
          }
          if(!found)continue;
        }else if(!biomeValidP183b(t,x,z,spec.biome,allow))continue;
        if(this._spawnBiomeMobP183b(spec,x,z))count++;
      }
      if(count)this.p183bSites.push({spec,site,spawned:count});
      this.p183cSpawnAudit.push({id:spec.id,type:spec.type,status:count?'creado':'spawn-rechazado',spawned:count,x:site.x,z:site.z});
    }
    if(this.game.assets.has('crab')){
      // Shore crabs must not overlap existing wolf frontier camps or new dens.
      const wolfHomes=[[110,95],[-112,76],[120,160],[-150,120],[80,-180]];
      const shoreAllow=(x,z)=>allow(x,z)&&
        wolfHomes.every(([wx,wz])=>(x-wx)**2+(z-wz)**2>=60*60)&&
        this.p183bSites.every(({site})=>(x-site.x)**2+(z-site.z)**2>=60*60);
      for(const [i,site] of resolveCoastSitesP183b(t,shoreAllow).entries()){
        const spec={...P183B_COAST_TEMPLATE,id:'shore_crab_'+(i+1)};
        if(this._spawnBiomeMobP183b(spec,site.x,site.z)){
          this.p183bSites.push({spec,site,spawned:1});
          this.p183cSpawnAudit.push({id:spec.id,type:spec.type,status:'creado',spawned:1,x:site.x,z:site.z});
        }
      }
    }
    if(this.game.p183cEnabled&&typeof window!=='undefined')
      window.highflyP183cReport=()=>this.ecologyReportP183c();
    if(typeof window!=='undefined')window.highflyBiomeReport=()=>this.p183bSites.map(({spec,site})=>({
      camp:spec.id,biome:spec.biome,family:spec.family,type:spec.type,
      x:Math.round(site.x),z:Math.round(site.z)
    }));
  }
  ecologyReportP183c(){
    const creatures=this.list.filter(e=>e.p183bSpec||e.type==='spider').map(e=>{
      let meshes=0,visible=0,skins=0;
      e.rig?.root.traverse(o=>{if(o.isMesh){meshes++;if(o.visible&&o.material?.visible!==false)visible++;if(o.isSkinnedMesh)skins++;}});
      return {species:e.speciesId||e.type,name:e.name,alive:!!e.alive,
        x:+e.group.position.x.toFixed(1),z:+e.group.position.z.toFixed(1),
        y:+e.group.position.y.toFixed(1),meshes,visibleMeshes:visible,skins,
        model:e.p183bSpec?.model||'spider'};
    });
    return {version:this.game.p183dEnabled?'P18.3d':'P18.3c',models:this.p183cSpawnAudit.slice(),creatures,
      assetScale:this.game.assets.p183dAssets,loadErrors:this.game.assets.loadErrors};
  }
  _spawnBiomeMobP183b(spec,x,z){
    if(!this.game.p183bEnabled||!this.game.assets.has(spec.model))return null;
    const names={boar:'Jabalí salvaje',crab:'Cangrejo costero',goblin:'Goblin del bosque',
      bandit:'Bandido del camino',orc:'Orco de las ruinas',yeti:'Yeti',
      stag:'Ciervo',fox:'Zorro del bosque',snow_alpha:'Lobo alfa helado',forest_wolf:'Lobo forestal',prairie_wolf:'Lobo común (ClaudeCraft)',prairie_alpha:'Lobo alfa Greyjaw'};
    const e=this._base(spec.type,names[spec.type]||spec.type,spec.hp,
      spec.type==='orc'?1.2:spec.type==='crab'?.70:.85,x,z);
    e.speciesId=spec.type;e.p183bSpec=spec;
    e.dmg=spec.dmg;e.speed=spec.speed;e.aggroR=spec.aggro;
    e.attackRange=spec.attackRange;e.attackCd=spec.attackCd;
    if(this.game.p183dEnabled&&(spec.type==='prairie_wolf'||spec.type==='prairie_alpha')){
      e.p183dBaseAttackCd=e.attackCd;
      e.p183dFrenzyT=0;
      if(spec.type==='prairie_alpha'){
        e.name='Lobo Alfa · Greyjaw';e.hitRadius=1.4;
        e.rarity='rare';
      }
    }
    e.passive=!spec.aggressive;e.chargeCd=0;e.chargeT=0;
    this._attachRig(e,spec.model);
    if(this.game.p183dEnabled&&spec.type==='prairie_alpha')
      e.rig.root.scale.multiplyScalar(1.45); // unmistakable 2.32u silhouette versus 1.6u wolves
    if(spec.tint){
      const tint=new THREE.Color(spec.tint);
      for(const m of e.mats)if(m.m.color)m.m.color.lerp(tint,.28);
    }
    if(spec.type==='bandit'){
      for(const m of e.mats)if(m.m.color)m.m.color.multiplyScalar(.66);
      const hand=e.rig.root.getObjectByName('handslotr');
      if(hand&&this.game.assets.has('sword'))hand.add(this.game.assets.spawn('sword').root);
    }
    for(const m of e.mats){m.e=m.m.emissive.getHex();m.i=m.m.emissiveIntensity;}
    e.rig.play(spec.clips.idle);e.rig.update((Math.abs(x*3+z*7)%20)/10);
    return e;
  }

  _spawnSpider(x,z){
    if(!this.game.p183Enabled||!this.game.assets.has('spider'))return null;
    const dry=dryPackCenterP182(this.game.terrain,{x,z},[[0,0]],
      (nx,nz)=>!worldIsSafeP18(nx,nz)&&(!this.game.p183cEnabled||realForestP183c(this.game.terrain,nx,nz)));
    if(!dry)return null;
    const e=this._base('spider','Araña del bosque',44,.85,dry.x,dry.z);
    e.speciesId='forest_spider';e.dmg=8;e.speed=3.9;e.aggroR=14;e.attackRange=1.65;e.attackCd=1.7;
    this._attachRig(e,'spider');e.rig.play('Spider_Idle');e.rig.update(Math.random());
    return e;
  }

  _spawnDraugr(x, z, variant = 'warrior') {
    if(this.game.p18Enabled){
      const dry=dryPackCenterP182(this.game.terrain,{x,z},[[0,0]],
        (nx,nz)=> Math.abs(x)>2000 || !worldIsSafeP18(nx,nz));
      if(!dry)return null; // never build a terrestrial rig in deep water
      x=dry.x;z=dry.z;
    }
    const e = this._base('draugr', variant === 'mage' ? 'Draugr mago' : 'Draugr', 60, 1.0, x, z);
    e.dmg = 14; e.speed = 4.2; e.aggroR = 20; e.attackRange = 2.6; e.attackCd = 1.6;
    e.variant = variant;
    e.awakened = false;
    this._attachRig(e, variant === 'mage' ? 'skeleton_mage' : 'skeleton_warrior');
    e.rig.play('Idle');
    e.rig.update(0.3 + Math.random() * 1.5);
    return e;
  }

  _spawnDragon() {
    const perch = this.game.structures.perchPos;
    const group = new THREE.Group();
    const e = {
      type: 'dragon', name: 'Dragón antiguo', group,
      hp: 400, maxHp: 400, alive: true, hitRadius: 4.5,
      state: 'perch', sub: '', subT: 0,
      perch: perch.clone(),
      home: perch.clone(),
      vel: new THREE.Vector3(), kbVel: new THREE.Vector3(),
      yaw: Math.atan2(-perch.x, 40 - perch.z), pitch: 0, bank: 0,
      decideT: 0, flameT: 0, flameAcc: 0, flameDmgAcc: 0,
      circleAngle: 0, landPos: new THREE.Vector3(),
      cdT: 0, hitPending: -1,
      meleeAlt: false, hitReactT: 0,
      animLock: 0,
      flashT: 0, deadT: 0, fallV: 0,
      slowT: 0, slowDur: 0, slowFactor: 1,
      fading: false, removed: false,
      rig: null, pivot: null, mats: [],
    };
    e.takeDamage = (dmg, kb) => this._takeDamage(e, dmg, kb);
    e.applySlow = (factor, seconds) => this._applySlow(e, factor, seconds);

    e.pivot = new THREE.Group();
    group.add(e.pivot);
    this._attachRig(e, 'dragon', e.pivot);
    e.rig.play('Flying_Idle', { timeScale: 0.45 });
    e.rig.update(0.3);

    group.position.copy(perch);
    group.position.y += 1.4;
    group.rotation.y = e.yaw;
    this.game.scene.add(group);
    this.list.push(e);
    this.dragon = e;
  }

  _spawnDrop(x, z, items, gold, rarity='common') {
    const y = this._groundAt(x, z);
    const mesh = new THREE.Group();
    const sack = new THREE.Mesh(
      this._geo('sack', () => new THREE.SphereGeometry(0.3, 6, 5)),
      (this.game.p183Enabled && this.p183SackMats[rarity]) || this.sackMat
    );
    sack.scale.set(1, 1.15, 1);
    mesh.add(sack);
    const knot = new THREE.Mesh(
      this._boxGeo(0.14, 0.14, 0.14),
      this.knotMat
    );
    knot.position.y = 0.36;
    mesh.add(knot);
    const pos = new THREE.Vector3(x, y + 0.55, z);
    mesh.position.copy(pos);
    this.game.scene.add(mesh);
    this.lootDrops.push({ mesh, pos, items, gold, rarity, t: Math.random() * 6 });
  }

  _awaken(e) {
    e.awakened = true;
    e.state = 'awaken';
    e.awakenT = AWAKEN_SEC;
    e.aggroT = Math.max(e.aggroT, 4);
    this._once(e, 'Skeletons_Awaken_Floor', AWAKEN_SEC);
  }

  _takeDamage(e, dmg, kb) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.flashT = 0.12;
    for (let i = 0; i < e.mats.length; i++) {
      e.mats[i].m.emissive.setHex(0xff3030);
      e.mats[i].m.emissiveIntensity = 0.9;
    }
    if (e.type === 'dragon') {
      if (e.state === 'perch') this._dragonRoarTakeoff(e);
      // animLock > 0 表示攻击/受击片段还在播，不打断
      if (e.hitReactT <= 0 && e.animLock <= 0) {
        e.hitReactT = 2;
        this._once(e, 'HitReact');
      }
    } else {
      if (kb) e.kbVel.add(kb);
      if (e.type === 'draugr' && !e.awakened) this._awaken(e);
      else if (e.state !== 'attack' && e.state !== 'awaken') e.state = 'chase';
      e.aggroT = 10;
      // Adapted MIT-style dungeon pack assist: only living idle packmates
      // sharing this pack, within 32m, and never pulling into the safe city.
      if (this.game.p18Enabled && e.p18Pack &&
          !worldIsSafeP18(this.game.player.pos.x,this.game.player.pos.z)) {
        const pack=this.packs[e.packIdx];
        let alerted=0;
        for (const mate of pack?.members||[]) {
          if(mate===e || !mate.alive || mate.state!=='idle' ||
             mate.group.position.distanceToSquared(e.group.position)>32*32)continue;
          mate.state='chase';
          mate.aggroT=Math.max(mate.aggroT,6);
          if(++alerted>=3)break;
        }
      }
    }
    if(e.p183bSpec && e.hp>0){
      if(e.passive || (e.type==='bandit' && e.hp<e.maxHp*.35)){
        e.state='flee';e.fleeT=5.5;
      }else if(e.type==='bandit'||e.type==='goblin'||e.type==='forest_wolf'||e.type==='prairie_wolf'){
        let alerted=0;
        for(const other of this.list){
          if(other===e||!other.alive||other.type!==e.type||other.state!=='idle')continue;
          if(other.group.position.distanceToSquared(e.group.position)>28*28)continue;
          other.state='chase';other.aggroT=6;
          if(this.game.p183dEnabled&&other.type==='prairie_wolf')other.p183dFrenzyT=8;
          if(++alerted>=2)break;
        }
      }
    }
    if(this.game.p183dEnabled&&e.type==='prairie_alpha'&&e.hp>0&&Math.random()<.25){
      e.p183dFrenzyT=8;
      this.game.hud?.notify?.('¡Greyjaw entra en frenesí!');
    }
    if (e.hp <= 0) {
      e.hp = 0;
      this._die(e);
    }
  }

  _restoreMats(e) {
    for (let i = 0; i < e.mats.length; i++) {
      e.mats[i].m.emissive.setHex(e.mats[i].e);
      e.mats[i].m.emissiveIntensity = e.mats[i].i;
    }
  }

  _die(e) {
    const g = this.game;
    e.alive = false;
    e.state = 'dead';
    e.deadT = 0;
    e.fallV = 0;
    e.kbVel.set(0, 0, 0);
    e.boltPending = -1;
    e.hitPending = -1;
    this._once(e,e.p183bSpec?e.p183bSpec.clips.death:e.type==='draugr'?'Death_A':e.type==='spider'?'Spider_Death':'Death');
    e.animLock = 1e9;
    e.slowT = 0;
    e.slowDur = 0;
    e.slowFactor = 1;

    let xp, items, gold;
    if (e.type === 'wolf') {
      if (e.ice) {
        xp = 30; items = ['wolf_pelt', 'frost_essence'];
        gold = 8 + Math.floor(Math.random() * 11);
      } else {
        xp = 20; items = ['wolf_pelt'];
        gold = 5 + Math.floor(Math.random() * 11);
      }
    } else if (e.type === 'draugr') {
      if (e.boss) {
        xp = 120; items = ['ancient_relic'];
        gold = 80 + Math.floor(Math.random() * 41);
      } else {
        xp = 35; items = ['draugr_bone'];
        gold = 10 + Math.floor(Math.random() * 16);
      }
    } else if(e.type==='spider'){
      xp=28;items=['spider_silk'];gold=6+Math.floor(Math.random()*10);
    } else if(e.p183bSpec){
      xp=e.p183bSpec.xp;items=[e.p183bSpec.drop];
      gold=e.p183bSpec.gold+Math.floor(Math.random()*5);
    } else {
      xp = 300; items = ['dragon_bone', 'dragon_scale'];
      gold = 300;
    }
    // P18.3: keep every original guaranteed item, gold, XP and mission event.
    // Bonus tables are independent from quests and require no new visual assets.
    let rarity='common';
    if(g.p183Enabled){
      const extra=rollBonusLootP183(e);
      items=items.concat(extra.items);
      rarity=extra.rarity;
    }
    g.stats.addXP(xp);
    // Lobo helado按独立类型上报：q1「狼患」只认Lobo
    // Separate species credit: centinelas are NOT standard q1 wolves.
    g.quests.onEnemyKilled(e.p18Frontier ? 'wolf_sentinel' : e.ice ? 'ice_wolf' : (e.speciesId||e.type));
    if(g.p18Enabled && e.p18Frontier)g.livingWorld?.onEnemyKilled(e);
    this._spawnDrop(e.group.position.x, e.group.position.z, items, gold, rarity);

    if(e.type==='spider')this.pendingRespawns.push({kind:'spider',t:105,x:e.home.x,z:e.home.z});
    if(e.p183bSpec)this.pendingRespawns.push({kind:'biome',t:e.p183bSpec.respawn,sp:e.p183bSpec,x:e.home.x,z:e.home.z});
    if (e.type === 'draugr' && !e.boss) {
      this.pendingRespawns.push({ kind: 'draugr', t: 120, x: e.home.x, z: e.home.z, variant: e.variant });
    }
    if (e.type === 'dragon') {
      g.effects.spawnSoulStream(e.group.position.clone(), 2.5);
      g.hud.questBanner('Absorbiste el alma del dragón');
      g.audio.play('soul');
    }
  }

  _removeEnemy(e) {
    if (e.rig) e.rig.mixer.stopAllAction();
    this.game.scene.remove(e.group);
    for (let i = 0; i < e.mats.length; i++) e.mats[i].m.dispose();
    e.removed = true;
  }

  _updateDead(e, dt) {
    e.deadT += dt;
    const pos = e.group.position;
    if (e.type === 'dragon') {
      const ground = this._groundAt(pos.x, pos.z) + 1.2;
      if (pos.y > ground) {
        e.fallV += 30 * dt;
        pos.y = Math.max(ground, pos.y - e.fallV * dt);
      }
    } else {
      const ground = this._groundAt(pos.x, pos.z);
      if (pos.y > ground) pos.y += (ground - pos.y) * Math.min(1, 6 * dt);
    }
    if (e.deadT > 25) {
      if (!e.fading) {
        e.fading = true;
        for (let i = 0; i < e.mats.length; i++) e.mats[i].m.transparent = true;
      }
      const f = (e.deadT - 25) / 1.2;
      if (f >= 1) {
        this._removeEnemy(e);
      } else {
        for (let i = 0; i < e.mats.length; i++) e.mats[i].m.opacity = 1 - f;
      }
    }
  }

  _fireBolt(e, p) {
    const pos = e.group.position;
    const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
    mesh.position.set(pos.x, pos.y + 1.35, pos.z);
    _v3.set(p.x, p.y + 1.2, p.z).sub(mesh.position);
    if (_v3.lengthSq() < 1e-6) _v3.set(0, 0, 1);
    _v3.normalize();
    mesh.position.addScaledVector(_v3, 0.6);
    this.game.scene.add(mesh);
    this.bolts.push({ mesh, vel: _v3.clone().multiplyScalar(MAGE_BOLT_SPEED), life: MAGE_BOLT_LIFE });
    this.game.effects.spawnBurst(mesh.position, '#7fd4ff', 5, 3, 0.3, 0.1);
  }

  _updateBolts(dt, p) {
    const g = this.game;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      const bp = b.mesh.position;
      let gone = b.life <= 0;
      _v1.set(p.x, p.y + 1.0, p.z);
      if (bp.distanceTo(_v1) < 1.2) {
        g.stats.damage(12);
        g.effects.spawnBurst(bp, '#7fd4ff', 12, 7, 0.4, 0.14);
        gone = true;
      } else if (bp.y < g.terrain.getHeight(bp.x, bp.z) + 0.15 || bp.y < g.terrain.waterY) {
        g.effects.spawnBurst(bp, '#7fd4ff', 8, 5, 0.35, 0.12);
        gone = true;
      }
      if (gone) {
        g.scene.remove(b.mesh);
        this.bolts.splice(i, 1);
      }
    }
  }

  _updateGround(e, dt, p) {
    const g = this.game;
    const pos = e.group.position;
    const dx = p.x - pos.x;
    const dz = p.z - pos.z;
    const dist = Math.hypot(dx, dz);
    // HIGHFLY_P2_20261104: leash 50u wolves / 38u draugr from spawn.
    // No persistent aggro outside territory, no long cross-map chases.
    const dxHome = pos.x - e.home.x;
    const dzHome = pos.z - e.home.z;
    const homeDist = Math.hypot(dxHome, dzHome);
    const leash = e.type === 'wolf' ? 50 : 38;
    // The player may escape into town; frontier predators stop at the border.
    if (g.p18Enabled && e.p18Frontier && worldIsSafeP18(p.x,p.z) && e.state !== 'return') {
      e.state='return';e.aggroT=0;e.hitPending=-1;e.boltPending=-1;
      e.kbVel.set(0,0,0);
    }
    if (homeDist > leash && e.state !== 'return') {
      e.state = 'return';
      e.aggroT = 0;
      e.hitPending = -1;
      e.boltPending = -1;
      e.kbVel.set(0, 0, 0);
    }

    if (e.cdT > 0) e.cdT -= dt;
    if(this.game.p183dEnabled&&e.p183dBaseAttackCd){
      e.p183dFrenzyT=Math.max(0,(e.p183dFrenzyT||0)-dt);
      e.attackCd=e.p183dFrenzyT>0?e.p183dBaseAttackCd/1.3:e.p183dBaseAttackCd;
    }
    if(e.chargeCd>0)e.chargeCd-=dt;
    if (e.aggroT > 0) e.aggroT -= dt;
    if (e.hitPending >= 0) {
      e.hitPending -= dt;
      if (e.hitPending < 0) {
        e.hitPending = -1;
        if(dist<e.attackRange+0.9){
          g.stats.damage(e.dmg);
          if(g.p183Enabled&&e.type==='spider'){
            if(Math.random() < (g.p183dEnabled?.35:.30)){
              this.p183VenomTicks=Math.max(this.p183VenomTicks,g.p183dEnabled?5:3);
              this.p183VenomTime=1;
              g.hud.notify('Envenenado por araña');
            }
            if(g.p183dEnabled&&Math.random()<.25){
              g.player.p183dSnareT=3;
              g.hud.notify('Telaraña: movimiento ralentizado 3 s');
            }
          }
        }
      }
    }
    if (e.boltPending >= 0) {
      e.boltPending -= dt;
      if (e.boltPending < 0) {
        e.boltPending = -1;
        this._fireBolt(e, p);
      }
    }

    let mx = 0, mz = 0, sp = 0;
    let faceX = 0, faceZ = 0, hasFace = false;

    if (this.game.p15Enabled && e.hitstunT>0){
      e.hitstunT=Math.max(0,e.hitstunT-dt);
      // Suppress enemy movement/attack while hit-reacting, but preserve kbVel physics.
      e.hitPending=-1;e.boltPending=-1;
      e.cdT=Math.max(e.cdT,.12);
    } else if(e.state==='flee'){
      e.fleeT=(e.fleeT||0)-dt;
      if(e.fleeT<=0||homeDist>38)e.state='return';
      else if(dist>.01){mx=-dx/dist;mz=-dz/dist;sp=e.speed*1.12;faceX=mx;faceZ=mz;hasFace=true;}
    } else if (e.state === 'return') {
      const hx = e.home.x - pos.x;
      const hz = e.home.z - pos.z;
      const hd = Math.hypot(hx, hz);
      if (hd <= 1.8) {
        e.state = 'idle';
        e.wanderTarget.copy(e.home);
        e.wanderT = 2;
      } else {
        mx = hx / hd; mz = hz / hd;
        sp = e.speed * 0.9;
        faceX = mx; faceZ = mz; hasFace = true;
      }
    } else if (e.state === 'awaken') {
      faceX = dx; faceZ = dz; hasFace = true;
      e.awakenT -= dt;
      if (e.awakenT <= 0) e.state = 'chase';
    } else if (e.state === 'idle') {
      if (dist < e.aggroR) {
        e.aggroT = Math.max(e.aggroT, 4);
        if (e.type === 'draugr' && !e.awakened) this._awaken(e);
        else e.state = 'chase';
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 2.5 + Math.random() * 4;
          if (Math.random() < 0.35) {
            e.wanderTarget.copy(pos);
          } else {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 25;
            e.wanderTarget.set(e.home.x + Math.cos(a) * r, 0, e.home.z + Math.sin(a) * r);
          }
        }
        const wx = e.wanderTarget.x - pos.x;
        const wz = e.wanderTarget.z - pos.z;
        const wd = Math.hypot(wx, wz);
        if (wd > 1.4) {
          mx = wx / wd; mz = wz / wd;
          sp = e.speed * 0.42;
          faceX = mx; faceZ = mz; hasFace = true;
        }
      }
    } else if (e.state === 'chase') {
      if (e.variant === 'mage') {
        if (dist > 60 && e.aggroT <= 0) {
          e.state = 'idle';
          e.wanderT = 0;
        } else if (dist > 0.01) {
          faceX = dx; faceZ = dz; hasFace = true;
          if (dist > MAGE_MAX_DIST) {
            mx = dx / dist; mz = dz / dist;
            sp = e.speed;
          } else if (dist < MAGE_MIN_DIST) {
            mx = -dx / dist; mz = -dz / dist;
            sp = e.speed;
          }
          if (e.cdT <= 0 && dist < MAGE_MAX_DIST + 4) {
            e.cdT = MAGE_CAST_CD;
            e.boltPending = 0.35;
            this._once(e, 'Spellcast_Shoot');
          }
        }
      } else if (dist < e.attackRange) {
        e.state = 'attack';
      } else if (dist > 60 && e.aggroT <= 0) {
        e.state = 'idle';
        e.wanderT = 0;
      } else if (dist > 0.01) {
        mx = dx / dist; mz = dz / dist;
        sp = e.speed;
        faceX = mx; faceZ = mz; hasFace = true;
      }
    } else if (e.state === 'attack') {
      faceX = dx; faceZ = dz; hasFace = true;
      if (dist > e.attackRange * 1.7) {
        e.state = 'chase';
      } else if (e.cdT <= 0) {
        e.cdT = e.attackCd;
        e.hitPending = 0.2;
        if(e.type==='wolf')this._once(e,'Attack',.8);
        else if(e.p183bSpec)this._once(e,e.p183bSpec.clips.attack,.85);
        else if(e.type==='spider')this._once(e,'Spider_Attack',.8);
        else this._once(e,'1H_Melee_Attack_Slice_Diagonal');
      }
    }

    if(e.type==='boar'&&e.state==='chase'&&dist>3.5&&dist<17&&e.chargeCd<=0){e.chargeCd=8;e.chargeT=.85;}
    if(e.chargeT>0){sp*=1.65;e.chargeT-=dt;}
    if (e.slowT > 0) sp *= e.slowFactor; // 凛冬之息减速（动画速率随 sp 同步变慢）
    if(g.p183Enabled&&e.type!=='crab')sp*=waterSpeedP183(g.terrain,pos.x,pos.z);

    const stepX=(mx * sp + e.kbVel.x) * dt;
    const stepZ=(mz * sp + e.kbVel.z) * dt;
    if(g.p18Enabled){
      // All ground mobs (wolf/draugr) stay on land even when aggro, wandering
      // or being knocked back. Slide along shore if only one axis is valid.
      const prevX=pos.x,prevZ=pos.z;
      const next=g.p183Enabled
        ? shallowStepP183(g.terrain,prevX,prevZ,stepX,stepZ,
            e._p182Step||(e._p182Step={x:prevX,z:prevZ,blocked:false}))
        : groundedStepP182(g.terrain,prevX,prevZ,stepX,stepZ,
            e._p182Step||(e._p182Step={x:prevX,z:prevZ,blocked:false}));
      pos.x=next.x;pos.z=next.z;
      if(next.blocked){
        e.kbVel.x=0;e.kbVel.z=0;
        if(e.state==='chase'&&next.x===prevX&&next.z===prevZ &&
           Math.abs(stepX)+Math.abs(stepZ)>0.01){
          e.state='return';e.aggroT=0;sp=0;
        }
      }
    }else{
      pos.x += stepX;
      pos.z += stepZ;
    }
    const decay = Math.exp(-5 * dt);
    e.kbVel.x *= decay;
    e.kbVel.z *= decay;
    // P18.3: wading creatures stand on the lakebed, not on an invisible
    // water-surface clamp. All permitted steps are depth-checked already.
    const ground = g.p183Enabled ? g.terrain.getHeight(pos.x, pos.z) : this._groundAt(pos.x, pos.z);
    if (e.kbVel.y > 0 || pos.y > ground + 0.02) {
      pos.y += e.kbVel.y * dt;
      e.kbVel.y -= 26 * dt;
      if (pos.y <= ground) { pos.y = ground; e.kbVel.y = 0; }
    } else {
      pos.y = ground;
      e.kbVel.y = 0;
    }

    if (hasFace) {
      e.yaw = angLerp(e.yaw, Math.atan2(faceX, faceZ), 1 - Math.exp(-9 * dt));
      e.group.rotation.y = e.yaw;
    }

    e.animLock -= dt;
    if (e.animLock <= 0) {
      if (sp > 0.1) {
        if(e.p183bSpec){
          this._loco(e,e.p183bSpec.clips.walk,Math.max(.45,sp/Math.max(1,e.speed)));
        } else if (e.type === 'wolf') {
          if (e.state === 'chase') this._loco(e, 'Gallop', sp / 7);
          else this._loco(e, 'Walk');
        } else if(e.type==='spider'){
          this._loco(e,'Spider_Walk',Math.max(.65,sp/3.9));
        } else if (e.variant === 'mage') {
          this._loco(e, 'Walking_A', Math.max(0.8, sp / 4.2));
        } else {
          this._loco(e, 'Walking_D_Skeletons');
        }
      } else {
        this._loco(e,e.p183bSpec?e.p183bSpec.clips.idle:e.type==='spider'?'Spider_Idle':'Idle');
      }
    }
    e.rig.update(dt);
  }

  _dragonRoarTakeoff(e) {
    this.game.audio.play('dragon_roar');
    this.game.player.addShake(0.3);
    this._toTakeoff(e);
  }

  _toTakeoff(e) {
    e.state = 'takeoff';
    e.sub = '';
    e.subT = 0;
    const pos = e.group.position;
    e.circleAngle = Math.atan2(pos.z - e.perch.z, pos.x - e.perch.x);
    e.vel.set(Math.sin(e.yaw) * 7, 7, Math.cos(e.yaw) * 7);
  }

  _circleY(e) {
    return e.perch.y + 40 + Math.sin(this.game.time.elapsed * 0.25) * 5;
  }

  _steer(e, target, speed, dt, turn) {
    if (e.slowT > 0) speed *= e.slowFactor;
    const pos = e.group.position;
    _v3.copy(target).sub(pos);
    const d = _v3.length();
    if (d > 0.001) _v3.multiplyScalar(speed / d);
    e.vel.lerp(_v3, 1 - Math.exp(-turn * dt));
    pos.addScaledVector(e.vel, dt);
    const hs = Math.hypot(e.vel.x, e.vel.z);
    if (hs > 0.5) {
      const prev = e.yaw;
      e.yaw = angLerp(e.yaw, Math.atan2(e.vel.x, e.vel.z), 1 - Math.exp(-3 * dt));
      const rate = angDiff(e.yaw, prev) / Math.max(dt, 1e-4);
      e.bank += (clamp(-rate * 0.55, -0.65, 0.65) - e.bank) * (1 - Math.exp(-4 * dt));
      e.pitch += (clamp(Math.atan2(e.vel.y, hs) * 0.8, -0.7, 0.7) - e.pitch) * (1 - Math.exp(-4 * dt));
    }
  }

  _breathFlames(e, dt, p) {
    const g = this.game;
    const pos = e.group.position;
    const yawSin = Math.sin(e.yaw);
    const yawCos = Math.cos(e.yaw);
    _v2.set(pos.x + yawSin * 4.8, pos.y + 1.2, pos.z + yawCos * 4.8);
    _v3.set(p.x, p.y + 1, p.z).sub(_v2);
    const d = Math.min(_v3.length(), 25) || 1;
    _v3.normalize();
    e.flameAcc -= dt;
    while (e.flameAcc <= 0) {
      e.flameAcc += 0.08;
      const ft = 0.15 + Math.random() * 0.8;
      g.effects.spawnBurst(
        new THREE.Vector3(_v2.x + _v3.x * d * ft, _v2.y + _v3.y * d * ft, _v2.z + _v3.z * d * ft),
        '#ff7426', 5, 10, 0.32, 0.24
      );
    }
    e.flameDmgAcc -= dt;
    if (e.flameDmgAcc <= 0) {
      e.flameDmgAcc += 0.45;
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      const fd = Math.hypot(dx, dz) || 1;
      if (pos.distanceToSquared(p) < 16 * 16 && (dx / fd) * yawSin + (dz / fd) * yawCos > COS35) {
        g.stats.damage(7);
      }
    }
  }

  _updateDragon(e, dt) {
    const g = this.game;
    const p = g.player.pos;
    const pos = e.group.position;
    if (e.cdT > 0) e.cdT -= dt;
    if (e.hitReactT > 0) e.hitReactT -= dt;
    e.animLock -= dt;

    let loco = 'Fast_Flying';
    let locoTs = 1;

    if (e.state === 'perch') {
      loco = 'Flying_Idle';
      locoTs = 0.45;
      e.pitch *= Math.exp(-3 * dt);
      e.bank *= Math.exp(-3 * dt);
      if (pos.distanceToSquared(p) < 70 * 70 || g.quests.getState('q3') === 'active') {
        this._dragonRoarTakeoff(e);
      }
    } else if (e.state === 'takeoff') {
      e.subT += dt;
      const spd = Math.min(26, 10 + e.subT * 7);
      _v1.set(
        e.perch.x + Math.cos(e.circleAngle) * 80,
        this._circleY(e),
        e.perch.z + Math.sin(e.circleAngle) * 80
      );
      this._steer(e, _v1, spd, dt, 1.5);
      if (pos.distanceToSquared(_v1) < 14 * 14 || e.subT > 7) {
        e.state = 'circle';
        e.decideT = 7 + Math.random() * 5;
      }
    } else if (e.state === 'circle') {
      const ca = Math.atan2(pos.z - e.perch.z, pos.x - e.perch.x);
      _v1.set(
        e.perch.x + Math.cos(ca + 0.5) * 80,
        this._circleY(e),
        e.perch.z + Math.sin(ca + 0.5) * 80
      );
      this._steer(e, _v1, 26, dt, 1.5);
      e.decideT -= dt;
      if (e.decideT <= 0) {
        e.decideT = 7 + Math.random() * 5;
        if (Math.random() < 0.6) {
          e.state = 'breath';
          e.sub = 'dive';
          e.subT = 0;
        } else {
          e.state = 'land';
          e.sub = 'descend';
          e.subT = 0;
          _v2.copy(pos).sub(p);
          _v2.y = 0;
          const l = _v2.length() || 1;
          _v2.multiplyScalar(8 / l);
          e.landPos.set(p.x + _v2.x, 0, p.z + _v2.z);
          e.landPos.y = this._groundAt(e.landPos.x, e.landPos.z);
        }
      }
    } else if (e.state === 'breath') {
      if (e.sub === 'dive') {
        e.subT += dt;
        _v1.set(p.x, p.y + 7, p.z);
        this._steer(e, _v1, 30, dt, 1.8);
        if (pos.distanceToSquared(p) < 22 * 22 || e.subT > 7) {
          e.sub = 'flame';
          e.flameT = 2.2;
          e.flameAcc = 0;
          e.flameDmgAcc = 0;
        }
      } else if (e.sub === 'flame') {
        const hl = Math.hypot(e.vel.x, e.vel.z) || 1;
        _v1.set(p.x + (e.vel.x / hl) * 26, p.y + 11, p.z + (e.vel.z / hl) * 26);
        this._steer(e, _v1, 15, dt, 1.1);
        this._breathFlames(e, dt, p);
        e.flameT -= dt;
        if (e.flameT <= 0) {
          e.sub = 'climb';
          e.subT = 0;
        }
      } else {
        e.subT += dt;
        const ca = Math.atan2(pos.z - e.perch.z, pos.x - e.perch.x);
        _v1.set(
          e.perch.x + Math.cos(ca + 0.35) * 80,
          this._circleY(e),
          e.perch.z + Math.sin(ca + 0.35) * 80
        );
        this._steer(e, _v1, 24, dt, 1.3);
        if (pos.y > this._circleY(e) - 5 || e.subT > 8) e.state = 'circle';
      }
    } else if (e.state === 'land') {
      if (e.sub === 'descend') {
        loco = 'Flying_Idle';
        e.subT += dt;
        _v1.copy(e.landPos);
        _v1.y += 1.8;
        this._steer(e, _v1, 17, dt, 1.7);
        if (pos.distanceToSquared(_v1) < 9 || e.subT > 9) {
          e.sub = 'ground';
          e.subT = 8;
          e.vel.set(0, 0, 0);
        }
      } else {
        loco = 'Flying_Idle';
        locoTs = 0.45;
        e.subT -= dt;
        const gy = this._groundAt(pos.x, pos.z) + 1.6;
        pos.y += (gy - pos.y) * (1 - Math.exp(-6 * dt));
        e.pitch *= Math.exp(-4 * dt);
        e.bank *= Math.exp(-4 * dt);
        const dx = p.x - pos.x;
        const dz = p.z - pos.z;
        e.yaw = angLerp(e.yaw, Math.atan2(dx, dz), 1 - Math.exp(-3 * dt));
        if (e.hitPending >= 0) {
          e.hitPending -= dt;
          if (e.hitPending < 0) {
            e.hitPending = -1;
            if (pos.distanceTo(p) < 6) g.stats.damage(25);
          }
        }
        if (e.cdT <= 0 && pos.distanceTo(p) < 4.5) {
          e.cdT = 2;
          e.hitPending = 0.3;
          this._once(e, e.meleeAlt ? 'Punch' : 'Headbutt');
          e.meleeAlt = !e.meleeAlt;
        }
        if (e.subT <= 0) this._toTakeoff(e);
      }
    }

    e.group.rotation.y = e.yaw;
    e.pivot.rotation.x = -e.pitch;
    e.pivot.rotation.z = e.bank;
    this._loco(e, loco, locoTs);
    e.rig.update(dt);

    if (e.state === 'takeoff' || e.state === 'circle' || e.state === 'breath') {
      const minY = this._groundAt(pos.x, pos.z) + 6;
      if (pos.y < minY) pos.y = minY;
    }
  }

  update(dt) {
    const g = this.game;
    const p = g.player.pos;

    for (let i = 0; i < this.lootDrops.length; i++) {
      const d = this.lootDrops[i];
      d.t += dt;
      d.mesh.position.y = d.pos.y + Math.sin(d.t * 2.6) * 0.12;
      d.mesh.rotation.y += dt * 1.6;
    }

    this._updateBolts(dt,p);
    if(g.p183Enabled&&this.p183VenomTicks>0){
      this.p183VenomTime-=dt;
      if(this.p183VenomTime<=0){g.stats.damage(2);this.p183VenomTicks--;this.p183VenomTime+=1;}
    }

    for (let i = this.pendingRespawns.length - 1; i >= 0; i--) {
      const r = this.pendingRespawns[i];
      r.t -= dt;
      if (r.t <= 0) {
        this.pendingRespawns.splice(i, 1);
        if (r.kind === 'draugr') this._spawnDraugr(r.x, r.z, r.variant);
        if (r.kind === 'spider' && g.p183Enabled) this._spawnSpider(r.x,r.z);
        if(r.kind==='biome'&&g.p183bEnabled&&this.game.assets.has(r.sp.model)){
          if(biomeValidP183b(g.terrain,r.x,r.z,r.sp.biome,(x,z)=>!worldIsSafeP18(x,z)))
            this._spawnBiomeMobP183b(r.sp,r.x,r.z);
        }
      }
    }

    for (let pi = 0; pi < this.packs.length; pi++) {
      const pack = this.packs[pi];
      if (pack.respawnT < 0) {
        if (pack.members.length && pack.members.every((m) => !m.alive)) pack.respawnT = pack.respawnDelay || 90;
      } else {
        pack.respawnT -= dt;
        if (pack.respawnT <= 0) this._spawnPack(pi);
      }
    }

    let purge = false;
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (e.removed) { purge = true; continue; }
      if (e.flashT > 0) {
        e.flashT -= dt;
        if (e.flashT <= 0) this._restoreMats(e);
      }
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) {
          e.slowT = 0;
          e.slowDur = 0;
          e.slowFactor = 1;
          if (e.flashT <= 0) this._restoreMats(e);
        } else if (e.flashT <= 0) {
          // 冰霜余韵：发光随剩余减速时间淡出
          const k = 0.25 * Math.min(1, e.slowT / Math.max(e.slowDur, 0.001));
          for (let j = 0; j < e.mats.length; j++) {
            e.mats[j].m.emissive.setHex(0x4f7f9f);
            e.mats[j].m.emissiveIntensity = k;
          }
        }
      }
      if(e.training){
        e.hp=e.maxHp;
        e.kbVel.set(0,0,0);e.hitstunT=0;
        e.rig.play('Idle');e.rig.update(dt);
        continue;
      }
      if (!e.alive) {
        if (!e.group.parent) {
          this._removeEnemy(e);
          purge = true;
          continue;
        }
        if (e.state === 'dead') {
          this._updateDead(e, dt);
          if (!e.removed) e.rig.update(dt);
        }
        if (e.removed) purge = true;
        continue;
      }
      if (e.type === 'dragon') {
        this._updateDragon(e, dt);
        continue;
      }
      const dx = p.x - e.group.position.x;
      const dz = p.z - e.group.position.z;
      if (dx * dx + dz * dz > 260 * 260) continue;
      this._updateGround(e, dt, p);
    }
    if(g.p183dEnabled){
      // Proximity-based visibility: disabled-frustum skinned models must NOT
      // draw across a 1.4 km world. Keep full AI only within existing 260u.
      for(const e of this.list){
        if(!e.rig||e.type==='dragon'||e.training)continue;
        const dx=e.group.position.x-p.x,dz=e.group.position.z-p.z;
        const close=dx*dx+dz*dz < 285*285;
        if(e.rig.root.visible!==close)e.rig.root.visible=close;
      }
    }
    if (purge) this.list = this.list.filter((e) => !e.removed);
  }

  reset() {
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (!e.removed) this._removeEnemy(e);
    }
    this.list = [];
    for (let i = 0; i < this.lootDrops.length; i++) {
      this.game.scene.remove(this.lootDrops[i].mesh);
    }
    this.lootDrops = [];
    for (let i = 0; i < this.bolts.length; i++) {
      this.game.scene.remove(this.bolts[i].mesh);
    }
    this.bolts = [];
    this.pendingRespawns = [];
    this.p183VenomTicks=0;this.p183VenomTime=0;
    this.p183bSites=[];
    this.p183cSpawnAudit=[];
    this.packs = [];
    this.dragon = null;
    this.spawnAll();
  }
}
