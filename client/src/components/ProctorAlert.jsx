import React from 'react';
import { AlertTriangle, ShieldX, EyeOff, Maximize } from 'lucide-react';

export default function ProctorAlert({
  isOpen,
  violationType,
  violationCount,
  maxViolations,
  onDismiss,
  isDisqualified
}) {
  if (!isOpen) return null;

  const warningsLeft = Math.max(0, maxViolations - violationCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-rose-500 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          {isDisqualified ? <ShieldX className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isDisqualified ? 'Exam Terminated' : 'Security Warning: Violation Detected!'}
        </h3>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-800 text-sm mb-4">
          <p className="font-semibold">
            {violationType === 'tab_switch' && 'Tab switch or window minimizing was detected.'}
            {violationType === 'fullscreen_exit' && 'Exiting fullscreen mode is strictly prohibited.'}
            {violationType === 'copy_paste_attempt' && 'Clipboard copy/paste actions are disabled.'}
            {violationType === 'devtools_open' && 'Developer tools inspection is forbidden.'}
            {violationType === 'phone_detected' && '🚨 MOBILE PHONE DETECTED! Unauthorized mobile devices are strictly forbidden.'}
            {violationType === 'looking_away' && '👁️ SUSPICIOUS HEAD MOVEMENT! Looking away from the examination screen is prohibited.'}
            {violationType === 'face_missing' && '⚠️ FACE NOT DETECTED! You must remain seated in front of the camera.'}
            {violationType === 'multiple_people' && '👥 MULTIPLE PEOPLE DETECTED! Only the registered candidate is allowed in the room.'}
            {!['tab_switch', 'fullscreen_exit', 'copy_paste_attempt', 'devtools_open', 'phone_detected', 'looking_away', 'face_missing', 'multiple_people'].includes(violationType) &&
              'An unauthorized test environment interruption was detected.'}
          </p>
          <p className="text-xs text-rose-600 mt-1">
            All violations are logged and reported to the college placement cell.
          </p>
        </div>

        <div className="flex items-center justify-center space-x-6 py-2 mb-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <div className="text-xs text-slate-500 font-medium">Strikes Incurred</div>
            <div className="text-lg font-bold text-rose-600">{violationCount} / {maxViolations}</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-xs text-slate-500 font-medium">Warnings Left</div>
            <div className={`text-lg font-bold ${warningsLeft === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
              {warningsLeft}
            </div>
          </div>
        </div>

        {isDisqualified ? (
          <p className="text-sm text-slate-600 mb-4">
            You have exceeded the maximum allowed proctoring violations ({maxViolations}). Your exam has been automatically locked and submitted.
          </p>
        ) : (
          <button
            onClick={onDismiss}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md transition-colors"
          >
            <Maximize className="w-4 h-4" />
            <span>I Understand, Return to Fullscreen Exam</span>
          </button>
        )}
      </div>
    </div>
  );
}
