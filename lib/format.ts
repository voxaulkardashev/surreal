/**
 * Number, distance and duration formatting.
 *
 * The whole site leans on one visual idea borrowed from the reference poster:
 * absurd distances written out in full, comma-grouped digits. Doing that with
 * plain `toLocaleString()` leaks floating-point noise once you get past ~10^15,
 * so every big integer is rebuilt from a rounded mantissa with BigInt.
 */

export const KM_PER_AU = 149_597_870.7;
export const KM_PER_LY = 9_460_730_472_580.8;
export const KM_PER_PC = 30_856_775_814_913.673;
export const KM_PER_MILE = 1.609344;

/** Astronomical units -> kilometres. */
export const au = (n: number): number => n * KM_PER_AU;
/** Light years -> kilometres. */
export const ly = (n: number): number => n * KM_PER_LY;

/** Insert thin comma grouping into a plain digit string. */
export function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Render `value` as an exact, comma-grouped integer rounded to `sig`
 * significant figures. 8.177e15 -> "8,177,000,000,000,000".
 */
export function plainInteger(value: number, sig = 4): string {
  if (!Number.isFinite(value)) return '∞';
  if (value <= 0) return '0';
  const exponent = Math.floor(Math.log10(value));
  const scale = Math.max(0, exponent - sig + 1);
  const mantissa = Math.round(value / 10 ** scale);
  const digits = scale === 0 ? String(mantissa) : (BigInt(mantissa) * 10n ** BigInt(scale)).toString();
  return group(digits);
}

/** A short decimal, trimmed of trailing zeroes: 4.20 -> "4.2". */
export function trim(value: number, places = 2): string {
  return value
    .toFixed(places)
    .replace(/\.?0+$/, '')
    .replace(/^(-?\d+)$/, '$1');
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '-': '⁻', '+': '',
};

/** "5.77e-6" -> "5.77 × 10⁻⁶". Plain "10^-6" in body copy looks like a typo. */
export function scientific(value: number, places = 2): string {
  const [mantissa, exponent] = value.toExponential(places).split('e');
  const power = [...exponent].map((char) => SUPERSCRIPT[char] ?? char).join('');
  return `${mantissa} × 10${power}`;
}

export type DistanceUnit = 'km' | 'mi' | 'au' | 'ly' | 'pc';

export const DISTANCE_UNITS: { id: DistanceUnit; label: string; short: string }[] = [
  { id: 'km', label: 'kilometres', short: 'km' },
  { id: 'mi', label: 'miles', short: 'mi' },
  { id: 'au', label: 'astronomical units', short: 'AU' },
  { id: 'ly', label: 'light years', short: 'ly' },
  { id: 'pc', label: 'parsecs', short: 'pc' },
];

/**
 * Format a distance in the requested unit. Kilometres and miles keep the
 * full digit treatment; the astronomer's units get a readable decimal.
 */
export function formatDistance(km: number, unit: DistanceUnit): { value: string; unit: string } {
  switch (unit) {
    case 'mi':
      return { value: plainInteger(km / KM_PER_MILE), unit: 'mi' };
    case 'au': {
      const v = km / KM_PER_AU;
      return { value: v < 10_000 ? group(trim(v, v < 10 ? 3 : 1)) : plainInteger(v), unit: 'AU' };
    }
    case 'ly': {
      const v = km / KM_PER_LY;
      if (v < 0.001) return { value: scientific(v), unit: 'ly' };
      return { value: v < 10_000 ? group(trim(v, v < 10 ? 4 : 1)) : plainInteger(v), unit: 'ly' };
    }
    case 'pc': {
      const v = km / KM_PER_PC;
      if (v < 0.001) return { value: scientific(v), unit: 'pc' };
      return { value: v < 10_000 ? group(trim(v, v < 10 ? 4 : 1)) : plainInteger(v), unit: 'pc' };
    }
    case 'km':
    default:
      return { value: plainInteger(km), unit: 'km' };
  }
}

const BIG_SCALES: [number, string][] = [
  [1e33, 'decillion'],
  [1e30, 'nonillion'],
  [1e27, 'octillion'],
  [1e24, 'septillion'],
  [1e21, 'sextillion'],
  [1e18, 'quintillion'],
  [1e15, 'quadrillion'],
  [1e12, 'trillion'],
  [1e9, 'billion'],
];

const HOURS_PER_DAY = 24;
const HOURS_PER_YEAR = 8766; // 365.25 days

/**
 * Turn a duration in hours into the poster's laconic "106 days" / "8.7 years".
 * Past a billion years the digits stop meaning anything, so it switches to
 * short-scale words instead of printing a 20-digit wall.
 */
export function formatDuration(hours: number): { value: string; unit: string } {
  if (!Number.isFinite(hours)) return { value: '∞', unit: '' };
  if (hours < 1 / 60) return { value: '<1', unit: 'minute' };
  if (hours < 1) return { value: String(Math.round(hours * 60)), unit: 'minutes' };
  if (hours < 48) {
    const v = hours < 10 ? trim(hours, 1) : String(Math.round(hours));
    return { value: v, unit: Number(v) === 1 ? 'hour' : 'hours' };
  }

  const days = hours / HOURS_PER_DAY;
  if (days < 400) {
    const v = days < 10 ? trim(days, 1) : String(Math.round(days));
    return { value: v, unit: Number(v) === 1 ? 'day' : 'days' };
  }

  const years = hours / HOURS_PER_YEAR;
  if (years < 1e9) {
    const v = years < 10 ? trim(years, 1) : plainInteger(years, 3);
    return { value: v, unit: 'years' };
  }

  for (const [size, word] of BIG_SCALES) {
    if (years >= size) return { value: `${trim(years / size, 1)} ${word}`, unit: 'years' };
  }
  return { value: years.toExponential(1), unit: 'years' };
}
