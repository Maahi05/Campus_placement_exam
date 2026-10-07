import React, { useState, useEffect } from 'react';
import CameraPreflightGate from '../components/CameraPreflightGate';
import { 
  Award, ShieldAlert, Clock, CheckCircle2, AlertCircle, 
  HelpCircle, UserCheck, ArrowRight, Camera, Monitor, 
  Lock, Calendar, Hourglass, ShieldX
} from 'lucide-react';

export default function CandidateLogin({ examId, onLoginSuccess }) {
  const [accessState, setAccessState] = useState(null); // { decision, code, reason, countdownSeconds, exam }
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [batch, setBatch] = useState('2026');
  const [accessCode, setAccessCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [cameraVerified, setCameraVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  // 1. Authoritative Access Controller Check
  const checkAccess = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${examId}/validate-access`);
      const data = await res.json();
      setAccessState(data);

      if (data.decision === 'WAIT' && data.countdownSeconds) {
        setCountdown(data.countdownSeconds);
      }
    } catch (err) {
      setAccessState({
        decision: 'BLOCK',
        code: 'NETWORK_ERROR',
        reason: 'Unable to connect to placement server. Please check your internet connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [examId]);

  // Live countdown for WAIT state
  useEffect(() => {
    if (accessState?.decision !== 'WAIT' || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          checkAccess(); // Re-validate once countdown reaches 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [accessState, countdown]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!fullName.trim() || !rollNumber.trim() || !email.trim()) {
      alert('Please fill in your Full Name, Roll Number, and Email.');
      return;
    }

    if (!cameraVerified && accessState?.exam?.cameraMandatory) {
      alert('Camera verification is mandatory. Please grant camera permission.');
      return;
    }

    if (!agreed) {
      alert('Please accept the examination rules and anti-cheating agreement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${examId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          rollNumber,
          email,
          department,
          batch,
          accessCode,
          cameraVerified
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onLoginSuccess({
        candidateId: data.candidateId,
        sessionToken: data.sessionToken,
        examId: examId,
        candidateName: fullName,
        rollNumber: rollNumber.toUpperCase()
      });
    } catch (err) {
      setSubmissionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Verifying Examination Access with Server Clock...</p>
        </div>
      </div>
    );
  }

  // ACCESS CONTROLLER: WAIT STATE (Exam scheduled in future)
  if (accessState?.decision === 'WAIT') {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200/50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm animate-pulse">
            <Hourglass className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Exam Has Not Started Yet</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {accessState.reason}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
              Time Remaining Until Start
            </div>
            <div className="text-4xl font-black font-mono text-blue-900 tracking-wider">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-blue-600 mt-1">
              The page will automatically grant access when the timer expires.
            </div>
          </div>

          <button
            onClick={checkAccess}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Check Server Clock Now
          </button>
        </div>
      </div>
    );
  }

  // ACCESS CONTROLLER: BLOCK STATE (Expired, Used link, or IP restricted)
  if (accessState?.decision === 'BLOCK') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200/50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldX className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Prohibited</h2>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 leading-relaxed font-semibold">
            {accessState.reason}
          </div>

          <p className="text-[11px] text-slate-500">
            For inquiries regarding eligibility or technical difficulties, contact your College Placement Cell coordinator.
          </p>

          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            Return to Portal Home
          </a>
        </div>
      </div>
    );
  }

  // ACCESS CONTROLLER: ALLOW STATE
  const exam = accessState?.exam || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Exam Title Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {exam.companyName || 'Campus Drive'}
                </span>
                <span className="text-xs text-slate-400">Proctored Placement Drive</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {exam.title}
              </h1>
            </div>

            <div className="flex items-center space-x-3 text-xs sm:text-sm">
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 font-bold">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{exam.durationMinutes} Mins</span>
              </div>
            </div>
          </div>

          {/* Rules Banner */}
          <div className="mt-5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Placement Examination Rules & Anti-Cheating Restrictions</span>
            </h4>
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
              <p>• <strong>Camera Mandatory:</strong> Continuous camera stream is strictly required throughout the assessment. Disconnecting triggers a 20-second emergency reconnect window.</p>
              <p>• <strong>One-Time Link:</strong> This exam link can only be used once. After completion, re-entry is blocked.</p>
              <p>• <strong>Single Device Session:</strong> Simultaneous logins on another computer or browser tab are automatically rejected.</p>
              <p>• <strong>Server Deadline:</strong> The exam will auto-submit when the server timer reaches 00:00:00.</p>
            </div>
          </div>
        </div>

        {/* Candidate Registration Form with Camera Pre-Flight */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 mb-6 border-b border-slate-100">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Candidate Identity Verification</h2>
          </div>

          {/* MANDATORY PRE-FLIGHT CAMERA GATE */}
          <CameraPreflightGate
            isMandatory={exam.cameraMandatory}
            onVerified={(verified) => setCameraVerified(verified)}
          />

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (as per College ID) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College Roll Number / USN *
                </label>
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 1NC22CS089"
                  className="w-full text-sm font-mono uppercase border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College / Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@college.edu"
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Branch
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Science & Engineering">Information Science & Engineering</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Electrical & Electronics">Electrical & Electronics</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Master of Computer Applications">MCA</option>
                </select>
              </div>
            </div>

            {exam.requiresAccessCode && (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  Exam Access Code *
                </label>
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter exam access passcode"
                  className="w-full sm:w-64 text-sm font-mono border border-blue-300 rounded-lg p-2.5 uppercase"
                />
              </div>
            )}

            {/* Declaration Checkbox */}
            <div className="pt-2">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I confirm that I am the authorized candidate. I agree to continuous camera proctoring, fullscreen enforcement, and server-side deadline auto-submission. I understand that multiple logins or covering the camera will result in immediate termination.
                </span>
              </label>
            </div>

            {submissionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{submissionError}</span>
              </div>
            )}

            {/* Submit Button (Gated by Camera Verification) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !agreed || (!cameraVerified && exam.cameraMandatory)}
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/30 text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Authorizing Session with Server Clock...</span>
                ) : !cameraVerified && exam.cameraMandatory ? (
                  <span>Camera Verification Required to Start</span>
                ) : (
                  <>
                    <span>Enter & Start Proctored Exam</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
