import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, Award, Printer, Home, ShieldAlert, 
  BarChart, Users, Clock, AlertTriangle 
} from 'lucide-react';

export default function ExamSuccess({ candidateId, isDisqualified, onHome }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/result`);
        const data = await res.json();
        setResult(data);

        // Confetti celebration if passed and not disqualified
        if (data.candidate?.passed && !isDisqualified) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (e) {
        console.error('Failed to load result:', e);
      } finally {
        setLoading(false);
      }
    }

    if (candidateId) {
      fetchResult();
    }
  }, [candidateId, isDisqualified]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const candidate = result?.candidate;
  const exam = result?.exam;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/50 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
        {/* Status Icon */}
        <div className="mb-4">
          {isDisqualified ? (
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-9 h-9" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isDisqualified ? 'Exam Terminated with Disqualification' : 'Assessment Completed!'}
        </h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {isDisqualified
            ? 'Your session was closed due to exceeding anti-cheating violation limits.'
            : 'Your responses have been successfully recorded and processed.'}
        </p>

        {/* Detailed Scorecard */}
        {candidate && exam?.showResultImmediately && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs text-slate-400 font-medium">Candidate</div>
                <div className="font-bold text-slate-800 text-sm">{candidate.fullName}</div>
                <div className="text-xs text-slate-500 font-mono">Roll: {candidate.rollNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 font-medium">Placement Drive</div>
                <div className="font-bold text-blue-600 text-sm">{exam.companyName}</div>
                <div className="text-xs text-slate-500">{candidate.department}</div>
              </div>
            </div>

            {/* Score Breakdown Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {candidate.score} <span className="text-xs font-normal text-slate-400">/ {candidate.totalMarks}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Percentage</div>
                <div className="text-xl font-black text-blue-600 mt-0.5">
                  {candidate.percentage}%
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Rank</div>
                <div className="text-xl font-black text-indigo-600 mt-0.5">
                  #{candidate.rank || 1}
                </div>
              </div>
            </div>

            {/* Pass / Fail Outcome */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              candidate.passed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center space-x-2 text-xs font-bold">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>
                  {candidate.passed
                    ? 'Qualified for Technical Interview'
                    : 'Did Not Meet Minimum Cutoff'}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                candidate.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {candidate.passed ? 'QUALIFIED' : 'NOT QUALIFIED'}
              </span>
            </div>

            {/* Violations note if any */}
            {candidate.violationCount > 0 && (
              <div className="flex items-center space-x-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Recorded Proctoring Strikes: {candidate.violationCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Scorecard</span>
          </button>

          <button
            onClick={onHome}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Portal Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
