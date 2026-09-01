import type { Horizon, Sky, SkyBody } from './destinations';

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

type RGB = [number, number, number];

const HALF_PI = Math.PI / 2;
const TAU = Math.PI * 2;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rgba = (c: RGB, alpha = 1): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** Smootherstep — the fade curve used for every cross-dissolve. */
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

interface Resolved {
  top: RGB;
  mid: RGB;
  low: RGB;
  glow: RGB;
  accent: RGB;
  stars: number;
  haze: number;
  bodyScale: number;
}

function resolve(sky: Sky): Resolved {
  return {
    top: hexToRgb(sky.gradient[0]),
    mid: hexToRgb(sky.gradient[1]),
    low: hexToRgb(sky.gradient[2]),
    glow: hexToRgb(sky.glow),
    accent: hexToRgb(sky.accent),
    stars: sky.stars,
    haze: sky.haze,
    bodyScale: sky.bodyScale ?? 1,
  };
}

function blend(a: Resolved, b: Resolved, t: number): Resolved {
  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    low: mix(a.low, b.low, t),
    glow: mix(a.glow, b.glow, t),
    accent: mix(a.accent, b.accent, t),
    stars: lerp(a.stars, b.stars, t),
    haze: lerp(a.haze, b.haze, t),
    bodyScale: lerp(a.bodyScale, b.bodyScale, t),
  };
}

/* ------------------------------------------------------------------ *
 * Star field
 * ------------------------------------------------------------------ */

interface Star {
  x: number; // 0..1
  y: number; // 0..1
  r: number; // radius in css px at dpr 1
  a: number; // base alpha
  depth: number; // 0 (far) .. 1 (near) — parallax weight
  phase: number;
  twinkle: number;
}

const STAR_POOL = 900;

function makeStars(): Star[] {
  const rnd = mulberry32(0x5eed1c05);
  const out: Star[] = [];
  for (let i = 0; i < STAR_POOL; i += 1) {
    const bright = rnd();
    out.push({
      x: rnd(),
      y: rnd(),
      r: 0.3 + bright * bright * bright * 1.35,
      a: 0.2 + bright * 0.72,
      depth: rnd(),
      phase: rnd() * TAU,
      twinkle: rnd() < 0.35 ? 0.25 + rnd() * 0.5 : 0,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The scene
 * ------------------------------------------------------------------ */

export interface SkySceneOptions {
  reducedMotion?: boolean;
  /** Extra intensity multiplier, used to dim the sky behind dense UI. */
  intensity?: number;
}

export class SkyScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars = makeStars();

  private from: Sky;
  private to: Sky;
  private fromR: Resolved;
  private toR: Resolved;
  private mixT = 1;
  private fadeDuration = 1500;
  private fadeStart = 0;

  private width = 1;
  private height = 1;
  private dpr = 1;

  private raf = 0;
  private running = false;
  private t0 = 0;
  private reduced: boolean;

  private px = 0;
  private py = 0;
  private tpx = 0;
  private tpy = 0;

  /** Scroll progress 0..1, used to drift the sky as the page moves. */
  private scroll = 0;

  /** Warp burst: stars streak away from the centre during a departure. */
  private warpStart = 0;
  private warpDuration = 0;

  constructor(canvas: HTMLCanvasElement, sky: Sky, options: SkySceneOptions = {}) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.from = sky;
    this.to = sky;
    this.fromR = resolve(sky);
    this.toR = this.fromR;
    this.reduced = options.reducedMotion ?? false;
    this.resize();
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) this.renderFrame(performance.now());
  }

  /** Cross-fade to a new sky. */
  setSky(sky: Sky, immediate = false) {
    if (sky === this.to) return;
    const now = performance.now();
    // Freeze the current visual state as the new "from".
    this.fromR = this.mixT >= 1 ? this.toR : blend(this.fromR, this.toR, ease(this.mixT));
    this.from = this.mixT >= 1 ? this.to : this.from;
    this.to = sky;
    this.toR = resolve(sky);
    this.mixT = immediate || this.reduced ? 1 : 0;
    this.fadeStart = now;
    if (this.mixT === 1 || !this.running) this.renderFrame(now);
  }

  setPointer(x: number, y: number) {
    this.tpx = x;
    this.tpy = y;
  }

  setScroll(progress: number) {
    this.scroll = progress;
    if (this.reduced || !this.running) this.renderFrame(performance.now());
  }

  /** Streak the stars outward for `ms`, as if the camera just accelerated. */
  warp(ms = 1000) {
    if (this.reduced) return;
    this.warpStart = performance.now();
    this.warpDuration = ms;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || window.innerWidth));
    const h = Math.max(1, Math.round(rect.height || window.innerHeight));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.renderFrame(performance.now());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.renderFrame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy() {
    this.stop();
  }

  /* ---------------------------------------------------------------- */

  private renderFrame(now: number) {
    const { ctx, width: w, height: h } = this;
    const time = (now - this.t0) / 1000;

    if (this.mixT < 1) {
      this.mixT = clamp01((now - this.fadeStart) / this.fadeDuration);
    }
    const k = ease(this.mixT);
    const c = blend(this.fromR, this.toR, k);

    // Pointer parallax eases toward the target so it never snaps.
    this.px += (this.tpx - this.px) * (this.reduced ? 1 : 0.045);
    this.py += (this.tpy - this.py) * (this.reduced ? 1 : 0.045);

    let warp = 0;
    if (this.warpDuration > 0) {
      const p = (now - this.warpStart) / this.warpDuration;
      if (p >= 1) this.warpDuration = 0;
      else warp = Math.sin(Math.max(0, p) * Math.PI) ** 1.5;
    }

    ctx.clearRect(0, 0, w, h);
    this.paintGradient(c, h, w);
    this.paintHaze(c, time, w, h);
    this.paintStars(c, time, w, h, k, warp);
    this.paintBody(this.from.body, c, time, w, h, 1 - k, this.from);
    this.paintBody(this.to.body, c, time, w, h, k, this.to);
    this.paintHorizonGlow(c, w, h);
    this.paintHorizon(this.from.horizon, c, w, h, 1 - k);
    this.paintHorizon(this.to.horizon, c, w, h, k);
  }

  private paintGradient(c: Resolved, h: number, w: number) {
    const { ctx } = this;
    const drift = this.scroll * h * 0.12;
    const g = ctx.createLinearGradient(0, -drift, 0, h);
    g.addColorStop(0, rgba(c.top));
    g.addColorStop(0.52, rgba(c.mid));
    g.addColorStop(1, rgba(c.low));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  private paintHaze(c: Resolved, time: number, w: number, h: number) {
    if (c.haze <= 0.01) return;
    const { ctx } = this;
    const rnd = mulberry32(9721);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const blobs = 6;
    for (let i = 0; i < blobs; i += 1) {
      const bx = rnd();
      const by = rnd();
      const br = 0.28 + rnd() * 0.45;
      const speed = 0.02 + rnd() * 0.05;
      const t = this.reduced ? 0 : time * speed;
      const x = (bx + Math.sin(t + i) * 0.035) * w + this.px * (10 + i * 6);
      const y = (by * 0.85 + Math.cos(t * 0.8 + i) * 0.03) * h + this.py * (8 + i * 4) - this.scroll * h * 0.08;
      const r = br * Math.max(w, h) * 0.6;
      const tint = i % 2 === 0 ? c.glow : c.accent;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const peak = c.haze * (i % 2 === 0 ? 0.16 : 0.1);
      g.addColorStop(0, rgba(tint, peak));
      g.addColorStop(0.45, rgba(tint, peak * 0.35));
      g.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  private paintStars(c: Resolved, time: number, w: number, h: number, k: number, warp = 0) {
    const { ctx, stars } = this;
    const trails = lerp(this.from.trails ? 1 : 0, this.to.trails ? 1 : 0, k);
    const count = Math.round(clamp01(c.stars / 2) * STAR_POOL);
    const poleX = w * 0.62;
    const poleY = h * 0.3;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < count; i += 1) {
      const s = stars[i];
      const depth = 0.25 + s.depth * 0.75;
      const x = s.x * w + this.px * 34 * depth;
      const y = s.y * h * 0.94 + this.py * 24 * depth - this.scroll * h * 0.22 * depth;
      if (y < -40 || y > h + 40) continue;

      const flicker = s.twinkle && !this.reduced ? 1 + Math.sin(time * 1.5 + s.phase) * s.twinkle : 1;
      const alpha = clamp01(s.a * flicker) * (0.55 + c.stars * 0.3);
      if (alpha <= 0.01) continue;

      if (warp > 0.01) {
        const wx = x - w * 0.5;
        const wy = y - h * 0.42;
        const len = warp * (0.05 + s.depth * 0.55) * 1.4;
        ctx.strokeStyle = rgba(mix([255, 255, 255], c.accent, 0.4), alpha * warp * 0.8);
        ctx.lineWidth = Math.max(0.6, s.r);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + wx * len, y + wy * len);
        ctx.stroke();
      }

      if (trails > 0.02) {
        const dx = x - poleX;
        const dy = y - poleY;
        const radius = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const sweep = (0.16 + s.depth * 0.5) * (0.4 + trails);
        ctx.strokeStyle = rgba(mix(c.accent, [255, 255, 255], 0.35), alpha * trails * 0.55);
        ctx.lineWidth = Math.max(0.5, s.r * 0.85);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(poleX, poleY, radius, angle - sweep, angle);
        ctx.stroke();
      }

      if (trails < 0.98) {
        const a = alpha * (1 - trails);
        ctx.fillStyle = rgba(mix([255, 255, 255], c.accent, 0.25), a);
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, TAU);
        ctx.fill();
        // Only the genuinely bright stars get a halo, and a tight one — a
        // wide glow on every point turns the sky into cotton wool.
        if (s.r > 1.15) {
          const halo = s.r * 3.2;
          const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
          g.addColorStop(0, rgba(c.accent, a * 0.24));
          g.addColorStop(1, rgba(c.accent, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);
        }
      }
    }
    ctx.restore();
  }

  private paintHorizonGlow(c: Resolved, w: number, h: number) {
    const { ctx } = this;
    const y = h * 0.98;
    const r = Math.max(w * 0.9, h * 0.75);
    const g = ctx.createRadialGradient(w * 0.5 + this.px * 20, y, 0, w * 0.5, y, r);
    g.addColorStop(0, rgba(c.glow, 0.3));
    g.addColorStop(0.5, rgba(c.glow, 0.08));
    g.addColorStop(1, rgba(c.glow, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, h - r, w, r);
    ctx.restore();
  }

  /* -------------------------- feature bodies ---------------------- */

  private paintBody(kind: SkyBody, c: Resolved, time: number, w: number, h: number, alpha: number, sky: Sky) {
    if (kind === 'none' || alpha <= 0.01) return;
    const { ctx } = this;
    const scale = c.bodyScale;
    const cx = w * 0.5 + this.px * 46;
    const cy = h * (kind === 'sun' ? 0.42 : 0.28) + this.py * 30 - this.scroll * h * 0.3;
    const unit = Math.min(w, h);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';

    switch (kind) {
      case 'moon':
        this.drawMoon(cx, cy, unit * 0.062 * scale, c);
        break;
      case 'planet':
        this.drawPoint(cx, cy, unit * 0.012 * scale, unit * 0.16 * scale, c, 0);
        break;
      case 'sun':
        this.drawSun(cx, cy, unit * 0.1 * scale, c, time);
        break;
      case 'star':
        this.drawPoint(cx, cy, unit * 0.008 * scale, unit * 0.2 * scale, c, unit * 0.13 * scale);
        break;
      case 'binary':
        this.drawPoint(cx - unit * 0.03, cy, unit * 0.008 * scale, unit * 0.18 * scale, c, unit * 0.12 * scale);
        this.drawPoint(cx + unit * 0.035, cy + unit * 0.02, unit * 0.003 * scale, unit * 0.05 * scale, c, 0);
        break;
      case 'nebula':
        this.drawNebula(cx, cy + unit * 0.04, unit * 0.34 * scale, c, time, sky);
        break;
      case 'galaxy':
        this.drawGalaxy(cx, cy + unit * 0.03, unit * 0.28 * scale, c, time);
        break;
      case 'blackhole':
        this.drawBlackHole(cx, cy + unit * 0.03, unit * 0.085 * scale, c, time);
        break;
      case 'cluster':
        this.drawCluster(cx, cy + unit * 0.02, unit * 0.16 * scale, c, time);
        break;
      case 'wall':
        this.drawWall(cx, cy + unit * 0.05, unit * 0.6 * scale, c, time);
        break;
      case 'void':
        ctx.globalCompositeOperation = 'source-over';
        this.drawVoid(cx, cy + unit * 0.05, unit * 0.3 * scale, c);
        break;
      default:
        break;
    }
    ctx.restore();
  }

  private drawMoon(cx: number, cy: number, r: number, c: Resolved) {
    const { ctx } = this;
    const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 7);
    halo.addColorStop(0, rgba(c.accent, 0.22));
    halo.addColorStop(0.35, rgba(c.glow, 0.08));
    halo.addColorStop(1, rgba(c.glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 7, cy - r * 7, r * 14, r * 14);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.42);
    ctx.beginPath();
    ctx.arc(0, 0, r, -HALF_PI, HALF_PI, false);
    ctx.ellipse(0, 0, r * 0.78, r, 0, HALF_PI, -HALF_PI, true);
    ctx.closePath();
    const face = ctx.createLinearGradient(-r, -r, r, r);
    face.addColorStop(0, rgba(mix(c.accent, [255, 255, 255], 0.7), 0.98));
    face.addColorStop(1, rgba(c.accent, 0.72));
    ctx.fillStyle = face;
    ctx.fill();
    ctx.restore();
  }

  private drawPoint(cx: number, cy: number, core: number, halo: number, c: Resolved, spike: number) {
    const { ctx } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, halo);
    g.addColorStop(0, rgba(mix(c.accent, [255, 255, 255], 0.8), 0.75));
    g.addColorStop(0.12, rgba(c.accent, 0.34));
    g.addColorStop(0.4, rgba(c.glow, 0.1));
    g.addColorStop(1, rgba(c.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - halo, cy - halo, halo * 2, halo * 2);

    if (spike > 0) {
      ctx.save();
      ctx.strokeStyle = rgba(mix(c.accent, [255, 255, 255], 0.6), 0.3);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - spike, cy);
      ctx.lineTo(cx + spike, cy);
      ctx.moveTo(cx, cy - spike);
      ctx.lineTo(cx, cy + spike);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, core, 0, TAU);
    ctx.fillStyle = rgba([255, 255, 255], 0.95);
    ctx.fill();
  }

  private drawSun(cx: number, cy: number, r: number, c: Resolved, time: number) {
    const { ctx } = this;
    const pulse = this.reduced ? 1 : 1 + Math.sin(time * 0.6) * 0.02;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 9 * pulse);
    g.addColorStop(0, rgba([255, 255, 255], 0.95));
    g.addColorStop(0.06, rgba(mix(c.accent, [255, 255, 255], 0.5), 0.8));
    g.addColorStop(0.16, rgba(c.accent, 0.4));
    g.addColorStop(0.45, rgba(c.glow, 0.12));
    g.addColorStop(1, rgba(c.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r * 9, cy - r * 9, r * 18, r * 18);
  }

  private drawNebula(cx: number, cy: number, r: number, c: Resolved, time: number, sky: Sky) {
    const { ctx } = this;
    const rnd = mulberry32(sky.gradient[0].length * 977 + Math.round(r));
    for (let i = 0; i < 9; i += 1) {
      const t = this.reduced ? 0 : time * (0.03 + rnd() * 0.05);
      const ang = rnd() * TAU;
      const dist = rnd() * r * 0.7;
      const x = cx + Math.cos(ang + t) * dist;
      const y = cy + Math.sin(ang + t) * dist * 0.6;
      const rr = r * (0.25 + rnd() * 0.55);
      const tint = i % 3 === 0 ? c.accent : i % 3 === 1 ? c.glow : mix(c.accent, c.glow, 0.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, rgba(tint, 0.17));
      g.addColorStop(0.4, rgba(tint, 0.07));
      g.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 14; i += 1) {
      const x = cx + (rnd() - 0.5) * r * 1.2;
      const y = cy + (rnd() - 0.5) * r * 0.8;
      ctx.fillStyle = rgba([255, 255, 255], 0.5 + rnd() * 0.4);
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + rnd() * 1.1, 0, TAU);
      ctx.fill();
    }
  }

  private drawGalaxy(cx: number, cy: number, r: number, c: Resolved, time: number) {
    const { ctx } = this;
    const rnd = mulberry32(4211);
    const spin = this.reduced ? 0 : time * 0.012;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.5 + spin);
    ctx.scale(1, 0.42);

    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
    core.addColorStop(0, rgba(mix(c.accent, [255, 245, 220], 0.7), 0.5));
    core.addColorStop(0.4, rgba(c.accent, 0.14));
    core.addColorStop(1, rgba(c.accent, 0));
    ctx.fillStyle = core;
    ctx.fillRect(-r, -r, r * 2, r * 2);

    const arms = 2;
    for (let a = 0; a < arms; a += 1) {
      for (let i = 0; i < 320; i += 1) {
        const t = i / 320;
        const ang = a * Math.PI + t * Math.PI * 2.1;
        const rad = r * 0.12 + t * r * 0.88;
        const jitter = (rnd() - 0.5) * r * 0.13 * (0.3 + t);
        const x = Math.cos(ang) * rad + jitter;
        const y = Math.sin(ang) * rad + (rnd() - 0.5) * r * 0.1;
        const alpha = (1 - t) * 0.5 + 0.06;
        ctx.fillStyle = rgba(mix(c.accent, [255, 255, 255], rnd() * 0.6), alpha * 0.55);
        ctx.beginPath();
        ctx.arc(x, y, 0.5 + rnd() * 1.1, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawBlackHole(cx: number, cy: number, r: number, c: Resolved, time: number) {
    const { ctx } = this;
    const spin = this.reduced ? 0 : time * 0.08;
    const bright = mix(c.accent, [255, 255, 255], 0.55);

    const bloom = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 8);
    bloom.addColorStop(0, rgba(c.accent, 0.22));
    bloom.addColorStop(0.35, rgba(c.glow, 0.08));
    bloom.addColorStop(1, rgba(c.glow, 0));
    ctx.fillStyle = bloom;
    ctx.fillRect(cx - r * 8, cy - r * 8, r * 16, r * 16);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.2);

    // The disc: nested ellipses fading outward. The left side is brighter,
    // standing in for the Doppler beaming of the material coming at us.
    const doppler = ctx.createLinearGradient(-r * 3, 0, r * 3, 0);
    doppler.addColorStop(0, rgba(bright, 0.9));
    doppler.addColorStop(0.42, rgba(c.accent, 0.42));
    doppler.addColorStop(1, rgba(c.accent, 0.16));

    const rings = 26;
    for (let i = 0; i < rings; i += 1) {
      const t = i / (rings - 1);
      const radius = r * (1.25 + t * 1.75);
      const wobble = this.reduced ? 0 : Math.sin(spin * 2 + t * 9) * 0.012;
      ctx.globalAlpha = (1 - t) ** 1.6 * 0.5 + 0.03;
      ctx.strokeStyle = doppler;
      ctx.lineWidth = Math.max(0.7, r * 0.075);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * (0.2 + wobble), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The photon ring survives the lensing as a thin bright circle.
    ctx.strokeStyle = rgba(bright, 0.6);
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.14, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // The far side of the disc, lensed up and over the top of the shadow.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.2);
    ctx.strokeStyle = rgba(bright, 0.32);
    ctx.lineWidth = Math.max(1, r * 0.13);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.16, r * 1.55, r * 0.72, 0, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();
    ctx.restore();

    // The shadow itself, punched over the top of everything.
    ctx.globalCompositeOperation = 'source-over';
    const edge = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r);
    edge.addColorStop(0, 'rgba(0,0,0,1)');
    edge.addColorStop(1, 'rgba(0,0,0,0.94)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fillStyle = edge;
    ctx.fill();
  }

  private drawCluster(cx: number, cy: number, r: number, c: Resolved, time: number) {
    const { ctx } = this;
    const rnd = mulberry32(80231);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
    g.addColorStop(0, rgba(c.accent, 0.16));
    g.addColorStop(1, rgba(c.accent, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);

    for (let i = 0; i < 220; i += 1) {
      // Box–Muller, so the knot is genuinely denser in the middle.
      const u = Math.max(1e-6, rnd());
      const v = rnd();
      const g1 = Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
      const g2 = Math.sqrt(-2 * Math.log(u)) * Math.sin(TAU * v);
      const x = cx + g1 * r * 0.42;
      const y = cy + g2 * r * 0.42;
      const size = 0.4 + rnd() * rnd() * 2.2;
      const tw = this.reduced ? 1 : 1 + Math.sin(time * 1.2 + i) * 0.25;
      ctx.fillStyle = rgba(mix([255, 255, 255], c.accent, rnd() * 0.5), (0.3 + rnd() * 0.6) * tw);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
  }

  private drawWall(cx: number, cy: number, r: number, c: Resolved, time: number) {
    const { ctx } = this;
    const rnd = mulberry32(60817);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35);
    for (let f = 0; f < 4; f += 1) {
      const yOff = (f - 1.5) * r * 0.16;
      for (let i = 0; i < 260; i += 1) {
        const t = i / 260;
        const drift = this.reduced ? 0 : Math.sin(time * 0.08 + f + t * 4) * r * 0.02;
        const x = (t - 0.5) * r * 2;
        const y = yOff + Math.sin(t * 6 + f) * r * 0.07 + (rnd() - 0.5) * r * 0.08 + drift;
        const alpha = (0.16 + rnd() * 0.62) * (1 - Math.abs(t - 0.5) * 1.4);
        if (alpha <= 0) continue;
        ctx.fillStyle = rgba(mix(c.accent, c.glow, rnd()), alpha * 0.85);
        ctx.beginPath();
        ctx.arc(x, y, 0.55 + rnd() * 1.7, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawVoid(cx: number, cy: number, r: number, c: Resolved) {
    const { ctx } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.strokeStyle = rgba(c.accent, 0.07);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, TAU);
    ctx.stroke();
  }

  /* ---------------------------- horizon --------------------------- */

  private paintHorizon(kind: Horizon, c: Resolved, w: number, h: number, alpha: number) {
    if (alpha <= 0.01) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;

    const base = h * (kind === 'none' ? 1.02 : 0.9);
    const ink = 'rgba(2,3,8,0.94)';
    const drift = this.scroll * h * 0.05;

    if (kind === 'none') {
      const g = ctx.createLinearGradient(0, h * 0.72, 0, h);
      g.addColorStop(0, 'rgba(2,3,8,0)');
      g.addColorStop(1, 'rgba(2,3,8,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.restore();
      return;
    }

    if (kind === 'sea') {
      const y = base + drift;
      const g = ctx.createLinearGradient(0, y, 0, h);
      g.addColorStop(0, rgba(c.glow, 0.16));
      g.addColorStop(0.12, 'rgba(2,3,8,0.8)');
      g.addColorStop(1, 'rgba(1,2,5,0.98)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, h - y);
      ctx.restore();
      return;
    }

    const rnd = mulberry32(kind === 'hills' ? 3312 : kind === 'ridge' ? 5521 : kind === 'city' ? 7714 : 9931);
    const roughness = kind === 'ridge' ? 0.085 : kind === 'city' ? 0 : 0.04;
    const steps = 90;

    ctx.beginPath();
    ctx.moveTo(0, h);
    if (kind === 'city') {
      let x = 0;
      ctx.lineTo(0, base + drift);
      while (x < w) {
        const bw = 10 + rnd() * 46;
        const bh = (0.02 + rnd() * rnd() * 0.14) * h;
        ctx.lineTo(x, base + drift - bh);
        ctx.lineTo(x + bw, base + drift - bh);
        x += bw;
      }
      ctx.lineTo(w, base + drift);
    } else {
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const x = t * w;
        const wobble =
          Math.sin(t * 4.1 + 0.7) * 0.5 + Math.sin(t * 9.3 + 2.1) * 0.28 + Math.sin(t * 17.7) * 0.14;
        const y = base + drift - wobble * h * roughness;
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = ink;
    ctx.fill();

    if (kind === 'trees') this.drawTrees(w, base + drift, h, ink);
    if (kind === 'shrine') this.drawShrine(w, base + drift, c, ink);

    ctx.restore();
  }

  private drawTrees(w: number, baseY: number, h: number, ink: string) {
    const { ctx } = this;
    const rnd = mulberry32(1177);
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    const trees = 4;
    for (let i = 0; i < trees; i += 1) {
      const x = (i / trees) * w * 1.1 - w * 0.02 + rnd() * w * 0.12;
      const height = h * (0.1 + rnd() * 0.14);
      const branch = (bx: number, by: number, len: number, ang: number, depth: number) => {
        if (depth === 0 || len < 3) return;
        const ex = bx + Math.cos(ang) * len;
        const ey = by + Math.sin(ang) * len;
        ctx.lineWidth = Math.max(0.6, depth * 0.9);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        branch(ex, ey, len * 0.7, ang - 0.35 - rnd() * 0.3, depth - 1);
        branch(ex, ey, len * 0.68, ang + 0.32 + rnd() * 0.3, depth - 1);
      };
      branch(x, baseY + 10, height * 0.45, -HALF_PI + (rnd() - 0.5) * 0.2, 5);
    }
  }

  private drawShrine(w: number, baseY: number, c: Resolved, ink: string) {
    const { ctx } = this;
    const cx = w * 0.5;
    const s = Math.min(w * 0.16, 190);
    const top = baseY - s * 0.62;

    // Warm firelight underneath, as in the reference photograph.
    const glow = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, s * 1.5);
    glow.addColorStop(0, 'rgba(255,176,92,0.5)');
    glow.addColorStop(0.35, 'rgba(255,140,60,0.16)');
    glow.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.fillRect(cx - s * 1.5, baseY - s * 1.5, s * 3, s * 3);
    ctx.restore();

    ctx.fillStyle = ink;
    ctx.fillRect(cx - s * 0.62, top, s * 1.24, s * 0.05);
    ctx.fillRect(cx - s * 0.5, top + s * 0.14, s, s * 0.035);
    ctx.fillRect(cx - s * 0.44, top, s * 0.075, s * 0.68);
    ctx.fillRect(cx + s * 0.365, top, s * 0.075, s * 0.68);
    ctx.fillRect(cx - s * 0.66, baseY - s * 0.02, s * 1.32, s * 0.06);
    ctx.fillStyle = rgba(mix(c.glow, [255, 170, 90], 0.6), 0.35);
    ctx.fillRect(cx - s * 0.3, baseY - s * 0.12, s * 0.6, s * 0.1);
  }
}
