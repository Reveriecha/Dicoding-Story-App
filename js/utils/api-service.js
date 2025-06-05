// API Service - Mengelola komunikasi dengan backend API
export class ApiService {
    constructor() {
        this.baseUrl = 'https://story-api.dicoding.dev/v1';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const config = {
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            // Handle network errors
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    // Register new user
    async register(name, email, password) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ 
                name: name.trim(), 
                email: email.trim(), 
                password 
            })
        });
    }

    // Login user
    async login(email, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ 
                email: email.trim(), 
                password 
            })
        });
    }

    // Get stories with pagination and location
    async getStories(token, page = 1, size = 10, location = 1) {
        const endpoint = `/stories?page=${page}&size=${size}&location=${location}`;
        
        return this.request(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    }

    // Get story detail by ID
    async getStoryDetail(token, storyId) {
        return this.request(`/stories/${storyId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    }

    // Add new story (authenticated)
    async addStory(token, formData) {
        const url = `${this.baseUrl}/stories`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type for FormData, browser will set it with boundary
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    // Add story as guest (if API supports it)
    async addStoryGuest(formData) {
        const url = `${this.baseUrl}/stories/guest`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                // Don't set Content-Type for FormData
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    // Validate image file
    validateImageFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('Image file is required');
            return { isValid: false, errors };
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            errors.push('Invalid file type. Please use JPEG, PNG, or WebP format.');
        }

        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            errors.push('File size too large. Maximum size is 5MB.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Prepare FormData for story submission
    prepareStoryFormData(description, photo, lat = null, lon = null) {
        const formData = new FormData();
        
        formData.append('description', description.trim());
        formData.append('photo', photo, 'story.jpg');
        
        if (lat !== null && lon !== null) {
            formData.append('lat', parseFloat(lat));
            formData.append('lon', parseFloat(lon));
        }

        return formData;
    }

    // Handle API errors with user-friendly messages
    handleApiError(error) {
        if (error.message.includes('401')) {
            return 'Authentication failed. Please login again.';
        } else if (error.message.includes('403')) {
            return 'Access denied. You don\'t have permission to perform this action.';
        } else if (error.message.includes('404')) {
            return 'Resource not found.';
        } else if (error.message.includes('422')) {
            return 'Invalid data provided. Please check your input.';
        } else if (error.message.includes('429')) {
            return 'Too many requests. Please try again later.';
        } else if (error.message.includes('500')) {
            return 'Server error. Please try again later.';
        } else if (error.message.includes('Network error')) {
            return 'Network error. Please check your internet connection.';
        } else {
            return error.message || 'Something went wrong. Please try again.';
        }
    }

    // Check API health
    async checkHealth() {
        try {
            // Try to access a public endpoint
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Get API base URL
    getBaseUrl() {
        return this.baseUrl;
    }

    // Set custom headers for all requests
    setDefaultHeaders(headers) {
        this.defaultHeaders = {
            ...this.defaultHeaders,
            ...headers
        };
    }
}