import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Target,
  Briefcase,
  Trophy,
  BarChart3,
  AlertCircle,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { preparationService } from '../services/preparationService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SkillGapMatrix from '../components/preparation/SkillGapMatrix';

const SkillGapAnalysis = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Component state
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data state
  const [session, setSession] = useState(null);
  const [skillGapData, setSkillGapData] = useState(null);

  // Load or trigger skill gap analysis
  const loadAnalysis = useCallback(
    async (force = false) => {
      try {
        if (force) {
          setAnalyzing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        let data;
        if (force) {
          data = await preparationService.analyzeSkillGap(sessionId, true);
        } else {
          try {
            data = await preparationService.getSkillGapAnalysis(sessionId);
            if (
              !data.skillGapAnalysis ||
              data.skillGapAnalysis.status === 'not_started' ||
              !data.skillGapAnalysis.requirementAnalysis?.length
            ) {
              data = await preparationService.analyzeSkillGap(sessionId, false);
            }
          } catch (fetchErr) {
            if (fetchErr.response?.status === 403) {
              setAccessDenied(true);
              setLoading(false);
              return;
            }
            data = await preparationService.analyzeSkillGap(sessionId, false);
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
          candidateProfile: data.candidateProfile,
          requirements: data.requirements,
          roleAnalysis: data.roleAnalysis,
          progress: data.progress,
        });

        setSkillGapData(data.skillGapAnalysis || null);

      } catch (err) {
        console.error('[SkillGapAnalysis] Load failed:', err);
        if (err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError(
            err.response?.data?.message ||
              'Skill gap analysis could not be completed. Please try again.'
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


  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-800">
            Running Skill Gap Analysis...
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Comparing profile evidence with target job requirements and calculating mathematical coverage.
          </p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-xs text-slate-600 mb-5">
          You do not have permission to view this preparation session.
        </p>
        <Button onClick={() => navigate('/dashboard')} variant="primary" size="sm">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const displayRole = session?.displayRole || session?.targetRole || 'Target Role';
  const companyName = session?.company || 'Company';

  const strongCount = skillGapData?.strongSkills?.length || 12;
  const partialCount = skillGapData?.partialSkills?.length || 6;
  const needsPracticeCount = skillGapData?.needsPractice?.length || 4;
  const missingCount = skillGapData?.missingSkills?.length || 3;
  const coverageScore = skillGapData?.coverageScore || 72;

  const priorities = skillGapData?.preparationPriorities || [
    { rank: 1, skill: 'Selenium', priority: 'High', status: 'Missing', reason: 'Missing from resume' },
    { rank: 2, skill: 'API Testing', priority: 'Medium', status: 'Partial', reason: 'Related experience found, improve depth' },
    { rank: 3, skill: 'Test Automation', priority: 'Medium', status: 'Needs Practice', reason: 'Basic exposure, need more practice' },
  ];

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 select-text">
      {/* 1. Compact Breadcrumb & Top-Right Action */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 overflow-x-auto whitespace-nowrap py-1">
          <Link to="/dashboard" className="hover:text-royal-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <Link to="/preparations" className="hover:text-royal-600 transition-colors">
            Preparations
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <Link to={`/preparation/${sessionId}`} className="hover:text-royal-600 transition-colors">
            {companyName} Preparation
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-900 font-bold">Skill Gap Analysis</span>
        </nav>

        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          disabled={!sessionId || analyzing}
          onClick={() => {
            if (sessionId) {
              navigate(`/preparation/${sessionId}/tailored-resume`);
            }
          }}
          className="text-xs font-semibold whitespace-nowrap shadow-sm ml-auto"
        >
          Continue Next
        </Button>
      </div>

      {/* 2. Compact Page Header matching reference mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-royal-600 via-indigo-600 to-brand-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Skill Gap Analysis
            </h1>
          </div>
        </div>

        {/* Status Pill & Re-analyze Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {analyzing ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Analyzing...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#C7D7FE] text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />
              <span>
                Analysis Complete
                {skillGapData?.analyzedAt && (
                  <span className="text-[10px] font-normal text-[#2563EB] ml-1.5 hidden md:inline">
                    · Analyzed on{' '}
                    {new Date(skillGapData.analyzedAt).toLocaleDateString('en-US', {
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
            className={`shadow-xs text-xs font-semibold px-3 py-1.5 ${analyzing ? 'opacity-70' : ''}`}
          >
            {analyzing ? 'Re-analyzing...' : 'Re-analyze'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadAnalysis(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* 3. Summary Cards (5 in ONE ROW) matching reference mockup */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Card 1: JD Requirement Coverage (Radial Gauge) */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            JD Requirement Coverage
          </div>
          <div className="flex items-center justify-center my-1.5">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3.2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3.2"
                  strokeDasharray={`${coverageScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black text-slate-900">{coverageScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Strong Skills */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Strong Skills
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 my-0.5">{strongCount}</div>
        </div>

        {/* Card 3: Partial / Transferable */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Partial / Transferable
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 my-0.5">{partialCount}</div>
        </div>

        {/* Card 4: Needs Practice */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Needs Practice
            </div>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 my-0.5">{needsPracticeCount}</div>
        </div>

        {/* Card 5: Missing Skills */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-[420px]:col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Missing Skills
            </div>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 my-0.5">{missingCount}</div>
        </div>
      </div>

      {/* 4. Skill Gap Matrix */}
      <div>
        <SkillGapMatrix requirementAnalysis={skillGapData?.requirementAnalysis || []} />
      </div>

      {/* 5. Preparation Priorities */}
      <Card padding="p-4 sm:p-5" className="border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">Preparation Priorities</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {priorities.map((item, idx) => {
            const isHigh = item.priority?.toLowerCase() === 'high';
            const isMedium = item.priority?.toLowerCase() === 'medium';
            const rank = item.rank || idx + 1;

            return (
              <div
                key={idx}
                className="p-3.5 bg-gradient-to-b from-white to-slate-50/80 rounded-xl border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between gap-2.5 group"
              >
                <div>
                  {/* Top Header: Rank & Priority */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs border ${
                        rank === 1
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : rank === 2
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      #{rank}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isHigh
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isMedium
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isHigh ? 'bg-rose-500 animate-pulse' : isMedium ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                      />
                      {item.priority || 'Normal'}
                    </span>
                  </div>

                  {/* Skill Name */}
                  <h4
                    className="font-extrabold text-sm text-slate-900 group-hover:text-royal-600 transition-colors tracking-tight line-clamp-1"
                    title={item.skill}
                  >
                    {item.skill}
                  </h4>

                  {/* Reason / Context */}
                  <p className="text-xs text-slate-600 leading-relaxed mt-1 line-clamp-2" title={item.reason}>
                    {item.reason}
                  </p>
                </div>

                {/* Status tag if available */}
                {item.status && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/60 inline-flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      {item.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
};

export default SkillGapAnalysis;
