/**
 * HIGHFLY P2 - reversible diagnostic rendering presets for Tianjie5.
 * No changes to terrain, collision, or game content. Original: zexadev/tianjie5 MIT.
 * P2 HIGH (baseline): all original visuals. WATER: disable planar/depth passes
 * with a lightweight opaque-ish water material. FLUID: mobile DPR=1, no bloom/shadow.
 */
import * as THREE from 'three';

const PRESETS = [
  { id: 'HIGH', label: 'ALTA', desc: 'Calidad original: agua y efectos completos' },
  { id: 'WATER', label: 'AGUA', desc: 'Agua liviana, resto en calidad alta' },
  { id: 'FLUID', label: 'FLUIDO', desc: 'Agua liviana, menos píxeles y efectos pesados' },
  { id: 'BALANCED', label: 'EQUILIBRADO+', desc: 'Agua liviana, nitidez 1.15x, sin reflejos completos ni sombras costosas' },
];

export class PerformanceP2 {
  constructor(game) {
    this.game = game;
    this.preset = 'FLUID';
    this.visible = false;
    this.defaultDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.originalWaterUpdate = game.water.update.bind(game.water);
    this.originalWaterMaterial = game.water.mesh.material;
    this.waterLite = new THREE.MeshPhongMaterial({
      color: 0x2f798c,
      emissive: 0x0b2936,
      emissiveIntensity: 0.12,
      specular: 0x8bb4c0,
      shininess: 42,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });

    // P2 avoids rendering depth+reflection to offscreen buffers when water is lite.
    // Keep old update/mat intact so switching to HIGH restores original wave GLSL.
    const self = this;
    game.water.update = function(dt) {
      if (self.preset === 'HIGH') {
        self.originalWaterUpdate(dt);
        return;
      }
      const p = game.player && game.player.pos ? game.player.pos : game.camera.position;
      const step = 1400 / 224; // original GRID_STEP, water plane follows player in grid units
      this.mesh.position.x = Math.round(p.x / step) * step;
      this.mesh.position.z = Math.round(p.z / step) * step;
      // Preserve water splash ring animations from the upstream implementation.
      for (const ring of this.rings) {
        if (!ring.active) continue;
        ring.t += dt;
        const k = ring.t / 0.7; // original RING_LIFE
        if (k >= 1) {
          ring.active = false;
          ring.mesh.visible = false;
          ring.mat.opacity = 0;
          continue;
        }
        const ease = 1 - (1 - k) * (1 - k);
        ring.mesh.scale.setScalar(1 + (ring.targetScale - 1) * ease);
        ring.mat.opacity = 0.8 * (1 - k);
      }
    };

    this.bloomPass = game.composer.passes.find(p => p.constructor && p.constructor.name === 'UnrealBloomPass') ||
                     game.composer.passes[1];
    this.originalBloom = this.bloomPass ? this.bloomPass.enabled !== false : false;
    this.originalShadow = game.renderer.shadowMap.enabled;
    this.originalMaxAnisotropy = null;

    this.mount();
    this.apply('FLUID'); // Important: urgent phone test starts optimized; tap to compare
    if (game.mobileAudit && typeof game.mobileAudit.report === 'function') {
      const base = game.mobileAudit.report.bind(game.mobileAudit);
      game.mobileAudit.report = () => ({ ...base(), p2Mode: this.preset, p2Preset: PRESETS.find(p => p.id === this.preset).label });
    }
  }

  mount() {
    const css = document.createElement('style');
    css.textContent = [
      '#hf-p2-switch{position:fixed;top:max(56px,env(safe-area-inset-top) + 52px);left:max(10px,env(safe-area-inset-left));z-index:45;pointer-events:auto;min-width:110px;min-height:32px;padding:5px 8px;border:1px solid #77c9f4;border-radius:8px;background:#0d2947e3;color:#e9faff;font:750 11px system-ui,sans-serif;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
      '#hf-p2-switch:active{background:#19709b;}',
      '#hf-p2-note{position:fixed;top:max(92px,env(safe-area-inset-top) + 88px);left:max(10px,env(safe-area-inset-left));z-index:42;max-width:220px;color:#d3e6f3;font:10px system-ui,sans-serif;text-shadow:0 1px 2px #000;pointer-events:none;}',
    ].join('\n');
    document.head.appendChild(css);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'hf-p2-switch';
    btn.setAttribute('aria-label','Cambiar perfil de rendimiento');
    document.body.appendChild(btn);
    this.btn = btn;

    const note = document.createElement('div');
    note.id = 'hf-p2-note';
    document.body.appendChild(note);
    this.note = note;
    btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const idx = PRESETS.findIndex(p=>p.id===this.preset);
      this.apply(PRESETS[(idx+1)%PRESETS.length].id);
    });
    this.setState(this.game.state);
  }

  apply(id) {
    const selected = PRESETS.find(p=>p.id===id);
    if (!selected) return;
    this.preset = id;
    const game = this.game;
    const isHigh = id==='HIGH';
    game.water.mesh.material = isHigh ? this.originalWaterMaterial : this.waterLite;
    const isFluid = id==='FLUID';
    const isBalanced = id==='BALANCED';
    const isLight = isFluid || isBalanced;
    if (this.bloomPass) this.bloomPass.enabled = isLight ? false : this.originalBloom;
    game.renderer.shadowMap.enabled = isLight ? false : this.originalShadow;
    // Pixel resolution is the key GPU fill-rate diagnostic. Full original quality
    // is recoverable at any moment by pressing the preset button.
    const targetDpr = isFluid ? Math.min(window.devicePixelRatio || 1, game.p812Enabled?(game.p812Eco?.72:.88):1.0)
      : isBalanced ? Math.min(window.devicePixelRatio || 1, 1.15) : this.defaultDpr;
    game.renderer.setPixelRatio(targetDpr);
    game.onResize();

    const audit = game.mobileAudit;
    if (audit) {
      audit.quality = selected.label;
      audit.samples.length = 0;
      audit.frameClock = null;
      audit.windowStart = 0;
      audit.windowFrames = 0;
      audit.fps = null;
      audit.p95 = null;
      audit.fpsText.textContent = 'FPS --';
      audit.fpsP95.textContent = 'P95 --';
    }
    this.btn.textContent = 'GPU: ' + selected.label;
    this.note.textContent = selected.desc + ' · Tocá para comparar';
  }

  setState(state) {
    this.visible = state==='playing';
    this.btn.style.display = this.visible?'block':'none';
    this.note.style.display = this.visible?'block':'none';
  }
}
