/**
 * HIGHFLY P16.1: opt-in, read-only performance telemetry.
 *
 * Enable with ?hf_p161_profile=1. No gameplay behavior, graphics preset,
 * rendering frequency or simulation step is changed.
 *
 * Frame intervals are requestAnimationFrame intervals, NOT GPU timings.
 * CPU spans include JavaScript work and render submission, NOT GPU execution.
 */
export const P161_METRICS = Object.freeze([
  'frameInterval', 'cpuFrame', 'water', 'terrain', 'player',
  'combat', 'effects', 'enemies', 'npcs', 'scatter', 'render'
]);
const CAPACITY = 1800;

export function percentileMs(values, percentile) {
  if (!values?.length || !Number.isFinite(percentile)) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * percentile) - 1));
  return sorted[rank];
}

export function summarizeMs(values) {
  if (!values?.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const round = n => Math.round(n * 100) / 100;
  return {
    samples: values.length,
    mean: round(mean),
    p50: round(percentileMs(values, 0.50)),
    p95: round(percentileMs(values, 0.95)),
    p99: round(percentileMs(values, 0.99)),
    max: round(Math.max(...values))
  };
}

export class PerfFoundationP161 {
  constructor(game, options = {}) {
    this.game = game;
    this.enabled = options.enabled ?? (
      typeof location !== 'undefined' &&
      new URLSearchParams(location.search).get('hf_p161_profile') === '1'
    );
    this._samples = Object.create(null);
    this._heads = Object.create(null);
    this._frames = 0;
    this._lastRaf = null;
    this._active = false;
    this._section = null;
    this._sectionStart = 0;
    this._start = 0;
    this._peaks = { drawCalls: 0, triangles: 0 };
    this._resources = null;
    this._startedAt = new Date().toISOString();
    for (const name of P161_METRICS) {
      this._samples[name] = [];
      this._heads[name] = 0;
    }
    this._samples.longTask = [];
    this._heads.longTask = 0;

    if (!this.enabled) return;
    if (typeof window !== 'undefined') {
      window.highflyP161Report = () => this.report();
      window.highflyP161Reset = () => this.reset();
    }
    // The existing in-game COPIAR DATOS button now exports P16.1 as well.
    if (game.mobileAudit?.report) {
      const previous = game.mobileAudit.report.bind(game.mobileAudit);
      game.mobileAudit.report = () => ({ ...previous(), p161: this.report() });
    }
    try {
      if (typeof PerformanceObserver !== 'undefined' &&
          PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        this.longTaskObserver = new PerformanceObserver(list => {
          if (!this._active) return;
          for (const entry of list.getEntries()) this._push('longTask', entry.duration);
        });
        this.longTaskObserver.observe({ type: 'longtask' });
      }
    } catch { /* unsupported Android/Chrome; telemetry remains optional */ }
  }

  _push(name, value) {
    if (!Number.isFinite(value) || value < 0) return;
    const entries = this._samples[name];
    if (!entries) return;
    if (entries.length < CAPACITY) entries.push(value);
    else {
      entries[this._heads[name]] = value;
      this._heads[name] = (this._heads[name] + 1) % CAPACITY;
    }
  }

  reset() {
    for (const name of Object.keys(this._samples)) {
      this._samples[name].length = 0;
      this._heads[name] = 0;
    }
    this._frames = 0;
    this._lastRaf = null;
    this._active = false;
    this._section = null;
    this._peaks = { drawCalls: 0, triangles: 0 };
    this._resources = null;
    this._startedAt = new Date().toISOString();
  }

  beginFrame(rafTime) {
    if (!this.enabled) return;
    this._active = this.game.state === 'playing';
    if (!this._active) {
      this._lastRaf = null;
      return;
    }
    if (this._lastRaf !== null) {
      const interval = rafTime - this._lastRaf;
      // Do not let tab suspension corrupt the measurement distribution.
      if (interval > 0 && interval < 1000) this._push('frameInterval', interval);
    }
    this._lastRaf = rafTime;
    this._start = performance.now();
  }

  startSection(name) {
    if (!this._active) return;
    this._section = name;
    this._sectionStart = performance.now();
  }

  endSection(name) {
    if (!this._active || this._section !== name) return;
    this._push(name, performance.now() - this._sectionStart);
    this._section = null;
  }

  endFrame() {
    if (!this._active) return;
    this._push('cpuFrame', performance.now() - this._start);
    this._frames++;
    const info = this.game.renderer?.info;
    if (info?.render) {
      this._peaks.drawCalls = Math.max(this._peaks.drawCalls, info.render.calls || 0);
      this._peaks.triangles = Math.max(this._peaks.triangles, info.render.triangles || 0);
    }
    if (this._frames % 60 === 0 && info?.memory) {
      this._resources = {
        geometries: info.memory.geometries,
        textures: info.memory.textures
      };
    }
  }

  report() {
    const timings = {};
    for (const [name, samples] of Object.entries(this._samples)) {
      timings[name] = summarizeMs(samples);
    }
    const frame = timings.frameInterval;
    return {
      version: 'P16.1 PERF / baseline telemetry',
      branchBase: 'a83e7993d84da33c8d0792277c08d69a56bd1906',
      startedAt: this._startedAt,
      enabled: this.enabled,
      collectedFrames: this._frames,
      frameIntervalFpsEstimate: frame ? Math.round(1000 / frame.mean * 10) / 10 : null,
      measurementNote: 'rAF frame interval is NOT GPU time; render section is CPU + driver submission only; browser/thermal throttling matters.',
      quality: this.game.performanceP2?.preset ?? null,
      eco30fpsCapActive: !!(this.game.p812Enabled && this.game.p812Eco && this.game.touch?.enabled),
      pixelRatio: this.game.renderer?.getPixelRatio?.() ?? null,
      drawingBuffer: this.game.renderer?.domElement ?
        [this.game.renderer.domElement.width, this.game.renderer.domElement.height] : null,
      visibility: typeof document === 'undefined' ? null : document.visibilityState,
      peakRenderStats: { ...this._peaks },
      resourceCounts: this._resources,
      timingsMs: timings
    };
  }
}
