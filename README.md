# Surreal

A cosmic wayfinding site. Pick a destination — a moon, a star, a nebula, a black
hole, the edge of the observable universe — and get directions from Earth: the
distance written out in full, and how long the trip takes on foot, by train and
by rocket. Ambient sound optional.

It is the "navigation directions over a photograph of the night sky" idea, made
interactive, with 43 destinations and a sky that is drawn rather than
photographed.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
```

Node 20+.

## What's in it

- **The card.** Destination, origin, distance, and three deeply unsuitable modes
  of transport. Every field is live: change the destination, swap the origin,
  cycle the units.
- **A generated sky per destination.** Gradient, star field, nebular haze, a
  crescent moon, an accretion disc, star trails around the pole, a torii on the
  horizon — all canvas 2D, no images. Changing destination cross-fades.
- **Ambient sound.** Synthesised in the browser: a six-voice drone tuned to a
  chord chosen by the destination's mood, a bed of pink noise, a generated
  reverb, and a bell every so often. No audio files. Starts on a click, never
  before.
- **⌘K / Ctrl-K picker**, ranked search across 43 destinations.
- **The atlas** at `/atlas`, filterable by class; hovering a tile previews its
  sky behind the grid.
- **A scroll-driven ladder** placing the destination on a logarithmic scale from
  a lap of the Earth to the particle horizon.
- **Page transitions** driven by Barba.js — see below.

Keyboard: `⌘K` or `/` picker · `←` `→` step in and out along the catalog ·
`U` units · `M` sound · `Esc` close.

## Stack, and one deliberate oddity

Next.js 15 (App Router) · React 19 · TypeScript · Lenis · GSAP (with
ScrollTrigger) · Barba.js · Canvas 2D · Web Audio. No CSS framework — the styles
are one hand-written sheet.

**Barba.js in a React app needs an explanation.** Barba normally *is* the router:
it intercepts clicks, fetches the next page over the wire, and swaps the
`[data-barba="container"]` element itself. In a React app that is a footgun — the
swapped-in markup is dead DOM that React never hydrated, and the next
client-side navigation renders against nodes that no longer exist.

So `lib/barba.ts` keeps the half of Barba that genuinely earns its place and
gives navigation to Next:

1. `barba.init()` parses the transitions in `lib/transitions.ts` into
   `barba.transitions.store` and fires the registered `once` transition.
2. `barba.destroy()` immediately unbinds Barba's click and popstate listeners.
   `destroy()` does not touch `barba.transitions`, so the store, its
   `from`/`to` namespace resolution rules and the hook bus all survive. This is
   the documented way to stop Barba routing.
3. `navigate()` replays Barba's page lifecycle by hand — `before`, `beforeLeave`,
   `leave`, `afterLeave`, `beforeEnter`, `enter`, `afterEnter`, `after` — with
   `router.push()` in the middle instead of a fetch and a DOM swap, calling
   Barba's own `transitions.leave()` / `transitions.enter()` for the two main
   phases.

Transitions are therefore written exactly as the Barba docs describe, scoped
with `to: { namespace: 'route' }` and friends, and anything can subscribe with
`barba.hooks.leave(fn)` — the ambient engine's transition whoosh does exactly
that. The import is dynamic because `@barba/core` patches `Element.prototype` at
module scope, which throws during prerender.

`types/barba-core.d.ts` re-points the module at its real declarations; the
published `types` field points at a directory that does not exist in the tarball.

## How the numbers work

Distances are straight-line separations from Earth in kilometres, taken from the
measurement each object is best known by — closest approach for planets,
parallax for nearby stars, comoving distance for anything cosmological. Every
card names its basis.

Durations assume constant speed, no stops, no acceleration, no fuel and no
relativity. The walking, rail and rocket speeds are tuned so the Moon card
reproduces the reference exactly: **4 days by rocket, 107 days by train, 8.8
years on foot.**

| Mode | Speed | Basis |
| --- | --- | --- |
| Walking | 5 km/h | a steady human pace |
| Bicycle | 20 km/h | an unhurried cyclist |
| Car | 105 km/h | motorway cruise |
| High-speed rail | 149 km/h | average Shinkansen service speed |
| Airliner | 900 km/h | Boeing 787 cruise |
| Apollo rocket | 3,958 km/h | Apollo translunar average |
| Voyager 1 | 61,500 km/h | heliocentric speed, 2025 |
| Parker Solar Probe | 692,000 km/h | fastest object ever built |
| Light | 1,079,252,849 km/h | the cosmic speed limit |

Big numbers are rebuilt from a rounded mantissa with `BigInt` rather than
`toLocaleString`, which leaks floating-point noise past ~10¹⁵. Travel times
switch from digits to short-scale words past a billion years, because a
twenty-digit number stops being a number and becomes a wall.

Choosing an origin other than Earth gives a first-order radial separation rather
than true geometry, and the card says so when you do.

## Layout

```
app/                    routes — /, /atlas, /route/[slug], /about
components/             shell, HUD, card, picker, ruler, icons
components/views/       one component per route
lib/destinations.ts     the catalog: distance, copy, sky and mood per entry
lib/sky.ts              the canvas renderer
lib/audio.ts            the Web Audio ambient engine
lib/barba.ts            the Barba/Next bridge
lib/transitions.ts      Barba transition definitions (GSAP)
lib/travel.ts           travel modes
lib/format.ts           distance and duration formatting
```

## Adding a destination

Append an entry to `DESTINATIONS` in `lib/destinations.ts`. `generateStaticParams`
picks it up, the atlas and the picker pick it up, and the sky renders from the
`sky` block — pick a `body` from `SkyBody`, a `horizon`, three gradient stops,
a glow and an accent. The `mood` chooses the chord the ambience retunes to.

## Accessibility

`prefers-reduced-motion` disables Lenis, stops the canvas animation loop after a
single static render, collapses the transitions to near-instant and stops the
scroll cue. Everything is reachable by keyboard, the picker is a labelled modal
with arrow-key navigation, and there is a skip link.

## Caveats

The fonts (Jost, IBM Plex Mono) load from Google Fonts; without a network the
fallback stack takes over and the site still looks like itself. Nothing is
persisted server-side — units and volume live in `localStorage`.
