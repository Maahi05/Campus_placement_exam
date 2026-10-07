import React, { useState, useEffect, useRef } from 'react';
import Timer from '../components/Timer';
import QuestionPalette from '../components/QuestionPalette';
import WebcamFeed from '../components/WebcamFeed';
import ProctorAlert from '../components/ProctorAlert';
import CameraDisconnectAlert from '../components/CameraDisconnectAlert';
import SubmitConfirmModal from '../components/SubmitConfirmModal';
import CodeEditor from '../components/CodeEditor';
import { 
  ChevronLeft, ChevronRight, Bookmark, RotateCcw, Send, 
  ShieldAlert, Maximize2, AlertCircle, HelpCircle, CheckCircle2,
  Code, FileText
} from 'lucide-react';

export default function ExamRoom({ candidateSession, onExamFinished }) {
  const { candidateId, sessionToken, examId, candidateName, rollNumber } = candidateSession;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Exam Data
  const [exam, setExam] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [codingQuestions, setCodingQuestions] = useState([]);
  const [activeMode, setActiveMode] = useState('mcq'); // 'mcq' | 'coding'

  const [answers, setAnswers] = useState({});
  const [codingSubmissions, setCodingSubmissions] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCodingIndex, setCurrentCodingIndex] = useState(0);
  const [selectedSection, setSelectedSection] = useState('All');

  // Proctoring & Camera Watchdog State
  const [violationAlert, setViolationAlert] = useState(false);
  const [currentViolationType, setCurrentViolationType] = useState('');
  const [violationCount, setViolationCount] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Camera Disconnect Grace Period
  const [cameraDisconnected, setCameraDisconnected] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  // Submission State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initialize test session
  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        const res = await fetch(`/api/candidates/${candidateId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to start examination session');
        }

        setExam(data.exam);
        setCandidate(data.candidate);
        setQuestions(data.questions || []);
        setCodingQuestions(data.codingQuestions || []);
        setAnswers(data.savedAnswers || {});
        setCodingSubmissions(data.savedCodingSubmissions || {});
        setViolationCount(data.candidate.violationCount || 0);

        if (data.questions && data.questions.length > 0) {
          setVisitedQuestions(new Set([data.questions[0].id]));
          setActiveMode('mcq');
        } else if (data.codingQuestions && data.codingQuestions.length > 0) {
          setActiveMode('coding');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [candidateId, sessionToken]);

  // 2. Periodic Server Heartbeat (Every 15 Seconds)
  useEffect(() => {
    if (!exam || isSubmitting || isDisqualified) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken,
            cameraStatus: cameraDisconnected ? 'disconnected' : 'active'
          })
        });

        const data = await res.json();
        if (data.timeExpired) {
          // Server says deadline passed!
          alert('Server deadline has elapsed. The exam is automatically being finalized.');
          onExamFinished(candidateId, false);
        }
      } catch (e) {
        console.warn('Heartbeat ping failed:', e);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [exam, candidateId, sessionToken, cameraDisconnected, isSubmitting, isDisqualified]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  };

  // 3. Proctoring Event Listeners
  useEffect(() => {
    if (!exam?.proctoringEnabled) return;

    const handleFullscreenChange = () => {
      const full = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(full);

      if (!full && !isSubmitting && !isDisqualified) {
        recordViolation('fullscreen_exit', 'Exited fullscreen examination mode.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitting && !isDisqualified) {
        recordViolation('tab_switch', 'Browser tab switched or minimized.');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'F12' || e.key === 'PrintScreen') {
        e.preventDefault();
        recordViolation('devtools_open', `Blocked shortcut: ${e.key}`);
      }
    };

    const handleContextMenu = (e) => {
      if (activeMode !== 'coding') {
        e.preventDefault();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [exam, isSubmitting, isDisqualified, activeMode]);

  const recordViolation = async (violationType, details) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, violationType, details })
      });
      const data = await res.json();

      if (data.violationCount !== undefined) {
        setViolationCount(data.violationCount);
      }

      setCurrentViolationType(violationType);
      setViolationAlert(true);

      if (data.disqualified) {
        setIsDisqualified(true);
        setTimeout(() => {
          onExamFinished(candidateId, true);
        }, 3000);
      }
    } catch (e) {
      console.error('Failed to log violation:', e);
    }
  };

  // Camera Watchdog Handlers
  const handleCameraDisconnect = () => {
    if (!cameraDisconnected && !isSubmitting && !isDisqualified) {
      setCameraDisconnected(true);
    }
  };

  const handleCameraRestored = () => {
    setCameraDisconnected(false);
  };

  const handleCameraGracePeriodExpired = async () => {
    try {
      await fetch(`/api/candidates/${candidateId}/camera-disconnect-expired`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      });
    } catch (e) {}
    onExamFinished(candidateId, true);
  };

  const handleSelectOption = async (optionLetter) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        selected_option: optionLetter,
        status: 'answered'
      }
    };
    setAnswers(newAnswers);

    try {
      await fetch(`/api/candidates/${candidateId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          questionId: currentQ.id,
          selectedOption: optionLetter,
          status: 'answered'
        })
      });
    } catch (err) {}
  };

  const handleClearResponse = async () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newAnswers = { ...answers };
    delete newAnswers[currentQ.id];
    setAnswers(newAnswers);

    try {
      await fetch(`/api/candidates/${candidateId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          questionId: currentQ.id,
          selectedOption: null,
          status: 'unanswered'
        })
      });
    } catch (e) {}
  };

  const handleMarkForReview = async () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const currentAns = answers[currentQ.id];
    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        selected_option: currentAns?.selected_option || null,
        status: 'marked_for_review'
      }
    };
    setAnswers(newAnswers);

    try {
      await fetch(`/api/candidates/${candidateId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          questionId: currentQ.id,
          selectedOption: currentAns?.selected_option || null,
          status: 'marked_for_review'
        })
      });
    } catch (e) {}

    handleNextQuestion();
  };

  const handleJumpToQuestion = (index) => {
    setActiveMode('mcq');
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setVisitedQuestions(prev => new Set([...prev, questions[index].id]));
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      handleJumpToQuestion(currentIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      handleJumpToQuestion(currentIndex - 1);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const res = await fetch(`/api/candidates/${candidateId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit test');
      }

      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      onExamFinished(candidateId, false);
    } catch (err) {
      alert('Error during submission: ' + err.message);
      setIsSubmitting(false);
    }
  };

  const handleTimerExpire = () => {
    if (!isSubmitting) {
      alert('Time limit expired! Your exam is being automatically submitted now.');
      handleFinalSubmit();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading Proctored Test Environment...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md bg-white rounded-2xl p-6 border border-slate-200 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Session Error</h3>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
            Return to Portal Home
          </a>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentSelection = answers[currentQ?.id]?.selected_option;
  const sections = [...new Set(questions.map(q => q.section))];
  const currentCodingQ = codingQuestions[currentCodingIndex];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col exam-select-none">
      {/* Violation Alert Modal */}
      <ProctorAlert
        isOpen={violationAlert}
        violationType={currentViolationType}
        violationCount={violationCount}
        maxViolations={exam.maxViolations || 3}
        isDisqualified={isDisqualified}
        onDismiss={() => {
          setViolationAlert(false);
          enterFullscreen();
        }}
      />

      {/* Camera Disconnect & Grace Period Watchdog Modal */}
      <CameraDisconnectAlert
        isOpen={cameraDisconnected}
        gracePeriodSeconds={exam.cameraGracePeriodSeconds || 20}
        onReconnect={() => setReconnectTrigger(prev => prev + 1)}
        onExpired={handleCameraGracePeriodExpired}
      />

      <SubmitConfirmModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleFinalSubmit}
        isSubmitting={isSubmitting}
        questions={questions}
        answers={answers}
      />

      {!isFullscreen && exam.proctoringEnabled && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-md sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span><strong>Exam Security:</strong> Fullscreen mode is required to prevent disqualification strikes.</span>
          </div>
          <button
            onClick={enterFullscreen}
            className="px-3 py-1 bg-white text-rose-700 font-bold rounded-md hover:bg-rose-50 transition-colors shadow-xs"
          >
            Enter Fullscreen
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {candidateName ? candidateName.charAt(0) : 'C'}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 leading-tight">{candidateName}</div>
              <div className="text-[11px] text-slate-500 font-mono">Roll: {rollNumber}</div>
            </div>
          </div>

          {/* Section Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {questions.length > 0 && (
              <button
                onClick={() => setActiveMode('mcq')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMode === 'mcq'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>MCQs ({questions.length})</span>
              </button>
            )}

            {codingQuestions.length > 0 && (
              <button
                onClick={() => setActiveMode('coding')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMode === 'coding'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-blue-600" />
                <span>Coding Challenges ({codingQuestions.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Timer
              initialSeconds={exam.remainingSeconds}
              onExpire={handleTimerExpire}
            />

            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Test</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
          {activeMode === 'coding' && currentCodingQ ? (
            <CodeEditor
              codingQuestion={currentCodingQ}
              candidateSession={candidateSession}
              savedSubmission={codingSubmissions[currentCodingQ.id]}
              onCodeSaved={(qid, data) => {
                setCodingSubmissions(prev => ({ ...prev, [qid]: data }));
              }}
            />
          ) : currentQ ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-md">
                      Question {currentQ.question_number} of {questions.length}
                    </span>
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      {currentQ.section}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    Marks: <span className="text-slate-900 font-bold">+{currentQ.marks || 1}</span>
                  </div>
                </div>

                <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed mb-6">
                  {currentQ.question_text}
                </div>

                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map(letter => {
                    const optKey = `option_${letter.toLowerCase()}`;
                    const optText = currentQ[optKey];
                    const isSelected = currentSelection === letter;

                    return (
                      <div
                        key={letter}
                        onClick={() => handleSelectOption(letter)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start space-x-3.5 ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-sm font-medium text-slate-800 pt-0.5 leading-snug">
                          {optText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevQuestion}
                    disabled={currentIndex === 0}
                    className="flex items-center space-x-1 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={handleClearResponse}
                    disabled={!currentSelection}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl text-slate-600 hover:text-rose-600 text-xs font-medium transition-colors disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>

                  <button
                    onClick={handleMarkForReview}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Mark for Review</span>
                  </button>
                </div>

                <button
                  onClick={handleNextQuestion}
                  disabled={currentIndex === questions.length - 1}
                  className="flex items-center space-x-1 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-40"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar with Watchdog Webcam */}
        <div className="space-y-4 flex flex-col justify-start">
          <WebcamFeed
            candidateName={candidateName}
            candidateId={candidateId}
            sessionToken={sessionToken}
            proctoringEnabled={exam.proctoringEnabled}
            onCameraDisconnect={handleCameraDisconnect}
            onCameraRestored={handleCameraRestored}
            reconnectTrigger={reconnectTrigger}
            onViolation={recordViolation}
          />

          {questions.length > 0 && (
            <div className="flex-1">
              <QuestionPalette
                questions={questions}
                currentIndex={activeMode === 'mcq' ? currentIndex : -1}
                onSelectQuestion={handleJumpToQuestion}
                answers={answers}
                visitedQuestions={visitedQuestions}
                sections={sections}
                selectedSection={selectedSection}
                onSelectSection={setSelectedSection}
              />
            </div>
          )}

          {codingQuestions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
                <Code className="w-3.5 h-3.5 text-blue-600" />
                <span>Coding Challenges</span>
              </h4>
              <div className="space-y-1.5">
                {codingQuestions.map((cq, idx) => {
                  const isSubmitted = Boolean(codingSubmissions[cq.id]);
                  const isSelected = activeMode === 'coding' && currentCodingIndex === idx;

                  return (
                    <button
                      key={cq.id}
                      onClick={() => {
                        setActiveMode('coding');
                        setCurrentCodingIndex(idx);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : isSubmitted
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate pr-2">{idx + 1}. {cq.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        isSubmitted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isSubmitted ? 'SUBMITTED' : `+${cq.marks || 10}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
