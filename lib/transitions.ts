import gsap from 'gsap';
import type { ITransitionData, ITransitionPage } from '@barba/core';
import { BY_SLUG } from './destinations';

/**
 * Barba transition definitions.
 *
 * These are plain Barba transition objects — `once`, `leave`, `enter`, with
 * `from`/`to` namespace rules — resolved by `barba.transitions.store`. The
 * bridge in `lib/barba.ts` runs them; GSAP does the moving.
 */

const CURTAIN = '[data-curtain]';
const LABEL = '[data-curtain-label]';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scale every duration down to almost nothing when motion is unwelcome. */
const d = (seconds: number): number => (prefersReducedMotion() ? Math.min(seconds, 0.12) : seconds);

function curtainLabelFor(data: ITransitionData): string {
  const path = data.next.url?.path ?? '';
  const slug = path.startsWith('/route/') ? path.slice('/route/'.length).replace(/\/$/, '') : '';
  const destination = BY_SLUG[slug];
  if (destination) return `plotting course — ${destination.name}`;
  if (path.startsWith('/atlas')) return 'opening the atlas';
  if (path.startsWith('/about')) return 'colophon';
  return 'returning to Earth';
}

function raiseCurtain(data: ITransitionData): gsap.core.Timeline {
  const curtain = document.querySelector<HTMLElement>(CURTAIN);
  const label = document.querySelector<HTMLElement>(LABEL);
  if (label) label.textContent = curtainLabelFor(data);

  const tl = gsap.timeline();
  if (curtain) {
    tl.set(curtain, { transformOrigin: '50% 100%', pointerEvents: 'auto', visibility: 'visible' })
      .fromTo(curtain, { scaleY: 0 }, { scaleY: 1, duration: d(0.62), ease: 'power3.inOut' }, 0);
  }
  if (label) {
    tl.fromTo(label, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: d(0.4), ease: 'power2.out' }, 0.25);
  }
  return tl;
}

function dropCurtain(): gsap.core.Timeline {
  const curtain = document.querySelector<HTMLElement>(CURTAIN);
  const label = document.querySelector<HTMLElement>(LABEL);
  const tl = gsap.timeline();
  if (label) tl.to(label, { opacity: 0, y: -10, duration: d(0.3), ease: 'power2.in' }, 0);
  if (curtain) {
    tl.set(curtain, { transformOrigin: '50% 0%' }, 0)
      .to(curtain, { scaleY: 0, duration: d(0.72), ease: 'power3.inOut' }, 0.12)
      .set(curtain, { pointerEvents: 'none', visibility: 'hidden' });
  }
  return tl;
}

/** GSAP timelines are thenable but typed as resolving to themselves. */
const done = async (tl: gsap.core.Timeline): Promise<void> => {
  await tl;
};

/** Ask the sky canvas for a burst of radial star streaks. */
function warpSky(ms = 1100) {
  if (prefersReducedMotion()) return;
  window.dispatchEvent(new CustomEvent('surreal:warp', { detail: { ms } }));
}

export const transitions: ITransitionPage[] = [
  {
    name: 'arrival',
    /* Runs on the very first paint, dispatched by `barba.init()`. */
    once({ next }: ITransitionData) {
      const container = next.container;
      if (!container) return;
      gsap.set(container, { opacity: 0 });
      const tl = gsap.timeline();
      tl.to(container, { opacity: 1, duration: d(1.1), ease: 'power2.out' }).fromTo(
        container.querySelectorAll('[data-reveal]'),
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: d(0.9), stagger: d(0.08), ease: 'power3.out' },
        d(0.25),
      );
      return done(tl);
    },
  },
  {
    /**
     * Departures: anything heading for a destination page gets the sky
     * streaking past on the way out.
     */
    name: 'departure',
    to: { namespace: 'route' },
    leave(data: ITransitionData) {
      warpSky();
      const tl = raiseCurtain(data);
      if (data.current.container) {
        tl.to(
          data.current.container,
          { opacity: 0, y: -30, scale: 0.985, duration: d(0.5), ease: 'power2.in' },
          0,
        );
      }
      return done(tl);
    },
    enter({ next }: ITransitionData) {
      const tl = dropCurtain();
      if (next.container) {
        tl.fromTo(
          next.container,
          { opacity: 0, y: 34, scale: 1.015 },
          { opacity: 1, y: 0, scale: 1, duration: d(0.95), ease: 'power3.out' },
          0.2,
        ).fromTo(
          next.container.querySelectorAll('[data-reveal]'),
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: d(0.75), stagger: d(0.07), ease: 'power3.out' },
          0.35,
        );
      }
      return done(tl);
    },
  },
  {
    /** Everything else: a plain vertical wipe. */
    name: 'wipe',
    leave(data: ITransitionData) {
      const tl = raiseCurtain(data);
      if (data.current.container) {
        tl.to(data.current.container, { opacity: 0, y: -18, duration: d(0.45), ease: 'power2.in' }, 0);
      }
      return done(tl);
    },
    enter({ next }: ITransitionData) {
      const tl = dropCurtain();
      if (next.container) {
        tl.fromTo(
          next.container,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: d(0.8), ease: 'power3.out' },
          0.18,
        ).fromTo(
          next.container.querySelectorAll('[data-reveal]'),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: d(0.7), stagger: d(0.06), ease: 'power3.out' },
          0.32,
        );
      }
      return done(tl);
    },
  },
];
