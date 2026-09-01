import type { Metadata, Viewport } from 'next';
import { Shell } from '@/components/Shell';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://surreal.local'),
  title: {
    default: 'Surreal — directions to everywhere',
    template: '%s — Surreal',
  },
  description:
    'Pick a cosmic destination and get directions from Earth: the distance, and how long it would take on foot, by train and by rocket.',
  applicationName: 'Surreal',
  openGraph: {
    title: 'Surreal — directions to everywhere',
    description:
      'A departure board for places nobody is going. Distances and travel times to moons, stars, nebulae, black holes and the edge of the observable universe.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#03060f',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The App Router root layout is the document; the rule below is
            written for the pages router and does not apply here. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&family=IBM+Plex+Mono:wght@300;400&display=swap"
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
