import React from 'react';
import { CheckCircle2, Bookmark, Circle, HelpCircle } from 'lucide-react';

export default function QuestionPalette({
  questions,
  currentIndex,
  onSelectQuestion,
  answers,
  visitedQuestions,
  sections,
  selectedSection,
  onSelectSection
}) {
  // Compute counts
  const answeredCount = questions.filter(q => answers[q.id]?.selected_option).length;
  const markedCount = questions.filter(q => answers[q.id]?.status === 'marked_for_review').length;
  const visitedCount = visitedQuestions.size;
  const notVisitedCount = questions.length - visitedCount;
  const unansweredCount = questions.length - answeredCount;

  // Filter questions by section if selected
  const displayedQuestions = selectedSection === 'All'
    ? questions
    : questions.filter(q => q.section === selectedSection);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col h-full">
      <div className="border-b border-slate-200 pb-3 mb-3">
        <h3 className="font-semibold text-slate-900 text-sm flex items-center justify-between">
          <span>Question Palette</span>
          <span className="text-xs text-slate-500 font-normal">
            Total: {questions.length} Qs
          </span>
        </h3>

        {/* Section Filter Pills */}
        {sections && sections.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <button
              onClick={() => onSelectSection('All')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedSection === 'All'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {sections.map(sec => (
              <button
                key={sec}
                onClick={() => onSelectSection(sec)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors truncate max-w-[140px] ${
                  selectedSection === sec
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={sec}
              >
                {sec.replace(/SECTION\s*[A-Z]:\s*/i, '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Question Numbers */}
      <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 py-1">
        <div className="grid grid-cols-5 gap-2">
          {displayedQuestions.map((q) => {
            const actualIndex = questions.findIndex(item => item.id === q.id);
            const isCurrent = actualIndex === currentIndex;
            const ans = answers[q.id];
            const isAnswered = Boolean(ans?.selected_option);
            const isMarked = ans?.status === 'marked_for_review';
            const isVisited = visitedQuestions.has(q.id);

            let bgClass = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'; // Not visited

            if (isMarked) {
              bgClass = 'bg-purple-600 text-white border-purple-700 shadow-xs';
            } else if (isAnswered) {
              bgClass = 'bg-emerald-600 text-white border-emerald-700 shadow-xs';
            } else if (isVisited) {
              bgClass = 'bg-amber-100 text-amber-800 border-amber-300';
            }

            return (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(actualIndex)}
                className={`w-10 h-10 rounded-lg text-xs font-bold flex items-center justify-center border transition-all transform active:scale-95 ${bgClass} ${
                  isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 scale-105 z-10' : ''
                }`}
              >
                {q.question_number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette Legend */}
      <div className="border-t border-slate-200 pt-3 mt-3 space-y-1.5 text-xs text-slate-600">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
            <span className="truncate">Answered ({answeredCount})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded bg-purple-600 shrink-0" />
            <span className="truncate">Review ({markedCount})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 shrink-0" />
            <span className="truncate">Unanswered ({unansweredCount})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 shrink-0" />
            <span className="truncate">Not Visited ({notVisitedCount})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
