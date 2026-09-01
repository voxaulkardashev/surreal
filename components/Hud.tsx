'use client';

import { usePathname } from 'next/navigation';
import { MuteIcon, SearchIcon, SoundIcon } from './Icons';
import { SmartLink } from './SmartLink';
import { useSite } from './SiteProvider';
import { DISTANCE_UNITS } from '@/lib/format';

const LINKS = [
  { href: '/atlas', label: 'Atlas' },
  { href: '/about', label: 'Colophon' },
];

export function Hud() {
  const pathname = usePathname();
  const { setPaletteOpen, soundOn, toggleSound, unit, cycleUnit } = useSite();
  const unitMeta = DISTANCE_UNITS.find((u) => u.id === unit);

  return (
    <header className="hud">
      <div className="hud__group">
        <SmartLink href="/" className="hud__mark" aria-label="Surreal, home">
          Surreal<span>wayfinding</span>
        </SmartLink>
        <nav className="hud__nav" aria-label="Primary">
          {LINKS.map((link) => (
            <SmartLink
              key={link.href}
              href={link.href}
              className="hud__link"
              data-active={pathname.startsWith(link.href)}
            >
              {link.label}
            </SmartLink>
          ))}
        </nav>
      </div>

      <div className="hud__tools">
        <button type="button" className="chip" onClick={() => setPaletteOpen(true)}>
          <SearchIcon style={{ width: 13, height: 13 }} />
          <span className="chip__label">Destination</span>
          <span className="chip__kbd">⌘K</span>
        </button>
        <button
          type="button"
          className="chip"
          onClick={cycleUnit}
          title="Cycle distance units (U)"
          aria-label={`Distance units: ${unitMeta?.label}. Change.`}
        >
          {unitMeta?.short}
        </button>
        <button
          type="button"
          className="chip"
          data-on={soundOn}
          onClick={toggleSound}
          aria-pressed={soundOn}
          title="Ambient sound (M)"
        >
          {soundOn ? (
            <SoundIcon style={{ width: 14, height: 14 }} />
          ) : (
            <MuteIcon style={{ width: 14, height: 14 }} />
          )}
          <span className="sr-only">{soundOn ? 'Mute ambience' : 'Play ambience'}</span>
        </button>
      </div>
    </header>
  );
}
