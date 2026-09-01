'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { announceContainer, type Namespace } from '@/lib/barba';
import { useSite } from './SiteProvider';
import type { Destination } from '@/lib/destinations';

interface Props {
  namespace: Namespace;
  /** The destination this page wants in the sky. Omit for the default sky. */
  subject?: Destination | null;
  children: ReactNode;
}

/**
 * Every page renders its content inside one of these. It carries the Barba
 * container attributes and tells the bridge the moment React has mounted it,
 * which is what lets the `enter` half of a transition start at the right time.
 */
export function PageContainer({ namespace, subject = null, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { setSubject } = useSite();

  useEffect(() => {
    if (ref.current) announceContainer(ref.current, namespace);
  }, [namespace]);

  useEffect(() => {
    setSubject(subject);
  }, [setSubject, subject]);

  return (
    <main id="main" ref={ref} data-barba="container" data-barba-namespace={namespace}>
      {children}
    </main>
  );
}
