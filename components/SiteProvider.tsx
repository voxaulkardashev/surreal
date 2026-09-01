'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ensureBarba, isTransitioning, navigate as barbaNavigate } from '@/lib/barba';
import { transitions } from '@/lib/transitions';
import { getEngine } from '@/lib/audio';
import { EARTH, type Destination } from '@/lib/destinations';
import type { DistanceUnit } from '@/lib/format';

interface SiteValue {
  /** The destination the sky is currently painting. */
  subject: Destination;
  /** Commit a subject (a destination page mounting). */
  setSubject: (destination: Destination | null) => void;
  /** Transiently preview a subject (hovering a tile in the atlas). */
  preview: (destination: Destination | null) => void;

  origin: Destination;
  setOrigin: (destination: Destination) => void;

  unit: DistanceUnit;
  setUnit: (unit: DistanceUnit) => void;
  cycleUnit: () => void;

  soundOn: boolean;
  toggleSound: () => void;
  volume: number;
  setVolume: (value: number) => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** Freeze the page behind an overlay. Stops Lenis as well as native scroll. */
  lockScroll: (locked: boolean) => void;

  reducedMotion: boolean;
  /** Barba-driven navigation. Falls back to a plain push if Barba is not up. */
  go: (href: string, trigger?: HTMLElement) => void;
  /**
   * Scroll progress, 0..1, delivered imperatively. Scroll fires on every
   * frame; routing it through React state would re-render the whole tree
   * sixty times a second for the sake of a background gradient.
   */
  subscribeScroll: (listener: (progress: number) => void) => () => void;
}

const SiteContext = createContext<SiteValue | null>(null);

export function useSite(): SiteValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error('useSite must be used inside <SiteProvider>');
  return value;
}

const STORE_KEY = 'surreal:prefs';

interface Prefs {
  unit: DistanceUnit;
  volume: number;
  origin: string;
}

function readPrefs(): Partial<Prefs> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '{}') as Partial<Prefs>;
  } catch {
    return {};
  }
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [subject, setSubjectState] = useState<Destination>(EARTH);
  const [previewed, setPreviewed] = useState<Destination | null>(null);
  const [origin, setOriginState] = useState<Destination>(EARTH);
  const [unit, setUnitState] = useState<DistanceUnit>('km');
  const [soundOn, setSoundOn] = useState(false);
  const [volume, setVolumeState] = useState(0.6);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const lenisRef = useRef<Lenis | null>(null);
  const scrollListeners = useRef(new Set<(progress: number) => void>());

  const emitScroll = useCallback((progress: number) => {
    scrollListeners.current.forEach((listener) => listener(progress));
  }, []);

  const subscribeScroll = useCallback((listener: (progress: number) => void) => {
    scrollListeners.current.add(listener);
    return () => {
      scrollListeners.current.delete(listener);
    };
  }, []);

  const effective = previewed ?? subject;

  /* --------------------------- preferences -------------------------- */

  useEffect(() => {
    const prefs = readPrefs();
    if (prefs.unit) setUnitState(prefs.unit);
    if (typeof prefs.volume === 'number') setVolumeState(prefs.volume);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ unit, volume, origin: origin.slug }));
    } catch {
      /* private mode, quota, whatever — preferences are not important enough to care */
    }
  }, [unit, volume, origin.slug]);

  /* ------------------------- reduced motion ------------------------- */

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /* ------------------------ smooth scrolling ------------------------ */

  useEffect(() => {
    if (reducedMotion) {
      // No Lenis when motion is unwelcome — read the native scroll instead.
      const onNativeScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        emitScroll(max > 0 ? window.scrollY / max : 0);
      };
      window.addEventListener('scroll', onNativeScroll, { passive: true });
      onNativeScroll();
      return () => window.removeEventListener('scroll', onNativeScroll);
    }

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => 1 - (1 - t) ** 3,
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    lenisRef.current = lenis;

    const onScroll = ({ progress }: { progress: number }) => {
      emitScroll(Number.isFinite(progress) ? progress : 0);
      ScrollTrigger.update();
    };
    lenis.on('scroll', onScroll);

    // Let GSAP's ticker drive Lenis so both stay on the same clock.
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [emitScroll, reducedMotion]);

  /* ------------------------------ barba ----------------------------- */

  useEffect(() => {
    let cancelled = false;
    void ensureBarba(transitions).then((barba) => {
      if (cancelled || !barba) return;
      // A whoosh under every page transition, driven off Barba's own hook bus.
      barba.hooks.leave(() => getEngine().whoosh(0.9));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every navigation lands at the top, Lenis included.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    emitScroll(0);
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 240);
    return () => window.clearTimeout(id);
  }, [emitScroll, pathname]);

  const go = useCallback(
    (href: string, trigger?: HTMLElement) => {
      if (isTransitioning()) return;
      const target = new URL(href, window.location.origin);
      if (target.pathname === window.location.pathname) {
        setPaletteOpen(false);
        return;
      }
      setPaletteOpen(false);
      void barbaNavigate({ href, trigger, push: (to) => router.push(to) }).catch(() => {
        router.push(href);
      });
    },
    [router],
  );

  /* ------------------------------ audio ----------------------------- */

  const toggleSound = useCallback(() => {
    const engine = getEngine();
    void engine.toggle(effective.mood).then((running) => {
      setSoundOn(running);
      if (running) engine.setVolume(volume);
    });
  }, [effective.mood, volume]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    getEngine().setVolume(value);
  }, []);

  useEffect(() => {
    if (soundOn) getEngine().setMood(effective.mood);
  }, [effective.mood, soundOn]);

  /* ---------------------------- shortcuts --------------------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (typing) return;
      if (event.key === '/') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key.toLowerCase() === 'm') toggleSound();
      if (event.key.toLowerCase() === 'u') {
        setUnitState((current) => nextUnit(current));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSound]);

  /* ----------------------------- helpers ---------------------------- */

  const lockScroll = useCallback((locked: boolean) => {
    const lenis = lenisRef.current;
    if (locked) lenis?.stop();
    else lenis?.start();
    document.documentElement.style.overflow = locked ? 'hidden' : '';
  }, []);

  const setSubject = useCallback((destination: Destination | null) => {
    setSubjectState(destination ?? EARTH);
    setPreviewed(null);
  }, []);

  const preview = useCallback((destination: Destination | null) => setPreviewed(destination), []);
  const cycleUnit = useCallback(() => setUnitState((current) => nextUnit(current)), []);

  const value = useMemo<SiteValue>(
    () => ({
      subject: effective,
      setSubject,
      preview,
      origin,
      setOrigin: setOriginState,
      unit,
      setUnit: setUnitState,
      cycleUnit,
      soundOn,
      toggleSound,
      volume,
      setVolume,
      paletteOpen,
      setPaletteOpen,
      lockScroll,
      reducedMotion,
      go,
      subscribeScroll,
    }),
    [
      effective,
      setSubject,
      preview,
      origin,
      unit,
      cycleUnit,
      soundOn,
      toggleSound,
      volume,
      setVolume,
      paletteOpen,
      lockScroll,
      reducedMotion,
      go,
      subscribeScroll,
    ],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

const UNIT_ORDER: DistanceUnit[] = ['km', 'mi', 'au', 'ly', 'pc'];

function nextUnit(current: DistanceUnit): DistanceUnit {
  return UNIT_ORDER[(UNIT_ORDER.indexOf(current) + 1) % UNIT_ORDER.length];
}
