/* Aki Hana — finale-only painterly overlays (scenes 17–22).
 * No runtime dependencies. Does not change the camera, animation, dialogue or sound.
 * Integration contract: AkiFinaleArt.install({ scenes: SCENES, hooks: { L, camAt, rng } }).
 * Call before makeInst(); the preview harness can re-create an existing instance.
 */
(function (global) {
  'use strict';
  const IDS = ['memory', 'hope', 'friends', 'together', 'done', 'night'];
  const WIDTH = 1920, HEIGHT = 1080, TAU = Math.PI * 2;
  const installations = new WeakMap();
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = v => (1 - Math.cos(Math.PI * clamp(v))) * 0.5;
  const progress = (t, a, b) => ease((t - a) / (b - a));
  const lerp = (a, b, v) => a + (b - a) * v;

  function ellipse(ctx, x, y, rx, ry, fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function halo(ctx, x, y, rx, ry, rgb, strength) {
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(' + rgb + ',' + (strength * 0.54) + ')');
    g.addColorStop(0.35, 'rgba(' + rgb + ',' + (strength * 0.24) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  function line(ctx, color, width, points) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  }
  function leaf(ctx, x, y, scale, angle, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-6, -13, -19, -14, -25, -4);
    ctx.bezierCurveTo(-17, 9, -7, 8, 0, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,227,166,.30)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-21, -4); ctx.stroke(); ctx.restore();
  }
  function flower(ctx, x, y, scale, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.strokeStyle = '#78955d'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -14, 0, -25); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      ellipse(ctx, Math.cos(a) * 5, -25 + Math.sin(a) * 5, 5.5, 3.8, col);
    }
    ellipse(ctx, 0, -25, 3.2, 3.2, '#f8dc8b'); ctx.restore();
  }
  // Subtle watercolour on top of the existing picture; no full-screen blur/filter.
  function veil(ctx, top, bottom, alpha) {
    const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.fillStyle = g; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.restore();
  }
  function edgeLight(ctx, rgb, intensity) {
    halo(ctx, 310, 130, 850, 640, rgb, intensity);
    halo(ctx, 1750, 810, 650, 540, rgb, intensity * 0.32);
  }

  function cottageArt(ctx, t, building, lit) {
    const fr = building.frame ?? 1;
    const wall = building.walls ?? 1;
    const beam = building.beam ?? 1;
    const roof = building.roof ?? 1;
    const decor = building.decor ?? 1;

    // Rounded pale timber and visible hand-painted growth rings follow the
    // source renderer's *existing* frame and reveal states.
    if (fr > 0.01) {
      ctx.save(); ctx.globalAlpha *= fr * 0.67;
      for (const px of [-110, 110]) {
        line(ctx, '#d4ab75', 2.8, [[px - 3, -16], [px - 3, -136]]);
        line(ctx, '#7d5936', 1.2, [[px + 4, -19], [px + 4, -132]]);
        ellipse(ctx, px, -145, 6.5, 3, '#c69c68', 0.82);
      }
      ctx.restore();
    }
    for (let r = 0; r < 9; r++) {
      const visible = clamp(wall * 9 - r);
      if (visible <= 0) continue;
      const y = -18 - r * 14;
      ctx.save(); ctx.globalAlpha *= 0.58 * visible;
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -103 : 48;
        line(ctx, '#e9bb80', 1.5, [[x0, y - 3], [x0 + 46, y - 3.5], [x0 + 55, y - 2]]);
        line(ctx, '#5a3f2e', 0.85, [[x0 + 10, y + 3], [x0 + 27, y + 2.7], [x0 + 38, y + 4]]);
      }
      ctx.restore();
    }
    if (beam > 0.12) {
      ctx.save(); ctx.globalAlpha *= clamp(beam) * 0.85;
      line(ctx, '#d5a873', 3, [[-38, -267], [38, -267]]);
      ctx.restore();
    }

    // Curved eaves and staggered leaf-shingles preserve the original build
    // order; they never appear before the roof is present.
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(roof * 2) * 0.93;
      ctx.lineWidth = 5; ctx.strokeStyle = '#d9b66d'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-173, -147); ctx.quadraticCurveTo(-107, -137, -35, -146);
      ctx.quadraticCurveTo(65, -131, 173, -147); ctx.stroke();
      line(ctx, 'rgba(92,73,43,.72)', 1.5, [[-168, -141], [-80, -139], [0, -139], [86, -139], [166, -142]]);
      for (let row = 0; row < 7; row++) {
        const shown = clamp(roof * 8 - row);
        if (!shown) continue;
        const fy = -156 - row * 13;
        const half = 155 - row * 14;
        ctx.globalAlpha = shown * 0.52;
        for (let j = 0; j < 8; j++) {
          const px = -half + (2 * half / 7) * j + (row % 2 ? 9 : 0);
          leaf(ctx, px, fy + Math.sin(j * 2 + row) * 3, 0.45, j % 2 ? -0.5 : 0.3,
            row % 3 === 0 ? '#dfb96d' : (row % 3 === 1 ? '#c99855' : '#9a9a54'));
        }
      }
      ctx.restore();
    }

    if (wall > 0.75) {
      // Two inviting shuttered windows; source doorway and noren stay intact.
      const alpha = clamp((wall - 0.75) * 4);
      ctx.save(); ctx.globalAlpha *= alpha;
      for (const side of [-1, 1]) {
        const cx = side * 75;
        if (lit) halo(ctx, cx, -87, 48, 52, '255,183,90', 0.73);
        ctx.fillStyle = '#614633'; ctx.beginPath(); ctx.roundRect(cx - 18, -108, 36, 40, 9); ctx.fill();
        const glass = ctx.createLinearGradient(cx - 15, -101, cx + 18, -68);
        glass.addColorStop(0, lit ? '#ffe9b0' : '#bbd4c5');
        glass.addColorStop(1, lit ? '#efa665' : '#668a80');
        ctx.fillStyle = glass; ctx.beginPath(); ctx.roundRect(cx - 13, -103, 26, 30, 6); ctx.fill();
        line(ctx, '#866943', 2.4, [[cx, -101], [cx, -74]]);
        line(ctx, '#866943', 2, [[cx - 12, -87], [cx + 12, -87]]);
        line(ctx, '#d9b47a', 2.2, [[cx - 20, -110], [cx - 20, -68], [cx + 20, -68]]);
        line(ctx, '#c59e72', 2.4, [[cx - 21, -67], [cx + 21, -67]]);
        if (lit) ellipse(ctx, cx - 5, -96, 3.8, 2.8, '#fff4d5', 0.8);
      }
      ctx.restore();
    }
    // Gabled front and fragrant flowers grow only after the decorations phase.
    if (decor > 0.25 && roof > 0.8) {
      const a = clamp((decor - 0.25) * 2);
      ctx.save(); ctx.globalAlpha *= a;
      for (let i = 0; i < 5; i++) {
        const x = -155 + i * 78;
        leaf(ctx, x, -143 + Math.sin(i * 1.6) * 4, 0.43, i * 0.5, i % 2 ? '#c56d38' : '#c88c3b');
      }
      ctx.restore();
    }
  }
  function garden(ctx, amount, isNight) {
    ctx.save(); ctx.globalAlpha *= amount;
    for (let i = 0; i < 6; i++) {
      const x = -200 + i * 80, y = 5 + (i % 2) * 4;
      ellipse(ctx, x, y, 32, 6, '#403629', 0.12);
      leaf(ctx, x - 9, y, 0.68, i % 2 ? 1 : 0.6, i % 3 ? '#b4763c' : '#9e7e3b');
      if (i % 2 === 0) flower(ctx, x + 16, y + 7, 0.86, isNight ? '#d4b0d1' : '#eaa3a9');
    }
    ctx.restore();
  }
  function bearCabinArt(ctx, t) {
    ctx.save(); ctx.translate(960, 900); ctx.scale(2.4, 2.4);
    halo(ctx, 46, -94, 140, 118, '255,211,157', 0.13);
    line(ctx, '#dbb783', 2, [[-144, -117], [-2, -207], [145, -117]]);
    line(ctx, 'rgba(243,202,139,.55)', 2, [[-107, -89], [108, -89]]);
    for (let i = 0; i < 5; i++) {
      const x = -90 + i * 40;
      ellipse(ctx, x, -21, 15, 2, '#d6b28a', 0.33);
    }
    if (t > 4) {
      const d = progress(t, 1.5, 12);
      halo(ctx, -60, -140, 100, 70, '246,213,162', d * 0.23);
      leaf(ctx, -138, -113, 0.8, -0.4, '#bb8041');
    }
    ctx.restore();
  }
  function handTools(ctx, t) {
    // Painted wood curls and an extra rounded mallet on the worksite floor.
    for (let i = 0; i < 7; i++) {
      const x = 740 + i * 33, y = 914 + (i % 3) * 9;
      line(ctx, 'rgba(156,98,49,.45)', 1.8,
        [[x - 6, y], [x + 4, y - 5], [x + 8, y - 2], [x + 5, y + 3]]);
    }
    if (t < 7.4) {
      ctx.save(); ctx.translate(1484, 908); ctx.rotate(-0.44);
      line(ctx, '#92673e', 9, [[-12, 1], [58, 1]]);
      line(ctx, '#e0ad73', 2.7, [[-5, -2], [50, -2]]);
      ctx.fillStyle = '#946948'; ctx.beginPath(); ctx.roundRect(-19, -18, 27, 34, 10); ctx.fill();
      line(ctx, '#d6ad7e', 2, [[-16, -10], [4, -10]]);
      ctx.restore();
    }
    // The cub's grip follows EXACTLY the original joint angles / hammerStroke
    // animation; only tiny finger highlights are added, never a new mallet pose.
    if (t > 7.4 && t < 13.8) {
      const p = (t * 1.6) % 1;
      const swing = p < 0.48 ? ease(p / 0.48) : p < 0.7 ? 1 - Math.pow((p - 0.48) / 0.22, 3) : 0;
      const a0 = lerp(-1.1, -0.48, swing), a1 = lerp(-0.95, -0.55, swing);
      const gx = 8 + Math.sin(a0) * 17 + Math.sin(a1) * 16;
      const gy = -82 + Math.cos(a0) * 17 + Math.cos(a1) * 16;
      const wx = 1360 - gx * 1.9, wy = 905 + gy * 1.9;
      ellipse(ctx, wx, wy + 1.5, 8.5, 6.2, '#74523a', 0.95);
      line(ctx, 'rgba(219,179,141,.78)', 1.8,
        [[wx - 5, wy - 1], [wx + 2, wy - 2.8], [wx + 6, wy - 0.3]]);
    }
  }
  function makeFriendsGround(ctx, t) {
    const move = Math.max(0, t - 8.8) * 150;
    const spots = [
      [560 + (t < 4 ? lerp(-680, 0, ease(t / 4)) : move), 880, 92, '242,175,111'],
      [760 + move, 880, 76, '240,185,132'],
      [t < 4 ? 2150 : t < 8.8 ? lerp(2150, 1000, ease((t - 4) / 4.4)) : 1000 + move, 885, 118, '233,169,114'],
    ];
    spots.forEach(([x, y, rad, col]) => {
      halo(ctx, x, y - 34, rad, 125, col, 0.1);
      ellipse(ctx, x, y + 3, rad * 0.9, 11, '#705747', 0.13);
    });
  }
  function finishScene(ctx, id, t, hooks) {
    ctx.save();
    if (id === 'memory') {
      // Lift the inherited very dark vignette; keep the nostalgic softness.
      veil(ctx, 'rgba(255,231,196,.20)', 'rgba(178,136,113,.05)', 0.55);
      halo(ctx, 900, 365, 620, 480, '255,221,176', 0.16);
    } else if (id === 'hope') {
      const k = progress(t, 2.5, 7.5);
      halo(ctx, 1180, 300, 1100, 760, '255,222,158', 0.15 + k * 0.20);
      veil(ctx, 'rgba(255,246,218,.10)', 'rgba(255,208,153,.02)', 0.54);
    } else if (id === 'friends') {
      edgeLight(ctx, '255,226,177', 0.13);
    } else if (id === 'together') {
      halo(ctx, 950, 210, 970, 720, '255,213,162', 0.12);
    } else if (id === 'done') {
      // Little touches of early blue hour between golden windows.
      veil(ctx, 'rgba(125,143,188,.09)', 'rgba(255,195,133,.02)', 0.55);
      halo(ctx, 1465, 510, 430, 290, '255,181,99', 0.12);
    } else if (id === 'night') {
      // Gently raise the darkest forests without losing moonlit depth.
      veil(ctx, 'rgba(66,95,159,.22)', 'rgba(53,84,132,.10)', 0.56);
      halo(ctx, 1375, 185, 550, 510, '181,206,255', 0.25);
      halo(ctx, 990, 800, 890, 290, '107,141,202', 0.16);
      if (hooks && hooks.L && hooks.camAt && hooks.rng) {
        const cam = hooks.camAt(t, [[0, { y: 90, d: 0.12, x: 0 }], [16, { y: -420, d: 0, x: 20 }], [22, { y: -460, d: 0, x: 20 }]], 0.5);
        hooks.L(ctx, cam, 0.45, x => {
          const r = hooks.rng(9);
          for (let i = 0; i < 4; i++) {
            const hx = 760 + i * 120 + r.r(-20, 20), hy = 820 + r.r(-8, 8);
            halo(x, hx, hy - 12, 90, 70, '255,184,110', 0.3 + Math.sin(t * 1.5 + i) * 0.03);
            ellipse(x, hx - 5, hy - 16, 5, 3, '#ffeac0', 0.57);
          }
        });
      }
    }
    ctx.restore();
  }

  function install(config) {
    const scenes = config && config.scenes;
    if (!Array.isArray(scenes)) throw new TypeError('AkiFinaleArt: scenes array required');
    if (installations.has(scenes)) return installations.get(scenes);
    const found = IDS.map(id => scenes.find(s => s.id === id));
    if (found.some(s => !s)) throw new Error('AkiFinaleArt: six finale scenes required');
    const originals = [];
    const control = {
      enabled: config.enabled !== false,
      setEnabled(value) { control.enabled = !!value; return control.enabled; },
      uninstall() {
        for (const [scene, init, draw] of originals) { scene.init = init; scene.draw = draw; }
        installations.delete(scenes);
      },
    };

    for (const scene of found) {
      const id = scene.id, init = scene.init, draw = scene.draw;
      originals.push([scene, init, draw]);
      scene.init = function finaleInit(S) {
        if (init) init.call(scene, S);
        if (!S.els) return;
        for (const e of S.els) {
          if (e.k !== 'fn') continue;
          const baseFn = e.fn;
          if (id === 'memory' && Math.abs(e.p - 1.0001) < 0.00001) {
            e.fn = (c, t) => { baseFn(c, t); if (control.enabled) bearCabinArt(c, t); };
          } else if (id === 'friends' && Math.abs(e.p - 0.95) < 0.00001) {
            e.fn = (c, t) => {
              if (control.enabled) { c.save(); makeFriendsGround(c, t); c.restore(); }
              baseFn(c, t);
            };
          } else if ((id === 'together' || id === 'done') && Math.abs(e.p - 1.0005) < 0.00001) {
            e.fn = (c, t) => {
              baseFn(c, t);
              if (!control.enabled) return;
              const x = id === 'done' ? 1350 : 960;
              const house = id === 'done' ? { lit: true } : {
                frame: progress(t, 0.2, 1.6), walls: clamp((t - 1.2) / 6.2),
                beam: progress(t, 7.6, 9.4), roof: clamp((t - 8.2) / 5.4),
                decor: clamp((t - 14.6) / 6.9),
              };
              c.save(); c.translate(x, 900); c.scale(1.9, 1.9);
              cottageArt(c, t, house, id === 'done');
              garden(c, id === 'done' ? 1 : (house.decor || 0), id === 'done');
              c.restore();
            };
          } else if (id === 'together' && Math.abs(e.p - 1.001) < 0.00001) {
            e.fn = (c, t) => {
              baseFn(c, t);
              if (control.enabled) { c.save(); handTools(c, t); c.restore(); }
            };
          }
        }
      };
      scene.draw = function finaleDraw(c, t, S, dt) {
        draw.call(scene, c, t, S, dt);
        if (control.enabled) finishScene(c, id, t, config.hooks);
      };
    }
    installations.set(scenes, control);
    return control;
  }
  global.AkiFinaleArt = Object.freeze({ install, scenes: IDS.slice() });
})(typeof window !== 'undefined' ? window : globalThis);
