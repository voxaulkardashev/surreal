/**
 * `@barba/core` ships its declarations under `dist/src` but its package.json
 * `types` field points at `dist/core/src/typings`, which does not exist in the
 * published tarball. This shim re-points the module at the real declarations
 * so the transition bridge in `lib/barba.ts` stays typed.
 */
declare module '@barba/core' {
  import { Core } from '@barba/core/dist/src/core';

  const barba: Core;
  export default barba;
  export { Core };
  export * from '@barba/core/dist/src/defs';
}
