import React, { useEffect, useRef, useState } from 'react';
import { useLanguageStore } from '../../lib/store';
import { t } from '../../i18n';

/**
 * Shows a "new version available" banner when the service worker finds and
 * installs a newer app version (e.g. right after a deploy).
 *
 * Offline-first behaviour:
 * - update checks run on load, on window `online` and when the tab becomes
 *   visible again — so tablets that were offline get the banner as soon as
 *   they are back online;
 * - nothing is reloaded automatically (an in-progress cart is never lost):
 *   tapping "Update" reloads into the new version.
 */
export function UpdateBanner() {
  const { language } = useLanguageStore();
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Only prompt returning clients (a fresh install shouldn't reload)
    const wasControlled = !!navigator.serviceWorker.controller;
    let reg: ServiceWorkerRegistration | null = null;

    const showIfControlled = () => {
      if (wasControlled && !dismissedRef.current) {
        setAvailable(true);
      }
    };

    const checkForUpdates = () => {
      reg?.update().catch(() => {});
    };

    const watchInstallingWorker = (registration: ServiceWorkerRegistration) => {
      const onStateChange = (worker: ServiceWorker) => () => {
        if (worker.state === 'activated') showIfControlled();
      };
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', onStateChange(worker));
      });
    };

    // Our SW posts VERSION_UPDATED to all clients once a new version takes over
    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'VERSION_UPDATED') {
        showIfControlled();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((r) => {
        reg = r;
        watchInstallingWorker(r);
        // Force an update check right away
        checkForUpdates();
      })
      .catch(() => {
        // Service worker unsupported / blocked: degrade silently
      });

    // Re-check when back online or when the app is resumed (tablets!)
    window.addEventListener('online', checkForUpdates);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
      window.removeEventListener('online', checkForUpdates);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!available || dismissed) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-[80] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-gray-900/25 border border-primary-100 animate-slideUp max-w-full">
        <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <p className="text-sm md:text-base font-medium text-gray-800 truncate">
          {t(language, 'update.available')}
        </p>
        <button
          onClick={() => {
            // The new service worker already controls the page: reload shows it
            window.location.reload();
          }}
          className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl shadow-md shadow-primary-500/30 active:scale-95 transition-all"
        >
          {t(language, 'update.button')}
        </button>
        <button
          onClick={() => {
            dismissedRef.current = true;
            setDismissed(true);
          }}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={t(language, 'common.close')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
