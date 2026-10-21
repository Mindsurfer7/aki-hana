/* Aki Hana · Emotional art for scenes 11–16.
 * Classic-script adapter: load AFTER the director's inline script.
 * No scene timing, camera, audio, shared sprite, or base anatomy is replaced.
 * Idempotent, scene-scoped, and compatible with later character-art changes.
 */
(function (root) {
  'use strict';

  const OWNED = new Set(['decide', 'wind', 'offer', 'tired', 'bearcomes', 'talk']);
  const INSTALLED = new WeakSet();
  const clamp01 = value => Math.max(0, Math.min(1, value));
  const smooth = v => { const t = clamp01(v); return t * t * (3 - 2 * t); };
  const ease = (t, start, end) => smooth((t - start) / (end - start));
  const copies = pose => ({ ...pose });

  // Emotional corrections are intentionally local. Keep the existing base
  // silhouettes, walks, blinks, position, scale, props and designer lighting.
  function expression(id, kind, pose, time) {
    if (kind !== 'fox' && kind !== 'hare' && kind !== 'bear') return pose;
    const p = copies(pose);
    if (kind === 'fox') {
      switch (id) {
        case 'decide':
          p.eye = Math.max(p.eye ?? 1, 0.83);
          p.look = p.look ?? 0.38;
          p.smile = Math.max(p.smile ?? 0, 0.2);
          break;
        case 'wind': {
          const effort = typeof windState === 'function' ? windState(time).gust : 0;
          p.eye = Math.max(p.eye ?? 1, 0.55);
          p.sad = Math.min(p.sad ?? 0, 0.43);
          p.smile = 0.04 * (1 - effort);
          break;
        }
        case 'offer':
          // Proudly refusing help must not turn into an unnerving eyeless face.
          p.eye = Math.max(p.eye ?? 1, 0.3);
          p.sad = Math.min(p.sad ?? 0, 0.46);
          p.smile = Math.max(0, 0.12 * (1 - ease(time, 13, 16)));
          break;
        case 'tired':
          p.eye = Math.max(p.eye ?? 1, 0.2);
          p.sad = Math.min(p.sad ?? 0, 0.65);
          p.ear = Math.min(p.ear ?? 0, 0.78);
          p.smile = 0;
          break;
        case 'bearcomes':
          p.eye = Math.max(p.eye ?? 1, 0.55);
          p.sad = Math.min(p.sad ?? 0, 0.62);
          p.smile = 0.08 * ease(time, 5, 15);
          break;
        case 'talk': {
          const trusting = ease(time, 4, 15);
          p.eye = Math.max(p.eye ?? 1, 0.68);
          p.sad = Math.min(p.sad ?? 0, 0.65 * (1 - trusting));
          p.smile = Math.max(p.smile ?? 0, 0.48 * trusting);
          break;
        }
      }
    } else if (kind === 'bear' && (id === 'bearcomes' || id === 'talk')) {
      p.sad = Math.min(p.sad ?? 0, 0.18);
      p.smile = Math.max(p.smile ?? 0, id === 'talk' ? 0.76 : 0.38 * ease(time, 5, 10));
      p.eye = Math.max(p.eye ?? 1, 0.85);
    } else if (kind === 'hare' && id === 'offer') {
      p.eye = Math.max(p.eye ?? 1, 0.78);
      p.look = p.look ?? 0.2;
    }
    return p;
  }

  // Delicate expression details in the ORIGINAL local head coordinate system.
  // These embellish, rather than replace, the characters rendered by team B.
  function faceAccents(ctx, kind, p, x, y, scale, opts, id, t) {
    if (!ctx || typeof ctx.save !== 'function' || typeof ctx.bezierCurveTo !== 'function') return;
    let hx, hy, angle = -(p.head || 0);
    if (kind === 'fox') {
      const mode = p.mode || 'sit', br = Math.sin(t * 1.9 + (p.seed || 0)) * 0.6 * (p.breath ?? 1);
      if (mode === 'back') return;
      if (mode === 'lie') { hx = 40 + (p.hx || 0); hy = -24 + (p.hy || 0) + br * 0.3; }
      else if (mode === 'sit') { hx = 22 + (p.hx || 0); hy = -104 + (p.hy || 0) + br * 0.6; }
      else {
        const bob = p.walk != null ? Math.cos(2 * p.walk) * 1.2 : br * 0.4;
        hx = 47 + (p.hx || 0); hy = -84 + (p.hy || 0) + bob * 0.6;
      }
    } else if (kind === 'bear') {
      const br = Math.sin(t * 1.6 + (p.seed || 0)) * 0.8;
      if (p.mode === 'walk') {
        hx = 54 + (p.hx || 0);
        hy = -50 + (p.hy || 0) + (p.walk != null ? Math.cos(2 * p.walk) * 1.5 : br * 0.4);
        angle += 0.12;
      } else {
        hx = (p.mode === 'up' ? 12 : 16) + (p.hx || 0);
        hy = (p.mode === 'up' ? -110 : -96) + (p.hy || 0) + br * 0.6;
      }
    } else {
      // The upright hare rotates its head around an articulated neck;
      // don't guess that transform and accidentally detach its expression.
      if (p.mode === 'up') return;
      const s = p.stretch || 0, br = Math.sin(t * 2.6 + (p.seed || 0)) * 0.5;
      hx = 26 + 8 * s + (p.hx || 0);
      hy = -50 + 10 * s + (p.hy || 0) + br * 0.4;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((opts.face || 1) * scale, scale);
    ctx.translate(hx, hy);
    ctx.rotate(angle);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (kind === 'fox') {
      const concern = clamp01(p.sad || 0), warmth = clamp01(p.smile || 0);
      // Fine brow and soft cheek tips; original eyes and blink remain intact.
      ctx.strokeStyle = 'rgba(112,49,25,0.69)';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(3.5, -10.4 - warmth);
      ctx.bezierCurveTo(6.5, -12.4 - warmth, 10.6, -12 - concern, 14.9, -9.2 + concern * 1.3);
      ctx.stroke();
      // A softly feathered warm cheek, not a hard circular blush stamp.
      const cheek = ctx.createRadialGradient(-7.4, 4.4, 0.3, -7.4, 4.4, 8);
      cheek.addColorStop(0, 'rgba(255,224,181,0.28)');
      cheek.addColorStop(0.55, 'rgba(255,219,170,0.14)');
      cheek.addColorStop(1, 'rgba(255,219,170,0)');
      ctx.fillStyle = cheek;
      ctx.beginPath(); ctx.ellipse(-7.4, 4.4, 7.6, 4.4, -0.25, 0, Math.PI * 2); ctx.fill();
      // Small cream-fur tips stay within the cheek silhouette.
      ctx.strokeStyle = 'rgba(250,232,206,0.37)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-14.5, 7); ctx.quadraticCurveTo(-16, 8.6, -14, 10);
      ctx.moveTo(-12.8, 8); ctx.quadraticCurveTo(-14.3, 10.3, -11.7, 11);
      ctx.stroke();
      if (id === 'talk' || id === 'decide') {
        ctx.fillStyle = 'rgba(255,251,229,0.68)';
        ctx.beginPath(); ctx.ellipse(10.4, -5.2, 0.9, 0.62, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'bear') {
      ctx.strokeStyle = 'rgba(41,26,20,0.5)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(6.9, -11.3); ctx.bezierCurveTo(9.5, -13, 12.2, -12.3, 14.8, -10.1); ctx.stroke();
      ctx.fillStyle = 'rgba(250,200,146,0.18)';
      ctx.beginPath(); ctx.ellipse(12, 7.5, 7.5, 4.7, -0.22, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(78,55,42,0.56)';
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0.3, -8.4); ctx.quadraticCurveTo(4, -10, 8.2, -8.3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,205,181,0.23)';
      ctx.beginPath(); ctx.ellipse(9, 6, 5.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  const LIGHT = Object.freeze({
    decide:    { haze: '#ffdc97', halo: '#ffe8af', intensity: 0.14 },
    wind:      { haze: '#dfd7bd', halo: '#ffe0ab', intensity: 0.08 },
    offer:     { haze: '#ffe1b3', halo: '#fff1cb', intensity: 0.15 },
    tired:     { haze: '#ffbc88', halo: '#ffe2af', intensity: 0.16 },
    bearcomes: { haze: '#ffd5a2', halo: '#fff0c6', intensity: 0.19 },
    talk:      { haze: '#ffe0aa', halo: '#fff0ca', intensity: 0.15 },
  });

  // Cheap elliptical radial paint: no canvas.filter, large offscreen buffers or blur.
  function ellipseGlow(ctx, x, y, rx, ry, color, alpha) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, hexAlpha(color, alpha));
    g.addColorStop(0.32, hexAlpha(color, alpha * 0.4));
    g.addColorStop(1, hexAlpha(color, 0));
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    ctx.restore();
  }
  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${clamp01(alpha)})`;
  }

  function framing(id, t, S) {
    if (typeof camAt !== 'function' || typeof fr !== 'function') return null;
    switch (id) {
      case 'decide': {
        const c = camAt(t, [[0, { x: 0, y: 160, d: 0, z: 1.42 }], [20, { x: 0, y: 150, d: 0.03, z: 1.5 }]]);
        c.x += S.cx || 0; return c;
      }
      case 'wind': {
        const c = camAt(t, [[0, Object.assign(fr(990, 740, 1.5, 0), { r: -0.04 })], [18, Object.assign(fr(1010, 740, 1.62, 0.03), { r: -0.03 })]], 1);
        const gust = typeof windState === 'function' ? windState(t).gust : 0;
        c.x += gust * Math.sin(t * 23) * 5; c.y += gust * Math.cos(t * 19) * 4;
        return c;
      }
      case 'offer':
        return camAt(t, [[0, fr(960, 730, 1.38, 0)], [13.5, fr(980, 730, 1.45, 0.02)], [20, fr(1180, 700, 1.95, 0.04)]]);
      case 'tired':
        return camAt(t, [[0, fr(1060, 820, 1.7, 0)], [16, fr(960, 560, 1, 0)]], 0.5);
      case 'bearcomes':
        return camAt(t, [[0, fr(1000, 760, 1.3, 0)], [7, fr(960, 770, 1.38, 0.02)], [20, fr(880, 790, 1.55, 0.04)]]);
      case 'talk':
        return camAt(t, [[0, fr(920, 760, 1.42, 0)], [18, fr(1000, 760, 1.6, 0.03)]]);
      default: return null;
    }
  }

  const FOCAL = {
    decide:    [[980, 755, 400, 280]],
    wind:      [[1200, 730, 290, 190]],
    offer:     [[700, 745, 230, 200], [1230, 700, 290, 220]],
    tired:     [[1040, 825, 330, 190]],
    bearcomes: [[650, 820, 420, 240], [1250, 705, 390, 290]],
    talk:      [[800, 690, 360, 260], [1140, 680, 360, 270]],
  };

  // Decorative sasa / grasses. Their sway REUSES the director's gust signal;
  // the existing wind physics and fall trajectories are left untouched.
  function paintWindGrasses(ctx, t) {
    const gust = typeof windState === 'function' ? windState(t).gust : 0;
    const anchors = [[240, 1030, 1], [360, 1010, 0.7], [1690, 1018, 0.8], [1780, 1060, 1.2]];
    anchors.forEach(([xx, yy, size], i) => {
      ctx.save(); ctx.translate(xx, yy); ctx.scale(size, size);
      const bend = 6 + gust * 29 + Math.sin(t * 0.8 + i * 1.5) * 2.4;
      for (let j = 0; j < 5; j++) {
        const h = 40 + j * 8 + i * 2, dx = bend + (j - 2) * 9;
        ctx.beginPath();
        ctx.moveTo(j * 9 - 18, 0);
        ctx.quadraticCurveTo(dx * 0.3, -h * 0.55, dx, -h);
        ctx.quadraticCurveTo(dx + 4, -h * 0.42, j * 9 - 18, 0);
        ctx.closePath();
        ctx.fillStyle = ['rgba(76,92,50,0.69)', 'rgba(120,129,64,0.57)', 'rgba(151,129,65,0.53)'][j % 3];
        ctx.fill();
        ctx.strokeStyle = 'rgba(238,219,153,0.22)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(j * 9 - 18, -3); ctx.quadraticCurveTo(dx * 0.3, -h * 0.55, dx, -h + 3); ctx.stroke();
      }
      ctx.restore();
    });
  }

  function paintLighting(ctx, id, t, S) {
    if (!ctx || typeof ctx.createRadialGradient !== 'function') return;
    const config = LIGHT[id];
    const camera = framing(id, t, S);
    ctx.save();
    if (camera && typeof L === 'function') {
      L(ctx, camera, 1, x => {
        x.save();
        x.globalCompositeOperation = 'screen';
        for (const [px, py, w, h] of FOCAL[id]) ellipseGlow(x, px, py, w, h, config.halo, config.intensity);
        if (id === 'wind') paintWindGrasses(x, t);
        x.restore();
      });
    }
    // Warm atmospheric wash with an open centre: keep readable facial shadows.
    ctx.globalCompositeOperation = 'soft-light';
    const shade = ctx.createLinearGradient(0, 0, 1920, 1080);
    shade.addColorStop(0, hexAlpha(config.haze, id === 'wind' ? 0.065 : 0.115));
    shade.addColorStop(0.58, hexAlpha(config.haze, 0.025));
    shade.addColorStop(1, hexAlpha(config.haze, id === 'tired' ? 0.095 : 0.055));
    ctx.fillStyle = shade; ctx.fillRect(0, 0, 1920, 1080);
    ctx.restore();
  }

  function install(scenes) {
    if (!Array.isArray(scenes)) throw new TypeError('install expects the existing scene array');
    let count = 0;
    for (const def of scenes) {
      if (!def || !OWNED.has(def.id) || INSTALLED.has(def)) continue;
      const originalDraw = def.draw;
      if (typeof originalDraw !== 'function') continue;
      def.draw = function emotionalSceneDraw(ctx, t, S, dt) {
        const originalCreature = root.creature;
        // Intercept only during this scene's synchronous draw. Nothing in the
        // shared creature implementation is modified or cached.
        if (typeof originalCreature === 'function') {
          root.creature = function emotionalCreature(c, kind, pose, x, y, sc, options) {
            const p = expression(def.id, kind, pose, t);
            const o = options || {};
            const result = originalCreature.call(this, c, kind, p, x, y, sc, o);
            if (kind === 'fox' || kind === 'hare' || kind === 'bear') {
              faceAccents(c, kind, p, x, y, sc, o, def.id, t);
            }
            return result;
          };
        }
        try { originalDraw.call(this, ctx, t, S, dt); }
        finally { if (typeof originalCreature === 'function') root.creature = originalCreature; }
        paintLighting(ctx, def.id, t, S);
      };
      INSTALLED.add(def); count++;
    }
    return count;
  }
  root.AkiEmotionalArt = Object.freeze({ install, expression, light: LIGHT, ownedScenes: Object.freeze([...OWNED]) });
  if (typeof SCENES !== 'undefined') install(SCENES);
})(window);
