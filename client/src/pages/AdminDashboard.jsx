import React, { useState, useEffect } from 'react';
import { 
  Users, Award, CheckCircle2, AlertTriangle, Download, 
  ExternalLink, Play, Pause, Trash2, Copy, Check, BarChart3, 
  RefreshCw, ShieldAlert, ArrowLeft, Clock, Search
} from 'lucide-react';

export default function AdminDashboard({ setView, onOpenExam }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examAnalytics, setExamAnalytics] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exams');
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamDetails = async (examId) => {
    try {
      setSelectedExamId(examId);
      const [analyticsRes, candidatesRes] = await Promise.all([
        fetch(`/api/analytics/${examId}`),
        fetch(`/api/analytics/${examId}/candidates`)
      ]);
      const analyticsData = await analyticsRes.json();
      const candidatesData = await candidatesRes.json();

      setExamAnalytics(analyticsData);
      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const handleToggleStatus = async (examId, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/exams/${examId}/toggle`, { method: 'PATCH' });
      fetchExams();
      if (selectedExamId === examId) {
        fetchExamDetails(examId);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteExam = async (examId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this exam and all its candidate records?')) return;
    try {
      await fetch(`/api/exams/${examId}`, { method: 'DELETE' });
      if (selectedExamId === examId) {
        setSelectedExamId(null);
        setExamAnalytics(null);
      }
      fetchExams();
    } catch (err) {
      alert('Failed to delete exam');
    }
  };

  const handleCopyLink = (examId, e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#exam/${examId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(examId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.roll_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Placement Cell Administration
          </h1>
          <p className="text-sm text-slate-500">
            Real-time candidate monitoring, auto-graded scorecards, and audit logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchExams();
              if (selectedExamId) fetchExamDetails(selectedExamId);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setView('create-exam')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
          >
            <span>+ Create Exam</span>
          </button>
        </div>
      </div>

      {/* DETAILED EXAM VIEW */}
      {selectedExamId && examAnalytics ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedExamId(null);
                setExamAnalytics(null);
              }}
              className="inline-flex items-center space-x-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Exams</span>
            </button>

            <a
              href={`/api/analytics/${selectedExamId}/export-csv`}
              download
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Placement Results (CSV)</span>
            </a>
          </div>

          {/* Exam Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {examAnalytics.exam.company_name}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    examAnalytics.exam.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {examAnalytics.exam.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  {examAnalytics.exam.title}
                </h2>
                <div className="text-xs text-slate-500 mt-1 flex items-center space-x-4">
                  <span>Duration: {examAnalytics.exam.duration_minutes} mins</span>
                  <span>Cutoff: {examAnalytics.exam.pass_percentage}%</span>
                  <span>Link ID: <code className="font-mono text-blue-600">{selectedExamId}</code></span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => handleCopyLink(selectedExamId, e)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  {copiedId === selectedExamId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === selectedExamId ? 'Copied Link' : 'Copy Student Link'}</span>
                </button>

                <a
                  href={`${window.location.origin}/#exam/${selectedExamId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Test Link</span>
                </a>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Total Enrolled</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {examAnalytics.stats.totalCandidates}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Completed Submissions</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {examAnalytics.stats.completedCandidates}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Pass Rate</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {examAnalytics.stats.passPercentage}%
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Avg. Score</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {examAnalytics.stats.avgScore} <span className="text-xs font-normal text-slate-400">marks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Roster & Candidates Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Candidate Roster & Results</h3>
                <p className="text-xs text-slate-500">Live test attempts and auto-calculated scores.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, roll no..."
                    className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-48 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg py-1.5 px-2.5 bg-white text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DISQUALIFIED">Disqualified</option>
                </select>
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No candidates found matching the criteria. Share the exam link with students to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Score</th>
                      <th className="py-3 px-4 text-center">Result</th>
                      <th className="py-3 px-4 text-center">Violations</th>
                      <th className="py-3 px-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{c.full_name}</div>
                          <div className="text-[11px] text-slate-400">{c.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {c.roll_number}
                        </td>
                        <td className="py-3 px-4">{c.department || 'General'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            c.status === 'submitted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : c.status === 'disqualified'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {c.status === 'submitted' ? (
                            <span>{c.score} <span className="font-normal text-slate-400">/ {c.total_marks} ({c.percentage}%)</span></span>
                          ) : (
                            <span className="text-slate-400 font-normal">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.status === 'submitted' ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {c.passed ? 'PASS' : 'FAIL'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-semibold ${c.violation_count > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {c.violation_count || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {c.submitted_at ? new Date(c.submitted_at).toLocaleTimeString() : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ALL EXAMS LIST VIEW */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Active Placement Assessments ({exams.length})
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Manage ongoing drives, examine results, and copy candidate links.
            </p>

            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
                <p className="text-sm">Loading examinations...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">No Exams Created Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Upload a question paper in PDF format to generate your first campus placement test link.
                </p>
                <button
                  onClick={() => setView('create-exam')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Create Exam from PDF
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {exams.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => fetchExamDetails(ex.id)}
                    className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {ex.company_name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ex.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ex.is_active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {ex.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {ex.description || 'Campus recruitment evaluation test.'}
                      </p>

                      <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-slate-100 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">Questions</div>
                          <div className="text-sm font-bold text-slate-800">{ex.question_count}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">Duration</div>
                          <div className="text-sm font-bold text-slate-800">{ex.duration_minutes}m</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">Submissions</div>
                          <div className="text-sm font-bold text-emerald-600">{ex.completed_count}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => handleCopyLink(ex.id, e)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors"
                          title="Copy Link"
                        >
                          {copiedId === ex.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => handleToggleStatus(ex.id, e)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-amber-600 transition-colors"
                          title={ex.is_active ? 'Pause Exam' : 'Activate Exam'}
                        >
                          {ex.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => handleDeleteExam(ex.id, e)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-rose-600 transition-colors"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <span className="font-semibold text-blue-600 flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                        <span>View Results</span>
                        <span>&rarr;</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
