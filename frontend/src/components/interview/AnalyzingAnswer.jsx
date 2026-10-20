import React from 'react';
import { RotateCw, Sparkles, Check } from 'lucide-react';

const AnalyzingAnswer = ({ step = 1 }) => {
  return (
    <div className="bg-white rounded-2xl border border-indigo-200/80 p-6 shadow-xs flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-spin">
            <RotateCw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">✨ Analyzing Your Answer</h3>
            <p className="text-xs text-slate-500">
              Please wait while the AI Interviewer evaluates your response and adapts the next question...
            </p>
          </div>
        </div>

        {/* 5-Step Dynamic Evaluation Checklist */}
        <div className="space-y-3 mt-6">
          <div className="flex items-center gap-3 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${step >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step >= 1 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
            </div>
            <span className={step >= 1 ? 'font-bold text-slate-800' : 'text-slate-400'}>
              Audio stream transcription & NLP cleaning
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${step >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step >= 2 ? <Check className="w-3 h-3 stroke-[3]" /> : '2'}
            </div>
            <span className={step >= 2 ? 'font-bold text-slate-800' : 'text-slate-400'}>
              Semantic evaluation & technical accuracy assessment
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${step >= 3 ? 'bg-emerald-500 text-white' : step === 2 ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              {step >= 3 ? <Check className="w-3 h-3 stroke-[3]" /> : '3'}
            </div>
            <span className={step >= 3 ? 'font-bold text-slate-800' : 'text-slate-400'}>
              Dynamic alignment with resume & job description gaps
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${step >= 4 ? 'bg-emerald-500 text-white' : step === 3 ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              {step >= 4 ? <Check className="w-3 h-3 stroke-[3]" /> : '4'}
            </div>
            <span className={step >= 4 ? 'font-bold text-slate-800' : 'text-slate-400'}>
              Generating contextual adaptive follow-up question
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${step >= 5 ? 'bg-emerald-500 text-white' : step === 4 ? 'bg-royal-100 text-royal-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              {step >= 5 ? <Check className="w-3 h-3 stroke-[3]" /> : '5'}
            </div>
            <span className={step >= 5 ? 'font-bold text-slate-800' : 'text-slate-400'}>
              Updating Job Readiness Twin performance snapshot
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
        <span>The next question will be spoken by Sarah automatically once analysis finishes.</span>
      </div>
    </div>
  );
};

export default AnalyzingAnswer;
