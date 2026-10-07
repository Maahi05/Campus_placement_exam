import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import CreateExam from './pages/CreateExam';
import CandidateLogin from './pages/CandidateLogin';
import ExamRoom from './pages/ExamRoom';
import ExamSuccess from './pages/ExamSuccess';

export default function App() {
  // Routes: 'admin-dashboard' | 'create-exam' | 'candidate-login' | 'exam-room' | 'exam-success'
  const [currentView, setCurrentView] = useState('admin-dashboard');
  const [activeExamId, setActiveExamId] = useState(null);
  const [candidateSession, setCandidateSession] = useState(null);
  const [finishedResult, setFinishedResult] = useState({ candidateId: null, isDisqualified: false });

  // Parse URL hash for direct exam link access e.g., /#exam/TCS-1234
  useEffect(() => {
    function parseRoute() {
      const hash = window.location.hash;
      const match = hash.match(/^#exam\/([A-Za-z0-9_-]+)/);

      if (match) {
        const id = match[1];
        setActiveExamId(id);
        setCurrentView('candidate-login');
      } else if (hash === '#create') {
        setCurrentView('create-exam');
      } else {
        // default admin dashboard
        if (currentView !== 'exam-room' && currentView !== 'exam-success') {
          setCurrentView('admin-dashboard');
        }
      }
    }

    parseRoute();
    window.addEventListener('hashchange', parseRoute);
    return () => window.removeEventListener('hashchange', parseRoute);
  }, []);

  // When candidate logs in successfully
  const handleLoginSuccess = (session) => {
    setCandidateSession(session);
    setCurrentView('exam-room');
  };

  // When exam is finished or submitted
  const handleExamFinished = (candidateId, isDisqualified = false) => {
    setFinishedResult({ candidateId, isDisqualified });
    setCurrentView('exam-success');
  };

  // Return to home
  const handleReturnHome = () => {
    window.location.hash = '';
    setCandidateSession(null);
    setActiveExamId(null);
    setCurrentView('admin-dashboard');
  };

  // If candidate is actively taking an exam
  if (currentView === 'exam-room' && candidateSession) {
    return (
      <ExamRoom
        candidateSession={candidateSession}
        onExamFinished={handleExamFinished}
      />
    );
  }

  // If candidate completed exam
  if (currentView === 'exam-success') {
    return (
      <ExamSuccess
        candidateId={finishedResult.candidateId}
        isDisqualified={finishedResult.isDisqualified}
        onHome={handleReturnHome}
      />
    );
  }

  // If candidate is at login screen
  if (currentView === 'candidate-login' && activeExamId) {
    return (
      <div>
        <div className="bg-slate-900 text-white text-xs py-2 px-4 flex justify-between items-center">
          <span>Campus Placement Examination Portal</span>
          <button
            onClick={handleReturnHome}
            className="text-slate-400 hover:text-white underline"
          >
            Switch to Placement Admin
          </button>
        </div>
        <CandidateLogin
          examId={activeExamId}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Placement Officer / Admin Views
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentView={currentView} setView={setCurrentView} />

      <main className="flex-1">
        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            setView={setCurrentView}
            onOpenExam={(id) => {
              window.location.hash = `#exam/${id}`;
            }}
          />
        )}

        {currentView === 'create-exam' && (
          <CreateExam
            setView={setCurrentView}
            onExamCreated={(data) => {
              setActiveExamId(data.examId);
            }}
          />
        )}
      </main>
    </div>
  );
}
