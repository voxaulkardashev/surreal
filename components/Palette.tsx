'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, DESTINATIONS, type Category, type Destination } from '@/lib/destinations';
import { formatDistance } from '@/lib/format';
import { useSite } from './SiteProvider';
import { SearchIcon } from './Icons';

/** Does `needle` appear in `haystack` as a subsequence? "adm" finds Andromeda. */
function subsequence(needle: string, haystack: string): boolean {
  let index = 0;
  for (const char of needle) {
    index = haystack.indexOf(char, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
}

interface Indexed {
  destination: Destination;
  /** Name, designation and category — what the loose match is allowed to see. */
  label: string;
  blurb: string;
}

const INDEX: Indexed[] = DESTINATIONS.map((destination) => ({
  destination,
  label: [
    destination.name,
    destination.designation ?? '',
    CATEGORIES.find((c) => c.id === destination.category)?.label ?? destination.category,
  ]
    .join(' ')
    .toLowerCase(),
  blurb: destination.blurb.toLowerCase(),
}));

/**
 * Lower is better; `null` means no match at all.
 *
 * Subsequence matching is deliberately confined to the label. Letting it loose
 * on the blurb as well made "andr" match twenty-three of forty-three entries,
 * because prose that long contains almost any four letters in almost any order.
 */
function rank(query: string, entry: Indexed): number | null {
  if (!query) return entry.destination.distanceKm;
  const { label, blurb } = entry;
  const name = entry.destination.name.toLowerCase();

  if (name.startsWith(query)) return -5;
  if (new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) return -4;
  if (name.includes(query)) return -3;
  if (label.includes(query)) return -2;
  if (subsequence(query, label)) return -1;
  if (blurb.includes(query)) return 0;
  return null;
}

/**
 * The ⌘K destination picker. Also reachable from the destination field on
 * every card, and from the HUD.
 */
export function Palette() {
  const { paletteOpen, setPaletteOpen, unit, go, preview, lockScroll } = useSite();
  const [raw, setRaw] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = raw.trim().toLowerCase();

  /** With a query the list is flat and ranked; empty, it is grouped by class. */
  const results = useMemo(() => {
    const scored: { destination: Destination; score: number }[] = [];
    INDEX.forEach((entry) => {
      const score = rank(query, entry);
      if (score !== null) scored.push({ destination: entry.destination, score });
    });
    scored.sort((a, b) => a.score - b.score || a.destination.distanceKm - b.destination.distanceKm);
    return scored.map((entry) => entry.destination);
  }, [query]);

  const grouped = useMemo<[string, Destination[]][]>(() => {
    if (query) return [['', results]];
    const order = CATEGORIES.map((c) => c.id);
    const buckets = new Map<string, Destination[]>();
    results.forEach((d) => {
      const list = buckets.get(d.category) ?? [];
      list.push(d);
      buckets.set(d.category, list);
    });
    return [...buckets.entries()].sort(
      ([a], [b]) => order.indexOf(a as Category) - order.indexOf(b as Category),
    );
  }, [query, results]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    lockScroll(paletteOpen);
    if (paletteOpen) {
      setRaw('');
      // The input is inside a container that fades in; focus after the frame.
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
    preview(null);
    return undefined;
  }, [lockScroll, paletteOpen, preview]);

  useEffect(() => {
    if (!paletteOpen) return;
    preview(flat[cursor] ?? null);
  }, [cursor, flat, paletteOpen, preview]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const choose = (destination: Destination) => {
    preview(null);
    go(`/route/${destination.slug}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPaletteOpen(false);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(flat.length - 1, c + 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (event.key === 'Enter' && flat[cursor]) {
      event.preventDefault();
      choose(flat[cursor]);
    }
  };

  let index = -1;

  return (
    <div
      className="palette"
      data-open={paletteOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a destination"
      aria-hidden={!paletteOpen}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setPaletteOpen(false);
      }}
    >
      <div className="palette__box" onKeyDown={onKeyDown}>
        <label className="sr-only" htmlFor="palette-input">
          Search destinations
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <SearchIcon
            style={{ position: 'absolute', left: 22, width: 16, height: 16, opacity: 0.35 }}
          />
          <input
            id="palette-input"
            ref={inputRef}
            className="palette__input"
            style={{ paddingLeft: 52 }}
            placeholder="Where to? Try a black hole, a nebula, the edge…"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            tabIndex={paletteOpen ? 0 : -1}
          />
        </div>

        <div className="palette__list" ref={listRef} data-lenis-prevent>
          {flat.length === 0 && (
            <p className="palette__empty">Nothing out that way. Try &ldquo;void&rdquo;.</p>
          )}
          {grouped.map(([category, items]) => (
            <div key={category || 'results'}>
              {category && (
                <p className="palette__group">
                  {CATEGORIES.find((c) => c.id === category)?.label ?? category}
                </p>
              )}
              {items.map((destination) => {
                index += 1;
                const active = index === cursor;
                const current = index;
                const distance = formatDistance(destination.distanceKm, unit);
                return (
                  <button
                    type="button"
                    key={destination.slug}
                    className="palette__item"
                    data-active={active}
                    onMouseMove={() => setCursor(current)}
                    onClick={() => choose(destination)}
                    tabIndex={-1}
                  >
                    <b>{destination.name}</b>
                    {destination.designation && <small>{destination.designation}</small>}
                    <em>
                      {distance.value} {distance.unit}
                    </em>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="palette__foot">
          <span>↑↓ browse</span>
          <span>↵ plot course</span>
          <span>esc close</span>
          <span style={{ marginLeft: 'auto' }}>
            {results.length} of {DESTINATIONS.length}
          </span>
        </div>
      </div>
    </div>
  );
}
