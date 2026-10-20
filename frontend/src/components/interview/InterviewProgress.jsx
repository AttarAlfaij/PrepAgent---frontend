import React from 'react';

const InterviewProgress = ({ questionNumber = 1, totalQuestions = 12 }) => {
  const percent = Math.min(100, Math.round((questionNumber / totalQuestions) * 100));

  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div
        className="bg-royal-600 h-2 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

export default InterviewProgress;
