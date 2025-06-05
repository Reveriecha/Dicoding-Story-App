// Offline Manager - Mengelola fungsi offline dan sync data
export class OfflineManager {
    constructor(indexedDBManager, apiService) {
        this.indexedDBManager = indexedDBManager;
        this.apiService = apiService;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.syncInProgress = false;
        
        this.init();
    }

    init() {
        // Listen to online/offline events
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });

        // Check for pending sync when online
        if (this.isOnline) {
            this.handleOnline();
        }
    }

    // Handle when app goes online
    async handleOnline() {
        console.log('App is now online');
        this.isOnline = true;
        
        // Clear expired cache
        if (this.indexedDBManager) {
            await this.indexedDBManager.clearExpiredCache();
        }

        // Sync pending data
        await this.syncPendingData();
        
        // Notify UI
        this.notifyConnectionChange(true);
    }

    // Handle when app goes offline
    handleOffline() {
        console.log('App is now offline');
        this.isOnline = false;
        
        // Notify UI
        this.notifyConnectionChange(false);
    }

    // Notify UI about connection changes
    notifyConnectionChange(isOnline) {
        const event = new CustomEvent('connectionChange', {
            detail: { isOnline }
        });
        window.dispatchEvent(event);
    }

    // Check if currently online
    isAppOnline() {
        return this.isOnline && navigator.onLine;
    }

    // STORY SYNC METHODS

    // Save story for offline (when user tries to add story while offline)
    async saveStoryOffline(storyData) {
        try {
            if (!this.indexedDBManager) {
                throw new Error('IndexedDB not available');
            }

            const draft = {
                description: storyData.description,
                photoBlob: storyData.photo, // Store as blob for offline
                lat: storyData.lat,
                lon: storyData.lon,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            const draftId = await this.indexedDBManager.saveDraft(draft);
            
            if (draftId) {
                console.log('Story saved offline with ID:', draftId);
                return {
                    success: true,
                    id: draftId,
                    message: 'Story saved offline. It will be uploaded when you\'re back online.'
                };
            } else {
                throw new Error('Failed to save story offline');
            }
        } catch (error) {
            console.error('Error saving story offline:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Sync pending stories when back online
    async syncPendingStories(authToken) {
        if (!this.indexedDBManager || this.syncInProgress) {
            return { success: false, message: 'Sync already in progress or IndexedDB not available' };
        }

        try {
            this.syncInProgress = true;
            const drafts = await this.indexedDBManager.getDrafts();
            const pendingDrafts = drafts.filter(draft => draft.status === 'pending');

            if (pendingDrafts.length === 0) {
                console.log('No pending stories to sync');
                return { success: true, syncedCount: 0 };
            }

            console.log(`Syncing ${pendingDrafts.length} pending stories...`);

            let syncedCount = 0;
            let failedCount = 0;

            for (const draft of pendingDrafts) {
                try {
                    // Prepare FormData
                    const formData = new FormData();
                    formData.append('description', draft.description);
                    
                    if (draft.photoBlob) {
                        formData.append('photo', draft.photoBlob, 'story.jpg');
                    }
                    
                    if (draft.lat && draft.lon) {
                        formData.append('lat', parseFloat(draft.lat));
                        formData.append('lon', parseFloat(draft.lon));
                    }

                    // Upload to server
                    const response = await this.apiService.addStory(authToken, formData);
                    
                    if (response) {
                        // Mark as uploaded
                        await this.indexedDBManager.markDraftAsUploaded(draft.id);
                        syncedCount++;
                        console.log(`Story synced successfully: ${draft.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to sync story ${draft.id}:`, error);
                    failedCount++;
                }
            }

            return {
                success: true,
                syncedCount,
                failedCount,
                message: `Synced ${syncedCount} stories. ${failedCount} failed.`
            };

        } catch (error) {
            console.error('Error syncing pending stories:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.syncInProgress = false;
        }
    }

    // CACHE MANAGEMENT

    // Cache stories for offline access
    async cacheStories(stories) {
        if (!this.indexedDBManager) {
            return false;
        }

        try {
            await this.indexedDBManager.saveStories(stories);
            
            // Also cache the API response
            await this.indexedDBManager.cacheResponse('stories_list', stories, 60); // Cache for 1 hour
            
            console.log(`Cached ${stories.length} stories for offline access`);
            return true;
        } catch (error) {
            console.error('Error caching stories:', error);
            return false;
        }
    }

    // Get cached stories for offline access
    async getCachedStories() {
        if (!this.indexedDBManager) {
            return [];
        }

        try {
            // Try to get from cache first (faster)
            let stories = await this.indexedDBManager.getCachedResponse('stories_list');
            
            // If not in cache, get from stories store
            if (!stories) {
                stories = await this.indexedDBManager.getCachedStories();
            }

            return stories || [];
        } catch (error) {
            console.error('Error getting cached stories:', error);
            return [];
        }
    }

    // FAVORITES MANAGEMENT

    // Add story to favorites (works offline)
    async addToFavorites(story) {
        if (!this.indexedDBManager) {
            return { success: false, error: 'IndexedDB not available' };
        }

        try {
            const success = await this.indexedDBManager.addToFavorites(story);
            
            if (success) {
                return {
                    success: true,
                    message: 'Story added to favorites'
                };
            } else {
                throw new Error('Failed to add to favorites');
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Remove from favorites (works offline)
    async removeFromFavorites(storyId) {
        if (!this.indexedDBManager) {
            return { success: false, error: 'IndexedDB not available' };
        }

        try {
            const success = await this.indexedDBManager.removeFromFavorites(storyId);
            
            if (success) {
                return {
                    success: true,
                    message: 'Story removed from favorites'
                };
            } else {
                throw new Error('Failed to remove from favorites');
            }
        } catch (error) {
            console.error('Error removing from favorites:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get favorites (works offline)
    async getFavorites() {
        if (!this.indexedDBManager) {
            return [];
        }

        try {
            return await this.indexedDBManager.getFavorites();
        } catch (error) {
            console.error('Error getting favorites:', error);
            return [];
        }
    }

    // Check if story is favorite
    async isFavorite(storyId) {
        if (!this.indexedDBManager) {
            return false;
        }

        try {
            return await this.indexedDBManager.isFavorite(storyId);
        } catch (error) {
            console.error('Error checking favorite status:', error);
            return false;
        }
    }

    // SYNC QUEUE MANAGEMENT

    // Add operation to sync queue
    addToSyncQueue(operation) {
        this.syncQueue.push({
            ...operation,
            timestamp: new Date().toISOString()
        });
        
        console.log('Added to sync queue:', operation.type);
        
        // Try to sync immediately if online
        if (this.isAppOnline()) {
            this.processSyncQueue();
        }
    }

    // Process sync queue
    async processSyncQueue() {
        if (this.syncQueue.length === 0 || this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;
        
        try {
            while (this.syncQueue.length > 0) {
                const operation = this.syncQueue.shift();
                
                try {
                    await this.processOperation(operation);
                    console.log('Sync operation completed:', operation.type);
                } catch (error) {
                    console.error('Sync operation failed:', operation.type, error);
                    // Re-add to queue for retry (optional)
                    // this.syncQueue.unshift(operation);
                    break;
                }
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    // Process individual sync operation
    async processOperation(operation) {
        switch (operation.type) {
            case 'upload_story':
                return await this.syncPendingStories(operation.authToken);
            
            case 'refresh_stories':
                // Fetch latest stories and cache them
                if (operation.authToken) {
                    const response = await this.apiService.getStories(operation.authToken, 1, 50, 1);
                    if (response && response.listStory) {
                        await this.cacheStories(response.listStory);
                    }
                }
                break;
                
            default:
                console.warn('Unknown sync operation:', operation.type);
        }
    }

    // SYNC STATUS

    // Get sync status
    getSyncStatus() {
        return {
            isOnline: this.isAppOnline(),
            syncInProgress: this.syncInProgress,
            queueLength: this.syncQueue.length,
            lastSyncAttempt: this.lastSyncAttempt || null
        };
    }

    // Get pending operations count
    async getPendingOperationsCount() {
        if (!this.indexedDBManager) {
            return 0;
        }

        try {
            const drafts = await this.indexedDBManager.getDrafts();
            const pendingDrafts = drafts.filter(draft => draft.status === 'pending');
            return pendingDrafts.length + this.syncQueue.length;
        } catch (error) {
            console.error('Error getting pending operations count:', error);
            return 0;
        }
    }

    // MANUAL SYNC

    // Manual sync (force sync)
    async manualSync(authToken) {
        if (!this.isAppOnline()) {
            return {
                success: false,
                error: 'Cannot sync while offline'
            };
        }

        try {
            this.lastSyncAttempt = new Date().toISOString();
            
            // Sync pending stories
            const syncResult = await this.syncPendingStories(authToken);
            
            // Refresh and cache latest stories
            if (authToken) {
                try {
                    const response = await this.apiService.getStories(authToken, 1, 50, 1);
                    if (response && response.listStory) {
                        await this.cacheStories(response.listStory);
                    }
                } catch (error) {
                    console.warn('Failed to refresh stories during sync:', error);
                }
            }

            // Process sync queue
            await this.processSyncQueue();

            return {
                success: true,
                syncResult,
                message: 'Sync completed successfully'
            };
        } catch (error) {
            console.error('Manual sync failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // STORAGE MANAGEMENT

    // Get storage usage info
    async getStorageInfo() {
        if (!this.indexedDBManager) {
            return null;
        }

        try {
            const dbInfo = await this.indexedDBManager.getDatabaseInfo();
            
            // Get storage quota if available
            let quotaInfo = null;
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                quotaInfo = await navigator.storage.estimate();
            }

            return {
                database: dbInfo,
                quota: quotaInfo,
                isStoragePersistent: await this.isStoragePersistent()
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }

    // Check if storage is persistent
    async isStoragePersistent() {
        if ('storage' in navigator && 'persisted' in navigator.storage) {
            return await navigator.storage.persisted();
        }
        return false;
    }

    // Request persistent storage
    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const granted = await navigator.storage.persist();
                console.log('Persistent storage:', granted ? 'granted' : 'denied');
                return granted;
            } catch (error) {
                console.error('Error requesting persistent storage:', error);
                return false;
            }
        }
        return false;
    }

    // Clear storage (for cleanup)
    async clearStorage() {
        if (!this.indexedDBManager) {
            return false;
        }

        try {
            await this.indexedDBManager.clear('cache');
            await this.indexedDBManager.clear('drafts');
            // Keep stories and favorites for offline access
            
            console.log('Storage cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    // UTILITY METHODS

    // Convert blob to base64 (for storage)
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Convert base64 to blob (for upload)
    base64ToBlob(base64, mimeType = 'image/jpeg') {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Check storage space availability
    async checkStorageSpace(requiredBytes = 5 * 1024 * 1024) { // Default 5MB
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const available = estimate.quota - estimate.usage;
                
                return {
                    hasSpace: available >= requiredBytes,
                    available: available,
                    quota: estimate.quota,
                    usage: estimate.usage,
                    percentage: (estimate.usage / estimate.quota) * 100
                };
            }
            
            // If storage estimate not available, assume we have space
            return { hasSpace: true, available: null };
        } catch (error) {
            console.error('Error checking storage space:', error);
            return { hasSpace: true, available: null };
        }
    }

    // Export offline data (for backup)
    async exportOfflineData() {
        if (!this.indexedDBManager) {
            return null;
        }

        try {
            const data = await this.indexedDBManager.exportData();
            return data;
        } catch (error) {
            console.error('Error exporting offline data:', error);
            return null;
        }
    }

    // Import offline data (for restore)
    async importOfflineData(data) {
        if (!this.indexedDBManager) {
            return false;
        }

        try {
            const success = await this.indexedDBManager.importData(data);
            return success;
        } catch (error) {
            console.error('Error importing offline data:', error);
            return false;
        }
    }

    // Get offline capabilities status
    getOfflineCapabilities() {
        return {
            indexedDBSupported: 'indexedDB' in window,
            serviceWorkerSupported: 'serviceWorker' in navigator,
            cacheAPISupported: 'caches' in window,
            storageEstimateSupported: 'storage' in navigator && 'estimate' in navigator.storage,
            persistentStorageSupported: 'storage' in navigator && 'persist' in navigator.storage,
            backgroundSyncSupported: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
        };
    }

    // Initialize offline capabilities
    async initializeOfflineCapabilities() {
        const capabilities = this.getOfflineCapabilities();
        
        console.log('Offline capabilities:', capabilities);
        
        // Request persistent storage if supported
        if (capabilities.persistentStorageSupported) {
            await this.requestPersistentStorage();
        }
        
        return capabilities;
    }

    // Background sync registration (if supported)
    async registerBackgroundSync(tag = 'background-sync-stories') {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register(tag);
                console.log('Background sync registered:', tag);
                return true;
            } catch (error) {
                console.error('Background sync registration failed:', error);
                return false;
            }
        }
        return false;
    }

    // Cleanup expired data
    async cleanup() {
        if (!this.indexedDBManager) {
            return;
        }

        try {
            // Clear expired cache
            await this.indexedDBManager.clearExpiredCache();
            
            // Remove uploaded drafts older than 7 days
            const drafts = await this.indexedDBManager.getDrafts();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const oldUploadedDrafts = drafts.filter(draft => 
                draft.status === 'uploaded' && 
                new Date(draft.uploadedAt || draft.createdAt) < sevenDaysAgo
            );
            
            for (const draft of oldUploadedDrafts) {
                await this.indexedDBManager.deleteDraft(draft.id);
            }
            
            if (oldUploadedDrafts.length > 0) {
                console.log(`Cleaned up ${oldUploadedDrafts.length} old uploaded drafts`);
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    // Schedule periodic cleanup
    schedulePeriodicCleanup(intervalHours = 24) {
        setInterval(() => {
            this.cleanup();
        }, intervalHours * 60 * 60 * 1000);
        
        console.log(`Scheduled periodic cleanup every ${intervalHours} hours`);
    }

    // Handle visibility change (for sync optimization)
    handleVisibilityChange() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.isAppOnline()) {
                // App became visible and is online, sync if needed
                const pendingCount = await this.getPendingOperationsCount();
                if (pendingCount > 0) {
                    console.log(`App visible, ${pendingCount} pending operations found`);
                    // Trigger sync after a delay to avoid immediate sync on tab switch
                    setTimeout(() => {
                        if (window.app && window.app.authPresenter && window.app.authPresenter.getToken()) {
                            this.manualSync(window.app.authPresenter.getToken());
                        }
                    }, 2000);
                }
            }
        });
    }

    // Get offline status summary
    async getOfflineStatusSummary() {
        const capabilities = this.getOfflineCapabilities();
        const storageInfo = await this.getStorageInfo();
        const syncStatus = this.getSyncStatus();
        const pendingCount = await this.getPendingOperationsCount();
        
        return {
            isOnline: this.isAppOnline(),
            capabilities,
            storage: storageInfo,
            sync: syncStatus,
            pendingOperations: pendingCount,
            lastUpdate: new Date().toISOString()
        };
    }
}