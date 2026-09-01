import type { Metadata } from 'next';
import { AboutView } from '@/components/views/AboutView';

export const metadata: Metadata = {
  title: 'Colophon',
  description:
    'How the distances, the travel times, the generated skies and the synthesised ambience work.',
};

export default function AboutPage() {
  return <AboutView />;
}
