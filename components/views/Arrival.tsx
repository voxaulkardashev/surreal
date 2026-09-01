'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { RouteCard } from '@/components/RouteCard';
import { SmartLink } from '@/components/SmartLink';
import { useSite } from '@/components/SiteProvider';
import { ArrowIcon } from '@/components/Icons';
import { BY_SLUG, DESTINATIONS } from '@/lib/destinations';

/** The four cards from the poster that started this, in order. */
const OPENING = ['moon', 'venus', 'rigel', 'polaris', 'sagittarius-a-star', 'andromeda'];

export function Arrival() {
  const { paletteOpen, reducedMotion, setPaletteOpen } = useSite();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  const reel = useMemo(() => OPENING.map((slug) => BY_SLUG[slug]).filter(Boolean), []);
  const featured = reel[index % reel.length];

  useEffect(() => {
    if (reducedMotion || held || paletteOpen) return undefined;
    const id = window.setInterval(() => setIndex((n) => n + 1), 9000);
    return () => window.clearInterval(id);
  }, [held, paletteOpen, reducedMotion]);

  return (
    <PageContainer namespace="arrival" subject={featured}>
      <section className="stage">
        <div className="stage__column stack">
          <p className="eyebrow" data-reveal>
            directions to everywhere
          </p>
          <h1 className="display" data-reveal>
            Everything is <em>further</em> than you think.
          </h1>
          <p className="lede" data-reveal>
            {featured.name} — {featured.blurb.charAt(0).toLowerCase() + featured.blurb.slice(1)}
          </p>
        </div>

        <div
          className="stage__column"
          style={{ marginTop: 'clamp(26px, 5vh, 50px)' }}
          data-reveal
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
        >
          <RouteCard destination={featured} />
        </div>

        <div className="row" style={{ marginTop: 'clamp(24px, 5vh, 46px)' }} data-reveal>
          <button type="button" className="btn" onClick={() => setPaletteOpen(true)}>
            Choose a destination
          </button>
          <SmartLink href={`/route/${featured.slug}`} className="btn btn--ghost">
            Plot this course <ArrowIcon />
          </SmartLink>
          <button
            type="button"
            className="chip"
            onClick={() => setIndex((n) => n + 1)}
            aria-label="Show the next destination"
          >
            next
          </button>
        </div>

        <div className="scroll-cue" aria-hidden>
          <i />
          scroll
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>
            {DESTINATIONS.length} places, one departure board.
          </h2>
          <p className="mono">no ship provided</p>
        </div>
        <div className="grid-2">
          <div className="prose">
            <p>
              Every card is the same shape: a destination, an origin, the distance between
              them, and how long the trip takes at a walk, at line speed, and at the average
              velocity of an Apollo stack on its way to the Moon.
            </p>
            <p>
              None of these are practical. That is rather the point — the numbers are
              accurate, and the accuracy is what makes them absurd. Walking to the Moon takes
              under nine years. Walking to Rigel takes longer than the universe has existed.
            </p>
          </div>
          <div className="stack">
            <p className="pull">
              The sky behind each card is generated for that destination — its colour, its
              star density, whatever is hanging in it.
            </p>
            <SmartLink href="/atlas" className="btn">
              Open the atlas <ArrowIcon />
            </SmartLink>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <h2>Start somewhere</h2>
          <p className="mono">nearest first</p>
        </div>
        <div className="atlas">
          {DESTINATIONS.slice()
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 6)
            .map((destination) => (
              <SmartLink
                key={destination.slug}
                href={`/route/${destination.slug}`}
                className="tile"
                style={{ ['--tile-accent' as string]: destination.sky.accent }}
              >
                <p className="tile__cat">{destination.category}</p>
                <p className="tile__name">{destination.name}</p>
                <p className="tile__sub">{destination.blurb}</p>
              </SmartLink>
            ))}
        </div>
      </section>

      <SiteFooter />
    </PageContainer>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <span>Surreal — a cosmic wayfinding toy</span>
      <span>Distances are straight lines. Speeds are constant. Relativity is ignored.</span>
      <SmartLink href="/about">Colophon</SmartLink>
    </footer>
  );
}
