// Enhanced Service Worker with Better Cache Management
const CACHE_VERSION = 2; // Increment this to force cache update
const CACHE_NAME = `dicoding-story-v${CACHE_VERSION}`;
const API_CACHE_NAME = `dicoding-story-api-v${CACHE_VERSION}`;

// Files to cache
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './js/app.js',
    './js/models/story-model.js',
    './js/models/auth-model.js',
    './js/views/story-view.js',
    './js/views/auth-view.js',
    './js/presenters/story-presenter.js',
    './js/presenters/auth-presenter.js',
    './js/utils/api-service.js',
    './js/utils/camera-manager.js',
    './js/utils/map-manager.js',
    './js/utils/push-notification-manager.js',
    './js/utils/indexeddb-manager.js',
    './js/utils/offline-manager.js',
    './js/utils/offline-ui-manager.js',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                // Cache files one by one to handle failures gracefully
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(error => {
                            console.warn(`Failed to cache ${url}:`, error);
                        });
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: All files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed', error);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches
                    if (cacheName.startsWith('dicoding-story-') && 
                        cacheName !== CACHE_NAME && 
                        cacheName !== API_CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event with network-first strategy for HTML
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // Handle API requests
    if (url.origin === 'https://story-api.dicoding.dev') {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Network-first strategy for HTML documents
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone the response before caching
                    const responseToCache = response.clone();
                    
                    // Update cache in background
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    
                    return response;
                })
                .catch(() => {
                    // Fallback to cache
                    return caches.match(request).then(response => {
                        return response || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Cache-first strategy for assets
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    // Return cached version
                    return response;
                }

                // Not in cache, fetch from network
                return fetch(request).then((fetchResponse) => {
                    // Don't cache non-successful responses
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                        return fetchResponse;
                    }

                    // Clone the response
                    const responseToCache = fetchResponse.clone();

                    // Add to cache in background
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, responseToCache);
                        });

                    return fetchResponse;
                });
            })
            .catch(() => {
                // Offline fallback for images
                if (request.destination === 'image') {
                    return new Response(
                        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            })
    );
});

// Handle API requests with timeout
async function handleApiRequest(request) {
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
            // Try network first with timeout
            const networkResponse = await fetch(request, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            // If successful, cache GET requests
            if (request.method === 'GET' && networkResponse.ok) {
                const cache = await caches.open(API_CACHE_NAME);
                cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
        } catch (error) {
            clearTimeout(timeoutId);
            
            // If network failed or timeout, try cache for GET requests
            if (request.method === 'GET') {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    console.log('Service Worker: Serving API request from cache');
                    return cachedResponse;
                }
            }
            
            // Return offline response
            return new Response(
                JSON.stringify({
                    error: true,
                    message: 'You are offline. Please check your connection.'
                }),
                {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    } catch (error) {
        console.error('Service Worker: Error handling API request', error);
        return new Response(
            JSON.stringify({
                error: true,
                message: 'Service unavailable'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Push notification event
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push event received');
    
    let notificationData = {
        title: 'Dicoding Story',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'dicoding-story',
        data: {
            url: './#home'
        }
    };

    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            console.log('Push data received:', pushData);
            
            // Handle the API notification schema
            if (pushData.title) {
                notificationData.title = pushData.title;
            }
            
            if (pushData.options) {
                // Merge options from push data
                notificationData = {
                    ...notificationData,
                    ...pushData.options,
                    title: pushData.title || notificationData.title
                };
            }
        } catch (error) {
            console.error('Error parsing push data:', error);
            // Try to get text if JSON parsing fails
            const text = event.data.text();
            if (text) {
                notificationData.body = text;
            }
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            data: notificationData.data || {},
            requireInteraction: false,
            actions: notificationData.actions || [
                {
                    action: 'view',
                    title: 'Lihat'
                },
                {
                    action: 'dismiss',
                    title: 'Tutup'
                }
            ]
        })
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification click');
    
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data || {};
    
    if (action === 'dismiss') {
        return;
    }
    
    // Default action or 'view' action
    const urlToOpen = data.url || './#home';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window/tab open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        // Focus existing window and navigate
                        client.postMessage({
                            type: 'notification-click',
                            action: action,
                            data: data
                        });
                        return client.focus();
                    }
                }
                
                // No existing window, open new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync-stories') {
        event.waitUntil(syncStories());
    }
});

async function syncStories() {
    try {
        console.log('Service Worker: Syncing stories...');
        // Notify clients about sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'sync-started'
            });
        });
        
        // Add actual sync logic here if needed
        
        clients.forEach(client => {
            client.postMessage({
                type: 'sync-completed',
                syncedCount: 0
            });
        });
    } catch (error) {
        console.error('Service Worker: Sync failed', error);
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'sync-failed',
                error: error.message
            });
        });
    }
}

// Message handling
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    // Handle cache clear request
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Clearing cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            }).catch(error => {
                event.ports[0].postMessage({ success: false, error: error.message });
            })
        );
    }
});

// Clean old caches periodically
async function cleanOldCaches() {
    const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
    const cacheNames = await caches.keys();
    
    await Promise.all(
        cacheNames.map(async (cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
                console.log('Deleting old cache:', cacheName);
                await caches.delete(cacheName);
            }
        })
    );
}

// Run cleanup periodically
setInterval(cleanOldCaches, 60 * 60 * 1000); // Every hour

console.log('Service Worker: Loaded successfully');
