// Currency Converter Pro Service Worker
const CACHE_NAME = 'currency-converter-pro-v2';
const RUNTIME_CACHE = 'currency-converter-runtime-v2';
const API_CACHE_EXPIRY_DAYS = 1;

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

const ASSET_PATHS = [
    // Include all your static assets that are NOT in the root
    '/assets/favicon.ico',
    '/assets/icon-32x32.png',
    '/assets/icon-16x16.png',
    '/assets/icon-180x180.png',
    '/assets/icon-192x192.png',
    '/assets/icon-144x144.png',
    '/assets/icon-128x128.png',
    '/assets/icon-72x72.png',
    '/assets/icon-96x96.png',
];

// API URLs that should be cached
const API_CACHE_PATTERNS = [
  /https:\/\/open\.er-api\.com\/v6\/latest\/.*/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('SW: Installing service worker v3');

    const internalFiles = [
        '/',
        '/index.html',
        '/style.css',
        '/script.js',
        '/manifest.json',
    ];

    const cdnFiles = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    ];

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // 1. Cache internal and local files (using addAll for simplicity, assuming local files are reliable)
                const internalCachePromise = cache.addAll(internalFiles);

                // 2. Cache external CDN files (resilient approach to prevent CORS/network failure)
                const cdnCachePromises = Promise.all(
                    cdnFiles.map(url => 
                        fetch(url, { mode: 'no-cors' }) // Use no-cors for robust CDN fetching
                        .then(response => {
                            if (response.ok || response.type === 'opaque') {
                                return cache.put(url, response);
                            }
                            console.warn(`SW: Failed to cache CDN URL (Status: ${response.status}): ${url}`);
                            return Promise.resolve();
                        })
                        .catch(error => {
                            console.error(`SW: Failed to fetch CDN URL: ${url}`, error);
                            return Promise.resolve(); // Allow installation to proceed
                        })
                    )
                );

                // Wait for both internal and external caching processes to complete
                return Promise.all([internalCachePromise, cdnCachePromises]);
            })
            .then(() => {
                console.log('SW: Static files cached successfully (v3)');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('SW: Installation failed (critical internal file error):', error);
                // Re-throw the error only if internal files fail, otherwise installation proceeds
                throw error;
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker v2');

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
    const url = new new URL(request.url);
    const start = performance.now(); // Start performance measurement
    const cache = await caches.open(RUNTIME_CACHE);
    const cacheKey = `${url.origin}${url.pathname}${url.search}`;
    let cachedResponse = await cache.match(cacheKey);
    
    // --- STALE CHECK (Correct) ---
    if (cachedResponse) {
        const lastCached = new Date(cachedResponse.headers.get('sw-cached-date'));
        const now = new Date();
        const expiryTime = API_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        
        if (now.getTime() - lastCached.getTime() > expiryTime) {
            console.log('SW: API cache expired, fetching fresh data.');
            cachedResponse = null; // Treat as expired, force network
        }
    }
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        const duration = performance.now() - start;

        if (networkResponse.ok) {
            // Success: Cache the fresh response and return it
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cached-date', new Date().toISOString());
            
            await cache.put(cacheKey, new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            }));

            console.log('SW: API response updated and cached:', cacheKey);
            console.log(`SW: API request to ${request.url} took ${duration.toFixed(2)}ms`);
            return networkResponse;
        }

        // If network response is NOT ok (e.g., 404, 500), throw error to trigger cache fallback
        throw new Error(`Network response not ok: ${networkResponse.status}`); 

    } catch (error) {
        const duration = performance.now() - start; // Calculate duration if timing was missed by the initial throw (for total execution time)
        console.error(`SW: Total failure or status error, took ${duration.toFixed(2)}ms. Attempting cache match for:`, cacheKey);

        // Fallback to cache if network failed entirely or returned non-200 status
        if (cachedResponse) {
            console.log('SW: Network failed, returning stale cache for:', cacheKey);
            return cachedResponse;
        }

        // Final Fallback: return offline error response
        return new Response(
            JSON.stringify({
                error: 'Offline',
                message: 'No internet connection and no cached data available'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
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
    icon: 'assets/icon-192x192.png',
    badge: 'assets/icon-192x192.png',
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