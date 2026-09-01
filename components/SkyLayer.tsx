'use client';

import { useEffect, useRef } from 'react';
import { SkyScene } from '@/lib/sky';
import { useSite } from './SiteProvider';

/**
 * The canvas behind everything. One long-lived `SkyScene` that cross-fades
 * between destinations rather than remounting, so the sky never blinks.
 */
export function SkyLayer() {
  const { subject, reducedMotion, subscribeScroll } = useSite();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SkyScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new SkyScene(canvas, subject.sky, { reducedMotion });
    sceneRef.current = scene;
    if (!reducedMotion) scene.start();

    const onResize = () => scene.resize();
    const onPointer = (event: PointerEvent) => {
      scene.setPointer(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2,
      );
    };
    const onWarp = (event: Event) => {
      const detail = (event as CustomEvent<{ ms?: number }>).detail;
      scene.warp(detail?.ms ?? 1000);
    };
    const onVisibility = () => {
      if (document.hidden) scene.stop();
      else if (!reducedMotion) scene.start();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('surreal:warp', onWarp);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('surreal:warp', onWarp);
      document.removeEventListener('visibilitychange', onVisibility);
      scene.destroy();
      sceneRef.current = null;
    };
    // The scene is created once and mutated from here on; `subject` is applied
    // by the effect below so that changing it cross-fades instead of remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setSky(subject.sky);

    // UI accents follow whatever is in the sky.
    const root = document.documentElement;
    root.style.setProperty('--accent', subject.sky.accent);
    root.style.setProperty('--glow', subject.sky.glow);
  }, [subject]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
    if (reducedMotion) sceneRef.current?.stop();
    else sceneRef.current?.start();
  }, [reducedMotion]);

  useEffect(() => subscribeScroll((progress) => sceneRef.current?.setScroll(progress)), [subscribeScroll]);

  return <canvas ref={canvasRef} className="sky" aria-hidden />;
}
