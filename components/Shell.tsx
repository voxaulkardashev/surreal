'use client';

import type { ReactNode } from 'react';
import { SiteProvider } from './SiteProvider';
import { SkyLayer } from './SkyLayer';
import { Hud } from './Hud';
import { Curtain } from './Curtain';
import { Palette } from './Palette';

/**
 * Everything that outlives a page transition lives here: the sky canvas, the
 * grain, the HUD, the curtain and the picker. Only what is inside
 * `.barba-wrapper` is swapped when the route changes.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <SiteProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SkyLayer />
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />
      <Hud />
      <div className="barba-wrapper" data-barba="wrapper">
        {children}
      </div>
      <Curtain />
      <Palette />
    </SiteProvider>
  );
}
