'use client';

import { PageContainer } from '@/components/PageContainer';
import { SmartLink } from '@/components/SmartLink';
import { SiteFooter } from '@/components/views/Arrival';
import { ArrowIcon } from '@/components/Icons';
import { DESTINATIONS } from '@/lib/destinations';
import { TRAVEL_MODES, speedLabel } from '@/lib/travel';

const SHORTCUTS: [string, string][] = [
  ['⌘K  /', 'open the destination picker'],
  ['← →', 'step in and out along the catalog'],
  ['U', 'cycle distance units'],
  ['M', 'ambient sound on and off'],
  ['Esc', 'close the picker'],
];

export function AboutView() {
  return (
    <PageContainer namespace="about">
      <section className="section" style={{ paddingTop: 'calc(var(--hud-h) + 12vh)' }}>
        <div className="stack" style={{ maxWidth: '68ch' }}>
          <p className="eyebrow" data-reveal>
            colophon
          </p>
          <h2 data-reveal style={{ fontSize: 'clamp(30px, 5vw, 60px)' }}>
            A departure board for places nobody is going.
          </h2>
          <div className="prose" data-reveal>
            <p>
              This began as a set of photographs with navigation directions laid over the sky —
              the Moon at 380,000 km, four days by rocket, 8.7 years on foot. The joke lands
              because the numbers are real. So this is the same idea, made interactive, with{' '}
              {DESTINATIONS.length} destinations instead of four.
            </p>
            <p>
              Nothing here is photographed. Every sky is drawn at runtime on a canvas — the
              gradient, the star field, the haze, the crescent, the accretion disc, the star
              trails around the pole. Change destination and the sky cross-fades rather than
              cutting, because the sky is one long-lived object that outlives the page.
            </p>
            <p>
              Nothing here is recorded either. The ambience is synthesised in the browser: a
              six-voice drone tuned to a chord chosen by the destination, a bed of pink noise,
              a reverb built from decaying noise, and a bell that strikes every so often. It
              starts only when you ask it to, because browsers are right about autoplay.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="grid-2">
          <div className="stack" style={{ gap: 20 }}>
            <h2 style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}>How the numbers work</h2>
            <div className="prose">
              <p>
                Distances are straight-line separations from Earth in kilometres, taken from
                the measurement the object is best known by — closest approach for planets,
                parallax for nearby stars, comoving distance for anything cosmological. Each
                card names its basis.
              </p>
              <p>
                Durations assume constant speed, no stops, no acceleration, no fuel, and no
                relativity. At a walk you would need to keep walking. Travel times past a
                billion years switch from digits to words, because a twenty-digit number stops
                being a number and becomes a wall.
              </p>
              <p>
                Choosing an origin other than Earth gives a first-order radial separation
                rather than a true geometry, and the card says so when you do.
              </p>
            </div>
          </div>

          <div className="stack" style={{ gap: 20, width: '100%' }}>
            <h2 style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}>Speeds</h2>
            <div className="table-scroll" data-lenis-prevent>
              <table className="modes">
              <tbody>
                {TRAVEL_MODES.map((mode) => (
                  <tr key={mode.id}>
                    <td style={{ display: 'table-cell' }}>
                      {mode.name}
                      <span className="travel__meta">{mode.source}</span>
                    </td>
                    <td>{speedLabel(mode)}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="grid-2">
          <div className="stack" style={{ gap: 18, width: '100%' }}>
            <h2 style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}>Keyboard</h2>
            <dl className="spec">
              {SHORTCUTS.map(([key, meaning]) => (
                <div key={key}>
                  <dt className="mono" style={{ letterSpacing: '0.14em' }}>
                    {key}
                  </dt>
                  <dd>{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="stack" style={{ gap: 18 }}>
            <h2 style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}>Built with</h2>
            <div className="prose">
              <p>
                Next.js and React for the structure. Lenis for the scroll. GSAP for the
                animation, including the scroll-driven ladder. Barba.js for the page
                transitions — with its router stood down so Next keeps control of navigation,
                and its transition store, namespace rules and hook bus kept, which is the half
                that earns its place in a React app.
              </p>
              <p>Canvas 2D for the sky. Web Audio for the sound. No images, no audio files.</p>
            </div>
            <SmartLink href="/atlas" className="btn">
              Back to the atlas <ArrowIcon />
            </SmartLink>
          </div>
        </div>
      </section>

      <SiteFooter />
    </PageContainer>
  );
}
