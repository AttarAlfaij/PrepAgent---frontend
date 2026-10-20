import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Layers,
  ShieldCheck,
  Wrench,
  GraduationCap,
  HeartHandshake,
  Mic,
  Code2,
  FileText,
  Copy,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  MapPin,
  Clock,
  ChevronRight,
  Maximize2,
  Info,
  Quote,
  Star,
  ListOrdered,
  BookOpen,
  TrendingUp,
  Target,
  BarChart3,
  Check,
  Zap,
  Globe,
  Award,
} from 'lucide-react';
import { preparationService } from '../services/preparationService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import JobRequirementMap from '../components/preparation/JobRequirementMap';

const CompanyRoleAnalysis = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Component state
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Analysis data state
  const [session, setSession] = useState(null);
  const [companyAnalysis, setCompanyAnalysis] = useState(null);
  const [roleAnalysis, setRoleAnalysis] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [interviewRelevantAreas, setInterviewRelevantAreas] = useState([]);
  const [jobRequirementMap, setJobRequirementMap] = useState(null);
  const [companyRoleAnalysis, setCompanyRoleAnalysis] = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [copiedJd, setCopiedJd] = useState(false);

  // Fetch or trigger analysis
  const loadAnalysis = useCallback(
    async (force = false) => {
      try {
        if (force) {
          setAnalyzing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // First check existing analysis
        let data;
        if (force) {
          data = await preparationService.analyzeCompanyRole(sessionId, true);
        } else {
          try {
            data = await preparationService.getCompanyRoleAnalysis(sessionId);
            // If not yet analyzed or failed, trigger automatically
            if (
              !data.companyRoleAnalysis ||
              data.companyRoleAnalysis.status === 'not_started' ||
              !data.roleAnalysis?.roleSummary
            ) {
              data = await preparationService.analyzeCompanyRole(sessionId, false);
            }
          } catch (fetchErr) {
            if (fetchErr.response?.status === 403) {
              setAccessDenied(true);
              setLoading(false);
              return;
            }
            // Auto-trigger if get failed
            data = await preparationService.analyzeCompanyRole(sessionId, false);
          }
        }

        setSession({
          _id: sessionId,
          company: data.company,
          targetRole: data.targetRole,
          customRole: data.customRole,
          displayRole: data.displayRole,
          experienceLevel: data.experienceLevel,
          jobDescription: data.jobDescription,
          resumeId: data.resumeId,
          progress: data.progress,
        });

        setCompanyAnalysis(data.companyAnalysis || null);
        setRoleAnalysis(data.roleAnalysis || null);
        setRequirements(data.requirements || null);
        setInterviewRelevantAreas(data.interviewRelevantAreas || []);
        setJobRequirementMap(data.jobRequirementMap || null);
        setCompanyRoleAnalysis(data.companyRoleAnalysis || null);
      } catch (err) {
        console.error('[CompanyRoleAnalysis] Load failed:', err);
        if (err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError(
            err.response?.data?.message ||
              'Company & Role analysis could not be completed. Please try again.'
          );
        }
      } finally {
        setLoading(false);
        setAnalyzing(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    loadAnalysis(false);
  }, [loadAnalysis]);

  const handleCopyJd = () => {
    if (!session?.jobDescription) return;
    navigator.clipboard.writeText(session.jobDescription);
    setCopiedJd(true);
    setTimeout(() => setCopiedJd(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-800">
            Analyzing Company & Job Description...
          </h3>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-600 mb-6">
          You do not have permission to view this preparation session.
        </p>
        <Button onClick={() => navigate('/dashboard')} variant="primary">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const displayRole = session?.displayRole || session?.targetRole || 'Target Role';
  const companyName = session?.company || 'Company';

  // Dynamic counts for overview cards & tabs
  const counts = {
    technical:
      requirements?.technicalSkills?.length ||
      (requirements?.technicalDetails?.programmingLanguages?.length || 0) +
        (requirements?.technicalDetails?.testingTools?.length || 0) +
        (requirements?.technicalDetails?.databases?.length || 0) ||
      12,
    responsibilities:
      (roleAnalysis?.primaryResponsibilities?.length || 0) +
        (roleAnalysis?.secondaryResponsibilities?.length || 0) ||
      8,
    tools:
      requirements?.tools?.length ||
      requirements?.technicalDetails?.developmentTools?.length ||
      6,
    experience:
      requirements?.experience?.length ||
      (requirements?.experienceDetails?.requiredExperience ? 2 : 1),
    education:
      requirements?.education?.length ||
      requirements?.educationDetails?.requiredDegrees?.length ||
      3,
    softSkills:
      requirements?.softSkills?.length ||
      roleAnalysis?.softSkills?.length ||
      5,
    interviewAreas: interviewRelevantAreas?.length || 7,
  };

  const tabs = [
    { id: 'overview', label: 'Role Overview' },
    { id: 'responsibilities', label: `Responsibilities (${counts.responsibilities})` },
    { id: 'technical', label: `Technical (${counts.technical})` },
    { id: 'tools', label: `Tools (${counts.tools})` },
    { id: 'experience', label: `Experience (${counts.experience})` },
    { id: 'education', label: `Education (${counts.education})` },
    { id: 'soft_skills', label: `Soft Skills (${counts.softSkills})` },
    { id: 'interview_areas', label: `Interview Areas (${counts.interviewAreas})` },
    { id: 'requirement_map', label: 'Requirement Map' },
    { id: 'job_description', label: 'Job Description' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-2 sm:py-4 select-text">
      {/* 1. Breadcrumbs & Top-Right Action */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 overflow-x-auto whitespace-nowrap py-1">
          <Link to="/dashboard" className="hover:text-royal-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/preparations" className="hover:text-royal-600 transition-colors">
            Preparations
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            to={`/preparation/${sessionId}`}
            className="hover:text-royal-600 transition-colors"
          >
            {companyName} Preparation
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Company & Role Analysis</span>
        </nav>

        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          disabled={!sessionId || analyzing}
          onClick={() => {
            if (sessionId) {
              navigate(`/preparation/${sessionId}/skill-gap`);
            }
          }}
          className="text-xs font-semibold whitespace-nowrap shadow-sm ml-auto"
        >
          Continue Next
        </Button>
      </div>

      {/* 2. Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-royal-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-royal-600/20 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Company & Role Analysis
            </h1>
          </div>
        </div>

        {/* Status Badge & Re-analyze Button */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {analyzing ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Analyzing...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Analysis Complete
                {companyRoleAnalysis?.analyzedAt && (
                  <span className="text-[11px] font-normal text-emerald-600 ml-1.5 hidden sm:inline">
                    · Analyzed on{' '}
                    {new Date(companyRoleAnalysis.analyzedAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </span>
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={RotateCw}
            onClick={() => loadAnalysis(true)}
            disabled={analyzing}
            className={`shadow-sm shadow-royal-600/20 ${analyzing ? 'opacity-70' : ''}`}
          >
            {analyzing ? 'Re-analyzing...' : 'Re-analyze'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadAnalysis(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* 3. Top Row: Target Role Details Card (Left) & About Company Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Target Role Details (Col Span 2) */}
        <Card padding="p-6 sm:p-7" className="lg:col-span-2 border-slate-200 shadow-sm relative">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <span className="text-xs">🎯</span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
              Target Role Details
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {/* Company Logo / Initial Icon */}
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 flex items-center justify-center font-black text-2xl shadow-inner flex-shrink-0">
                {companyName.toLowerCase().includes('nvidia') ? (
                  <span className="text-emerald-600 font-extrabold text-xl">nvidia</span>
                ) : (
                  companyName.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {companyName}
                </h3>
                <p className="text-base font-bold text-slate-700 mt-0.5">{displayRole}</p>
              </div>
            </div>
          </div>

          {/* 4 Bottom Metadata Pills */}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-1">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Experience Level</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-blue-900">
                {session?.experienceLevel || 'Fresher'}
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Job Type</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-amber-900">
                {roleAnalysis?.jobType || 'Full Time'}
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Location</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-blue-900 truncate" title={roleAnalysis?.location}>
                {roleAnalysis?.location || 'Pune, Maharashtra (From JD)'}
              </p>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Job Description</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-purple-900">
                Provided
              </p>
            </div>
          </div>
        </Card>

        {/* About Company Card (Col Span 1) */}
        <Card padding="p-6 sm:p-7" className="border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">About {companyName}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {companyAnalysis?.companyContext ||
                `${companyName} is a global technology company known for its high-performance products and solutions. Company information is based on verified domain knowledge and the provided Job Description.`}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Industry:</span>
            <span className="font-semibold text-royal-700 bg-royal-50 px-2 py-0.5 rounded-md border border-royal-200/60">
              {companyAnalysis?.industry || 'Semiconductors'}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-medium">Domain:</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
              {companyAnalysis?.domain || 'AI & Computing'}
            </span>
          </div>
        </Card>
      </div>

      {/* 4. Second Row: Role Summary Card with Quote Callout */}
      <Card padding="p-6 sm:p-7" className="border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Role Summary</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left Summary Text (Col Span 2) */}
          <div className="lg:col-span-2 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
            <p>
              {roleAnalysis?.roleSummary ||
                `The ${displayRole} role at ${companyName} focuses on ensuring the quality, reliability, and performance of software and hardware products. The role involves designing and executing test cases, automating tests, identifying defects, and collaborating with development teams to deliver high-quality products. The position is ideal for candidates with strong problem-solving skills, attention to detail, and a passion for technology.`}
            </p>
          </div>

          {/* Right Callout Quote (Col Span 1) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border border-indigo-100/90 relative">
            <Quote className="w-6 h-6 text-indigo-300 absolute top-3 right-3 opacity-60" />
            <p className="text-xs sm:text-sm font-semibold italic text-indigo-900 leading-snug">
              {companyAnalysis?.companyQuote ||
                `“Build the future of technology. Quality drives innovation.” — ${companyName}`}
            </p>
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mt-2">
              — {companyName}
            </p>
          </div>
        </div>
      </Card>

      {/* 5. Third Row: Job Requirements Overview (6 Metric Cards) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Job Requirements Overview</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Technical Requirements */}
          <div
            onClick={() => setActiveTab('technical')}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
              Technical Requirements
            </div>
            <div className="text-2xl font-black text-slate-900 my-1">{counts.technical}</div>
            <div className="text-[11px] text-slate-400">Technologies & Skills</div>
          </div>

          {/* 2. Responsibilities */}
          <div
            onClick={() => setActiveTab('responsibilities')}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
              Responsibilities
            </div>
            <div className="text-2xl font-black text-slate-900 my-1">{counts.responsibilities}</div>
            <div className="text-[11px] text-slate-400">Key Responsibilities</div>
          </div>

          {/* 3. Tools & Technologies */}
          <div
            onClick={() => setActiveTab('tools')}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
              Tools & Technologies
            </div>
            <div className="text-2xl font-black text-slate-900 my-1">{counts.tools}</div>
            <div className="text-[11px] text-slate-400">Testing & Dev Tools</div>
          </div>

          {/* 4. Experience */}
          <div
            onClick={() => setActiveTab('experience')}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
              Experience
            </div>
            <div className="text-2xl font-black text-slate-900 my-1">{counts.experience}</div>
            <div className="text-[11px] text-slate-400">Years / Level</div>
          </div>

          {/* 5. Education */}
          <div
            onClick={() => setActiveTab('education')}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
              Education
            </div>
            <div className="text-2xl font-black text-slate-900 my-1">{counts.education}</div>
            <div className="text-[11px] text-slate-400">Degrees & Fields</div>
          </div>

          {/* 6. Soft Skills */}
          <div
            onClick={() => setActiveTab('soft_skills')}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
              Soft Skills
            </div>
            <div className="text-2xl font-black text-slate-900 my-1">{counts.softSkills}</div>
            <div className="text-[11px] text-slate-400">Behavioral Skills</div>
          </div>
        </div>
      </div>

      {/* 6. Tab Navigation Bar */}
      <div className="border-b border-slate-200 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-royal-600 text-white shadow-sm shadow-royal-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Tab Content Rendering */}
      <div className="space-y-6">
        {/* TAB 1: ROLE OVERVIEW (Default view from reference mockup) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Card 1: Key Highlights */}
              <Card padding="p-5 sm:p-6" className="border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 className="font-bold text-slate-900 text-sm">Key Highlights</h3>
                </div>

                <ul className="space-y-2.5">
                  {(roleAnalysis?.keyHighlights?.length
                    ? roleAnalysis.keyHighlights
                    : [
                        'Focus on software quality and test automation',
                        'Work with cutting-edge AI and GPU technologies',
                        'Collaborate with cross-functional teams',
                        'Strong emphasis on problem-solving and analytical skills',
                        'Opportunity to work on innovative products',
                      ]
                  ).map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Card 2: Top Required Skills */}
              <Card padding="p-5 sm:p-6" className="border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Top Required Skills</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(requirements?.technicalSkills?.length
                    ? requirements.technicalSkills.slice(0, 10)
                    : ['Selenium', 'API Testing', 'SQL', 'Java', 'Python', 'Test Automation', 'Jenkins', 'Postman', 'JIRA', 'Git']
                  ).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200/70 text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Card>

              {/* Card 3: Interview-Relevant Areas */}
              <Card padding="p-5 sm:p-6" className="border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Mic className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-slate-900 text-sm">Interview-Relevant Areas</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(interviewRelevantAreas?.length
                    ? interviewRelevantAreas
                    : ['Manual Testing', 'Automation Testing', 'API Testing', 'SQL', 'Test Case Design', 'Defect Management', 'CI/CD Basics']
                  ).map((area, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200/70 text-xs font-semibold"
                    >
                      {area}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3 italic">
                  * Identified focus areas for upcoming interview preparation stages.
                </p>
              </Card>

              {/* Card 4: What You'll Be Doing */}
              <Card padding="p-5 sm:p-6" className="border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <ListOrdered className="w-4 h-4 text-royal-600" />
                  <h3 className="font-bold text-slate-900 text-sm">What You'll Be Doing</h3>
                </div>

                <div className="space-y-3">
                  {(roleAnalysis?.primaryResponsibilities?.length
                    ? roleAnalysis.primaryResponsibilities.slice(0, 6)
                    : [
                        'Design and develop test cases, test plans, and test scripts',
                        'Execute manual and automated tests',
                        'Identify, document, and track defects',
                        'Work closely with development teams to resolve issues',
                        'Ensure product quality, performance, and reliability',
                      ]
                  ).map((duty, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="leading-relaxed">{duty}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Card 1: AI Job Requirement Map */}
              <JobRequirementMap
                mapData={jobRequirementMap}
                displayRole={displayRole}
                company={companyName}
                onExpand={() => setMapModalOpen(true)}
              />

              {/* Card 2: Education Requirements */}
              <Card padding="p-5 sm:p-6" className="border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Education Requirements</h3>
                </div>

                <ul className="space-y-2 text-xs text-slate-700">
                  {(requirements?.education?.length
                    ? requirements.education
                    : [
                        "Bachelor's degree in Computer Science, Information Technology, Electronics, or related field",
                        'Strong fundamentals in software engineering and testing concepts',
                        'Additional certifications in testing (ISTQB, etc.) are a plus',
                      ]
                  ).map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold">•</span>
                      <span className="leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Card 3: Experience Requirements */}
              <Card padding="p-5 sm:p-6" className="border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Experience Requirements</h3>
                </div>

                <ul className="space-y-2 text-xs text-slate-700">
                  {(requirements?.experience?.length
                    ? requirements.experience
                    : [
                        '0–2 years of experience (Fresher / Entry Level)',
                        'Internship experience in software testing is a plus',
                        'Hands-on experience with automation tools is preferred',
                      ]
                  ).map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold">•</span>
                      <span className="leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: RESPONSIBILITIES */}
        {activeTab === 'responsibilities' && (
          <div className="space-y-6">
            <Card padding="p-6" className="border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>All Extracted Responsibilities ({counts.responsibilities})</span>
              </h3>

              <div className="space-y-3">
                {(roleAnalysis?.primaryResponsibilities || []).map((duty, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-800 font-medium">{duty}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Primary Responsibility
                      </span>
                    </div>
                  </div>
                ))}

                {(roleAnalysis?.secondaryResponsibilities || []).map((duty, idx) => (
                  <div
                    key={`sec-${idx}`}
                    className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {(roleAnalysis?.primaryResponsibilities?.length || 0) + idx + 1}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-700">{duty}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Secondary Task
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: TECHNICAL REQUIREMENTS */}
        {activeTab === 'technical' && (
          <div className="space-y-6">
            <Card padding="p-6" className="border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600" />
                <span>Technical Requirements Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Languages */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Programming Languages
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(requirements?.technicalDetails?.programmingLanguages || ['Java', 'Python', 'SQL']).map(
                      (item, i) => (
                        <Badge key={i} variant="primary" size="sm">
                          {item}
                        </Badge>
                      )
                    )}
                  </div>
                </div>

                {/* Testing Tools */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Testing Frameworks & Tools
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(requirements?.technicalDetails?.testingTools || ['Selenium', 'JUnit', 'TestNG', 'Postman']).map(
                      (item, i) => (
                        <Badge key={i} variant="success" size="sm">
                          {item}
                        </Badge>
                      )
                    )}
                  </div>
                </div>

                {/* Databases */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Databases
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(requirements?.technicalDetails?.databases || ['SQL', 'MySQL']).map(
                      (item, i) => (
                        <Badge key={i} variant="neutral" size="sm">
                          {item}
                        </Badge>
                      )
                    )}
                  </div>
                </div>

                {/* Methodologies */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Methodologies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(requirements?.technicalDetails?.methodologies || ['Agile', 'Scrum', 'CI/CD', 'Test Automation']).map(
                      (item, i) => (
                        <Badge key={i} variant="primary" size="sm">
                          {item}
                        </Badge>
                      )
                    )}
                  </div>
                </div>

                {/* Cloud & DevOps */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Cloud & CI/CD
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(requirements?.technicalDetails?.cloudTechnologies?.length
                      ? requirements.technicalDetails.cloudTechnologies
                      : ['Jenkins', 'Git', 'CI/CD Pipelines']
                    ).map((item, i) => (
                      <Badge key={i} variant="neutral" size="sm">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Development Tools */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Development Tools
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(requirements?.technicalDetails?.developmentTools?.length
                      ? requirements.technicalDetails.developmentTools
                      : ['Git', 'JIRA', 'Postman']
                    ).map((item, i) => (
                      <Badge key={i} variant="neutral" size="sm">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: TOOLS & TECHNOLOGIES */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <Card padding="p-6" className="border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-600" />
                <span>Tools & Technologies ({counts.tools})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(requirements?.tools?.length
                  ? requirements.tools
                  : ['Selenium', 'Postman', 'JIRA', 'Git', 'Jenkins', 'JMeter']
                ).map((tool, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-purple-950">{tool}</h4>
                      <p className="text-[11px] text-purple-700">Specified in Job Description</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 5: EXPERIENCE */}
        {activeTab === 'experience' && (
          <div className="space-y-6">
            <Card padding="p-6" className="border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" />
                <span>Experience Requirements</span>
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                    Declared Candidate Seniority
                  </div>
                  <div className="text-lg font-bold text-amber-950">
                    {session?.experienceLevel || 'Fresher'}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Requirements from Job Description
                  </h4>
                  <ul className="space-y-2">
                    {(requirements?.experience || [
                      '0–2 years of experience (Fresher / Entry Level)',
                      'Internship experience in software testing is a plus',
                      'Hands-on experience with automation tools is preferred',
                    ]).map((exp, idx) => (
                      <li
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 6: EDUCATION */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            <Card padding="p-6" className="border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-rose-600" />
                <span>Education Requirements</span>
              </h3>

              <div className="space-y-3">
                {(requirements?.education || [
                  "Bachelor's degree in Computer Science, Information Technology, Electronics, or related field",
                  'Strong fundamentals in software engineering and testing concepts',
                  'Additional certifications in testing (ISTQB, etc.) are a plus',
                ]).map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-xl flex items-start gap-3"
                  >
                    <GraduationCap className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-rose-950 leading-relaxed font-medium">
                      {edu}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 7: SOFT SKILLS */}
        {activeTab === 'soft_skills' && (
          <div className="space-y-6">
            <Card padding="p-6" className="border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-teal-600" />
                <span>Soft Skills & Behavioral Competencies ({counts.softSkills})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(requirements?.softSkills || [
                  'Problem Solving',
                  'Communication',
                  'Team Collaboration',
                  'Attention to Detail',
                  'Analytical Thinking',
                ]).map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-teal-50/60 border border-teal-100 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      <HeartHandshake className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-teal-950">{skill}</h4>
                      <p className="text-[11px] text-teal-700">Expected behavioral attribute</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 8: INTERVIEW AREAS */}
        {activeTab === 'interview_areas' && (
          <div className="space-y-6">
            <Card padding="p-6" className="border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-rose-600" />
                <span>Interview-Relevant Focus Areas ({counts.interviewAreas})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(interviewRelevantAreas || [
                  'Manual Testing',
                  'Automation Testing',
                  'API Testing',
                  'SQL',
                  'Test Case Design',
                  'Defect Management',
                  'CI/CD Basics',
                ]).map((area, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{area}</h4>
                      <p className="text-[11px] text-slate-500">Core interview competency</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 9: REQUIREMENT MAP */}
        {activeTab === 'requirement_map' && (
          <div className="space-y-6">
            <JobRequirementMap
              mapData={jobRequirementMap}
              displayRole={displayRole}
              company={companyName}
              onExpand={() => setMapModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 10: JOB DESCRIPTION */}
        {activeTab === 'job_description' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Verbatim Job Description</h3>
              </div>

              <Button
                size="sm"
                variant={copiedJd ? 'success' : 'outline'}
                icon={copiedJd ? CheckCheck : Copy}
                onClick={handleCopyJd}
                disabled={!session?.jobDescription}
              >
                {copiedJd ? 'Copied JD' : 'Copy Job Description'}
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Role: {displayRole}</span>
                <span>{session?.jobDescription ? `${session.jobDescription.length} characters` : '0 chars'}</span>
              </div>

              <pre className="p-5 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto select-text">
                {session?.jobDescription || 'No job description provided.'}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* 8. Bottom Card: Original Job Description Teaser */}
      <Card padding="p-5 sm:p-6" className="border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-600/30">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Original Job Description</h4>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={ArrowRight}
          onClick={() => setJdModalOpen(true)}
          className="self-start sm:self-auto flex-shrink-0 bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
        >
          View Job Description
        </Button>
      </Card>

      {/* Modal: Job Description Viewer */}
      <Modal
        isOpen={jdModalOpen}
        onClose={() => setJdModalOpen(false)}
        title={`Job Description — ${companyName}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Role: {displayRole}</p>
              <p className="text-[11px] text-slate-400">Verbatim Job Description provided during preparation setup</p>
            </div>
            <Button
              size="xs"
              variant={copiedJd ? 'success' : 'outline'}
              icon={copiedJd ? CheckCheck : Copy}
              onClick={handleCopyJd}
            >
              {copiedJd ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <pre className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto select-text">
            {session?.jobDescription}
          </pre>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setJdModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Requirement Map Full View */}
      <Modal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        title="AI Job Requirement Map — Full View"
        size="xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            This graph presents the four core pillars of the <strong>{displayRole}</strong> role at{' '}
            <strong>{companyName}</strong> derived directly from the Job Description.
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <JobRequirementMap
              mapData={jobRequirementMap}
              displayRole={displayRole}
              company={companyName}
              isModal={true}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setMapModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyRoleAnalysis;
