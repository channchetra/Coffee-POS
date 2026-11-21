// Coffee POS service worker
// IMPORTANT: never served from a static cache — it is delivered through the
// /sw.js SSR endpoint with `Cache-Control: no-store` so browsers always check
// for updates after a deploy. Bump CACHE_NAME on every release that changes
// cached content.
const CACHE_NAME = 'coffee-pos-v8';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/pos',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/images/products/espresso.svg',
  '/images/products/americano.svg',
  '/images/products/cappuccino.svg',
  '/images/products/latte.svg',
  '/images/products/mocha.svg',
  '/images/products/iced-coffee.svg',
  '/images/products/red-wine.svg',
  '/images/products/white-wine.svg',
  '/images/products/rose-wine.svg',
  '/images/products/cola.svg',
  '/images/products/lemonade.svg',
  '/images/products/orange-juice.svg',
  '/images/products/sparkling-water.svg',
  '/images/products/iced-tea.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();

      // Tell every open page that a new version took over, so they can show
      // the "Update available" banner (see UpdateBanner component).
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({ type: 'VERSION_UPDATED', version: CACHE_NAME });
      });
    })()
  );
});

// --- Fetch strategies ------------------------------------------------------

async function putInCache(request, response) {
  if (!response.ok) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {
    // Caching is best effort; never fail the response because of it.
  }
}

// Navigation: network first, cached page fallback. A deploy or reverse proxy
// can answer 502/503 while the new version boots, so non-OK responses also
// fall back to the cached shell instead of showing the proxy error page.
async function handleNavigation(request, url) {
  let response = null;
  try {
    response = await fetch(request);
  } catch {
    // Network failure: use the cached shell below.
  }

  if (response?.ok) {
    await putInCache(request, response);
    return response;
  }

  const cached = await caches.match(request);
  if (cached) return cached;

  // Offline invoice links fall back to the POS; invoices are viewed inline.
  const fallback = url.pathname.startsWith('/invoice/')
    ? await caches.match('/pos')
    : await caches.match('/');
  return fallback || response || Response.error();
}

// Static assets: cache first, refresh in the background.
async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request)
      .then((response) => putInCache(request, response))
      .catch(() => {});
    return cached;
  }

  const response = await fetch(request);
  await putInCache(request, response);
  return response;
}

// Product catalogue: network first, cache fallback.
async function handleProductCatalogue(request) {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error('Product catalogue request failed');
    await putInCache(request, response);
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

// Everything else: network first, cache fallback.
async function handleNetworkFirst(request) {
  const response = await fetch(request).catch(() => null);
  if (response?.ok) return response;
  return (await caches.match(request)) || response || Response.error();
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.avif')
  );
}

// Fetch event - pick a strategy for the request.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  const isProductCatalogue = url.pathname === '/api/products';

  // Skip all API requests except the product catalogue, which is cached
  // offline. Admin product responses must never be cached on a shared tablet.
  if (url.pathname.startsWith('/api/') && !isProductCatalogue) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  if (isProductCatalogue) {
    event.respondWith(handleProductCatalogue(request));
    return;
  }

  event.respondWith(handleNetworkFirst(request));
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
