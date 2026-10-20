import React from 'react';
import { MAX_ANSWER_DURATION } from '../../pages/MockInterview';

const AnswerTimer = ({ answerDuration = 0, formatTime }) => {
  const maxDuration = MAX_ANSWER_DURATION || 50;
  const progressPercent = Math.min(100, Math.round((answerDuration / maxDuration) * 100));
  const isUrgent = answerDuration >= 40;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">Answer Duration:</span>
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg border transition-colors ${
            isUrgent
              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              : answerDuration > 0
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {formatTime ? formatTime(answerDuration) : '00:00'} / {formatTime ? formatTime(maxDuration) : '00:50'}
        </span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            isUrgent ? 'bg-rose-500' : 'bg-royal-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

export default AnswerTimer;
