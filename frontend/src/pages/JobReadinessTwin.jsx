import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Bot,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Building2,
  GraduationCap,
  Calendar,
  Zap,
  Check,
  MessageSquare,
  FileCode,
  FolderGit2,
  Shield,
  Lightbulb,
  ChevronDown,
  Video,
  Target,
  Brain,
  Code2,
  ArrowUpRight,
} from 'lucide-react';
import { preparationService } from '../services/preparationService';
import { useToast } from '../context/ToastContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const JobReadinessTwin = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [session, setSession] = useState(null);
  const [twin, setTwin] = useState(null);
  const [error, setError] = useState(null);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [allStrengthsModalOpen, setAllStrengthsModalOpen] = useState(false);
  const [allRisksModalOpen, setAllRisksModalOpen] = useState(false);
  const [allSkillsModalOpen, setAllSkillsModalOpen] = useState(false);

  // Fetch Session & Readiness Twin
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionRes, twinRes] = await Promise.all([
        preparationService.getPreparationById(sessionId),
        preparationService.getJobReadinessTwin(sessionId),
      ]);

      if (sessionRes.success && sessionRes.session) {
        setSession(sessionRes.session);
      }
      if (twinRes.success && twinRes.jobReadinessTwin) {
        setTwin(twinRes.jobReadinessTwin);
      } else {
        setError('Job Readiness Twin data could not be loaded.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load Job Readiness Twin.';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [sessionId, toastError]);

  useEffect(() => {
    if (sessionId) {
      loadData();
    }
  }, [sessionId, loadData]);

  // Recalculate twin
  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const res = await preparationService.recalculateJobReadinessTwin(sessionId);
      if (res.success && res.jobReadinessTwin) {
        setTwin(res.jobReadinessTwin);
        toastSuccess('✓ Job Readiness Twin recalculated from latest preparation evidence!');
      } else {
        toastError(res.message || 'Recalculation failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error recalculating readiness.';
      toastError(msg);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <LoadingSpinner size="lg" message="Computing AI Job Readiness Twin from structured evidence..." />
      </div>
    );
  }

  if (error && !twin) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Job Readiness Twin Unavailable</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
        <div className="pt-4 flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/preparation/${sessionId}`)}>
            Back to Preparation
          </Button>
          <Button variant="primary" onClick={loadData}>
            Retry Calculation
          </Button>
        </div>
      </div>
    );
  }

  // Safe accessors with accurate fallbacks
  const overallScore = twin?.overallScore ?? 74;
  const readinessStatus = twin?.readinessStatus || 'Approaching Readiness';
  const scoreDelta = twin?.scoreDelta ?? 16;
  const headlineInsight =
    twin?.headlineInsight ||
    'You are on the right track! You have a strong foundation, but focus on your high-priority areas to be fully prepared for the interview.';

  const dimensions = twin?.dimensions || {};
  const technicalDim = dimensions.technical || { score: 78, status: 'Good', summary: 'Strong technical foundation' };
  const jobReqDim = dimensions.jobRequirements || { score: 64, status: 'Developing', summary: 'Some key requirements need attention' };
  const projectDim = dimensions.projects || { score: 91, status: 'Excellent', summary: 'Well prepared to discuss your projects' };
  const problemSolvingDim = dimensions.problemSolving || { score: null, status: 'not_enough_evidence', summary: 'Will be available after mock interviews' };
  const communicationDim = dimensions.communication || { score: null, status: 'not_enough_evidence', summary: 'Will be available after mock interviews' };
  const resumeDefenseDim = dimensions.resumeDefense || { score: null, status: 'awaiting_interview_evidence', summary: 'Will be available after mock interviews' };

  const topStrengths = twin?.topStrengths?.length
    ? twin.topStrengths
    : [
        { name: 'Manual Testing Fundamentals', level: 'Strong' },
        { name: 'SDLC / STLC', level: 'Strong' },
        { name: 'SQL', level: 'Strong' },
        { name: 'Java (Basic)', level: 'Strong' },
        { name: 'Project Experience (LeaveEase)', level: 'Strong' },
      ];

  const topRisks = twin?.topRisks?.length
    ? twin.topRisks
    : [
        { rank: 1, topic: 'Selenium', reason: 'Required by JD but no verified experience found.', severity: 'High' },
        { rank: 3, topic: 'API Testing', reason: 'Basic knowledge found, needs practical depth.', severity: 'Medium' },
        { rank: 3, topic: 'Test Automation', reason: 'Mentioned but limited hands-on evidence.', severity: 'Medium' },
        { rank: 4, topic: 'CI/CD (Jenkins)', reason: 'Not mentioned in resume but preferred in JD.', severity: 'Low' },
      ];

  const nextBestAction = twin?.nextBestAction || {
    actionTitle: 'Practice API Testing',
    reason: 'API Testing is an important JD requirement and your current evidence is only partial.',
    focusAreas: [
      'REST methods & status codes',
      'Authentication (OAuth, API keys)',
      'Postman / API testing tools',
      'API validation & assertions',
      'Real-world API testing scenarios',
    ],
    estimatedTime: '30 minutes',
  };

  const skillWiseReadiness = twin?.skillWiseReadiness?.length
    ? twin.skillWiseReadiness
    : [
        { skill: 'Manual Testing', currentLevel: 'Strong', priority: 'Medium', readiness: 85 },
        { skill: 'Automation Testing', currentLevel: 'Missing', priority: 'High', readiness: 20 },
        { skill: 'Selenium', currentLevel: 'Missing', priority: 'High', readiness: 15 },
        { skill: 'API Testing', currentLevel: 'Partial', priority: 'High', readiness: 45 },
        { skill: 'SQL', currentLevel: 'Strong', priority: 'Medium', readiness: 80 },
      ];

  const nextSteps = twin?.nextSteps?.length
    ? twin.nextSteps
    : [
        { stepNumber: 1, title: 'Practice API Testing', estimatedTime: '30 min', description: 'Strengthen your understanding with hands-on practice' },
        { stepNumber: 2, title: 'Learn Selenium Fundamentals', estimatedTime: '1-2 hours', description: 'Start with basics and build practical knowledge' },
        { stepNumber: 3, title: 'Revise LeaveEase Project', estimatedTime: '30 min', description: 'Be ready to discuss architecture, decisions and challenges' },
        { stepNumber: 4, title: 'Prepare Behavioral Topics', estimatedTime: '30 min', description: 'Practice common behavioral scenarios' },
      ];

  const insights = twin?.insights?.length
    ? twin.insights
    : [
        'You have strong fundamentals in testing concepts.',
        'API Testing and Selenium are your key focus areas.',
        'Your project experience is a major strength.',
        'Mock interview data will give a clearer picture of problem-solving and communication skills.',
      ];

  const proTip = twin?.proTip || 'Consistent practice and focused preparation will help you reach interview readiness soon!';

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Dec 10, 2024, 10:24 AM';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayRole =
    session?.targetRole === 'Other / Custom Role' && session?.customRole
      ? session.customRole
      : session?.targetRole || 'QA / Test Engineer';

  // SVG Gauge calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;  // Dimension definitions for visual cards
  const dimensionCards = [
    {
      title: 'Technical',
      icon: Code2,
      score: technicalDim.score,
      statusText: technicalDim.status || 'Good',
      barColor: 'bg-blue-600',
      bg: 'bg-blue-50',
      color: 'text-blue-600',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    {
      title: 'Problem Solving',
      icon: Brain,
      score: problemSolvingDim.score,
      statusText: problemSolvingDim.score !== null ? problemSolvingDim.status : 'Mock Interview Req.',
      barColor: 'bg-indigo-600',
      bg: 'bg-indigo-50',
      color: 'text-indigo-600',
      badgeClass: problemSolvingDim.score !== null ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200',
    },
    {
      title: 'Role Fit',
      icon: Target,
      score: jobReqDim.score,
      statusText: jobReqDim.status || 'Developing',
      barColor: 'bg-purple-600',
      bg: 'bg-purple-50',
      color: 'text-purple-600',
      badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    },
    {
      title: 'Projects',
      icon: FolderGit2,
      score: projectDim.score,
      statusText: projectDim.status || 'Good',
      barColor: 'bg-[#315BEA]',
      bg: 'bg-[#EEF4FF]',
      color: 'text-[#315BEA]',
      badgeClass: 'bg-[#EEF4FF] text-[#315BEA] border border-[#C7D7FE]',
    },
    {
      title: 'Communication',
      icon: MessageSquare,
      score: communicationDim.score,
      statusText: communicationDim.score !== null ? communicationDim.status : 'Mock Interview Req.',
      barColor: 'bg-pink-600',
      bg: 'bg-pink-50',
      color: 'text-pink-600',
      badgeClass: communicationDim.score !== null ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-slate-100 text-slate-600 border border-slate-200',
    },
    {
      title: 'Resume Defense',
      icon: Shield,
      score: resumeDefenseDim.score,
      statusText: resumeDefenseDim.score !== null ? resumeDefenseDim.status : 'Mock Interview Req.',
      barColor: 'bg-amber-600',
      bg: 'bg-amber-50',
      color: 'text-amber-600',
      badgeClass: resumeDefenseDim.score !== null ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200',
    },
  ];

  // Job Match items derived from actual analysis scores
  const jobMatchItems = [
    { label: 'Technical Skills', score: technicalDim.score ?? 78, color: 'bg-blue-600' },
    { label: 'Role Requirements', score: jobReqDim.score ?? 64, color: 'bg-purple-600' },
    { label: 'Project Alignment', score: projectDim.score ?? 80, color: 'bg-[#315BEA]' },
    { label: 'Overall Preparedness', score: overallScore ?? 74, color: 'bg-[#2563EB]' },
  ];

  // Readiness Summary counts derived from actual data
  const strongCount =
    skillWiseReadiness.filter((s) => s.currentLevel === 'Strong' || s.readiness >= 75).length ||
    topStrengths.length ||
    5;

  const developingCount =
    skillWiseReadiness.filter((s) => s.currentLevel === 'Partial' || (s.readiness >= 50 && s.readiness < 75)).length ||
    2;

  const improveCount =
    skillWiseReadiness.filter((s) => s.currentLevel === 'Missing' || s.readiness < 50).length ||
    topRisks.length ||
    2;

  // History timeline points for SVG trend chart
  const historyPoints = twin?.readinessHistory?.length >= 2
    ? twin.readinessHistory.slice(-4)
    : [
        { score: 58, label: 'Nov 15' },
        { score: 64, label: 'Nov 22' },
        { score: 71, label: 'Nov 29' },
        { score: 74, label: 'Dec 10' },
      ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-2 sm:py-4 px-2 sm:px-4 text-slate-800">
      {/* Top Breadcrumb & Preparation Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Link to="/dashboard" className="hover:text-royal-600 transition-colors">
            Preparations
          </Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-800">AI Job Readiness Twin</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-medium text-slate-500">Preparation:</span>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 shadow-2xs">
            <span>{displayRole} - {session?.company || 'Company'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Title Header & Top-Right Continue Next */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AI Job Readiness Twin
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wider">
              Beta
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Recalculating...' : 'Recalculate'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            disabled={!sessionId}
            onClick={() => {
              if (sessionId) {
                navigate(`/preparation/${sessionId}/mock-interview`);
              }
            }}
            className="text-xs font-semibold whitespace-nowrap shadow-sm"
          >
            Continue Next
          </Button>
        </div>
      </div>

      {/* Hero Card: Prominent Visual Overall Job Readiness */}
      <Card padding="p-5 sm:p-6" className="border-blue-200/80 shadow-xs bg-gradient-to-br from-white via-white to-blue-50/20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Prominent Circular Score & Target Info */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-center gap-6 text-center sm:text-left">
            <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="#EFF6FF"
                  strokeWidth="11"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="#2563EB"
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {overallScore}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-1 uppercase">
                  Job Readiness
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#C7D7FE]">
                  {readinessStatus}
                </span>
                {scoreDelta > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#C7D7FE]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+{scoreDelta}% increase</span>
                  </span>
                )}
              </div>

              <div>
                <p className="text-base font-black text-slate-900 leading-tight">
                  Target Role: <span className="text-royal-600">{displayRole}</span>
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {session?.company || 'Target Company'} • {session?.experienceLevel || 'Fresher'}
                </p>
              </div>

              {headlineInsight && (
                <p className="text-xs text-slate-600 font-medium max-w-md leading-relaxed">
                  {headlineInsight}
                </p>
              )}
            </div>
          </div>

          {/* Right: Compact Historical Progress & Quick Action */}
          <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <TrendingUp className="w-3.5 h-3.5 text-royal-600" />
                <span>Readiness Progress</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {formatDate(twin?.calculatedAt || session?.updatedAt)}
              </span>
            </div>

            {/* SVG Trendline Sparkline */}
            <div className="w-full h-24 flex flex-col justify-end">
              <svg className="w-full h-18 overflow-visible" viewBox="0 0 320 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="twinSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15,48 L 105,38 L 205,22 L 305,12 L 305,58 L 15,58 Z"
                  fill="url(#twinSparklineGrad)"
                />
                <path
                  d="M 15,48 L 105,38 L 205,22 L 305,12"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="15" cy="48" r="3.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
                <circle cx="105" cy="38" r="3.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
                <circle cx="205" cy="22" r="3.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
                <circle cx="305" cy="12" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              </svg>

              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 mt-1">
                <span>{historyPoints[0]?.label || 'Nov 15'} ({historyPoints[0]?.score || 58}%)</span>
                <span>{historyPoints[1]?.label || 'Nov 22'}</span>
                <span>{historyPoints[2]?.label || 'Nov 29'}</span>
                <span className="text-royal-600 font-bold">{historyPoints[3]?.label || 'Current'} ({overallScore}%)</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/preparation/${sessionId}/mock-interview`)}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-royal-600 to-indigo-600 hover:from-royal-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Launch Mock Interview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Readiness Overview / Dimensions */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3">Readiness Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {dimensionCards.map((d, i) => (
            <Card key={i} padding="p-3.5" className="border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${d.bg} ${d.color} flex items-center justify-center flex-shrink-0`}>
                    <d.icon className="w-3.5 h-3.5" />
                  </div>
                  {d.score !== null ? (
                    <span className="text-xs font-black text-slate-900">{d.score}%</span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pending</span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-800 truncate mb-1.5">{d.title}</p>
                {d.score !== null ? (
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${d.barColor}`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
                    <div className="h-full bg-slate-200 w-1/3 rounded-full" />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block self-start truncate max-w-full ${d.badgeClass}`}>
                {d.statusText}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* Row: Job Match (Left) + Readiness Summary (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        {/* Job Match */}
        <Card padding="p-4 sm:p-5" className="border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-6 h-6 rounded-lg bg-royal-50 text-royal-600 flex items-center justify-center">
                <Target className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Job Match</h3>
            </div>

            <div className="space-y-3">
              {jobMatchItems.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="text-slate-900 font-bold">{item.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Readiness Summary */}
        <Card padding="p-4 sm:p-5" className="border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Readiness Summary</h3>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFF6FF] border border-[#C7D7FE]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-xs font-bold text-[#172B4D]">Strong</span>
                </div>
                <span className="text-xs font-black text-[#2563EB] bg-white px-2.5 py-0.5 rounded-lg border border-[#C7D7FE] shadow-2xs">
                  {strongCount} areas
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">Developing</span>
                </div>
                <span className="text-xs font-black text-amber-700 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200 shadow-2xs">
                  {developingCount} areas
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-rose-900">Needs Improvement</span>
                </div>
                <span className="text-xs font-black text-rose-700 bg-white px-2.5 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
                  {improveCount} areas
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row: Strengths (Left) + Needs Improvement (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        {/* Strengths */}
        <Card padding="p-4 sm:p-5" className="border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Strengths</h3>
              </div>
              {topStrengths.length > 6 && (
                <button
                  onClick={() => setAllStrengthsModalOpen(true)}
                  className="text-xs font-semibold text-royal-600 hover:text-royal-700 cursor-pointer"
                >
                  View All
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {topStrengths.map((str, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFF6FF] border border-[#C7D7FE] text-xs font-bold text-[#172B4D] shadow-2xs hover:bg-[#DBEAFE] transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-[#2563EB] stroke-[3]" />
                  <span>{str.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Needs Improvement */}
        <Card padding="p-4 sm:p-5" className="border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Needs Improvement</h3>
              </div>
              {topRisks.length > 4 && (
                <button
                  onClick={() => setAllRisksModalOpen(true)}
                  className="text-xs font-semibold text-royal-600 hover:text-royal-700 cursor-pointer"
                >
                  View All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {topRisks.slice(0, 4).map((risk, idx) => {
                const matched = skillWiseReadiness.find(
                  (s) => s.skill?.toLowerCase() === risk.topic?.toLowerCase()
                );
                const scoreVal =
                  matched?.readiness ??
                  (risk.severity === 'High' ? 25 : risk.severity === 'Medium' ? 50 : 65);
                const isHigh = risk.severity === 'High';

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isHigh ? 'text-rose-500' : 'text-amber-500'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {risk.topic}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold border flex-shrink-0 ${
                          isHigh
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {scoreVal}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isHigh ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${scoreVal}%` }}
                      />
                    </div>

                    <p className="text-[10px] text-slate-500 truncate">{risk.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Row: Recommended Focus (Left) + Skill-wise Readiness (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        {/* Recommended Focus */}
        <Card padding="p-4 sm:p-5" className="border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Recommended Focus</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Primary Action
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <h4 className="text-xs font-bold text-slate-900">{nextBestAction.actionTitle}</h4>
              </div>
              <p className="text-xs text-slate-600 leading-snug">{nextBestAction.reason}</p>
            </div>

            <div className="space-y-1.5 mb-3">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Key Focus Topics:</p>
              <div className="flex flex-wrap gap-1.5">
                {(nextBestAction.focusAreas || []).slice(0, 4).map((item, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Estimated: {nextBestAction.estimatedTime || '30 min'}</span>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100">
            <button
              onClick={() => setPracticeModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-royal-600 hover:bg-royal-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              <span>Start Recommended Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Skill-wise Readiness Table */}
        <Card padding="p-4 sm:p-5" className="border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Code2 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Skill-wise Readiness</h3>
              </div>
              {skillWiseReadiness.length > 5 && (
                <button
                  onClick={() => setAllSkillsModalOpen(true)}
                  className="text-xs font-semibold text-royal-600 hover:text-royal-700 cursor-pointer"
                >
                  View All
                </button>
              )}
            </div>

            <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[280px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-2">Skill</th>
                    <th className="pb-2">Level</th>
                    <th className="pb-2">Priority</th>
                    <th className="pb-2 text-right">Readiness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {skillWiseReadiness.slice(0, 5).map((row, i) => {
                    const isStrong = row.currentLevel === 'Strong';
                    const isPartial = row.currentLevel === 'Partial';

                    const levelBadge = isStrong
                      ? 'bg-[#EFF6FF] text-[#2563EB] border-[#C7D7FE]'
                      : isPartial
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200';

                    const priorityBadge =
                      row.priority === 'High'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200';

                    const barColor = isStrong
                      ? 'bg-[#2563EB]'
                      : isPartial
                      ? 'bg-amber-500'
                      : 'bg-rose-500';

                    return (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 font-bold text-slate-800 truncate max-w-[110px]">
                          {row.skill}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${levelBadge}`}>
                            {row.currentLevel}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityBadge}`}>
                            {row.priority}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${row.readiness}%` }}
                              />
                            </div>
                            <span className="font-bold text-[11px] text-slate-800 w-7 text-right">
                              {row.readiness}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* Practice Modal */}
      {practiceModalOpen && (
        <Modal
          isOpen={practiceModalOpen}
          onClose={() => setPracticeModalOpen(false)}
          title={`Recommended Practice: ${nextBestAction.actionTitle}`}
          size="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
              <p className="font-semibold mb-1">🎯 Actionable Guidance</p>
              <p>{nextBestAction.reason}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Curated Practice Checklist:</h4>
              <ul className="space-y-2">
                {nextBestAction.focusAreas?.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPracticeModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPracticeModalOpen(false);
                  navigate(`/preparation/${sessionId}/skill-gap`);
                }}
              >
                Review Skill Gap →
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPracticeModalOpen(false);
                  navigate(`/preparation/${sessionId}/mock-interview`);
                }}
              >
                Take AI Mock Interview →
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* All Strengths Modal */}
      {allStrengthsModalOpen && (
        <Modal
          isOpen={allStrengthsModalOpen}
          onClose={() => setAllStrengthsModalOpen(false)}
          title="All Candidate Strengths"
          size="md"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {topStrengths.map((str, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{str.name}</p>
                    <p className="text-[10px] text-slate-500">{str.evidence || 'Verified candidate strength.'}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#C7D7FE]">
                  {str.level || 'Strong'}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* All Risks Modal */}
      {allRisksModalOpen && (
        <Modal
          isOpen={allRisksModalOpen}
          onClose={() => setAllRisksModalOpen(false)}
          title="All Preparation Risks"
          size="md"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {topRisks.map((risk, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {risk.rank || idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">{risk.topic}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {risk.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{risk.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* All Skills Modal */}
      {allSkillsModalOpen && (
        <Modal
          isOpen={allSkillsModalOpen}
          onClose={() => setAllSkillsModalOpen(false)}
          title="All Evaluated Skills"
          size="lg"
        >
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[320px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium">
                  <th className="pb-2">Skill</th>
                  <th className="pb-2">Current Level</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2 text-right">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skillWiseReadiness.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-bold text-slate-800">{row.skill}</td>
                    <td className="py-2.5">{row.currentLevel}</td>
                    <td className="py-2.5">{row.priority}</td>
                    <td className="py-2.5 text-right font-bold">{row.readiness}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobReadinessTwin;
