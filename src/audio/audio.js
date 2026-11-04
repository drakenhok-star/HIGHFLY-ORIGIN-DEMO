export class AudioSys {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.master = null;
    this.ambienceWanted = false;
    this.ambienceStarted = false;
    this.windFilter = null;
    this.windPhase = Math.random() * Math.PI * 2;
    this.windGain = null;
    this.windBase = 0.14;
    this.droneGain = null;
    this.birdTimer = 5;
    this.interior = false;
    this.crackleNodes = null;
    this.crackleTimer = 0;
    this._noiseBuf = null;
    this._brownBuf = null;
    this._distCurve = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch (e) {
      this.ctx = null;
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    if(this.game.p810Enabled){
      try{
        const saved=Number(localStorage.getItem('hf_p9_audio_volume'));
        if(Number.isFinite(saved)&&saved>=0&&saved<=.5)this.master.gain.value=saved;
      }catch(err){}
    }
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.ambienceWanted && !this.ambienceStarted) this.startAmbience();
  }

  _getNoiseBuffer() {
    if (this._noiseBuf) return this._noiseBuf;
    const len = Math.floor(this.ctx.sampleRate * 2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }

  _getBrownBuffer() {
    if (this._brownBuf) return this._brownBuf;
    const len = Math.floor(this.ctx.sampleRate * 2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this._brownBuf = buf;
    return buf;
  }

  _getDistCurve() {
    if (this._distCurve) return this._distCurve;
    const n = 256;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(3 * x);
    }
    this._distCurve = c;
    return c;
  }

  _noiseSrc(t0, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._getNoiseBuffer();
    src.loop = true;
    src.start(t0);
    src.stop(t0 + dur + 0.05);
    return src;
  }

  _env(t0, peak, attack, end) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(this.master);
    return g;
  }

  _tone(type, f0, f1, t0, dur, peak, dest) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(f0, 1), t0);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.02, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    return osc;
  }

  startAmbience() {
    this.ambienceWanted = true;
    if (!this.ctx || this.ambienceStarted) return;
    this.ambienceStarted = true;

    const wind = this.ctx.createBufferSource();
    wind.buffer = this._getNoiseBuffer();
    wind.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 450;
    lp.Q.value = 0.7;
    const wg = this.ctx.createGain();
    wg.gain.value = this.interior ? this.windBase * 0.3 : this.windBase;
    wind.connect(lp);
    lp.connect(wg);
    wg.connect(this.master);
    wind.start();
    this.windFilter = lp;
    this.windGain = wg;
    if (this.interior) this._startCrackle();

    const drone = this.ctx.createOscillator();
    drone.type = 'triangle';
    drone.frequency.value = 55;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0;
    drone.connect(this.droneGain);
    this.droneGain.connect(this.master);
    drone.start();

    this.birdTimer = 3 + Math.random() * 4;
  }

  _nightFactor() {
    const sky = this.game.sky;
    if (sky && typeof sky.nightFactor === 'number') return sky.nightFactor;
    return 0;
  }

  setInterior(isInside) {
    const inside = !!isInside;
    if (inside === this.interior) return;
    this.interior = inside;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.windGain) this.windGain.gain.setTargetAtTime(inside ? this.windBase * 0.3 : this.windBase, t, 0.5);
    if (inside) this._startCrackle();
    else this._stopCrackle();
  }

  _startCrackle() {
    if (!this.ctx || this.crackleNodes) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._getBrownBuffer();
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    lp.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
    g.gain.setTargetAtTime(0.085, this.ctx.currentTime, 0.4);
    this.crackleNodes = { src, gain: g };
    this.crackleTimer = 0.15;
  }

  _stopCrackle() {
    if (!this.crackleNodes) return;
    const n = this.crackleNodes;
    this.crackleNodes = null;
    const t = this.ctx.currentTime;
    n.gain.gain.cancelScheduledValues(t);
    n.gain.gain.setTargetAtTime(0.0001, t, 0.2);
    try {
      n.src.stop(t + 1.2);
    } catch (e) {}
  }

  _cracklePop() {
    const t = this.ctx.currentTime + 0.01;
    const dur = 0.015 + Math.random() * 0.035;
    const src = this._noiseSrc(t, dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400 + Math.random() * 2600;
    bp.Q.value = 1.2;
    const g = this._env(t, 0.03 + Math.random() * 0.07, 0.004, t + dur);
    src.connect(bp);
    bp.connect(g);
  }

  update(dt) {
    if (!this.ctx) return;
    if (this.crackleNodes) {
      this.crackleTimer -= dt;
      if (this.crackleTimer <= 0) {
        this.crackleTimer = 0.06 + Math.random() * 0.3;
        this._cracklePop();
      }
    }
    if (!this.ambienceStarted) return;
    const t = this.ctx.currentTime;
    const nf = this._nightFactor();

    this.windPhase += dt * 0.08 * Math.PI * 2;
    const wf = 475 + 225 * Math.sin(this.windPhase);
    this.windFilter.frequency.setTargetAtTime(wf, t, 0.4);

    this.droneGain.gain.setTargetAtTime(nf > 0.6 ? 0.025 : 0, t, 0.9);

    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = 4 + Math.random() * 5;
      if (nf < 0.4 && !this.interior) this._birdChirp();
    }
  }

  _birdChirp() {
    const n = 2 + Math.floor(Math.random() * 2);
    let t = this.ctx.currentTime + 0.05;
    for (let i = 0; i < n; i++) {
      const f0 = 2000 + Math.random() * 2000;
      const f1 = f0 * (0.75 + Math.random() * 0.55);
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + 0.07);
      const g = this._env(t, 0.04, 0.015, t + 0.09);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.12);
      t += 0.1 + Math.random() * 0.08;
    }
  }

  play(name) {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'click': this._fxClick(t); break;
      case 'swing': this._fxSwing(t); break;
      case 'hit': this._fxHit(t); break;
      case 'hurt': this._fxHurt(t); break;
      case 'cast': this._fxCast(t); break;
      case 'shout': this._fxShout(t); break;
      case 'chest': this._fxChest(t); break;
      case 'levelup': this._fxLevelup(t); break;
      case 'quest': this._fxQuest(t); break;
      case 'soul': this._fxSoul(t); break;
      case 'fanfare': this._fxFanfare(t); break;
      case 'death': this._fxDeath(t); break;
      case 'potion': this._fxPotion(t); break;
      case 'dragon_roar': this._fxDragonRoar(t); break;
      case 'word': this._fxWord(t); break;
      case 'frost': this._fxFrost(t); break;
      case 'dash': this._fxDash(t); break;
      case 'craft': this._fxCraft(t); break;
      default: break;
    }
  }

  _fxClick(t) {
    this._tone('square', 880, 760, t, 0.04, 0.1);
  }

  _fxSwing(t) {
    const src = this._noiseSrc(t, 0.18);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(480, t + 0.16);
    const g = this._env(t, 0.2, 0.02, t + 0.16);
    src.connect(bp);
    bp.connect(g);
  }

  _fxHit(t) {
    this._tone('sine', 95, 48, t, 0.18, 0.25);
    const src = this._noiseSrc(t, 0.04);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2800;
    const g = this._env(t, 0.1, 0.005, t + 0.04);
    src.connect(hp);
    hp.connect(g);
  }

  _fxHurt(t) {
    this._tone('sawtooth', 220, 70, t, 0.25, 0.15);
    this._tone('sine', 150, 60, t, 0.22, 0.12);
  }

  _fxCast(t) {
    const src = this._noiseSrc(t, 0.32);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(450, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.3);
    const g = this._env(t, 0.12, 0.08, t + 0.32);
    src.connect(bp);
    bp.connect(g);
    this._tone('sine', 600, 900, t, 0.3, 0.1);
  }

  _fxShout(t) {
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(50, t);
    sub.frequency.exponentialRampToValueAtTime(34, t + 0.8);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.linearRampToValueAtTime(0.3, t + 0.12);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    sub.connect(sg);
    sg.connect(this.master);
    sub.start(t);
    sub.stop(t + 0.85);

    const src = this._noiseSrc(t, 0.75);
    const sh = this.ctx.createWaveShaper();
    sh.curve = this._getDistCurve();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.7);
    const g = this._env(t, 0.22, 0.05, t + 0.75);
    src.connect(sh);
    sh.connect(lp);
    lp.connect(g);
  }

  _fxChest(t) {
    const knock = (f, t0) => {
      this._tone('triangle', f, f * 0.7, t0, 0.09, 0.22);
      const src = this._noiseSrc(t0, 0.02);
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const g = this._env(t0, 0.05, 0.004, t0 + 0.02);
      src.connect(hp);
      hp.connect(g);
    };
    knock(180, t);
    knock(140, t + 0.13);
  }

  _fxLevelup(t) {
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < freqs.length; i++) {
      const t0 = t + i * 0.15;
      this._tone('sine', freqs[i], freqs[i], t0, 0.3, 0.12);
      this._tone('triangle', freqs[i] * 2, freqs[i] * 2, t0, 0.25, 0.04);
    }
  }

  _fxQuest(t) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.07);
    g.gain.setValueAtTime(0.16, t + 0.38);
    g.gain.linearRampToValueAtTime(0.1, t + 0.42);
    g.gain.linearRampToValueAtTime(0.16, t + 0.48);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    lp.connect(g);
    g.connect(this.master);
    for (const det of [0, 6]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = det;
      osc.frequency.setValueAtTime(392, t);
      osc.frequency.setValueAtTime(392, t + 0.4);
      osc.frequency.linearRampToValueAtTime(523.25, t + 0.46);
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + 0.95);
    }
  }

  _fxSoul(t) {
    for (const det of [-10, 4, 12]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.detune.value = det;
      osc.frequency.setValueAtTime(1450, t);
      osc.frequency.exponentialRampToValueAtTime(460, t + 2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + 2.05);
    }
  }

  _fxFanfare(t) {
    const chords = [
      { f: [196.0, 246.94, 392.0], t0: 0, dur: 0.65 },
      { f: [261.63, 329.63, 523.25], t0: 0.55, dur: 0.65 },
      { f: [329.63, 415.3, 493.88, 659.25], t0: 1.1, dur: 1.4 },
    ];
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    lp.connect(this.master);
    for (const ch of chords) {
      const t0 = t + ch.t0;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.06, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ch.dur);
      g.connect(lp);
      for (const f of ch.f) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        osc.connect(g);
        osc.start(t0);
        osc.stop(t0 + ch.dur + 0.05);
      }
    }
  }

  _fxDeath(t) {
    this._tone('sawtooth', 200, 40, t, 1.6, 0.16);
    this._tone('sine', 100, 30, t, 1.5, 0.14);
  }

  _fxPotion(t) {
    for (let i = 0; i < 3; i++) {
      const f = 300 + Math.random() * 200;
      const t0 = t + i * 0.09;
      this._tone('sine', f, f * 1.6, t0, 0.07, 0.12);
    }
  }

  _fxWord(t) {
    const dur = 1.6;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(480, t);
    lp.frequency.linearRampToValueAtTime(1400, t + dur * 0.6);
    lp.frequency.linearRampToValueAtTime(650, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.55);
    g.gain.setValueAtTime(0.22, t + 1.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g);
    g.connect(this.master);
    const base = [110, 138, 165];
    const dets = [-7, 5, 10];
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = dets[i];
      osc.frequency.setValueAtTime(base[i], t);
      osc.frequency.linearRampToValueAtTime(base[i] * 1.25, t + dur);
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
    const bell = this.ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.value = 660;
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t + 0.4);
    bg.gain.linearRampToValueAtTime(0.09, t + 0.46);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    bell.connect(bg);
    bg.connect(this.master);
    bell.start(t + 0.4);
    bell.stop(t + dur + 0.05);
    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 990;
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t + 0.45);
    sg.gain.linearRampToValueAtTime(0.03, t + 0.55);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    shimmer.connect(sg);
    sg.connect(this.master);
    shimmer.start(t + 0.45);
    shimmer.stop(t + dur + 0.05);
  }

  _fxFrost(t) {
    const dur = 1.2;
    const src = this._noiseSrc(t, dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(5200, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.08);
    g.gain.setValueAtTime(0.2, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, t);
    sub.frequency.linearRampToValueAtTime(42, t + dur);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.linearRampToValueAtTime(0.18, t + 0.1);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sub.connect(sg);
    sg.connect(this.master);
    sub.start(t);
    sub.stop(t + dur + 0.05);
  }

  _fxDash(t) {
    const dur = 0.45;
    const src = this._noiseSrc(t, dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = this._env(t, 0.24, 0.06, t + dur);
    src.connect(bp);
    bp.connect(g);
  }

  _fxCraft(t) {
    const partials = [
      [1, 0.16],
      [2.76, 0.05],
      [5.4, 0.025],
    ];
    const ding = (f, t0) => {
      for (const [m, p] of partials) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * m;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(p, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + 0.55);
      }
      this._tone('sine', 130, 55, t0, 0.12, 0.18);
    };
    ding(1320, t);
    ding(990, t + 0.28);
  }

  _fxDragonRoar(t) {
    const dur = 1.4;
    const am = this.ctx.createGain();
    am.gain.value = 0.6;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8;
    const lfoDepth = this.ctx.createGain();
    lfoDepth.gain.value = 0.35;
    lfo.connect(lfoDepth);
    lfoDepth.connect(am.gain);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.3, t + 0.1);
    env.gain.setValueAtTime(0.3, t + 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    am.connect(env);
    env.connect(this.master);

    const growl = this.ctx.createOscillator();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(70, t);
    growl.frequency.exponentialRampToValueAtTime(52, t + dur);
    growl.connect(am);
    const growl2 = this.ctx.createOscillator();
    growl2.type = 'sawtooth';
    growl2.frequency.setValueAtTime(94, t);
    growl2.frequency.exponentialRampToValueAtTime(66, t + dur);
    growl2.detune.value = -18;
    growl2.connect(am);

    const src = this._noiseSrc(t, dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.5;
    src.connect(lp);
    lp.connect(ng);
    ng.connect(am);

    lfo.start(t);
    lfo.stop(t + dur + 0.05);
    growl.start(t);
    growl.stop(t + dur + 0.05);
    growl2.start(t);
    growl2.stop(t + dur + 0.05);
  }
}
