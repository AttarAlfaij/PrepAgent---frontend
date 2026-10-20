import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';

/**
 * CurrentQuestion — Compact, high-clarity question presentation card (Section 15, 16, 17)
 * Positioned directly below the AI interviewer stage.
 * Structure:
 * QUESTION                                    🔊 Replay
 * [Technical] [Medium]
 * Current dynamically generated question...
 */
const CurrentQuestion = ({
  question = '',
  questionNumber = 1,
  totalQuestions = null,
  category = 'Technical',
  difficulty = 'Medium',
  isTransitioning = false,
  onReplay = null,
  className = '',
}) => {
  return (
    <section
      className={`w-full max-w-[1440px] mx-auto bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs px-4 sm:px-5 py-2 sm:py-2.5 flex-shrink-0 transition-all ${className}`}
    >
      {/* Row 1: QUESTION (left) and Replay Audio Button (right) */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-600">
          QUESTION {questionNumber ? questionNumber : ''}
          {totalQuestions ? `/${totalQuestions}` : ''}
        </span>

        {/* Replay Question Button */}
        {onReplay && !isTransitioning && (
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            title="Replay Question Audio"
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Replay</span>
          </button>
        )}
      </div>

      {/* Row 2: Category and Difficulty Badges */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {category && (
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {category}
          </span>
        )}
        {difficulty && (
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
            {difficulty}
          </span>
        )}
      </div>

      {/* Row 3: Question Text with clamp(15px, 1.3vw, 18px) and controlled 2-3 line wrap */}
      {isTransitioning ? (
        <div className="flex items-center gap-2 text-slate-500 py-0.5 text-xs sm:text-sm font-medium animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          <span>Preparing next question...</span>
        </div>
      ) : (
        <p
          className="font-bold text-slate-900 leading-snug line-clamp-2 sm:line-clamp-3 break-words"
          style={{ fontSize: 'clamp(14px, 1.25vw, 18px)' }}
        >
          {question || 'Preparing your next question...'}
        </p>
      )}
    </section>
  );
};

export default CurrentQuestion;
