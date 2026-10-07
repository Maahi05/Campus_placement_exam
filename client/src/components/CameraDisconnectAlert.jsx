import React, { useState, useEffect } from 'react';
import { CameraOff, AlertTriangle, RefreshCw, ShieldX } from 'lucide-react';

export default function CameraDisconnectAlert({
  isOpen,
  gracePeriodSeconds = 20,
  onReconnect,
  onExpired
}) {
  const [secondsLeft, setSecondsLeft] = useState(gracePeriodSeconds);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(gracePeriodSeconds);
      return;
    }

    setSecondsLeft(gracePeriodSeconds);

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpired) onExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, gracePeriodSeconds, onExpired]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-rose-600 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
          <CameraOff className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-1">
          Camera Signal Lost!
        </h3>
        <p className="text-xs text-rose-600 font-semibold mb-4">
          Online examination integrity rules require continuous camera feed.
        </p>

        {/* Grace period countdown */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
            Reconnection Grace Period
          </div>
          <div className="text-3xl font-black font-mono text-rose-700 my-1">
            00:{String(secondsLeft).padStart(2, '0')}
          </div>
          <p className="text-[11px] text-rose-600">
            Please reconnect or unmute your camera immediately. If the camera remains disconnected when the timer reaches 00:00, your test will be automatically terminated.
          </p>
        </div>

        <button
          onClick={onReconnect}
          className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center space-x-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Attempt Camera Reconnection</span>
        </button>
      </div>
    </div>
  );
}
