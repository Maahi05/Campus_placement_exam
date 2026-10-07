import React from 'react';
import { Send, AlertCircle, CheckCircle2, Bookmark, HelpCircle } from 'lucide-react';

export default function SubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  questions,
  answers
}) {
  if (!isOpen) return null;

  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => answers[q.id]?.selected_option).length;
  const markedCount = questions.filter(q => answers[q.id]?.status === 'marked_for_review').length;
  const unattemptedCount = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Confirm Exam Submission</h3>
            <p className="text-xs text-slate-500">Are you sure you want to finish your test?</p>
          </div>
        </div>

        {/* Stats summary table */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Assessment Summary
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-600 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Total Questions</span>
              </span>
              <span className="font-bold text-slate-900">{totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Answered</span>
              </span>
              <span className="font-bold">{answeredCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-800">
              <span className="flex items-center space-x-1.5">
                <Bookmark className="w-4 h-4 text-purple-600" />
                <span>Review</span>
              </span>
              <span className="font-bold">{markedCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <span className="flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Unattempted</span>
              </span>
              <span className="font-bold">{unattemptedCount}</span>
            </div>
          </div>
        </div>

        {unattemptedCount > 0 && (
          <div className="flex items-start space-x-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              You still have <strong>{unattemptedCount} unattempted questions</strong>. Once submitted, you cannot change any answers.
            </span>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Continue Test
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting Test...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Final Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
