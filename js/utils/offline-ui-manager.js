console.log('Loading offline-ui-manager.js');
export class OfflineUIManager {
    constructor(offlineManager) {
        this.offlineManager = offlineManager;
        this.elements = {};
        this.currentView = 'stories';
        
        this.init();
    }

    init() {
        this.createOfflineControls();
        this.bindEvents();
        this.setupConnectionListener();
    }

    // Create offline control elements
    createOfflineControls() {
        // Add offline menu to navigation
        this.addOfflineNavigation();
        
        // Create offline pages
        this.createOfflinePages();
        
        // Add sync status indicator
        this.createSyncStatusIndicator();
    }

    // Add offline navigation to main nav
     addOfflineNavigation() {
        const nav = document.querySelector('nav ul');
        if (!nav) return;

        // Check if offline link already exists
        if (document.getElementById('offline-link')) {
            return; // Already exists, don't add again
        }

        // Add offline menu item
        const offlineMenuItem = document.createElement('li');
        offlineMenuItem.innerHTML = `
            <a href="#offline" class="nav-link" id="offline-link">
                <i class="fas fa-heart"></i> Favorites
            </a>
        `;
        
        // Insert before login/auth link
        const authLink = document.querySelector('#auth-link').parentElement;
        nav.insertBefore(offlineMenuItem, authLink);
    }

    // Create offline pages (favorites, drafts, sync)
    createOfflinePages() {
        const main = document.querySelector('main');
        if (!main) return;

        // Create offline page container
        const offlinePage = document.createElement('section');
        offlinePage.id = 'offline-page';
        offlinePage.className = 'page';
        offlinePage.innerHTML = `
            <div class="offline-header">
                <h2 id="offline-title">Offline Data</h2>
                <div class="offline-tabs">
                    <button class="tab-btn active" data-tab="favorites">
                        <i class="fas fa-heart"></i> Favorites
                    </button>
                    <button class="tab-btn" data-tab="drafts">
                        <i class="fas fa-draft2digital"></i> Drafts
                    </button>
                    <button class="tab-btn" data-tab="sync">
                        <i class="fas fa-sync"></i> Sync
                    </button>
                </div>
            </div>

            <div class="offline-content">
                <!-- Favorites Tab -->
                <div id="favorites-tab" class="tab-content active">
                    <div class="tab-header">
                        <h3>Favorite Stories</h3>
                        <p>Stories you've saved for offline viewing</p>
                    </div>
                    <div id="favorites-container" class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading favorites...
                    </div>
                </div>

                <!-- Drafts Tab -->
                <div id="drafts-tab" class="tab-content">
                    <div class="tab-header">
                        <h3>Draft Stories</h3>
                        <p>Stories saved while offline, waiting to be uploaded</p>
                    </div>
                    <div id="drafts-container" class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading drafts...
                    </div>
                </div>

                <!-- Sync Tab -->
                <div id="sync-tab" class="tab-content">
                    <div class="tab-header">
                        <h3>Sync Status</h3>
                        <p>Manage offline data synchronization</p>
                    </div>
                    <div id="sync-container">
                        <div class="sync-status-card">
                            <div class="status-info">
                                <div class="status-indicator">
                                    <i id="connection-icon" class="fas fa-wifi"></i>
                                    <span id="connection-status">Checking connection...</span>
                                </div>
                                <div class="sync-details">
                                    <div class="detail-item">
                                        <span>Pending uploads:</span>
                                        <span id="pending-count">0</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Last sync:</span>
                                        <span id="last-sync">Never</span>
                                    </div>
                                </div>
                            </div>
                            <div class="sync-actions">
                                <button id="manual-sync-btn" class="btn">
                                    <i class="fas fa-sync"></i> Sync Now
                                </button>
                                <button id="clear-cache-btn" class="btn btn-secondary">
                                    <i class="fas fa-trash"></i> Clear Cache
                                </button>
                            </div>
                        </div>
                        
                        <div class="storage-info-card">
                            <h4>Storage Information</h4>
                            <div id="storage-details">
                                <div class="detail-item">
                                    <span>Cached stories:</span>
                                    <span id="cached-stories-count">0</span>
                                </div>
                                <div class="detail-item">
                                    <span>Favorites:</span>
                                    <span id="favorites-count">0</span>
                                </div>
                                <div class="detail-item">
                                    <span>Drafts:</span>
                                    <span id="drafts-count">0</span>
                                </div>
                                <div class="detail-item">
                                    <span>Storage used:</span>
                                    <span id="storage-usage">Calculating...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        main.appendChild(offlinePage);

        // Add styles for offline UI
        this.addOfflineStyles();
    }

    // Add CSS styles for offline UI
    addOfflineStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .offline-header {
                margin-bottom: 2rem;
            }
            
            .offline-tabs {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
                border-bottom: 2px solid #e1e5e9;
            }
            
            .tab-btn {
                background: none;
                border: none;
                padding: 1rem 1.5rem;
                cursor: pointer;
                border-radius: 10px 10px 0 0;
                font-weight: 500;
                color: #666;
                transition: all 0.3s ease;
            }
            
            .tab-btn:hover {
                background: rgba(102, 126, 234, 0.1);
                color: #667eea;
            }
            
            .tab-btn.active {
                background: #667eea;
                color: white;
            }
            
            .tab-content {
                display: none;
                margin-top: 2rem;
            }
            
            .tab-content.active {
                display: block;
                animation: fadeIn 0.3s ease;
            }
            
            .tab-header {
                margin-bottom: 2rem;
                text-align: center;
            }
            
            .tab-header h3 {
                margin: 0 0 0.5rem 0;
                color: #333;
            }
            
            .tab-header p {
                margin: 0;
                color: #666;
            }
            
            .sync-status-card, .storage-info-card {
                background: white;
                border-radius: 15px;
                padding: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }
            
            .status-info {
                margin-bottom: 2rem;
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }
            
            .status-indicator.online {
                color: #27ae60;
            }
            
            .status-indicator.offline {
                color: #e74c3c;
            }
            
            .sync-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .detail-item span:first-child {
                font-weight: 500;
                color: #666;
            }
            
            .detail-item span:last-child {
                font-weight: 600;
                color: #333;
            }
            
            .sync-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
            
            .favorites-grid, .drafts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 1.5rem;
            }
            
            .favorite-card, .draft-card {
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease;
            }
            
            .favorite-card:hover, .draft-card:hover {
                transform: translateY(-5px);
            }
            
            .draft-card {
                border-left: 4px solid #f39c12;
            }
            
            .card-image {
                width: 100%;
                height: 200px;
                object-fit: cover;
            }
            
            .card-content {
                padding: 1.5rem;
            }
            
            .card-author {
                font-weight: 600;
                color: #667eea;
                margin-bottom: 0.5rem;
            }
            
            .card-description {
                color: #666;
                line-height: 1.5;
                margin-bottom: 1rem;
            }
            
            .card-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.9rem;
                color: #999;
            }
            
            .card-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
            }
            
            .card-actions button {
                flex: 1;
                padding: 0.5rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }
            
            .remove-favorite-btn {
                background: #e74c3c;
                color: white;
            }
            
            .remove-favorite-btn:hover {
                background: #c0392b;
            }
            
            .edit-draft-btn {
                background: #3498db;
                color: white;
            }
            
            .edit-draft-btn:hover {
                background: #2980b9;
            }
            
            .delete-draft-btn {
                background: #e74c3c;
                color: white;
            }
            
            .delete-draft-btn:hover {
                background: #c0392b;
            }
            
            .upload-draft-btn {
                background: #27ae60;
                color: white;
            }
            
            .upload-draft-btn:hover {
                background: #229954;
            }
            
            .empty-state {
                text-align: center;
                padding: 3rem;
                color: #666;
            }
            
            .empty-state i {
                font-size: 3rem;
                margin-bottom: 1rem;
                color: #ccc;
            }
            
            .sync-status-indicator {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #2c3e50;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 25px;
                font-size: 0.9rem;
                z-index: 1000;
                display: none;
                animation: slideIn 0.3s ease;
            }
            
            .sync-status-indicator.show {
                display: block;
            }
            
            .sync-status-indicator.syncing {
                background: #f39c12;
            }
            
            .sync-status-indicator.success {
                background: #27ae60;
            }
            
            .sync-status-indicator.error {
                background: #e74c3c;
            }
            
            @media (max-width: 768px) {
                .sync-details {
                    grid-template-columns: 1fr;
                }
                
                .sync-actions {
                    flex-direction: column;
                }
                
                .favorites-grid, .drafts-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Create sync status indicator
    createSyncStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'sync-status-indicator';
        indicator.className = 'sync-status-indicator';
        document.body.appendChild(indicator);
    }

    // Bind event listeners
    bindEvents() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('#offline-link') || e.target.closest('#offline-link')) {
                e.preventDefault();
                this.showOfflinePage();
            }
        });

        // Sync actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('#manual-sync-btn')) {
                this.handleManualSync();
            } else if (e.target.matches('#clear-cache-btn')) {
                this.handleClearCache();
            }
        });

        // Favorite actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.remove-favorite-btn')) {
                const storyId = e.target.dataset.storyId;
                this.handleRemoveFavorite(storyId);
            }
        });

        // Draft actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.edit-draft-btn')) {
                const draftId = e.target.dataset.draftId;
                this.handleEditDraft(draftId);
            } else if (e.target.matches('.delete-draft-btn')) {
                const draftId = e.target.dataset.draftId;
                this.handleDeleteDraft(draftId);
            } else if (e.target.matches('.upload-draft-btn')) {
                const draftId = e.target.dataset.draftId;
                this.handleUploadDraft(draftId);
            }
        });

        // Add to favorites from story cards
        document.addEventListener('click', (e) => {
            if (e.target.matches('.add-favorite-btn')) {
                const storyData = JSON.parse(e.target.dataset.story);
                this.handleAddFavorite(storyData);
            }
        });
    }

    // Setup connection status listener
    setupConnectionListener() {
        window.addEventListener('connectionChange', (e) => {
            this.updateConnectionStatus(e.detail.isOnline);
        });

        // Initial status
        this.updateConnectionStatus(navigator.onLine);
    }

    // Switch tabs
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab content
        this.loadTabContent(tabName);
    }

    // Show offline page
    showOfflinePage() {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.getElementById('offline-link').classList.add('active');

        // Show page
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById('offline-page').classList.add('active');

        // Load current tab content
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        this.loadTabContent(activeTab);

        // Update URL hash
        window.location.hash = 'offline';
    }

    // Load tab content
    async loadTabContent(tabName) {
        switch (tabName) {
            case 'favorites':
                await this.loadFavorites();
                break;
            case 'drafts':
                await this.loadDrafts();
                break;
            case 'sync':
                await this.loadSyncStatus();
                break;
        }
    }

    // Load favorites
    async loadFavorites() {
        const container = document.getElementById('favorites-container');
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading favorites...</div>';

        try {
            const favorites = await this.offlineManager.getFavorites();
            
            if (favorites.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-heart"></i>
                        <h3>No favorites yet</h3>
                        <p>Stories you favorite will appear here for offline viewing</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `<div class="favorites-grid">${
                favorites.map(story => this.renderFavoriteCard(story)).join('')
            }</div>`;

        } catch (error) {
            console.error('Error loading favorites:', error);
            container.innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load favorites. Please try again.
                </div>
            `;
        }
    }

    // Render favorite card
    renderFavoriteCard(story) {
        return `
            <div class="favorite-card">
                <img src="${story.photoUrl}" alt="${story.description}" class="card-image"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'">
                <div class="card-content">
                    <div class="card-author">
                        <i class="fas fa-user"></i> ${story.name}
                    </div>
                    <div class="card-description">
                        ${story.description}
                    </div>
                    <div class="card-meta">
                        <span><i class="fas fa-calendar"></i> ${new Date(story.createdAt).toLocaleDateString()}</span>
                        ${story.lat && story.lon ? '<span><i class="fas fa-map-marker-alt"></i> Has Location</span>' : ''}
                    </div>
                    <div class="card-actions">
                        <button class="remove-favorite-btn" data-story-id="${story.id}">
                            <i class="fas fa-heart-broken"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Load drafts
    async loadDrafts() {
        const container = document.getElementById('drafts-container');
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading drafts...</div>';

        try {
            const drafts = await this.offlineManager.indexedDBManager.getDrafts();
            
            if (drafts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-draft2digital"></i>
                        <h3>No drafts found</h3>
                        <p>Stories saved while offline will appear here</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `<div class="drafts-grid">${
                drafts.map(draft => this.renderDraftCard(draft)).join('')
            }</div>`;

        } catch (error) {
            console.error('Error loading drafts:', error);
            container.innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load drafts. Please try again.
                </div>
            `;
        }
    }

    // Render draft card
    renderDraftCard(draft) {
        const statusIcon = draft.status === 'pending' ? 'fa-clock' : 'fa-check';
        const statusColor = draft.status === 'pending' ? '#f39c12' : '#27ae60';
        
        return `
            <div class="draft-card">
                <div class="card-content">
                    <div class="card-author">
                        <i class="fas fa-user"></i> Draft Story
                        <span style="float: right; color: ${statusColor};">
                            <i class="fas ${statusIcon}"></i> ${draft.status}
                        </span>
                    </div>
                    <div class="card-description">
                        ${draft.description}
                    </div>
                    <div class="card-meta">
                        <span><i class="fas fa-calendar"></i> ${new Date(draft.createdAt).toLocaleDateString()}</span>
                        ${draft.lat && draft.lon ? '<span><i class="fas fa-map-marker-alt"></i> Has Location</span>' : ''}
                    </div>
                    <div class="card-actions">
                        ${draft.status === 'pending' ? `
                            <button class="edit-draft-btn" data-draft-id="${draft.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="upload-draft-btn" data-draft-id="${draft.id}">
                                <i class="fas fa-upload"></i> Upload
                            </button>
                        ` : ''}
                        <button class="delete-draft-btn" data-draft-id="${draft.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Load sync status
    async loadSyncStatus() {
        try {
            const status = await this.offlineManager.getOfflineStatusSummary();
            
            // Update connection status
            this.updateConnectionStatus(status.isOnline);
            
            // Update pending count
            document.getElementById('pending-count').textContent = status.pendingOperations;
            
            // Update last sync
            const lastSync = status.sync.lastSyncAttempt ? 
                new Date(status.sync.lastSyncAttempt).toLocaleString() : 'Never';
            document.getElementById('last-sync').textContent = lastSync;
            
            // Update storage info
            if (status.storage && status.storage.database) {
                const db = status.storage.database;
                document.getElementById('cached-stories-count').textContent = db.storiesCount || 0;
                document.getElementById('favorites-count').textContent = db.favoritesCount || 0;
                document.getElementById('drafts-count').textContent = db.draftsCount || 0;
                
                if (status.storage.quota) {
                    const usagePercent = ((status.storage.quota.usage / status.storage.quota.quota) * 100).toFixed(1);
                    const usageMB = (status.storage.quota.usage / (1024 * 1024)).toFixed(1);
                    document.getElementById('storage-usage').textContent = `${usageMB} MB (${usagePercent}%)`;
                } else {
                    document.getElementById('storage-usage').textContent = 'Unknown';
                }
            }
            
        } catch (error) {
            console.error('Error loading sync status:', error);
        }
    }

    // Update connection status
    updateConnectionStatus(isOnline) {
        const icon = document.getElementById('connection-icon');
        const status = document.getElementById('connection-status');
        const indicator = document.querySelector('.status-indicator');
        
        if (isOnline) {
            icon.className = 'fas fa-wifi';
            status.textContent = 'Online';
            indicator.className = 'status-indicator online';
        } else {
            icon.className = 'fas fa-wifi-slash';
            status.textContent = 'Offline';
            indicator.className = 'status-indicator offline';
        }
    }

    // Handle manual sync
    async handleManualSync() {
        if (!window.app || !window.app.authPresenter) {
            this.showSyncStatus('Please login first', 'error');
            return;
        }

        const token = window.app.authPresenter.getToken();
        if (!token) {
            this.showSyncStatus('Please login first', 'error');
            return;
        }

        const syncBtn = document.getElementById('manual-sync-btn');
        const originalText = syncBtn.innerHTML;
        
        try {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            
            this.showSyncStatus('Syncing data...', 'syncing');
            
            const result = await this.offlineManager.manualSync(token);
            
            if (result.success) {
                this.showSyncStatus('Sync completed successfully', 'success');
                // Reload current tab
                const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
                this.loadTabContent(activeTab);
            } else {
                this.showSyncStatus(`Sync failed: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Manual sync error:', error);
            this.showSyncStatus('Sync failed. Please try again.', 'error');
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalText;
        }
    }

    // Handle clear cache
    async handleClearCache() {
        if (!confirm('Are you sure you want to clear the cache? This will remove cached stories but keep your favorites and drafts.')) {
            return;
        }

        try {
            const success = await this.offlineManager.clearStorage();
            
            if (success) {
                this.showSyncStatus('Cache cleared successfully', 'success');
                // Reload sync tab
                await this.loadSyncStatus();
            } else {
                this.showSyncStatus('Failed to clear cache', 'error');
            }
        } catch (error) {
            console.error('Clear cache error:', error);
            this.showSyncStatus('Failed to clear cache', 'error');
        }
    }

    // Handle add favorite
    async handleAddFavorite(story) {
        try {
            const result = await this.offlineManager.addToFavorites(story);
            
            if (result.success) {
                this.showSyncStatus('Added to favorites', 'success');
                
                // Update button if on current page
                const button = document.querySelector(`[data-story='${JSON.stringify(story)}']`);
                if (button) {
                    button.innerHTML = '<i class="fas fa-heart"></i> Favorited';
                    button.disabled = true;
                    button.classList.remove('add-favorite-btn');
                }
            } else {
                this.showSyncStatus('Failed to add favorite', 'error');
            }
        } catch (error) {
            console.error('Add favorite error:', error);
            this.showSyncStatus('Failed to add favorite', 'error');
        }
    }

    // Handle remove favorite
    async handleRemoveFavorite(storyId) {
        if (!confirm('Remove this story from favorites?')) {
            return;
        }

        try {
            // Convert storyId to string to ensure consistency
            const id = String(storyId);
            console.log('Removing favorite with ID:', id);
            
            const result = await this.offlineManager.removeFromFavorites(id);
            
            if (result.success) {
                this.showSyncStatus('Removed from favorites', 'success');
                // Reload favorites
                await this.loadFavorites();
            } else {
                this.showSyncStatus('Failed to remove favorite', 'error');
            }
        } catch (error) {
            console.error('Remove favorite error:', error);
            this.showSyncStatus('Failed to remove favorite', 'error');
        }
    }

    // Handle edit draft
    async handleEditDraft(draftId) {
        try {
            const draft = await this.offlineManager.indexedDBManager.get('drafts', parseInt(draftId));
            
            if (draft) {
                // Navigate to add story page and populate with draft data
                if (window.app && window.app.navigateTo) {
                    window.app.navigateTo('add-story');
                    
                    // Wait a bit for page to load then populate
                    setTimeout(() => {
                        const descField = document.getElementById('story-description');
                        const latField = document.getElementById('latitude');
                        const lonField = document.getElementById('longitude');
                        
                        if (descField) descField.value = draft.description;
                        if (latField && draft.lat) latField.value = draft.lat;
                        if (lonField && draft.lon) lonField.value = draft.lon;
                        
                        // Store draft ID for updating instead of creating new
                        window.currentDraftId = draftId;
                        
                        this.showSyncStatus('Draft loaded for editing', 'success');
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Edit draft error:', error);
            this.showSyncStatus('Failed to load draft', 'error');
        }
    }

    // Handle upload draft
    async handleUploadDraft(draftId) {
        if (!window.app || !window.app.authPresenter) {
            this.showSyncStatus('Please login first', 'error');
            return;
        }

        const token = window.app.authPresenter.getToken();
        if (!token) {
            this.showSyncStatus('Please login first', 'error');
            return;
        }

        try {
            const button = document.querySelector(`[data-draft-id="${draftId}"].upload-draft-btn`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            }

            this.showSyncStatus('Uploading draft...', 'syncing');
            
            const result = await this.offlineManager.syncPendingStories(token);
            
            if (result.success && result.syncedCount > 0) {
                this.showSyncStatus('Draft uploaded successfully', 'success');
                // Reload drafts
                await this.loadDrafts();
            } else {
                this.showSyncStatus('Failed to upload draft', 'error');
                if (button) {
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-upload"></i> Upload';
                }
            }
            
        } catch (error) {
            console.error('Upload draft error:', error);
            this.showSyncStatus('Failed to upload draft', 'error');
        }
    }

    // Handle delete draft
    async handleDeleteDraft(draftId) {
        if (!confirm('Delete this draft? This action cannot be undone.')) {
            return;
        }

        try {
            const success = await this.offlineManager.indexedDBManager.deleteDraft(parseInt(draftId));
            
            if (success) {
                this.showSyncStatus('Draft deleted', 'success');
                // Reload drafts
                await this.loadDrafts();
            } else {
                this.showSyncStatus('Failed to delete draft', 'error');
            }
        } catch (error) {
            console.error('Delete draft error:', error);
            this.showSyncStatus('Failed to delete draft', 'error');
        }
    }

    // Show sync status
    showSyncStatus(message, type = 'info') {
        const indicator = document.getElementById('sync-status-indicator');
        
        indicator.textContent = message;
        indicator.className = `sync-status-indicator show ${type}`;
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }

    // Add favorite button to story cards
    addFavoriteButtons() {
        // This method can be called to add favorite buttons to existing story cards
        const storyCards = document.querySelectorAll('.story-card');
        
        storyCards.forEach(card => {
            if (card.querySelector('.add-favorite-btn')) return; // Already has button
            
            const content = card.querySelector('.story-content');
            if (content) {
                const storyData = this.extractStoryDataFromCard(card);
                
                const favoriteBtn = document.createElement('button');
                favoriteBtn.className = 'btn btn-secondary add-favorite-btn';
                favoriteBtn.dataset.story = JSON.stringify(storyData);
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Add to Favorites';
                favoriteBtn.style.marginTop = '1rem';
                favoriteBtn.style.width = '100%';
                
                content.appendChild(favoriteBtn);
            }
        });
    }

    // Extract story data from card element
    extractStoryDataFromCard(card) {
        const img = card.querySelector('.story-image');
        const author = card.querySelector('.story-author');
        const description = card.querySelector('.story-description');
        const date = card.querySelector('.story-date');
        
        return {
            id: Date.now() + Math.random(), // Fallback ID
            photoUrl: img ? img.src : '',
            name: author ? author.textContent.replace('👤 ', '') : 'Unknown',
            description: description ? description.textContent : '',
            createdAt: date ? date.textContent.replace('📅 ', '') : new Date().toISOString()
        };
    }

    // Update offline page navigation
    updateOfflineNavigation() {
        // Update navigation active state
        const offlineLink = document.getElementById('offline-link');
        if (window.location.hash === '#offline') {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            offlineLink.classList.add('active');
        }
    }

    // Initialize offline page if needed
    initializeOfflinePage() {
        if (window.location.hash === '#offline') {
            this.showOfflinePage();
        }
        
        // Add favorite buttons to existing stories
        setTimeout(() => {
            this.addFavoriteButtons();
        }, 1000);
    }

    // Export favorites (for backup)
    async exportFavorites() {
        try {
            const favorites = await this.offlineManager.getFavorites();
            const dataStr = JSON.stringify(favorites, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `dicoding-story-favorites-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showSyncStatus('Favorites exported successfully', 'success');
        } catch (error) {
            console.error('Export favorites error:', error);
            this.showSyncStatus('Failed to export favorites', 'error');
        }
    }

    // Import favorites (for restore)
    async importFavorites(file) {
        try {
            const text = await file.text();
            const favorites = JSON.parse(text);
            
            if (!Array.isArray(favorites)) {
                throw new Error('Invalid favorites file format');
            }
            
            for (const favorite of favorites) {
                await this.offlineManager.addToFavorites(favorite);
            }
            
            this.showSyncStatus(`Imported ${favorites.length} favorites`, 'success');
            await this.loadFavorites();
        } catch (error) {
            console.error('Import favorites error:', error);
            this.showSyncStatus('Failed to import favorites', 'error');
        }
    }

    // Get offline statistics
    async getOfflineStats() {
        try {
            const summary = await this.offlineManager.getOfflineStatusSummary();
            return {
                isOnline: summary.isOnline,
                favoritesCount: summary.storage?.database?.favoritesCount || 0,
                draftsCount: summary.storage?.database?.draftsCount || 0,
                cachedStoriesCount: summary.storage?.database?.storiesCount || 0,
                pendingOperations: summary.pendingOperations,
                storageUsed: summary.storage?.quota?.usage || 0,
                storageQuota: summary.storage?.quota?.quota || 0
            };
        } catch (error) {
            console.error('Error getting offline stats:', error);
            return null;
        }
    }
}