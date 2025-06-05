// Push Notification Manager - Mengelola push notifications
export class PushNotificationManager {
    constructor() {
        this.vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
        this.subscription = null;
        this.swRegistration = null;
        this.isSupported = this.checkSupport();
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
            
            return true;
        } catch (error) {
            console.error('Error initializing push notifications:', error);
            return false;
        }
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

    // Send subscription to server (simulate API call)
    async sendSubscriptionToServer(subscription) {
        try {
            // In real app, you would send this to your backend
            console.log('Sending subscription to server:', subscription);
            
            // Simulate API call
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userAgent: navigator.userAgent
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send subscription to server');
            }

            return await response.json();
        } catch (error) {
            // For demo purposes, just log the subscription
            console.log('Demo: Subscription would be sent to server:', subscription);
            return { success: true, message: 'Subscription saved (demo mode)' };
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

    // Trigger test notification for new story
    triggerStoryNotification(storyData) {
        this.showLocalNotification('New Story Added!', {
            body: `${storyData.name} shared a new story: "${storyData.description.substring(0, 50)}..."`,
            icon: '/icons/icon-192x192.png',
            data: {
                type: 'new-story',
                storyId: storyData.id,
                url: '/#home'
            },
            actions: [
                {
                    action: 'view-story',
                    title: 'View Story'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        });
    }

    // Trigger welcome notification
    triggerWelcomeNotification(userName) {
        this.showLocalNotification('Welcome to Dicoding Story!', {
            body: `Hi ${userName}! You can now receive notifications about new stories.`,
            icon: '/icons/icon-192x192.png',
            data: {
                type: 'welcome',
                url: '/#home'
            }
        });
    }

    // Convert VAPID key from base64 to Uint8Array
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
        try {
            localStorage.setItem('push-subscription', JSON.stringify(subscription));
        } catch (error) {
            console.error('Error saving subscription:', error);
        }
    }

    // Load subscription from localStorage
    loadSubscription() {
        try {
            const subscriptionData = localStorage.getItem('push-subscription');
            return subscriptionData ? JSON.parse(subscriptionData) : null;
        } catch (error) {
            console.error('Error loading subscription:', error);
            return null;
        }
    }

    // Remove subscription from localStorage
    removeSubscription() {
        try {
            localStorage.removeItem('push-subscription');
        } catch (error) {
            console.error('Error removing subscription:', error);
        }
    }

    // Get subscription status
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
                        <h3>Enable Notifications</h3>
                        <p>Get notified when new stories are shared by other users!</p>
                        <div class="permission-dialog-buttons">
                            <button class="btn btn-secondary" id="permission-deny">Not Now</button>
                            <button class="btn" id="permission-allow">Enable</button>
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
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                }
                .permission-dialog-overlay {
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .permission-dialog-content {
                    background: white;
                    border-radius: 15px;
                    padding: 2rem;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                }
                .permission-dialog-icon {
                    margin-bottom: 1rem;
                }
                .permission-dialog-content h3 {
                    margin: 0 0 1rem 0;
                    color: #333;
                }
                .permission-dialog-content p {
                    margin: 0 0 2rem 0;
                    color: #666;
                    line-height: 1.5;
                }
                .permission-dialog-buttons {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                .permission-dialog-buttons .btn {
                    flex: 1;
                    max-width: 150px;
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(dialog);

            // Handle button clicks
            document.getElementById('permission-allow').addEventListener('click', async () => {
                document.body.removeChild(dialog);
                document.head.removeChild(style);
                
                const granted = await this.requestPermission();
                resolve(granted);
            });

            document.getElementById('permission-deny').addEventListener('click', () => {
                document.body.removeChild(dialog);
                document.head.removeChild(style);
                resolve(false);
            });

            // Handle overlay click
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog.querySelector('.permission-dialog-overlay')) {
                    document.body.removeChild(dialog);
                    document.head.removeChild(style);
                    resolve(false);
                }
            });
        });
    }
}