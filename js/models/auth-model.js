// Auth Model - Mengelola data dan logika bisnis terkait autentikasi
export class AuthModel {
    constructor() {
        this.user = null;
        this.token = null;
        this.observers = [];
        this.loadFromStorage();
    }

    // Observer pattern
    addObserver(observer) {
        this.observers.push(observer);
    }

    removeObserver(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            if (observer[event]) {
                observer[event](data);
            }
        });
    }

    // Getter methods
    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    isAuthenticated() {
        return !!(this.user && this.token);
    }

    // Set user dan token
    setUser(user, token) {
        this.user = user;
        this.token = token;
        this.saveToStorage();
        this.notifyObservers('onUserChanged', { user, token });
    }

    // Logout user
    logout() {
        this.user = null;
        this.token = null;
        this.clearStorage();
        this.notifyObservers('onUserLoggedOut');
    }

    // Validasi data registrasi
    validateRegistrationData(name, email, password) {
        const errors = [];

        if (!name || name.trim().length === 0) {
            errors.push('Name is required');
        }

        if (name && name.length < 2) {
            errors.push('Name must be at least 2 characters');
        }

        if (!email || email.trim().length === 0) {
            errors.push('Email is required');
        }

        if (email && !this.isValidEmail(email)) {
            errors.push('Please enter a valid email address');
        }

        if (!password || password.length === 0) {
            errors.push('Password is required');
        }

        if (password && password.length < 8) {
            errors.push('Password must be at least 8 characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validasi data login
    validateLoginData(email, password) {
        const errors = [];

        if (!email || email.trim().length === 0) {
            errors.push('Email is required');
        }

        if (email && !this.isValidEmail(email)) {
            errors.push('Please enter a valid email address');
        }

        if (!password || password.length === 0) {
            errors.push('Password is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Helper method untuk validasi email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Simpan ke localStorage
    saveToStorage() {
        try {
            if (this.token) {
                localStorage.setItem('dicoding_story_token', this.token);
            }
            if (this.user) {
                localStorage.setItem('dicoding_story_user', JSON.stringify(this.user));
            }
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Load dari localStorage
    loadFromStorage() {
        try {
            const token = localStorage.getItem('dicoding_story_token');
            const userString = localStorage.getItem('dicoding_story_user');
            
            if (token && userString) {
                this.token = token;
                this.user = JSON.parse(userString);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.clearStorage();
        }
    }

    // Clear localStorage
    clearStorage() {
        try {
            localStorage.removeItem('dicoding_story_token');
            localStorage.removeItem('dicoding_story_user');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }

    // Check apakah token masih valid (bisa diperluas dengan JWT decode)
    isTokenValid() {
        if (!this.token) return false;
        
        // Basic check - bisa diperluas dengan JWT validation
        try {
            // Jika menggunakan JWT, bisa decode dan check expiry
            return true;
        } catch (error) {
            return false;
        }
    }
}