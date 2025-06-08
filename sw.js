// Minimal Working Service Worker
const CACHE_NAME = 'dicoding-story-v1';
const API_CACHE_NAME = 'dicoding-story-api-v1';

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
                return cache.addAll(urlsToCache);
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
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
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

// Fetch event
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests
    if (url.origin === 'https://story-api.dicoding.dev') {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle other requests
    event.respondWith(
        caches.match(request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(request).then((fetchResponse) => {
                    // Don't cache non-successful responses
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                        return fetchResponse;
                    }

                    // Clone the response
                    const responseToCache = fetchResponse.clone();

                    // Add to cache
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, responseToCache);
                        });

                    return fetchResponse;
                });
            })
            .catch(() => {
                // Offline fallback
                if (request.destination === 'document') {
                    return caches.match('./index.html');
                }
                
                // Return placeholder for images
                if (request.destination === 'image') {
                    return new Response(
                        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            })
    );
});

// Handle API requests
async function handleApiRequest(request) {
    try {
        // Always try network first for API requests
        const networkResponse = await fetch(request);
        
        // If successful, cache GET requests
        if (request.method === 'GET' && networkResponse.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed, try cache for GET requests
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
}

// Push notification event
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push event received');
    
    let notificationData = {
        title: 'Dicoding Story',
        body: 'You have a new notification',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%23667eea"/><text x="96" y="96" text-anchor="middle" dominant-baseline="central" font-size="80" fill="white">📷</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%23667eea"/><text x="96" y="96" text-anchor="middle" dominant-baseline="central" font-size="80" fill="white">📷</text></svg>',
        tag: 'dicoding-story',
        data: {
            url: './#home'
        }
    };

    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            notificationData = { ...notificationData, ...pushData };
        } catch (error) {
            console.error('Error parsing push data:', error);
            notificationData.body = event.data.text() || notificationData.body;
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            data: notificationData.data,
            requireInteraction: false,
            actions: [
                {
                    action: 'view',
                    title: 'View'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
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
                type: 'sync-completed',
                syncedCount: 0
            });
        });
    } catch (error) {
        console.error('Service Worker: Sync failed', error);
    }
}

// Message handling
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('Service Worker: Loaded successfully');