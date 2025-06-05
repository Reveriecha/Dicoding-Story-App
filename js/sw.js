// Service Worker for PWA - Optimized Application Shell Pattern
const CACHE_NAME = 'dicoding-story-v1.0.0';
const API_CACHE_NAME = 'dicoding-story-api-v1';
const RUNTIME_CACHE_NAME = 'dicoding-story-runtime-v1';

// Application Shell - Static files that rarely change
const APP_SHELL_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    // Core app files
    '/js/app.js',
    '/js/models/story-model.js',
    '/js/models/auth-model.js',
    '/js/views/story-view.js',
    '/js/views/auth-view.js',
    '/js/presenters/story-presenter.js',
    '/js/presenters/auth-presenter.js',
    '/js/utils/api-service.js',
    '/js/utils/camera-manager.js',
    '/js/utils/map-manager.js',
    '/js/utils/push-notification-manager.js',
    '/js/utils/indexeddb-manager.js',
    '/js/utils/offline-manager.js',
    '/js/utils/offline-ui-manager.js',
    // Icons
    '/icons/icon-192x192.png',
];

// External resources that should be cached
const EXTERNAL_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Runtime caching patterns
const RUNTIME_CACHING_PATTERNS = [
    {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        strategy: 'CacheFirst',
        cacheName: 'images'
    },
    {
        urlPattern: /\.(?:js|css)$/,
        strategy: 'StaleWhileRevalidate',
        cacheName: 'static-resources'
    }
];

// Install event - Cache Application Shell
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache Application Shell
            caches.open(CACHE_NAME).then((cache) => {
                console.log('📦 Service Worker: Caching Application Shell');
                return cache.addAll(APP_SHELL_FILES.filter(url => {
                    // Skip icon if it doesn't exist to prevent cache failure
                    if (url === '/icons/icon-192x192.png') {
                        return fetch(url).then(response => response.ok).catch(() => false);
                    }
                    return true;
                }));
            }),
            // Cache External Resources
            caches.open(CACHE_NAME).then((cache) => {
                console.log('📦 Service Worker: Caching External Resources');
                return cache.addAll(EXTERNAL_RESOURCES);
            })
        ]).then(() => {
            console.log('✅ Service Worker: Application Shell cached successfully');
            return self.skipWaiting();
        }).catch((error) => {
            console.error('❌ Service Worker: Cache failed', error);
        })
    );
});

// Activate event - Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== API_CACHE_NAME && 
                            cacheName !== RUNTIME_CACHE_NAME) {
                            console.log('🗑️ Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Claim all clients
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker: Activated successfully');
        })
    );
});

// Fetch event - Application Shell Pattern with smart caching
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle different types of requests
    if (url.origin === 'https://story-api.dicoding.dev') {
        // API requests - Network First with Cache Fallback
        event.respondWith(handleApiRequest(request));
    } else if (isAppShellRequest(request)) {
        // Application Shell - Cache First
        event.respondWith(handleAppShellRequest(request));
    } else if (isStaticAsset(request)) {
        // Static assets - Cache First with Network Fallback
        event.respondWith(handleStaticAssetRequest(request));
    } else if (isExternalResource(request)) {
        // External resources - Stale While Revalidate
        event.respondWith(handleExternalResourceRequest(request));
    } else {
        // Everything else - Network First
        event.respondWith(handleDefaultRequest(request));
    }
});

// Check if request is for Application Shell
function isAppShellRequest(request) {
    const url = new URL(request.url);
    return APP_SHELL_FILES.some(file => {
        if (file === '/') {
            return url.pathname === '/' || url.pathname === '/index.html';
        }
        return url.pathname === file;
    });
}

// Check if request is for static asset
function isStaticAsset(request) {
    const url = new URL(request.url);
    return /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i.test(url.pathname);
}

// Check if request is for external resource
function isExternalResource(request) {
    const url = new URL(request.url);
    return EXTERNAL_RESOURCES.some(resource => request.url.startsWith(resource));
}

// Handle Application Shell requests - Cache First
async function handleAppShellRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('📦 Serving from cache:', request.url);
            return cachedResponse;
        }

        // If not in cache, fetch and cache
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('❌ App Shell request failed:', error);
        
        // Return offline fallback
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        
        return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Handle API requests - Network First with Cache Fallback
async function handleApiRequest(request) {
    const url = new URL(request.url);
    const cacheKey = request.url;
    
    try {
        // Always try network first for API requests
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful GET requests
            if (request.method === 'GET') {
                const cache = await caches.open(API_CACHE_NAME);
                cache.put(cacheKey, networkResponse.clone());
                console.log('💾 Cached API response:', request.url);
            }
        }
        
        return networkResponse;
    } catch (error) {
        console.log('🌐 Network failed, trying cache for:', request.url);
        
        // Network failed, try cache for GET requests
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(cacheKey);
            if (cachedResponse) {
                console.log('📦 Serving API from cache:', request.url);
                return cachedResponse;
            }
        }
        
        // Return structured offline response
        return new Response(
            JSON.stringify({
                error: true,
                message: 'You are offline. Please check your connection.',
                offline: true,
                timestamp: new Date().toISOString()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }
        );
    }
}

// Handle static asset requests - Cache First with Network Fallback
async function handleStaticAssetRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Return placeholder for images
        if (request.destination === 'image') {
            return new Response(
                `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#667eea"/>
                    <text x="96" y="96" text-anchor="middle" dy=".3em" fill="white" font-size="80">📷</text>
                </svg>`,
                { 
                    headers: { 
                        'Content-Type': 'image/svg+xml',
                        'Cache-Control': 'no-cache'
                    } 
                }
            );
        }
        
        return new Response('Resource not available offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Handle external resource requests - Stale While Revalidate
async function handleExternalResourceRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        // Fetch in background
        const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        }).catch(() => cachedResponse);

        // Return cached response immediately if available
        return cachedResponse || fetchPromise;
    } catch (error) {
        console.error('External resource request failed:', error);
        return new Response('External resource not available', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Handle default requests - Network First
async function handleDefaultRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses in runtime cache
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Try cache as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If requesting a navigation, return the shell
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        
        return new Response('Not available offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Push notification event
self.addEventListener('push', (event) => {
    console.log('🔔 Service Worker: Push notification received');
    
    let notificationData = {
        title: 'Dicoding Story',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'dicoding-story',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'View',
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ],
        data: {
            url: '/#home',
            timestamp: Date.now()
        }
    };

    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            notificationData = { ...notificationData, ...pushData };
        } catch (error) {
            console.error('❌ Error parsing push data:', error);
            notificationData.body = event.data.text() || notificationData.body;
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            requireInteraction: notificationData.requireInteraction,
            actions: notificationData.actions,
            data: notificationData.data
        })
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Service Worker: Notification clicked');
    
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data || {};
    
    if (action === 'dismiss') {
        return;
    }
    
    // Handle notification click
    const urlToOpen = data.url || '/#home';
    
    event.waitUntil(
        clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        }).then((clientList) => {
            // Check if there's already a window/tab open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Focus existing window and navigate
                    client.postMessage({
                        type: 'notification-click',
                        action: action,
                        data: data,
                        url: urlToOpen
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

// Background sync event
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'background-sync-stories') {
        event.waitUntil(syncPendingStories());
    }
});

// Sync pending stories when back online
async function syncPendingStories() {
    try {
        console.log('🔄 Service Worker: Syncing pending stories...');
        
        // Get pending stories from IndexedDB
        const pendingStories = await getPendingStoriesFromIndexedDB();
        
        if (pendingStories.length === 0) {
            console.log('✅ No pending stories to sync');
            return;
        }
        
        // Try to sync each story
        for (const story of pendingStories) {
            try {
                await syncStoryToServer(story);
                await markStoryAsSynced(story.id);
                console.log('✅ Story synced:', story.id);
            } catch (error) {
                console.error('❌ Failed to sync story:', story.id, error);
            }
        }
        
        // Notify clients about sync completion
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'sync-completed',
                syncedCount: pendingStories.length
            });
        });
        
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

// Get pending stories from IndexedDB
async function getPendingStoriesFromIndexedDB() {
    // This would integrate with IndexedDB to get pending stories
    // For now, return empty array as this is handled by the main app
    return [];
}

// Sync story to server
async function syncStoryToServer(story) {
    // Implementation would depend on your API structure
    const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${story.token}`
        },
        body: JSON.stringify(story)
    });
    
    if (!response.ok) {
        throw new Error('Failed to sync story');
    }
    
    return response.json();
}

// Mark story as synced in IndexedDB
async function markStoryAsSynced(storyId) {
    // This would update the story status in IndexedDB
    // Implementation handled by main app
}

// Message handling from main app
self.addEventListener('message', (event) => {
    console.log('📨 Service Worker: Message received', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(
                caches.open(RUNTIME_CACHE_NAME)
                    .then((cache) => cache.addAll(data.urls))
            );
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearCache(data.cacheNames));
            break;
            
        case 'GET_CACHE_STATUS':
            event.waitUntil(getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            }));
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

// Clear specified caches
async function clearCache(cacheNames = []) {
    try {
        const results = await Promise.all(
            cacheNames.map(name => caches.delete(name))
        );
        console.log('🗑️ Caches cleared:', cacheNames);
        return results;
    } catch (error) {
        console.error('❌ Error clearing caches:', error);
        return false;
    }
}

// Get cache status
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const status = {};
        
        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            status[name] = {
                entryCount: keys.length,
                entries: keys.map(req => req.url)
            };
        }
        
        return status;
    } catch (error) {
        console.error('❌ Error getting cache status:', error);
        return {};
    }
}

// Periodic background sync (experimental)
self.addEventListener('periodicsync', (event) => {
    console.log('🔄 Service Worker: Periodic sync triggered', event.tag);
    
    if (event.tag === 'update-stories') {
        event.waitUntil(updateStoriesInBackground());
    }
});

// Update stories in background
async function updateStoriesInBackground() {
    try {
        console.log('🔄 Service Worker: Updating stories in background...');
        
        // This would fetch latest stories and update cache
        // Implementation depends on your API and caching strategy
        
        return Promise.resolve();
    } catch (error) {
        console.error('❌ Background update failed:', error);
        return Promise.reject(error);
    }
}

// Cache management utilities
async function cleanupExpiredCache() {
    try {
        const cache = await caches.open(API_CACHE_NAME);
        const requests = await cache.keys();
        
        // Remove old API responses (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response.headers.get('date');
            
            if (dateHeader) {
                const responseDate = new Date(dateHeader).getTime();
                if (responseDate < oneHourAgo) {
                    await cache.delete(request);
                    console.log('🗑️ Removed expired cache entry:', request.url);
                }
            }
        }
    } catch (error) {
        console.error('❌ Cache cleanup failed:', error);
    }
}

// Run cache cleanup periodically
setInterval(() => {
    cleanupExpiredCache();
}, 30 * 60 * 1000); // Every 30 minutes

// Handle installation prompt
self.addEventListener('beforeinstallprompt', (event) => {
    console.log('📱 Service Worker: Install prompt available');
    
    // Notify clients about install availability
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'install-available'
            });
        });
    });
});

// Handle app installation
self.addEventListener('appinstalled', (event) => {
    console.log('📱 Service Worker: App installed');
    
    // Notify clients about successful installation
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'app-installed'
            });
        });
    });
});

// Error handling for service worker
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Service Worker unhandled rejection:', event.reason);
});

// Service Worker health check
self.addEventListener('fetch', (event) => {
    // Health check endpoint
    if (event.request.url.endsWith('/sw-health')) {
        event.respondWith(
            new Response(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                caches: Object.keys(caches),
                version: '1.0.0'
            }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    }
});

console.log('🚀 Service Worker: Loaded successfully v1.0.0');