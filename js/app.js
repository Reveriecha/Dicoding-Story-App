// Main Application - Entry point dengan MVP architecture + PWA + IndexedDB
import { StoryModel } from './models/story-model.js';
import { AuthModel } from './models/auth-model.js';
import { StoryView } from './views/story-view.js';
import { AuthView } from './views/auth-view.js';
import { StoryPresenter } from './presenters/story-presenter.js';
import { AuthPresenter } from './presenters/auth-presenter.js';
import { ApiService } from './utils/api-service.js';
import { CameraManager } from './utils/camera-manager.js';
import { MapManager } from './utils/map-manager.js';
import { PushNotificationManager } from './utils/push-notification-manager.js';
import { IndexedDBManager } from './utils/indexeddb-manager.js';
import { OfflineManager } from './utils/offline-manager.js';
import { OfflineUIManager } from './utils/offline-ui-manager.js';

class DicodingStoryApp {
    constructor() {
        // Initialize core components
        this.models = {};
        this.views = {};
        this.presenters = {};
        this.utils = {};
        this.router = null;
        this.currentPage = 'home';
        this.isInitialized = false;
        this.appVersion = '1.0.0';
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Dicoding Story App v' + this.appVersion);
            
            // Show loading state
            this.showAppLoading();
            
            // Initialize utilities first
            await this.initializeUtils();
            
            // Initialize models
            this.initializeModels();
            
            // Initialize views
            this.initializeViews();
            
            // Initialize presenters (MVP pattern)
            this.initializePresenters();
            
            // Initialize router
            this.initializeRouter();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Setup accessibility features
            this.setupAccessibility();
            
            // Handle page visibility changes
            this.setupPageVisibilityHandler();
            
            // Initialize PWA features
            await this.initializePWAFeatures();
            
            // Auto-login if user has valid session
            await this.handleAutoLogin();
            
            // Load and inject additional styles
            await this.loadAdditionalStyles();
            
            // Initialize current page
            this.initializeCurrentPage();
            
            // Hide loading state
            this.hideAppLoading();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('✅ Dicoding Story App initialized successfully');
            this.announceToScreenReader('Application loaded successfully');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showGlobalError('Failed to initialize application. Please refresh the page.');
            this.hideAppLoading();
        }
    }

    // Show app loading state
    showAppLoading() {
        const loading = document.createElement('div');
        loading.id = 'app-loading';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
        `;
        loading.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-camera" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h2>Dicoding Story</h2>
                <div style="margin-top: 2rem;">
                    <i class="fas fa-spinner fa-spin"></i> Loading...
                </div>
            </div>
        `;
        document.body.appendChild(loading);
    }

    // Hide app loading state
    hideAppLoading() {
        const loading = document.getElementById('app-loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                if (loading.parentNode) {
                    loading.remove();
                }
            }, 300);
        }
    }

    // Initialize utility classes
    async initializeUtils() {
        console.log('📦 Initializing utilities...');
        
        // Core utilities
        this.utils.apiService = new ApiService();
        this.utils.mapManager = new MapManager();
        this.utils.cameraManager = new CameraManager();
        this.utils.pushNotificationManager = new PushNotificationManager();
        
        // Initialize IndexedDB
        this.utils.indexedDBManager = new IndexedDBManager();
        await this.utils.indexedDBManager.init();
        
        // Initialize Offline Manager
        this.utils.offlineManager = new OfflineManager(
            this.utils.indexedDBManager,
            this.utils.apiService
        );
        
        // Initialize Offline UI Manager
        this.utils.offlineUIManager = new OfflineUIManager(this.utils.offlineManager);
        
        console.log('✅ Utilities initialized');
    }

    // Initialize models
    initializeModels() {
        console.log('📊 Initializing models...');
        this.models.storyModel = new StoryModel();
        this.models.authModel = new AuthModel();
        console.log('✅ Models initialized');
    }

    // Initialize views
    initializeViews() {
        console.log('🎨 Initializing views...');
        this.views.storyView = new StoryView();
        this.views.authView = new AuthView();
        console.log('✅ Views initialized');
    }

    // Initialize presenters (MVP pattern implementation)
    initializePresenters() {
        console.log('🎭 Initializing presenters...');
        
        // Story presenter
        this.presenters.storyPresenter = new StoryPresenter(
            this.models.storyModel,
            this.views.storyView,
            this.utils.apiService,
            this.models.authModel
        );
        
        // Set dependencies untuk story presenter
        this.presenters.storyPresenter.setCameraManager(this.utils.cameraManager);
        this.presenters.storyPresenter.setMapManager(this.utils.mapManager);
        this.presenters.storyPresenter.setPushNotificationManager(this.utils.pushNotificationManager);
        this.presenters.storyPresenter.setOfflineManager(this.utils.offlineManager);

        // Auth presenter
        this.presenters.authPresenter = new AuthPresenter(
            this.models.authModel,
            this.views.authView,
            this.utils.apiService
        );

        // Set dependencies untuk auth presenter
        this.presenters.authPresenter.setPushNotificationManager(this.utils.pushNotificationManager);

        // Make presenters globally accessible for cross-communication
        window.app = {
            storyPresenter: this.presenters.storyPresenter,
            authPresenter: this.presenters.authPresenter,
            mapManager: this.utils.mapManager,
            cameraManager: this.utils.cameraManager,
            apiService: this.utils.apiService,
            pushNotificationManager: this.utils.pushNotificationManager,
            indexedDBManager: this.utils.indexedDBManager,
            offlineManager: this.utils.offlineManager,
            offlineUIManager: this.utils.offlineUIManager,
            router: null, // Will be set after router initialization
            navigateTo: (route) => this.navigateTo(route),
            getCurrentPage: () => this.currentPage,
            isAuthenticated: () => this.models.authModel.isAuthenticated(),
            getCurrentUser: () => this.models.authModel.getUser(),
            getAppStats: () => this.getAppStats(),
            updateNotificationButtonStatus: () => this.updateNotificationButtonStatus(),
            triggerTestNotification: () => this.triggerTestNotification(),
            version: this.appVersion
        };
        
        console.log('✅ Presenters initialized');
    }

    // Initialize router
    initializeRouter() {
        console.log('🗺️  Initializing router...');
        this.router = new Router(this);
        window.app.router = this.router; // Make router globally accessible
        console.log('✅ Router initialized');
    }

    // Initialize PWA features
    async initializePWAFeatures() {
        console.log('📱 Initializing PWA features...');
        
        try {
            // Initialize push notifications
            await this.initializePushNotifications();
            
            // Initialize offline capabilities
            await this.utils.offlineManager.initializeOfflineCapabilities();
            
            // Setup periodic cleanup
            this.utils.offlineManager.schedulePeriodicCleanup(24); // Every 24 hours
            
            // Setup visibility change handler for sync
            this.utils.offlineManager.handleVisibilityChange();
            
            // Register background sync if supported
            await this.utils.offlineManager.registerBackgroundSync();
            
            // Setup PWA UI elements
            this.setupPWAUI();
            
            // Register service worker
            await this.registerServiceWorker();
            
            console.log('✅ PWA features initialized');
        } catch (error) {
            console.error('⚠️  PWA features initialization failed:', error);
        }
    }

    // Register Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateAvailable();
                        }
                    });
                });
                
                return registration;
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
                return null;
            }
        }
        return null;
    }

    // Show update available notification
    showUpdateAvailable() {
        const updateIndicator = document.getElementById('update-indicator');
        if (updateIndicator) {
            updateIndicator.classList.add('show');
        }
    }

    // Initialize push notifications
    async initializePushNotifications() {
        try {
            console.log('🔔 Initializing push notifications...');
            
            const initialized = await this.utils.pushNotificationManager.initialize();
            
            if (initialized) {
                console.log('✅ Push notifications initialized successfully');
                
                // Setup notification handlers
                this.utils.pushNotificationManager.setupNotificationHandlers();
                
                // Check if user is already subscribed
                const status = this.utils.pushNotificationManager.getSubscriptionStatus();
                console.log('📊 Push notification status:', status);
                
            } else {
                console.warn('⚠️  Push notifications not supported or failed to initialize');
            }
        } catch (error) {
            console.error('❌ Error initializing push notifications:', error);
        }
    }

    // Setup PWA UI elements
    setupPWAUI() {
        // Setup notification button
        this.setupPushNotificationUI();
        
        // Setup PWA install button
        this.setupPWAInstallButton();
        
        // Setup offline page navigation
        this.utils.offlineUIManager.updateOfflineNavigation();
        
        // Initialize offline page if needed
        this.utils.offlineUIManager.initializeOfflinePage();
    }

    // Setup PWA install button
    setupPWAInstallButton() {
        const nav = document.querySelector('nav ul');
        if (nav && !document.getElementById('pwa-install-btn')) {
            const installItem = document.createElement('li');
            installItem.innerHTML = `
                <button id="pwa-install-btn" style="display: none;">
                    <i class="fas fa-download"></i> Install App
                </button>
            `;
            nav.appendChild(installItem);

            const installBtn = document.getElementById('pwa-install-btn');
            
            // Handle install prompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPrompt = e;
                installBtn.style.display = 'block';
            });

            installBtn.addEventListener('click', async () => {
                if (window.deferredPrompt) {
                    window.deferredPrompt.prompt();
                    const { outcome } = await window.deferredPrompt.userChoice;
                    
                    if (outcome === 'accepted') {
                        console.log('PWA installed');
                        installBtn.style.display = 'none';
                    }
                    
                    window.deferredPrompt = null;
                }
            });

            // Handle app installed
            window.addEventListener('appinstalled', () => {
                console.log('PWA was installed');
                installBtn.style.display = 'none';
            });
        }
    }

    // Setup push notification button in UI
    setupPushNotificationUI() {
        const nav = document.querySelector('nav ul');
        if (nav && !document.getElementById('notification-toggle')) {
            const notificationItem = document.createElement('li');
            notificationItem.innerHTML = `
                <button id="notification-toggle">
                    <i class="fas fa-bell"></i> <span id="notification-status">Notifications</span>
                </button>
            `;
            
            // Insert before auth link
            const authLink = document.querySelector('#auth-link');
            if (authLink) {
                nav.insertBefore(notificationItem, authLink.parentElement);
            } else {
                nav.appendChild(notificationItem);
            }

            // Add event listener
            const notificationToggle = document.getElementById('notification-toggle');
            notificationToggle.addEventListener('click', () => {
                this.handleNotificationToggle();
            });

            // Update button status
            this.updateNotificationButtonStatus();
        }
    }

    // Handle notification toggle
    async handleNotificationToggle() {
        const status = this.utils.pushNotificationManager.getSubscriptionStatus();
        
        if (!status.isSupported) {
            this.showGlobalError('Push notifications are not supported in this browser.');
            return;
        }

        if (status.permission === 'denied') {
            this.showGlobalError('Notifications are blocked. Please enable them in your browser settings.');
            return;
        }

        try {
            if (status.isSubscribed) {
                // Unsubscribe
                await this.utils.pushNotificationManager.unsubscribe();
                this.showSuccessMessage('Notifications disabled successfully.');
            } else {
                // Show permission dialog and subscribe
                const granted = await this.utils.pushNotificationManager.requestPermissionWithUI();
                
                if (granted) {
                    const subscription = await this.utils.pushNotificationManager.subscribe();
                    
                    if (subscription) {
                        // Send to server
                        await this.utils.pushNotificationManager.sendSubscriptionToServer(subscription);
                        this.showSuccessMessage('Notifications enabled successfully!');
                        
                        // Show welcome notification if user is logged in
                        const user = this.models.authModel.getUser();
                        if (user) {
                            setTimeout(() => {
                                this.utils.pushNotificationManager.triggerWelcomeNotification(user.name);
                            }, 1000);
                        }
                    }
                } else {
                    this.showGlobalError('Notification permission denied.');
                }
            }
            
            this.updateNotificationButtonStatus();
        } catch (error) {
            console.error('Error toggling notifications:', error);
            this.showGlobalError('Failed to toggle notifications. Please try again.');
        }
    }

    // Update notification button status
    updateNotificationButtonStatus() {
        const button = document.getElementById('notification-toggle');
        const statusText = document.getElementById('notification-status');
        
        if (!button || !statusText) return;

        const status = this.utils.pushNotificationManager.getSubscriptionStatus();
        
        if (!status.isSupported) {
            button.style.display = 'none';
            return;
        }

        if (status.permission === 'denied') {
            statusText.textContent = 'Blocked';
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            return;
        }

        if (status.isSubscribed) {
            statusText.innerHTML = '<i class="fas fa-bell"></i> On';
            button.style.background = 'rgba(46, 204, 113, 0.2)';
            button.style.borderColor = 'rgba(46, 204, 113, 0.5)';
        } else {
            statusText.innerHTML = '<i class="fas fa-bell-slash"></i> Off';
            button.style.background = 'transparent';
            button.style.borderColor = 'rgba(255,255,255,0.3)';
        }
        
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }

    // Load additional styles dynamically
    async loadAdditionalStyles() {
        try {
            // Create and inject additional CSS that's not critical
            const additionalCSS = `
                .auth-form {
                    max-width: 400px;
                    margin: 0 auto;
                    padding: 2rem;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: #555;
                }

                input, textarea, select {
                    width: 100%;
                    padding: 1rem;
                    border: 2px solid #e1e5e9;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: border-color 0.3s ease;
                }

                input:focus, textarea:focus, select:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 50px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    display: inline-block;
                    text-align: center;
                }

                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .btn-secondary {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }

                .stories-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 2rem;
                    margin-top: 2rem;
                }

                .story-card {
                    background: white;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    transition: transform 0.3s ease;
                }

                .story-card:hover {
                    transform: translateY(-5px);
                }

                .story-image {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                }

                .story-content {
                    padding: 1.5rem;
                }

                .story-author {
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 0.5rem;
                }

                .story-description {
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }

                .story-date {
                    color: #999;
                    font-size: 0.9rem;
                }

                .camera-container {
                    position: relative;
                    margin-bottom: 2rem;
                }

                #camera-preview {
                    width: 100%;
                    max-width: 400px;
                    height: 300px;
                    background: #f5f5f5;
                    border-radius: 10px;
                    object-fit: cover;
                }

                .camera-controls {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                    flex-wrap: wrap;
                }

                #map, #add-story-map, #stories-map {
                    height: 400px;
                    border-radius: 10px;
                    margin-bottom: 2rem;
                }

                .alert {
                    padding: 1rem;
                    border-radius: 10px;
                    margin-bottom: 1rem;
                }

                .alert-success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .alert-error {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                footer {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 2rem;
                    text-align: center;
                    color: white;
                    margin-top: 2rem;
                }

                .keyboard-navigation *:focus {
                    outline: 2px solid #667eea !important;
                    outline-offset: 2px !important;
                }

                @media (max-width: 768px) {
                    .stories-grid {
                        grid-template-columns: 1fr;
                    }

                    .camera-controls {
                        flex-direction: column;
                    }
                }
            `;

            const style = document.createElement('style');
            style.textContent = additionalCSS;
            document.head.appendChild(style);

        } catch (error) {
            console.error('Error loading additional styles:', error);
        }
    }

    // Setup global event listeners
    setupGlobalEventListeners() {
        console.log('👂 Setting up global event listeners...');
        
        // Navigation click events
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('href').slice(1);
                this.navigateTo(route);
            });
        });

        // Handle register/login page navigation links
        document.addEventListener('click', (e) => {
            if (e.target.getAttribute('href') === '#register') {
                e.preventDefault();
                this.navigateTo('register');
            } else if (e.target.getAttribute('href') === '#login') {
                e.preventDefault();
                this.navigateTo('login');
            }
        });

        // Handle ESC key for modal-like behavior
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Stop camera if active
                if (this.utils.cameraManager.isCameraActive()) {
                    this.utils.cameraManager.stopCamera();
                }
            }
        });

        // Handle before unload (cleanup)
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.handleConnectionChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleConnectionChange(false);
        });

        // Handle connection changes for offline manager
        window.addEventListener('connectionChange', (e) => {
            this.handleOfflineSync(e.detail.isOnline);
        });
        
        console.log('✅ Global event listeners setup complete');
    }

    // Handle offline sync when connection changes
    async handleOfflineSync(isOnline) {
        if (isOnline && this.models.authModel.isAuthenticated()) {
            try {
                const token = this.models.authModel.getToken();
                
                // Check for pending operations
                const pendingCount = await this.utils.offlineManager.getPendingOperationsCount();
                
                if (pendingCount > 0) {
                    console.log(`🔄 Found ${pendingCount} pending operations, starting sync...`);
                    
                    // Auto-sync after a delay
                    setTimeout(async () => {
                        const result = await this.utils.offlineManager.manualSync(token);
                        if (result.success) {
                            this.showSuccessMessage(`Synced ${result.syncResult.syncedCount || 0} items successfully`);
                            
                            // Refresh stories if on home page
                            if (this.currentPage === 'home') {
                                this.presenters.storyPresenter.loadStories();
                            }
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('Error during auto-sync:', error);
            }
        }
    }

    // Setup accessibility features
    setupAccessibility() {
        console.log('♿ Setting up accessibility features...');
        
        // Setup skip to content functionality
        const skipLink = document.querySelector('.skip-link');
        const mainContent = document.querySelector('#main-content');
        
        if (skipLink && mainContent) {
            skipLink.addEventListener('click', (event) => {
                event.preventDefault();
                skipLink.blur(); // Remove focus from skip link
                mainContent.focus(); // Focus to main content
                mainContent.scrollIntoView(); // Scroll to main content
            });
        }

        // Keyboard navigation support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // Set main content tabindex for accessibility
        if (mainContent) {
            mainContent.setAttribute('tabindex', '-1');
        }

        // Add ARIA live region for dynamic content announcements
        this.createAriaLiveRegion();
        
        console.log('✅ Accessibility features setup complete');
    }

    // Create ARIA live region for screen readers
    createAriaLiveRegion() {
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'aria-live-region';
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        
        document.body.appendChild(liveRegion);
    }

    // Announce to screen readers
    announceToScreenReader(message) {
        const liveRegion = document.getElementById('aria-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    // Setup page visibility handler untuk camera management
    setupPageVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Stop camera when tab becomes hidden
                if (this.utils.cameraManager.isCameraActive()) {
                    this.utils.cameraManager.stopCamera();
                    this.announceToScreenReader('Camera stopped due to page becoming inactive');
                }
            } else {
                // Page became visible
                if (this.utils.offlineManager && this.models.authModel.isAuthenticated()) {
                    // Check for pending sync operations
                    this.handleOfflineSync(navigator.onLine);
                }
            }
        });
    }

    // Handle auto-login
    async handleAutoLogin() {
        try {
            console.log('🔐 Attempting auto-login...');
            const success = await this.presenters.authPresenter.autoLogin();
            if (success) {
                this.announceToScreenReader('Automatically logged in');
                console.log('✅ Auto-login successful');
                
                // Update notification button after auto-login
                setTimeout(() => {
                    this.updateNotificationButtonStatus();
                }, 500);
                
                // Load cached stories if offline
                if (!navigator.onLine) {
                    console.log('📱 Loading cached stories (offline mode)');
                    const cachedStories = await this.utils.offlineManager.getCachedStories();
                    if (cachedStories.length > 0) {
                        this.models.storyModel.setStories(cachedStories);
                        this.showSuccessMessage(`Loaded ${cachedStories.length} cached stories (offline mode)`);
                    }
                }
            } else {
                console.log('ℹ️  No auto-login available');
            }
        } catch (error) {
            console.error('❌ Auto-login failed:', error);
        }
    }

    // Initialize current page based on URL
    initializeCurrentPage() {
        const hash = window.location.hash.slice(1) || 'home';
        console.log(`🏠 Initializing current page: ${hash}`);
        this.navigateTo(hash);
    }

    // Navigation handler (SPA routing)
    navigateTo(route) {
        // Validate route
        const validRoutes = ['home', 'add-story', 'login', 'register', 'offline'];
        if (!validRoutes.includes(route)) {
            console.warn(`⚠️  Invalid route: ${route}, redirecting to home`);
            route = 'home';
        }

        // Store previous page
        const previousPage = this.currentPage;
        
        // Update current page
        this.currentPage = route;
        
        console.log(`🧭 Navigating from ${previousPage} to ${route}`);

        // Handle camera cleanup when leaving add-story page
        if (previousPage === 'add-story' && route !== 'add-story') {
            if (this.utils.cameraManager.isCameraActive()) {
                this.utils.cameraManager.stopCamera();
                this.announceToScreenReader('Camera stopped when leaving add story page');
            }
        }

        // Check authentication for protected routes
        if (route === 'add-story' && !this.models.authModel.isAuthenticated()) {
            this.views.authView.showAlert('Please login first to add a story', 'error');
            this.navigateTo('login');
            return;
        }

        // Show target page
        this.showPage(route);
        
        // Initialize page-specific functionality
        this.initializePage(route);
        
        // Notify presenters about page change
        if (this.presenters.storyPresenter.onPageChanged) {
            this.presenters.storyPresenter.onPageChanged(route);
        }

        // Handle offline page
        if (route === 'offline') {
            this.utils.offlineUIManager.showOfflinePage();
        }

        // Announce page change to screen readers
        this.announceToScreenReader(`Navigated to ${route} page`);
    }

    // Show page and update navigation
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            // Use View Transition API if available
            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    targetPage.classList.add('active');
                });
            } else {
                targetPage.classList.add('active');
            }
        } else {
            console.error(`❌ Page element not found: ${pageId}-page`);
        }

        // Update navigation active state
        this.updateNavigation(pageId);
        
        // Focus main content for accessibility
        setTimeout(() => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.focus();
            }
        }, 100);
    }

    // Update navigation active state
    updateNavigation(activeRoute) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${activeRoute}`) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    // Initialize page-specific functionality
    initializePage(route) {
        setTimeout(() => {
            switch (route) {
                case 'home':
                    this.initializeHomePage();
                    break;
                case 'add-story':
                    this.initializeAddStoryPage();
                    break;
                case 'login':
                    this.initializeLoginPage();
                    break;
                case 'register':
                    this.initializeRegisterPage();
                    break;
                case 'offline':
                    this.initializeOfflinePage();
                    break;
                default:
                    console.warn(`⚠️  No initialization handler for route: ${route}`);
            }
        }, 100);
    }

    // Initialize home page
    async initializeHomePage() {
        console.log('🏠 Initializing home page...');
        
        // Load stories if user is authenticated
        if (this.models.authModel.isAuthenticated()) {
            this.presenters.storyPresenter.loadStories();
            
            // Add favorite buttons to story cards after they load
            setTimeout(() => {
                this.utils.offlineUIManager.addFavoriteButtons();
            }, 2000);
        } else {
            // Show login prompt for unauthenticated users
            this.views.storyView.showError('Please login to view stories.');
            
            // Show cached stories if available (for demo purposes)
            const cachedStories = await this.utils.offlineManager.getCachedStories();
            if (cachedStories.length > 0) {
                this.models.storyModel.setStories(cachedStories);
                this.showSuccessMessage(`Showing ${cachedStories.length} cached stories. Login to see latest stories.`);
            }
        }
    }

    // Initialize add-story page
    async initializeAddStoryPage() {
        console.log('📝 Initializing add-story page...');
        
        // Check authentication
        if (!this.models.authModel.isAuthenticated()) {
            this.views.authView.showAlert('Please login first to add a story', 'error');
            this.navigateTo('login');
            return;
        }

        // Initialize map for location selection
        if (!this.utils.mapManager.getMap('add-story-map')) {
            this.presenters.storyPresenter.initializeAddStoryMap();
        } else {
            // Invalidate size if map already exists
            this.utils.mapManager.invalidateSize('add-story-map');
        }

        // Reset form if needed
        this.views.storyView.resetAddStoryForm();
        
        // Reset camera state
        if (this.utils.cameraManager.getCapturedPhoto()) {
            this.utils.cameraManager.clearPhoto();
        }

        // Handle draft editing if currentDraftId is set
        if (window.currentDraftId) {
            try {
                const draft = await this.utils.indexedDBManager.get('drafts', window.currentDraftId);
                if (draft) {
                    // Populate form with draft data
                    const descField = document.getElementById('story-description');
                    const latField = document.getElementById('latitude');
                    const lonField = document.getElementById('longitude');
                    
                    if (descField) descField.value = draft.description;
                    if (latField && draft.lat) latField.value = draft.lat;
                    if (lonField && draft.lon) lonField.value = draft.lon;
                    
                    this.showSuccessMessage('Draft loaded for editing');
                }
            } catch (error) {
                console.error('Error loading draft:', error);
            }
        }
    }

    // Initialize login page
    initializeLoginPage() {
        console.log('🔐 Initializing login page...');
        
        // Reset login form
        this.views.authView.resetLoginForm();
        
        // Focus on email field
        setTimeout(() => {
            const emailField = document.getElementById('login-email');
            if (emailField) {
                emailField.focus();
            }
        }, 100);
    }

    // Initialize register page
    initializeRegisterPage() {
        console.log('📝 Initializing register page...');
        
        // Reset register form
        this.views.authView.resetRegisterForm();
        
        // Focus on name field
        setTimeout(() => {
            const nameField = document.getElementById('register-name');
            if (nameField) {
                nameField.focus();
            }
        }, 100);
    }

    // Initialize offline page
    initializeOfflinePage() {
        console.log('📱 Initializing offline page...');
        
        // Let offline UI manager handle the initialization
        this.utils.offlineUIManager.showOfflinePage();
    }

    // Handle connection changes
    handleConnectionChange(isOnline) {
        if (isOnline) {
            this.showSuccessMessage('Connection restored');
            console.log('🌐 Connection restored');
            
            // Retry loading stories if on home page
            if (this.currentPage === 'home' && this.models.authModel.isAuthenticated()) {
                this.presenters.storyPresenter.loadStories();
            }
        } else {
            this.showGlobalError('Connection lost. App will work in offline mode.');
            console.log('📱 App is now offline');
        }
    }

    // Show global error
    showGlobalError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.left = '50%';
        alertDiv.style.transform = 'translateX(-50%)';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.maxWidth = '90%';
        alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);

        // Announce to screen readers
        this.announceToScreenReader(`Error: ${message}`);
    }

    // Show success message
    showSuccessMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.left = '50%';
        alertDiv.style.transform = 'translateX(-50%)';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.maxWidth = '90%';
        alertDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);

        // Announce to screen readers
        this.announceToScreenReader(`Success: ${message}`);
    }

    // Cleanup resources
    cleanup() {
        try {
            console.log('🧹 Cleaning up resources...');
            
            // Stop camera
            if (this.utils.cameraManager) {
                this.utils.cameraManager.cleanup();
            }
            
            // Cleanup maps
            if (this.utils.mapManager) {
                this.utils.mapManager.cleanup();
            }
            
            // Cleanup offline manager
            if (this.utils.offlineManager) {
                this.utils.offlineManager.cleanup();
            }
            
            // Close IndexedDB connection
            if (this.utils.indexedDBManager) {
                this.utils.indexedDBManager.close();
            }
            
            // Cleanup presenters
            if (this.presenters.storyPresenter && this.presenters.storyPresenter.cleanup) {
                this.presenters.storyPresenter.cleanup();
            }
            
            if (this.presenters.authPresenter && this.presenters.authPresenter.cleanup) {
                this.presenters.authPresenter.cleanup();
            }

            console.log('✅ App cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    // Public methods for external access
    getCurrentPage() {
        return this.currentPage;
    }

    isAuthenticated() {
        return this.models.authModel.isAuthenticated();
    }

    getCurrentUser() {
        return this.models.authModel.getUser();
    }

    // Force refresh stories
    async refreshStories() {
        if (this.models.authModel.isAuthenticated()) {
            await this.presenters.storyPresenter.refreshStories();
        }
    }

    // Get app statistics
    async getAppStats() {
        const pushStatus = this.utils.pushNotificationManager.getSubscriptionStatus();
        const offlineStats = await this.utils.offlineUIManager.getOfflineStats();
        
        return {
            currentPage: this.currentPage,
            isAuthenticated: this.isAuthenticated(),
            currentUser: this.getCurrentUser(),
            storiesCount: this.models.storyModel.getStories().length,
            cameraActive: this.utils.cameraManager.isCameraActive(),
            mapsInitialized: Object.keys(this.utils.mapManager.maps).length,
            pushNotifications: {
                supported: pushStatus.isSupported,
                permission: pushStatus.permission,
                subscribed: pushStatus.isSubscribed
            },
            offline: offlineStats,
            isInitialized: this.isInitialized,
            version: this.appVersion,
            buildInfo: {
                features: ['PWA', 'Push Notifications', 'Offline Support', 'IndexedDB', 'Camera', 'Maps', 'Accessibility'],
                builtAt: new Date().toISOString()
            }
        };
    }

    // Trigger test notification (for development)
    triggerTestNotification() {
        if (this.utils.pushNotificationManager.getSubscriptionStatus().isSubscribed) {
            this.utils.pushNotificationManager.showLocalNotification('Test Notification', {
                body: 'This is a test notification from Dicoding Story App!',
                data: { url: '/#home' }
            });
        } else {
            this.showGlobalError('Please enable notifications first.');
        }
    }

    // Export app data (for backup)
    async exportAppData() {
        try {
            const data = await this.utils.offlineManager.exportOfflineData();
            if (data) {
                const dataStr = JSON.stringify(data, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `dicoding-story-backup-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                this.showSuccessMessage('App data exported successfully');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showGlobalError('Failed to export app data');
        }
    }

    // Import app data (for restore)
    async importAppData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const success = await this.utils.offlineManager.importOfflineData(data);
            if (success) {
                this.showSuccessMessage('App data imported successfully');
                
                // Refresh current page
                this.initializePage(this.currentPage);
            } else {
                this.showGlobalError('Failed to import app data');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showGlobalError('Failed to import app data - invalid file format');
        }
    }

    // Force sync all data
    async forceSyncAll() {
        if (!this.models.authModel.isAuthenticated()) {
            this.showGlobalError('Please login first');
            return;
        }

        try {
            const token = this.models.authModel.getToken();
            const result = await this.utils.offlineManager.manualSync(token);
            
            if (result.success) {
                this.showSuccessMessage('All data synced successfully');
                
                // Refresh stories
                await this.refreshStories();
            } else {
                this.showGlobalError(`Sync failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Force sync error:', error);
            this.showGlobalError('Sync failed. Please try again.');
        }
    }

    // Get PWA installation status
    isPWAInstalled() {
        return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    }

    // Check PWA capabilities
    getPWACapabilities() {
        return {
            isInstalled: this.isPWAInstalled(),
            canInstall: !!window.deferredPrompt,
            serviceWorkerSupported: 'serviceWorker' in navigator,
            pushSupported: 'PushManager' in window,
            notificationSupported: 'Notification' in window,
            indexedDBSupported: 'indexedDB' in window,
            cacheSupported: 'caches' in window,
            geolocationSupported: 'geolocation' in navigator,
            cameraSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        };
    }

    // Performance monitoring
    getPerformanceMetrics() {
        if ('performance' in window) {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            
            return {
                loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
                domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
                firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
                firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
                memoryUsage: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            };
        }
        return null;
    }
}

// Router class for SPA navigation
class Router {
    constructor(app) {
        this.app = app;
        this.routes = new Map();
        this.init();
    }

    init() {
        // Handle hash change
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle initial load
        window.addEventListener('load', () => this.handleRoute());
        
        // Handle popstate for back/forward navigation
        window.addEventListener('popstate', () => this.handleRoute());
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        this.app.navigateTo(hash);
    }

    navigate(route) {
        // Update URL hash
        if (window.location.hash.slice(1) !== route) {
            window.location.hash = route;
        } else {
            // If hash is the same, trigger navigation manually
            this.app.navigateTo(route);
        }
    }

    getCurrentRoute() {
        return window.location.hash.slice(1) || 'home';
    }

    // Register route handlers (for future expansion)
    registerRoute(path, handler) {
        this.routes.set(path, handler);
    }

    // Get route handler (for future expansion)
    getRouteHandler(path) {
        return this.routes.get(path);
    }
}

// Enhanced error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    
    // Show user-friendly error message for critical errors
    if (e.error && e.error.stack && e.error.stack.includes('DicodingStoryApp')) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.maxWidth = '300px';
        alertDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Something went wrong. Please try again.';
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault(); // Prevent default browser error handling
    
    // Show user-friendly message for network errors
    if (e.reason && e.reason.message && e.reason.message.includes('fetch')) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = '<i class="fas fa-wifi"></i> Network error. Please check your connection.';
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log(`⚡ Page load time: ${perfData.loadEventEnd - perfData.loadEventStart}ms`);
                console.log(`⚡ DOM content loaded: ${perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart}ms`);
            }
            
            // First paint metrics
            const paintMetrics = performance.getEntriesByType('paint');
            paintMetrics.forEach(metric => {
                console.log(`🎨 ${metric.name}: ${metric.startTime}ms`);
            });
        }, 0);
    });
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create global app instance
        window.dicodingStoryApp = new DicodingStoryApp();
        
        console.log('🎉 DicodingStoryApp initialized successfully');
        
        // Development helpers
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.devTools = {
                getStats: () => window.app.getAppStats(),
                exportData: () => window.dicodingStoryApp.exportAppData(),
                triggerNotification: () => window.app.triggerTestNotification(),
                clearCache: () => window.app.offlineManager.clearStorage(),
                getCapabilities: () => window.dicodingStoryApp.getPWACapabilities(),
                getPerformance: () => window.dicodingStoryApp.getPerformanceMetrics()
            };
            console.log('🔧 Development tools available: window.devTools');
        }
        
    } catch (error) {
        console.error('💥 Failed to initialize DicodingStoryApp:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #f8d7da;
                color: #721c24;
                padding: 2rem;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                max-width: 400px;
                z-index: 10000;
            ">
                <h2>⚠️ Application Error</h2>
                <p>Failed to initialize the application.</p>
                <p>Please check your browser supports modern web features.</p>
                <button onclick="window.location.reload()" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 1rem;
                ">Reload Page</button>
            </div>
        `;
    }
});

// Global error boundary for the app
class AppErrorBoundary {
    constructor() {
        this.setupErrorHandlers();
    }

    setupErrorHandlers() {
        // Handle JavaScript errors
        window.addEventListener('error', (e) => {
            console.error('Global JavaScript error:', e.error);
            this.handleError(e.error, 'JavaScript Error');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            e.preventDefault(); // Prevent default browser error handling
            this.handleError(e.reason, 'Promise Rejection');
        });
    }

    handleError(error, type) {
        // Don't show error UI for certain expected errors
        const ignoredErrors = [
            'Load failed', // Common network errors
            'NetworkError', // Network issues
            'AbortError', // Cancelled requests
            'The operation was aborted' // Aborted operations
        ];

        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        
        if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
            return; // Ignore these errors
        }

        // Show user-friendly error for critical errors only
        if (this.isCriticalError(error)) {
            this.showErrorToUser(errorMessage, type);
        }
    }

    isCriticalError(error) {
        const errorMessage = error?.message || error?.toString() || '';
        
        // Critical errors that should be shown to user
        const criticalPatterns = [
            'Failed to initialize',
            'Cannot read propert',
            'is not a function',
            'Permission denied',
            'Storage quota exceeded'
        ];

        return criticalPatterns.some(pattern => errorMessage.includes(pattern));
    }

    showErrorToUser(message, type) {
        // Throttle error messages to avoid spam
        if (this.lastErrorTime && Date.now() - this.lastErrorTime < 5000) {
            return;
        }
        this.lastErrorTime = Date.now();

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error error-boundary';
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 350px;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 10px;
            padding: 1rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        alertDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                <i class="fas fa-exclamation-triangle" style="color: #721c24; margin-top: 0.2rem;"></i>
                <div style="flex: 1;">
                    <strong>Something went wrong</strong><br>
                    <small style="opacity: 0.8;">${type}</small>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none; 
                    border: none; 
                    color: #721c24; 
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: 0;
                    line-height: 1;
                ">&times;</button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 8000);
    }
}

// Safe initialization wrapper
function safeInit() {
    try {
        // Initialize error boundary first
        new AppErrorBoundary();
        
        // Then initialize app
        window.dicodingStoryApp = new DicodingStoryApp();
        console.log('🎉 DicodingStoryApp initialized successfully');
        
    } catch (error) {
        console.error('💥 Failed to initialize DicodingStoryApp:', error);
        showFallbackError(error);
    }
}

// Fallback error screen
function showFallbackError(error) {
    const errorDetails = error?.message || 'Unknown initialization error';
    
    document.body.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                border-radius: 15px;
                padding: 2rem;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 90%;
                width: 400px;
            ">
                <div style="color: #e74c3c; font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h2 style="color: #333; margin-bottom: 1rem;">App Initialization Failed</h2>
                <p style="color: #666; margin-bottom: 1.5rem;">
                    The app couldn't start properly. This might be due to:
                </p>
                <ul style="text-align: left; color: #666; margin-bottom: 1.5rem;">
                    <li>Missing files</li>
                    <li>Network connectivity issues</li>
                    <li>Browser compatibility</li>
                </ul>
                <button onclick="window.location.reload()" style="
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 1rem;
                    margin-right: 1rem;
                ">Try Again</button>
                <details style="margin-top: 1rem; text-align: left;">
                    <summary style="cursor: pointer; color: #667eea;">Technical Details</summary>
                    <pre style="
                        background: #f8f9fa;
                        padding: 1rem;
                        border-radius: 5px;
                        font-size: 0.8rem;
                        overflow: auto;
                        margin-top: 0.5rem;
                    ">${errorDetails}</pre>
                </details>
            </div>
        </div>
    `;
}

// Safe Service Worker registration
async function registerServiceWorkerSafely() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ Service Worker registered successfully');
            return registration;
        } catch (error) {
            console.warn('⚠️ Service Worker registration failed:', error);
            // App should still work without SW
            return null;
        }
    }
    return null;
}

// Initialize when DOM is ready with proper error handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
} else {
    // DOM already loaded
    safeInit();
}

// Register service worker independently
registerServiceWorkerSafely();

// Development helpers (only in development)
if (window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('netlify') ||
    window.location.hostname.includes('github.io')) {
    
    window.devTools = {
        getAppInstance: () => window.dicodingStoryApp,
        getStats: () => window.app?.getAppStats(),
        exportData: () => window.dicodingStoryApp?.exportAppData(),
        triggerNotification: () => window.app?.triggerTestNotification(),
        clearCache: () => window.app?.offlineManager?.clearStorage(),
        getCapabilities: () => window.dicodingStoryApp?.getPWACapabilities(),
        getPerformance: () => window.dicodingStoryApp?.getPerformanceMetrics(),
        forceSync: () => window.dicodingStoryApp?.forceSyncAll(),
        checkHealth: () => {
            return {
                app: !!window.dicodingStoryApp,
                initialized: window.dicodingStoryApp?.isInitialized,
                online: navigator.onLine,
                serviceWorker: 'serviceWorker' in navigator,
                indexedDB: 'indexedDB' in window
            };
        }
    };
    
    console.log('🔧 Development tools available: window.devTools');
    console.log('💡 Try: window.devTools.checkHealth()');
}
