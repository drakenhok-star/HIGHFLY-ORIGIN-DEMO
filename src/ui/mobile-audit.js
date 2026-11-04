/**
 * HIGHFLY P1: quality-high Android/desktop benchmark.
 * No gameplay changes, no external dependencies. MIT project extension.
 *
 * Counts all scene render passes by resetting renderer.info once per frame.
 * FPS is measured from requestAnimationFrame timing (not game dt, which is capped).
 */
export class MobileAudit {
  constructor(game) {
    this.game = game;
    this.quality = 'ALTA / ORIGINAL';
    this.samples = [];
    this.frameClock = null;
    this.windowStart = 0;
    this.windowFrames = 0;
    this.fps = null;
    this.p95 = null;
    this.frameMs = null;
    this.draws = 0;
    this.triangles = 0;
    this.renderCpu = 0;
    this.elapsedStart = 0;
    this.isPlaying = false;
    this.expanded = false;
    this.messageT = 0;
    this.renderer = game.renderer;

    // Preserve original high visual quality: pixel ratio up to 2 on all devices,
    // original bloom, planar reflections, shadow resolution and terrain density.
    // The touch P0 installer set 1.25 on mobile; the P1 installer restores 2.
    this.renderer.info.autoReset = false;
    this.mount();

    // Optional debug access without logging every frame.
    window.highflyAuditReport = () => this.report();
  }

  mount() {
    const css = document.createElement('style');
    css.id = 'hf-audit-style';
    css.textContent = [
      '#hf-audit{position:fixed;left:max(10px,env(safe-area-inset-left));top:max(11px,env(safe-area-inset-top));z-index:41;pointer-events:auto;color:#e8f8ff;font-family:system-ui,Arial,sans-serif;font-size:12px;user-select:none;-webkit-user-select:none;}',
      '#hf-audit *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}',
      '#hf-fps-pill{display:flex;gap:7px;align-items:center;min-height:34px;min-width:108px;padding:5px 10px;border:1px solid #96d8fc88;border-radius:9px;color:#f2fbff;background:#091c32d9;font-weight:750;font-size:14px;box-shadow:0 2px 12px #0006;touch-action:manipulation;}',
      '#hf-fps-pill small{font-size:10px;color:#c5ddeb;font-weight:500;}',
      '#hf-audit-details{display:none;width:230px;max-width:calc(100vw - 20px);margin-top:5px;padding:10px;background:#06182be8;border:1px solid #7abbdc9a;border-radius:8px;line-height:1.65;}',
      '#hf-audit-details strong{color:#94e6ff;}',
      '#hf-audit-copy{border:1px solid #88cfff;color:#fff;background:#174777;border-radius:6px;padding:6px 10px;margin-top:5px;font-size:11px;touch-action:manipulation;}',
      '#hf-fullscreen{position:fixed;right:max(87px,env(safe-area-inset-right) + 87px);top:max(11px,env(safe-area-inset-top));z-index:45;background:#112941e6;color:#edfbff;border:1px solid #8ed7fc;border-radius:9px;min-height:36px;min-width:65px;padding:5px 8px;font:750 11px system-ui,sans-serif;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
      '#hf-audit-toast{position:fixed;top:58px;right:12px;z-index:45;max-width:min(280px,65vw);padding:8px 10px;background:#152334ee;border:1px solid #eac98b;border-radius:8px;color:white;font:12px system-ui;display:none;pointer-events:none;}',
      '@media(pointer:fine){#hf-fullscreen{right:12px;}}',
      '@media(max-width:600px){#hf-fps-pill{font-size:13px;min-height:32px;}#hf-audit-details{width:204px;}}'
    ].join('\n');
    document.head.appendChild(css);

    const shell = document.createElement('div');
    shell.id = 'hf-audit';
    shell.style.display = 'none';
    shell.innerHTML = '<button id="hf-fps-pill" type="button" aria-label="Mostrar detalles de rendimiento">'
      + '<span id="hf-fps-text">FPS --</span><small id="hf-fps-p95">P95 -- ms</small></button>'
      + '<div id="hf-audit-details">'
      + '<div><strong>HIGHFLY · Calidad ALTA</strong></div>'
      + '<div id="hf-audit-metrics">Preparando medición...</div>'
      + '<div style="opacity:.7;font-size:10px;">FPS reales del navegador; P95 = peor 5% de fotogramas. Render ms ≠ tiempo GPU.</div>'
      + '<button type="button" id="hf-audit-copy">COPIAR DATOS</button></div>';
    document.body.appendChild(shell);
    this.shell = shell;
    this.fpsText = shell.querySelector('#hf-fps-text');
    this.fpsP95 = shell.querySelector('#hf-fps-p95');
    this.metrics = shell.querySelector('#hf-audit-metrics');
    this.details = shell.querySelector('#hf-audit-details');
    shell.querySelector('#hf-fps-pill').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.expanded = !this.expanded;
      this.details.style.display = this.expanded ? 'block' : 'none';
      this.refresh();
    });
    shell.querySelector('#hf-audit-copy').addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const value = JSON.stringify(this.report(), null, 2);
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw Error('clipboard not available');
        await navigator.clipboard.writeText(value);
        this.toast('Datos copiados. Pegalos en el chat.');
      } catch {
        this.toast('Copiado no disponible. Hacé captura del panel.');
      }
    });

    const button = document.createElement('button');
    button.id = 'hf-fullscreen';
    button.type = 'button';
    button.textContent = '⛶ FULL';
    button.setAttribute('aria-label','Activar pantalla completa');
    button.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.toggleFullscreen();
    });
    document.body.appendChild(button);
    this.fullButton = button;

    const toast = document.createElement('div');
    toast.id = 'hf-audit-toast';
    document.body.appendChild(toast);
    this.toastEl = toast;

    document.addEventListener('fullscreenchange', () => this.syncFullscreen());
    document.addEventListener('webkitfullscreenchange', () => this.syncFullscreen());
    this.syncFullscreen();
  }

  syncFullscreen() {
    if (!this.fullButton) return;
    const on = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    this.fullButton.textContent = on ? '⛶ SALIR' : '⛶ FULL';
    this.fullButton.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Activar pantalla completa');
  }

  async toggleFullscreen() {
    const target = document.documentElement;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        return;
      }
      if (target.requestFullscreen) {
        await target.requestFullscreen({ navigationUI: 'hide' });
      } else if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      } else {
        this.toast('Fullscreen no disponible. Abrí el juego directamente en Chrome.');
        return;
      }
      // Orientation lock is optional and browser-dependent.
      if (screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock('landscape'); } catch { /* browser denied lock */ }
      }
    } catch (err) {
      this.toast('Chrome bloqueó pantalla completa: ' + (err && err.name ? err.name : 'permiso requerido'));
    }
    this.syncFullscreen();
  }

  toast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.style.display = 'block';
    this.messageT = performance.now() + 3000;
  }

  setState(state) {
    this.isPlaying = state === 'playing';
    this.shell.style.display = this.isPlaying ? 'block' : 'none';
    this.fullButton.style.display = this.isPlaying ? 'block' : 'none';
    if (!this.isPlaying) {
      this.frameClock = null;
      this.samples.length = 0;
      this.windowStart = 0;
      this.windowFrames = 0;
    }
  }

  begin() {
    const now = performance.now();
    this.elapsedStart = now;
    // Includes water depth/reflection + main composer passes.
    this.renderer.info.reset();
    if (!this.isPlaying) return;

    if (this.frameClock !== null) {
      const delta = now - this.frameClock;
      if (delta > 0 && delta < 1000) {
        this.samples.push(delta);
        if (this.samples.length > 120) this.samples.shift();
      }
    }
    this.frameClock = now;
    if (!this.windowStart) this.windowStart = now;
    this.windowFrames++;
  }

  end() {
    const now = performance.now();
    if (this.toastEl && this.messageT && now > this.messageT) {
      this.messageT = 0;
      this.toastEl.style.display = 'none';
    }
    if (!this.isPlaying) return;
    this.renderCpu = now - this.elapsedStart;
    const renderInfo = this.renderer.info.render;
    this.draws = renderInfo.calls;
    this.triangles = renderInfo.triangles;
    const elapsed = now - this.windowStart;
    if (elapsed < 1000) return;
    this.fps = Math.round(this.windowFrames * 1000 / elapsed);
    this.frameMs = this.samples.length ?
      this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length : 0;
    const sorted = this.samples.slice().sort((a,b) => a - b);
    this.p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)] : 0;
    this.windowStart = now;
    this.windowFrames = 0;
    this.refresh();
  }

  refresh() {
    if (this.fps === null) return;
    this.fpsText.textContent = 'FPS ' + this.fps;
    this.fpsP95.textContent = 'P95 ' + this.p95.toFixed(0) + ' ms';
    this.fpsText.style.color = this.fps >= 45 ? '#a4f8bc' : this.fps >= 28 ? '#ffdf9a' : '#ff9999';
    if (!this.expanded) return;
    const dims = { x: this.renderer.domElement.width, y: this.renderer.domElement.height };
    this.metrics.innerHTML = [
      'Media de fotograma: <strong>' + this.frameMs.toFixed(1) + ' ms</strong>',
      'Bucle CPU aprox.: <strong>' + this.renderCpu.toFixed(1) + ' ms</strong>',
      'Draw calls (todas las pasadas): <strong>' + this.draws + '</strong>',
      'Triángulos procesados: <strong>' + (this.triangles / 1000).toFixed(0) + ' mil</strong>',
      'Resolución interna: <strong>' + dims.x + '×' + dims.y + '</strong>',
      'Escala píxel: <strong>' + this.renderer.getPixelRatio().toFixed(2) + '×</strong>'
    ].join('<br>');
  }

  report() {
    return {
      name: 'HIGHFLY-WORLD-FIT | Tianjie5 Android P1',
      preset: this.quality,
      fps: this.fps,
      avgFrameMs: this.frameMs,
      p95FrameMs: this.p95,
      cpuLoopMs: this.renderCpu,
      callsAllPasses: this.draws,
      trianglesAllPasses: this.triangles,
      dpr: this.renderer.getPixelRatio(),
      viewport: [innerWidth, innerHeight],
      userAgent: navigator.userAgent,
      fullscreen: Boolean(document.fullscreenElement || document.webkitFullscreenElement),
      recordedAt: new Date().toISOString()
    };
  }
}
