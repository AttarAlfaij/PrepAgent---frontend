import React from 'react';
import { Trophy, Sparkles, Target, BarChart3, ExternalLink } from 'lucide-react';

const InterviewComplete = ({
  mockSession = {},
  displayRole = '',
  displayCompany = '',
  overallElapsedSeconds = 0,
  totalQuestions = 0,
  coverage = {},
  onRetakeInterview,
  onNavigateToReport,
  onNavigateToDashboard,
}) => {
  const answersCount = mockSession?.answers?.length || 0;
  const durationMinutes = Math.max(1, Math.round(overallElapsedSeconds / 60));
  const uniqueTopics = new Set((mockSession?.questions || []).map((q) => q.topic || q.category)).size;
  const integritySignalsCount = mockSession?.integritySignals?.length || 0;
  const overallPerformance = mockSession?.performanceSnapshot?.overallPerformance || 0;
  const badgeText = mockSession?.performanceSnapshot?.badgeText || 'Interview Complete';
  const summaryText =
    mockSession?.performanceSnapshot?.summary ||
    'You have completed the interview. Your evaluation report is being generated.';
  const coveragePct = Math.round(coverage?.overall || mockSession?.coverage?.overall || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-md mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">🎉 Interview Complete!</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Great effort! You have completed the PrepAgent AI Mock Interview for <strong>{displayRole}</strong> at <strong>{displayCompany}</strong>.
        </p>
      </div>

      {/* Session summary metrics */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-royal-600" />
          <span>Session Summary</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Questions</span>
            <p className="text-base font-extrabold text-slate-800 mt-0.5">{answersCount}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
            <p className="text-base font-extrabold text-slate-800 mt-0.5">{durationMinutes} min</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Topics</span>
            <p className="text-base font-extrabold text-slate-800 mt-0.5">{uniqueTopics}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Coverage</span>
            <p className="text-base font-extrabold text-royal-700 mt-0.5">{coveragePct}%</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Integrity</span>
            <p className="text-base font-extrabold text-emerald-600 mt-0.5">{integritySignalsCount}</p>
          </div>
        </div>
      </div>

      {/* Preliminary performance snapshot */}
      {overallPerformance > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-center gap-6">
          {/* Donut gauge */}
          <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#EFF6FF" strokeWidth="9" fill="transparent" />
              <circle
                cx="50" cy="50" r="40" stroke="#2563EB" strokeWidth="9"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - overallPerformance / 100)}
                strokeLinecap="round" fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-slate-900">{overallPerformance}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Score</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-1.5">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{summaryText}</p>
            <p className="text-[11px] text-slate-400 italic">
              Full evaluation report ready — includes per-question analysis, skill gap performance, and actionable recommendations.
            </p>
          </div>
        </div>
      )}

      {/* Navigation actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onNavigateToDashboard}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
        >
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetakeInterview}
            className="px-4 py-2.5 rounded-xl border border-royal-200 bg-royal-50 hover:bg-royal-100 text-royal-700 font-bold text-xs transition-all cursor-pointer"
          >
            Retake Interview
          </button>

          <button
            type="button"
            onClick={onNavigateToReport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-royal-600 to-indigo-600 hover:from-royal-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            <span>View Full Evaluation Report →</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewComplete;
