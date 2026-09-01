import type { Metadata } from 'next';
import { AtlasView } from '@/components/views/AtlasView';
import { DESTINATIONS } from '@/lib/destinations';

export const metadata: Metadata = {
  title: 'Atlas',
  description: `All ${DESTINATIONS.length} destinations, sorted by distance from Earth.`,
};

export default function AtlasPage() {
  return <AtlasView />;
}
