console.log('Loading auth-presenter.js');
export class AuthPresenter {
    constructor(model, view, apiService) {
        this.model = model;
        this.view = view;
        this.apiService = apiService;
        this.pushNotificationManager = null;
        
        this.init();
    }

    init() {
        // Set presenter ke view
        this.view.setPresenter(this);
        
        // Subscribe ke model changes
        this.model.addObserver(this);
        
        // Update UI berdasarkan current auth state
        this.updateUI();
    }

    // Set push notification manager
    setPushNotificationManager(pushNotificationManager) {
        this.pushNotificationManager = pushNotificationManager;
    }

    // Model observer methods
    onUserChanged(data) {
        this.updateUI();
        this.view.showSuccess(`Welcome, ${data.user.name}!`);
        
        // Navigate to home after login
        if (window.app && window.app.router) {
            window.app.router.navigate('home');
        }
        
        // Reload stories setelah login
        if (window.app && window.app.storyPresenter) {
            window.app.storyPresenter.loadStories();
        }

        // Handle push notifications after login
        this.handlePushNotificationsAfterLogin(data.user);
    }

    onUserLoggedOut() {
        this.updateUI();
        this.view.showSuccess('Logged out successfully!');
        
        // Clear stories setelah logout
        if (window.app && window.app.storyPresenter) {
            window.app.storyPresenter.clearStories();
        }
        
        // Navigate to home
        if (window.app && window.app.router) {
            window.app.router.navigate('home');
        }
    }

    // Handle push notifications after login
    async handlePushNotificationsAfterLogin(user) {
        if (!this.pushNotificationManager) return;

        try {
            const status = this.pushNotificationManager.getSubscriptionStatus();
            
            // If notifications are supported but not subscribed, show prompt
            if (status.isSupported && !status.isSubscribed && status.permission !== 'denied') {
                // Show notification prompt after a delay
                setTimeout(async () => {
                    const shouldPrompt = await this.shouldPromptForNotifications();
                    if (shouldPrompt) {
                        this.showNotificationPrompt(user.name);
                    }
                }, 2000);
            } else if (status.isSubscribed) {
                // If already subscribed, send welcome notification
                setTimeout(() => {
                    this.pushNotificationManager.triggerWelcomeNotification(user.name);
                }, 1000);
            }
        } catch (error) {
            console.error('Error handling push notifications after login:', error);
        }
    }

    // Check if we should prompt for notifications
    async shouldPromptForNotifications() {
        // Check if user has dismissed the prompt recently
        const lastPrompt = localStorage.getItem('notification-prompt-dismissed');
        if (lastPrompt) {
            const lastPromptTime = new Date(lastPrompt);
            const now = new Date();
            const daysSinceLastPrompt = (now - lastPromptTime) / (1000 * 60 * 60 * 24);
            
            // Don't prompt again if dismissed within last 7 days
            if (daysSinceLastPrompt < 7) {
                return false;
            }
        }
        
        return true;
    }

    // Show notification permission prompt
    showNotificationPrompt(userName) {
        const promptDiv = document.createElement('div');
        promptDiv.className = 'notification-prompt';
        promptDiv.innerHTML = `
            <div class="prompt-overlay">
                <div class="prompt-content">
                    <div class="prompt-icon">
                        <i class="fas fa-bell" style="color: #667eea; font-size: 2rem;"></i>
                    </div>
                    <h3>Stay Updated!</h3>
                    <p>Hi ${userName}! Would you like to receive notifications when new stories are shared?</p>
                    <div class="prompt-buttons">
                        <button id="prompt-dismiss" class="btn btn-secondary">Maybe Later</button>
                        <button id="prompt-enable" class="btn">Enable Notifications</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-prompt {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            .prompt-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .prompt-content {
                background: white;
                border-radius: 15px;
                padding: 2rem;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                animation: slideUp 0.3s ease;
            }
            .prompt-icon {
                margin-bottom: 1rem;
            }
            .prompt-content h3 {
                margin: 0 0 1rem 0;
                color: #333;
                font-size: 1.5rem;
            }
            .prompt-content p {
                margin: 0 0 2rem 0;
                color: #666;
                line-height: 1.5;
            }
            .prompt-buttons {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
            .prompt-buttons .btn {
                flex: 1;
                max-width: 150px;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(promptDiv);

        // Handle button clicks
        document.getElementById('prompt-enable').addEventListener('click', async () => {
            document.body.removeChild(promptDiv);
            document.head.removeChild(style);
            
            try {
                const granted = await this.pushNotificationManager.requestPermission();
                if (granted) {
                    const subscription = await this.pushNotificationManager.subscribe();
                    if (subscription) {
                        await this.pushNotificationManager.sendSubscriptionToServer(subscription);
                        this.view.showSuccess('Notifications enabled! You\'ll be notified about new stories.');
                        
                        // Send welcome notification
                        setTimeout(() => {
                            this.pushNotificationManager.triggerWelcomeNotification(userName);
                        }, 1000);
                    }
                } else {
                    this.view.showError('Notification permission denied.');
                }
                
                // Update button in header
                if (window.app && window.app.updateNotificationButtonStatus) {
                    window.app.updateNotificationButtonStatus();
                }
            } catch (error) {
                console.error('Error enabling notifications:', error);
                this.view.showError('Failed to enable notifications.');
            }
        });

        document.getElementById('prompt-dismiss').addEventListener('click', () => {
            document.body.removeChild(promptDiv);
            document.head.removeChild(style);
            
            // Store dismissal time
            localStorage.setItem('notification-prompt-dismissed', new Date().toISOString());
        });

        // Handle overlay click
        promptDiv.addEventListener('click', (e) => {
            if (e.target === promptDiv.querySelector('.prompt-overlay')) {
                document.body.removeChild(promptDiv);
                document.head.removeChild(style);
                localStorage.setItem('notification-prompt-dismissed', new Date().toISOString());
            }
        });
    }

    // Handle login
    async handleLogin(email, password) {
        try {
            // Set loading state
            this.view.setFormLoading('login', true);
            
            // Validate input
            const validation = this.model.validateLoginData(email, password);
            if (!validation.isValid) {
                this.view.showFormErrors(validation.errors, 'login');
                this.view.setFormLoading('login', false);
                return;
            }

            // Call API
            const response = await this.apiService.login(email, password);
            
            // Update model
            this.model.setUser(response.loginResult, response.loginResult.token);
            
            // Reset form
            this.view.resetLoginForm();
            
        } catch (error) {
            console.error('Login error:', error);
            this.view.showFormErrors([error.message || 'Login failed. Please try again.'], 'login');
        } finally {
            this.view.setFormLoading('login', false);
        }
    }

    // Handle register
    async handleRegister(name, email, password) {
        try {
            // Set loading state
            this.view.setFormLoading('register', true);
            
            // Validate input
            const validation = this.model.validateRegistrationData(name, email, password);
            if (!validation.isValid) {
                this.view.showFormErrors(validation.errors, 'register');
                this.view.setFormLoading('register', false);
                return;
            }

            // Call API
            await this.apiService.register(name, email, password);
            
            // Show success and redirect to login
            this.view.showSuccess('Registration successful! Please login with your credentials.');
            this.view.resetRegisterForm();
            
            // Navigate to login page
            setTimeout(() => {
                this.view.showLoginPage();
            }, 1500);
            
        } catch (error) {
            console.error('Register error:', error);
            this.view.showFormErrors([error.message || 'Registration failed. Please try again.'], 'register');
        } finally {
            this.view.setFormLoading('register', false);
        }
    }

    // Handle auth action (login/logout)
    handleAuthAction() {
        if (this.model.isAuthenticated()) {
            this.logout();
        } else {
            this.view.showLoginPage();
        }
    }

    // Handle logout
    logout() {
        try {
            // Unsubscribe from push notifications on logout (optional)
            if (this.pushNotificationManager) {
                const status = this.pushNotificationManager.getSubscriptionStatus();
                if (status.isSubscribed) {
                    // Optionally ask user if they want to keep notifications
                    this.handleLogoutNotificationChoice();
                }
            }
            
            this.model.logout();
        } catch (error) {
            console.error('Logout error:', error);
            this.view.showError('Logout failed. Please try again.');
        }
    }

    // Handle notification choice on logout
    handleLogoutNotificationChoice() {
        // For now, we'll keep notifications enabled after logout
        // User can manually disable them using the button in header
        console.log('User logged out but keeping notifications enabled');
    }

    // Update UI berdasarkan auth state
    updateUI() {
        const user = this.model.getUser();
        const isAuthenticated = this.model.isAuthenticated();
        
        this.view.updateAuthLink(isAuthenticated, user ? user.name : '');
        
        // Update notification button if available
        if (window.app && window.dicodingStoryApp && window.dicodingStoryApp.updateNotificationButtonStatus) {
            setTimeout(() => {
                window.dicodingStoryApp.updateNotificationButtonStatus();
            }, 100);
        }
    }

    // Check authentication status
    isAuthenticated() {
        return this.model.isAuthenticated();
    }

    // Get current user
    getCurrentUser() {
        return this.model.getUser();
    }

    // Get current token
    getToken() {
        return this.model.getToken();
    }

    // Refresh token (jika diperlukan)
    async refreshToken() {
        // Implementation untuk refresh token jika API mendukung
        // Saat ini API Dicoding tidak mendukung refresh token
        return false;
    }

    // Validate current session
    async validateSession() {
        try {
            if (!this.model.isAuthenticated()) {
                return false;
            }

            // Coba ambil stories untuk validate token
            if (window.app && window.app.apiService) {
                await window.app.apiService.getStories(this.model.getToken(), 1, 1);
                return true;
            }
            
            return false;
        } catch (error) {
            // Token tidak valid, logout
            console.warn('Session validation failed:', error);
            this.model.logout();
            return false;
        }
    }

    // Auto-login jika ada stored credentials
    async autoLogin() {
        if (this.model.isAuthenticated()) {
            const isValid = await this.validateSession();
            if (isValid) {
                this.updateUI();
                
                // Handle push notifications for auto-login
                const user = this.model.getUser();
                if (user && this.pushNotificationManager) {
                    const status = this.pushNotificationManager.getSubscriptionStatus();
                    if (status.isSubscribed) {
                        console.log('Auto-login successful, notifications are enabled');
                    }
                }
                
                return true;
            }
        }
        return false;
    }

    // Handle form validation errors
    handleValidationErrors(errors, formType) {
        this.view.showFormErrors(errors, formType);
        
        // Highlight specific fields
        errors.forEach(error => {
            if (error.includes('email') || error.includes('Email')) {
                this.view.highlightFieldError('email', formType);
            }
            if (error.includes('password') || error.includes('Password')) {
                this.view.highlightFieldError('password', formType);
            }
            if (error.includes('name') || error.includes('Name')) {
                this.view.highlightFieldError('name', formType);
            }
        });
    }

    // Clear session data
    clearSession() {
        this.model.logout();
    }

    // Get user profile info
    getUserProfile() {
        const user = this.model.getUser();
        if (!user) return null;
        
        const pushStatus = this.pushNotificationManager ? 
            this.pushNotificationManager.getSubscriptionStatus() : 
            { isSupported: false, permission: 'default', isSubscribed: false };
        
        return {
            name: user.name,
            email: user.email || '',
            loginTime: user.loginTime || new Date().toISOString(),
            notifications: {
                supported: pushStatus.isSupported,
                permission: pushStatus.permission,
                subscribed: pushStatus.isSubscribed
            }
        };
    }

    // Enable notifications for logged-in user
    async enableNotifications() {
    if (!this.pushNotificationManager) {
        throw new Error('Push notification manager not available');
    }

    const user = this.model.getUser();
    if (!user) {
        throw new Error('User not logged in');
    }

    const authToken = this.model.getToken();
    if (!authToken) {
        throw new Error('Authentication token not found');
    }

    try {
        // Subscribe with auth token
        const result = await this.pushNotificationManager.subscribeWithAuth(authToken);
        
        if (result.success) {
            this.view.showSuccess('Notifikasi berhasil diaktifkan!');
            
            // Send welcome notification
            setTimeout(() => {
                this.pushNotificationManager.triggerWelcomeNotification(user.name);
            }, 1000);
            
            return true;
        }
    } catch (error) {
        console.error('Error enabling notifications:', error);
        this.view.showError('Gagal mengaktifkan notifikasi: ' + error.message);
        return false;
    }
}

// Disable notifications dengan auth token
async disableNotifications() {
    if (!this.pushNotificationManager) {
        return false;
    }

    const authToken = this.model.getToken();
    if (!authToken) {
        console.warn('No auth token available for unsubscribe');
        // Still try to unsubscribe locally
        return await this.pushNotificationManager.unsubscribe();
    }

    try {
        const result = await this.pushNotificationManager.unsubscribeWithAuth(authToken);
        
        if (result.success) {
            this.view.showSuccess('Notifikasi berhasil dinonaktifkan');
            return true;
        }
    } catch (error) {
        console.error('Error disabling notifications:', error);
        this.view.showError('Gagal menonaktifkan notifikasi: ' + error.message);
        return false;
    }
}

// Handle login success dengan prompt notifikasi
async handleLoginSuccess(response) {
    try {
        // Save user data and token
        this.model.setUser({
            name: response.loginResult.name,
            userId: response.loginResult.userId,
            token: response.loginResult.token,
            loginTime: new Date().toISOString()
        });

        this.view.showSuccess(`Selamat datang, ${response.loginResult.name}!`);
        
        // Navigate to home
        if (window.app && window.app.router) {
            window.app.router.navigate('home');
        }

        // Check notification status and prompt if needed
        if (this.pushNotificationManager) {
            const status = this.pushNotificationManager.getSubscriptionStatus();
            
            if (status.isSupported && status.permission === 'default') {
                // Delay prompt untuk UX yang lebih baik
                setTimeout(() => {
                    this.promptNotificationPermission(response.loginResult.name, response.loginResult.token);
                }, 2000);
            } else if (status.isSupported && status.permission === 'granted' && !status.isSubscribed) {
                // Permission granted but not subscribed, auto-subscribe
                try {
                    await this.pushNotificationManager.subscribeWithAuth(response.loginResult.token);
                } catch (error) {
                    console.error('Auto-subscribe failed:', error);
                }
            }
        }

        // Notify observers
        this.model.notifyObservers('onLoginSuccess');
        
    } catch (error) {
        console.error('Error in handleLoginSuccess:', error);
        this.view.showError('Login berhasil tetapi terjadi kesalahan');
    }
}

// Prompt untuk notification permission dengan UI yang lebih baik
async promptNotificationPermission(userName, authToken) {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'notification-prompt-overlay';
    promptDiv.innerHTML = `
        <div class="notification-prompt-card">
            <div class="prompt-header">
                <i class="fas fa-bell prompt-icon"></i>
                <h3>Aktifkan Notifikasi?</h3>
            </div>
            <p>Hai ${userName}! Dapatkan pemberitahuan real-time saat ada story baru dari pengguna lain.</p>
            <div class="prompt-buttons">
                <button id="prompt-later" class="btn-secondary">Nanti Saja</button>
                <button id="prompt-enable" class="btn-primary">Aktifkan Sekarang</button>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .notification-prompt-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }
        
        .notification-prompt-card {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        }
        
        .prompt-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .prompt-icon {
            font-size: 2.5rem;
            color: #667eea;
        }
        
        .notification-prompt-card h3 {
            margin: 0;
            color: #333;
        }
        
        .notification-prompt-card p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        
        .prompt-buttons {
            display: flex;
            gap: 1rem;
        }
        
        .prompt-buttons button {
            flex: 1;
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-secondary {
            background: #f0f0f0;
            color: #666;
        }
        
        .btn-secondary:hover {
            background: #e0e0e0;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a6cd8;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(promptDiv);

    // Handle button clicks
    document.getElementById('prompt-enable').addEventListener('click', async () => {
        document.body.removeChild(promptDiv);
        document.head.removeChild(style);
        
        try {
            const result = await this.pushNotificationManager.subscribeWithAuth(authToken);
            
            if (result.success) {
                this.view.showSuccess('Notifikasi berhasil diaktifkan!');
                
                // Send welcome notification
                setTimeout(() => {
                    this.pushNotificationManager.triggerWelcomeNotification(userName);
                }, 1000);
            }
            
            // Update notification button status in header
            if (window.app && window.app.updateNotificationButtonStatus) {
                window.app.updateNotificationButtonStatus();
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
            this.view.showError('Gagal mengaktifkan notifikasi');
        }
    });

    document.getElementById('prompt-later').addEventListener('click', () => {
        document.body.removeChild(promptDiv);
        document.head.removeChild(style);
    });
}

// Handle logout dengan cleanup notification
async handleLogout() {
    try {
        // Unsubscribe dari push notifications jika ada
        if (this.pushNotificationManager) {
            const status = this.pushNotificationManager.getSubscriptionStatus();
            if (status.isSubscribed) {
                const authToken = this.model.getToken();
                if (authToken) {
                    await this.pushNotificationManager.unsubscribeWithAuth(authToken);
                }
            }
        }

        // Clear user data
        this.model.logout();
        
        // Navigate to login
        if (window.app && window.app.router) {
            window.app.router.navigate('login');
        }

        this.view.showSuccess('Berhasil logout');
        
        // Notify observers
        this.model.notifyObservers('onLogout');
        
    } catch (error) {
        console.error('Error during logout:', error);
        // Still logout even if unsubscribe fails
        this.model.logout();
        if (window.app && window.app.router) {
            window.app.router.navigate('login');
        }
    }
}
}
