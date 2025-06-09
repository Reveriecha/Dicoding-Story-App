console.log('Loading auth-view.js');
export class AuthView {
    constructor() {
        this.presenter = null;
        this.elements = {
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            authLink: document.getElementById('auth-link'),
            loginEmail: document.getElementById('login-email'),
            loginPassword: document.getElementById('login-password'),
            registerName: document.getElementById('register-name'),
            registerEmail: document.getElementById('register-email'),
            registerPassword: document.getElementById('register-password')
        };

        this.bindEvents();
    }

    setPresenter(presenter) {
        this.presenter = presenter;
    }

    bindEvents() {
        // Login form submission
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLoginSubmit(e);
            });
        }

        // Register form submission
        if (this.elements.registerForm) {
            this.elements.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegisterSubmit(e);
            });
        }

        // Auth link click (login/logout)
        if (this.elements.authLink) {
            this.elements.authLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAuthLinkClick();
            });
        }

        // Handle register/login page links
        document.addEventListener('click', (e) => {
            if (e.target.getAttribute('href') === '#register') {
                e.preventDefault();
                this.showRegisterPage();
            } else if (e.target.getAttribute('href') === '#login') {
                e.preventDefault();
                this.showLoginPage();
            }
        });
    }

    // Handle login form submission
    async handleLoginSubmit(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        // Clear previous errors
        this.clearFormErrors();

        if (this.presenter) {
            await this.presenter.handleLogin(email, password);
        }
    }

    // Handle register form submission
    async handleRegisterSubmit(e) {
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');

        // Clear previous errors
        this.clearFormErrors();

        if (this.presenter) {
            await this.presenter.handleRegister(name, email, password);
        }
    }

    // Handle auth link click (Login/Logout)
    handleAuthLinkClick() {
        if (this.presenter) {
            this.presenter.handleAuthAction();
        }
    }

    // Update auth link berdasarkan status login
    updateAuthLink(isLoggedIn, userName = '') {
        if (this.elements.authLink) {
            if (isLoggedIn) {
                this.elements.authLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                this.elements.authLink.setAttribute('href', '#logout');
                this.elements.authLink.setAttribute('title', `Logout (${userName})`);
            } else {
                this.elements.authLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                this.elements.authLink.setAttribute('href', '#login');
                this.elements.authLink.setAttribute('title', 'Login to your account');
            }
        }
    }

    // Show login page
    showLoginPage() {
        if (window.app && window.app.router) {
            window.app.router.navigate('login');
        }
    }

    // Show register page
    showRegisterPage() {
        if (window.app && window.app.router) {
            window.app.router.navigate('register');
        }
    }

    // Reset login form
    resetLoginForm() {
        if (this.elements.loginForm) {
            this.elements.loginForm.reset();
        }
        this.clearFormErrors();
    }

    // Reset register form
    resetRegisterForm() {
        if (this.elements.registerForm) {
            this.elements.registerForm.reset();
        }
        this.clearFormErrors();
    }

    // Show form validation errors
    showFormErrors(errors, formType = 'login') {
        this.clearFormErrors();
        
        const errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-error';
        errorContainer.id = `${formType}-errors`;
        
        if (errors.length === 1) {
            errorContainer.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errors[0]}`;
        } else {
            errorContainer.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> Please fix the following errors:
                <ul style="margin: 0.5rem 0 0 1.5rem;">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;
        }

        const form = formType === 'login' ? this.elements.loginForm : this.elements.registerForm;
        if (form) {
            form.insertBefore(errorContainer, form.firstChild);
        }
    }

    // Clear form errors
    clearFormErrors() {
        const errorContainers = document.querySelectorAll('#login-errors, #register-errors');
        errorContainers.forEach(container => container.remove());
    }

    // Show success message
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showAlert(message, 'error');
    }

    // Generic alert method
    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
        
        document.body.insertBefore(alertDiv, document.body.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    // Set loading state for forms
    setFormLoading(formType, isLoading) {
        const form = formType === 'login' ? this.elements.loginForm : this.elements.registerForm;
        const submitButton = form ? form.querySelector('button[type="submit"]') : null;
        
        if (submitButton) {
            if (isLoading) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...';
            } else {
                submitButton.disabled = false;
                submitButton.innerHTML = formType === 'login' ? 'Login' : 'Register';
            }
        }

        // Disable/enable form inputs
        const inputs = form ? form.querySelectorAll('input') : [];
        inputs.forEach(input => {
            input.disabled = isLoading;
        });
    }

    // Get form data
    getLoginData() {
        return {
            email: this.elements.loginEmail ? this.elements.loginEmail.value : '',
            password: this.elements.loginPassword ? this.elements.loginPassword.value : ''
        };
    }

    getRegisterData() {
        return {
            name: this.elements.registerName ? this.elements.registerName.value : '',
            email: this.elements.registerEmail ? this.elements.registerEmail.value : '',
            password: this.elements.registerPassword ? this.elements.registerPassword.value : ''
        };
    }

    // Highlight form field with error
    highlightFieldError(fieldName, formType = 'login') {
        const fieldId = formType === 'login' ? `login-${fieldName}` : `register-${fieldName}`;
        const field = document.getElementById(fieldId);
        
        if (field) {
            field.style.borderColor = '#dc3545';
            field.addEventListener('input', () => {
                field.style.borderColor = '';
            }, { once: true });
        }
    }

    // Clear field highlights
    clearFieldHighlights(formType = 'login') {
        const prefix = formType === 'login' ? 'login-' : 'register-';
        const fields = ['email', 'password', 'name'];
        
        fields.forEach(field => {
            const element = document.getElementById(prefix + field);
            if (element) {
                element.style.borderColor = '';
            }
        });
    }
}