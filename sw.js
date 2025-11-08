// Currency Converter Pro Service Worker
const CACHE_NAME = 'currency-converter-pro-v1';
const RUNTIME_CACHE = 'currency-converter-runtime-v1';

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
];

// API URLs that should be cached
const API_CACHE_PATTERNS = [
  /https:\/\/open\.er-api\.com\/v6\/latest\/.*/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching static files');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        console.log('SW: Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Old caches cleaned up');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('SW: Failed to clean up old caches:', error);
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.toString()))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (STATIC_CACHE_FILES.includes(url.pathname) ||
      url.pathname.startsWith('/fonts.googleapis.com/') ||
      url.pathname.startsWith('/cdn.jsdelivr.net/')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network-first for everything else
  event.respondWith(handleNetworkRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `${url.origin}${url.pathname}${url.search}`;

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the successful response
      const cache = await caches.open(RUNTIME_CACHE);
      const responseToCache = networkResponse.clone();
      await cache.put(cacheKey, responseToCache);

      console.log('SW: API response cached:', cacheKey);
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('SW: Network failed, trying cache for:', cacheKey);

    // Fallback to cache
    const cachedResponse = await caches.match(cacheKey);

    if (cachedResponse) {
      console.log('SW: Returning cached response for:', cacheKey);
      return cachedResponse;
    }

    // If no cached response, return offline error
    console.log('SW: No cached response available, returning offline page');
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No internet connection and no cached data available'
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    console.log('SW: Serving from cache:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('SW: Failed to fetch static asset:', request.url, error);

    // Return offline placeholder for images if available
    if (request.destination === 'image') {
      return new Response('', {
        status: 404,
        statusText: 'Offline'
      });
    }

    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      return networkResponse;
    }
  } catch (error) {
    console.log('SW: Navigation failed, serving offline page');
  }

  // Serve offline page (index.html should handle offline state)
  const cachedResponse = await caches.match('/');

  if (cachedResponse) {
    return cachedResponse;
  }

  // Return basic offline page
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Offline - Currency Converter Pro</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; background: #f5f5f5; }
          .offline-container { max-width: 400px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .icon { font-size: 4rem; margin-bottom: 1rem; }
          h1 { color: #333; margin-bottom: 1rem; }
          p { color: #666; margin-bottom: 1.5rem; }
          .retry-btn { background: #6366f1; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem; }
          .retry-btn:hover { background: #4f46e5; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="icon">📱</div>
          <h1>You're Offline</h1>
          <p>Currency Converter Pro is not available without an internet connection. Please check your connection and try again.</p>
          <button class="retry-btn" onclick="window.location.reload()">Retry</button>
        </div>
      </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html'
    }
  });
}

// Handle other network requests
async function handleNetworkRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.error('SW: Network request failed:', request.url, error);
    throw error;
  }
}

// Background sync for failed API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-currency-rates') {
    event.waitUntil(syncCurrencyRates());
  }
});

// Sync currency rates in background
async function syncCurrencyRates() {
  try {
    console.log('SW: Syncing currency rates in background');

    // Try to fetch fresh currency data
    const response = await fetch('https://open.er-api.com/v6/latest/USD');

    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put('https://open.er-api.com/v6/latest/USD', response.clone());
      console.log('SW: Background sync successful');
    }
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: 'Currency rates have been updated',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'currency-update',
    renotify: true,
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Currency Converter Pro', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll().then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    // Handle manual cache update requests
    updateCache();
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Handle cache clearing requests
    clearCache();
  }
});

// Update cache function
async function updateCache() {
  try {
    console.log('SW: Manual cache update requested');

    // Clear runtime cache
    await caches.delete(RUNTIME_CACHE);

    // Fetch fresh data
    await syncCurrencyRates();

    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'CACHE_UPDATED' });
    });
  } catch (error) {
    console.error('SW: Manual cache update failed:', error);
  }
}

// Clear cache function
async function clearCache() {
  try {
    console.log('SW: Manual cache clear requested');

    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );

    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'CACHE_CLEARED' });
    });
  } catch (error) {
    console.error('SW: Manual cache clear failed:', error);
  }
}

// Performance monitoring
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('open.er-api.com')) {
    const start = performance.now();

    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          const duration = performance.now() - start;

          // Log performance metrics
          console.log(`SW: API request to ${event.request.url} took ${duration.toFixed(2)}ms`);

          // Send metrics to clients for analytics (optional)
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'PERFORMANCE_METRIC',
              url: event.request.url,
              duration: duration,
              status: response.status
            });
          });

          return response;
        } catch (error) {
          const duration = performance.now() - start;
          console.error(`SW: API request to ${event.request.url} failed after ${duration.toFixed(2)}ms:`, error);
          throw error;
        }
      })()
    );
  }
});