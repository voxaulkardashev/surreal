import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RouteView } from '@/components/views/RouteView';
import { DESTINATIONS, getDestination } from '@/lib/destinations';
import { formatDistance } from '@/lib/format';
import { featuredModes, travelTime } from '@/lib/travel';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return DESTINATIONS.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) return { title: 'Off the map' };

  const distance = formatDistance(destination.distanceKm, 'km');
  const walk = travelTime(destination.distanceKm, featuredModes()[2]);

  return {
    title: destination.name,
    description: `${distance.value} ${distance.unit} from Earth — ${walk.value} ${walk.unit} on foot. ${destination.blurb}`,
  };
}

export default async function RoutePage({ params }: Props) {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination || destination.slug === 'earth') notFound();
  return <RouteView destination={destination} />;
}
