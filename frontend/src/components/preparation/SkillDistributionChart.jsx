import React from 'react';
import { PieChart, Trophy, Target } from 'lucide-react';
import Card from '../common/Card';

const SkillDistributionChart = ({
  strongCount = 12,
  partialCount = 6,
  needsPracticeCount = 4,
  missingCount = 3,
  topStrengths = ['Java', 'SQL', 'Git', 'Postman', 'Problem Solving'],
  areasToFocus = ['Selenium', 'Test Automation', 'Jenkins'],
}) => {
  const total = strongCount + partialCount + needsPracticeCount + missingCount || 1;

  const pctStrong = Math.round((strongCount / total) * 100);
  const pctPartial = Math.round((partialCount / total) * 100);
  const pctNeeds = Math.round((needsPracticeCount / total) * 100);
  const pctMissing = 100 - (pctStrong + pctPartial + pctNeeds);

  // SVG Donut calculation
  const radius = 54;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const strongDash = (strongCount / total) * circumference;
  const partialDash = (partialCount / total) * circumference;
  const needsDash = (needsPracticeCount / total) * circumference;
  const missingDash = (missingCount / total) * circumference;

  const strongOffset = 0;
  const partialOffset = -strongDash;
  const needsOffset = -(strongDash + partialDash);
  const missingOffset = -(strongDash + partialDash + needsDash);

  return (
    <Card padding="p-4 sm:p-5" className="border-slate-200/90 shadow-xs h-full flex flex-col justify-between">
      <div>
        {/* Header matching reference mockup */}
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Skill Distribution</h3>
        </div>

        {/* Donut & Side Legend */}
        <div className="flex flex-col min-[440px]:flex-row items-center justify-center gap-4 sm:gap-5 my-2">
          {/* SVG Donut */}
          <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
              {/* Background ring */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {/* Strong segment */}
              {strongCount > 0 && (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="#3B82F6"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strongDash} ${circumference}`}
                  strokeDashoffset={strongOffset}
                />
              )}
              {/* Partial segment */}
              {partialCount > 0 && (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${partialDash} ${circumference}`}
                  strokeDashoffset={partialOffset}
                />
              )}
              {/* Needs practice segment */}
              {needsPracticeCount > 0 && (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="#f97316"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${needsDash} ${circumference}`}
                  strokeDashoffset={needsOffset}
                />
              )}
              {/* Missing segment */}
              {missingCount > 0 && (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="#f43f5e"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${missingDash} ${circumference}`}
                  strokeDashoffset={missingOffset}
                />
              )}
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900 leading-tight">{total}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-tight">
                Total<br />Requirements
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 text-xs flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
                <span className="text-slate-700 font-medium truncate text-[11px]">Strong Skills</span>
              </div>
              <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                {strongCount} <span className="text-slate-400 font-normal">({pctStrong}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium truncate text-[11px]">Partial / Transferable</span>
              </div>
              <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                {partialCount} <span className="text-slate-400 font-normal">({pctPartial}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium truncate text-[11px]">Needs Practice</span>
              </div>
              <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                {needsPracticeCount} <span className="text-slate-400 font-normal">({pctNeeds}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium truncate text-[11px]">Missing Skills</span>
              </div>
              <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                {missingCount} <span className="text-slate-400 font-normal">({pctMissing}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Strengths & Areas to Focus */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top Strengths */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Top Strengths</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {topStrengths.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/70 text-[11px] font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Areas to Focus */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
            <Target className="w-3.5 h-3.5 text-rose-600" />
            <span>Areas to Focus</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {areasToFocus.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200/70 text-[11px] font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SkillDistributionChart;
