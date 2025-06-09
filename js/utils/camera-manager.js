console.log('Loading camera-manager.js');
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
            stopButton: document.getElementById('stop-camera'),
            fileInput: document.getElementById('photo-file'),
            filePreview: document.getElementById('file-preview'),
            capturedPhotoPreview: document.getElementById('captured-photo-preview'),
            optionFile: document.getElementById('option-file'),
            optionCamera: document.getElementById('option-camera'),
            fileContainer: document.getElementById('file-input-container'),
            cameraContainer: document.getElementById('camera-container')
        };
        
        this.bindEvents();
        this.setupVideoEventListeners();
    }

    bindEvents() {
        // Photo option radio buttons
        if (this.elements.optionFile) {
            this.elements.optionFile.addEventListener('change', () => {
                this.showFileInput();
            });
        }

        if (this.elements.optionCamera) {
            this.elements.optionCamera.addEventListener('change', () => {
                this.showCameraInput();
            });
        }

        // File input
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

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

    // Show file input option
    showFileInput() {
        if (this.elements.fileContainer) {
            this.elements.fileContainer.style.display = 'block';
        }
        if (this.elements.cameraContainer) {
            this.elements.cameraContainer.style.display = 'none';
        }
        // Stop camera if running
        this.stopCamera();
    }

    // Show camera input option
    showCameraInput() {
        if (this.elements.fileContainer) {
            this.elements.fileContainer.style.display = 'none';
        }
        if (this.elements.cameraContainer) {
            this.elements.cameraContainer.style.display = 'block';
        }
    }

    // Handle file selection
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        const validation = this.validateImageFile(file);
        if (!validation.isValid) {
            this.showError(validation.errors.join(', '));
            return;
        }

        // Store the file as captured photo
        this.capturedPhoto = file;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.elements.filePreview) {
                this.elements.filePreview.innerHTML = `<img src="${e.target.result}" alt="Selected photo">`;
            }
            // Update file input label
            const label = document.querySelector('.file-input-label span');
            if (label) {
                label.textContent = file.name;
            }
        };
        reader.readAsDataURL(file);

        this.showSuccess('Photo selected successfully!');
    }

    // Validate image file
    validateImageFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('Please select a file');
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
                        
                        // Show preview
                        const url = URL.createObjectURL(blob);
                        if (this.elements.capturedPhotoPreview) {
                            this.elements.capturedPhotoPreview.innerHTML = `<img src="${url}" alt="Captured photo">`;
                        }
                        
                        // Hide video, show preview
                        if (this.video) {
                            this.video.style.display = 'none';
                        }
                        if (this.elements.capturedPhotoPreview) {
                            this.elements.capturedPhotoPreview.style.display = 'block';
                        }
                        
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
                this.video.style.display = 'block';
            }

            // Clear captured preview if from camera
            if (this.elements.optionCamera && this.elements.optionCamera.checked) {
                if (this.elements.capturedPhotoPreview) {
                    this.elements.capturedPhotoPreview.innerHTML = '';
                    this.elements.capturedPhotoPreview.style.display = 'none';
                }
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
            this.elements.captureButton.innerHTML = '<i class="fas fa-redo"></i> Retake Photo';
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
        
        // Clear previews
        if (this.elements.filePreview) {
            this.elements.filePreview.innerHTML = '';
        }
        if (this.elements.capturedPhotoPreview) {
            this.elements.capturedPhotoPreview.innerHTML = '';
            this.elements.capturedPhotoPreview.style.display = 'none';
        }
        
        // Reset file input
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
        
        // Reset file label
        const label = document.querySelector('.file-input-label span');
        if (label) {
            label.textContent = 'Choose a photo';
        }
        
        // Show video if camera option selected
        if (this.elements.optionCamera && this.elements.optionCamera.checked && this.video) {
            this.video.style.display = 'block';
        }
        
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

    // Cleanup method
    cleanup() {
        this.stopCamera();
        this.clearPhoto();
    }
}