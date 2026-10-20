import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { preparationService } from '../services/preparationService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ResumeOptimizationSection from '../components/preparation/ResumeOptimizationSection';

const TailoredResumeEditorPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [session, setSession] = useState(null);
  const [skillGapData, setSkillGapData] = useState(null);
  const [tailoredResume, setTailoredResume] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      // 1. Load Preparation Session
      const prepRes = await preparationService.getPreparationById(sessionId);
      const sessionData = prepRes.session || prepRes.data || prepRes;
      setSession(sessionData);

      // 2. Load Skill Gap Analysis data
      try {
        const skillGapRes = await preparationService.getSkillGapAnalysis(sessionId);
        setSkillGapData(skillGapRes.skillGapAnalysis || skillGapRes);
      } catch (sgErr) {
        console.warn('[TailoredResumeEditorPage] Could not load skill gap analysis:', sgErr?.message);
      }

      // 3. Load or generate Tailored Resume
      let resumeData = null;
      try {
        resumeData = await preparationService.getTailoredResume(sessionId);
      } catch (rErr) {
        // Not yet generated
      }

      if (resumeData?.tailoredResume?.content) {
        setTailoredResume(resumeData.tailoredResume);
      } else {
        // Auto-generate if not yet present
        try {
          const genRes = await preparationService.generateTailoredResume(sessionId);
          if (genRes.tailoredResume) {
            setTailoredResume(genRes.tailoredResume);
          }
        } catch (genErr) {
          console.error('[TailoredResumeEditorPage] Initial generation error:', genErr?.message);
        }
      }
    } catch (err) {
      console.error('[TailoredResumeEditorPage] Load failed:', err);
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError(err.response?.data?.message || 'Could not load tailored resume. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-royal-600 font-bold text-sm mb-1">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Improve Your Resume</span>
          </div>
          <h3 className="text-base font-bold text-slate-800">
            ✨ Preparing your resume...
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Optimizing your verified experience against target job requirements without fabricating false credentials.
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
          You do not have permission to view or edit this preparation session.
        </p>
        <Button onClick={() => navigate('/dashboard')} variant="primary" size="sm">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const displayRole = session?.displayRole || session?.targetRole || 'Target Role';
  const companyName = session?.company || 'Company';

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 select-text">
      {/* 1. Breadcrumb Navigation & Top-Right Action */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 overflow-x-auto whitespace-nowrap py-1">
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
          <span className="text-slate-900 font-bold">Improve Your Resume</span>
        </nav>

        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          disabled={!sessionId || loading}
          onClick={() => {
            if (sessionId) {
              navigate(`/preparation/${sessionId}/job-preparation-plan`);
            }
          }}
          className="text-xs font-semibold whitespace-nowrap shadow-sm ml-auto"
        >
          Continue Next
        </Button>
      </div>

      {/* Top Back and Next Links Bar */}
      <div className="flex items-center justify-between text-xs font-medium">
        <Link
          to={`/preparation/${sessionId}/skill-gap`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-royal-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Skill Gap Analysis</span>
        </Link>

        <button
          onClick={() => navigate(`/preparation/${sessionId}/job-preparation-plan`)}
          className="inline-flex items-center gap-1 text-royal-600 hover:text-royal-700 font-semibold transition-colors"
        >
          <span>Next: Job Preparation Plan</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={loadData}>
            Try Again
          </Button>
        </div>
      )}

      {/* 2. Dual Panel Improve Your Resume: AI Ideal Resume + Your Uploaded Resume */}
      <ResumeOptimizationSection
        sessionId={sessionId}
        companyName={companyName}
        targetRole={session?.targetRole}
        displayRole={displayRole}
        candidateProfile={session?.candidateProfile || {}}
        skillGapData={skillGapData}
        tailoredResume={tailoredResume}
        onTailoredResumeUpdate={(updated) => setTailoredResume(updated)}
      />
    </div>
  );
};

export default TailoredResumeEditorPage;
