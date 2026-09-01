'use client';

import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { au, formatDistance, ly } from '@/lib/format';
import type { Destination } from '@/lib/destinations';
import { useSite } from './SiteProvider';

interface Landmark {
  label: string;
  km: number;
}

/** Fixed rungs on the ladder, so any destination has something to sit between. */
const LANDMARKS: Landmark[] = [
  { label: 'Around the Earth', km: 40_075 },
  { label: 'The Moon', km: 384_400 },
  { label: 'The Sun', km: au(1) },
  { label: 'Neptune', km: 4_300_000_000 },
  { label: 'Voyager 1', km: 25_100_000_000 },
  { label: 'The Oort Cloud', km: au(100_000) },
  { label: 'Proxima Centauri', km: ly(4.2465) },
  { label: 'Rigel', km: ly(864.3) },
  { label: 'The galactic centre', km: ly(26_000) },
  { label: 'Andromeda', km: ly(2_537_000) },
  { label: 'The Virgo Cluster', km: ly(65_000_000) },
  { label: 'The observable edge', km: ly(46_500_000_000) },
];

/**
 * A logarithmic ladder from a lap of the Earth to the particle horizon, with
 * the current destination slotted into place. The line down the left fills as
 * the section scrolls past.
 */
export function ScaleRuler({ destination }: { destination: Destination }) {
  const { unit, reducedMotion } = useSite();
  const listRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    // Drop any rung the destination effectively *is* — Rigel is a landmark and
    // also a destination, under two different names.
    const isSameRung = (km: number) =>
      Math.abs(Math.log10(km) - Math.log10(destination.distanceKm)) < 0.02;
    const merged: (Landmark & { here?: boolean })[] = [
      ...LANDMARKS.filter((l) => l.label !== destination.name && !isSameRung(l.km)),
      { label: destination.name, km: destination.distanceKm, here: true },
    ];
    return merged.sort((a, b) => a.km - b.km);
  }, [destination]);

  useEffect(() => {
    const list = listRef.current;
    const bar = barRef.current;
    if (!list || !bar) return undefined;

    if (reducedMotion) {
      gsap.set(bar, { height: '100%' });
      return undefined;
    }

    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: list,
      start: 'top 80%',
      end: 'bottom 65%',
      scrub: 0.7,
      onUpdate: (self) => gsap.set(bar, { height: `${self.progress * 100}%` }),
    });
    return () => trigger.kill();
  }, [reducedMotion, rows]);

  return (
    <div className="ruler" ref={listRef}>
      <div className="ruler__bar" ref={barRef} style={{ height: 0 }} aria-hidden />
      {rows.map((row) => {
        const distance = formatDistance(row.km, unit);
        return (
          <div className="ruler__row" key={`${row.label}-${row.km}`} data-here={row.here ?? false}>
            <b>{row.label}</b>
            <span>
              {distance.value} {distance.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
