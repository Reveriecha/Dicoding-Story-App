console.log('Loading offline-manager.js');
export class OfflineManager {
    constructor(indexedDBManager, apiService) {
        this.indexedDBManager = indexedDBManager;
        this.apiService = apiService;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.syncInProgress = false;
        this.lastSyncAttempt = null;
        
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

    // Handle when app goes online - FIXED VERSION
    async handleOnline() {
        console.log('App is now online');
        this.isOnline = true;
        
        // Clear expired cache - with error handling
        if (this.indexedDBManager) {
            try {
                await this.indexedDBManager.clearExpiredCache();
            } catch (error) {
                console.error('Error clearing expired cache:', error);
            }
        }

        // REMOVED: this.syncPendingData() - method doesn't exist
        // Instead use: this.syncPendingStories() if needed
        
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

    // Save story for offline
    async saveStoryOffline(storyData) {
        try {
            if (!this.indexedDBManager) {
                throw new Error('IndexedDB not available');
            }

            const draft = {
                description: storyData.description,
                photoBlob: storyData.photo,
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
            this.lastSyncAttempt = new Date().toISOString();
            
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
                    if (!authToken) {
                        console.log('No auth token, skipping sync for:', draft.id);
                        continue;
                    }

                    const formData = new FormData();
                    formData.append('description', draft.description);
                    
                    if (draft.photoBlob) {
                        formData.append('photo', draft.photoBlob, 'story.jpg');
                    }
                    
                    if (draft.lat && draft.lon) {
                        formData.append('lat', parseFloat(draft.lat));
                        formData.append('lon', parseFloat(draft.lon));
                    }

                    const response = await this.apiService.addStory(authToken, formData);
                    
                    if (response) {
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

    // Cache stories for offline access
    async cacheStories(stories) {
        if (!this.indexedDBManager) {
            return false;
        }

        try {
            await this.indexedDBManager.saveStories(stories);
            await this.indexedDBManager.cacheResponse('stories_list', stories, 60);
            
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
            let stories = await this.indexedDBManager.getCachedResponse('stories_list');
            
            if (!stories) {
                stories = await this.indexedDBManager.getCachedStories();
            }

            return stories || [];
        } catch (error) {
            console.error('Error getting cached stories:', error);
            return [];
        }
    }

    // Add story to favorites
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

    // Remove from favorites
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

    // Get favorites
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

    // Manual sync
    async manualSync(authToken) {
        if (!this.isAppOnline()) {
            return {
                success: false,
                error: 'Cannot sync while offline'
            };
        }

        try {
            this.lastSyncAttempt = new Date().toISOString();
            
            const syncResult = await this.syncPendingStories(authToken);
            
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

    // Get storage info
    async getStorageInfo() {
        if (!this.indexedDBManager) {
            return null;
        }

        try {
            const dbInfo = await this.indexedDBManager.getDatabaseInfo();
            
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

    // Clear storage
    async clearStorage() {
        if (!this.indexedDBManager) {
            return false;
        }

        try {
            await this.indexedDBManager.clear('cache');
            console.log('Storage cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    // Get sync status
    getSyncStatus() {
        return {
            isOnline: this.isAppOnline(),
            syncInProgress: this.syncInProgress,
            queueLength: this.syncQueue.length,
            lastSyncAttempt: this.lastSyncAttempt
        };
    }

    // Initialize offline capabilities
    async initializeOfflineCapabilities() {
        const capabilities = this.getOfflineCapabilities();
        console.log('Offline capabilities:', capabilities);
        
        if (capabilities.persistentStorageSupported) {
            await this.requestPersistentStorage();
        }
        
        return capabilities;
    }

    // Get offline capabilities
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

    // Background sync registration
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

    // Cleanup
    async cleanup() {
        if (!this.indexedDBManager) {
            return;
        }

        try {
            await this.indexedDBManager.clearExpiredCache();
            
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

    // Handle visibility change
    handleVisibilityChange() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.isAppOnline()) {
                const pendingCount = await this.getPendingOperationsCount();
                if (pendingCount > 0) {
                    console.log(`App visible, ${pendingCount} pending operations found`);
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

    // Export offline data
    async exportOfflineData() {
        try {
            const data = await this.indexedDBManager.exportData();
            return data;
        } catch (error) {
            console.error('Error exporting offline data:', error);
            return null;
        }
    }

    // Import offline data
    async importOfflineData(data) {
        try {
            const success = await this.indexedDBManager.importData(data);
            return success;
        } catch (error) {
            console.error('Error importing offline data:', error);
            return false;
        }
    }
}