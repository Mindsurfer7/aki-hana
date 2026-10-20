/* Aki Hana — hand-painted Hokkaido environments (scenes 1–5 only).
 * Classic-script module: no imports, no external assets, no changes to global painters.
 * Integration: include this script before the main inline script, then call
 * AkiEnvironmentArt.install(SCENES) after all scene declarations and before boot.
 */
(function (host) {
  'use strict';

  const TARGETS = new Set(['hokkaido', 'akihana', 'trees', 'brook', 'village']);
  const REPLACE = new Set(['ridge', 'canopy', 'ground', 'brush', 'trunk', 'maple',
    'birch', 'spruce', 'larch', 'bush', 'rock', 'fern', 'sasa']);
  const TAU = Math.PI * 2;
  const CACHE = new Map();
  const CACHE_LIMIT = 42 * 1024 * 1024;
  let cacheBytes = 0;

  // Deliberately restrained colour families; variations retain a common Hokkaido world.
  const P = {
    moss: ['#92a06b', '#aabb7e', '#6d8564'],
    autumn: ['#c85f3f', '#e59b57', '#f2be73'],
    gold: ['#b88743', '#d8ab5c', '#edd18b'],
    pine: ['#567a68', '#739781', '#9daf88'],
    birch: ['#e8dfc5', '#fff4dc', '#b9b7a1'],
    earth: ['#7b8064', '#a5a47a', '#c6b58a'],
  };
  function random(seed) {
    let s = (Math.imul((seed | 0) + 1, 0x9e3779b1) ^ 0x8f8fe3ad) >>> 0;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }
  function between(r, a, b) { return a + (b - a) * r(); }
  function gradient(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (p) { g.addColorStop(p[0], p[1]); });
    return g;
  }
  function radial(c, x, y, r, stops) {
    const g = c.createRadialGradient(x - r * 0.25, y - r * 0.35, 0, x, y, r);
    stops.forEach(function (p) { g.addColorStop(p[0], p[1]); });
    return g;
  }
  function oval(c, x, y, rx, ry, fill, rotation) {
    c.fillStyle = fill;
    c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry),
      rotation || 0, 0, TAU); c.fill();
  }
  function stroke(c, path, col, width) {
    c.strokeStyle = col; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    path(c);
    c.stroke();
  }
  function silhouette(c, pts, fill, bend) {
    if (!pts.length) return;
    const tension = bend == null ? 1 : bend;
    c.beginPath();
    const last = pts[pts.length - 1], first = pts[0];
    c.moveTo((first[0] + last[0]) / 2, (first[1] + last[1]) / 2);
    for (let j = 0; j < pts.length; j++) {
      const a = pts[j], b = pts[(j + 1) % pts.length];
      c.quadraticCurveTo(a[0], a[1],
        a[0] + (b[0] - a[0]) * tension / 2,
        a[1] + (b[1] - a[1]) * tension / 2);
    }
    c.closePath(); c.fillStyle = fill; c.fill();
  }
  function foliage(c, x, y, rx, ry, palette, seed) {
    const r = random(seed);
    const outline = [];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a = TAU * i / N;
      const f = between(r, 0.89, 1.09);
      outline.push([x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f]);
    }
    silhouette(c, outline, radial(c, x, y, Math.max(rx, ry) * 1.15,
      [[0, palette[2]], [0.58, palette[1]], [1, palette[0]]]));
    // A handful of broad translucent brush masses, not individual noisy leaves.
    c.save(); c.globalAlpha *= 0.27;
    oval(c, x - rx * 0.28, y - ry * 0.42, rx * 0.47, ry * 0.40, '#fff4ca', -0.13);
    oval(c, x + rx * 0.40, y + ry * 0.22, rx * 0.45, ry * 0.38, palette[0], 0.25);
    c.restore();
  }
  function tree(c, e) {
    const h = e.h || (e.k === 'birch' ? 900 : 650);
    const r = random((e.s || 1) + e.k.length * 120);
    if (e.k === 'spruce' || e.k === 'larch') {
      const evergreen = e.k === 'spruce';
      const p = evergreen ? P.pine : P.gold;
      stroke(c, function (x) {
        x.moveTo(0, -h * 0.99);
        x.bezierCurveTo(-6, -h * 0.66, 12, -h * 0.35, 0, 0);
      }, '#7c6b54', Math.max(4, h * 0.025));
      for (let row = 0; row < 7; row++) {
        const u = (row + 1) / 8, y = -h + h * u;
        const half = h * (evergreen ? 0.23 : 0.20) * Math.pow(u, 0.85);
        for (const sign of [-1, 1]) {
          foliage(c, sign * half * 0.56, y + half * 0.06,
            half * 0.55, Math.max(12, half * (evergreen ? 0.34 : 0.23)),
            p, (e.s || 1) * 101 + row * 7 + sign + 1);
        }
      }
      foliage(c, 0, -h * 0.93, h * 0.045, h * 0.095, p, e.s || 1);
      return;
    }
    const birch = e.k === 'birch';
    const trunk = e.k === 'trunk';
    const w = trunk ? e.w || 90 : h * (birch ? 0.037 : 0.057);
    const lean = between(r, -0.06, 0.06) * h;
    const bark = birch ? P.birch : ['#564233', '#a48460', '#dcc09a'];
    const g = gradient(c, -w * 0.65, 0, w * 0.7, 0,
      [[0, bark[1]], [0.34, bark[2]], [0.76, bark[0]], [1, bark[0]]]);
    c.beginPath();
    c.moveTo(-w * 0.85, 10);
    c.bezierCurveTo(-w * 0.5, -h * 0.25, -w * 0.35 + lean, -h * 0.8, lean - w * 0.24, -h);
    c.quadraticCurveTo(lean + w * 0.18, -h * 1.02, lean + w * 0.32, -h);
    c.bezierCurveTo(w * 0.45 + lean, -h * 0.72, w * 0.5, -h * 0.25, w * 0.85, 10);
    c.closePath(); c.fillStyle = g; c.fill();
    if (birch) {
      c.save(); c.globalAlpha *= 0.58;
      for (let i = 0; i < 7; i++) {
        const y = -h * (0.1 + i * 0.116), px = lean * -y / h;
        stroke(c, function (x) {
          x.moveTo(px - w * 0.29, y);
          x.quadraticCurveTo(px, y + h * 0.01, px + w * 0.22, y - 3);
        }, '#806a59', Math.max(1.3, w * 0.14));
      }
      c.restore();
    } else {
      stroke(c, function (x) {
        x.moveTo(-w * 0.22, 0);
        x.bezierCurveTo(-w * 0.10, -h * 0.26, lean + w * 0.02, -h * 0.67, lean, -h * 0.92);
      }, 'rgba(255,230,185,.24)', Math.max(2, w * 0.07));
    }
    // Branch architecture remains legible under the broad watercolor crowns.
    const branchN = trunk ? (e.limbs || 0) : birch ? 4 : 6;
    for (let i = 0; i < branchN; i++) {
      const sign = i % 2 ? -1 : 1, y = -h * (0.53 + i * 0.073);
      const bx = lean * -y / h, len = h * (trunk ? 0.13 : birch ? 0.12 : 0.23);
      stroke(c, function (x) {
        x.moveTo(bx, y);
        x.bezierCurveTo(bx + sign * len * 0.35, y - len * 0.1,
          bx + sign * len * 0.60, y - len * 0.49, bx + sign * len, y - len * 0.62);
      }, birch ? '#b2a493' : '#796048', Math.max(2, w * 0.20));
    }
    if (trunk) {
      for (let i = 0; i < branchN; i++) {
        const yy = -h * (0.60 + i * 0.06), sign = i % 2 ? -1 : 1;
        foliage(c, sign * w * 1.5, yy - w, w * 1.1, w * 0.67,
          i % 3 ? P.autumn : P.gold, i + (e.s || 1) * 17);
      }
    } else if (birch) {
      if (!e.bare) {
        for (let i = 0; i < 6; i++) {
          const sign = i % 2 ? -1 : 1;
          foliage(c, lean * 0.8 + sign * h * (0.035 + i % 3 * 0.035),
            -h * (0.76 + (i % 3) * 0.07), h * 0.067, h * 0.075,
            i % 3 ? P.gold : P.moss, (e.s || 1) * 23 + i);
        }
      }
    } else {
      const p = e.pal === 'g' ? P.gold : e.pal === 'o' ? P.autumn
        : e.pal === 'm' ? ['#bc684d', '#e29b55', '#efcd82'] : P.autumn;
      // The seven large connected masses make one crown, not stippled confetti.
      foliage(c, lean, -h * 0.81, h * 0.29, h * 0.17, p, e.s || 1);
      foliage(c, -h * 0.19 + lean, -h * 0.69, h * 0.21, h * 0.18, p, (e.s || 1) + 5);
      foliage(c, h * 0.19 + lean, -h * 0.69, h * 0.23, h * 0.18, p, (e.s || 1) + 9);
      foliage(c, -h * 0.31 + lean, -h * 0.57, h * 0.17, h * 0.13, p, (e.s || 1) + 13);
      foliage(c, h * 0.32 + lean, -h * 0.56, h * 0.18, h * 0.14, p, (e.s || 1) + 14);
    }
  }

  function ridge(c, e) {
    const o = e.o || {}, w = o.w || 2900, h = o.h || 1000, r = random(e.s || 1);
    const base = o.base || 520, amp = o.amp || 200, peaks = o.peaks;
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const xx = i * w / 20;
      const wave = 0.35 + 0.31 * Math.sin(i * 0.75 + (e.s || 1)) +
        0.16 * Math.sin(i * 1.6 + (e.s || 1) * 0.4);
      const yy = base - amp * (peaks ? Math.pow(Math.max(0.05, wave), 1.3) : wave);
      pts.push([xx, yy]);
    }
    c.beginPath(); c.moveTo(0, h); c.lineTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) * 0.5, (p[1] + q[1]) * 0.5);
    }
    c.lineTo(w, pts[pts.length - 1][1]); c.lineTo(w, h); c.closePath();
    const mountain = o.peaks;
    c.fillStyle = gradient(c, 0, 180, 0, h, mountain
      ? [[0, '#94abc1'], [0.47, '#c4c8ba'], [1, '#ced0b2']]
      : [[0, '#899c86'], [0.55, '#a2aa82'], [1, '#ae9b72']]);
    c.fill();
    if (mountain) {
      c.save(); c.clip();
      c.fillStyle = 'rgba(255,247,231,.72)';
      c.beginPath(); c.moveTo(0, 340);
      c.bezierCurveTo(w * 0.3, 315, w * 0.5, 355, w, 300);
      c.lineTo(w, 0); c.lineTo(0, 0); c.closePath(); c.fill(); c.restore();
    } else {
      c.save(); c.clip();
      // A distant maple/larch canopy reads as continuous patches of colour.
      const pal = [P.pine[1], P.gold[1], P.autumn[1], '#b7a874'];
      c.globalAlpha *= 0.24;
      for (let i = 0; i < 38; i++) {
        const x = between(r, 0, w), y = between(r, base - amp * 0.7, base + h * 0.16);
        oval(c, x, y, between(r, 38, 104), between(r, 22, 57),
          pal[Math.floor(r() * pal.length)]);
      }
      c.restore();
    }
  }
  function ground(c, e) {
    const w = e.w || 3200, h = e.h || 400, r = random(e.s || 9);
    c.beginPath(); c.moveTo(-w / 2, 12);
    for (let i = 0; i < 9; i++) {
      const x = -w / 2 + i * w / 8, y = Math.sin(i * 1.8 + (e.s || 1)) * 7;
      c.quadraticCurveTo(x, y, x + w / 16, y + 4);
    }
    c.lineTo(w / 2, h + 10); c.lineTo(-w / 2, h + 10); c.closePath();
    c.fillStyle = gradient(c, 0, 0, 0, h,
      [[0, '#a0a681'], [0.45, '#8d9674'], [0.84, '#867d5d'], [1, '#786b55']]);
    c.fill(); c.save(); c.clip();
    c.globalAlpha *= 0.22;
    for (let i = 0; i < 12; i++) {
      oval(c, between(r, -w / 2, w / 2), between(r, 8, h), between(r, 55, 195),
        between(r, 12, 39), i % 3 ? '#c7bb8c' : '#557f66', between(r, -0.2, 0.2));
    }
    c.restore();
  }
  function canopy(c, e) {
    const o = e.o || {}, w = o.w || 3000, h = o.h || 900, r = random(e.s || 1);
    for (let i = 0; i < 30; i++) {
      const x = between(r, -w / 2, w / 2);
      const y = between(r, -h * 0.95, -h * 0.03);
      const p = o.pal === 'g' ? P.gold : o.pal === 'o' ? P.autumn :
        o.pal === 'r' ? P.autumn : i % 3 ? P.gold : P.autumn;
      foliage(c, x, y, between(r, 90, 175), between(r, 48, 108), p, (e.s || 1) * 97 + i);
    }
  }
  function frond(c, e) {
    const r = e.r || 140, dry = !!e.dry, p = dry ? P.gold : P.moss;
    for (let i = -5; i <= 5; i++) {
      const sway = i / 5, tipX = sway * r * (e.k === 'sasa' ? 1.1 : 0.9);
      const tipY = -r * (0.8 - Math.abs(sway) * 0.30);
      stroke(c, function (x) {
        x.moveTo(0, 0); x.quadraticCurveTo(tipX * 0.28, tipY * 0.80, tipX, tipY);
      }, '#6c815c', Math.max(2, r * 0.025));
      for (let j = 1; j <= 4; j++) {
        const u = j / 5, x = tipX * u * u * 0.85, y = tipY * u;
        oval(c, x + (i % 2 ? 1 : -1) * r * 0.048, y, r * 0.048, r * 0.105,
          p[j % 3], (i > 0 ? -1 : 1) * 0.44);
      }
    }
  }
  function shrub(c, e) {
    const r = e.r || (e.k === 'brush' ? 100 : 110), rand = random(e.s || 2);
    if (e.k === 'brush') {
      const w = e.w || 3200, h = e.h || 180;
      // Original brush bands grow UP from y=0, never down into the next layer.
      c.beginPath(); c.moveTo(-w / 2, 0);
      for (let i = 0; i <= 18; i++) {
        const px = -w / 2 + i * w / 18;
        c.lineTo(px, -h * (0.26 + 0.06 * Math.sin(i * 1.1 + e.s)));
      }
      c.lineTo(w / 2, 0); c.closePath();
      c.fillStyle = gradient(c, 0, -h * 0.48, 0, 0,
        [[0, 'rgba(139,157,106,.65)'], [1, '#6f8465']]);
      c.fill();
      for (let i = 0; i < 25; i++) {
        const px = -w / 2 + w * (i + 0.4) / 25;
        const py = -h * 0.25 + Math.sin(i * 0.8) * h * 0.06;
        foliage(c, px, py, w / 25 * 0.8, h * 0.24,
          i % 4 ? P.moss : P.gold, i * 11 + (e.s || 1));
      }
    } else {
      const p = e.pal === 'r' ? P.autumn : e.pal === 'o' ? P.gold : P.moss;
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * r * 0.34, y = -r * (0.25 + (2 - Math.abs(i - 2)) * 0.23);
        foliage(c, x, y, r * 0.43, r * 0.4, p, Math.floor(rand() * 9999));
      }
    }
  }
  function stone(c, e) {
    const r = e.r || 100;
    oval(c, 0, -r * 0.47, r * 1.0, r * 0.59,
      gradient(c, -r, -r, r, 0,
        [[0, '#d4c4a2'], [0.37, '#b4b39e'], [1, '#7e8979']]), -0.06);
    oval(c, -r * 0.23, -r * 0.70, r * 0.48, r * 0.18,
      'rgba(238,220,168,.42)', -0.1);
    if (e.moss !== 0) oval(c, -r * 0.05, -r * 0.91, r * 0.52, r * 0.13,
      'rgba(128,159,110,.75)', 0.04);
  }
  function drawArt(c, e) {
    switch (e.k) {
      case 'ridge': ridge(c, e); break;
      case 'ground': ground(c, e); break;
      case 'canopy': canopy(c, e); break;
      case 'brush': case 'bush': shrub(c, e); break;
      case 'maple': case 'birch': case 'spruce': case 'larch': case 'trunk':
        tree(c, e); break;
      case 'rock': stone(c, e); break;
      case 'fern': case 'sasa': frond(c, e); break;
    }
  }
  function bounds(e) {
    const h = e.h || (e.k === 'birch' ? 900 : 650);
    if (e.k === 'ridge') return [e.o && e.o.w || 2900, e.o && e.o.h || 1000, 0, 0];
    if (e.k === 'canopy') return [e.o && e.o.w || 3200, (e.o && e.o.h || 900) + 120,
      (e.o && e.o.w || 3200) / 2, e.o && e.o.h || 900];
    if (e.k === 'ground') return [e.w || 3200, (e.h || 400) + 30, (e.w || 3200) / 2, 0];
    if (e.k === 'brush') return [e.w || 3200, (e.h || 180) + 25, (e.w || 3200) / 2, e.h || 180];
    if (e.k === 'rock') return [(e.r || 100) * 2.5, (e.r || 100) * 1.8,
      (e.r || 100) * 1.25, (e.r || 100) * 1.7];
    if (e.k === 'fern' || e.k === 'sasa') return [(e.r || 140) * 2.6,
      (e.r || 140) * 1.65, (e.r || 140) * 1.3, (e.r || 140) * 1.55];
    if (e.k === 'bush') return [(e.r || 110) * 3.4, (e.r || 110) * 2.5,
      (e.r || 110) * 1.7, (e.r || 110) * 2.3];
    if (e.k === 'trunk') return [(e.w || 90) * 7, h + 50, (e.w || 90) * 3.5, h + 20];
    return [Math.max(h * 1.35, 360), h + 50, Math.max(h * 1.35, 360) / 2, h + 20];
  }
  function key(e) {
    const o = e.o || {};
    return [e.k, e.s || 0, e.h || 0, e.w || 0, e.r || 0,
      e.pal || '', e.dark || 0, e.limbs || 0, e.bare || 0,
      o.w || 0, o.h || 0, o.base || 0, o.amp || 0, o.pal || ''].join(':');
  }
  function getPaint(e) {
    const k = key(e);
    if (CACHE.has(k)) {
      const hit = CACHE.get(k); CACHE.delete(k); CACHE.set(k, hit); return hit;
    }
    if (!host.document || !host.document.createElement) return null;
    const b = bounds(e), resolution = Math.min(1.35, 1440 / Math.max(b[0], b[1]));
    const width = Math.max(1, Math.ceil(b[0] * resolution));
    const height = Math.max(1, Math.ceil(b[1] * resolution));
    const cost = width * height * 4;
    const canvas = host.document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(width / b[0], height / b[1]);
    ctx.translate(b[2], b[3]);
    drawArt(ctx, e);
    while (CACHE.size && cacheBytes + cost > CACHE_LIMIT) {
      const first = CACHE.keys().next().value;
      cacheBytes -= CACHE.get(first).bytes; CACHE.delete(first);
    }
    CACHE.set(k, {canvas: canvas, b: b, bytes: cost});
    cacheBytes += cost;
    return CACHE.get(k);
  }
  function element(c, e, t) {
    const b = bounds(e), cached = getPaint(e);
    c.save();
    c.translate(e.x || 0, e.y || 0);
    const sway = /^(maple|birch|spruce|larch|bush|fern|sasa)$/.test(e.k)
      ? Math.sin(t * 0.8 + (e.x || 0) * 0.013) * 0.006 : 0;
    c.transform(1, 0, (e.lean || 0) + sway, 1, 0, 0);
    c.scale((e.f ? -1 : 1) * (e.sc || 1), e.sc || 1);
    if (e.a != null) c.globalAlpha *= e.a;
    if (cached) c.drawImage(cached.canvas, -b[2], -b[3], b[0], b[1]);
    else drawArt(c, e);
    c.restore();
  }

  function cottage(c, x, y, scale, kind) {
    const hare = kind === 'hare', w = hare ? 93 : 123, wall = hare ? '#edc79a' : '#b99572';
    c.save(); c.translate(x, y); c.scale(scale, scale);
    oval(c, 0, 6, w * 1.34, 19, 'rgba(76,92,67,.25)');
    // Bulging plaster / cedar walls; clear warm silhouette and gently bowed sides.
    c.fillStyle = gradient(c, -w, 0, w, 0,
      [[0, hare ? '#d7a877' : '#886849'], [0.38, wall], [0.78, '#d4b28b'], [1, '#a47d59']]);
    c.beginPath(); c.moveTo(-w * 0.88, 0);
    c.quadraticCurveTo(-w * 1.05, -88, -w * 0.75, -120);
    c.quadraticCurveTo(0, -144, w * 0.75, -120);
    c.quadraticCurveTo(w * 1.08, -88, w * 0.88, 0);
    c.quadraticCurveTo(0, 16, -w * 0.88, 0); c.fill();
    // Windows have gentle amber halos, not harsh black cavities.
    oval(c, w * 0.49, -69, 29, 28, 'rgba(255,218,133,.22)');
    oval(c, w * 0.46, -74, 20, 24, '#fff2bc');
    stroke(c, function (p) {p.ellipse(w * 0.46, -74, 20, 24, 0, 0, TAU);},
      '#a47750', 5);
    stroke(c, function (p) {
      p.moveTo(w * 0.46, -95); p.lineTo(w * 0.46, -51);
      p.moveTo(w * 0.28, -74); p.lineTo(w * 0.64, -74);
    }, 'rgba(146,109,66,.7)', 2.5);
    c.fillStyle = '#865d42';
    c.beginPath(); c.moveTo(-w * 0.50, 0); c.lineTo(-w * 0.5, -58);
    c.quadraticCurveTo(-w * 0.44, -85, -w * 0.15, -85);
    c.quadraticCurveTo(w * 0.05, -82, w * 0.04, -59);
    c.lineTo(w * 0.04, 0); c.closePath(); c.fill();
    c.fillStyle = '#b8895f';
    c.beginPath(); c.moveTo(-w * 0.45, 0); c.lineTo(-w * 0.45, -55);
    c.quadraticCurveTo(-w * 0.43, -77, -w * 0.17, -77);
    c.quadraticCurveTo(-w * 0.02, -73, -w * 0.02, -55);
    c.lineTo(-w * 0.02, 0); c.fill();
    oval(c, -w * 0.11, -38, 3.5, 3.5, '#e8d08e');
    // Rounded kayabuki-style thatch / cedar shingle roof, broad overlapping curves.
    const roof = gradient(c, -w, -184, w, -98, hare
      ? [[0, '#dfc68e'], [0.60, '#c7a777'], [1, '#a1845f']]
      : [[0, '#b5a47c'], [0.50, '#917957'], [1, '#715940']]);
    c.fillStyle = roof;
    c.beginPath(); c.moveTo(-w * 1.22, -113);
    c.bezierCurveTo(-w * 0.94, -161, -w * 0.36, -187, 0, -191);
    c.bezierCurveTo(w * 0.51, -191, w * 1.1, -154, w * 1.23, -113);
    c.quadraticCurveTo(w * 1.24, -97, w * 1.09, -101);
    c.quadraticCurveTo(0, -122, -w * 1.07, -101);
    c.quadraticCurveTo(-w * 1.25, -99, -w * 1.22, -113); c.fill();
    stroke(c, function (p) {
      p.moveTo(-w * 1.16, -106);
      p.quadraticCurveTo(0, -130, w * 1.15, -106);
    }, hare ? '#ecdcaa' : '#c6ac78', 9);
    stroke(c, function (p) {
      p.moveTo(-w * 0.73, -145);
      p.quadraticCurveTo(0, -177, w * 0.71, -146);
    }, 'rgba(255,241,188,.35)', 12);
    if (!hare) {
      // Small stone chimney, visually distinct bear's cabin.
      c.fillStyle = '#998e7c'; c.fillRect(w * 0.57, -205, 27, 48);
      c.fillStyle = '#c1b8a1'; c.fillRect(w * 0.52, -210, 36, 9);
    }
    // Living moss edging and a little Japanese maple beside the steps.
    foliage(c, -w * 1.1, -7, 34, 22, P.moss, hare ? 22 : 23);
    foliage(c, w * 1.08, -7, 38, 20, P.moss, hare ? 24 : 25);
    oval(c, -w * 0.25, 9, 32, 7, '#d7c49d');
    c.restore();
  }
  function squirrelHome(c) {
    c.save(); c.translate(1000, 660); c.scale(1.2, 1.2);
    oval(c, 0, -16, 83, 113, '#8b684b');
    oval(c, -7, -15, 65, 99, gradient(c, -60, -85, 60, 70,
      [[0, '#a67e55'], [0.60, '#d1a376'], [1, '#916b4e']]));
    oval(c, 0, -36, 30, 45, '#eabb7e');
    oval(c, 0, -34, 23, 39, '#9b6b4c');
    oval(c, 0, -29, 18, 35, '#ba8251');
    oval(c, 16, -13, 3, 3, '#f9d996');
    oval(c, -37, -102, 16, 16, '#ffdda0');
    stroke(c, function (x) {x.ellipse(-37, -102, 16, 16, 0, 0, TAU);}, '#885d43', 4);
    foliage(c, -68, 38, 41, 27, P.moss, 44);
    foliage(c, 70, 34, 38, 23, P.gold, 45);
    c.restore();
  }
  function waterBase(c, old, t, S) {
    old(c, t); // Keeps the original Path2D and reflection mask exactly aligned.
    c.save();
    c.fillStyle = gradient(c, 0, 590, 0, 1220,
      [[0, '#c8d5c2'], [0.34, '#a4c6b8'], [0.74, '#7aa69d'], [1, '#567e7e']]);
    if (S.brook) c.fill(S.brook);
    c.restore();
  }
  function waterTop(c, t, S) {
    if (!S.brook) return;
    c.save(); c.clip(S.brook);
    const sh = c.createLinearGradient(0, 660, 0, 1150);
    sh.addColorStop(0, 'rgba(255,247,215,.30)');
    sh.addColorStop(0.5, 'rgba(210,239,223,.04)');
    sh.addColorStop(1, 'rgba(255,233,185,.16)');
    c.fillStyle = sh; c.fillRect(0, 580, 1920, 650);
    // Broad, gentle reflections; time varies only their brightness, not river movement.
    for (let i = 0; i < 24; i++) {
      const u = (i + 0.5) / 25, cy = 618 + 590 * Math.pow(u, 1.30);
      const cx = 1000 + 90 * Math.sin(u * 3.4 + 0.6) * (0.3 + u) - 80 * u;
      const w = 26 + 834 * Math.pow(u, 1.6);
      const bright = 0.10 + 0.12 * Math.pow(Math.sin(t * 0.55 + i * 0.78), 2);
      stroke(c, function (x) {
        x.moveTo(cx - w * 0.36, cy);
        x.quadraticCurveTo(cx, cy - 5 - u * 7, cx + w * 0.42, cy);
      }, 'rgba(255,252,227,' + bright.toFixed(3) + ')', 1.5 + u * 4);
    }
    c.restore();
  }
  function decorate(el, sceneId, villageHouseIndex, S) {
    if (el.k === 'fn') {
      if (sceneId === 'village') {
        if (el.p === 0.701) return Object.assign({}, el, {fn: function (c) {squirrelHome(c);}});
        if (el.p === 0.86) {
          const kind = villageHouseIndex === 0 ? 'hare' : 'bear';
          return Object.assign({}, el, {fn: function (c) {
            cottage(c, kind === 'hare' ? 470 : 1450, kind === 'hare' ? 800 : 770,
              kind === 'hare' ? 1.3 : 1.25, kind);
          }});
        }
      }
      if (sceneId === 'brook') {
        if (el.p === 0.9001) {
          const old = el.fn;
          return Object.assign({}, el, {fn: function (c, t) { waterBase(c, old, t, S); }});
        }
        if (el.p === 0.9002)
          return Object.assign({}, el, {fn: function (c, t) {waterTop(c, t, S);}});
      }
      return el; // Character motion, falling leaves and all other authored events remain.
    }
    if (!REPLACE.has(el.k)) return el; // Japanese stone lantern and effects remain.
    return Object.assign({}, el, {k: 'fn', fn: function (c, t) {element(c, el, t);}});
  }
  function applyScene(def) {
    if (!TARGETS.has(def.id) || def.__akiEnvironmentArt) return false;
    const original = def.init;
    def.init = function (S) {
      if (original) original.call(this, S);
      let villageHouseIndex = 0;
      const replace = function (arr) {
        if (!Array.isArray(arr)) return arr;
        return arr.map(function (el) {
          const index = sceneHouseIndex(el);
          return decorate(el, def.id, index, S);
        });
      };
      function sceneHouseIndex(el) {
        if (def.id === 'village' && el.k === 'fn' && el.p === 0.86) return villageHouseIndex++;
        return -1;
      }
      S.bg = replace(S.bg);
      S.els = replace(S.els);
    };
    Object.defineProperty(def, '__akiEnvironmentArt', {value: true});
    return true;
  }
  function install(scenes) {
    if (!Array.isArray(scenes)) throw new TypeError('install expects SCENES array');
    let count = 0;
    scenes.forEach(function (s) { if (applyScene(s)) count++; });
    return count;
  }
  function clearCache() { CACHE.clear(); cacheBytes = 0; }
  host.AkiEnvironmentArt = Object.freeze({
    install: install, clearCache: clearCache,
    ids: Object.freeze(Array.from(TARGETS)),
    getCacheStats: function () {return {sprites: CACHE.size, bytes: cacheBytes};}
  });
})(typeof window !== 'undefined' ? window : globalThis);
