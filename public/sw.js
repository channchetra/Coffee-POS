const CACHE_NAME = 'coffee-pos-v3';
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
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API requests (except products for caching)
  if (url.pathname.startsWith('/api/') && !url.pathname.includes('/products')) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Return cached page or appropriate fallback
          return caches.match(request)
            .then((cached) => {
              if (cached) return cached;
              
              // Fallback for invoice pages - redirect to POS (invoices are viewed inline when offline)
              if (url.pathname.startsWith('/invoice/')) {
                return caches.match('/pos');
              }
              
              // Default fallback to home
              return caches.match('/');
            });
        })
    );
    return;
  }
  
  // Handle static assets and images
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            // Return cached, but also fetch and update cache in background
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
                }
              })
              .catch(() => {});
            return cached;
          }
          
          // Not cached - fetch and cache
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Handle API products request - cache for offline
  if (url.pathname === '/api/products') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // Default: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
