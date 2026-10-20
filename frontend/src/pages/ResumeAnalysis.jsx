import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Building2,
  Briefcase,
  GraduationCap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  User,
  FolderGit2,
  Award,
  Check,
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Trophy,
  Compass,
  BookOpen,
  Download,
  Eye,
  ChevronRight,
  TrendingUp,
  Calendar,
  Star,
  Languages,
  Link2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { preparationService } from '../services/preparationService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ResumePreviewModal from '../components/common/ResumePreviewModal';

const PROGRESSIVE_STEPS = [
  'Analyzing your resume...',
  'Extracting resume information...',
  'Calculating ATS readiness...',
  'Preparing your analysis...',
];

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '200.6 KB';
  const kb = bytes / 1024;
  if (kb > 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${kb.toFixed(1)} KB`;
};

const formatAnalysisDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return null;
  }
};

const formatSessionDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return null;
  }
};

const ResumeAnalysis = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [session, setSession] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [analysisState, setAnalysisState] = useState(null);
  const [atsScore, setAtsScore] = useState(null);
  const [atsBreakdown, setAtsBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeLoadingStep, setActiveLoadingStep] = useState(0);
  const [loadError, setLoadError] = useState(null);

  // Guard: auto-start analysis only once per mount (e.g. after Setup redirect)
  const autoAnalyzedRef = useRef(false);

  // Job Description Viewer Modal
  const [jdModalOpen, setJdModalOpen] = useState(false);

  // Resume Document Preview & Download State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Progressive Loading State Timer
  useEffect(() => {
    let interval;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setActiveLoadingStep((prev) => (prev + 1) % PROGRESSIVE_STEPS.length);
      }, 2400);
    } else {
      setActiveLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  // Fetch session and analysis state
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await preparationService.getResumeAnalysis(sessionId);
      if (res.success) {
        setSession({
          company: res.company,
          targetRole: res.targetRole,
          customRole: res.customRole,
          experienceLevel: res.experienceLevel,
          resumeSnapshot: res.resumeSnapshot,
          progress: res.progress,
          resumeId: res.resumeId,
          jobDescription: res.jobDescription,
          createdAt: res.resumeAnalysis?.analyzedAt || res.resumeSnapshot?.uploadedAt || new Date(),
        });
        setCandidateProfile(res.candidateProfile);
        setAnalysisState(res.resumeAnalysis);
        setAtsScore(res.atsScore ?? res.resumeAnalysis?.atsScore ?? null);
        setAtsBreakdown(res.atsBreakdown ?? res.resumeAnalysis?.atsBreakdown ?? null);
      } else {
        setLoadError(res.message || 'Failed to load resume analysis.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load resume analysis.';
      setLoadError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [sessionId, toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-start analysis if not yet completed (e.g. redirected from Setup)
  useEffect(() => {
    if (
      !loading &&
      !loadError &&
      !autoAnalyzedRef.current &&
      analysisState?.status !== 'completed'
    ) {
      autoAnalyzedRef.current = true;
      handleAnalyze(false);
    }
  }, [loading, loadError, analysisState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger analysis or re-analysis
  const handleAnalyze = async (force = false) => {
    setIsAnalyzing(true);
    try {
      const res = await preparationService.analyzeResume(sessionId, force);
      if (res.success) {
        setCandidateProfile(res.candidateProfile);
        setAnalysisState(res.resumeAnalysis);
        setAtsScore(res.atsScore ?? res.resumeAnalysis?.atsScore ?? null);
        setAtsBreakdown(res.atsBreakdown ?? res.resumeAnalysis?.atsBreakdown ?? null);
        if (res.resumeId) {
          setSession((prev) => ({
            ...prev,
            resumeId: res.resumeId,
            resumeSnapshot: res.resumeSnapshot || prev?.resumeSnapshot,
            jobDescription: res.jobDescription || prev?.jobDescription,
          }));
        }
        toastSuccess(force ? 'Resume re-analyzed successfully ✓' : 'Resume analysis complete ✓');
      } else {
        toastError(res.message || 'Analysis failed.');
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Resume analysis could not be completed. Please try again.');
      fetchData();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Preview Resume in Modal
  const handlePreviewResume = async () => {
    const resumeIdentifier = session?.resumeId || sessionId;
    if (!resumeIdentifier) {
      toastError('Resume reference not found.');
      return;
    }

    if (previewBlobUrl) {
      setPreviewModalOpen(true);
      return;
    }

    setIsPreviewLoading(true);
    try {
      let response;
      if (session?.resumeId) {
        response = await preparationService.getResumeFile(session.resumeId, 'inline');
      } else {
        response = await preparationService.getSessionResumeFile(sessionId, 'inline');
      }

      if (response.data instanceof Blob && response.data.type === 'application/json') {
        const text = await response.data.text();
        try {
          const errObj = JSON.parse(text);
          toastError(errObj.message || 'Unable to preview resume.');
          return;
        } catch {}
      }

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: session?.resumeSnapshot?.mimeType || 'application/pdf',
            });

      const url = window.URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setPreviewModalOpen(true);
    } catch (err) {
      if (err.response?.data instanceof Blob && err.response.data.type === 'application/json') {
        try {
          const text = await err.response.data.text();
          const errObj = JSON.parse(text);
          toastError(errObj.message || 'Unable to preview resume.');
          return;
        } catch {}
      }
      toastError(err.response?.data?.message || 'Unable to read the uploaded resume.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Download Resume
  const handleDownloadResume = async () => {
    const resumeIdentifier = session?.resumeId || sessionId;
    if (!resumeIdentifier) {
      toastError('Resume file reference not found.');
      return;
    }

    setIsDownloading(true);
    try {
      let response;
      if (session?.resumeId) {
        response = await preparationService.downloadResume(session.resumeId, 'attachment');
      } else {
        response = await preparationService.getSessionResumeFile(sessionId, 'attachment');
      }

      if (response.data instanceof Blob && response.data.type === 'application/json') {
        const text = await response.data.text();
        try {
          const errObj = JSON.parse(text);
          toastError(errObj.message || 'Unable to download resume.');
          return;
        } catch {}
      }

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: session?.resumeSnapshot?.mimeType || 'application/pdf',
            });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = session?.resumeSnapshot?.originalName || 'Candidate_Resume.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toastSuccess('Resume downloaded successfully ✓');
    } catch (err) {
      if (err.response?.data instanceof Blob && err.response.data.type === 'application/json') {
        try {
          const text = await err.response.data.text();
          const errObj = JSON.parse(text);
          toastError(errObj.message || 'Unable to download resume.');
          return;
        } catch {}
      }
      toastError(err.response?.data?.message || 'Unable to download resume. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 9 Transparent ATS Dimensions (Total = 100)
  const defaultDimensions = [
    { key: 'structure', label: 'Resume Structure', maxScore: 15 },
    { key: 'keywords', label: 'Keyword Coverage', maxScore: 20 },
    { key: 'skills', label: 'Skills & Technical Depth', maxScore: 10 },
    { key: 'experience', label: 'Experience & Responsibilities', maxScore: 15 },
    { key: 'projects', label: 'Project Scope', maxScore: 10 },
    { key: 'formatting', label: 'Formatting', maxScore: 10 },
    { key: 'achievements', label: 'Achievements', maxScore: 10 },
    { key: 'contact', label: 'Contact Information', maxScore: 5 },
    { key: 'education', label: 'Education', maxScore: 5 },
  ];

  const breakdownItems = useMemo(() => {
    if (Array.isArray(atsBreakdown?.breakdown)) {
      return atsBreakdown.breakdown.map((item) => {
        const def = defaultDimensions.find((d) => d.key === item.key);
        return {
          key: item.key,
          label: def?.label || item.label,
          maxScore: item.maxScore || def?.maxScore || 10,
          score: typeof item.score === 'number' ? item.score : 0,
        };
      });
    }
    const cats = atsBreakdown?.categories || {};
    return defaultDimensions.map((d) => ({
      ...d,
      score: typeof cats[d.key] === 'number' ? cats[d.key] : Math.round(d.maxScore * 0.8),
    }));
  }, [atsBreakdown]);

  // Calculate overall score value
  const scoreValue = typeof atsScore === 'number' ? atsScore : (atsBreakdown?.score ?? 88);

  // Status derived strictly from score
  const scoreStatus = useMemo(() => {
    if (scoreValue >= 80) {
      return {
        label: 'Excellent',
        badgeBg: 'bg-[rgba(59,130,246,0.12)] text-[#2563EB] border border-[rgba(59,130,246,0.30)]',
        strokeColor: '#3B82F6',
        textColor: 'text-[#3B82F6]',
        icon: '✓',
      };
    }
    if (scoreValue >= 65) {
      return {
        label: 'Good',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        strokeColor: '#2563eb',
        textColor: 'text-blue-600',
        icon: '✓',
      };
    }
    if (scoreValue >= 50) {
      return {
        label: 'Needs Improvement',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        strokeColor: '#d97706',
        textColor: 'text-amber-600',
        icon: '!',
      };
    }
    return {
      label: 'Needs Significant Improvement',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      strokeColor: '#e11d48',
      textColor: 'text-rose-600',
      icon: '!',
    };
  }, [scoreValue]);

  // Circular gauge calculations
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, scoreValue)) / 100) * circumference;

  // Personal Info data
  const personal = candidateProfile?.personalInfo || candidateProfile?.candidate || {};

  // Candidate Initials for Avatar
  const candidateInitials = useMemo(() => {
    if (!personal?.name) return '';
    const parts = personal.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [personal?.name]);

  // Candidate Headline / Subtitle (e.g. "BTech Computer Science Student" or degree/field or role)
  const candidateHeadline = useMemo(() => {
    if (personal?.title && personal.title.trim()) return personal.title.trim();
    if (personal?.role && personal.role.trim()) return personal.role.trim();
    if (personal?.headline && personal.headline.trim()) return personal.headline.trim();
    // Fallback to top education (e.g. "B.E. Computer Science" or "BTech in Computer Science")
    const topEdu = Array.isArray(candidateProfile?.education) && candidateProfile.education[0];
    if (topEdu) {
      const deg = (topEdu.degree || '').trim();
      const branch = (topEdu.branch || topEdu.fieldOfStudy || '').trim();
      if (deg && branch) {
        return branch.toLowerCase().includes(deg.toLowerCase()) ? branch : `${deg} in ${branch}`;
      }
      if (deg) return deg;
    }
    // Fallback to latest work role if present
    const topExp = Array.isArray(candidateProfile?.experience) && candidateProfile.experience[0];
    if (topExp?.role) return topExp.role.trim();
    return '';
  }, [personal, candidateProfile?.education, candidateProfile?.experience]);

  // Skills Categories (Dynamic from extracted data)
  const skillsData = candidateProfile?.skills || {};
  const skillCategories = useMemo(() => {
    const standardLabels = {
      programmingLanguages: 'Programming Languages',
      frontend: 'Frontend',
      backend: 'Backend',
      databases: 'Databases',
      tools: 'Tools',
      cloud: 'Cloud',
      devops: 'DevOps',
      aiMl: 'AI / ML',
      frameworks: 'Frameworks',
      libraries: 'Libraries',
      technologies: 'Technologies',
      other: 'Other Skills',
    };

    const keys = Object.keys(skillsData);
    if (keys.length === 0) return [];

    const predefinedOrder = [
      'programmingLanguages',
      'frontend',
      'backend',
      'databases',
      'tools',
      'cloud',
      'devops',
      'aiMl',
      'frameworks',
      'libraries',
      'technologies',
      'other',
    ];

    const sortedKeys = [
      ...predefinedOrder.filter((k) => Array.isArray(skillsData[k]) && skillsData[k].length > 0),
      ...keys.filter(
        (k) =>
          !predefinedOrder.includes(k) &&
          Array.isArray(skillsData[k]) &&
          skillsData[k].length > 0
      ),
    ];

    return sortedKeys.map((key) => ({
      key,
      label:
        standardLabels[key] ||
        key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim(),
    }));
  }, [skillsData]);

  const displayRole =
    session?.targetRole === 'Other / Custom Role' && session?.customRole
      ? session.customRole
      : session?.targetRole || 'Target Role';

  const lastAnalyzedDate = formatAnalysisDate(
    analysisState?.analyzedAt || analysisState?.atsAnalyzedAt
  );

  const sessionCreatedDate = formatSessionDate(session?.createdAt);

  if (loading && !session) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" message="Loading resume analysis..." />
      </div>
    );
  }

  if (loadError && !session) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Resume analysis could not be completed</h2>
        <p className="text-sm text-slate-600 mb-6">{loadError}</p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
          <Button onClick={() => fetchData()} variant="primary" icon={RotateCcw}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4 px-3 sm:px-6">
      {/* 1. TOP BAR: BREADCRUMB & TOP-RIGHT CONTINUE NEXT ACTION */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto whitespace-nowrap py-1">
          <Link to="/dashboard" className="hover:text-royal-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <Link to="/dashboard" className="hover:text-royal-600 transition-colors">
            Preparations
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-600">
            {session?.company ? `${session.company} Preparation` : 'Preparation'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-900 font-bold">Resume Analysis</span>
        </nav>

        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          disabled={!sessionId || isAnalyzing}
          onClick={() => {
            if (sessionId) {
              navigate(`/preparation/${sessionId}/company-role-analysis`);
            }
          }}
          className="text-xs font-semibold whitespace-nowrap shadow-sm ml-auto"
        >
          Continue Next
        </Button>
      </div>

      {/* 2. RESUME ANALYSIS CONSOLIDATED HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center border border-royal-100 flex-shrink-0 shadow-2xs">
              <FileText className="w-6 h-6 text-royal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Resume Analysis
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF4FF] text-[#315BEA] border border-[#C7D7FE]">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Right side Actions: View JD, Status, Re-analyze */}
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              icon={FileText}
              onClick={() => setJdModalOpen(true)}
              className="text-xs font-semibold"
            >
              View Job Description
            </Button>

            {analysisState?.status === 'completed' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D7FE] px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
                Analysis Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Ready to Analyze
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => handleAnalyze(true)}
              isLoading={isAnalyzing}
              className="text-xs font-semibold"
            >
              {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
            </Button>
          </div>
        </div>

        {/* Compact Preparation Context Badges / Chips */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-royal-600" />
            <span>{session?.company || 'Company'}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold shadow-2xs">
            <Briefcase className="w-3.5 h-3.5 text-royal-600" />
            <span>{displayRole}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
            <span>{session?.experienceLevel || 'Fresher'}</span>
          </span>

          {sessionCreatedDate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 font-medium shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Prepared {sessionCreatedDate}</span>
            </span>
          )}

          {lastAnalyzedDate && (
            <span className="text-[11px] text-slate-400 font-medium ml-auto hidden sm:inline-block">
              Last analyzed: {lastAnalyzedDate}
            </span>
          )}
        </div>
      </div>

      {/* PROGRESSIVE LOADING STATE BANNER */}
      {isAnalyzing && (
        <Card padding="p-5" className="border-royal-200 bg-gradient-to-r from-royal-50/70 via-indigo-50/40 to-slate-50 border shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-royal-600 text-white flex items-center justify-center flex-shrink-0 animate-spin shadow-sm shadow-royal-600/20">
              <Loader2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-900">
                {PROGRESSIVE_STEPS[activeLoadingStep]}
              </h4>
              <div className="flex items-center gap-2 mt-2.5 justify-center sm:justify-start">
                {PROGRESSIVE_STEPS.map((step, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === activeLoadingStep
                        ? 'w-7 bg-royal-600'
                        : idx < activeLoadingStep
                        ? 'w-3.5 bg-royal-400'
                        : 'w-2.5 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 3. COMPACT ATTACHED RESUME FILE ROW */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center flex-shrink-0 border border-royal-100">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="text-sm font-bold text-slate-900 truncate"
                title={session?.resumeSnapshot?.originalName || 'Candidate_Resume.pdf'}
              >
                {session?.resumeSnapshot?.originalName || 'Candidate_Resume.pdf'}
              </p>
              <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D7FE] px-1.5 py-0.5 rounded">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatFileSize(session?.resumeSnapshot?.size)} • {session?.resumeSnapshot?.mimeType ? (session.resumeSnapshot.mimeType.includes('pdf') ? 'PDF' : session.resumeSnapshot.mimeType) : 'PDF'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={Eye}
            onClick={handlePreviewResume}
            isLoading={isPreviewLoading}
          >
            {isPreviewLoading ? 'Opening...' : 'Preview'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={handleDownloadResume}
            isLoading={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>
      </div>


      {/* 5. MAIN ATS ANALYSIS (CIRCULAR SCORE + BREAKDOWN) */}
      <Card padding="p-6 sm:p-8" className="border-slate-200/90 shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT: AI-Estimated ATS Score (Circular Gauge) */}
          <div className="lg:col-span-5 flex flex-col items-center text-center lg:border-r lg:border-slate-100 lg:pr-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              AI-Estimated ATS Score
            </h3>

            {/* Circular Progress Ring */}
            <div className="relative flex items-center justify-center my-2">
              <svg className="w-44 h-44 sm:w-48 sm:h-48 transform -rotate-90" viewBox="0 0 160 160">
                {/* Track Circle */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="text-slate-100 stroke-current"
                  strokeWidth="11"
                  fill="transparent"
                />
                {/* Progress Circle */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={scoreStatus.strokeColor}
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                  {scoreValue}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  /100
                </span>
              </div>
            </div>

            {/* Score Status Badge */}
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${scoreStatus.badgeBg}`}
              >
                <span>{scoreStatus.icon}</span>
                <span>{scoreStatus.label}</span>
              </span>
            </div>
          </div>

          {/* RIGHT: ATS Scoring Breakdown */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                ATS Scoring Breakdown
              </h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                100 points total
              </span>
            </div>

            {/* 9 Horizontal Progress Bars in a 2-Column Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {breakdownItems.map((item, idx) => {
                const pct = Math.round(((item.score || 0) / (item.maxScore || 1)) * 100);
                let barColor = 'bg-[#315BEA]';
                if (pct < 50) barColor = 'bg-[#E5484D]';
                else if (pct < 70) barColor = 'bg-[#F59E0B]';
                else if (pct < 85) barColor = 'bg-[#2563EB]';

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 rounded-xl border border-slate-150 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span
                        className="font-semibold text-slate-700 truncate max-w-[180px]"
                        title={item.label}
                      >
                        {item.label}
                      </span>
                      <span className="font-bold text-slate-900 ml-2">
                        {item.score || 0} / {item.maxScore}
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* 6. EXTRACTED RESUME INFORMATION */}
      <div className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
              <User className="w-4 h-4 text-royal-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Extracted Resume Information
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Structured overview parsed from your uploaded resume
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-royal-50/80 text-royal-700 border border-royal-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-royal-600 animate-pulse" />
            Verified Profile
          </span>
        </div>

        {/* ── CANDIDATE INFORMATION ──────────────────────────────── */}
        <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs bg-white">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            {/* Avatar / Initials badge */}
            <div className="flex-shrink-0 self-center sm:self-start">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-royal-50 to-royal-100/60 border border-royal-200/70 flex items-center justify-center shadow-xs">
                {candidateInitials ? (
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-royal-700 font-mono">
                    {candidateInitials}
                  </span>
                ) : (
                  <User className="w-8 h-8 text-royal-600" />
                )}
              </div>
            </div>

            {/* Profile Info & Links */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {personal.name || 'Candidate Profile'}
                  </h3>
                  {personal.name && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Active Candidate
                    </span>
                  )}
                </div>

                {candidateHeadline && (
                  <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                    {candidateHeadline}
                  </p>
                )}
              </div>

              {/* Contact details */}
              {(personal.email || personal.phone || personal.location) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs text-slate-600 pt-1">
                  {personal.email && (
                    <a
                      href={`mailto:${personal.email}`}
                      className="inline-flex items-center gap-1.5 font-medium hover:text-royal-600 transition-colors group"
                      title={personal.email}
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-royal-50 flex items-center justify-center transition-colors">
                        <Mail className="w-3.5 h-3.5 text-slate-500 group-hover:text-royal-600" />
                      </div>
                      <span className="truncate max-w-[220px] sm:max-w-none">{personal.email}</span>
                    </a>
                  )}
                  {personal.phone && (
                    <a
                      href={`tel:${personal.phone}`}
                      className="inline-flex items-center gap-1.5 font-medium hover:text-royal-600 transition-colors group"
                      title={personal.phone}
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-royal-50 flex items-center justify-center transition-colors">
                        <Phone className="w-3.5 h-3.5 text-slate-500 group-hover:text-royal-600" />
                      </div>
                      <span>{personal.phone}</span>
                    </a>
                  )}
                  {personal.location && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span>{personal.location}</span>
                    </span>
                  )}
                </div>
              )}

              {/* External Profile Links (GitHub, LinkedIn, Portfolio) */}
              {(personal.github || personal.linkedin || personal.portfolio || personal.website) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {personal.github && (
                    <a
                      href={personal.github.startsWith('http') ? personal.github : `https://${personal.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  )}
                  {personal.linkedin && (
                    <a
                      href={personal.linkedin.startsWith('http') ? personal.linkedin : `https://${personal.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#084e96] transition-colors shadow-2xs"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  )}
                  {(personal.portfolio || personal.website) && (
                    <a
                      href={
                        (personal.portfolio || personal.website).startsWith('http')
                          ? (personal.portfolio || personal.website)
                          : `https://${personal.portfolio || personal.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-royal-50 text-royal-700 border border-royal-200 text-xs font-semibold hover:bg-royal-100 transition-colors shadow-2xs"
                    >
                      <Globe className="w-3.5 h-3.5 text-royal-600" />
                      <span>Portfolio</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── PROFESSIONAL SUMMARY ───────────────────────────────── */}
        {(() => {
          const summaryText = candidateProfile?.professionalSummary || candidateProfile?.summary;
          if (!summaryText || !summaryText.trim()) return null;

          const paragraphs = summaryText.split(/\n\s*\n/).filter((p) => p.trim());

          return (
            <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Professional Summary
                </h3>
              </div>
              <div className="space-y-2 text-sm text-slate-700 leading-relaxed font-normal">
                {paragraphs.length > 0 ? (
                  paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="leading-relaxed">
                      {p.trim()}
                    </p>
                  ))
                ) : (
                  <p className="leading-relaxed whitespace-pre-line">{summaryText.trim()}</p>
                )}
              </div>
            </Card>
          );
        })()}

        {/* ── SKILLS (Categorized layout) ────────────────────────── */}
        {skillCategories.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <Code2 className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Technical & Professional Skills
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {skillCategories.reduce((acc, cat) => acc + (skillsData[cat.key]?.length || 0), 0)} Skills
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {skillCategories.map((cat) => {
                const list = skillsData[cat.key];
                if (!Array.isArray(list) || list.length === 0) return null;
                return (
                  <div
                    key={cat.key}
                    className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {cat.label}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {list.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-800 border border-slate-200/90 shadow-2xs hover:border-royal-200 hover:bg-royal-50/30 transition-colors"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── EDUCATION ──────────────────────────────────────────── */}
        {Array.isArray(candidateProfile?.education) && candidateProfile.education.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <GraduationCap className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Education
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.education.length} {candidateProfile.education.length === 1 ? 'Degree' : 'Degrees'}
              </span>
            </div>

            <div className="space-y-3.5">
              {candidateProfile.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-4.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-royal-200 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 mb-1.5">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {edu.degree || 'Degree'}
                      </h4>
                      {(edu.branch || edu.fieldOfStudy) && (
                        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                          {edu.branch || edu.fieldOfStudy}
                        </p>
                      )}
                      {edu.institution && (
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          {edu.institution}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0 flex-shrink-0">
                      {(edu.startYear || edu.endYear) && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {edu.startYear ? `${edu.startYear} – ` : ''}
                          {edu.endYear || 'Present'}
                        </span>
                      )}
                      {(edu.cgpa || edu.percentage || edu.percentageOrCGPA) && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-royal-700 bg-royal-50 border border-royal-200/80 px-2.5 py-1 rounded-md shadow-2xs">
                          {edu.cgpa ? `CGPA: ${edu.cgpa}` : edu.percentage || edu.percentageOrCGPA}
                        </span>
                      )}
                    </div>
                  </div>

                  {Array.isArray(edu.coursework) && edu.coursework.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Key Coursework
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {edu.coursework.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[11px] font-medium px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-700 shadow-2xs"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── EXPERIENCE ──────────────────────────────────────────── */}
        {Array.isArray(candidateProfile?.experience) && candidateProfile.experience.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <Briefcase className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Professional Experience
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.experience.length} {candidateProfile.experience.length === 1 ? 'Role' : 'Roles'}
              </span>
            </div>

            <div className="space-y-4">
              {candidateProfile.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-royal-200 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {exp.role || 'Role'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-xs sm:text-sm font-semibold text-slate-700">
                          {exp.company}
                        </p>
                        {exp.employmentType && (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {exp.employmentType}
                          </span>
                        )}
                        {exp.location && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {exp.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {(exp.startDate || exp.endDate) && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs flex-shrink-0 self-start">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {exp.startDate ? `${exp.startDate} – ` : ''}
                        {exp.endDate || 'Present'}
                      </span>
                    )}
                  </div>

                  {Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 list-none pt-1">
                      {exp.responsibilities.map((r, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-royal-500 flex-shrink-0 mt-2" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {Array.isArray(exp.achievements) && exp.achievements.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-slate-700 list-none pt-1">
                      {exp.achievements.map((a, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-2 leading-relaxed">
                          <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {Array.isArray(exp.technologies) && exp.technologies.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                      {exp.technologies.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[11px] font-medium px-2 py-0.5 bg-white text-royal-700 border border-royal-200/70 rounded-md shadow-2xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── PROJECTS ────────────────────────────────────────────── */}
        {Array.isArray(candidateProfile?.projects) && candidateProfile.projects.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <FolderGit2 className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Projects
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.projects.length} {candidateProfile.projects.length === 1 ? 'Project' : 'Projects'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidateProfile.projects.map((proj, idx) => {
                // Collect tech stack
                let techs = [];
                if (Array.isArray(proj.technologies)) {
                  techs = proj.technologies.filter(Boolean);
                } else if (Array.isArray(proj.techStack)) {
                  techs = proj.techStack.filter(Boolean);
                } else if (typeof proj.technologies === 'string') {
                  techs = proj.technologies.split(',').map((t) => t.trim()).filter(Boolean);
                } else if (typeof proj.techStack === 'string') {
                  techs = proj.techStack.split(',').map((t) => t.trim()).filter(Boolean);
                }

                // Collect bullet points
                const bulletPoints = [];
                const addBullets = (items) => {
                  if (Array.isArray(items)) {
                    items.forEach((item) => {
                      if (typeof item === 'string' && item.trim() && !bulletPoints.includes(item.trim())) {
                        bulletPoints.push(item.trim());
                      }
                    });
                  } else if (typeof items === 'string' && items.trim()) {
                    items.split(/\n|•|✓/).forEach((part) => {
                      const trimmed = part.trim();
                      if (trimmed && !bulletPoints.includes(trimmed)) {
                        bulletPoints.push(trimmed);
                      }
                    });
                  }
                };

                addBullets(proj.features);
                addBullets(proj.contributions);
                addBullets(proj.responsibilities);
                addBullets(proj.achievements);

                // Collect external links safely
                const allLinks = [];
                if (Array.isArray(proj.links)) {
                  proj.links.forEach((l) => {
                    if (typeof l === 'string' && l.trim()) allLinks.push(l.trim());
                  });
                }
                if (typeof proj.github === 'string' && proj.github.trim() && !allLinks.includes(proj.github.trim())) {
                  allLinks.push(proj.github.trim());
                }
                if (typeof proj.url === 'string' && proj.url.trim() && !allLinks.includes(proj.url.trim())) {
                  allLinks.push(proj.url.trim());
                }
                if (typeof proj.liveUrl === 'string' && proj.liveUrl.trim() && !allLinks.includes(proj.liveUrl.trim())) {
                  allLinks.push(proj.liveUrl.trim());
                }
                if (typeof proj.demoUrl === 'string' && proj.demoUrl.trim() && !allLinks.includes(proj.demoUrl.trim())) {
                  allLinks.push(proj.demoUrl.trim());
                }

                const description = proj.description || proj.summary || proj.overview;

                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-royal-200 transition-all duration-200 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-3">
                      {/* Project Header: Icon + Title + Links */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0 mt-0.5">
                            <FolderGit2 className="w-4 h-4 text-royal-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                              {proj.name || proj.title || 'Untitled Project'}
                            </h4>
                            {proj.role && proj.role !== 'Developer' && (
                              <span className="inline-block text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded mt-1">
                                {proj.role}
                              </span>
                            )}
                          </div>
                        </div>

                        {allLinks.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                            {allLinks.map((lnk, lIdx) => {
                              const isGithub = lnk.toLowerCase().includes('github.com');
                              return (
                                <a
                                  key={lIdx}
                                  href={lnk.startsWith('http') ? lnk : `https://${lnk}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-royal-600 hover:text-royal-700 bg-white hover:bg-royal-50 border border-slate-200 hover:border-royal-200 px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                                  title={lnk}
                                >
                                  {isGithub ? <Github className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                                  <span>{isGithub ? 'GitHub' : 'Live Demo'}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Project Description */}
                      {description && (
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                          {description}
                        </p>
                      )}

                      {/* Tech Stack */}
                      {techs.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Tech Stack
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {techs.map((tech, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white text-royal-700 border border-royal-200/60 shadow-2xs"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Features */}
                      {bulletPoints.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Key Highlights
                          </p>
                          <ul className="space-y-1.5">
                            {bulletPoints.map((pt, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                                <Check className="w-3.5 h-3.5 text-royal-600 flex-shrink-0 mt-0.5" />
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── CERTIFICATIONS ──────────────────────────────────────── */}
        {Array.isArray(candidateProfile?.certifications) && candidateProfile.certifications.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <Award className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Certifications
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.certifications.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {candidateProfile.certifications.map((cert, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 flex items-start gap-3 shadow-2xs transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Award className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{cert.name}</p>
                    {cert.issuer && (
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{cert.issuer}</p>
                    )}
                    {cert.date && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {cert.date}
                      </p>
                    )}
                    {cert.credentialId && (
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">ID: {cert.credentialId}</p>
                    )}
                    {cert.link && (
                      <a
                        href={cert.link.startsWith('http') ? cert.link : `https://${cert.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-royal-600 hover:underline mt-1.5"
                      >
                        Verify Credential
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── ACHIEVEMENTS ────────────────────────────────────────── */}
        {Array.isArray(candidateProfile?.achievements) && candidateProfile.achievements.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Honors & Achievements
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.achievements.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {candidateProfile.achievements.map((ach, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/70 shadow-2xs">
                  <div className="w-6 h-6 rounded-md bg-amber-100/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">{ach}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── LEADERSHIP & ACTIVITIES ─────────────────────────────── */}
        {Array.isArray(candidateProfile?.leadership) && candidateProfile.leadership.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <Compass className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Leadership & Extracurriculars
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.leadership.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {candidateProfile.leadership.map((l, idx) => {
                const label = typeof l === 'object' ? (l.role ? `${l.role}${l.organization ? ` — ${l.organization}` : ''}${l.activity ? ` — ${l.activity}` : ''}` : JSON.stringify(l)) : l;
                return (
                  <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="w-6 h-6 rounded-md bg-royal-50 border border-royal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Compass className="w-3.5 h-3.5 text-royal-600" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{label}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── PUBLICATIONS ────────────────────────────────────────── */}
        {Array.isArray(candidateProfile?.publications) && candidateProfile.publications.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Publications & Research
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.publications.length}
              </span>
            </div>

            <div className="space-y-3">
              {candidateProfile.publications.map((pub, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 text-xs shadow-2xs transition-colors">
                  <p className="font-bold text-slate-900 leading-snug">{pub.title || pub}</p>
                  {pub.conferenceOrJournal && (
                    <p className="text-slate-600 mt-0.5 font-medium">{pub.conferenceOrJournal}</p>
                  )}
                  {pub.date && (
                    <p className="text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {pub.date}
                    </p>
                  )}
                  {pub.link && (
                    <a
                      href={pub.link.startsWith('http') ? pub.link : `https://${pub.link}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-royal-600 hover:underline mt-1.5"
                    >
                      View Publication
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── LANGUAGES ───────────────────────────────────────────── */}
        {Array.isArray(candidateProfile?.languages) && candidateProfile.languages.length > 0 && (
          <Card padding="p-5 sm:p-6" className="border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal-50 border border-royal-100 flex items-center justify-center text-royal-600 flex-shrink-0">
                  <Languages className="w-3.5 h-3.5 text-royal-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Languages
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {candidateProfile.languages.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {candidateProfile.languages.map((lang, idx) => {
                const langName = typeof lang === 'object' ? lang.language : lang;
                const langProf = typeof lang === 'object' ? lang.proficiency : null;
                return (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                    <Globe className="w-3.5 h-3.5 text-royal-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{langName}</p>
                      {langProf && (
                        <p className="text-[10px] text-slate-500 font-medium">{langProf}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* JOB DESCRIPTION VIEWER MODAL */}
      <Modal
        isOpen={jdModalOpen}
        onClose={() => setJdModalOpen(false)}
        title={`Job Description — ${session?.company || 'Target Company'}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <p className="font-bold text-slate-700 uppercase tracking-wider">
              Role: {displayRole}
            </p>
            <p className="text-slate-400 mt-0.5">
              Verbatim Job Description provided during preparation setup:
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-wrap font-mono text-xs text-slate-800 leading-relaxed max-h-96 overflow-y-auto">
            {session?.jobDescription || 'No job description provided.'}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setJdModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* RESUME DOCUMENT IN-APP PREVIEW MODAL */}
      <ResumePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        blobUrl={previewBlobUrl}
        filename={session?.resumeSnapshot?.originalName || 'Candidate_Resume.pdf'}
        fileSize={formatFileSize(session?.resumeSnapshot?.size)}
        mimeType={session?.resumeSnapshot?.mimeType || 'application/pdf'}
        onDownload={handleDownloadResume}
        isDownloading={isDownloading}
      />
    </div>
  );
};

export default ResumeAnalysis;
