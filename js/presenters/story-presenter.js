// Story Presenter - Mengatur komunikasi antara StoryModel dan StoryView + Offline Support
export class StoryPresenter {
    constructor(model, view, apiService, authModel) {
        this.model = model;
        this.view = view;
        this.apiService = apiService;
        this.authModel = authModel;
        this.cameraManager = null;
        this.mapManager = null;
        this.pushNotificationManager = null;
        this.offlineManager = null;
        
        this.init();
    }

    init() {
        // Set presenter ke view
        this.view.setPresenter(this);
        
        // Subscribe ke model changes
        this.model.addObserver(this);
        
        // Load initial stories
        this.loadStories();
    }

    // Set dependencies
    setCameraManager(cameraManager) {
        this.cameraManager = cameraManager;
    }

    setMapManager(mapManager) {
        this.mapManager = mapManager;
    }

    setPushNotificationManager(pushNotificationManager) {
        this.pushNotificationManager = pushNotificationManager;
    }

    setOfflineManager(offlineManager) {
        this.offlineManager = offlineManager;
    }

    // Model observer methods
    onStoriesChanged(stories) {
        this.view.renderStories(stories);
        
        // Cache stories for offline access
        if (this.offlineManager && stories.length > 0) {
            this.offlineManager.cacheStories(stories);
        }
    }

    onStoryAdded(story) {
        this.view.showSuccess('Story added successfully!');
        this.view.resetAddStoryForm();
        
        // Stop camera after adding story
        if (this.cameraManager) {
            this.cameraManager.stopCamera();
        }
        
        // Send push notification about new story
        this.handleNewStoryNotification(story);
        
        // Clear current draft ID if editing
        if (window.currentDraftId) {
            // Delete the draft since it's now uploaded
            if (this.offlineManager) {
                this.offlineManager.indexedDBManager.deleteDraft(window.currentDraftId);
            }
            window.currentDraftId = null;
        }
        
        // Navigate to home
        if (window.app && window.app.router) {
            window.app.router.navigate('home');
        }
    }

    onStoriesCleared() {
        this.view.renderStories([]);
    }

    // Handle new story notification
    handleNewStoryNotification(story) {
        if (!this.pushNotificationManager) return;

        try {
            const status = this.pushNotificationManager.getSubscriptionStatus();
            
            if (status.isSubscribed) {
                // Get current user to avoid sending notification to self
                const currentUser = this.authModel.getUser();
                
                // Create story data for notification
                const storyData = {
                    id: story.id || Date.now(),
                    name: currentUser ? currentUser.name : 'Anonymous',
                    description: story.description || 'New story shared!'
                };
                
                // Send notification after a brief delay
                setTimeout(() => {
                    this.pushNotificationManager.triggerStoryNotification(storyData);
                }, 1500);
            }
        } catch (error) {
            console.error('Error sending story notification:', error);
        }
    }

    // Load stories dari API atau cache
    async loadStories() {
        try {
            this.view.showLoading();
            
            let stories = [];
            
            // Jika user login, ambil stories dengan token
            if (this.authModel.isAuthenticated()) {
                if (navigator.onLine) {
                    // Online: fetch from API
                    try {
                        const response = await this.apiService.getStories(this.authModel.getToken(), 1, 50, 1);
                        stories = response.listStory || [];
                        
                        // Cache stories for offline access
                        if (this.offlineManager && stories.length > 0) {
                            await this.offlineManager.cacheStories(stories);
                        }
                    } catch (error) {
                        console.error('Error fetching stories from API:', error);
                        
                        // Fallback to cached stories
                        if (this.offlineManager) {
                            stories = await this.offlineManager.getCachedStories();
                            if (stories.length > 0) {
                                this.view.showSuccess(`Loaded ${stories.length} cached stories (offline mode)`);
                            }
                        }
                    }
                } else {
                    // Offline: load from cache
                    if (this.offlineManager) {
                        stories = await this.offlineManager.getCachedStories();
                        if (stories.length > 0) {
                            this.view.showSuccess(`Loaded ${stories.length} cached stories (offline mode)`);
                        } else {
                            this.view.showError('No cached stories available. Please connect to internet.');
                            return;
                        }
                    }
                }
            } else {
                // Jika tidak login, tampilkan pesan atau cached stories untuk demo
                if (this.offlineManager) {
                    stories = await this.offlineManager.getCachedStories();
                    if (stories.length > 0) {
                        this.view.showSuccess(`Showing ${stories.length} cached stories. Login to see latest stories.`);
                    } else {
                        this.view.showError('Please login to view stories.');
                        return;
                    }
                } else {
                    this.view.showError('Please login to view stories.');
                    return;
                }
            }
            
            this.model.setStories(stories);
            
        } catch (error) {
            console.error('Error loading stories:', error);
            this.view.showError('Failed to load stories. Please try again.');
        }
    }

    // Handle add story (dengan offline support)
    async handleAddStory(description, lat, lon) {
        try {
            // Validate data
            const photo = this.cameraManager ? this.cameraManager.getCapturedPhoto() : null;
            const validation = this.model.validateStoryData(description, photo);
            
            if (!validation.isValid) {
                this.view.showErrorMessage(validation.errors.join(', '));
                return;
            }

            // Show loading state
            this.showAddStoryLoading(true);

            // Check if online
            if (!navigator.onLine) {
                // Offline: save as draft
                return await this.handleOfflineStorySubmission(description, photo, lat, lon);
            }

            // Online: prepare form data and submit
            const formData = new FormData();
            formData.append('description', description);
            formData.append('photo', photo, 'story.jpg');
            
            if (lat && lon) {
                formData.append('lat', parseFloat(lat));
                formData.append('lon', parseFloat(lon));
            }

            // Submit story
            let response;
            if (this.authModel.isAuthenticated()) {
                response = await this.apiService.addStory(this.authModel.getToken(), formData);
            } else {
                throw new Error('Authentication required');
            }

            // Create story object for notification
            const newStory = {
                id: response.storyId || Date.now(),
                description: description,
                lat: lat ? parseFloat(lat) : null,
                lon: lon ? parseFloat(lon) : null,
                createdAt: new Date().toISOString()
            };

            // Reload stories
            await this.loadStories();
            
            // Notify success (this will trigger notification)
            this.model.notifyObservers('onStoryAdded', newStory);
            
        } catch (error) {
            console.error('Error adding story:', error);
            
            if (error.message.includes('Network error') || error.message.includes('fetch')) {
                // Network error: save offline
                await this.handleOfflineStorySubmission(description, photo, lat, lon);
            } else {
                this.view.showErrorMessage(error.message || 'Failed to add story. Please try again.');
            }
        } finally {
            this.showAddStoryLoading(false);
        }
    }

    // Handle offline story submission
    async handleOfflineStorySubmission(description, photo, lat, lon) {
        if (!this.offlineManager) {
            this.view.showErrorMessage('Offline storage not available.');
            return;
        }

        try {
            const storyData = {
                description,
                photo,
                lat,
                lon
            };

            const result = await this.offlineManager.saveStoryOffline(storyData);
            
            if (result.success) {
                this.view.showSuccess(result.message);
                this.view.resetAddStoryForm();
                
                // Stop camera
                if (this.cameraManager) {
                    this.cameraManager.stopCamera();
                }
                
                // Navigate to home
                if (window.app && window.app.router) {
                    window.app.router.navigate('home');
                }
            } else {
                this.view.showErrorMessage('Failed to save story offline: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving story offline:', error);
            this.view.showErrorMessage('Failed to save story offline.');
        }
    }

    // Show loading state for add story
    showAddStoryLoading(isLoading) {
        const submitButton = document.querySelector('#add-story-form button[type="submit"]');
        const formInputs = document.querySelectorAll('#add-story-form input, #add-story-form textarea');
        
        if (submitButton) {
            if (isLoading) {
                submitButton.disabled = true;
                if (navigator.onLine) {
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sharing Story...';
                } else {
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Offline...';
                }
            } else {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-share"></i> Share Story';
            }
        }

        formInputs.forEach(input => {
            input.disabled = isLoading;
        });

        // Disable camera controls during upload
        if (this.cameraManager && isLoading) {
            const cameraButtons = document.querySelectorAll('.camera-controls button');
            cameraButtons.forEach(button => {
                button.disabled = true;
            });
        } else if (this.cameraManager && !isLoading) {
            // Re-enable based on camera state
            if (this.cameraManager.isCameraActive()) {
                this.cameraManager.updateButtonStates();
            }
        }
    }

    // Initialize stories map
    initializeStoriesMap(stories) {
        if (!this.mapManager) return;
        
        const map = this.mapManager.createMap('stories-map', {
            center: [-6.2088, 106.8456], // Jakarta
            zoom: 10
        });
        
        this.mapManager.addMarkersToMap('stories-map', stories);
    }

    // Initialize add story map
    initializeAddStoryMap() {
        if (!this.mapManager) return;
        
        const map = this.mapManager.createMap('add-story-map', {
            center: [-6.2088, 106.8456], // Jakarta
            zoom: 13
        });
        
        // Add click event untuk select location
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            this.view.setLocationData(lat, lng);
            
            // Clear existing markers
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });
            
            // Add new marker
            const marker = L.marker([lat, lng]).addTo(map)
                .bindPopup('Selected location')
                .openPopup();
                
            this.view.showSuccess('Location selected successfully!');
        });

        // Add current location button
        this.addCurrentLocationButton(map);
    }

    // Add current location button to map
    addCurrentLocationButton(map) {
        const currentLocationButton = L.control({ position: 'topleft' });
        
        currentLocationButton.onAdd = function () {
            const button = L.DomUtil.create('button', 'current-location-btn');
            button.innerHTML = '<i class="fas fa-location-arrow"></i>';
            button.title = 'Use current location';
            button.style.cssText = `
                background: white;
                border: 2px solid #ccc;
                border-radius: 4px;
                width: 40px;
                height: 40px;
                cursor: pointer;
                font-size: 16px;
                color: #667eea;
            `;
            
            button.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    button.disabled = true;
                    
                    const result = await this.mapManager.addCurrentLocationMarker('add-story-map');
                    this.view.setLocationData(result.lat, result.lon);
                    this.view.showSuccess('Current location selected!');
                } catch (error) {
                    this.view.showErrorMessage('Failed to get current location: ' + error.message);
                } finally {
                    button.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    button.disabled = false;
                }
            }
            bind(this);
            
            return button;
        };
        
        currentLocationButton.addTo(map);
    }

    // Refresh stories
    async refreshStories() {
        await this.loadStories();
    }

    // Filter stories
    filterStories(criteria) {
        const filteredStories = this.model.filterStories(criteria);
        this.view.renderStories(filteredStories);
    }

    // Get stories dengan lokasi
    getStoriesWithLocation() {
        return this.model.getStoriesWithLocation();
    }

    // Get stories tanpa lokasi  
    getStoriesWithoutLocation() {
        return this.model.getStoriesWithoutLocation();
    }

    // Handle page navigation
    onPageChanged(page) {
        // Stop camera jika berpindah dari add-story page
        if (page !== 'add-story' && this.cameraManager) {
            this.cameraManager.stopCamera();
        }
        
        // Initialize maps sesuai halaman
        if (page === 'home') {
            setTimeout(() => {
                const storiesWithLocation = this.model.getStoriesWithLocation();
                if (storiesWithLocation.length > 0) {
                    this.initializeStoriesMap(storiesWithLocation);
                }
            }, 100);
        } else if (page === 'add-story') {
            setTimeout(() => {
                this.initializeAddStoryMap();
            }, 100);
        }
    }

    // Clear stories (for logout)
    clearStories() {
        this.model.clearStories();
    }

    // Get story statistics
    getStoryStats() {
        const stories = this.model.getStories();
        return {
            total: stories.length,
            withLocation: stories.filter(s => s.lat && s.lon).length,
            withoutLocation: stories.filter(s => !s.lat || !s.lon).length,
            todayCount: stories.filter(s => {
                const today = new Date();
                const storyDate = new Date(s.createdAt);
                return storyDate.toDateString() === today.toDateString();
            }).length
        };
    }

    // Search stories
    searchStories(query) {
        const stories = this.model.getStories();
        const filtered = stories.filter(story => 
            story.description.toLowerCase().includes(query.toLowerCase()) ||
            story.name.toLowerCase().includes(query.toLowerCase())
        );
        this.view.renderStories(filtered);
    }

    // Trigger test notification (development feature)
    triggerTestNotification() {
        if (!this.pushNotificationManager) {
            console.warn('Push notification manager not available');
            return;
        }

        const status = this.pushNotificationManager.getSubscriptionStatus();
        if (!status.isSubscribed) {
            this.view.showErrorMessage('Please enable notifications first.');
            return;
        }

        const currentUser = this.authModel.getUser();
        const testStory = {
            id: 'test-' + Date.now(),
            name: currentUser ? currentUser.name : 'Test User',
            description: 'This is a test notification for a new story!'
        };

        this.pushNotificationManager.triggerStoryNotification(testStory);
        this.view.showSuccess('Test notification sent!');
    }

    // Sync pending offline stories
    async syncOfflineStories() {
        if (!this.offlineManager || !this.authModel.isAuthenticated()) {
            return { success: false, message: 'Offline manager not available or user not authenticated' };
        }

        try {
            const token = this.authModel.getToken();
            const result = await this.offlineManager.syncPendingStories(token);
            
            if (result.success && result.syncedCount > 0) {
                // Reload stories after successful sync
                await this.loadStories();
                
                this.view.showSuccess(`Synced ${result.syncedCount} offline stories successfully!`);
            }
            
            return result;
        } catch (error) {
            console.error('Error syncing offline stories:', error);
            return { success: false, error: error.message };
        }
    }

    // Check for pending offline stories
    async checkPendingOfflineStories() {
        if (!this.offlineManager) return 0;

        try {
            return await this.offlineManager.getPendingOperationsCount();
        } catch (error) {
            console.error('Error checking pending stories:', error);
            return 0;
        }
    }

    // Handle connection status change
    async handleConnectionChange(isOnline) {
        if (isOnline && this.authModel.isAuthenticated()) {
            // Check for pending offline stories
            const pendingCount = await this.checkPendingOfflineStories();
            
            if (pendingCount > 0) {
                // Auto-sync after a delay
                setTimeout(async () => {
                    const result = await this.syncOfflineStories();
                    if (result.success) {
                        console.log('Auto-sync completed successfully');
                    }
                }, 3000);
            }
            
            // Refresh stories with latest data
            await this.loadStories();
        }
    }

    // Add story to favorites
    async addToFavorites(story) {
        if (!this.offlineManager) {
            this.view.showErrorMessage('Offline storage not available');
            return;
        }

        try {
            const result = await this.offlineManager.addToFavorites(story);
            
            if (result.success) {
                this.view.showSuccess('Story added to favorites!');
                return true;
            } else {
                this.view.showErrorMessage('Failed to add to favorites');
                return false;
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
            this.view.showErrorMessage('Failed to add to favorites');
            return false;
        }
    }

    // Get offline status
    async getOfflineStatus() {
        if (!this.offlineManager) {
            return { available: false };
        }

        try {
            const summary = await this.offlineManager.getOfflineStatusSummary();
            return {
                available: true,
                isOnline: summary.isOnline,
                pendingOperations: summary.pendingOperations,
                cachedStories: summary.storage?.database?.storiesCount || 0,
                favorites: summary.storage?.database?.favoritesCount || 0,
                drafts: summary.storage?.database?.draftsCount || 0
            };
        } catch (error) {
            console.error('Error getting offline status:', error);
            return { available: false, error: error.message };
        }
    }

    // Force cache current stories
    async forceCacheStories() {
        if (!this.offlineManager) return false;

        try {
            const stories = this.model.getStories();
            if (stories.length > 0) {
                const success = await this.offlineManager.cacheStories(stories);
                if (success) {
                    this.view.showSuccess(`Cached ${stories.length} stories for offline access`);
                }
                return success;
            }
            return false;
        } catch (error) {
            console.error('Error caching stories:', error);
            return false;
        }
    }

    // Handle cleanup
    cleanup() {
        this.model.removeObserver(this);
        
        if (this.cameraManager) {
            this.cameraManager.stopCamera();
        }
        
        // Clear any pending timers or intervals
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
        }
    }
}