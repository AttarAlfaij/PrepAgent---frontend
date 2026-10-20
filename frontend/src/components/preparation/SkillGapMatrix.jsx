import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Star,
} from 'lucide-react';
import Card from '../common/Card';

const SkillGapMatrix = ({ requirementAnalysis = [] }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: requirementAnalysis.length,
      strong: requirementAnalysis.filter((r) => r.status === 'strong').length,
      partial: requirementAnalysis.filter((r) => r.status === 'partial').length,
      needs_practice: requirementAnalysis.filter((r) => r.status === 'needs_practice').length,
      missing: requirementAnalysis.filter((r) => r.status === 'missing').length,
    };
  }, [requirementAnalysis]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return requirementAnalysis.filter((row) => {
      const matchesFilter = filter === 'all' || row.status === filter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        row.requirement.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query) ||
        row.candidateEvidence.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [requirementAnalysis, filter, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'strong':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Strong</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            <span>Partial</span>
          </span>
        );
      case 'needs_practice':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/80">
            <Clock className="w-3 h-3 text-orange-500" />
            <span>Needs Practice</span>
          </span>
        );
      case 'missing':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Missing</span>
          </span>
        );
    }
  };

  return (
    <Card padding="p-4 sm:p-5" className="border-slate-200/90 shadow-xs h-full flex flex-col justify-between">
      <div>
        {/* Header & Filter Controls matching reference mockup */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">Skill Gap Matrix</h3>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'all', label: `All (${counts.all})` },
              { id: 'strong', label: `Strong (${counts.strong})` },
              { id: 'partial', label: `Partial (${counts.partial})` },
              { id: 'needs_practice', label: `Needs Practice (${counts.needs_practice})` },
              { id: 'missing', label: `Missing (${counts.missing})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filter === tab.id
                    ? 'bg-royal-600 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Search Bar */}
        <div className="pt-2.5 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requirement, category, or evidence..."
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-royal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Table Container with compact row heights */}
        <div className="w-full max-w-full overflow-x-auto max-h-[350px] overflow-y-auto scrollbar-thin">
          <table className="w-full min-w-[560px] text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 z-10">
              <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-2.5 w-8">#</th>
                <th className="py-2 px-2.5">Job Requirement</th>
                <th className="py-2 px-2.5">Category</th>
                <th className="py-2 px-2.5">Your Evidence</th>
                <th className="py-2 px-2.5">Status</th>
                <th className="py-2 px-2.5">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-2.5 px-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-2.5 font-bold text-slate-900">
                      <span className="group-hover:text-royal-600 transition-colors">
                        {row.requirement}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-500 font-medium whitespace-nowrap">{row.category}</td>
                    <td className="py-2.5 px-2.5 text-slate-700 max-w-xs">
                      <p className="line-clamp-1 leading-snug">{row.candidateEvidence}</p>
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">{getStatusBadge(row.status)}</td>
                    <td className="py-2.5 px-2.5 text-slate-500 font-medium whitespace-nowrap text-[11px]">
                      {row.confidence}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                    No requirements match the selected filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default SkillGapMatrix;
