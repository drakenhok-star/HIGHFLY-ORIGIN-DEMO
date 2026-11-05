import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const source = await read('src/ui/performance-p161.js');
const { PerfFoundationP161, percentileMs, summarizeMs, P161_METRICS } =
  await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

assert.equal(percentileMs([], 0.95), null, 'empty distribution');
assert.equal(percentileMs([1, 2, 3, 4, 5], 0.95), 5, 'nearest rank P95');
assert.equal(percentileMs([5, 1, 3, 2, 4], 0.50), 3, 'P50 ignores input order');
assert.equal(percentileMs([10, 15, 30, 5, 60], 0.99), 60, 'P99');
assert.equal(summarizeMs([10, 20, 30]).mean, 20);
assert.ok(P161_METRICS.includes('water') && P161_METRICS.includes('combat'));

globalThis.window = {};
const game = {
  state: 'playing',
  p812Enabled: true,
  p812Eco: false,
  touch: { enabled: true },
  performanceP2: { preset: 'FLUID' },
  mobileAudit: { report: () => ({ existingP16: true }) },
  renderer: {
    getPixelRatio: () => 1,
    domElement: { width: 1440, height: 720 },
    info: { render: { calls: 15, triangles: 24000 }, memory: { geometries: 18, textures: 21 } }
  }
};

const off = new PerfFoundationP161(game, { enabled: false });
assert.equal(off.enabled, false);
assert.deepEqual(game.mobileAudit.report(), { existingP16: true }, 'default telemetry is inert');

const probe = new PerfFoundationP161(game, { enabled: true });
for (let i = 0; i < 65; i++) {
  probe.beginFrame(100 + i * 16.67);
  for (const name of ['water', 'terrain', 'player', 'combat', 'effects', 'enemies', 'npcs', 'scatter', 'render']) {
    probe.startSection(name);
    probe.endSection(name);
  }
  probe.endFrame();
}
const data = probe.report();
assert.equal(data.collectedFrames, 65);
assert.equal(data.timingsMs.frameInterval.samples, 64);
assert.ok(data.timingsMs.frameInterval.p95 > 16 && data.timingsMs.frameInterval.p95 < 17);
assert.equal(data.timingsMs.water.samples, 65);
assert.equal(data.peakRenderStats.drawCalls, 15);
assert.deepEqual(data.resourceCounts, { geometries: 18, textures: 21 });
assert.equal(game.mobileAudit.report().existingP16, true, 'keep original telemetry');
assert.equal(game.mobileAudit.report().p161.collectedFrames, 65, 'in-game copy includes P16.1');
assert.equal(typeof window.highflyP161Report, 'function');
assert.equal(typeof window.highflyP161Reset, 'function');

game.state = 'menu';
probe.beginFrame(1200);
probe.endFrame();
assert.equal(probe.report().collectedFrames, 65, 'menus excluded');
game.state = 'playing';
game.p812Eco = true;
assert.equal(probe.report().eco30fpsCapActive, true, 'ECO cap must be disclosed');
window.highflyP161Reset();
assert.equal(probe.report().collectedFrames, 0, 'reset between benchmark scenarios');

const main = await read('src/main.js');
assert.ok(main.includes("import { PerfFoundationP161 } from './ui/performance-p161.js'"));
assert.ok(main.includes('this.perf161 = new PerfFoundationP161(this)'));
for (const metric of ['water', 'terrain', 'player', 'combat', 'effects', 'enemies', 'npcs', 'scatter', 'render']) {
  assert.ok(main.includes("perf161.startSection('" + metric + "')"), metric + ' start');
  assert.ok(main.includes("perf161.endSection('" + metric + "')"), metric + ' end');
}
assert.ok(main.includes('perf161.endFrame()'));
assert.ok(main.includes('game.renderer.render(game.scene,game.camera)') && main.includes('game.composer.render()'),
  'no change to FLUID/composer rendering path');
assert.ok(main.includes('this.p16Enabled=this.p15Enabled'), 'P16 remains enabled');
assert.ok(main.includes('game.p6Perf.begin()'), 'prior profiler remains intact');

console.log('HIGHFLY P16.1 PASS: opt-in telemetry, P95/P99, section timings, preserved P16 rendering and reset');
