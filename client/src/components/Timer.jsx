import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function Timer({ initialSeconds, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formatTime = (num) => String(num).padStart(2, '0');

  const isLowTime = secondsLeft <= 300 && secondsLeft > 60; // < 5 mins
  const isCriticalTime = secondsLeft <= 60; // < 1 min

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-mono font-bold transition-all shadow-sm ${
        isCriticalTime
          ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse ring-2 ring-rose-400/50'
          : isLowTime
          ? 'bg-amber-50 border-amber-300 text-amber-700'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <Clock className={`w-4 h-4 ${isCriticalTime ? 'text-rose-600 animate-spin' : isLowTime ? 'text-amber-600' : 'text-blue-600'}`} />
      <span className="text-sm tracking-wider">
        {hours > 0 ? `${formatTime(hours)}:` : ''}{formatTime(minutes)}:{formatTime(seconds)}
      </span>
      {isCriticalTime && (
        <span className="text-xs bg-rose-200 text-rose-800 px-1 rounded uppercase font-sans">
          Auto-Submitting Soon
        </span>
      )}
    </div>
  );
}
