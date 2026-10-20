import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Clock, ShieldCheck, CheckCircle2, ChevronDown } from 'lucide-react';

/**
 * InterviewHeader — Top Navigation Bar matching the Reference Image Design
 * Left: PrepAgent AI Brand + Exit Button
 * Center: Live Interview Pill, Questions (X/total) Counter, Feedback, Timer, Monitored Shield (with status popover)
 * Right: End Interview Action Button (Red Pill)
 */
const InterviewHeader = ({
  companyName = 'Target Company',
  currentQuestionIndex = 1,
  totalQuestions = 5,
  elapsedSeconds = 0,
  remainingSeconds,
  isMonitored = true,
  isProcessing = false,
  formatTime = (sec) => {
    const s = Math.max(0, Number(sec) || 0);
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  },
  onExit = () => {},
  onFeedback = () => {},
  onEndInterview = () => {},
}) => {
  const [showStatusPopover, setShowStatusPopover] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 sticky top-0 z-40 flex-shrink-0">
      {/* Left: ← ✦ PrepAgent AI */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Exit to Preparation Details"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
            PrepAgent <span className="text-blue-600">AI</span>
          </span>
        </div>
      </div>

      {/* Center Navigation: [Live Interview] Questions (1/5) Feedback [🕒 22:59] [🛡 Monitored] */}
      <nav className="hidden md:flex items-center gap-2.5 sm:gap-3">
        {/* Active Pill: Live Interview */}
        <span className="px-4 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold">
          Live Interview
        </span>

        {/* Question Counter */}
        <span className="px-2 text-xs font-semibold text-slate-700">
          Questions ({Math.max(1, currentQuestionIndex)}{totalQuestions ? `/${totalQuestions}` : ''})
        </span>

        {/* Feedback Link */}
        <button
          type="button"
          onClick={onFeedback}
          disabled={isProcessing}
          className="px-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Feedback
        </button>

        {/* Timer Pill */}
        <div className="px-3.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono">{formatTime(elapsedSeconds !== undefined ? elapsedSeconds : (remainingSeconds ?? 0))}</span>
        </div>

        {/* Monitored Badge with Interactive Popover */}
        {isMonitored && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusPopover((prev) => !prev)}
              onMouseEnter={() => setShowStatusPopover(true)}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Click to view integrity monitoring status"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Monitored</span>
              <ChevronDown className="w-3 h-3 text-emerald-600 opacity-60" />
            </button>

            {/* Integrity Status Details Dropdown */}
            {showStatusPopover && (
              <div
                onMouseLeave={() => setShowStatusPopover(false)}
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl p-3 z-50 animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Proctoring Active
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Live
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Camera</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Microphone</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Network</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Good
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Identity</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Right: Mobile timer + [ End Interview ] (Red rounded pill) */}
      <div className="flex items-center gap-3">
        <div className="md:hidden px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-semibold text-xs flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-600" />
          <span className="font-mono">{formatTime(remainingSeconds)}</span>
        </div>

        <button
          type="button"
          onClick={onEndInterview}
          disabled={isProcessing}
          className="px-6 py-2 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          End Interview
        </button>
      </div>
    </header>
  );
};

export default InterviewHeader;
