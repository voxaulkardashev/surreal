'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useSite } from './SiteProvider';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

/**
 * A plain anchor that routes through the Barba bridge on click. Middle-click,
 * modifier-click and right-click all fall through to the browser, so links
 * still behave like links.
 */
export function SmartLink({ href, children, onClick, ...rest }: Props) {
  const { go } = useSite();

  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (!href.startsWith('/')) return;
    event.preventDefault();
    go(href, event.currentTarget);
  };

  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
