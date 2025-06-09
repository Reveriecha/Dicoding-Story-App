console.log('Loading story-model.js');
export class StoryModel {
    constructor() {
        this.stories = [];
        this.observers = [];
    }

    // Observer pattern untuk notifikasi perubahan data
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

    // Getter untuk stories
    getStories() {
        return this.stories;
    }

    // Setter untuk stories dengan notifikasi
    setStories(stories) {
        this.stories = stories;
        this.notifyObservers('onStoriesChanged', stories);
    }

    // Tambah story baru
    addStory(story) {
        this.stories.unshift(story);
        this.notifyObservers('onStoryAdded', story);
    }

    // Validasi data story
    validateStoryData(description, photo) {
        const errors = [];

        if (!description || description.trim().length === 0) {
            errors.push('Story description is required');
        }

        if (description && description.length > 500) {
            errors.push('Story description must be less than 500 characters');
        }

        if (!photo) {
            errors.push('Photo is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Filter stories berdasarkan kriteria
    filterStories(criteria) {
        return this.stories.filter(story => {
            if (criteria.hasLocation && (!story.lat || !story.lon)) {
                return false;
            }
            if (criteria.author && !story.name.toLowerCase().includes(criteria.author.toLowerCase())) {
                return false;
            }
            if (criteria.dateFrom && new Date(story.createdAt) < new Date(criteria.dateFrom)) {
                return false;
            }
            if (criteria.dateTo && new Date(story.createdAt) > new Date(criteria.dateTo)) {
                return false;
            }
            return true;
        });
    }

    // Get stories dengan lokasi
    getStoriesWithLocation() {
        return this.stories.filter(story => story.lat && story.lon);
    }

    // Get stories tanpa lokasi
    getStoriesWithoutLocation() {
        return this.stories.filter(story => !story.lat || !story.lon);
    }

    // Clear all stories
    clearStories() {
        this.stories = [];
        this.notifyObservers('onStoriesCleared');
    }
}