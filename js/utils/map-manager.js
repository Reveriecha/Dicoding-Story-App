// Map Manager - Mengelola peta digital menggunakan Leaflet
export class MapManager {
    constructor() {
        this.maps = {};
        this.markers = {};
        this.defaultCenter = [-6.2088, 106.8456]; // Jakarta coordinates
        this.defaultZoom = 10;
    }

    // Create new map instance
    createMap(containerId, options = {}) {
        // Check if container exists
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Map container '${containerId}' not found`);
            return null;
        }

        // Check if map already exists
        if (this.maps[containerId]) {
            this.maps[containerId].remove();
            delete this.maps[containerId];
        }

        const defaultOptions = {
            center: this.defaultCenter,
            zoom: this.defaultZoom,
            zoomControl: true,
            attributionControl: true
        };

        const mapOptions = { ...defaultOptions, ...options };

        try {
            // Create map instance
            const map = L.map(containerId, {
                center: mapOptions.center,
                zoom: mapOptions.zoom,
                zoomControl: mapOptions.zoomControl,
                attributionControl: mapOptions.attributionControl
            });

            // Add base layers
            this.addBaseLayers(map);

            // Initialize markers array for this map
            this.markers[containerId] = [];

            // Store map instance
            this.maps[containerId] = map;

            // Add resize event listener
            setTimeout(() => {
                map.invalidateSize();
            }, 100);

            return map;
        } catch (error) {
            console.error('Error creating map:', error);
            return null;
        }
    }

    // Add base tile layers to map
    addBaseLayers(map) {
        // OpenStreetMap layer
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        });

        // Satellite layer
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© <a href="https://www.esri.com/">Esri</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        });

        // Terrain layer
        const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 17
        });

        // Add default layer
        osmLayer.addTo(map);

        // Create layer control
        const baseLayers = {
            "Street Map": osmLayer,
            "Satellite": satelliteLayer,
            "Terrain": terrainLayer
        };

        L.control.layers(baseLayers).addTo(map);
    }

    // Add markers to map from stories data
    addMarkersToMap(mapId, stories) {
        const map = this.maps[mapId];
        if (!map) {
            console.error(`Map '${mapId}' not found`);
            return;
        }

        // Clear existing markers
        this.clearMarkers(mapId);

        const validStories = stories.filter(story => story.lat && story.lon);
        
        if (validStories.length === 0) {
            console.log('No stories with location data to display');
            return;
        }

        // Add markers for each story
        validStories.forEach(story => {
            this.addStoryMarker(mapId, story);
        });

        // Fit map to show all markers
        if (validStories.length > 1) {
            this.fitMapToMarkers(mapId);
        } else if (validStories.length === 1) {
            // Center on single marker
            map.setView([validStories[0].lat, validStories[0].lon], 15);
        }
    }

    // Add single story marker
    addStoryMarker(mapId, story) {
        const map = this.maps[mapId];
        if (!map || !story.lat || !story.lon) return null;

        try {
            // Create custom icon
            const customIcon = L.divIcon({
                className: 'custom-story-marker',
                html: '<i class="fas fa-camera" style="color: #667eea; font-size: 16px;"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });

            // Create marker
            const marker = L.marker([story.lat, story.lon], { icon: customIcon }).addTo(map);

            // Create popup content
            const popupContent = this.createPopupContent(story);
            marker.bindPopup(popupContent, {
                maxWidth: 250,
                className: 'story-popup'
            });

            // Store marker
            if (!this.markers[mapId]) {
                this.markers[mapId] = [];
            }
            this.markers[mapId].push(marker);

            return marker;
        } catch (error) {
            console.error('Error adding story marker:', error);
            return null;
        }
    }

    // Create popup content for story
    createPopupContent(story) {
        const createdDate = new Date(story.createdAt).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="story-popup-content">
                <img src="${story.photoUrl}" alt="${story.description}" 
                     style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxMDAiIHk9IjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">
                    <i class="fas fa-user" style="color: #667eea; margin-right: 5px;"></i>
                    ${story.name}
                </h4>
                <p style="margin: 0 0 8px 0; color: #666; font-size: 13px; line-height: 1.4;">
                    ${story.description.length > 100 ? story.description.substring(0, 100) + '...' : story.description}
                </p>
                <small style="color: #999; font-size: 12px;">
                    <i class="fas fa-calendar" style="margin-right: 5px;"></i>
                    ${createdDate}
                </small>
                <br>
                <small style="color: #999; font-size: 11px;">
                    <i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i>
                    ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}
                </small>
            </div>
        `;
    }

    // Fit map to show all markers
    fitMapToMarkers(mapId) {
        const map = this.maps[mapId];
        const markers = this.markers[mapId];
        
        if (!map || !markers || markers.length === 0) return;

        try {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds(), {
                padding: [20, 20],
                maxZoom: 15
            });
        } catch (error) {
            console.error('Error fitting map to markers:', error);
        }
    }

    // Clear all markers from map
    clearMarkers(mapId) {
        const markers = this.markers[mapId];
        if (markers) {
            markers.forEach(marker => {
                marker.remove();
            });
            this.markers[mapId] = [];
        }
    }

    // Add click event listener to map
    addClickListener(mapId, callback) {
        const map = this.maps[mapId];
        if (map && typeof callback === 'function') {
            map.on('click', callback);
        }
    }

    // Remove click event listener
    removeClickListener(mapId, callback) {
        const map = this.maps[mapId];
        if (map && typeof callback === 'function') {
            map.off('click', callback);
        }
    }

    // Get map instance
    getMap(mapId) {
        return this.maps[mapId] || null;
    }

    // Set map center
    setCenter(mapId, lat, lon, zoom = null) {
        const map = this.maps[mapId];
        if (map) {
            if (zoom !== null) {
                map.setView([lat, lon], zoom);
            } else {
                map.setView([lat, lon]);
            }
        }
    }

    // Add current location marker
    async addCurrentLocationMarker(mapId) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const map = this.maps[mapId];
                    
                    if (map) {
                        const currentLocationIcon = L.divIcon({
                            className: 'current-location-marker',
                            html: '<i class="fas fa-location-arrow" style="color: #007bff; font-size: 20px;"></i>',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        });

                        const marker = L.marker([latitude, longitude], { icon: currentLocationIcon }).addTo(map);
                        marker.bindPopup('Your current location');
                        
                        map.setView([latitude, longitude], 15);
                        resolve({ lat: latitude, lon: longitude, marker });
                    } else {
                        reject(new Error('Map not found'));
                    }
                },
                (error) => {
                    let message = 'Unable to get your location.';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Location access denied by user.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            message = 'Location request timed out.';
                            break;
                    }
                    reject(new Error(message));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 600000 // 10 minutes
                }
            );
        });
    }

    // Remove map instance
    removeMap(mapId) {
        const map = this.maps[mapId];
        if (map) {
            this.clearMarkers(mapId);
            map.remove();
            delete this.maps[mapId];
            delete this.markers[mapId];
        }
    }

    // Invalidate map size (useful after container resize)
    invalidateSize(mapId) {
        const map = this.maps[mapId];
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }

    // Clean up all maps
    cleanup() {
        Object.keys(this.maps).forEach(mapId => {
            this.removeMap(mapId);
        });
    }
}