const CACHE_NAME = 'design-tool-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Pre-caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
  self.skipWaiting(); // Force activation
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch Strategy: Cache First with Network Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip chrome-extension and other non-http requests  
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    // For HTML documents, try network first then cache
    if (request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Clone the response before caching
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
            return response;
          })
          .catch(() => {
            // Network failed, try cache
            return caches.match(request)
              .then((cached) => {
                if (cached) {
                  return cached;
                }
                // Return offline page if available
                return caches.match('/');
              });
          })
      );
    }
    // For static assets, try cache first then network
    else {
      event.respondWith(
        caches.match(request)
          .then((cached) => {
            if (cached) {
              return cached;
            }
            
            return fetch(request)
              .then((response) => {
                // Don't cache if response is not ok
                if (!response || response.status !== 200 || response.type !== 'basic') {
                  return response;
                }

                // Clone the response before caching
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
                
                return response;
              })
              .catch((error) => {
                console.error('Fetch failed:', error);
                throw error;
              });
          })
      );
    }
  }
});

// Handle background sync for saving data when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // Trigger any pending IndexedDB operations
      Promise.resolve()
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});