import type { Core, ISchemaPage, ITransitionData, ITransitionPage, IUrlFull } from '@barba/core';

/**
 * Barba.js, wired to the Next.js router.
 *
 * Barba normally *is* the router: it intercepts clicks, fetches the next page
 * over the wire and swaps the `[data-barba="container"]` element itself. That
 * is fundamentally incompatible with React — the swapped-in markup would be
 * dead DOM that React never hydrated, and the next client-side navigation
 * would render against nodes that no longer exist.
 *
 * So this module keeps the half of Barba that is genuinely useful here — the
 * transition store, its from/to namespace resolution rules, and its hook bus —
 * and hands navigation itself to Next. Concretely:
 *
 *   1. `barba.init()` parses our transitions into `barba.transitions.store`
 *      and fires the registered `once` transition for the first paint.
 *   2. `barba.destroy()` immediately unbinds Barba's click and popstate
 *      listeners. `destroy()` does not touch `barba.transitions`, so the
 *      store survives. This is the documented way to stop Barba routing.
 *   3. `navigate()` below replays Barba's page lifecycle by hand — before,
 *      beforeLeave, leave, afterLeave, beforeEnter, enter, afterEnter, after —
 *      with `router.push()` in the middle instead of a fetch and a DOM swap.
 *
 * Anything can therefore subscribe with `barba.hooks.leave(fn)` and get called
 * at the right moment, and transitions can still be scoped with
 * `from: { namespace }` / `to: { namespace }` exactly as the docs describe.
 *
 * The import is dynamic because `@barba/core` patches `Element.prototype` at
 * module scope, which throws the moment Next tries to prerender a page.
 */

export type Namespace = 'arrival' | 'atlas' | 'route' | 'about';

export const NAMESPACES: Namespace[] = ['arrival', 'atlas', 'route', 'about'];

export function namespaceFor(pathname: string): Namespace {
  if (pathname.startsWith('/route')) return 'route';
  if (pathname.startsWith('/atlas')) return 'atlas';
  if (pathname.startsWith('/about')) return 'about';
  return 'arrival';
}

const CONTAINER_SELECTOR = '[data-barba="container"]';

let core: Core | null = null;
let initPromise: Promise<Core | null> | null = null;
let running = false;

/** Resolvers waiting for React to mount the container for a given namespace. */
let pending: { namespace: string; resolve: (el: HTMLElement) => void } | null = null;

export const isTransitioning = (): boolean => running;

/** The live Barba instance, or null before `ensureBarba` has resolved. */
export const getBarba = (): Core | null => core;

async function loadBarba(): Promise<Core | null> {
  if (core) return core;
  if (typeof window === 'undefined') return null;
  const imported = await import('@barba/core');
  core = imported.default;
  return core;
}

/**
 * Register transitions and stand Barba's router down.
 * Safe to call repeatedly; only the first call does anything.
 */
export function ensureBarba(transitions: ITransitionPage[]): Promise<Core | null> {
  if (!initPromise) initPromise = initBarba(transitions);
  return initPromise;
}

async function initBarba(transitions: ITransitionPage[]): Promise<Core | null> {
  const barba = await loadBarba();
  if (!barba) return null;
  if (!document.querySelector('[data-barba="wrapper"]') || !document.querySelector(CONTAINER_SELECTOR)) {
    return null;
  }

  barba.init({
    transitions,
    // Barba must never take a link itself; Next owns navigation.
    prevent: () => true,
    preventRunning: true,
  });
  // Unbind the click/popstate listeners `init()` just attached. The transition
  // store, the hook bus and the `once` run we just kicked off all survive.
  barba.destroy();

  return barba;
}

/** Called by every page container once React has mounted it. */
export function announceContainer(el: HTMLElement, namespace: string) {
  if (pending && pending.namespace === namespace) {
    const { resolve } = pending;
    pending = null;
    resolve(el);
  }
}

/** Barba's `IUrlFull`, built from the platform's own URL parser. */
function parseUrl(href: string): IUrlFull {
  const url = new URL(href, window.location.origin);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return {
    href: url.href,
    path: url.pathname,
    hash: url.hash.replace('#', ''),
    query,
    port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
  };
}

function currentPage(): ISchemaPage {
  const container = document.querySelector<HTMLElement>(CONTAINER_SELECTOR);
  return {
    container: container as HTMLElement,
    html: '',
    namespace: container?.dataset.barbaNamespace ?? namespaceFor(window.location.pathname),
    url: parseUrl(window.location.href),
  };
}

function nextPage(href: string, namespace: string): ISchemaPage {
  return {
    container: null as unknown as HTMLElement,
    html: '',
    namespace,
    url: parseUrl(href),
  };
}

function waitForContainer(namespace: string, timeout = 4000): Promise<HTMLElement> {
  return new Promise((resolve) => {
    const selector = `${CONTAINER_SELECTOR}[data-barba-namespace="${namespace}"]`;
    const existing = document.querySelector<HTMLElement>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = (el: HTMLElement) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      observer.disconnect();
      pending = null;
      resolve(el);
    };

    pending = { namespace, resolve: finish };

    // A MutationObserver backs up the explicit announcement, in case a page
    // renders its container without going through <PageContainer>.
    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) finish(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      finish(document.querySelector<HTMLElement>(CONTAINER_SELECTOR) ?? document.body);
    }, timeout);
  });
}

/** Fire one lifecycle hook: the global bus first, then the transition's own method. */
async function phase(
  barba: Core,
  name: 'before' | 'beforeLeave' | 'afterLeave' | 'beforeEnter' | 'afterEnter' | 'after',
  data: ITransitionData,
  transition: ITransitionPage,
) {
  await barba.hooks.do(name, data, transition);
  const fn = transition[name];
  if (typeof fn === 'function') await fn.call(transition, data);
}

export interface NavigateOptions {
  href: string;
  /** Performs the actual route change — `router.push` in practice. */
  push: (href: string) => void;
  trigger?: HTMLElement | string;
}

/**
 * Run one Barba page transition around a Next.js navigation.
 * Resolves once the incoming container has finished entering.
 */
export async function navigate({ href, push, trigger = 'barba' }: NavigateOptions): Promise<void> {
  if (running) return;

  const barba = initPromise ? await initPromise : null;
  if (!barba) {
    // Barba never came up. Navigate anyway — a hard cut beats a dead link.
    push(href);
    return;
  }

  const namespace = namespaceFor(new URL(href, window.location.origin).pathname);
  const data: ITransitionData = {
    current: currentPage(),
    next: nextPage(href, namespace),
    trigger: trigger as ITransitionData['trigger'],
  };

  const transition = barba.transitions.get(data) as ITransitionPage;
  running = true;

  try {
    await phase(barba, 'before', data, transition);
    await phase(barba, 'beforeLeave', data, transition);
    // `transitions.leave` fires the global `leave` hook and then the
    // transition's own `leave()` — this is Barba's own code path.
    await barba.transitions.leave(data, transition);
    await phase(barba, 'afterLeave', data, transition);

    push(href);
    data.next.container = await waitForContainer(namespace);

    await phase(barba, 'beforeEnter', data, transition);
    await barba.transitions.enter(data, transition);
    await phase(barba, 'afterEnter', data, transition);
    await phase(barba, 'after', data, transition);
  } finally {
    running = false;
  }
}
