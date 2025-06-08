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
            
            // Initialize PWA features - Don't await to prevent blocking
            this.initializePWAFeatures().catch(error => {
                console.warn('PWA features initialization failed:', error);
            });
            
            // Auto-login if user has valid session
            await this.handleAutoLogin();
            
            // Load and inject additional styles
            this.loadAdditionalStyles();
            
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
            this.hideAppLoading();
            this.showGlobalError('Failed to initialize application. Please refresh the page.');
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
            loading.style.transition = 'opacity 0.3s ease';
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
        
        try {
            // Core utilities
            this.utils.apiService = new ApiService();
            this.utils.mapManager = new MapManager();
            this.utils.cameraManager = new CameraManager();
            this.utils.pushNotificationManager = new PushNotificationManager();
            
            // Initialize IndexedDB with try-catch
            try {
                this.utils.indexedDBManager = new IndexedDBManager();
                await this.utils.indexedDBManager.init();
                
                // Initialize Offline Manager
                this.utils.offlineManager = new OfflineManager(
                    this.utils.indexedDBManager,
                    this.utils.apiService
                );
                
                // Initialize Offline UI Manager
                this.utils.offlineUIManager = new OfflineUIManager(this.utils.offlineManager);
            } catch (dbError) {
                console.warn('IndexedDB initialization failed, offline features disabled:', dbError);
            }
            
            console.log('✅ Utilities initialized');
        } catch (error) {
            console.error('Error initializing utilities:', error);
            throw error;
        }
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
        if (this.utils.offlineManager) {
            this.presenters.storyPresenter.setOfflineManager(this.utils.offlineManager);
        }

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
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }

        // Initialize push notifications
        if (this.utils.pushNotificationManager) {
            await this.utils.pushNotificationManager.initialize();
        }

        // Setup PWA UI elements
        this.setupPWAUI();
        
        console.log('✅ PWA features initialized');
    }

    // Setup PWA UI elements
    setupPWAUI() {
        // Setup PWA install button
        this.setupPWAInstallButton();
        
        // Setup notification button
        this.setupPushNotificationUI();
        
        // Setup offline page navigation if available
        if (this.utils.offlineUIManager) {
            this.utils.offlineUIManager.updateOfflineNavigation();
            this.utils.offlineUIManager.initializeOfflinePage();
        }
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
        }
    }

    // Handle notification toggle
    async handleNotificationToggle() {
        // Simple toggle implementation
        console.log('Notification toggle clicked');
    }

    // Load additional styles dynamically
    loadAdditionalStyles() {
        // Styles are already in HTML, skip this
        console.log('✅ Styles already loaded');
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
                if (this.utils.cameraManager && this.utils.cameraManager.isCameraActive()) {
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
        
        console.log('✅ Global event listeners setup complete');
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
                mainContent.focus();
                mainContent.scrollIntoView();
            });
        }

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
        if (!document.getElementById('aria-live-region')) {
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
                if (this.utils.cameraManager && this.utils.cameraManager.isCameraActive()) {
                    this.utils.cameraManager.stopCamera();
                    this.announceToScreenReader('Camera stopped due to page becoming inactive');
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
            if (this.utils.cameraManager && this.utils.cameraManager.isCameraActive()) {
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
        if (this.presenters.storyPresenter && this.presenters.storyPresenter.onPageChanged) {
            this.presenters.storyPresenter.onPageChanged(route);
        }

        // Handle offline page
        if (route === 'offline' && this.utils.offlineUIManager) {
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
            targetPage.classList.add('active');
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
        
        try {
            // Check if user is authenticated
            if (this.models.authModel.isAuthenticated()) {
                // Load stories
                await this.presenters.storyPresenter.loadStories();
                console.log('Stories loaded successfully');
                
                // Add favorite buttons to story cards after they load
                if (this.utils.offlineUIManager) {
                    setTimeout(() => {
                        this.utils.offlineUIManager.addFavoriteButtons();
                    }, 500);
                }
            } else {
                // Show login prompt for unauthenticated users
                this.views.storyView.showError('Please login to view stories.');
                
                // Try to show cached stories if available
                if (this.utils.offlineManager) {
                    try {
                        const cachedStories = await this.utils.offlineManager.getCachedStories();
                        if (cachedStories.length > 0) {
                            this.models.storyModel.setStories(cachedStories);
                            this.views.storyView.showSuccess(`Showing ${cachedStories.length} cached stories. Login to see latest stories.`);
                        }
                    } catch (error) {
                        console.warn('Failed to load cached stories:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            this.views.storyView.showError('Failed to load stories. Please try again later.');
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
        if (this.utils.mapManager && !this.utils.mapManager.getMap('add-story-map')) {
            this.presenters.storyPresenter.initializeAddStoryMap();
        } else if (this.utils.mapManager) {
            // Invalidate size if map already exists
            this.utils.mapManager.invalidateSize('add-story-map');
        }

        // Reset form if needed
        this.views.storyView.resetAddStoryForm();
        
        // Reset camera state
        if (this.utils.cameraManager && this.utils.cameraManager.getCapturedPhoto()) {
            this.utils.cameraManager.clearPhoto();
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
        if (this.utils.offlineUIManager) {
            this.utils.offlineUIManager.showOfflinePage();
        }
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
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault(); // Prevent default browser error handling
});

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create global app instance
        window.dicodingStoryApp = new DicodingStoryApp();
        
        console.log('🎉 DicodingStoryApp initialized successfully');
        
        // Development helpers
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.devTools = {
                getCurrentPage: () => window.dicodingStoryApp.getCurrentPage(),
                refreshStories: () => window.dicodingStoryApp.refreshStories(),
                isAuthenticated: () => window.dicodingStoryApp.isAuthenticated()
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