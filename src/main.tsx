
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.tsx';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/react"

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
  <ScrollToTop/>
  <ErrorBoundary>
    <App />
    <Analytics />
    <SpeedInsights />
    
  </ErrorBoundary>
  </BrowserRouter>
);
// Service worker registration is handled by vite-plugin-pwa, which generates
// /sw.js (Workbox) and injects /registerSW.js into index.html at build time.
//
// This file used to ALSO register a hand-written /service-worker.js. Both
// claimed scope '/', so each registration replaced the other on every page
// load — the two workers fought for control, churning through install and
// activate cycles and serving assets from whichever cache happened to win.
// That is a good match for "it works after a refresh".
//
// The hand-written worker is gone, but devices that already installed it keep
// it until it is explicitly removed, so retire it here. This can be deleted
// once the fix has been live long enough for returning visitors to pick it up.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      const scriptURL = registration.active?.scriptURL ?? '';
      if (scriptURL.includes('/service-worker.js')) {
        registration.unregister();
      }
    });
  }).catch(() => {
    /* nothing we can do about it here */
  });

  // Drop the caches that worker built up. They were never versioned, so stale
  // entries would otherwise outlive every future deploy.
  if ('caches' in window) {
    caches.keys().then((names) => {
      names
        .filter((name) => name.startsWith('sdms-cache-') || name.startsWith('sdms-static-'))
        .forEach((name) => caches.delete(name));
    }).catch(() => {
      /* non-fatal */
    });
  }
}