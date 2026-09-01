import { formatDuration, plainInteger } from './format';

export type TravelIcon =
  | 'walk'
  | 'bike'
  | 'car'
  | 'train'
  | 'jet'
  | 'rocket'
  | 'probe'
  | 'sun'
  | 'light';

export interface TravelMode {
  id: string;
  /** Short label used under the icon row. */
  label: string;
  /** Longer label used in the expanded table. */
  name: string;
  icon: TravelIcon;
  /** Constant cruise speed in km/h. No stops, no sleeping, no relativity. */
  kph: number;
  /** Where the number comes from. */
  source: string;
}

/**
 * Speeds are held constant, which is of course a lie — but it is the same lie
 * the reference poster tells, and it keeps every card comparable. The walk,
 * train and rocket figures are tuned to reproduce the poster's Moon card
 * (4 days / 106 days / 8.7 years) exactly.
 */
export const TRAVEL_MODES: TravelMode[] = [
  { id: 'walk', label: 'on foot', name: 'Walking', icon: 'walk', kph: 5, source: 'a steady human pace, never stopping' },
  { id: 'bike', label: 'by bicycle', name: 'Bicycle', icon: 'bike', kph: 20, source: 'an unhurried cyclist' },
  { id: 'car', label: 'by car', name: 'Car', icon: 'car', kph: 105, source: 'motorway cruise' },
  { id: 'train', label: 'by train', name: 'High-speed rail', icon: 'train', kph: 149, source: 'average Shinkansen service speed' },
  { id: 'jet', label: 'by airliner', name: 'Airliner', icon: 'jet', kph: 900, source: 'Boeing 787 cruise' },
  { id: 'rocket', label: 'by rocket', name: 'Apollo rocket', icon: 'rocket', kph: 3958, source: 'Apollo translunar average' },
  { id: 'voyager', label: 'as Voyager 1', name: 'Voyager 1', icon: 'probe', kph: 61_500, source: 'heliocentric speed, 2025' },
  { id: 'parker', label: 'as Parker', name: 'Parker Solar Probe', icon: 'sun', kph: 692_000, source: 'fastest object ever built' },
  { id: 'light', label: 'at light speed', name: 'Light', icon: 'light', kph: 1_079_252_848.8, source: 'the cosmic speed limit' },
];

/** The three modes the poster puts at the bottom of every card. */
export const FEATURED_MODE_IDS = ['rocket', 'train', 'walk'] as const;

export const featuredModes = (): TravelMode[] =>
  FEATURED_MODE_IDS.map((id) => TRAVEL_MODES.find((m) => m.id === id)!);

export const modeById = (id: string): TravelMode =>
  TRAVEL_MODES.find((m) => m.id === id) ?? TRAVEL_MODES[0];

/** Hours of travel at a mode's cruise speed. */
export const hoursFor = (km: number, mode: TravelMode): number => km / mode.kph;

/** Pre-formatted "4 / days" pair for a given distance and mode. */
export const travelTime = (km: number, mode: TravelMode) => formatDuration(hoursFor(km, mode));

export const speedLabel = (mode: TravelMode): string => `${plainInteger(mode.kph, 4)} km/h`;
