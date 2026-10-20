import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Target,
  Flame,
  GitMerge,
  Code2,
  BarChart3,
  FolderGit2,
  FileText,
  Users2,
  Calendar,
  ListChecks,
  RotateCw,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Clock,
  BookOpen,
  Layers,
  Printer,
  ShieldAlert,
  MessageSquare,
  Users,
  Folder,
  ArrowUpRight,
} from 'lucide-react';
import { preparationService } from '../services/preparationService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const JobPreparationPlan = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data states
  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [updatingItemId, setUpdatingItemId] = useState(null);

  // Load preparation plan
  const loadPlan = useCallback(
    async (force = false) => {
      try {
        if (force) setRegenerating(true);
        else setLoading(true);
        setError(null);

        let res;
        if (force) {
          res = await preparationService.regeneratePreparationPlan(sessionId);
        } else {
          res = await preparationService.getPreparationPlan(sessionId);
        }

        if (res.success) {
          setPlan(res.jobPreparationPlan);
          setSession({
            company: res.company,
            targetRole: res.targetRole,
            customRole: res.customRole,
            displayRole: res.displayRole,
            progress: res.progress,
          });
        }
      } catch (err) {
        console.error('Failed to load Job Preparation Plan:', err);
        if (err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError(err.response?.data?.message || 'Failed to load preparation plan. Please try again.');
        }
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    loadPlan(false);
  }, [loadPlan]);

  // Handle toggling interactive items
  const handleToggle = async (updatePayload, itemIdKey) => {
    try {
      setUpdatingItemId(itemIdKey);

      // Optimistic UI update
      setPlan((prevPlan) => {
        if (!prevPlan) return prevPlan;
        const newPlan = JSON.parse(JSON.stringify(prevPlan));

        if (updatePayload.type === 'schedule') {
          const week = newPlan.schedule?.find((w) => w.weekNumber === Number(updatePayload.weekNumber));
          const day = week?.days?.find((d) => d.day === updatePayload.day);
          if (day) day.completed = updatePayload.completed;
        } else if (updatePayload.type === 'resume') {
          const item = newPlan.resumePreparation?.find((r) => r.id === updatePayload.itemId);
          if (item) item.completed = updatePayload.completed;
        } else if (updatePayload.type === 'readiness') {
          const item = newPlan.readinessChecklist?.find((r) => r.id === updatePayload.itemId);
          if (item) item.completed = updatePayload.completed;
        } else if (updatePayload.type === 'technical') {
          const item = newPlan.technicalPreparation?.find((t) => t.topic === updatePayload.topic);
          if (item) item.completed = updatePayload.completed;
        }

        return newPlan;
      });

      const res = await preparationService.updatePreparationPlanProgress(sessionId, updatePayload);
      if (res.success && res.jobPreparationPlan) {
        setPlan(res.jobPreparationPlan);
      }
    } catch (err) {
      console.error('Failed to update item progress:', err);
      // Revert on error
      loadPlan(false);
    } finally {
      setUpdatingItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <LoadingSpinner size="lg" />
        <h3 className="mt-4 text-base font-bold text-slate-800">Building Your Job Preparation Plan</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Synthesizing your skill gap analysis, target company requirements, and projects into a 6-week roadmap...
        </p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          You do not have permission to view this preparation session.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const companyName = session?.company || 'Target Company';
  const roleName = session?.displayRole || session?.targetRole || 'Target Role';
  const readinessScore = plan?.readinessScore ?? 62;

  // Compute readiness checklist completed count
  const readinessChecklist = plan?.readinessChecklist || [];
  const completedChecklistCount = readinessChecklist.filter((c) => c.completed).length;
  const totalChecklistCount = readinessChecklist.length || 6;

  // Active week schedule
  const activeWeekSchedule = plan?.schedule?.find((w) => w.weekNumber === activeWeek) || plan?.schedule?.[0];
  const activeWeekCompletedDays = activeWeekSchedule?.days?.filter((d) => d.completed).length || 0;
  const activeWeekTotalDays = activeWeekSchedule?.days?.length || 7;

  // Icon mapper helper for behavioral topics
  const renderBehavioralIcon = (iconName) => {
    switch (iconName) {
      case 'users':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'git-branch':
        return <GitMerge className="w-4 h-4 text-royal-600" />;
      case 'shield-alert':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'message-square':
        return <MessageSquare className="w-4 h-4 text-[#5B4CE2]" />;
      default:
        return <Users2 className="w-4 h-4 text-royal-600" />;
    }
  };

  // Helper for priority badges
  const renderPriorityBadge = (priority) => {
    if (priority === 'High') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          High
        </span>
      );
    }
    if (priority === 'Medium') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          Medium
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        Low
      </span>
    );
  };

  // Helper for level badges
  const renderLevelBadge = (level) => {
    const l = (level || '').toLowerCase();
    if (l.includes('beginner')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          {level}
        </span>
      );
    }
    if (l.includes('intermediate')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {level}
        </span>
      );
    }
    if (l.includes('advanced')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#C7D7FE]">
          {level}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
        {level}
      </span>
    );
  };

  // Circular gauge calculations (SVG radius = 48, circum = 2 * PI * 48 = 301.59)
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto text-slate-800">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 overflow-x-auto pb-1">
        <Link to="/dashboard" className="hover:text-royal-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <Link to="/dashboard#preparations" className="hover:text-royal-600 transition-colors">
          Preparations
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <Link to={`/preparation/${sessionId}`} className="hover:text-royal-600 transition-colors">
          {companyName} Preparation
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <Link to={`/preparation/${sessionId}/tailored-resume`} className="hover:text-royal-600 transition-colors">
          Improve Your Resume
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-slate-900 font-bold">Job Preparation Plan</span>
      </nav>

      {/* 2. Top Navigation Links Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
        <Link
          to={`/preparation/${sessionId}/tailored-resume`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-royal-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Improve Your Resume</span>
        </Link>

        <button
          onClick={() => navigate(`/preparation/${sessionId}/job-readiness-twin`)}
          className="inline-flex items-center gap-1 text-royal-600 hover:text-royal-700 font-semibold transition-colors"
        >
          <span>Next: AI Job Readiness Twin</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadPlan(false)}>
            Try Again
          </Button>
        </div>
      )}

      {/* 3. Header Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Job Preparation Plan</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Plan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={regenerating}
            onClick={() => loadPlan(true)}
            className="flex items-center gap-1.5 text-xs text-royal-600 hover:text-royal-700 border-royal-200 hover:bg-royal-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'Regenerating...' : 'Regenerate Plan'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            disabled={!sessionId}
            onClick={() => {
              if (sessionId) {
                navigate(`/preparation/${sessionId}/job-readiness-twin`);
              }
            }}
            className="text-xs font-semibold whitespace-nowrap shadow-sm"
          >
            Continue Next
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 1: Preparation Readiness (Left) + Top Preparation Priorities (Right) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card 1: Preparation Readiness */}
        <Card className="lg:col-span-7 flex flex-col justify-between" padding="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Preparation Readiness</h3>
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                readinessScore >= 80
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#C7D7FE]'
                  : 'bg-royal-50 text-royal-700 border-royal-200'
              }`}
            >
              {readinessScore >= 80 ? 'Interview Ready' : 'In Progress'}
            </span>
          </div>

          <div className="py-6 flex flex-col sm:flex-row items-center gap-6">
            {/* Circular SVG Gauge */}
            <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="text-slate-100"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Progress Stroke */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="url(#readinessGrad)"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Gauge Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="text-3xl font-black tracking-tight text-slate-900 leading-none">
                  {readinessScore}%
                </span>
                <span className="text-[8px] font-extrabold tracking-wider text-slate-400 uppercase mt-1">
                  PREPARATION
                  <br />
                  COMPLETE
                </span>
              </div>
            </div>

            {/* Headline and Description */}
            <div className="flex-1 space-y-2.5 text-center sm:text-left">
              <h4 className="text-base font-extrabold text-slate-900">
                {plan?.headline || 'You are on the right track!'}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {plan?.explanation ||
                  `Based on your skill gap analysis and target role, this plan focuses on the most important areas to help you crack the interview at ${companyName}.`}
              </p>
            </div>
          </div>

          {/* 3 Stat Chips */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 min-[380px]:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center flex flex-col items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-royal-600 mb-1" />
              <span className="text-xs font-black text-slate-800 leading-tight">
                {plan?.stagesCount || 6} Stages
              </span>
              <span className="text-[10px] text-slate-400">Preparation Stages</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center flex flex-col items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 mb-1" />
              <span className="text-xs font-black text-slate-800 leading-tight">
                {plan?.topicsCount || 28} Key Topics
              </span>
              <span className="text-[10px] text-slate-400">Target Competencies</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center flex flex-col items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-[#315BEA] mb-1" />
              <span className="text-xs font-black text-slate-800 leading-tight">
                {plan?.estimatedWeeks || 6} Weeks
              </span>
              <span className="text-[10px] text-slate-400">Estimated Duration</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Top Preparation Priorities */}
        <Card className="lg:col-span-5 flex flex-col justify-between" padding="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Top Preparation Priorities</h3>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              5 Key Areas
            </span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 my-2">
            {(plan?.priorities || []).map((p, idx) => (
              <div key={p.rank || idx} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-royal-50 border border-royal-200/60 text-royal-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {p.rank || idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.topic}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{p.reason}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">{renderPriorityBadge(p.priority)}</div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 text-center">
            Derived directly from your verified skills vs {companyName} JD requirements
          </div>
        </Card>
      </div>



      {/* ========================================================================= */}
      {/* ROW 3: Technical Preparation Table (Left) + Skill Gap Preparation (Right) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card 4: Technical Preparation */}
        <Card className="lg:col-span-7 flex flex-col justify-between" padding="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Technical Preparation</h3>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Core Competencies
            </span>
          </div>

          <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 pr-3">Topic</th>
                  <th className="pb-2.5 px-3">Category</th>
                  <th className="pb-2.5 px-3">Priority</th>
                  <th className="pb-2.5 px-3">Current</th>
                  <th className="pb-2.5 px-3">Target</th>
                  <th className="pb-2.5 px-3">Est. Time</th>
                  <th className="pb-2.5 pl-3 text-right">Mastered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(plan?.technicalPreparation || []).map((t, idx) => (
                  <tr key={t.topic || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pr-3 font-bold text-slate-900">
                      <span className={t.completed ? 'line-through text-slate-400' : ''}>{t.topic}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {t.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-3">{renderPriorityBadge(t.priority)}</td>
                    <td className="py-3 px-3">{renderLevelBadge(t.currentLevel)}</td>
                    <td className="py-3 px-3">{renderLevelBadge(t.targetLevel)}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] font-medium">{t.estimatedTime}</td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        onClick={() =>
                          handleToggle(
                            { type: 'technical', topic: t.topic, completed: !t.completed },
                            `tech-${t.topic}`
                          )
                        }
                        disabled={updatingItemId === `tech-${t.topic}`}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ml-auto ${
                          t.completed
                            ? 'bg-[#2563EB] border-[#2563EB] text-white'
                            : 'border-slate-300 hover:border-royal-400 text-transparent'
                        }`}
                        title={t.completed ? 'Mark unmastered' : 'Mark mastered'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Click the checkmark to mark topics mastered and update your readiness score.</span>
          </div>
        </Card>

        {/* Card 5: Skill Gap Preparation (2x2 Grid) */}
        <Card className="lg:col-span-5 flex flex-col justify-between" padding="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Skill Gap Preparation</h3>
              </div>
            </div>
            <Link
              to={`/preparation/${sessionId}/skill-gap`}
              className="text-[11px] font-bold text-royal-600 hover:text-royal-700 flex items-center gap-1"
            >
              <span>View Matrix</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-3.5 my-4">
            {/* Strong Skills */}
            <div className="p-4 rounded-xl bg-[#EEF4FF] border border-[#C7D7FE] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#315BEA]">Strong Skills</span>
                <span className="w-2 h-2 rounded-full bg-[#315BEA]" />
              </div>
              <p className="text-2xl font-black text-[#172B4D]">
                {plan?.skillGapSummary?.strongCount ?? 0}
              </p>
              <p className="text-[10px] text-[#64748B] leading-tight mt-1">
                Ready to demonstrate in technical interviews
              </p>
            </div>

            {/* Transferable Skills */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-800">Transferable Skills</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <p className="text-2xl font-black text-blue-900">
                {plan?.skillGapSummary?.transferableCount ?? 0}
              </p>
              <p className="text-[10px] text-blue-700 leading-tight mt-1">
                Bridge knowledge to target job requirements
              </p>
            </div>

            {/* Needs Practice */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-800">Needs Practice</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-900">
                {plan?.skillGapSummary?.needsPracticeCount ?? 0}
              </p>
              <p className="text-[10px] text-amber-700 leading-tight mt-1">
                Priority for hands-on exercises & optimization
              </p>
            </div>

            {/* Missing Skills */}
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-rose-800">Missing Skills</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-900">
                {plan?.skillGapSummary?.missingCount ?? 0}
              </p>
              <p className="text-[10px] text-rose-700 leading-tight mt-1">
                Focus core initial study time directly here
              </p>
            </div>
          </div>

          {/* Advice banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Pro Tip:</span> Allocate 60% of your weekly study blocks to
              Missing Skills and Needs Practice areas to maximize your score increase.
            </p>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* ROW 4: Project Preparation (1/3) + Resume Preparation (1/3) + Behavioral (1/3) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 6: Project Preparation */}
        <Card className="flex flex-col justify-between" padding="p-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Project Preparation</h3>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Real Projects
              </span>
            </div>

            <div className="space-y-3.5">
              {(plan?.projectPreparation || []).map((proj, idx) => (
                <div
                  key={proj.projectName || idx}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-royal-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Folder className="w-3.5 h-3.5 text-royal-600 flex-shrink-0" />
                      <h4 className="text-xs font-bold text-slate-900 truncate">{proj.projectName}</h4>
                    </div>
                    {renderPriorityBadge(proj.priority)}
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">{proj.projectRelevance}</p>

                  <ul className="space-y-1.5 text-[11px] text-slate-600">
                    {(proj.preparationPoints || []).map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-royal-500 mt-1.5 flex-shrink-0" />
                        <span className="leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center mt-4">
            Practice articulating architecture, trade-offs, and metrics out loud.
          </div>
        </Card>

        {/* Card 7: Resume Preparation */}
        <Card className="flex flex-col justify-between" padding="p-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Resume Preparation</h3>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#C7D7FE]">
                Checklist
              </span>
            </div>

            <div className="space-y-2.5">
              {(plan?.resumePreparation || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    handleToggle(
                      { type: 'resume', itemId: item.id, completed: !item.completed },
                      `resume-${item.id}`
                    )
                  }
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all ${
                    item.completed
                      ? 'bg-[#EFF6FF]/60 border-[#C7D7FE] text-slate-400'
                      : 'bg-white border-slate-200/80 hover:border-royal-300 text-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      item.completed
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : 'border-slate-300 hover:border-royal-500'
                    }`}
                  >
                    {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={`text-xs leading-snug font-medium ${item.completed ? 'line-through' : ''}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to={`/preparation/${sessionId}/tailored-resume`}
            className="pt-3 border-t border-slate-100 text-[11px] font-bold text-royal-600 hover:text-royal-700 flex items-center justify-center gap-1 mt-4"
          >
            <span>Open Tailored Resume Editor</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        {/* Card 8: Behavioral Preparation */}
        <Card className="flex flex-col justify-between" padding="p-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                  <Users2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Behavioral Preparation</h3>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-royal-50 text-royal-700 border border-royal-200">
                STAR Method
              </span>
            </div>

            <div className="space-y-2.5">
              {(plan?.behavioralPreparation || []).map((b, idx) => (
                <div
                  key={b.topic || idx}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between gap-2.5 hover:border-royal-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      {renderBehavioralIcon(b.icon)}
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{b.topic}</p>
                  </div>
                  <div className="flex-shrink-0">{renderPriorityBadge(b.priority)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center mt-4">
            Frame each answer around Situation, Task, Action, and Quantified Result.
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* ROW 5: Preparation Schedule (7 cols) + Checklist & Next Step (5 cols) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card 9: Preparation Schedule */}
        <Card className="lg:col-span-7 flex flex-col justify-between" padding="p-6">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Preparation Schedule</h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-royal-50 text-royal-700 border border-royal-200 self-start sm:self-auto">
                Week {activeWeek}: {activeWeekCompletedDays} of {activeWeekTotalDays} Days Done
              </span>
            </div>

            {/* Week Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-100 select-none scrollbar-thin">
              {[1, 2, 3, 4, 5, 6].map((wNum) => {
                const isSelected = activeWeek === wNum;
                const weekData = plan?.schedule?.find((w) => w.weekNumber === wNum);
                const allDone = weekData?.days?.length > 0 && weekData.days.every((d) => d.completed);
                return (
                  <button
                    key={wNum}
                    onClick={() => setActiveWeek(wNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      isSelected
                        ? 'bg-royal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>Week {wNum}</span>
                    {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Week Subtitle */}
            <div className="mb-3">
              <h4 className="text-xs font-bold text-slate-800">
                {activeWeekSchedule?.title || `Week ${activeWeek} Plan`}
              </h4>
            </div>

            {/* Daily Tasks List */}
            <div className="space-y-2">
              {(activeWeekSchedule?.days || []).map((d) => (
                <div
                  key={d.day}
                  onClick={() =>
                    handleToggle(
                      {
                        type: 'schedule',
                        weekNumber: activeWeek,
                        day: d.day,
                        completed: !d.completed,
                      },
                      `day-${activeWeek}-${d.day}`
                    )
                  }
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                    d.completed
                      ? 'bg-emerald-50/40 border-emerald-200/80 text-slate-400'
                      : 'bg-white border-slate-200/80 hover:border-royal-300 text-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-14 text-center py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold flex-shrink-0">
                      {d.day}
                    </span>
                    <span className={`text-xs font-medium truncate ${d.completed ? 'line-through text-slate-400' : ''}`}>
                      {d.task}
                    </span>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                      d.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-royal-500'
                    }`}
                  >
                    {d.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center mt-4">
            Marking days complete updates your live readiness score and feeds into the Twin evaluation.
          </div>
        </Card>

        {/* Right Column: Card 10 (Readiness Checklist) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Card 10: Readiness Checklist */}
          <Card padding="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Readiness Checklist</h3>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-royal-50 text-royal-700 border border-royal-200">
                {completedChecklistCount} / {totalChecklistCount} completed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-royal-600 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedChecklistCount / totalChecklistCount) * 100}%` }}
              />
            </div>

            <div className="space-y-2">
              {readinessChecklist.map((m) => (
                <div
                  key={m.id}
                  onClick={() =>
                    handleToggle(
                      { type: 'readiness', itemId: m.id, completed: !m.completed },
                      `milestone-${m.id}`
                    )
                  }
                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer select-none transition-all ${
                    m.completed
                      ? 'bg-emerald-50/40 border-emerald-200/80 text-slate-400'
                      : 'bg-white border-slate-200/80 hover:border-royal-300 text-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      m.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-royal-500'
                    }`}
                  >
                    {m.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={`text-xs leading-tight font-medium ${m.completed ? 'line-through' : ''}`}>
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default JobPreparationPlan;
