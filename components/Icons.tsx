import type { SVGProps } from 'react';
import type { TravelIcon } from '@/lib/travel';

/**
 * Hand-drawn glyph set, 24×24, all in `currentColor`.
 * Solid where the poster is solid, stroked where a line reads better.
 */

type Props = SVGProps<SVGSVGElement>;

const base = (props: Props) => ({
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
  focusable: 'false' as const,
  'aria-hidden': true,
  ...props,
});

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const PinIcon = (props: Props) => (
  <svg {...base(props)} fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12 1.6a7.3 7.3 0 0 0-7.3 7.3c0 5.3 6.4 12.6 6.7 12.9a.8.8 0 0 0 1.2 0c.3-.3 6.7-7.6 6.7-12.9A7.3 7.3 0 0 0 12 1.6Zm0 9.9a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z"
    />
  </svg>
);

export const NavigationIcon = (props: Props) => (
  <svg {...base(props)} fill="currentColor">
    <path d="M12 1.7 4.1 21.1a.7.7 0 0 0 1 .85L12 18.3l6.9 3.65a.7.7 0 0 0 1-.85Z" />
  </svg>
);

export const RocketIcon = (props: Props) => (
  <svg {...base(props)} fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12 1.2c3.2 2.5 5 6.3 5 10.4v3.1H7v-3.1c0-4.1 1.8-7.9 5-10.4Zm0 5.9a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z"
    />
    <path d="M6.1 11.6 3.2 15v3.9l2.9-2.4Zm11.8 0 2.9 3.4v3.9l-2.9-2.4Z" />
    <path d="M9.9 16.2h4.2l-2.1 6.4Z" opacity="0.9" />
  </svg>
);

export const TrainIcon = (props: Props) => (
  <svg {...base(props)} fill="currentColor">
    <path
      fillRule="evenodd"
      d="M7.4 1.8h9.2a3 3 0 0 1 3 3v10.4a3.6 3.6 0 0 1-3.6 3.6H8a3.6 3.6 0 0 1-3.6-3.6V4.8a3 3 0 0 1 3-3Zm-.5 4.1v4.4h10.2V5.9Zm1.4 8.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm7.4 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z"
    />
    <path {...stroke} fill="none" d="m7.6 19.4-2.4 2.9m11.2-2.9 2.4 2.9" />
  </svg>
);

export const WalkIcon = (props: Props) => (
  <svg {...base(props)} fill="currentColor">
    <circle cx="13.4" cy="3.7" r="2.3" />
    <path {...stroke} strokeWidth={2.2} d="M13 8.1 10.4 13m2.6-4.9 2.3 3.6 2.9.9M13 8.1l-3.6 1.4-.9 3.3m4 .2.4 4.1 2 4.4m-2.4-8.5-2.8 3.4-2.6 4" />
  </svg>
);

export const BikeIcon = (props: Props) => (
  <svg {...base(props)}>
    <g {...stroke} strokeWidth={1.7}>
      <circle cx="5.4" cy="16.6" r="4.1" />
      <circle cx="18.6" cy="16.6" r="4.1" />
      <path d="m5.4 16.6 4.2-6.4h5.1l4 6.4M9.6 10.2 8 6.6h3.4m3.3 3.6-1.5 6.4" />
    </g>
    <circle cx="16.6" cy="4.4" r="1.7" fill="currentColor" />
  </svg>
);

export const CarIcon = (props: Props) => (
  <svg {...base(props)} fill="currentColor">
    <path d="M4.8 9.6 6.6 5a2 2 0 0 1 1.9-1.3h7a2 2 0 0 1 1.9 1.3l1.8 4.6 1.2.8a2 2 0 0 1 .9 1.7v4.5a1 1 0 0 1-1 1h-.9v1.3a1.4 1.4 0 0 1-2.8 0v-1.3H7.4v1.3a1.4 1.4 0 0 1-2.8 0v-1.3h-.9a1 1 0 0 1-1-1v-4.5a2 2 0 0 1 .9-1.7ZM7.9 9.4h8.2l-1.3-3.5a.6.6 0 0 0-.6-.4H9.8a.6.6 0 0 0-.6.4Zm-1.6 3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm11.4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" fillRule="evenodd" />
  </svg>
);

export const JetIcon = (props: Props) => (
  <svg {...base(props)} fill="currentColor">
    <path d="M22 12.4c0 .7-.5 1.2-1.1 1.4l-6.2 1.7-2.4 6.3a.7.7 0 0 1-.7.4h-1.2a.6.6 0 0 1-.6-.8l1.5-5.4-4 1.1-.9 2a.7.7 0 0 1-.6.4h-.8a.6.6 0 0 1-.6-.8l.7-2.5-1.9-1.4a.7.7 0 0 1 0-1.2l1.9-1.4-.7-2.5a.6.6 0 0 1 .6-.8h.8a.7.7 0 0 1 .6.4l.9 2 4 1.1L9 6.6a.6.6 0 0 1 .6-.8h1.2a.7.7 0 0 1 .7.4l2.4 6.3 6.2 1.7c.6.2 1.1.7 1.1 1.4Z" transform="rotate(-45 12 12)" />
  </svg>
);

export const ProbeIcon = (props: Props) => (
  <svg {...base(props)}>
    <g {...stroke} strokeWidth={1.7}>
      <path d="M3.4 10.6a6.6 6.6 0 0 1 11.3-4.7" />
      <path d="M3.4 10.6h11.3" />
      <path d="M9 10.6v4.2m0 0-3.4 5.6m3.4-5.6 3.4 5.6" />
      <path d="M16.6 3.6h4.6v5.2h-4.6z" />
    </g>
    <circle cx="9" cy="14.8" r="1.5" fill="currentColor" />
  </svg>
);

export const SunIcon = (props: Props) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="4.6" fill="currentColor" />
    <g {...stroke} strokeWidth={1.7}>
      <path d="M12 1.6v2.6M12 19.8v2.6M22.4 12h-2.6M4.2 12H1.6M19.4 4.6l-1.9 1.9M6.5 17.5l-1.9 1.9M19.4 19.4l-1.9-1.9M6.5 6.5 4.6 4.6" />
    </g>
  </svg>
);

export const LightIcon = (props: Props) => (
  <svg {...base(props)}>
    <g {...stroke} strokeWidth={1.8}>
      <path d="M1.6 14.4c2-4.6 3.6-4.6 5.6 0s3.6 4.6 5.6 0 3.6-4.6 5.6 0" />
      <path d="M14.6 5.4h7.8M18.2 2.4l4 3-4 3" />
    </g>
  </svg>
);

export const SearchIcon = (props: Props) => (
  <svg {...base(props)}>
    <g {...stroke}>
      <circle cx="10.6" cy="10.6" r="7" />
      <path d="m15.8 15.8 5 5" />
    </g>
  </svg>
);

export const SoundIcon = (props: Props) => (
  <svg {...base(props)}>
    <path d="M4 9.2h3.4L12 5v14L7.4 14.8H4z" fill="currentColor" />
    <g {...stroke} strokeWidth={1.7}>
      <path d="M15.4 9a4.4 4.4 0 0 1 0 6M18.4 6a8.6 8.6 0 0 1 0 12" />
    </g>
  </svg>
);

export const MuteIcon = (props: Props) => (
  <svg {...base(props)}>
    <path d="M4 9.2h3.4L12 5v14L7.4 14.8H4z" fill="currentColor" />
    <g {...stroke} strokeWidth={1.7}>
      <path d="m16 9.4 5 5.2m0-5.2-5 5.2" />
    </g>
  </svg>
);

export const ArrowIcon = (props: Props) => (
  <svg {...base(props)}>
    <g {...stroke}>
      <path d="M3.6 12h16.8M14 5.6 20.4 12 14 18.4" />
    </g>
  </svg>
);

export const CloseIcon = (props: Props) => (
  <svg {...base(props)}>
    <g {...stroke}>
      <path d="M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
    </g>
  </svg>
);

export const SwapIcon = (props: Props) => (
  <svg {...base(props)}>
    <g {...stroke} strokeWidth={1.7}>
      <path d="M4 8.4h15M15 4.6l4 3.8-4 3.8M20 15.6H5M9 11.8l-4 3.8 4 3.8" />
    </g>
  </svg>
);

const TRAVEL: Record<TravelIcon, (props: Props) => React.JSX.Element> = {
  walk: WalkIcon,
  bike: BikeIcon,
  car: CarIcon,
  train: TrainIcon,
  jet: JetIcon,
  rocket: RocketIcon,
  probe: ProbeIcon,
  sun: SunIcon,
  light: LightIcon,
};

export function TravelGlyph({ icon, ...props }: { icon: TravelIcon } & Props) {
  const Glyph = TRAVEL[icon] ?? RocketIcon;
  return <Glyph {...props} />;
}
