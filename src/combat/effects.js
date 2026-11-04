import * as THREE from 'three';

export class Effects {
  constructor(game) {
    this.game = game;
    this.bursts = [];
    this.streams = [];
    this.cones = [];
    this.trails = [];
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._v4 = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  spawnBurst(pos, colorHex, count = 10, speed = 6, life = 0.6, size = 0.16) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;
      const theta = Math.random() * Math.PI * 2;
      const cosPhi = Math.random() * 2 - 1;
      const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
      const s = speed * (0.4 + 0.6 * Math.random());
      velocities[i3] = Math.cos(theta) * sinPhi * s;
      velocities[i3 + 1] = cosPhi * s;
      velocities[i3 + 2] = Math.sin(theta) * sinPhi * s;
    }
    this._pushBurst(positions, velocities, count, colorHex, life, size);
  }

  _pushBurst(positions, velocities, count, colorHex, life, size) {
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(colorHex),
      size,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.game.scene.add(points);
    this.bursts.push({ points, geo, mat, attr, velocities, count, t: 0, life });
  }

  frostCone(originFn, dirFn, durationSec) {
    // acc 预置一个周期，下一帧立即喷出第一波
    this.cones.push({ originFn, dirFn, t: 0, acc: 0.1, tick: 0, duration: durationSec });
  }

  dashTrail(posFn, durationSec) {
    this.trails.push({ posFn, t: 0, acc: 0.05, duration: durationSec });
  }

  _spawnCone(origin, dir, colorHex, count) {
    const d = this._v2.copy(dir);
    if (d.lengthSq() < 1e-6) d.set(0, 0, 1);
    d.normalize();
    const u = this._v3.crossVectors(d, this._up);
    if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
    u.normalize();
    const w = this._v4.crossVectors(u, d).normalize();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = origin.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.5;
      positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.5;
      const spread = Math.random() * 0.55;
      const ang = Math.random() * Math.PI * 2;
      const sinS = Math.sin(spread);
      const cosS = Math.cos(spread);
      const ru = Math.cos(ang) * sinS;
      const rw = Math.sin(ang) * sinS;
      const s = 9 + Math.random() * 6;
      velocities[i3] = (d.x * cosS + u.x * ru + w.x * rw) * s;
      velocities[i3 + 1] = (d.y * cosS + u.y * ru + w.y * rw) * s;
      velocities[i3 + 2] = (d.z * cosS + u.z * ru + w.z * rw) * s;
    }
    this._pushBurst(positions, velocities, count, colorHex, 0.45 + Math.random() * 0.2, 0.15);
  }

  spawnSoulStream(fromPos, durationSec) {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const delay = new Float32Array(count);
    const spin = new Float32Array(count);
    const travel = durationSec * 0.55;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = fromPos.x;
      positions[i3 + 1] = fromPos.y;
      positions[i3 + 2] = fromPos.z;
      phase[i] = Math.random() * Math.PI * 2;
      delay[i] = Math.random() * (durationSec - travel);
      spin[i] = (2 + Math.random() * 2) * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('color', colAttr);
    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.game.scene.add(points);
    this.streams.push({
      points, geo, mat, posAttr, colAttr,
      from: fromPos.clone(),
      phase, delay, spin,
      count, travel,
      t: 0,
      duration: durationSec
    });
  }

  update(dt) {
    for (let i = this.cones.length - 1; i >= 0; i--) {
      const c = this.cones[i];
      c.t += dt;
      // 钳制追帧积累：resetAll 用大 dt 清场时防一次性补喷出上万粒子
      c.acc = Math.min(c.acc + dt, 0.3);
      while (c.acc >= 0.1) {
        c.acc -= 0.1;
        const color = c.tick % 2 === 0 ? '#bfe6f0' : '#e8f6fa';
        c.tick++;
        this._spawnCone(c.originFn(), c.dirFn(), color, 25);
      }
      if (c.t >= c.duration) this.cones.splice(i, 1);
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.t += dt;
      // 同上钳制；posFn 已自带发射高度，这里不再额外抬高
      tr.acc = Math.min(tr.acc + dt, 0.15);
      while (tr.acc >= 0.05) {
        tr.acc -= 0.05;
        this.spawnBurst(this._v1.copy(tr.posFn()), '#eef4ff', 8, 3, 0.35, 0.2);
      }
      if (tr.t >= tr.duration) this.trails.splice(i, 1);
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += dt;
      if (b.t >= b.life) {
        this.game.scene.remove(b.points);
        b.geo.dispose();
        b.mat.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const arr = b.attr.array;
      const vel = b.velocities;
      for (let j = 0; j < b.count; j++) {
        const j3 = j * 3;
        vel[j3 + 1] -= 4 * dt;
        arr[j3] += vel[j3] * dt;
        arr[j3 + 1] += vel[j3 + 1] * dt;
        arr[j3 + 2] += vel[j3 + 2] * dt;
      }
      b.attr.needsUpdate = true;
      const k = 1 - b.t / b.life;
      b.mat.opacity = k * k;
    }

    for (let i = this.streams.length - 1; i >= 0; i--) {
      const s = this.streams[i];
      s.t += dt;
      if (s.t >= s.duration + 0.15) {
        this.game.scene.remove(s.points);
        s.geo.dispose();
        s.mat.dispose();
        this.streams.splice(i, 1);
        continue;
      }
      const target = this._v1;
      if (this.game.player) {
        target.copy(this.game.player.pos);
        target.y += 1.2;
      } else {
        target.copy(s.from);
      }
      const dir = this._v2.copy(target).sub(s.from);
      const u = this._v3.crossVectors(dir, this._up);
      if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
      u.normalize();
      const v = this._v4.crossVectors(dir, u).normalize();
      const pArr = s.posAttr.array;
      const cArr = s.colAttr.array;
      for (let j = 0; j < s.count; j++) {
        const j3 = j * 3;
        let t = (s.t - s.delay[j]) / s.travel;
        let alpha;
        if (t <= 0) {
          t = 0;
          alpha = 0;
        } else if (t >= 1) {
          t = 1;
          alpha = 0;
        } else {
          alpha = Math.min(1, t * 5) * (1 - Math.max(0, (t - 0.82) / 0.18));
        }
        const r = 1.7 * Math.sin(Math.PI * t);
        const ang = s.phase[j] + t * s.spin[j];
        const ca = Math.cos(ang) * r;
        const sa = Math.sin(ang) * r;
        pArr[j3] = s.from.x + dir.x * t + u.x * ca + v.x * sa;
        pArr[j3 + 1] = s.from.y + dir.y * t + u.y * ca + v.y * sa;
        pArr[j3 + 2] = s.from.z + dir.z * t + u.z * ca + v.z * sa;
        cArr[j3] = 0.62 * alpha;
        cArr[j3 + 1] = 0.85 * alpha;
        cArr[j3 + 2] = 1.0 * alpha;
      }
      s.posAttr.needsUpdate = true;
      s.colAttr.needsUpdate = true;
    }
  }
}
