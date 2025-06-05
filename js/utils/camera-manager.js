// Camera Manager - Mengelola fungsi kamera dan capture foto
export class CameraManager {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('camera-preview');
        this.canvas = document.getElementById('photo-canvas');
        this.capturedPhoto = null;
        this.isStreaming = false;
        
        this.elements = {
            startButton: document.getElementById('start-camera'),
            captureButton: document.getElementById('capture-photo'),
            stopButton: document.getElementById('stop-camera')
        };
        
        this.bindEvents();
        this.setupVideoEventListeners();
    }

    bindEvents() {
        // Start camera button
        if (this.elements.startButton) {
            this.elements.startButton.addEventListener('click', () => {
                this.startCamera();
            });
        }

        // Capture photo button
        if (this.elements.captureButton) {
            this.elements.captureButton.addEventListener('click', () => {
                this.capturePhoto();
            });
        }

        // Stop camera button
        if (this.elements.stopButton) {
            this.elements.stopButton.addEventListener('click', () => {
                this.stopCamera();
            });
        }
    }

    setupVideoEventListeners() {
        if (this.video) {
            // Handle video stream started
            this.video.addEventListener('loadedmetadata', () => {
                this.isStreaming = true;
                this.updateButtonStates();
            });

            // Handle video errors
            this.video.addEventListener('error', (e) => {
                console.error('Video error:', e);
                this.handleCameraError('Video playback error occurred');
            });
        }
    }

    // Start camera stream
    async startCamera() {
        try {
            // Check if browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported in this browser');
            }

            // Request camera permission and start stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment' // Use back camera if available
                },
                audio: false
            });

            if (this.video) {
                this.video.srcObject = this.stream;
            }

            this.updateButtonStates();
            this.showSuccess('Camera started successfully!');
            
            return true;
        } catch (error) {
            console.error('Error starting camera:', error);
            this.handleCameraError(this.getCameraErrorMessage(error));
            return false;
        }
    }

    // Capture photo from video stream
    async capturePhoto() {
        if (!this.stream || !this.isStreaming) {
            this.showError('Camera is not active. Please start the camera first.');
            return null;
        }

        if (!this.video || !this.canvas) {
            this.showError('Camera elements not found.');
            return null;
        }

        try {
            const context = this.canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;
            
            // Draw video frame to canvas
            context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Convert canvas to blob
            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    if (blob) {
                        this.capturedPhoto = blob;
                        this.updateCaptureButtonText();
                        this.showSuccess('Photo captured successfully!');
                        resolve(blob);
                    } else {
                        this.showError('Failed to capture photo.');
                        resolve(null);
                    }
                }, 'image/jpeg', 0.8);
            });
        } catch (error) {
            console.error('Error capturing photo:', error);
            this.showError('Failed to capture photo. Please try again.');
            return null;
        }
    }

    // Stop camera stream
    stopCamera() {
        try {
            if (this.stream) {
                // Stop all tracks
                this.stream.getTracks().forEach(track => {
                    track.stop();
                });
                this.stream = null;
            }

            if (this.video) {
                this.video.srcObject = null;
            }

            this.isStreaming = false;
            this.updateButtonStates();
            this.showSuccess('Camera stopped.');
            
        } catch (error) {
            console.error('Error stopping camera:', error);
            this.showError('Error stopping camera.');
        }
    }

    // Update button states based on camera state
    updateButtonStates() {
        if (this.elements.startButton) {
            this.elements.startButton.disabled = this.isStreaming;
        }
        
        if (this.elements.captureButton) {
            this.elements.captureButton.disabled = !this.isStreaming;
        }
        
        if (this.elements.stopButton) {
            this.elements.stopButton.disabled = !this.isStreaming;
        }
    }

    // Update capture button text after capturing
    updateCaptureButtonText() {
        if (this.elements.captureButton) {
            this.elements.captureButton.innerHTML = '<i class="fas fa-check"></i> Photo Captured';
            
            // Reset text after 3 seconds
            setTimeout(() => {
                if (this.elements.captureButton) {
                    this.elements.captureButton.innerHTML = '<i class="fas fa-camera"></i> Capture Photo';
                }
            }, 3000);
        }
    }

    // Get captured photo
    getCapturedPhoto() {
        return this.capturedPhoto;
    }

    // Check if photo is captured
    hasPhoto() {
        return this.capturedPhoto !== null;
    }

    // Clear captured photo
    clearPhoto() {
        this.capturedPhoto = null;
        this.updateCaptureButtonText();
    }

    // Check if camera is active
    isCameraActive() {
        return this.isStreaming && this.stream !== null;
    }

    // Get camera error message
    getCameraErrorMessage(error) {
        if (error.name === 'NotAllowedError') {
            return 'Camera access denied. Please allow camera permission and try again.';
        } else if (error.name === 'NotFoundError') {
            return 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError') {
            return 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            return 'Camera constraints cannot be satisfied.';
        } else if (error.name === 'SecurityError') {
            return 'Camera access blocked for security reasons.';
        } else {
            return error.message || 'Failed to access camera. Please try again.';
        }
    }

    // Handle camera errors
    handleCameraError(message) {
        this.stopCamera();
        this.showError(message);
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

    // Check browser camera support
    static isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // Get available camera devices
    async getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Error getting camera devices:', error);
            return [];
        }
    }

    // Switch camera (front/back)
    async switchCamera() {
        if (!this.isCameraActive()) return false;

        try {
            const devices = await this.getCameraDevices();
            if (devices.length < 2) {
                this.showError('Only one camera available.');
                return false;
            }

            // For now, just restart with different facing mode
            // This is a simplified implementation
            this.stopCamera();
            await new Promise(resolve => setTimeout(resolve, 500));
            return await this.startCamera();
            
        } catch (error) {
            console.error('Error switching camera:', error);
            this.showError('Failed to switch camera.');
            return false;
        }
    }

    // Cleanup method
    cleanup() {
        this.stopCamera();
        this.clearPhoto();
    }
}