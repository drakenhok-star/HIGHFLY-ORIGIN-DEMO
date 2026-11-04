import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AssetLib } from './core/assets.js';
import { Terrain } from './world/terrain.js';
import { Sky } from './world/sky.js';
import { WaterSurface } from './world/water.js';
import { Scatter } from './world/scatter.js';
import { Structures } from './world/structures.js';
import { Interiors } from './world/interiors.js';
import { Ambience } from './world/ambience.js';
import { Stats } from './systems/stats.js';
import { Inventory } from './systems/inventory.js';
import { Quests } from './systems/quests.js';
import { Player } from './player/player.js';
import { Effects } from './combat/effects.js';
import { Combat } from './combat/combat.js';
import { Enemies } from './entities/enemies.js';
import { NPCs } from './entities/npc.js';
import { AudioSys } from './audio/audio.js';
import { SaveSys } from './systems/save.js';
import { HUD } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { MobileAudit } from './ui/mobile-audit.js'; // HIGHFLY_AUDIT_P1
import { PerformanceP2 } from './ui/performance-p2.js'; // HIGHFLY_P2_20261104
import { WorldMapP34 } from './ui/world-map-p34.js'; // HIGHFLY_WORLD_MAP_P34
import { TouchControls } from './ui/touch-controls.js'; // HIGHFLY_TOUCH_PATCH_V1
import { TargetingP6 } from './combat/targeting-p6.js';
import { PerfProbeP6 } from './ui/perf-probe-p6.js';

class Game {
  constructor(assets) {
    this.assets = assets;
    this.worldSeed = 1337;
    this.state = 'menu';
    this.time = { elapsed: 0, dayTime: 0.35, dayLength: 600 };
    this.p6Enabled=!new URLSearchParams(location.search).has('hf_p6_off');
    this.p7Enabled=!new URLSearchParams(location.search).has('hf_p7_off');
    this.p810Enabled=!new URLSearchParams(location.search).has('hf_p810_off');
    this.p812Enabled=!new URLSearchParams(location.search).has('hf_p812_off');
    this.p812Eco=false;
    if(this.p812Enabled){
      try{this.p812Eco=localStorage.getItem('hf_p812_eco')==='1';}catch(err){}
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // P1 quality HIGH baseline: restore original render scale on Android.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2500);
    this.camera.position.set(14, 26, 118);
    this.camera.lookAt(0, 8, 40);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.5, 0.95));
    this.composer.addPass(new OutputPass());

    this.input = {
      keys: new Set(),
      justPressed: new Set(),
      mouse: { dx: 0, dy: 0 },
      wheel: 0,
      leftClick: false,
      rightClick: false,
      pointerLocked: false
    };

    this.terrain = new Terrain(this);
    this.sky = new Sky(this);
    this.water = new WaterSurface(this);
    this.scatter = new Scatter(this);
    this.structures = new Structures(this);
    this.interiors = new Interiors(this);
    this.ambience = new Ambience(this);
    this.stats = new Stats(this);
    this.inventory = new Inventory(this);
    this.quests = new Quests(this);
    this.player = new Player(this);
    this.effects = new Effects(this);
    this.combat = new Combat(this);
    this.enemies = new Enemies(this);
    this.targeting=this.p6Enabled?new TargetingP6(this):null;
    this.npcs = new NPCs(this);
    this.audio = new AudioSys(this);
    this.saveSys = new SaveSys(this);
    this.hud = new HUD(this);
    this.menus = new Menus(this);
    this.touch = new TouchControls(this);
    this.mobileAudit = new MobileAudit(this);
    this.p6Perf = new PerfProbeP6(this);
    this.performanceP2 = new PerformanceP2(this);
    this.worldMapP34 = null;
    if (!new URLSearchParams(location.search).has('hf_no_map')) {
      try { this.worldMapP34 = new WorldMapP34(this); }
      catch (err) { console.warn('[HIGHFLY map] No se pudo iniciar:', err); }
    }

    this.wireInput();
    window.addEventListener('resize', () => this.onResize());
  }

  setState(s) {
    this.state = s;
    this.menus.onState(s);
    this.hud.setVisible(s === 'playing');
    if (this.touch) this.touch.setState(s);
    if (this.mobileAudit) this.mobileAudit.setState(s);
    if (this.performanceP2) this.performanceP2.setState(s);
    if (this.worldMapP34) this.worldMapP34.setState(s);
    if (this.p810Enabled && this.worldMapP34?.mini){
      this.worldMapP34.mini.style.visibility=s==='playing'?'visible':'hidden';
    }
    if (this.p810Enabled && this.touch?.premium?.p810?.perf){
      this.touch.premium.p810.perf.style.visibility=s==='playing'?'visible':'hidden';
    }
    if (s === 'playing') this.requestPointerLock();
    else this.releasePointerLock();
  }

  requestPointerLock() {
    if (this.touch && this.touch.enabled) return;
    const el = this.renderer.domElement;
    if (this.input.pointerLocked || !el.requestPointerLock) return;
    try {
      const p = el.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (err) {
      // 无指针锁环境（如 headless）下静默忽略
    }
  }

  releasePointerLock() {
    try {
      if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    } catch (err) {
      // 同上
    }
  }

  enterImmersive(){
    if(!this.p810Enabled || !this.touch?.enabled)return;
    // Must happen synchronously INSIDE the user's Enter/Continue gesture.
    const root=document.documentElement;
    try {
      const result=root.requestFullscreen?.({navigationUI:'hide'});
      if(result?.then)result.then(()=>screen.orientation?.lock?.('landscape')?.catch?.(()=>{})).catch(()=>{});
    }catch(err){console.info('[HIGHFLY] Fullscreen requires explicit browser permission',err);}
  }

  newGame() {
    this.enterImmersive();
    this.resetAll();
    this.setState('playing');
    this.hud.questBanner('¡Bienvenido a HIGHFLY!');
    this.audio.startAmbience();
  }

  continueGame() {
    this.enterImmersive();
    this.resetAll();
    this.saveSys.applyLoaded();
    this.setState('playing');
    this.hud.questBanner('¡Bienvenido de nuevo!');
    this.audio.startAmbience();
  }

  resetAll() {
    this.time.dayTime = 0.35;
    this.stats.reset();
    this.inventory.reset();
    this.quests.reset();
    this.structures.reset();
    this.enemies.reset();
    this.player.reset();
    this.combat.reset();
    if(this.targeting)this.targeting.cancel();
    // 室内重开新游戏/读档：立即恢复户外状态，不等 interiors.update 的远距自愈
    this.interiors.forceOutside();
    // Effects 无 reset()：用大 dt 走 update 的到期路径，移除并 dispose 跨局残留粒子
    this.effects.update(1000);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  wireInput() {
    const input = this.input;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      input.keys.add(e.code);
      input.justPressed.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      input.keys.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      if (!input.pointerLocked) return;
      input.mouse.dx += e.movementX;
      input.mouse.dy += e.movementY;
    });

    window.addEventListener('mousedown', (e) => {
      if (this.state !== 'playing' || (this.p810Enabled && this.touch?.enabled)) return;
      // Synthetic mouse clicks from touch must never activate global ATK.
      if (e.button === 0) input.leftClick = true;
      else if (e.button === 2) input.rightClick = true;
    });

    window.addEventListener('wheel', (e) => {
      input.wheel += e.deltaY;
    }, { passive: true });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      input.pointerLocked = document.pointerLockElement === this.renderer.domElement;
      if (!input.pointerLocked && this.state === 'playing') {
        // 浏览器按 Esc 退出指针锁时不会派发 keydown，这里兜底进入暂停
        input.justPressed.delete('Escape');
        this.setState('paused');
      }
    });

    this.renderer.domElement.addEventListener('click', () => {
      if (this.state === 'playing' && !input.pointerLocked) this.requestPointerLock();
    });
  }

  routeKeys() {
    const jp = this.input.justPressed;
    if (jp.has('Escape')) {
      if (this.state === 'playing') {
        this.setState('paused');
      } else if (this.state === 'paused' || this.state === 'inventory' || this.state === 'quests') {
        this.setState('playing');
      } else if (this.state === 'dialogue') {
        this.menus.closeDialogue();
        if (this.state === 'dialogue') this.setState('playing');
      }
    }
    if (jp.has('Tab')) {
      if (this.state === 'playing') {
        if(this.p810Enabled&&this.touch?.premium){this.touch.premium.show('equipment');return;}
        this.menus.refreshInventory();
        this.setState('inventory');
      } else if (this.state === 'inventory') {
        this.setState('playing');
      }
    }
    if (jp.has('KeyJ')) {
      if (this.state === 'playing') {
        if(this.p810Enabled&&this.touch?.premium){this.touch.premium.show('quests');return;}
        this.menus.refreshQuests();
        this.setState('quests');
      } else if (this.state === 'quests') {
        this.setState('playing');
      }
    }
  }
}

function buildAssetSplash() {
  const div = document.createElement('div');
  div.id = 'asset-splash';
  div.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:#e8e2d0;font-family:Georgia,"Songti SC","SimSun",serif;';
  const title = document.createElement('div');
  title.style.cssText = 'font-size:64px;letter-spacing:0.4em;text-indent:0.4em;';
  title.textContent = 'HIGHFLY';
  const line = document.createElement('div');
  line.style.cssText = 'font-size:16px;opacity:0.75;letter-spacing:0.1em;';
  line.textContent = 'Preparando el mundo…(0/15)';
  div.appendChild(title);
  div.appendChild(line);
  document.body.appendChild(div);
  return { div, line };
}

const assetSplash = buildAssetSplash();
const assets = new AssetLib();
try {
  await assets.loadAll((done, total) => {
    assetSplash.line.textContent = `Preparando el mundo…(${done}/${total})`;
  });
} catch (err) {
  console.error('[boot] 资源加载失败:', err);
  const msg = err && err.message ? err.message : String(err);
  assetSplash.line.textContent = `Error de carga de recursos: ${msg} (recargá la página)`;
  assetSplash.line.style.cssText += 'color:#e07a6a;opacity:1;max-width:80%;text-align:center;';
  throw err;
}

const game = new Game(assets);
game.setState('menu');
game.menus.showMain();
window.game = game;

const clock = new THREE.Clock();
let splashHidden = false;
let lastEcoFrame=0;

function loop(time) {
  requestAnimationFrame(loop);
  if(game.p812Enabled && game.p812Eco && game.touch?.enabled){
    // Skip world and GPU render together, never run physics with a fake tiny dt.
    // 30 fps saves energy while the existing 30-40 fps phone cannot sustain 60.
    if(time-lastEcoFrame<1000/30-0.8)return;
    lastEcoFrame=time;
  }
  game.mobileAudit.begin();
  game.p6Perf.begin();
  const dt = Math.min(clock.getDelta(), 0.05);
  game.time.elapsed += dt;

  game.routeKeys();

  game.sky.update(dt);
  game.water.update(dt);
  game.ambience.update(dt);
  game.terrain.update(dt);
  game.structures.update(dt);
  game.interiors.update(dt);
  game.p6Perf.mark('world');

  if (game.state === 'playing') {
    game.player.update(dt);
    game.p6Perf.mark('player');
    if(game.targeting)game.targeting.update(dt);
    game.combat.update(dt);
    game.p6Perf.mark('combat');
    game.effects.update(dt);
    game.enemies.update(dt);
    game.npcs.update(dt);
    game.stats.update(dt);
    game.scatter.update(dt);
    game.hud.update(dt);
    game.audio.update(dt);
    game.saveSys.update(dt);
    game.p6Perf.mark('entities');
  }

  if (game.state === 'menu') {
    const angle = game.time.elapsed * 0.03;
    game.camera.position.set(
      Math.sin(angle) * 85,
      30 + Math.sin(game.time.elapsed * 0.1) * 4,
      40 + Math.cos(angle) * 85
    );
    game.camera.lookAt(0, 8, 40);
  }

  if(game.p812Enabled && game.performanceP2?.preset==='FLUID'){
    // FLUID mode does not require a full-screen postprocessing composer pass.
    // Renderer already owns SRGB output and ACES tone mapping.
    game.renderer.render(game.scene,game.camera);
  }else game.composer.render();
  if(game.touch?.premium?.p7Inventory)game.touch.premium.p7Inventory.update(dt);
  if(game.touch?.premium?.p810)game.touch.premium.p810.update(dt);
  game.p6Perf.mark('render');
  game.p6Perf.end();
  game.mobileAudit.end();

  if (!splashHidden) {
    splashHidden = true;
    if (game.menus.hideSplash) game.menus.hideSplash();
    assetSplash.div.remove();
  }

  const input = game.input;
  input.justPressed.clear();
  input.leftClick = false;
  input.rightClick = false;
  input.mouse.dx = 0;
  input.mouse.dy = 0;
  input.wheel = 0;
}

requestAnimationFrame(loop);
