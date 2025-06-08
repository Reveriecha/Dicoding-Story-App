console.log('Loading indexeddb-manager.js');
export class IndexedDBManager {
    constructor() {
        this.dbName = 'DicodingStoryDB';
        this.dbVersion = 1;
        this.db = null;
        this.stores = {
            stories: 'stories',
            favorites: 'favorites',
            drafts: 'drafts',
            cache: 'cache'
        };
    }

    // Initialize IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB is not supported'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
        });
    }

    // Create object stores
    createStores(db) {
        try {
            // Stories store
            if (!db.objectStoreNames.contains(this.stores.stories)) {
                const storyStore = db.createObjectStore(this.stores.stories, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                storyStore.createIndex('createdAt', 'createdAt', { unique: false });
                storyStore.createIndex('name', 'name', { unique: false });
                storyStore.createIndex('hasLocation', 'hasLocation', { unique: false });
            }

            // Favorites store
            if (!db.objectStoreNames.contains(this.stores.favorites)) {
                const favStore = db.createObjectStore(this.stores.favorites, {
                    keyPath: 'storyId'
                });
                favStore.createIndex('addedAt', 'addedAt', { unique: false });
            }

            // Drafts store (for offline story creation)
            if (!db.objectStoreNames.contains(this.stores.drafts)) {
                const draftStore = db.createObjectStore(this.stores.drafts, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                draftStore.createIndex('createdAt', 'createdAt', { unique: false });
                draftStore.createIndex('status', 'status', { unique: false });
            }

            // Cache store (for API responses)
            if (!db.objectStoreNames.contains(this.stores.cache)) {
                const cacheStore = db.createObjectStore(this.stores.cache, {
                    keyPath: 'key'
                });
                cacheStore.createIndex('expiry', 'expiry', { unique: false });
            }

            console.log('IndexedDB stores created successfully');
        } catch (error) {
            console.error('Error creating IndexedDB stores:', error);
        }
    }

    // Generic method to add data
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to add data to ${storeName}`));
            };
        });
    }

    // Generic method to get data by key
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get data from ${storeName}`));
            };
        });
    }

    // Generic method to get all data
    async getAll(storeName, indexName = null, query = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            let store = transaction.objectStore(storeName);
            
            if (indexName) {
                store = store.index(indexName);
            }

            const request = query ? store.getAll(query) : store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get all data from ${storeName}`));
            };
        });
    }

    // Generic method to update data
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to update data in ${storeName}`));
            };
        });
    }

    // Generic method to delete data
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error(`Failed to delete data from ${storeName}`));
            };
        });
    }

    // Clear all data from a store
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error(`Failed to clear ${storeName}`));
            };
        });
    }

    // STORY-SPECIFIC METHODS

    // Save stories to IndexedDB
    async saveStories(stories) {
        try {
            const storiesToSave = stories.map(story => ({
                ...story,
                hasLocation: !!(story.lat && story.lon),
                cachedAt: new Date().toISOString()
            }));

            // Clear existing stories first
            await this.clear(this.stores.stories);

            // Add new stories
            const promises = storiesToSave.map(story => this.add(this.stores.stories, story));
            await Promise.all(promises);

            console.log(`Saved ${stories.length} stories to IndexedDB`);
            return true;
        } catch (error) {
            console.error('Error saving stories to IndexedDB:', error);
            return false;
        }
    }

    // Get cached stories
    async getCachedStories() {
        try {
            const stories = await this.getAll(this.stores.stories);
            return stories || [];
        } catch (error) {
            console.error('Error getting cached stories:', error);
            return [];
        }
    }

    // Save single story
    async saveStory(story) {
        try {
            const storyToSave = {
                ...story,
                hasLocation: !!(story.lat && story.lon),
                cachedAt: new Date().toISOString()
            };

            await this.add(this.stores.stories, storyToSave);
            console.log('Story saved to IndexedDB:', story.id);
            return true;
        } catch (error) {
            console.error('Error saving story to IndexedDB:', error);
            return false;
        }
    }

    // FAVORITES METHODS

    // Add story to favorites
    async addToFavorites(story) {
        try {
            const favorite = {
                storyId: story.id,
                story: story,
                addedAt: new Date().toISOString()
            };

            await this.add(this.stores.favorites, favorite);
            console.log('Story added to favorites:', story.id);
            return true;
        } catch (error) {
            if (error.message.includes('add')) {
                // Already exists, update instead
                return await this.update(this.stores.favorites, {
                    storyId: story.id,
                    story: story,
                    addedAt: new Date().toISOString()
                });
            }
            console.error('Error adding to favorites:', error);
            return false;
        }
    }

    // Remove from favorites
    async removeFromFavorites(storyId) {
        try {
            await this.delete(this.stores.favorites, storyId);
            console.log('Story removed from favorites:', storyId);
            return true;
        } catch (error) {
            console.error('Error removing from favorites:', error);
            return false;
        }
    }

    // Get all favorites
    async getFavorites() {
        try {
            const favorites = await this.getAll(this.stores.favorites);
            return favorites.map(fav => fav.story);
        } catch (error) {
            console.error('Error getting favorites:', error);
            return [];
        }
    }

    // Check if story is favorite
    async isFavorite(storyId) {
        try {
            const favorite = await this.get(this.stores.favorites, storyId);
            return !!favorite;
        } catch (error) {
            return false;
        }
    }

    // DRAFT METHODS (for offline story creation)

    // Save story draft
    async saveDraft(draft) {
        try {
            const draftToSave = {
                ...draft,
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const id = await this.add(this.stores.drafts, draftToSave);
            console.log('Draft saved with ID:', id);
            return id;
        } catch (error) {
            console.error('Error saving draft:', error);
            return null;
        }
    }

    // Update draft
    async updateDraft(draft) {
        try {
            const draftToUpdate = {
                ...draft,
                updatedAt: new Date().toISOString()
            };

            await this.update(this.stores.drafts, draftToUpdate);
            console.log('Draft updated:', draft.id);
            return true;
        } catch (error) {
            console.error('Error updating draft:', error);
            return false;
        }
    }

    // Get all drafts
    async getDrafts() {
        try {
            const drafts = await this.getAll(this.stores.drafts);
            return drafts || [];
        } catch (error) {
            console.error('Error getting drafts:', error);
            return [];
        }
    }

    // Delete draft
    async deleteDraft(draftId) {
        try {
            await this.delete(this.stores.drafts, draftId);
            console.log('Draft deleted:', draftId);
            return true;
        } catch (error) {
            console.error('Error deleting draft:', error);
            return false;
        }
    }

    // Mark draft as uploaded
    async markDraftAsUploaded(draftId) {
        try {
            const draft = await this.get(this.stores.drafts, draftId);
            if (draft) {
                draft.status = 'uploaded';
                draft.uploadedAt = new Date().toISOString();
                await this.update(this.stores.drafts, draft);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error marking draft as uploaded:', error);
            return false;
        }
    }

    // CACHE METHODS

    // Cache API response
    async cacheResponse(key, data, expiryMinutes = 60) {
        try {
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + expiryMinutes);

            const cacheData = {
                key: key,
                data: data,
                expiry: expiry.toISOString(),
                cachedAt: new Date().toISOString()
            };

            await this.update(this.stores.cache, cacheData);
            console.log('Response cached:', key);
            return true;
        } catch (error) {
            console.error('Error caching response:', error);
            return false;
        }
    }

    // Get cached response
    async getCachedResponse(key) {
        try {
            const cached = await this.get(this.stores.cache, key);
            
            if (!cached) {
                return null;
            }

            // Check if expired
            if (new Date() > new Date(cached.expiry)) {
                await this.delete(this.stores.cache, key);
                return null;
            }

            return cached.data;
        } catch (error) {
            console.error('Error getting cached response:', error);
            return null;
        }
    }

    // Clear expired cache entries
    async clearExpiredCache() {
        try {
            const allCache = await this.getAll(this.stores.cache);
            const now = new Date();
            
            const expiredKeys = allCache
                .filter(item => new Date(item.expiry) < now)
                .map(item => item.key);

            const deletePromises = expiredKeys.map(key => this.delete(this.stores.cache, key));
            await Promise.all(deletePromises);

            console.log(`Cleared ${expiredKeys.length} expired cache entries`);
            return expiredKeys.length;
        } catch (error) {
            console.error('Error clearing expired cache:', error);
            return 0;
        }
    }

    // UTILITY METHODS

    // Get database size info
    async getDatabaseInfo() {
        try {
            const info = {
                stories: await this.getAll(this.stores.stories),
                favorites: await this.getAll(this.stores.favorites),
                drafts: await this.getAll(this.stores.drafts),
                cache: await this.getAll(this.stores.cache)
            };

            return {
                storiesCount: info.stories.length,
                favoritesCount: info.favorites.length,
                draftsCount: info.drafts.length,
                cacheCount: info.cache.length,
                totalSize: JSON.stringify(info).length
            };
        } catch (error) {
            console.error('Error getting database info:', error);
            return null;
        }
    }

    // Export data (for backup)
    async exportData() {
        try {
            const data = {
                stories: await this.getAll(this.stores.stories),
                favorites: await this.getAll(this.stores.favorites),
                drafts: await this.getAll(this.stores.drafts),
                exportedAt: new Date().toISOString()
            };

            return data;
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    // Import data (for restore)
    async importData(data) {
        try {
            if (data.stories) {
                await this.clear(this.stores.stories);
                for (const story of data.stories) {
                    await this.add(this.stores.stories, story);
                }
            }

            if (data.favorites) {
                await this.clear(this.stores.favorites);
                for (const favorite of data.favorites) {
                    await this.add(this.stores.favorites, favorite);
                }
            }

            if (data.drafts) {
                await this.clear(this.stores.drafts);
                for (const draft of data.drafts) {
                    await this.add(this.stores.drafts, draft);
                }
            }

            console.log('Data imported successfully');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('IndexedDB connection closed');
        }
    }

    // Delete entire database
    async deleteDatabase() {
        return new Promise((resolve, reject) => {
            this.close();
            
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            
            deleteRequest.onsuccess = () => {
                console.log('Database deleted successfully');
                resolve(true);
            };
            
            deleteRequest.onerror = () => {
                reject(new Error('Failed to delete database'));
            };
        });
    }
}