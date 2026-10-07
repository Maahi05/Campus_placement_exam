import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, ShieldAlert, CheckCircle, AlertTriangle, EyeOff, RefreshCw, Smartphone, Eye } from 'lucide-react';
import { initAIProctorModels, analyzeFrame } from '../services/aiProctorService';
import { cameraManager } from '../services/cameraManager';

export default function WebcamFeed({
  candidateName,
  candidateId,
  sessionToken,
  proctoringEnabled,
  onCameraDisconnect,
  onCameraRestored,
  reconnectTrigger,
  onViolation
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);

  // AI Model States
  const [aiReady, setAiReady] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);

  // Detection States
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [phoneScore, setPhoneScore] = useState(0);
  const [headDirection, setHeadDirection] = useState('center');
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [faceCount, setFaceCount] = useState(1);
  const [aiWarning, setAiWarning] = useState(null);

  // Counters to prevent momentary false-positives
  const phoneCounterRef = useRef(0);
  const lookingAwayCounterRef = useRef(0);
  const faceMissingCounterRef = useRef(0);
  const multipleFacesCounterRef = useRef(0);
  const lastViolationTimeRef = useRef({});

  // Callback ref that binds the stream as soon as <video> is attached to the DOM
  const attachVideo = (el) => {
    videoRef.current = el;
    if (el) {
      const activeStream = streamRef.current || cameraManager.getStream();
      if (activeStream) {
        cameraManager.bindVideoElement(el, activeStream);
      }
    }
  };

  // 1. Initialize Camera with Central Camera Manager
  const initCamera = async () => {
    try {
      const ms = await cameraManager.acquireStream();
      streamRef.current = ms;
      setMediaStream(ms);

      ms.getVideoTracks().forEach(track => {
        track.onended = () => {
          console.warn('[WebcamFeed] Camera track ended!');
          setStreamActive(false);
          if (onCameraDisconnect) onCameraDisconnect();
        };
      });

      if (videoRef.current) {
        cameraManager.bindVideoElement(videoRef.current, ms);
      }

      setStreamActive(true);
      setHasPermission(true);
      if (onCameraRestored) onCameraRestored();
      console.log('✅ [WebcamFeed] Camera bound successfully to exam room.');
    } catch (err) {
      console.error('[WebcamFeed] Camera acquisition error:', err.message);
      setHasPermission(false);
      setStreamActive(false);
      if (onCameraDisconnect) onCameraDisconnect();
    }
  };

  useEffect(() => {
    if (!proctoringEnabled) return;
    initCamera();

    return () => {
      // Stream is preserved by CameraManager until test completion
    };
  }, [proctoringEnabled, reconnectTrigger]);

  // 2. Initialize AI Proctoring Models (Instant Smart Vision + background COCO-SSD)
  useEffect(() => {
    if (!proctoringEnabled) return;
    let isMounted = true;

    async function loadModels() {
      await initAIProctorModels();
      if (isMounted) {
        setAiReady(true);
        setAiLoading(false);
      }
    }

    loadModels();
    return () => { isMounted = false; };
  }, [proctoringEnabled]);

  // Helper to send snapshot evidence to backend
  const captureAndUploadSnapshot = (eventType) => {
    if (!videoRef.current || !canvasRef.current || !candidateId || !sessionToken) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapBase64 = canvas.toDataURL('image/jpeg', 0.6);

      fetch(`/api/candidates/${candidateId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          snapshotBase64: snapBase64,
          eventType: eventType
        })
      }).catch(() => {});
    } catch (e) {
      console.warn('Failed to capture proctor snapshot:', e);
    }
  };

  // Helper to throttle violations to at most once every 8 seconds per type
  const triggerViolationThrottled = (type, details) => {
    const now = Date.now();
    const last = lastViolationTimeRef.current[type] || 0;
    if (now - last > 8000) {
      lastViolationTimeRef.current[type] = now;
      captureAndUploadSnapshot(type);
      if (onViolation) {
        onViolation(type, details);
      }
    }
  };

  // 3. AI Inference Loop (Every 650ms)
  useEffect(() => {
    if (!streamActive || !aiReady || !proctoringEnabled) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      const aiRes = await analyzeFrame(video);
      if (!aiRes) return;

      // Draw bounding boxes on overlay canvas
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        overlayCanvas.width = video.videoWidth || 320;
        overlayCanvas.height = video.videoHeight || 240;
        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        // A. Draw Phone Bounding Box
        if (aiRes.phoneDetected && aiRes.phoneBbox) {
          const [bx, by, bw, bh] = aiRes.phoneBbox;
          ctx.strokeStyle = '#ef4444'; // Bright Red
          ctx.lineWidth = 4;
          ctx.strokeRect(bx, by, bw, bh);

          ctx.fillStyle = '#ef4444';
          ctx.fillRect(bx, Math.max(0, by - 22), bw, 22);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillText(`📱 PHONE (${aiRes.phoneScore}%)`, bx + 4, Math.max(16, by - 6));
        }

        // B. Draw Face Bounding Box
        if (aiRes.faceBbox && aiRes.faceCount === 1) {
          const [fx, fy, fw, fh] = aiRes.faceBbox;
          const isOff = aiRes.headPose.isLookingAway;
          ctx.strokeStyle = isOff ? '#f59e0b' : '#10b981'; // Amber if looking away, Emerald if centered
          ctx.lineWidth = 2;
          ctx.strokeRect(fx, fy, fw, fh);

          ctx.fillStyle = isOff ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)';
          ctx.fillRect(fx, Math.max(0, fy - 18), fw, 18);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Inter, sans-serif';
          const label = isOff
            ? `LOOKING ${aiRes.headPose.direction.toUpperCase()}`
            : 'FACE CENTERED';
          ctx.fillText(label, fx + 4, Math.max(14, fy - 4));
        }
      }

      // --- RULE 1: MOBILE PHONE DETECTION ---
      if (aiRes.phoneDetected) {
        phoneCounterRef.current++;
        setPhoneDetected(true);
        setPhoneScore(aiRes.phoneScore);
        setAiWarning(`🚨 MOBILE PHONE DETECTED (${aiRes.phoneScore}%)`);

        // If detected in 2 consecutive cycles (~1.3s)
        if (phoneCounterRef.current >= 2) {
          triggerViolationThrottled(
            'phone_detected',
            `Unauthorized mobile phone detected with ${aiRes.phoneScore}% confidence.`
          );
        }
      } else {
        phoneCounterRef.current = 0;
        setPhoneDetected(false);
      }

      // --- RULE 2: HEAD MOVEMENT & LOOKING AWAY ---
      setHeadDirection(aiRes.headPose.direction);
      setIsLookingAway(aiRes.headPose.isLookingAway);

      if (aiRes.headPose.isLookingAway && !aiRes.phoneDetected) {
        lookingAwayCounterRef.current++;
        const dir = aiRes.headPose.direction.toUpperCase();
        setAiWarning(`⚠️ HEAD TURNED: LOOKING ${dir}`);

        // If looking away continuously for 3 cycles (~2.0s)
        if (lookingAwayCounterRef.current >= 3) {
          triggerViolationThrottled(
            'looking_away',
            `Candidate looking away from exam screen (Head turned: ${dir}).`
          );
        }
      } else {
        lookingAwayCounterRef.current = 0;
      }

      // --- RULE 3: CANDIDATE FACE ABSENCE ---
      setFaceCount(aiRes.faceCount);
      if (aiRes.faceCount === 0 && !aiRes.phoneDetected) {
        faceMissingCounterRef.current++;
        setAiWarning('⚠️ NO CANDIDATE DETECTED IN CAMERA');

        // If absent for 4 cycles (~2.6s)
        if (faceMissingCounterRef.current >= 4) {
          triggerViolationThrottled(
            'face_missing',
            'Candidate face missing from camera view.'
          );
        }
      } else {
        faceMissingCounterRef.current = 0;
      }

      // --- RULE 4: MULTIPLE PEOPLE IN ROOM ---
      if (aiRes.faceCount > 1 && !aiRes.phoneDetected) {
        multipleFacesCounterRef.current++;
        setAiWarning(`👥 MULTIPLE PEOPLE DETECTED (${aiRes.faceCount})`);

        if (multipleFacesCounterRef.current >= 2) {
          triggerViolationThrottled(
            'multiple_people',
            `Multiple faces (${aiRes.faceCount}) detected in camera view.`
          );
        }
      } else {
        multipleFacesCounterRef.current = 0;
      }

      // Clear warning if all normal
      if (!aiRes.phoneDetected && !aiRes.headPose.isLookingAway && aiRes.faceCount === 1) {
        setAiWarning(null);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [streamActive, aiReady, proctoringEnabled, candidateId, sessionToken, onViolation]);

  if (!proctoringEnabled) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md relative">
      {/* Hidden processing canvas for capturing evidence snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden min-h-[180px]">
        {/* Video stream element (mirrored) */}
        <video
          ref={attachVideo}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${hasPermission && streamActive ? 'block' : 'hidden'}`}
          style={{ width: '100%', height: '100%', minHeight: '180px', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />

        {/* Real-time AI Tracking Overlay Canvas (mirrored to match video) */}
        <canvas
          ref={overlayCanvasRef}
          className={`absolute inset-0 pointer-events-none w-full h-full object-cover transform -scale-x-100 ${
            hasPermission && streamActive && aiReady ? 'block' : 'hidden'
          }`}
        />

        {hasPermission && streamActive ? (
          <>
            {/* Centering Face Oval Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className={`w-32 h-32 border-2 rounded-full transition-all duration-300 ${
                phoneDetected
                  ? 'border-rose-500 shadow-lg shadow-rose-500/80 animate-pulse'
                  : isLookingAway
                  ? 'border-amber-400 shadow-md shadow-amber-400/50'
                  : faceCount === 0
                  ? 'border-rose-400 animate-ping'
                  : 'border-emerald-400/40'
              }`} />
            </div>

            {/* Mobile Phone Detection Emergency Banner */}
            {phoneDetected && (
              <div className="absolute top-2 inset-x-2 bg-rose-600/95 text-white font-black text-[11px] py-1 px-2 rounded-lg flex items-center justify-center space-x-1 shadow-lg animate-bounce z-20">
                <Smartphone className="w-3.5 h-3.5" />
                <span>MOBILE PHONE DETECTED! PUT IT AWAY</span>
              </div>
            )}

            {/* Head Movement Warning Banner */}
            {!phoneDetected && isLookingAway && (
              <div className="absolute top-2 inset-x-2 bg-amber-500/95 text-slate-950 font-bold text-[11px] py-1 px-2 rounded-lg flex items-center justify-center space-x-1 shadow-lg z-20">
                <Eye className="w-3.5 h-3.5" />
                <span>HEAD TURNED: LOOKING AWAY ({headDirection.toUpperCase()})</span>
              </div>
            )}

            {/* Face Absence Banner */}
            {!phoneDetected && !isLookingAway && faceCount === 0 && (
              <div className="absolute top-2 inset-x-2 bg-rose-500/95 text-white font-bold text-[11px] py-1 px-2 rounded-lg flex items-center justify-center space-x-1 shadow-lg z-20">
                <EyeOff className="w-3.5 h-3.5" />
                <span>FACE NOT DETECTED IN CAMERA</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
            <CameraOff className="w-8 h-8 mb-1 text-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-rose-400">Camera Feed Inactive</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Continuous proctoring required</span>
            <button
              type="button"
              onClick={initCamera}
              className="mt-2.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Camera</span>
            </button>
          </div>
        )}

        {/* Live Proctoring Status Badge (Top-Left) */}
        {!phoneDetected && !isLookingAway && faceCount === 1 && (
          <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-black/75 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>REC PROCTORED</span>
          </div>
        )}

        {/* AI Model Status Badge (Top-Right) */}
        <div className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs z-10 transition-colors bg-black/70 text-slate-200">
          {aiLoading ? (
            <span className="text-amber-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>AI Loading...</span>
            </span>
          ) : aiReady ? (
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>AI Vision Active</span>
            </span>
          ) : (
            <span className="text-slate-400">Basic Proctor</span>
          )}
        </div>
      </div>

      {/* Candidate Name Footer with Live AI Diagnostics */}
      <div className="p-2.5 bg-slate-800/90 text-slate-200 text-xs flex items-center justify-between">
        <div className="flex flex-col truncate max-w-[140px]">
          <span className="font-semibold text-slate-100">{candidateName || 'Candidate'}</span>
          <span className="text-[10px] text-slate-400 truncate">
            {phoneDetected
              ? 'Phone Detected!'
              : isLookingAway
              ? `Turned: ${headDirection}`
              : faceCount === 0
              ? 'No Face Visible'
              : 'Gaze Centered'}
          </span>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
          phoneDetected
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
            : isLookingAway
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            : faceCount === 0
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            : streamActive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : 'bg-slate-700 text-slate-400'
        }`}>
          {phoneDetected ? (
            <>
              <Smartphone className="w-3 h-3 text-rose-400" />
              <span>Phone Alert</span>
            </>
          ) : isLookingAway ? (
            <>
              <Eye className="w-3 h-3 text-amber-400" />
              <span>Looking Away</span>
            </>
          ) : faceCount === 0 ? (
            <>
              <EyeOff className="w-3 h-3 text-rose-400" />
              <span>Missing</span>
            </>
          ) : streamActive ? (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Monitored</span>
            </>
          ) : (
            <>
              <CameraOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
