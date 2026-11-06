import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AssetLib } from './core/assets.js';
import { installBiomeTourP183c } from './ui/biome-tour-p183c.js';
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
import { PerfFoundationP161 } from './ui/performance-p161.js';
import { PerfGovernorP163 } from './ui/performance-p163.js';
import { LivingWorldP18 } from './world/living-world-runtime-p18.js';
import { installP186Combat } from './combat/skill-bridge-p186.js';
import {SkillProgressP190} from './combat/skill-progression-p190.js';
import {GpuDiagnosticsP188} from './ui/gpu-diagnostics-p188.js';
import { P187ProfessionRuntime } from './world/professions-runtime-p187.js';
import { P187VillageGuide } from './ui/inicios-guide-p187.js';
import { consumeP186TransferFromUrl } from './ui/p186-profile.js';

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
    this.p13Enabled=!new URLSearchParams(location.search).has('hf_p13_off');
    this.p14Enabled=this.p13Enabled && !new URLSearchParams(location.search).has('hf_p14_off');
    this.p15Enabled=this.p14Enabled && !new URLSearchParams(location.search).has('hf_p15_off');
    this.p16Enabled=this.p15Enabled && !new URLSearchParams(location.search).has('hf_p16_off');
    // Explicit L27 -> P186 transfer occurs before the asynchronous HUD editor loads.
    this.p186Transfer=consumeP186TransferFromUrl();
    this.p18Build=true;
    this.p182Build=true; // P18.1 save remains read-only when testing a new P18.2 game
    this.p183Build=true; // new isolated save; prior P18.2 state read-only
    this.p187Build=true; // P187 compatibility (P185 world remains active)
    this.p188Build=true; // independent P188 save and RPG skill discovery
    this.p189Build=true; // L27 real aim + editor refinement
    this.p190Build=true; // six equal skills / guarded P190 save migration
    this.p183Enabled=!new URLSearchParams(location.search).has('hf_p183_off');
    this.p183bEnabled=this.p183Enabled&&!new URLSearchParams(location.search).has('hf_p183b_off');
    this.p183cEnabled=this.p183bEnabled&&!new URLSearchParams(location.search).has('hf_p183c_off');
    this.p183dEnabled=this.p183cEnabled&&!new URLSearchParams(location.search).has('hf_p183d_off');
    this.p183eEnabled=this.p183dEnabled&&!new URLSearchParams(location.search).has('hf_p183e_off');
    this.p18Enabled=!new URLSearchParams(location.search).has('hf_p18_off');
    this.p163Enabled=!new URLSearchParams(location.search).has('hf_p163_off');
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
    this.p187Professions = new P187ProfessionRuntime(this);
    this.p188Skills = new SkillProgressP190(this); // P188 property retained for quest/UI adapters
    this.audio = new AudioSys(this);
    this.saveSys = new SaveSys(this);
    this.hud = new HUD(this);
    this.gpuDiagnosticsP188=this.p188Build?new GpuDiagnosticsP188(this):null;
    this.menus = new Menus(this);
    this.livingWorld = this.p18Enabled ? new LivingWorldP18(this) : null;
    this.touch = new TouchControls(this);
    this.mobileAudit = new MobileAudit(this);
    this.p6Perf = new PerfProbeP6(this);
    this.performanceP2 = new PerformanceP2(this);
    this.perf161 = new PerfFoundationP161(this);
    this.perf163 = this.p163Enabled ? new PerfGovernorP163(this) : null;
    // P18 telemetry joins the existing COPIAR DATOS performance report
    // without adding per-frame CPU work.
    if(this.livingWorld && this.mobileAudit){
      const baseReport=this.mobileAudit.report.bind(this.mobileAudit);
      this.mobileAudit.report=()=>({...baseReport(),p18:this.livingWorld.report(),
        p188Gpu:this.gpuDiagnosticsP188?.report()||null});
    }
    this.worldMapP34 = null;
    if (!new URLSearchParams(location.search).has('hf_no_map')) {
      try { this.worldMapP34 = new WorldMapP34(this); }
      catch (err) { console.warn('[HIGHFLY map] No se pudo iniciar:', err); }
    }

    this.wireInput();
    // Isolated P186 mechanics only: P185 world, AI, joystick and P16 combat remain owners.
    this.p186Skills=new URLSearchParams(location.search).has('hf_p186_off')?null:installP186Combat(this);
    this.p187VillageGuide=new P187VillageGuide(this);
    window.addEventListener('resize', () => this.onResize());
  }

  setState(s) {
    this.state = s;
    if(s!=='playing')this.p186Skills?.cancelAim?.();
    this.menus.onState(s);
    this.hud.setVisible(s === 'playing');
    if (this.touch) this.touch.setState(s);
    if (this.mobileAudit) this.mobileAudit.setState(s);
    if (this.performanceP2) this.performanceP2.setState(s);
    if (this.worldMapP34) this.worldMapP34.setState(s);
    this.livingWorld?.setVisible(s === 'playing');
    if (this.p810Enabled && this.worldMapP34?.mini){
      this.worldMapP34.mini.style.visibility=s==='playing'?'visible':'hidden';
    }
    if (this.p810Enabled && this.touch?.premium?.p810?.perf){
      this.touch.premium.p810.perf.style.visibility=s==='playing'?'visible':'hidden';
    }
    // Enter the P186 preview with the recorded user's camera and real controls
    // in the same gesture, rather than waiting for world/AI frames to advance.
    if(s==='playing')this.p186Skills?.enterPlaying();
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
    if(this.p18Enabled)this.hud.notify('P18 · Hablá con Bjorn para explorar la frontera de lobos');
    this.audio.startAmbience();
  }

  continueGame() {
    this.enterImmersive();
    this.resetAll();
    this.saveSys.applyLoaded();
    this.p188Skills?.syncExistingQuests(); // migrate prior P185/P187 completed quest rewards
    this.setState('playing');
    this.hud.questBanner('¡Bienvenido de nuevo!');
    if(this.p18Enabled)this.hud.notify('P18 · Consultá a Bjorn y el diario de misiones');
    this.audio.startAmbience();
  }

  resetAll() {
    this.time.dayTime = 0.35;
    this.stats.reset();
    this.inventory.reset();
    this.quests.reset();
    this.structures.reset();
    this.enemies.reset();
    this.livingWorld?.reset();
    this.player.reset();
    this.combat.reset();
    this.p186Skills?.reset(); // no projectiles, queued damage or cooldowns leak across save/new game
    this.p187Professions?.reset(); // load restores from the versioned P187 save when continuing
    this.p188Skills?.reset(); // new characters have no lab skills for free
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
      if (this.state === 'training') {
        this.menus.training?.close();
        return;
      }
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
if(game.p183cEnabled)installBiomeTourP183c(game);
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
  const perf161 = game.perf161.enabled ? game.perf161 : null;
  if (perf161) perf161.beginFrame(time);
  const dt = Math.min(clock.getDelta(), 0.05);
  game.time.elapsed += dt;

  game.routeKeys();

  game.sky.update(dt);
  if (perf161) perf161.startSection('water');
  game.water.update(dt);
  if (perf161) perf161.endSection('water');
  game.ambience.update(dt);
  if (perf161) perf161.startSection('terrain');
  game.terrain.update(dt);
  if (perf161) perf161.endSection('terrain');
  game.structures.update(dt);
  game.interiors.update(dt);
  // P16.1 only: prewarm incremental grass while the menu is open so there is
  // no bare field upon entering the world. P16 production remains unchanged.
  if (game.scatter?.p161GrassEnabled && game.state !== 'playing') game.scatter.update(dt);
  game.p6Perf.mark('world');

  if (game.state === 'playing') {
    if (perf161) perf161.startSection('player');
    game.player.update(dt);
    if (perf161) perf161.endSection('player');
    game.p6Perf.mark('player');
    if(game.targeting)game.targeting.update(dt);
    if (perf161) perf161.startSection('combat');
    game.combat.update(dt);
    if (perf161) perf161.endSection('combat');
    game.p6Perf.mark('combat');
    if (perf161) perf161.startSection('effects');
    game.effects.update(dt);
    if (perf161) perf161.endSection('effects');
    if (perf161) perf161.startSection('enemies');
    game.enemies.update(dt);
    // Run after native enemy AI: 4 confirmed aerial shots use its existing landing FSM.
    game.p186Skills?.update(dt);
    game.p187VillageGuide?.update(dt);
    if (perf161) perf161.endSection('enemies');
    if (perf161) perf161.startSection('npcs');
    game.npcs.update(dt);
    game.livingWorld?.update(dt);
    game.p188Skills?.tick(dt); // also detect Bjorn skill quests without reloading
    if (perf161) perf161.endSection('npcs');
    game.stats.update(dt);
    if (perf161) perf161.startSection('scatter');
    game.scatter.update(dt);
    if (perf161) perf161.endSection('scatter');
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

  if (perf161) perf161.startSection('render');
  if(game.p812Enabled && (game.state==='inventory'||game.state==='quests')){
    // Keep the scene frozen while inventory/quest overlays cover it; preview 3D
    // renders separately and can update at a low frame rate.
  }else if(game.p812Enabled && (game.performanceP2?.preset==='FLUID' ||
           (game.p163Enabled && game.performanceP2?.preset==='BALANCED'))){
    // FLUID mode does not require a full-screen postprocessing composer pass.
    // Renderer already owns SRGB output and ACES tone mapping.
    game.renderer.render(game.scene,game.camera);
  }else game.composer.render();
  if (perf161) perf161.endSection('render');
  if(game.touch?.premium?.p7Inventory)game.touch.premium.p7Inventory.update(dt);
  if(game.touch?.premium?.p810)game.touch.premium.p810.update(dt);
  game.p6Perf.mark('render');
  game.p6Perf.end();
  if (perf161) perf161.endFrame();
  if(game.perf163)game.perf163.update(time);
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
