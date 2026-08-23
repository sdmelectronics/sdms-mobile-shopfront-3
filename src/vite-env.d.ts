/// <reference types="vite/client" />

/**
 * Build identifier injected at build time by vite.config.ts.
 * On Vercel this is the short commit SHA; locally, a timestamp.
 */
declare const __BUILD_ID__: string;
