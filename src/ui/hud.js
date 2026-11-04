const HALF_VIEW = Math.PI / 2;
const COMPASS_HALF_W = 240;

function el(tag, cls, parent, text) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  if (parent) parent.appendChild(d);
  return d;
}

function wrapAngle(a) {
  return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = el('div', null, document.body);
    this.root.id = 'hud';
    this.root.style.display = 'none';

    this.compassWrap = el('div', 'hud-compass-wrap', this.root);
    this.compass = el('div', 'hud-compass', this.compassWrap);
    this.cardinals = [
      { bearing: 0, label: '北' },
      { bearing: Math.PI / 2, label: '东' },
      { bearing: Math.PI, label: '南' },
      { bearing: -Math.PI / 2, label: '西' },
    ].map((c) => ({ bearing: c.bearing, dom: el('div', 'hud-compass-cardinal', this.compass, c.label) }));
    this.markerEls = [];
    this.dotEls = [];
    const xpLine = el('div', 'hud-xpline', this.compassWrap);
    this.xpFill = el('div', 'hud-xpline-fill', xpLine);

    this.enemyBox = el('div', 'hud-enemybar', this.root);
    this.enemyName = el('div', 'hud-enemy-name', this.enemyBox);
    const enemyBack = el('div', 'hud-enemy-back', this.enemyBox);
    this.enemyFill = el('div', 'hud-enemy-fill', enemyBack);
    this.enemyRef = null;
    this.enemyT = 0;

    el('div', 'hud-crosshair', this.root);

    this.hp = this.makeBar('hud-bar-hp', 'hud-fill-hp');
    this.mp = this.makeBar('hud-bar-mp', 'hud-fill-mp');
    this.sp = this.makeBar('hud-bar-sp', 'hud-fill-sp');

    this.promptBox = el('div', 'hud-prompt', this.root);
    el('span', 'hud-keycap', this.promptBox, 'E');
    this.promptLabel = el('span', 'hud-prompt-label', this.promptBox);

    this.notifyStack = el('div', 'hud-notify-stack', this.root);
    this.notifyItems = [];

    this.banner = el('div', 'hud-banner', this.root);
    this.bannerQueue = [];
    this.bannerT = -1;

    this.vignette = el('div', 'hud-vignette', this.root);
    this.flashT = 0;

    const sc = el('div', 'hud-shoutcd', this.root);
    const scRow = el('div', 'hud-shoutcd-row', sc);
    const scLeft = el('div', 'hud-shoutcd-left', scRow);
    this.shoutLabel = el('span', 'hud-shoutcd-label', scLeft, 'F 龙吼');
    this.shoutQHint = el('span', 'hud-shoutcd-q', scLeft, 'Q');
    this.shoutQHint.style.display = 'none';
    this.shoutStatus = el('span', 'hud-shoutcd-status', scRow, '');
    const scBar = el('div', 'hud-shoutcd-bar', sc);
    this.shoutFill = el('div', 'hud-shoutcd-fill', scBar);
    this.shoutReady = null;
    this.shoutLabelText = 'F 龙吼';
    this.shoutQShown = false;

    this.fadeOverlay = el('div', 'hud-fade', document.body);
    this.fading = false;
  }

  fade(onBlack) {
    if (this.fading) return;
    this.fading = true;
    const ov = this.fadeOverlay;
    ov.style.display = 'block';
    ov.style.opacity = '0';
    void ov.offsetHeight;
    ov.style.opacity = '1';
    setTimeout(() => {
      try {
        if (onBlack) onBlack();
      } finally {
        ov.style.opacity = '0';
        setTimeout(() => {
          ov.style.display = 'none';
          this.fading = false;
        }, 370);
      }
    }, 370);
  }

  makeBar(posCls, fillCls) {
    const box = el('div', 'hud-bar ' + posCls, this.root);
    const back = el('div', 'hud-bar-back', box);
    const fill = el('div', 'hud-bar-fill ' + fillCls, back);
    return { box, fill, last: -1, timer: 99 };
  }

  setVisible(v) {
    this.root.style.display = v ? 'block' : 'none';
  }

  prompt(text) {
    if (!text) {
      this.promptBox.style.display = 'none';
      return;
    }
    this.promptBox.style.display = 'flex';
    this.promptLabel.textContent = text.indexOf('E ') === 0 ? text.slice(2) : text;
  }

  notify(text) {
    const n = el('div', 'hud-notify', this.notifyStack, text);
    this.notifyItems.push({ dom: n, t: 3.6 });
    while (this.notifyItems.length > 5) {
      const old = this.notifyItems.shift();
      if (old.dom.parentNode) old.dom.parentNode.removeChild(old.dom);
    }
  }

  questBanner(text) {
    this.bannerQueue.push(text);
  }

  shoutText(text) {
    const s = el('div', 'hud-shout', this.root, text);
    setTimeout(() => {
      if (s.parentNode) s.parentNode.removeChild(s);
    }, 1300);
  }

  damageFlash() {
    this.flashT = 0.5;
  }

  showEnemyHP(enemy) {
    this.enemyRef = enemy;
    this.enemyT = 3;
    this.enemyName.textContent = enemy.name;
    this.enemyBox.style.opacity = '1';
  }

  updateBar(bar, value, max, dt) {
    if (value !== bar.last) {
      bar.timer = 0;
      bar.last = value;
    } else {
      bar.timer += dt;
    }
    bar.fill.style.width = Math.max(0, Math.min(1, value / max)) * 100 + '%';
    bar.box.style.opacity = value >= max - 0.01 && bar.timer > 2 ? '0.1' : '1';
  }

  placeOnCompass(domEl, rel, extra) {
    domEl.style.display = 'block';
    domEl.style.transform =
      'translateX(' + (COMPASS_HALF_W + (rel / HALF_VIEW) * COMPASS_HALF_W).toFixed(1) + 'px) translateX(-50%)' + (extra || '');
  }

  placeDot(e, px, heading, di) {
    if (!e.alive) return di;
    const st = e.state;
    if (st === 'idle' || st === 'wander' || st === 'perch' || st === 'dead') return di;
    const dx = e.group.position.x - px.x;
    const dz = e.group.position.z - px.z;
    if (dx * dx + dz * dz > 4900) return di;
    const rel = wrapAngle(Math.atan2(dx, -dz) - heading);
    if (Math.abs(rel) > HALF_VIEW) return di;
    if (di >= this.dotEls.length) this.dotEls.push(el('div', 'hud-compass-dot', this.compass));
    this.placeOnCompass(this.dotEls[di], rel);
    return di + 1;
  }

  updateCompass() {
    const player = this.game.player;
    const f = player.getForward();
    const heading = Math.atan2(f.x, -f.z);
    for (let i = 0; i < this.cardinals.length; i++) {
      const c = this.cardinals[i];
      const rel = wrapAngle(c.bearing - heading);
      if (Math.abs(rel) <= HALF_VIEW) this.placeOnCompass(c.dom, rel);
      else c.dom.style.display = 'none';
    }
    const px = player.pos;
    const markers = this.game.quests.markers();
    while (this.markerEls.length < markers.length) this.markerEls.push(el('div', 'hud-compass-marker', this.compass));
    for (let i = 0; i < this.markerEls.length; i++) {
      if (i >= markers.length) {
        this.markerEls[i].style.display = 'none';
        continue;
      }
      const m = markers[i];
      // clamp inside the opaque band of the compass mask (12%-88%), not the faded edges
      const lim = HALF_VIEW * 0.74;
      const rel = Math.max(-lim, Math.min(lim, wrapAngle(Math.atan2(m.pos.x - px.x, -(m.pos.z - px.z)) - heading)));
      this.placeOnCompass(this.markerEls[i], rel, ' rotate(45deg)');
    }
    let di = 0;
    const list = this.game.enemies.list;
    for (let i = 0; i < list.length; i++) di = this.placeDot(list[i], px, heading, di);
    const dragon = this.game.enemies.dragon;
    if (dragon && list.indexOf(dragon) === -1) di = this.placeDot(dragon, px, heading, di);
    for (let i = di; i < this.dotEls.length; i++) this.dotEls[i].style.display = 'none';
  }

  update(dt) {
    const g = this.game;
    this.updateBar(this.hp, g.stats.hp, g.stats.maxHp, dt);
    this.updateBar(this.mp, g.stats.mp, g.stats.maxMp, dt);
    this.updateBar(this.sp, g.stats.sp, g.stats.maxSp, dt);
    this.xpFill.style.width = Math.min(100, (g.stats.xp / g.stats.xpNext()) * 100) + '%';

    this.updateCompass();

    for (let i = this.notifyItems.length - 1; i >= 0; i--) {
      const it = this.notifyItems[i];
      it.t -= dt;
      if (it.t <= 0) {
        if (it.dom.parentNode) it.dom.parentNode.removeChild(it.dom);
        this.notifyItems.splice(i, 1);
      }
    }

    if (this.enemyRef) {
      this.enemyT -= dt;
      this.enemyFill.style.width = Math.max(0, this.enemyRef.hp / this.enemyRef.maxHp) * 100 + '%';
      if (this.enemyT <= 0) {
        this.enemyBox.style.opacity = '0';
        this.enemyRef = null;
      }
    }

    if (this.bannerT < 0 && this.bannerQueue.length) {
      this.banner.textContent = this.bannerQueue.shift();
      this.bannerT = 0;
    }
    if (this.bannerT >= 0) {
      this.bannerT += dt;
      const t = this.bannerT;
      let o;
      if (t < 0.45) o = t / 0.45;
      else if (t < 2.65) o = 1;
      else if (t < 3.35) o = 1 - (t - 2.65) / 0.7;
      else {
        o = 0;
        this.bannerT = -1;
      }
      this.banner.style.opacity = o.toFixed(3);
    }

    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      this.vignette.style.opacity = ((this.flashT / 0.5) * 0.55).toFixed(3);
    }

    const cb = g.combat;
    const cd = Math.max(0, cb.shoutCd);
    this.shoutFill.style.width = (1 - cd / cb.shoutCdMax) * 100 + '%';
    let shoutName = '龙吼';
    if (cb.shouts && cb.equippedShout) {
      for (let i = 0; i < cb.shouts.length; i++) {
        if (cb.shouts[i].id === cb.equippedShout) {
          shoutName = cb.shouts[i].name;
          break;
        }
      }
    }
    const shoutLabel = 'F ' + shoutName;
    if (shoutLabel !== this.shoutLabelText) {
      this.shoutLabelText = shoutLabel;
      this.shoutLabel.textContent = shoutLabel;
    }
    const showQ = !!(cb.learnedShouts && cb.learnedShouts.length > 1);
    if (showQ !== this.shoutQShown) {
      this.shoutQShown = showQ;
      this.shoutQHint.style.display = showQ ? 'inline-block' : 'none';
    }
    const ready = cd <= 0;
    if (ready !== this.shoutReady) {
      this.shoutReady = ready;
      this.shoutStatus.textContent = ready ? '就绪' : '';
    }
  }
}
