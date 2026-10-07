import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { cameraManager } from '../services/cameraManager';

export default function CameraPreflightGate({ onVerified, isMandatory = true }) {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('checking'); // 'idle' | 'checking' | 'verified' | 'denied' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const videoRef = useRef(null);

  const setVideoRef = (el) => {
    videoRef.current = el;
    if (el) {
      const activeStream = stream || cameraManager.getStream();
      if (activeStream) {
        cameraManager.bindVideoElement(el, activeStream);
      }
    }
  };

  const requestCamera = async () => {
    setStatus('checking');
    setErrorMessage('');

    try {
      const ms = await cameraManager.acquireStream();
      setStream(ms);
      setStatus('verified');

      if (videoRef.current) {
        cameraManager.bindVideoElement(videoRef.current, ms);
      }
      if (onVerified) onVerified(true, ms);
    } catch (err) {
      console.warn('Camera pre-flight failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMessage('Camera access was blocked. Please click the camera icon in your browser URL address bar and select "Always allow".');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('error');
        setErrorMessage('No physical webcam device was detected. Please plug in or enable your camera.');
      } else {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to initialize camera.');
      }
      if (onVerified) onVerified(false, null);
    }
  };

  useEffect(() => {
    requestCamera();
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      cameraManager.bindVideoElement(videoRef.current, stream);
    }
  }, [stream, status]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 my-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-blue-600" />
          <h4 className="font-bold text-sm text-slate-900">Pre-Flight Webcam Verification</h4>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          status === 'verified'
            ? 'bg-emerald-100 text-emerald-800'
            : status === 'checking'
            ? 'bg-blue-100 text-blue-800 animate-pulse'
            : 'bg-rose-100 text-rose-800'
        }`}>
          {status === 'verified' ? 'CAMERA ACTIVE & VERIFIED' : status === 'checking' ? 'INITIALIZING...' : 'VERIFICATION REQUIRED'}
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Placement regulations require an active camera. If camera access is denied, you will not be permitted to enter the examination.
      </p>

      {/* Video Preview Box */}
      <div className="relative aspect-video max-w-sm mx-auto bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[200px]">
        {/* HTML5 Video element is permanently rendered in DOM */}
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${status === 'verified' ? 'block' : 'hidden'}`}
          style={{ width: '100%', height: '100%', minHeight: '200px', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />

        {status === 'verified' ? (
          <>
            {/* Centering Oval Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-emerald-400/80 rounded-full animate-pulse flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                  Center Face
                </span>
              </div>
            </div>

            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Camera Stream Ready</span>
            </div>

            <button
              type="button"
              onClick={requestCamera}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white px-2 py-0.5 rounded text-[10px] flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </>
        ) : (
          <div className="p-6 text-center text-slate-400 space-y-2">
            {status === 'checking' ? (
              <>
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500" />
                <p className="text-xs font-semibold text-blue-400">Connecting to webcam device...</p>
              </>
            ) : (
              <>
                <CameraOff className="w-8 h-8 mx-auto text-rose-400" />
                <p className="text-xs text-rose-300 font-semibold">{errorMessage || 'Camera access not granted'}</p>
                <button
                  type="button"
                  onClick={requestCamera}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Camera Permission</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {status === 'verified' && (
        <div className="text-center text-xs text-emerald-700 font-semibold flex items-center justify-center space-x-1 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Identity & Camera Check Passed. You may now start the examination.</span>
        </div>
      )}
    </div>
  );
}
