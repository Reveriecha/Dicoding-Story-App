console.log('Loading push-notification-manager.js');
export class PushNotificationManager {
    constructor() {
        this.vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
        this.subscription = null;
        this.swRegistration = null;
        this.isSupported = this.checkSupport();
        this.apiBaseUrl = 'https://story-api.dicoding.dev/v1';
    }

    // Check browser support
    checkSupport() {
        return (
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        );
    }

    // Initialize push notifications
    async initialize() {
        if (!this.isSupported) {
            console.warn('Push notifications are not supported in this browser');
            return false;
        }

        try {
            // Wait for service worker registration
            this.swRegistration = await navigator.serviceWorker.ready;
            
            // Check existing subscription
            this.subscription = await this.swRegistration.pushManager.getSubscription();
            
            // Load saved subscription from localStorage
            if (!this.subscription) {
                const savedSubscription = this.loadSubscription();
                if (savedSubscription) {
                    this.subscription = savedSubscription;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing push notifications:', error);
            return false;
        }
    }

    // Convert VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Save subscription to localStorage
    saveSubscription(subscription) {
        if (subscription) {
            localStorage.setItem('push-subscription', JSON.stringify(subscription));
        }
    }

    // Load subscription from localStorage
    loadSubscription() {
        const saved = localStorage.getItem('push-subscription');
        return saved ? JSON.parse(saved) : null;
    }

    // Remove subscription from localStorage
    removeSubscription() {
        localStorage.removeItem('push-subscription');
        localStorage.removeItem('push-subscription-id');
    }

    // Request notification permission
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push notifications are not supported');
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Notification permission granted');
            return true;
        } else if (permission === 'denied') {
            console.warn('Notification permission denied');
            return false;
        } else {
            console.warn('Notification permission dismissed');
            return false;
        }
    }

    // Subscribe to push notifications
    async subscribe() {
        try {
            if (!this.swRegistration) {
                await this.initialize();
            }

            // Check if already subscribed
            if (this.subscription) {
                console.log('Already subscribed to push notifications');
                return this.subscription;
            }

            // Request permission first
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                throw new Error('Notification permission not granted');
            }

            // Convert VAPID key
            const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
            
            // Subscribe to push manager
            this.subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('Push subscription successful:', this.subscription);
            
            // Store subscription to localStorage for persistence
            this.saveSubscription(this.subscription);
            
            return this.subscription;
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            throw error;
        }
    }

    // Unsubscribe from push notifications
    async unsubscribe() {
        try {
            if (!this.subscription) {
                console.log('No active subscription to unsubscribe');
                return true;
            }

            await this.subscription.unsubscribe();
            this.subscription = null;
            
            // Remove from localStorage
            this.removeSubscription();
            
            console.log('Successfully unsubscribed from push notifications');
            return true;
        } catch (error) {
            console.error('Error unsubscribing from push notifications:', error);
            return false;
        }
    }

    // Send subscription to server - FIXED to use correct endpoint and format
    async sendSubscriptionToServer(subscription, authToken) {
        try {
            // Check if auth token is provided
            if (!authToken) {
                throw new Error('Authentication token required');
            }

            const subscriptionJSON = subscription.toJSON();
            
            // Prepare request body according to API spec
            const requestBody = {
                endpoint: subscriptionJSON.endpoint,
                keys: {
                    p256dh: subscriptionJSON.keys.p256dh,
                    auth: subscriptionJSON.keys.auth
                }
            };

            console.log('Sending subscription to server:', requestBody);

            const response = await fetch(`${this.apiBaseUrl}/notifications/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send subscription to server');
            }

            const responseData = await response.json();
            console.log('Subscription sent successfully:', responseData);
            
            // Store subscription ID if returned
            if (responseData.data && responseData.data.id) {
                localStorage.setItem('push-subscription-id', responseData.data.id);
            }
            
            return responseData;
        } catch (error) {
            console.error('Error sending subscription to server:', error);
            throw error;
        }
    }

    // Unsubscribe from server - FIXED to use correct request format
    async unsubscribeFromServer(authToken) {
        try {
            if (!authToken) {
                throw new Error('Authentication token required');
            }

            if (!this.subscription) {
                throw new Error('No active subscription');
            }

            const subscriptionJSON = this.subscription.toJSON();
            
            // Request body only needs endpoint for unsubscribe
            const requestBody = {
                endpoint: subscriptionJSON.endpoint
            };

            console.log('Unsubscribing from server:', requestBody);

            const response = await fetch(`${this.apiBaseUrl}/notifications/subscribe`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to unsubscribe from server');
            }

            const responseData = await response.json();
            console.log('Unsubscribed from server successfully:', responseData);
            
            // Clear stored subscription ID
            localStorage.removeItem('push-subscription-id');
            
            return responseData;
        } catch (error) {
            console.error('Error unsubscribing from server:', error);
            throw error;
        }
    }

    // Full subscribe flow with server registration
    async subscribeWithAuth(authToken) {
        try {
            // First subscribe to push manager
            const subscription = await this.subscribe();
            
            // Then send to server
            const serverResponse = await this.sendSubscriptionToServer(subscription, authToken);
            
            return {
                subscription,
                serverResponse,
                success: true
            };
        } catch (error) {
            console.error('Error in full subscribe flow:', error);
            
            // If subscription exists but server failed, unsubscribe locally
            if (this.subscription) {
                await this.unsubscribe();
            }
            
            throw error;
        }
    }

    // Full unsubscribe flow with server unregistration
    async unsubscribeWithAuth(authToken) {
        try {
            // First unsubscribe from server
            if (authToken && this.subscription) {
                await this.unsubscribeFromServer(authToken);
            }
            
            // Then unsubscribe locally
            await this.unsubscribe();
            
            return { success: true };
        } catch (error) {
            console.error('Error in full unsubscribe flow:', error);
            
            // Even if server unsubscribe fails, try to unsubscribe locally
            await this.unsubscribe();
            
            throw error;
        }
    }

    // Show local notification (for testing)
    showLocalNotification(title, options = {}) {
        if (!this.isSupported || Notification.permission !== 'granted') {
            console.warn('Cannot show notification: permission not granted');
            return;
        }

        const defaultOptions = {
            body: 'This is a test notification',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: 'dicoding-story',
            requireInteraction: false,
            actions: [
                {
                    action: 'view',
                    title: 'View',
                    icon: '/icons/icon-72x72.png'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        };

        const notificationOptions = { ...defaultOptions, ...options };

        if (this.swRegistration) {
            // Show notification through service worker
            this.swRegistration.showNotification(title, notificationOptions);
        } else {
            // Fallback to regular notification
            new Notification(title, notificationOptions);
        }
    }

    // Trigger test notification for new story - following API schema exactly
    triggerStoryNotification(storyData) {
        // Follow the exact JSON schema from API
        const notificationData = {
            title: 'Story berhasil dibuat',
            options: {
                body: `Anda telah membuat story baru dengan deskripsi: ${storyData.description.substring(0, 50)}${storyData.description.length > 50 ? '...' : ''}`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'dicoding-story',
                data: {
                    type: 'new-story',
                    storyId: storyData.id,
                    url: '/#home'
                },
                requireInteraction: false,
                actions: [
                    {
                        action: 'view',
                        title: 'Lihat Story'
                    },
                    {
                        action: 'dismiss',
                        title: 'Tutup'
                    }
                ]
            }
        };

        // For local notification (not from push event)
        this.showLocalNotification(notificationData.title, notificationData.options);
    }

    // Trigger welcome notification
    triggerWelcomeNotification(userName) {
        this.showLocalNotification('Selamat datang di Dicoding Story!', {
            body: `Hai ${userName}! Anda akan menerima notifikasi saat ada story baru.`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: 'dicoding-story-welcome',
            data: {
                type: 'welcome',
                url: '/#home'
            }
        });
    }

    // Get current subscription status
    getSubscriptionStatus() {
        return {
            isSupported: this.isSupported,
            permission: this.isSupported ? Notification.permission : 'not-supported',
            isSubscribed: !!this.subscription,
            subscription: this.subscription
        };
    }

    // Setup notification click handler in service worker
    setupNotificationHandlers() {
        if (!this.swRegistration) return;

        // This should be handled in the service worker
        // But we can setup message handling here
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'notification-click') {
                const notificationData = event.data.data;
                
                if (notificationData.url) {
                    window.location.href = notificationData.url;
                }
            }
        });
    }

    // Request notification permission with UI
    async requestPermissionWithUI() {
        return new Promise((resolve) => {
            // Create permission dialog
            const dialog = document.createElement('div');
            dialog.className = 'notification-permission-dialog';
            dialog.innerHTML = `
                <div class="permission-dialog-overlay">
                    <div class="permission-dialog-content">
                        <div class="permission-dialog-icon">
                            <i class="fas fa-bell" style="font-size: 2rem; color: #667eea;"></i>
                        </div>
                        <h3>Aktifkan Notifikasi</h3>
                        <p>Dapatkan pemberitahuan saat ada story baru!</p>
                        <div class="permission-dialog-buttons">
                            <button class="btn-cancel" onclick="this.closest('.notification-permission-dialog').remove()">Nanti</button>
                            <button class="btn-enable" onclick="this.closest('.notification-permission-dialog').dispatchEvent(new Event('enable'))">Aktifkan</button>
                        </div>
                    </div>
                </div>
            `;

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .notification-permission-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 9999;
                }
                .permission-dialog-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }
                .permission-dialog-content {
                    background: white;
                    border-radius: 12px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                .permission-dialog-icon {
                    margin-bottom: 1rem;
                }
                .permission-dialog-content h3 {
                    margin: 0 0 0.5rem 0;
                    color: #333;
                }
                .permission-dialog-content p {
                    margin: 0 0 1.5rem 0;
                    color: #666;
                }
                .permission-dialog-buttons {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                .permission-dialog-buttons button {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 6px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .btn-cancel {
                    background: #e0e0e0;
                    color: #666;
                }
                .btn-cancel:hover {
                    background: #d0d0d0;
                }
                .btn-enable {
                    background: #667eea;
                    color: white;
                }
                .btn-enable:hover {
                    background: #5a6cd8;
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(dialog);

            // Handle enable event
            dialog.addEventListener('enable', async () => {
                dialog.remove();
                style.remove();
                
                const granted = await this.requestPermission();
                resolve(granted);
            });

            // Handle overlay click
            dialog.querySelector('.permission-dialog-overlay').addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    dialog.remove();
                    style.remove();
                    resolve(false);
                }
            });
        });
    }
}

// Singleton instance
let pushNotificationManagerInstance = null;

export function getPushNotificationManager() {
    if (!pushNotificationManagerInstance) {
        pushNotificationManagerInstance = new PushNotificationManager();
    }
    return pushNotificationManagerInstance;
}
