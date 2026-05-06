'use client';

import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
        .catch((err) => console.error('[PWA] SW unregister failed:', err));

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch((err) => console.error('[PWA] Cache cleanup failed:', err));
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available — please refresh');
            }
          });
        });
      })
      .catch((err) => console.error('[PWA] SW registration failed:', err));
  }, []);
}
