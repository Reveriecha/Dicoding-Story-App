console.log('Loading story-view.js');
export class StoryView {
    constructor() {
        this.presenter = null;
        this.elements = {
            storiesContainer: document.getElementById('stories-container'),
            addStoryForm: document.getElementById('add-story-form'),
            storyDescription: document.getElementById('story-description'),
            latitudeInput: document.getElementById('latitude'),
            longitudeInput: document.getElementById('longitude'),
            addStoryPage: document.getElementById('add-story-page'),
            homePage: document.getElementById('home-page')
        };
        
        this.bindEvents();
    }

    setPresenter(presenter) {
        this.presenter = presenter;
    }

    bindEvents() {
        // Add story form submission
        if (this.elements.addStoryForm) {
            this.elements.addStoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddStorySubmit(e);
            });
        }
    }

    // Handle form submission
    async handleAddStorySubmit(e) {
        const formData = new FormData(e.target);
        const description = formData.get('description');
        const lat = this.elements.latitudeInput.value;
        const lon = this.elements.longitudeInput.value;

        if (this.presenter) {
            await this.presenter.handleAddStory(description, lat, lon);
        }
    }

    // Render stories list
    renderStories(stories) {
        if (!this.elements.storiesContainer) return;

        if (stories.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Separate stories dengan dan tanpa lokasi
        const storiesWithLocation = stories.filter(story => story.lat && story.lon);
        const storiesWithoutLocation = stories.filter(story => !story.lat || !story.lon);

        let content = '';

        // Tampilkan map jika ada stories dengan lokasi
        if (storiesWithLocation.length > 0) {
            content += `<div id="stories-map" style="height: 400px; border-radius: 10px; margin-bottom: 2rem;"></div>`;
        }

        // Render semua stories
        content += `<div class="stories-grid">`;
        
        // Render stories dengan lokasi terlebih dahulu
        storiesWithLocation.forEach(story => {
            content += this.renderStoryCard(story, true);
        });

        // Kemudian render stories tanpa lokasi
        storiesWithoutLocation.forEach(story => {
            content += this.renderStoryCard(story, false);
        });

        content += `</div>`;

        this.elements.storiesContainer.innerHTML = content;

        // Initialize map jika ada stories dengan lokasi
        if (storiesWithLocation.length > 0) {
            setTimeout(() => {
                if (this.presenter) {
                    this.presenter.initializeStoriesMap(storiesWithLocation);
                }
            }, 100);
        }
    }

   // Render individual story card
    renderStoryCard(story, hasLocation) {
        const locationInfo = hasLocation ? `
            <div class="story-location">
                <i class="fas fa-map-marker-alt"></i> Location: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}
            </div>
        ` : `
            <div class="story-location">
                <i class="fas fa-map-marker-alt"></i> No location data
            </div>
        `;

        // Handle image URL - add crossorigin and better error handling
        const imageUrl = story.photoUrl || '';
        const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

        return `
            <article class="story-card" data-story-id="${story.id}">
                <img src="${imageUrl}" 
                     alt="${story.description}" 
                     class="story-image" 
                     loading="lazy"
                     crossorigin="anonymous"
                     onerror="this.onerror=null; this.src='${fallbackImage}'; this.style.objectFit='contain';">
                <div class="story-content">
                    <div class="story-author">
                        <i class="fas fa-user"></i> ${story.name}
                    </div>
                    <div class="story-description">${story.description}</div>
                    <div class="story-date">
                        <i class="fas fa-calendar"></i> ${new Date(story.createdAt).toLocaleDateString('id-ID')}
                    </div>
                    ${locationInfo}
                </div>
            </article>
        `;
    }

    // Render empty state
    renderEmptyState() {
        this.elements.storiesContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-camera" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No stories yet</h3>
                <p>Be the first to share your story!</p>
                <a href="#add-story" class="btn">Add Story</a>
            </div>
        `;
    }

    // Show loading state
    showLoading() {
        if (this.elements.storiesContainer) {
            this.elements.storiesContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading stories...
                </div>
            `;
        }
    }

    // Show error state
    showError(message) {
        if (this.elements.storiesContainer) {
            this.elements.storiesContainer.innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </div>
            `;
        }
    }

    // Reset add story form
    resetAddStoryForm() {
        if (this.elements.addStoryForm) {
            this.elements.addStoryForm.reset();
            this.elements.latitudeInput.value = '';
            this.elements.longitudeInput.value = '';
        }
    }

    // Show success message
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    // Show error message
    showErrorMessage(message) {
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

    // Set location data
    setLocationData(lat, lon) {
        if (this.elements.latitudeInput) {
            this.elements.latitudeInput.value = lat;
        }
        if (this.elements.longitudeInput) {
            this.elements.longitudeInput.value = lon;
        }
    }

    // Get form data
    getFormData() {
        return {
            description: this.elements.storyDescription ? this.elements.storyDescription.value : '',
            latitude: this.elements.latitudeInput ? this.elements.latitudeInput.value : '',
            longitude: this.elements.longitudeInput ? this.elements.longitudeInput.value : ''
        };
    }

    // Focus on main content (untuk skip-to-content)
    focusMainContent() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView();
        }
    }
}
