/**
 * Central Camera Manager Service
 * Manages singleton webcam stream across the entire examination lifecycle.
 * Prevents Windows camera device locking, black screen transitions, and stream collisions.
 */

class CameraManager {
  constructor() {
    this.stream = null;
  }

  /**
   * Acquires or reuses the existing live webcam stream.
   * If a stream is already active and healthy, returns it immediately with 0ms latency.
   */
  async acquireStream() {
    // 1. Check if existing stream is alive and healthy
    if (this.stream && this.stream.active) {
      const tracks = this.stream.getVideoTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live' && !tracks[0].muted) {
        console.log('✅ [CameraManager] Reusing active webcam stream (0ms handover). Stream ID:', this.stream.id);
        return this.stream;
      }
    }

    // 2. Clean up any existing broken or muted tracks first
    this.stopStream();

    console.log('[CameraManager] Requesting fresh getUserMedia from browser...');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support webcam video capture. Please use Chrome or Edge.');
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });

    this.stream = newStream;
    window.__examCameraStream = newStream;
    console.log('✅ [CameraManager] Fresh webcam stream acquired successfully. ID:', newStream.id);
    return newStream;
  }

  /**
   * Binds a MediaStream to an HTML5 <video> element reliably.
   * Ensures muted, playsinline, metadata load, and play() execution.
   */
  bindVideoElement(videoEl, stream) {
    if (!videoEl) return;
    const targetStream = stream || this.stream;
    if (!targetStream) return;

    if (videoEl.srcObject !== targetStream) {
      videoEl.srcObject = targetStream;
    }
    videoEl.muted = true;
    videoEl.playsInline = true;

    // Play on metadata load
    videoEl.onloadedmetadata = () => {
      videoEl.play().catch(e => console.warn('[CameraManager] Play on metadata warning:', e));
    };

    // Also attempt direct play in case metadata is already cached
    videoEl.play().catch(e => console.warn('[CameraManager] Direct play warning:', e));
  }

  /**
   * Completely stops all tracks and releases the camera hardware back to the OS.
   */
  stopStream() {
    if (this.stream) {
      console.log('[CameraManager] Releasing camera hardware tracks...');
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.stream = null;
      window.__examCameraStream = null;
    }
  }

  /**
   * Returns current active stream or null.
   */
  getStream() {
    return (this.stream && this.stream.active) ? this.stream : null;
  }
}

export const cameraManager = new CameraManager();
