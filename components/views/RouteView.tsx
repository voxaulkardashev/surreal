'use client';

import { useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { RouteCard } from '@/components/RouteCard';
import { ScaleRuler } from '@/components/ScaleRuler';
import { SmartLink } from '@/components/SmartLink';
import { SiteFooter } from '@/components/views/Arrival';
import { TravelGlyph } from '@/components/Icons';
import { useSite } from '@/components/SiteProvider';
import {
  CATEGORIES,
  neighbours,
  separation,
  type Destination,
} from '@/lib/destinations';
import { formatDistance } from '@/lib/format';
import { FEATURED_MODE_IDS, TRAVEL_MODES, modeById, speedLabel, travelTime } from '@/lib/travel';

export function RouteView({ destination }: { destination: Destination }) {
  const { origin, unit, go, paletteOpen } = useSite();
  const { previous, next } = neighbours(destination.slug);
  const km = separation(origin, destination);
  const category = CATEGORIES.find((c) => c.id === destination.category);
  const featured = new Set<string>(FEATURED_MODE_IDS);
  const light = travelTime(km, modeById('light'));
  const distance = formatDistance(km, unit);

  // ← and → walk the catalog outward and inward.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (paletteOpen || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target?.isContentEditable) return;
      if (event.key === 'ArrowRight') go(`/route/${next.slug}`);
      if (event.key === 'ArrowLeft') go(`/route/${previous.slug}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, next.slug, paletteOpen, previous.slug]);

  return (
    <PageContainer namespace="route" subject={destination}>
      <section className="stage">
        <div className="stack" style={{ marginBottom: 'clamp(26px, 5vh, 48px)' }}>
          <p className="eyebrow" data-reveal>
            {category?.label}
            {destination.designation ? ` · ${destination.designation}` : ''}
          </p>
          <p className="pull" data-reveal>
            {destination.blurb}
          </p>
        </div>

        <div data-reveal>
          <RouteCard destination={destination} />
        </div>

        <div className="scroll-cue" aria-hidden>
          <i />
          the journey
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Field notes</h2>
          <p className="mono">{destination.basis}</p>
        </div>
        <div className="grid-2">
          <div className="prose">
            <p>{destination.note}</p>
            <p>{destination.fact}</p>
          </div>
          <div className="pane stack" style={{ gap: 18 }}>
            <p className="mono">at a glance</p>
            <dl className="spec">
              <Row label="Distance" value={`${distance.value} ${distance.unit}`} />
              <Row label="Light delay" value={`${light.value} ${light.unit}`} />
              <Row label="Class" value={category?.label ?? destination.category} />
              <Row label="Departing" value={origin.name} />
            </dl>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <h2>Where that sits</h2>
          <p className="mono">logarithmic — every rung is roughly a hundredfold</p>
        </div>
        <ScaleRuler destination={destination} />
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Every way to get there</h2>
          <p className="mono">constant speed, no stops, no relativity</p>
        </div>
        <div className="table-scroll" data-lenis-prevent>
          <table className="modes">
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col">Duration</th>
              <th scope="col">Speed</th>
            </tr>
          </thead>
          <tbody>
            {TRAVEL_MODES.map((mode) => {
              const time = travelTime(km, mode);
              return (
                <tr key={mode.id} data-featured={featured.has(mode.id)}>
                  <td>
                    <TravelGlyph icon={mode.icon} />
                    <span>
                      {mode.name}
                      <span className="travel__meta">{mode.source}</span>
                    </span>
                  </td>
                  <td>
                    <b>{time.value}</b> {time.unit}
                  </td>
                  <td>{speedLabel(mode)}</td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <nav className="pager" aria-label="Nearby destinations">
          <SmartLink href={`/route/${previous.slug}`}>
            <small>← closer in</small>
            <b>{previous.name}</b>
          </SmartLink>
          <SmartLink href={`/route/${next.slug}`} style={{ textAlign: 'right' }}>
            <small>further out →</small>
            <b>{next.name}</b>
          </SmartLink>
        </nav>
      </section>

      <SiteFooter />
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mono">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
