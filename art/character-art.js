/* Aki Hana · Character Art B — independent, opt-in Canvas 2D painter.
 * No scene, audio, animation or transition state is mutated here.
 * Classic script: window.CharacterArt. Node: require('./character-art.js').
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const SCENES = Object.freeze(['watch', 'hare', 'squirrel', 'bear', 'doubt']);
  const sceneSet = new Set(SCENES);
  let enabled = false;
  const palettes = Object.freeze({
    fox: { fur: '#d97839', light: '#f8b77c', shade: '#9a4527', ivory: '#fff0d5', ear: '#ae664c', dark: '#442b28' },
    hare: { fur: '#ba9775', light: '#e2c9a7', shade: '#81614e', ivory: '#f8efe1', ear: '#d99e9a', dark: '#57403b' },
    squirrel: { fur: '#997760', light: '#d5b69a', shade: '#5c453b', ivory: '#f9e8d1', ear: '#aa775f', dark: '#48312d' },
    bear: { fur: '#79533e', light: '#b58868', shade: '#493226', ivory: '#e8c2a0', ear: '#8a584a', dark: '#332521' }
  });
  const range = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
  const angle = (x, y, l, a) => [x + Math.cos(a) * l, y + Math.sin(a) * l];
  const between = (a, b, t) => a + (b - a) * t;

  function gradient(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (const [at, value] of stops) g.addColorStop(at, value);
    return g;
  }
  function oval(c, x, y, rx, ry, color, rot = 0) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
    c.fillStyle = color; c.fill();
  }
  function softOval(c, x, y, rx, ry, base, highlight, dark, rot = 0) {
    oval(c, x, y, rx, ry, gradient(c, x - rx, y - ry, x + rx, y + ry,
      [[0, highlight], [0.46, base], [1, dark]]), rot);
  }
  function blob(c, points, fill) {
    const n = points.length;
    if (n < 3) return;
    c.beginPath();
    c.moveTo((points[0][0] + points[n - 1][0]) / 2, (points[0][1] + points[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = points[i], q = points[(i + 1) % n];
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c.closePath(); c.fillStyle = fill; c.fill();
  }
  function curve(c, x0, y0, x1, y1, x2, y2, width, color) {
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x1, y1, x2, y2); c.stroke();
  }
  function tuft(c, x, y, direction, color, size = 1) {
    c.save(); c.translate(x, y); c.rotate(direction);
    blob(c, [[-3 * size, 3 * size], [-3 * size, -2 * size],
      [0, -8 * size], [2 * size, -3 * size], [3 * size, 4 * size]], color);
    c.restore();
  }
  function shine(c, x, y, rx, ry) {
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(255,246,220,0.20)');
    g.addColorStop(1, 'rgba(255,246,220,0)');
    oval(c, x, y, rx, ry, g);
  }
  function eyes(c, x, y, s, pose, kind) {
    const open = range(pose.eye == null ? 1 : pose.eye, 0, 1);
    const t = Number(pose.t) || 0;
    const blink = pose.noBlink ? 1 : (Math.abs(((t + (pose.seed || 3) * 1.7) % 4.4) - 0.12) < 0.10 ? 0.14 : 1);
    const eyeOpen = Math.max(0.05, open * blink);
    const sadness = range(pose.sad || 0, 0, 1);
    oval(c, x, y, 5.5 * s, Math.max(0.6, 5.8 * s * eyeOpen), '#fff4dc', -0.12);
    if (eyeOpen > 0.19) {
      oval(c, x + 0.5 * s + (pose.look || 0) * s, y + 0.3 * s,
        3.55 * s, 4.7 * s * eyeOpen, kind === 'fox' ? '#9c642f' : '#805643');
      oval(c, x + 0.9 * s + (pose.look || 0) * s, y + 0.6 * s,
        2.25 * s, 3.6 * s * eyeOpen, '#261a19');
      oval(c, x + 1.2 * s, y - 1.8 * s, 1.15 * s, 1.5 * s, '#fffef4');
      oval(c, x - 1.2 * s, y + 2 * s, 0.55 * s, 0.75 * s, 'rgba(255,255,255,0.65)');
    }
    // The upper lid is softer than a heavy black contour; sadness lowers its outside corner.
    curve(c, x - 5.2 * s, y - 2.5 * s * eyeOpen, x + 1 * s,
      y - 5.9 * s * eyeOpen - sadness * s,
      x + 5.3 * s, y - 2.3 * s * eyeOpen + sadness * 2.2 * s,
      1.3 * s, '#715043');
    curve(c, x - 5.8 * s, y - 8.3 * s, x - 0.3 * s,
      y - (9.4 + sadness * 1.6) * s,
      x + 6 * s, y - (8.1 - sadness * 2.2) * s, 1.65 * s, '#714b3b');
  }
  function paw(c, x, y, r, color) {
    oval(c, x, y, r * 1.24, r * 0.91, color, -0.08);
    c.strokeStyle = 'rgba(68,36,30,0.20)'; c.lineWidth = 0.6;
    for (let i = -1; i <= 1; i++) {
      c.beginPath(); c.moveTo(x + i * r * 0.40, y + r * 0.15);
      c.lineTo(x + i * r * 0.40 - 0.3, y + r * 0.52); c.stroke();
    }
  }
  function joint(c, x0, y0, x1, y1, x2, y2, width, col, hi) {
    curve(c, x0, y0, x1, y1, x2, y2, width + 1.8, col);
    curve(c, x0 - 0.75, y0 - 1.3, x1 - 1, y1 - 1, x2 - 0.4, y2 - 1,
      Math.max(1.5, width * 0.38), hi);
  }
  function held(c, pose, wrist, radius, color, rotate = 0) {
    if (!pose.item || typeof pose.item !== 'function') {
      paw(c, wrist[0], wrist[1], radius, color);
      return;
    }
    // The handle's local origin is the wrist. It is painted AFTER the forearm,
    // BEFORE the paw: visually enclosed by the fingers rather than floating behind.
    c.save();
    c.translate(wrist[0], wrist[1]); c.rotate(rotate);
    pose.item(c, rotate); c.restore();
    paw(c, wrist[0], wrist[1], radius, color);
  }
  function castShadow(c, x, y, scale, kind, o) {
    if (o.shadow === 0) return;
    const w = ({ fox: 62, hare: 36, squirrel: 21, bear: 51 })[kind] || 40;
    const alpha = range(o.shadow == null ? 1 : o.shadow, 0, 1) * 0.26;
    c.save(); c.translate(x, y); c.scale(scale, scale);
    const g = c.createRadialGradient(0, 0, 2, 0, 0, w);
    g.addColorStop(0, 'rgba(50,30,23,' + alpha + ')');
    g.addColorStop(1, 'rgba(50,30,23,0)');
    c.save(); c.scale(1, 0.19); oval(c, 0, 0, w, w, g); c.restore(); c.restore();
  }

  function foxHead(c, p) {
    const P = palettes.fox, sad = range(p.sad || 0, 0, 1);
    const ear = p.ear || 0;
    c.save(); c.translate(-7, -11); c.rotate(-0.20 - ear * 0.45);
    blob(c, [[-8, 4], [-8, -12], [-3, -31], [3, -28], [9, -2]], P.shade);
    blob(c, [[-4, -2], [-2, -21], [1, -25], [4, -4]], P.ear); c.restore();
    softOval(c, -2, 1, 21.5, 20.5, P.fur, P.light, P.shade, -0.16);
    softOval(c, 8.0, 6, 17.5, 12.7, P.ivory, '#fff9ec', '#e7ba9a', 0.10);
    blob(c, [[5, -1], [20, -1], [35, 7], [33, 14], [14, 16], [0, 8]], P.fur);
    blob(c, [[8, 9], [19, 5], [35, 8], [28, 16], [9, 15]], P.ivory);
    tuft(c, -17, 9, -0.9, P.ivory, 0.9);
    tuft(c, -17, 15, -1.25, P.light, 0.65);
    c.save(); c.translate(-7, -10); c.rotate(-0.05 - ear * 0.46);
    blob(c, [[-8, 3], [-7, -16], [0, -34], [7, -26], [10, 3]], P.fur);
    blob(c, [[-3, -1], [-2, -19], [1, -27], [5, -7]], '#e6a3a0'); c.restore();
    eyes(c, 11, -3.6, 1.07, p, 'fox');
    oval(c, 33.5, 8.6, 4.1, 3, P.dark, -0.1);
    oval(c, 32.5, 7.6, 1.3, 0.7, '#fff3e1');
    curve(c, 30, 12, 26, 15.6 + sad * 1.4, 21, 13 + sad * 2.2 - (p.smile || 0) * 2,
      1.1, '#765046');
    shine(c, -9, -5, 14, 10);
  }
  function foxTail(c, dx, dy, wag) {
    const P = palettes.fox;
    c.save(); c.translate(dx, dy); c.rotate(wag);
    curve(c, -3, -9, -45, -25, -80, -4, 24, P.shade);
    curve(c, -9, -13, -52, -18, -78, -4, 20, P.fur);
    blob(c, [[-67, -15], [-83, -14], [-100, -1], [-83, 8], [-65, 2]], P.ivory);
    tuft(c, -97, -1, -1.45, '#fff7e8', 0.8);
    c.restore();
  }
  function fox(c, p) {
    const P = palettes.fox, mode = p.mode || 'sit', t = p.t || 0, br = Math.sin(t * 1.9) * (p.breath ?? 1);
    const wag = Math.sin(t * (p.wagSp || 3)) * (p.wag || 0) * 0.08;
    if (mode === 'back') {
      foxTail(c, 9, -16, -1 + wag);
      softOval(c, 0, -43, 30, 46, P.fur, P.light, P.shade);
      softOval(c, 0, -87 + br, 21, 24, P.fur, P.light, P.shade);
      const ear = p.ear || 0;
      for (const side of [-1, 1]) {
        c.save(); c.translate(side * 12, -104); c.rotate(side * (0.3 + ear * 0.3));
        blob(c, [[-8, 4], [-7, -13], [0, -29], [7, -14], [8, 4]], P.fur);
        blob(c, [[-3, -5], [0, -23], [3, -7]], P.ear); c.restore();
      }
      // Over-the-shoulder turn stays subtle: avoid an upside-down second face.
      if (Math.abs(p.turn || 0) > 0.15) {
        c.save(); c.globalAlpha = Math.min(0.8, Math.abs(p.turn) * 0.8);
        oval(c, Math.sign(p.turn) * 16, -82, 9, 12, P.ivory); c.restore();
      }
      shine(c, -8, -58, 20, 30);
      return;
    }
    if (mode === 'sit' || mode === 'lie') {
      foxTail(c, -23, -11, wag);
      softOval(c, -12, -29, 25, 30, P.fur, P.light, P.shade);
      softOval(c, 3, -59 + br * 0.4, 20, 37, P.fur, P.light, P.shade, -0.20);
      oval(c, 10, -44, 10, 22, P.ivory, -0.15);
      joint(c, 13, -35, 13, -20, 16, -5, 8, P.shade, P.fur);
      paw(c, 18, -3, 5, P.fur);
      const hx = 22 + (p.hx || 0), hy = (mode === 'lie' ? -24 : -104) + (p.hy || 0) + br * 0.3;
      c.save(); c.translate(hx, hy); c.rotate(-(p.head || 0)); foxHead(c, p); c.restore();
      return;
    }
    // Standing/walking: all positions stay on the original baseline.
    const step = Number(p.walk) || 0;
    const swing = p.walk == null ? 0 : Math.sin(step) * 8;
    foxTail(c, -33, -46, -0.25 + wag);
    joint(c, -35, -47, -38 + swing, -24, -30 + swing, -4, 12, P.shade, P.fur);
    joint(c, 18, -45, 20 - swing, -25, 19 - swing, -4, 9, P.shade, P.light);
    softOval(c, -5, -51, 49, 24, P.fur, P.light, P.shade);
    softOval(c, 24, -59, 23, 26, P.fur, P.light, P.shade);
    oval(c, 26, -45, 14, 12, P.ivory);
    joint(c, -26, -47, -26 - swing, -25, -23 - swing, -4, 10, P.fur, P.light);
    joint(c, 28, -45, 29 + swing, -25, 31 + swing, -4, 10, P.fur, P.light);
    const hx = 47 + (p.hx || 0), hy = -84 + (p.hy || 0);
    c.save(); c.translate(hx, hy); c.rotate(-(p.head || 0)); foxHead(c, p); c.restore();
  }

  function hareHead(c, p) {
    const P = palettes.hare, flex = p.ear || 0, twitch = p.twitch ? Math.sin((p.t || 0) * 7) * 0.05 : 0;
    for (const [x, base, shade] of [[2, -0.18, P.shade], [-7, -0.36, P.fur]]) {
      c.save(); c.translate(x, -9); c.rotate(base - flex * 0.58 + twitch);
      // Curved Bézier ears, not straight rigid cones.
      blob(c, [[-5, 2], [-9, -12], [-7, -36], [-2, -51], [5, -45], [6, -15], [6, 2]], shade);
      blob(c, [[-3, -6], [-4, -30], [-1, -44], [2, -30], [3, -7]], '#d8a0a0'); c.restore();
    }
    softOval(c, 0, 0, 16.8, 16, P.fur, P.light, P.shade);
    softOval(c, 9, 6, 12.8, 10, P.ivory, '#fff8ec', '#d7b6a1');
    oval(c, 21, 6.5, 2, 1.4, '#966e67');
    eyes(c, 5.8, -3.4, 0.78, p, 'hare');
    oval(c, -8, 8, 5, 4, 'rgba(255,217,204,0.25)');
    shine(c, -4, -7, 12, 11);
  }
  function hare(c, p) {
    const P = palettes.hare, mode = p.mode || 'sit';
    const lean = range(p.lean || 0, 0, 1), up = mode === 'up';
    const hx = (up ? between(5, 30, lean) : 26 + (p.stretch || 0) * 8) + (p.hx || 0);
    const hy = (up ? between(-76, -55, lean) : -51 + (p.stretch || 0) * 12) + (p.hy || 0);
    softOval(c, -10, -18, 21, 19, P.fur, P.light, P.shade);
    softOval(c, up ? -5 : 2, up ? -50 : -30, up ? 19 : 17, up ? 37 : 24,
      P.fur, P.light, P.shade, -0.15);
    oval(c, up ? 8 : 10, up ? -48 : -25, 10, up ? 26 : 15, P.ivory, -0.15);
    oval(c, -29, -20, 6, 7, '#f3e3d2');
    joint(c, -14, -12, -1, -5, 14, -2, 10, P.fur, P.light);
    paw(c, 14, -3, 4, P.fur);
    const sh = up ? [4, -53] : [12, -30];
    const arm = p.arm || (up ? [0.9 - lean * 0.5, 0.4] : [0.4, 1.0]);
    const elbow = angle(sh[0], sh[1], 12, arm[0]);
    const hand = angle(elbow[0], elbow[1], 11, arm[1]);
    joint(c, sh[0], sh[1], elbow[0], elbow[1], hand[0], hand[1], 7, P.fur, P.light);
    held(c, p, hand, 3.7, P.fur);
    c.save(); c.translate(hx, hy); c.rotate(-(p.head || 0)); hareHead(c, p); c.restore();
  }

  function squirrelHead(c, p) {
    const P = palettes.squirrel;
    softOval(c, 0, 0, 10.6, 10.3, P.fur, P.light, P.shade);
    softOval(c, 7, 3, 8.8, 6, P.ivory, '#fff7e9', '#dcb998');
    c.save(); c.translate(-4, -7); c.rotate(-(p.ear || 0) * 0.4);
    blob(c, [[-5, 3], [-5, -7], [-2, -16], [3, -9], [4, 4]], P.fur);
    blob(c, [[-2, -2], [-2, -10], [1, -5]], '#ddaca1');
    tuft(c, -2, -10, 0.1, P.shade, 0.7); c.restore();
    eyes(c, 5.8, -1.9, 0.53, p, 'squirrel');
    oval(c, 16, 3, 1.4, 1.05, P.dark);
    shine(c, -4, -3, 7, 8);
  }
  function squirrelTail(c, run, t, P) {
    const twitch = Math.sin(t * 3.1) * (P.tailFlick ?? 1);
    c.save();
    if (run) {
      blob(c, [[-10, -13], [-23, -28], [-46, -30], [-58, -41 + twitch * 2],
        [-62, -24 + twitch], [-53, -11], [-30, -6], [-14, -7]],
      gradient(c, -61, -45, -13, -4, [[0, palettes.squirrel.light], [0.55, palettes.squirrel.fur], [1, palettes.squirrel.shade]]));
    } else {
      blob(c, [[-7, -9], [-26, -16], [-33, -32], [-32, -52],
        [-21, -62 + twitch], [-8, -58 + twitch], [-8, -47],
        [-17, -35], [-15, -20]],
      gradient(c, -38, -59, -10, -5, [[0, palettes.squirrel.light], [0.48, palettes.squirrel.fur], [1, palettes.squirrel.shade]]));
    }
    const tips = run ? [[-58, -36], [-57, -25]] : [[-21, -57], [-29, -48]];
    for (const [x, y] of tips) tuft(c, x, y, -0.4, palettes.squirrel.light, 0.43);
    c.restore();
  }
  function squirrel(c, p) {
    const P = palettes.squirrel, t = p.t || 0, run = (p.mode || 'up') !== 'up';
    squirrelTail(c, run, t, p);
    if (run) {
      const g = p.run ?? t * 9, stride = Math.sin(g) * 6;
      joint(c, -12, -13, -18 + stride, -3, -23 + stride, 0, 5.8, P.shade, P.fur);
      joint(c, 7, -15, 12 - stride, -6, 17 - stride, -2, 4.8, P.shade, P.fur);
      softOval(c, -1, -16, 20, 10.5, P.fur, P.light, P.shade);
      oval(c, 1, -10, 13, 4.8, P.ivory);
      joint(c, 1, -12, 12 + stride, -6, 19 + stride, -2, 4.5, P.fur, P.light);
      c.save(); c.translate(16, -22); c.rotate(-(p.head || 0)); squirrelHead(c, p); c.restore();
      return;
    }
    const nib = p.nibble ? Math.sin(t * 18) * 0.8 : 0;
    softOval(c, -4, -11, 12.5, 15.5, P.fur, P.light, P.shade);
    softOval(c, 2, -26, 10, 18, P.fur, P.light, P.shade);
    oval(c, 7, -24, 5.5, 15.2, P.ivory, -0.1);
    joint(c, -8, -6, -2, -1, 4, -1, 4.5, P.shade, P.fur);
    const sh = [4, -27], arm = p.arm || [1.15, 0.25];
    const elbow = angle(sh[0], sh[1], 6, arm[0]), hand = angle(elbow[0], elbow[1], 6, arm[1]);
    joint(c, sh[0], sh[1], elbow[0], elbow[1], hand[0], hand[1], 4, P.fur, P.light);
    held(c, p, [hand[0], hand[1] + nib], 2.5, P.fur);
    c.save(); c.translate(8 + (p.hx || 0), -39 + (p.hy || 0) + nib * 0.3);
    c.rotate(-(p.head || 0)); squirrelHead(c, p); c.restore();
  }

  function bearHead(c, p) {
    const P = palettes.bear;
    oval(c, 4, -19, 9, 9, P.shade);
    oval(c, -9, -17, 10, 10, P.shade);
    oval(c, 4, -19, 5.4, 5.6, P.ear);
    softOval(c, 0, 0, 26, 24, P.fur, P.light, P.shade);
    softOval(c, -15, 9, 12, 9, P.light, '#deb89a', P.fur);
    softOval(c, 17, 8, 19, 13, P.ivory, '#f5d6b4', '#b08b70');
    oval(c, 33, 5, 5.0, 3.5, P.dark);
    oval(c, 32.5, 3.6, 1.5, 0.9, '#f8e4cb');
    eyes(c, 10, -7, 0.89, p, 'bear');
    curve(c, 30, 12, 25, 17 - (p.smile || 0) * 2.1, 20, 13 - (p.smile || 0) * 1.7,
      1.3, '#6b493d');
    tuft(c, -23, 5, -0.8, P.light, 0.8);
    shine(c, -9, -5, 15, 14);
  }
  function bear(c, p) {
    const P = palettes.bear, mode = p.mode || 'sit';
    const sit = mode === 'sit', upright = mode === 'up' || sit;
    const br = Math.sin((p.t || 0) * 1.6) * 0.6;
    if (!upright) {
      const step = p.walk == null ? 0 : Math.sin(p.walk) * 7;
      joint(c, -33, -48, -33 + step, -24, -30 + step, -4, 18, P.shade, P.fur);
      joint(c, 23, -45, 25 - step, -23, 27 - step, -4, 17, P.shade, P.fur);
      softOval(c, -6, -52, 50, 32, P.fur, P.light, P.shade);
      softOval(c, 25, -52, 24, 29, P.fur, P.light, P.shade);
      joint(c, -25, -44, -27 - step, -23, -25 - step, -4, 17, P.fur, P.light);
      joint(c, 28, -45, 30 + step, -23, 32 + step, -4, 16, P.fur, P.light);
      c.save(); c.translate(54 + (p.hx || 0), -52 + (p.hy || 0));
      c.rotate(-(p.head || 0)); bearHead(c, p); c.restore();
      return;
    }
    const shift = sit ? 0 : -15, sh = [10, -62 + shift], arm = p.arm || [0.32, 0.75];
    const farm = p.farm || [arm[0] - 0.12, arm[1] - 0.10];
    const farElbow = angle(-1, -64 + shift, 18, farm[0]);
    const farWrist = angle(farElbow[0], farElbow[1], 16, farm[1]);
    joint(c, -1, -64 + shift, farElbow[0], farElbow[1], farWrist[0], farWrist[1],
      18, P.shade, P.fur);
    softOval(c, -8, -28 + shift * 0.3, sit ? 32 : 29, sit ? 34 : 41,
      P.fur, P.light, P.shade);
    softOval(c, 7, -58 + shift, 25, 33, P.fur, P.light, P.shade, -0.16);
    oval(c, 17, -30 + shift * 0.4, 18, sit ? 24 : 28, P.ivory, -0.16);
    shine(c, -12, -43, 21, 32);
    // Rounded haunches and near foot, not square articulated blocks.
    softOval(c, -14, -11, 22, 15, P.fur, P.light, P.shade);
    paw(c, 26, -7, 12, P.fur);
    const elbow = angle(sh[0], sh[1], 17, arm[0]);
    const wrist = angle(elbow[0], elbow[1], 16, arm[1]);
    joint(c, sh[0], sh[1], elbow[0], elbow[1], wrist[0], wrist[1], 18, P.fur, P.light);
    held(c, p, wrist, 10.2, P.fur);
    c.save(); c.translate(16 + (p.hx || 0), (sit ? -96 : -110) + (p.hy || 0) + br);
    c.rotate(-(p.head || 0)); bearHead(c, p); c.restore();
  }

  function drawCreature(c, kind, pose, x, y, scale = 1, options = {}) {
    if (!palettes[kind]) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale) || scale <= 0) return false;
    const p = pose || {}, o = options || {}, face = o.face == null ? 1 : o.face;
    castShadow(c, x, y, scale, kind, o);
    c.save();
    try {
      c.translate(x, y); if (o.rot) c.rotate(o.rot);
      c.scale(scale * face, scale);
      if (o.alpha != null) c.globalAlpha *= range(o.alpha, 0, 1);
      c.lineCap = 'round'; c.lineJoin = 'round';
      ({ fox, hare, squirrel, bear })[kind](c, p);
    } finally { c.restore(); }
    return true;
  }

  // Workshop props retain old anchors, so choreography and timing are unchanged.
  function mallet(swing = 0) {
    return function (c) {
      c.save(); c.rotate(-0.9 + swing);
      c.fillStyle = '#906848'; c.strokeStyle = '#6c4832'; c.lineWidth = 1.3;
      c.beginPath(); c.roundRect(-2.8, -29, 5.6, 31, 2.2); c.fill(); c.stroke();
      c.save(); c.translate(0, -29);
      c.fillStyle = gradient(c, -11, -7, 11, 7, [[0, '#cba47a'], [0.5, '#a7784e'], [1, '#70482f']]);
      c.beginPath(); c.roundRect(-12, -7, 24, 14, 5); c.fill();
      c.strokeStyle = 'rgba(84,48,28,0.5)'; c.stroke();
      oval(c, -5, -3, 5, 1.4, 'rgba(255,240,206,0.40)'); c.restore(); c.restore();
    };
  }
  function walnut() {
    return function (c) {
      softOval(c, 0, -1, 4.4, 4.2, '#98643e', '#cc955c', '#624126', 0.1);
      curve(c, -1.5, -4, 0, -2, 0.9, 2, 0.7, '#66412b');
    };
  }
  function stick(length = 44, rot = 0.4) {
    return function (c) {
      c.save(); c.rotate(rot);
      curve(c, -length / 2, 0, -2, -1, length / 2, 0, 3.7, '#856145');
      curve(c, -length / 2, -0.9, -2, -1.6, length / 2, -0.7, 1.1, '#d6b28d');
      curve(c, length * 0.12, -1, length * 0.23, -5, length * 0.28, -9,
        1.8, '#856145'); c.restore();
    };
  }
  function basket(c, cx, cy, scale = 1, nuts = 8) {
    c.save(); c.translate(cx, cy); c.scale(scale, scale);
    for (let i = 0; i < nuts; i++) {
      c.save(); c.translate(-18 + (i % 5) * 9, -27 - Math.floor(i / 5) * 5);
      walnut()(c); c.restore();
    }
    blob(c, [[-27, -28], [-23, 0], [23, 0], [27, -28]], gradient(c, -24, -22, 24, 0,
      [[0, '#d6aa72'], [0.5, '#b27e4f'], [1, '#8b5e3e']]));
    c.strokeStyle = 'rgba(109,67,36,0.36)'; c.lineWidth = 1.25;
    for (let i = -4; i <= 4; i++) {
      curve(c, i * 5, -26, i * 4.3, -14, i * 4.1, -2, 0.9, '#785238');
    }
    for (let row = -23; row < 0; row += 7) curve(c, -24, row, 0, row + 2, 24, row, 1.2, '#e6bd87');
    curve(c, -27, -27, 0, -32, 27, -27, 4, '#a66b40');
    c.restore();
  }
  function stool(c, fix = 1, t = 0) {
    const f = range(fix, 0, 1);
    c.save(); c.rotate(-(1 - f) * 0.32);
    for (const lx of [-24, 24]) {
      if (lx > 0 && f <= 0.5) continue;
      joint(c, lx, -32, lx - 1, -17, lx, -2, 8, '#845638', '#bb8960');
    }
    joint(c, -22, -13, 0, -14, 22, -13, 6, '#865d3e', '#c4936b');
    c.fillStyle = gradient(c, 0, -41, 0, -31, [[0, '#d7ae7b'], [1, '#926345']]);
    c.beginPath(); c.roundRect(-36, -41, 72, 12, 6); c.fill();
    c.restore();
    if (f <= 0.5) {
      c.save(); c.translate(between(52, 30, f * 2), between(-4, -22, f * 2));
      c.rotate(between(1.45, 0.3, f * 2));
      joint(c, 0, -16, 0, 0, 0, 14, 7, '#7e5135', '#c99b6e'); c.restore();
    }
  }
  function toolRack(c) {
    curve(c, -42, 0, 0, 1, 42, 0, 4.5, '#714d36');
    c.save(); c.translate(-28, 7);
    c.fillStyle = gradient(c, -12, 0, 12, 32, [[0, '#c6d2d2'], [1, '#83999d']]);
    blob(c, [[-5, 0], [5, 0], [11, 30], [1, 33]], c.fillStyle);
    c.fillStyle = '#a9764a'; c.beginPath(); c.roundRect(-5, -11, 10, 15, 4); c.fill();
    c.restore();
    c.fillStyle = '#bf996b'; c.beginPath(); c.roundRect(-8, 9, 26, 14, 4); c.fill();
    c.fillStyle = '#879797'; c.beginPath(); c.roundRect(4, 7, 4, 10, 1); c.fill();
    c.strokeStyle = '#c59b67'; c.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.ellipse(29, 17, 11 - i * 3, 13 - i * 3, 0, 0, TAU); c.stroke();
    }
  }
  const items = Object.freeze({ mallet, walnut, stick });
  const props = Object.freeze({ basket, stool, toolRack });
  function shouldRender(sceneId) { return enabled && sceneSet.has(sceneId); }
  function setEnabled(value) { enabled = Boolean(value); return enabled; }
  function createAdapter(legacy, getSceneId) {
    if (typeof legacy !== 'function' || typeof getSceneId !== 'function') {
      throw new TypeError('createAdapter requires (legacyCreature, getSceneId)');
    }
    return function characterArtAdapter(c, kind, pose, x, y, scale, options) {
      const id = getSceneId();
      if (shouldRender(id) && drawCreature(c, kind, pose, x, y, scale, options)) return;
      return legacy(c, kind, pose, x, y, scale, options);
    };
  }
  const API = Object.freeze({
    scenes: SCENES, setEnabled, isEnabled: () => enabled,
    shouldRender, createAdapter, drawCreature, items, props
  });
  root.CharacterArt = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
