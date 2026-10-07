import React, { useState, useEffect } from 'react';
import { 
  Play, Send, CheckCircle2, XCircle, Clock, AlertTriangle, 
  Code, Terminal, Sparkles, RefreshCw, FileCode, Check
} from 'lucide-react';

export default function CodeEditor({
  codingQuestion,
  candidateSession,
  savedSubmission,
  onCodeSaved
}) {
  const [language, setLanguage] = useState(savedSubmission?.language || 'python');
  const [code, setCode] = useState(
    savedSubmission?.code ||
    (language === 'python' ? codingQuestion.starter_code_py : codingQuestion.starter_code_js) ||
    '# Write your code here\n'
  );

  const [activeTab, setActiveTab] = useState(0); // Test case tab index
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runReport, setRunReport] = useState(null);
  const [submitReport, setSubmitReport] = useState(savedSubmission ? {
    score: savedSubmission.score,
    testsPassed: savedSubmission.tests_passed,
    totalTests: savedSubmission.total_tests
  } : null);

  // Sync starter code when language changes if code is untouched
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!savedSubmission?.code) {
      setCode(newLang === 'python' ? codingQuestion.starter_code_py : codingQuestion.starter_code_js);
    }
  };

  // Support Tab key indentation in textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const spaces = '    ';
      const newCode = code.substring(0, start) + spaces + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  // Run against sample test cases
  const handleRunSampleTests = async () => {
    setIsRunning(true);
    setRunReport(null);

    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          questionId: codingQuestion.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setRunReport(data);
    } catch (err) {
      setRunReport({
        error: err.message,
        results: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Final submission of coding solution
  const handleSubmitCode = async () => {
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/code/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidateSession.candidateId,
          sessionToken: candidateSession.sessionToken,
          questionId: codingQuestion.id,
          code,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmitReport(data);
      if (onCodeSaved) {
        onCodeSaved(codingQuestion.id, {
          code,
          language,
          score: data.score,
          tests_passed: data.testsPassed,
          total_tests: data.totalTests
        });
      }
    } catch (err) {
      alert('Error submitting code: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleCases = codingQuestion.sampleTestCases || [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">
            {codingQuestion.question_number}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm tracking-tight">{codingQuestion.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                codingQuestion.difficulty === 'Hard' ? 'bg-rose-500/20 text-rose-400' :
                codingQuestion.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {codingQuestion.difficulty || 'Medium'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Technical Coding Challenge • Max Marks: +{codingQuestion.marks || 10}</p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Language:</label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-slate-800 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-hidden"
          >
            <option value="python">Python 3 (CPython 3.11)</option>
            <option value="javascript">JavaScript (Node.js v22)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1">
        {/* Left: Problem Statement & Sample Cases (5 cols) */}
        <div className="lg:col-span-5 p-5 border-r border-slate-200 overflow-y-auto max-h-[620px] space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Problem Description</h4>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">
              {codingQuestion.description}
            </div>
          </div>

          {/* Sample Cases Display */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sample Test Cases</h4>
            <div className="space-y-3">
              {sampleCases.map((tc, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="font-semibold text-slate-700">Sample Case {idx + 1}</div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Input:</span>
                    <pre className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-800 mt-0.5 overflow-x-auto">
                      {tc.input || '(empty)'}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Expected Output:</span>
                    <pre className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px] text-emerald-700 font-bold mt-0.5 overflow-x-auto">
                      {tc.expected_output}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Code Editor & Execution Console (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-slate-950 text-slate-100">
          {/* Code Textarea Area */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
              <span>Solution Editor ({language === 'python' ? 'Python 3' : 'Node.js'})</span>
              <span className="text-[10px] text-slate-500">Supports Tab key</span>
            </div>

            <textarea
              rows={14}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck="false"
              className="w-full flex-1 bg-slate-900 text-emerald-400 font-mono text-xs sm:text-sm p-4 rounded-xl border border-slate-800 focus:outline-hidden focus:border-blue-500 leading-relaxed resize-none"
              placeholder="# Write your solution here..."
            />
          </div>

          {/* Action Bar */}
          <div className="bg-slate-900 border-t border-slate-800 p-3 px-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunSampleTests}
                disabled={isRunning || isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isRunning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{isRunning ? 'Running...' : 'Run Sample Tests'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {submitReport && (
                <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Score: {submitReport.score} / {codingQuestion.marks || 10}</span>
                </div>
              )}

              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSubmitting ? 'Evaluating Test Cases...' : 'Submit Solution'}</span>
              </button>
            </div>
          </div>

          {/* Execution Output Console */}
          {(runReport || submitReport) && (
            <div className="bg-slate-900/90 border-t border-slate-800 p-4 max-h-48 overflow-y-auto font-mono text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Execution Output</span>
                {runReport && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    runReport.allPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {runReport.allPassed ? 'All Sample Tests Passed' : `${runReport.passedCount} / ${runReport.totalTests} Passed`}
                  </span>
                )}
              </div>

              {runReport?.error && (
                <div className="text-rose-400 bg-rose-950/40 p-2.5 rounded border border-rose-900/50">
                  {runReport.error}
                </div>
              )}

              {runReport?.results?.map((res, i) => (
                <div key={i} className={`p-2.5 rounded mb-2 border ${
                  res.passed ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                    <span>Sample Test {res.testCaseIndex}</span>
                    <span className="text-[10px]">{res.passed ? 'PASSED' : 'FAILED'} ({res.executionTimeMs}ms)</span>
                  </div>
                  {!res.passed && (
                    <div className="text-[10px] space-y-1 mt-1 text-slate-300">
                      <div>Expected: <code className="text-emerald-400">{res.expected}</code></div>
                      <div>Actual: <code className="text-rose-400">{res.actual || '(no output)'}</code></div>
                      {res.stderr && <div className="text-amber-400 mt-1">Error: {res.stderr}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
