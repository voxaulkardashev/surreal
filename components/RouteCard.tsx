'use client';

import { NavigationIcon, PinIcon, TravelGlyph } from './Icons';
import { useSite } from './SiteProvider';
import { ORIGINS, separation, type Destination } from '@/lib/destinations';
import { formatDistance } from '@/lib/format';
import { featuredModes, speedLabel, travelTime } from '@/lib/travel';

interface Props {
  destination: Destination;
  /** Fields become buttons and the numbers respond to the unit toggle. */
  interactive?: boolean;
}

/**
 * The card the whole site is built around: destination, distance, origin, and
 * how long the trip takes by three deeply unsuitable modes of transport.
 */
export function RouteCard({ destination, interactive = true }: Props) {
  const { origin, setOrigin, unit, cycleUnit, setPaletteOpen } = useSite();

  const km = separation(origin, destination);
  const distance = formatDistance(km, unit);
  const modes = featuredModes();
  const arrived = origin.slug === destination.slug;

  const rotateOrigin = () => {
    const index = ORIGINS.findIndex((o) => o.slug === origin.slug);
    setOrigin(ORIGINS[(index + 1) % ORIGINS.length]);
  };

  return (
    <div className="card">
      <div className="card__icon" aria-hidden>
        <PinIcon />
      </div>
      {interactive ? (
        <button
          type="button"
          className="field"
          onClick={() => setPaletteOpen(true)}
          aria-label={`Destination: ${destination.name}. Choose another.`}
        >
          <span className="field__value">{destination.name}</span>
          <span className="field__hint">change</span>
        </button>
      ) : (
        <div className="field">
          <span className="field__value">{destination.name}</span>
        </div>
      )}

      <div className="card__connector" aria-hidden>
        <span className="card__dots">
          <i />
          <i />
          <i />
        </span>
      </div>
      <p className="card__distance">
        {arrived ? (
          <b>you are already there</b>
        ) : (
          <>
            <b>{distance.value}</b>
            <span>{distance.unit}</span>
            {interactive && (
              <button type="button" onClick={cycleUnit} aria-label="Change distance units">
                units
              </button>
            )}
          </>
        )}
      </p>

      <div className="card__icon" aria-hidden>
        <NavigationIcon />
      </div>
      {interactive ? (
        <button
          type="button"
          className="field"
          onClick={rotateOrigin}
          aria-label={`Departing from ${origin.name}. Choose another origin.`}
        >
          <span className="field__value">{origin.name}</span>
          <span className="field__hint">depart from</span>
        </button>
      ) : (
        <div className="field">
          <span className="field__value">{origin.name}</span>
        </div>
      )}

      <ul className="travel" hidden={arrived}>
        {modes.map((mode) => {
          const time = travelTime(km, mode);
          return (
            <li className="travel__item" key={mode.id}>
              <TravelGlyph icon={mode.icon} />
              <span>
                <span className="travel__value">
                  <b>{time.value}</b>
                  <span>{time.unit}</span>
                </span>
                <span className="travel__meta" title={`${mode.name} — ${speedLabel(mode)}`}>
                  {mode.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {origin.slug !== 'earth' && !arrived && (
        <p className="card__note">
          radial separation from {origin.name} — a first-order figure, exact only from Earth
        </p>
      )}
    </div>
  );
}
