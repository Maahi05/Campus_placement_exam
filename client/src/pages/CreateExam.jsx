import React, { useState } from 'react';
import { 
  UploadCloud, FileText, CheckCircle2, AlertCircle, Plus, Trash2, 
  Copy, ExternalLink, Settings, Sparkles, BookOpen, Clock, ShieldCheck, 
  ArrowRight, Check, Code, Shield, Network, Globe, Calendar, Video, Lock
} from 'lucide-react';

export default function CreateExam({ onExamCreated, setView }) {
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  // Exam Configuration
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('TCS Digital Drive 2026');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passPercentage, setPassPercentage] = useState(60);
  const [negativeMarking, setNegativeMarking] = useState(0.25);
  const [accessCode, setAccessCode] = useState('');
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [maxViolations, setMaxViolations] = useState(3);
  const [showResultImmediately, setShowResultImmediately] = useState(true);

  // Feature 5: IP Whitelisting (Optional - Disabled by Default)
  const [ipRestrictionEnabled, setIpRestrictionEnabled] = useState(false);
  const [allowedIpRange, setAllowedIpRange] = useState('192.168.*, 127.0.0.1');
  const [detectedSubnet, setDetectedSubnet] = useState(null);

  React.useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.suggestedSubnet) {
          setDetectedSubnet(data.suggestedSubnet);
        }
      })
      .catch(() => {});
  }, []);

  // Online Exam Rules & Restrictions
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cameraMandatory, setCameraMandatory] = useState(true);
  const [cameraGracePeriod, setCameraGracePeriod] = useState(20);
  const [oneTimeLinkEnforced, setOneTimeLinkEnforced] = useState(true);

  const [instructions, setInstructions] = useState(
    '1. This test is monitored under strict online proctoring.\n' +
    '2. Switching tabs, minimizing windows, or exiting fullscreen mode is treated as a violation.\n' +
    '3. Answers and code are auto-saved. The exam will auto-submit when the countdown expires.'
  );

  // Parsed Questions List
  const [questions, setQuestions] = useState([]);
  // Feature 4: Coding Questions
  const [codingQuestions, setCodingQuestions] = useState([]);

  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'editor' | 'success'
  const [activeEditorSection, setActiveEditorSection] = useState('mcq'); // 'mcq' | 'coding'
  const [createdExamData, setCreatedExamData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParseError(null);
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      setParseError('Please select a PDF question paper file first.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const response = await fetch('/api/pdf/parse', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF');
      }

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        if (!title && data.detectedTitle) {
          setTitle(data.detectedTitle);
        }
        setActiveTab('editor');
      } else {
        throw new Error('No structured questions could be extracted from this PDF. Please check its layout.');
      }
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadSamplePdf = async () => {
    setIsParsing(true);
    setParseError(null);
    try {
      const sampleQuestions = [
        {
          question_number: 1,
          section: 'SECTION A: QUANTITATIVE APTITUDE',
          question_text: 'A train running at 54 km/hr crosses a platform 150 meters long in 20 seconds. What is the length of the train in meters?',
          option_a: '120 meters',
          option_b: '150 meters',
          option_c: '180 meters',
          option_d: '200 meters',
          correct_option: 'B',
          marks: 1.0,
          explanation: 'Speed = 54 * (5/18) = 15 m/s. Train length = 300 - 150 = 150m.'
        },
        {
          question_number: 2,
          section: 'SECTION A: QUANTITATIVE APTITUDE',
          question_text: 'If 12 men can complete a project in 15 days, how many men are needed to complete the same project in 10 days?',
          option_a: '16 men',
          option_b: '18 men',
          option_c: '20 men',
          option_d: '22 men',
          correct_option: 'B',
          marks: 1.0,
          explanation: 'M1 * D1 = M2 * D2 => 180 = 10 * M2 => M2 = 18.'
        },
        {
          question_number: 3,
          section: 'SECTION B: DATA STRUCTURES',
          question_text: 'What is the worst-case time complexity of searching an element in a balanced Binary Search Tree (AVL Tree)?',
          option_a: 'O(1)',
          option_b: 'O(log n)',
          option_c: 'O(n)',
          option_d: 'O(n log n)',
          correct_option: 'B',
          marks: 1.0,
          explanation: 'Balanced BST height is O(log n).'
        },
        {
          question_number: 4,
          section: 'SECTION B: DATA STRUCTURES',
          question_text: 'Which data structure is primarily used to implement Breadth-First Search (BFS)?',
          option_a: 'Stack',
          option_b: 'Priority Queue',
          option_c: 'Queue',
          option_d: 'Hash Table',
          correct_option: 'C',
          marks: 1.0,
          explanation: 'BFS uses FIFO queue.'
        },
        {
          question_number: 5,
          section: 'SECTION C: DATABASE',
          question_text: 'Which ACID property ensures transactions persist safely even after a power outage or system crash?',
          option_a: 'Atomicity',
          option_b: 'Consistency',
          option_c: 'Isolation',
          option_d: 'Durability',
          correct_option: 'D',
          marks: 1.0,
          explanation: 'Durability guarantees committed data persists.'
        }
      ];

      // Add a sample coding question automatically
      const sampleCoding = [
        {
          question_number: 1,
          title: 'Palindrome String Checker',
          description: 'Write a program that takes a string input and prints "true" if the string reads the same forwards and backwards, otherwise prints "false". Ignore letter case.\n\nInput Format:\nA single line of string text.\n\nOutput Format:\n"true" or "false".',
          difficulty: 'Easy',
          starter_code_py: "import sys\n\ndef check_palindrome(s):\n    cleaned = s.strip().lower()\n    return cleaned == cleaned[::-1]\n\nline = sys.stdin.read().strip()\nif check_palindrome(line):\n    print('true')\nelse:\n    print('false')\n",
          starter_code_js: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().toLowerCase();\nconst reversed = input.split('').reverse().join('');\nconsole.log(input === reversed ? 'true' : 'false');\n",
          test_cases: [
            { input: 'racecar', expected_output: 'true', is_hidden: false },
            { input: 'hello', expected_output: 'false', is_hidden: false },
            { input: 'Madam', expected_output: 'true', is_hidden: true },
            { input: 'placement', expected_output: 'false', is_hidden: true },
            { input: '12321', expected_output: 'true', is_hidden: true },
            { input: 'a', expected_output: 'true', is_hidden: true },
            { input: 'deified', expected_output: 'true', is_hidden: true },
            { input: 'noon', expected_output: 'true', is_hidden: true },
            { input: 'abcdcba1', expected_output: 'false', is_hidden: true }
          ],
          marks: 10.0
        }
      ];

      setTitle('Campus Placement Drive - Aptitude & Technical Coding 2026');
      setQuestions(sampleQuestions);
      setCodingQuestions(sampleCoding);
      setActiveTab('editor');
    } catch (e) {
      setParseError('Failed to load sample test.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddSampleCoding = () => {
    const newCoding = {
      question_number: codingQuestions.length + 1,
      title: 'Sum of Array Elements',
      description: 'Given space-separated integers on standard input, print their sum.\n\nExample Input:\n1 2 3 4 5\n\nExample Output:\n15',
      difficulty: 'Easy',
      starter_code_py: "import sys\n\nnums = [int(x) for x in sys.stdin.read().split() if x]\nprint(sum(nums))\n",
      starter_code_js: "const fs = require('fs');\nconst nums = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nconsole.log(nums.reduce((a, b) => a + b, 0));\n",
      test_cases: [
        { input: '1 2 3 4 5', expected_output: '15', is_hidden: false },
        { input: '10 -5 20', expected_output: '25', is_hidden: false },
        { input: '100 200 300 400', expected_output: '1000', is_hidden: true },
        { input: '-10 -20 -30', expected_output: '-60', is_hidden: true },
        { input: '0 0 0 0', expected_output: '0', is_hidden: true },
        { input: '42', expected_output: '42', is_hidden: true },
        { input: '5 -5 10 -10 15 -15', expected_output: '0', is_hidden: true },
        { input: '999999 1', expected_output: '1000000', is_hidden: true },
        { input: '-50 100 -25', expected_output: '25', is_hidden: true }
      ],
      marks: 10.0
    };
    setCodingQuestions([...codingQuestions, newCoding]);
    setActiveEditorSection('coding');
  };

  const handleUpdateQuestion = (index, field, value) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddQuestion = () => {
    const newQ = {
      question_number: questions.length + 1,
      section: 'General',
      question_text: 'Enter question text here...',
      option_a: 'Option A',
      option_b: 'Option B',
      option_c: 'Option C',
      option_d: 'Option D',
      correct_option: 'A',
      marks: 1.0,
      explanation: ''
    };
    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (index) => {
    if (questions.length <= 1 && codingQuestions.length === 0) {
      alert('An exam must have at least one question.');
      return;
    }
    const updated = questions.filter((_, i) => i !== index).map((q, idx) => ({
      ...q,
      question_number: idx + 1
    }));
    setQuestions(updated);
  };

  const handleDeleteCoding = (index) => {
    const updated = codingQuestions.filter((_, i) => i !== index).map((q, idx) => ({
      ...q,
      question_number: idx + 1
    }));
    setCodingQuestions(updated);
  };

  const handlePublishExam = async () => {
    if (!title.trim()) {
      alert('Please enter an exam title.');
      return;
    }
    if (questions.length === 0 && codingQuestions.length === 0) {
      alert('Please add at least one question (MCQ or Coding).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        company_name: companyName,
        duration_minutes: durationMinutes,
        pass_percentage: passPercentage,
        negative_marking: negativeMarking,
        access_code: accessCode,
        proctoring_enabled: proctoringEnabled,
        max_violations: maxViolations,
        show_result_immediately: showResultImmediately,
        ip_restriction_enabled: ipRestrictionEnabled,
        allowed_ip_range: allowedIpRange,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        camera_mandatory: cameraMandatory,
        camera_grace_period_seconds: parseInt(cameraGracePeriod, 10) || 20,
        one_time_link_enforced: oneTimeLinkEnforced,
        instructions,
        questions,
        coding_questions: codingQuestions
      };

      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create exam');
      }

      setCreatedExamData(data);
      setActiveTab('success');
      if (onExamCreated) onExamCreated(data);
    } catch (err) {
      alert('Error publishing exam: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullExamUrl = createdExamData
    ? `${window.location.origin}/#exam/${createdExamData.examId}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullExamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Create Placement Examination
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Upload PDF question papers, add in-browser coding challenges, and configure college lab IP geofencing.
        </p>

        {/* Step Tabs */}
        <div className="flex items-center space-x-2 mt-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>1. Upload PDF Paper</span>
          </button>

          <button
            onClick={() => (questions.length > 0 || codingQuestions.length > 0) && setActiveTab('editor')}
            disabled={questions.length === 0 && codingQuestions.length === 0}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'editor'
                ? 'border-blue-600 text-blue-600'
                : (questions.length > 0 || codingQuestions.length > 0)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Questions ({questions.length} MCQs + {codingQuestions.length} Coding)</span>
          </button>

          {activeTab === 'success' && (
            <button
              className="flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 border-emerald-600 text-emerald-600"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>3. Share Exam Link</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PDF UPLOAD */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 sm:p-12 text-center transition-all bg-gradient-to-b from-white to-slate-50/50">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Select or Drop Question Paper PDF
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Our intelligent engine automatically extracts MCQs, choices (A, B, C, D), sections, and answer keys.
            </p>

            <input
              type="file"
              id="pdfInput"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <label
                htmlFor="pdfInput"
                className="cursor-pointer px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 text-sm transition-all"
              >
                Browse Question Paper (.pdf)
              </label>

              <button
                type="button"
                onClick={handleLoadSamplePdf}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm flex items-center space-x-2 transition-all border border-slate-300"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Load Sample Placement Paper (MCQ + Coding)</span>
              </button>
            </div>

            {file && (
              <div className="mt-6 inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm border border-blue-200">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{file.name}</span>
                <span className="text-xs text-blue-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            {parseError && (
              <div className="mt-6 max-w-lg mx-auto p-4 bg-rose-50 border border-rose-200 rounded-xl text-left text-sm text-rose-700 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <div className="font-semibold">Parsing Error</div>
                  <div className="text-xs mt-0.5">{parseError}</div>
                </div>
              </div>
            )}
          </div>

          {file && (
            <div className="flex justify-end">
              <button
                onClick={handleUploadAndParse}
                disabled={isParsing}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md text-sm flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {isParsing ? (
                  <span>Extracting Questions from PDF...</span>
                ) : (
                  <>
                    <span>Extract & Review Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Features guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-blue-600 font-bold text-sm mb-1 flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>PDF Extraction</span>
              </div>
              <p className="text-xs text-slate-600">
                Extracts questions, choices A/B/C/D, explanations, and answer keys from placement PDF sheets.
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-indigo-600 font-bold text-sm mb-1 flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>Coding Sandbox (Feature 4)</span>
              </div>
              <p className="text-xs text-slate-600">
                Conduct technical rounds with Python & JavaScript programming challenges with automated test cases.
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-purple-600 font-bold text-sm mb-1 flex items-center space-x-2">
                <Network className="w-4 h-4" />
                <span>College Lab Geofence (Feature 5)</span>
              </div>
              <p className="text-xs text-slate-600">
                Whitelist college lab IP addresses so students cannot attempt the exam from outside the campus.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTIONS REVIEW & EXAM CONFIGURATION */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Section Switcher: MCQs vs Coding */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveEditorSection('mcq')}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeEditorSection === 'mcq'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>MCQ Questions ({questions.length})</span>
                </button>

                <button
                  onClick={() => setActiveEditorSection('coding')}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeEditorSection === 'coding'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>Coding Challenges ({codingQuestions.length})</span>
                </button>
              </div>

              {activeEditorSection === 'mcq' ? (
                <button
                  onClick={handleAddQuestion}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add MCQ</span>
                </button>
              ) : (
                <button
                  onClick={handleAddSampleCoding}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Coding Challenge</span>
                </button>
              )}
            </div>

            {/* MCQs Section */}
            {activeEditorSection === 'mcq' && (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={q.section || ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'section', e.target.value)}
                          placeholder="Section (e.g. Aptitude)"
                          className="text-xs font-semibold uppercase px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 w-44"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 text-xs">
                          <span className="text-slate-500">Marks:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={q.marks || 1}
                            onChange={(e) => handleUpdateQuestion(idx, 'marks', e.target.value)}
                            className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center font-bold text-slate-800"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestion(idx, 'question_text', e.target.value)}
                        className="w-full text-sm font-medium text-slate-900 border border-slate-300 rounded-lg p-2.5"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const key = `option_${opt.toLowerCase()}`;
                        const isCorrect = (q.correct_option || '').toUpperCase() === opt;
                        return (
                          <div
                            key={opt}
                            className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                              isCorrect ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50/50 border-slate-200'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {opt}
                            </span>
                            <input
                              type="text"
                              value={q[key] || ''}
                              onChange={(e) => handleUpdateQuestion(idx, key, e.target.value)}
                              className="w-full text-xs bg-transparent border-0 p-0 text-slate-800 font-medium"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-700">Correct Answer:</span>
                        <select
                          value={q.correct_option || 'A'}
                          onChange={(e) => handleUpdateQuestion(idx, 'correct_option', e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2.5 py-1 font-bold text-emerald-700"
                        >
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Feature 4: Coding Questions Editor Section */}
            {activeEditorSection === 'coding' && (
              <div className="space-y-4">
                {codingQuestions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <Code className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-slate-700">No Coding Challenges Added</h4>
                    <p className="text-xs text-slate-500 mb-4">Add programming problems with automated test case evaluation.</p>
                    <button
                      onClick={handleAddSampleCoding}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                    >
                      + Add Sample Challenge
                    </button>
                  </div>
                ) : (
                  codingQuestions.map((cq, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={cq.title}
                            onChange={(e) => {
                              const copy = [...codingQuestions];
                              copy[idx].title = e.target.value;
                              setCodingQuestions(copy);
                            }}
                            placeholder="Challenge Title"
                            className="font-bold text-sm text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 w-64"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500 font-semibold">Marks:</span>
                          <input
                            type="number"
                            value={cq.marks || 10}
                            onChange={(e) => {
                              const copy = [...codingQuestions];
                              copy[idx].marks = parseFloat(e.target.value) || 10;
                              setCodingQuestions(copy);
                            }}
                            className="w-14 px-1 py-0.5 border border-slate-200 rounded text-center text-xs font-bold"
                          />
                          <button
                            onClick={() => handleDeleteCoding(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Problem Description & I/O Specifications</label>
                        <textarea
                          rows={4}
                          value={cq.description}
                          onChange={(e) => {
                            const copy = [...codingQuestions];
                            copy[idx].description = e.target.value;
                            setCodingQuestions(copy);
                          }}
                          className="w-full text-xs font-medium text-slate-800 border border-slate-300 rounded-lg p-2.5"
                        />
                      </div>

                      {/* Test cases list badge */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between">
                        <span className="text-slate-600 font-medium">
                          Configured Test Cases: <strong>{cq.test_cases?.length || 0}</strong> ({cq.test_cases?.filter(t => !t.is_hidden).length || 0} Sample, {cq.test_cases?.filter(t => t.is_hidden).length || 0} Hidden)
                        </span>
                        <span className="text-[11px] text-blue-600 font-bold">Auto-Graded via Python / Node Sandbox</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Exam Configuration Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 sticky top-20">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Exam Parameters</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pass Cutoff (%)</label>
                  <input
                    type="number"
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Feature 5: College Lab IP Whitelisting */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Network className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">College Lab IP Whitelist</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ipRestrictionEnabled}
                    onChange={(e) => setIpRestrictionEnabled(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                </div>

                {ipRestrictionEnabled && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-slate-500">
                      Restrict exam attempts to college computer lab IPs only.
                    </p>
                    <input
                      type="text"
                      value={allowedIpRange}
                      onChange={(e) => setAllowedIpRange(e.target.value)}
                      placeholder="e.g. 192.168.*, 10.0.*, 127.0.0.1"
                      className="w-full text-xs font-mono border border-purple-300 rounded-lg p-2 bg-white"
                    />
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {detectedSubnet && (
                        <button
                          type="button"
                          onClick={() => setAllowedIpRange(`${detectedSubnet}, 127.0.0.1`)}
                          className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold border border-purple-300 rounded hover:bg-purple-200"
                        >
                          Auto-Detect ({detectedSubnet})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAllowedIpRange('192.168.*, 127.0.0.1')}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-100"
                      >
                        192.168.* (LAN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowedIpRange('10.0.*, 127.0.0.1')}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-100"
                      >
                        10.0.* (Campus)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowedIpRange('127.0.0.1, localhost')}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-100"
                      >
                        127.0.0.1 (Localhost Only)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Access Rules: Time Window */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">Exam Time Window (Server Clock)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Strictly enforced against server clock. Candidates entering early will wait in countdown room; late attempts are blocked.
                </p>
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Start Time</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">End Time</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Access Rules: Camera & Grace Period */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Video className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Pre-Flight Camera Gate</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cameraMandatory}
                    onChange={(e) => setCameraMandatory(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Candidate must pass camera verification before the exam opens.
                </p>
                {cameraMandatory && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Camera Disconnect Grace Period (Seconds)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={cameraGracePeriod}
                        onChange={(e) => setCameraGracePeriod(e.target.value)}
                        className="w-20 text-xs font-bold border border-slate-300 rounded-lg p-1.5 bg-white text-center"
                      />
                      <span className="text-[11px] text-slate-500">
                        s countdown warning before termination
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Access Rules: One-Time Link & Session Guard */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">One-Time Link & Single Session</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={oneTimeLinkEnforced}
                    onChange={(e) => setOneTimeLinkEnforced(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Each link can only be activated once. Disallows concurrent sessions or second attempts.
                </p>
              </div>

              {/* Proctoring Settings */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-800">Proctoring Enforced (Tab & Fullscreen)</div>
                  <input
                    type="checkbox"
                    checked={proctoringEnabled}
                    onChange={(e) => setProctoringEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-800">Show Instant Scorecard</div>
                  <input
                    type="checkbox"
                    checked={showResultImmediately}
                    onChange={(e) => setShowResultImmediately(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>

              {/* Publish Button */}
              <div className="pt-2">
                <button
                  onClick={handlePublishExam}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/30 text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Publishing Exam...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publish & Generate Exam Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUCCESS */}
      {activeTab === 'success' && createdExamData && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Placement Exam is Live!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Includes {questions.length} MCQs and {codingQuestions.length} Coding Challenges.
          </p>

          <div className="mb-6">
            <div className="flex items-center space-x-2 bg-white border-2 border-blue-500 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={fullExamUrl}
                className="w-full text-sm font-mono text-slate-800 px-2 bg-transparent border-0"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={fullExamUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Candidate View (New Tab)</span>
            </a>

            <button
              onClick={() => setView('admin-dashboard')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
            >
              Go to Placement Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
