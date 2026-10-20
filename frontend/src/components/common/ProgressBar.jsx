import React from 'react';

const ProgressBar = ({ progress = 0, showLabel = true, size = 'md', className = '' }) => {
  const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const isCompleted = safeProgress >= 100;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
          <span className="text-[#64748B]">Progress</span>
          <span className={`font-semibold ${isCompleted ? 'text-[#2563EB]' : 'text-[#172B4D]'}`}>
            {safeProgress}%
          </span>
        </div>
      )}
      <div className={`w-full bg-[#E2E8F0] rounded-full overflow-hidden ${heights[size] || heights.md}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isCompleted ? 'bg-[#2563EB]' : 'bg-[#315BEA]'
          }`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
