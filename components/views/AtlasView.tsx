'use client';

import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { SmartLink } from '@/components/SmartLink';
import { SiteFooter } from '@/components/views/Arrival';
import { useSite } from '@/components/SiteProvider';
import { CATEGORIES, DESTINATIONS, type Category } from '@/lib/destinations';
import { formatDistance } from '@/lib/format';
import { featuredModes, travelTime } from '@/lib/travel';

export function AtlasView() {
  const { unit, preview } = useSite();
  const [filter, setFilter] = useState<Category | 'all'>('all');

  const shown = useMemo(
    () =>
      DESTINATIONS.filter((d) => filter === 'all' || d.category === filter).sort(
        (a, b) => a.distanceKm - b.distanceKm,
      ),
    [filter],
  );

  const rocket = featuredModes()[0];
  const used = new Set(DESTINATIONS.map((d) => d.category));

  return (
    <PageContainer namespace="atlas">
      <section className="section" style={{ paddingTop: 'calc(var(--hud-h) + 12vh)' }}>
        <div className="section__head" data-reveal>
          <div className="stack" style={{ gap: 12 }}>
            <p className="eyebrow">the atlas</p>
            <h2>Everywhere you could be going.</h2>
          </div>
          <p className="mono">
            {shown.length} destination{shown.length === 1 ? '' : 's'} · sorted by distance
          </p>
        </div>

        <div className="filters" data-reveal>
          <button
            type="button"
            className="chip"
            data-on={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            everything
          </button>
          {CATEGORIES.filter((c) => used.has(c.id)).map((category) => (
            <button
              key={category.id}
              type="button"
              className="chip"
              data-on={filter === category.id}
              onClick={() => setFilter(category.id)}
              title={category.blurb}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="atlas" data-reveal onMouseLeave={() => preview(null)}>
          {shown.map((destination) => {
            const distance = formatDistance(destination.distanceKm, unit);
            const time = travelTime(destination.distanceKm, rocket);
            return (
              <SmartLink
                key={destination.slug}
                href={`/route/${destination.slug}`}
                className="tile"
                style={{ ['--tile-accent' as string]: destination.sky.accent }}
                onMouseEnter={() => preview(destination)}
                onFocus={() => preview(destination)}
              >
                <p className="tile__cat">
                  {CATEGORIES.find((c) => c.id === destination.category)?.label}
                </p>
                <p className="tile__name">{destination.name}</p>
                {destination.designation && <p className="tile__sub">{destination.designation}</p>}
                <p className="tile__blurb">{destination.blurb}</p>
                <p className="tile__dist">
                  <span>
                    {distance.value} {distance.unit}
                  </span>
                  <span>
                    {time.value} {time.unit} by rocket
                  </span>
                </p>
              </SmartLink>
            );
          })}
        </div>
      </section>

      <SiteFooter />
    </PageContainer>
  );
}
