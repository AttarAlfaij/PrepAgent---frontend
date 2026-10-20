import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Brain,
  ChevronDown,
  ChevronUp,
  Play,
  ArrowLeft,
  Target,
  Sparkles,
  Layers,
  History,
  ShieldAlert,
  Lightbulb,
  Compass,
} from 'lucide-react';
import interviewAgentService from '../services/interviewAgentService';
import EnvironmentReportSection from '../components/interview/monitoring/EnvironmentReportSection';

const InterviewReport = () => {
  const { sessionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryInterviewId = searchParams.get('interviewId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportPayload, setReportPayload] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [mistakesMemory, setMistakesMemory] = useState([]);
  const [expandedQuestions, setExpandedQuestions] = useState({ 0: true });
  const [showBetterAnswer, setShowBetterAnswer] = useState({});

  const formatDuration = (sec) => {
    const total = Math.max(0, Math.round(Number(sec) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}m ${secs}s`;
  };

  useEffect(() => {
    let mounted = true;
    const fetchReportAndHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch history & persistent mistakes in parallel
        const [histRes, mistakesRes] = await Promise.all([
          interviewAgentService.getInterviewHistory(
            sessionId && sessionId !== 'default' ? sessionId : null
          ),
          interviewAgentService.getInterviewMistakes(),
        ]);

        if (!mounted) return;
        const historyItems = histRes?.data || [];
        setHistoryList(historyItems);
        setMistakesMemory(mistakesRes?.data || []);

        const targetId =
          queryInterviewId ||
          historyItems.find((h) => h.status === 'COMPLETED')?._id ||
          historyItems[0]?._id;

        if (!targetId) {
          setReportPayload(null);
          setLoading(false);
          return;
        }

        const repRes = await interviewAgentService.getInterviewReport(targetId);
        if (!mounted) return;
        setReportPayload(repRes?.data || null);
        if (repRes?.data?.persistentMistakes) {
          setMistakesMemory(repRes.data.persistentMistakes);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Unable to load interview report.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchReportAndHistory();
    return () => {
      mounted = false;
    };
  }, [sessionId, queryInterviewId]);

  const toggleQuestionAccordion = (idx) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const toggleBetterAnswer = (idx) => {
    setShowBetterAnswer((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Helper to determine Answer Quality Badge based on real evaluation evidence
  const getAnswerQualityBadge = (qItem) => {
    const score = Number(qItem.score || 0);
    const text = (qItem.candidateAnswer || '').trim();
    const mistakes = Array.isArray(qItem.mistakes) ? qItem.mistakes : [];
    const missing = Array.isArray(qItem.whatWasMissing) ? qItem.whatWasMissing : [];
    const comm = Number(qItem.communication || 0);
    const relevance = Number(qItem.relevance || 0);

    if (!text || text.length < 20) {
      return { label: 'Too Short', colorClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (relevance > 0 && relevance < 45) {
      return { label: 'Off Topic', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (mistakes.length > 0 && mistakes.some((m) => m.severity === 'HIGH')) {
      return { label: 'Incorrect Technical Information', colorClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (score >= 82) {
      return { label: 'Strong Answer', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (score >= 70) {
      return { label: 'Good Answer', colorClass: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (missing.length >= 2 || score < 55) {
      return { label: 'Missing Technical Details', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (comm < 50) {
      return { label: 'Weak Explanation', colorClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    return { label: 'Needs More Detail', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  // Helper to generate a contextual, high-impact mentor model answer
  const generateStrongerAnswer = (qItem, targetRole = 'Software Engineer', companyName = 'the company') => {
    if (qItem.betterAnswer) return qItem.betterAnswer;

    const topic = qItem.topic || 'Core Engineering';
    const missing = Array.isArray(qItem.whatWasMissing) && qItem.whatWasMissing.length > 0
      ? qItem.whatWasMissing
      : Array.isArray(qItem.expectedConcepts) && qItem.expectedConcepts.length > 0
      ? qItem.expectedConcepts
      : ['concrete implementation details', 'trade-offs and production scaling considerations'];

    const qType = (qItem.questionType || 'TECHNICAL').toUpperCase();

    // Behavioral / HR scenario formatting using STAR method
    if (qType === 'HR' || qType === 'BEHAVIORAL') {
      return `Situation: In my previous project as a ${targetRole}, our team faced a situation involving ${topic} where requirements were evolving quickly and we needed to maintain product quality under tight deadlines.

Task: My objective was to define a clear technical roadmap, align expectations with cross-functional team members, and ensure the deliverables adhered to strict standards (${missing[0] || 'clear process guidelines'}).

Action:
1. Conducted an initial gap analysis to isolate the main constraint (${missing[0] || 'root cause assessment'}).
2. Communicated proactively with stakeholders, sharing structured updates and facilitating trade-off decisions (${missing[1] || 'stakeholder alignment'}).
3. Delivered the solution iteratively with comprehensive unit/integration test coverage and clear documentation.

Result: We successfully launched on time with zero high-severity incidents, improving workflow efficiency by 25% and establishing an onboarding template for subsequent project cycles.`;
    }

    // Technical / Coding / Architectural formatting
    return `To deliver a high-scoring answer for a ${targetRole} interview, follow a 3-part structured delivery: High-Level Approach → Technical Implementation → Production Trade-Offs.

1. High-Level Approach & Architecture:
Frame the concept concisely before diving into implementation:
"When designing or implementing ${topic}, I separate concerns into distinct layers: incoming request validation, domain service logic, and efficient data persistence. This ensures high testability, maintainability, and clean decoupling."

2. Implementation & Key Concepts:
Directly address the core concepts expected for this question:
${missing.map((m) => `• ${m}: Explain the underlying mechanics, chosen data structures, or query patterns rather than only describing the outcome.`).join('\n')}

3. Production Edge Cases & Scaling:
Close by demonstrating practical engineering maturity:
"In production environments, we must anticipate failure modes such as network latency, database connection exhaustion, and edge-case concurrency. We mitigate these through robust error-handling middleware, connection pooling, structured logging, and appropriate indexing or caching strategies."`;
  };

  // Derived Weak Areas (Sorted lowest score first with evidence-backed explanations)
  const weakAreasList = useMemo(() => {
    if (!reportPayload?.finalReport) return [];
    const skillScores = reportPayload.finalReport.skillScores || {};
    const improvementAreas = reportPayload.finalReport.improvementAreas || [];
    const weaknesses = reportPayload.finalReport.weaknesses || [];
    const questions = reportPayload.finalReport.questionByQuestionAnalysis || [];

    const rawSkills = [
      {
        key: 'technicalKnowledge',
        label: 'Technical Knowledge',
        val: Number(skillScores.technicalKnowledge || 0),
        defaultExplanation: 'Your answers were generally correct but often lacked implementation-level details and edge-case depth.',
      },
      {
        key: 'problemSolving',
        label: 'Problem Solving & Logic',
        val: Number(skillScores.problemSolving || 0),
        defaultExplanation: 'Break down complex challenges into step-by-step algorithms and clearly articulate trade-offs.',
      },
      {
        key: 'communication',
        label: 'Communication & Clarity',
        val: Number(skillScores.communication || 0),
        defaultExplanation: 'Keep responses concise, well-structured, and focused on directly answering the core question prompts.',
      },
      {
        key: 'resumeKnowledge',
        label: 'Project & Resume Mastery',
        val: Number(skillScores.resumeKnowledge || 0),
        defaultExplanation: 'Be prepared to explain architectural decisions, database schemas, and your individual technical contributions.',
      },
      {
        key: 'behavioralPerformance',
        label: 'Answer Structure & Ownership',
        val: Number(skillScores.behavioralPerformance || 0),
        defaultExplanation: 'Structure answers using the STAR framework (Situation, Task, Action, Result) with measurable metrics.',
      },
      {
        key: 'roleSpecificSkills',
        label: 'Role-Specific Fit',
        val: Number(skillScores.roleSpecificSkills || 0),
        defaultExplanation: 'Deepen familiarity with industry best practices and core competencies required for this role.',
      },
    ].filter((s) => s.val > 0);

    // Sort ascending (lowest score first)
    const sorted = [...rawSkills].sort((a, b) => a.val - b.val);

    return sorted.map((s, idx) => {
      const matchingArea = improvementAreas.find(
        (a) => a.skill && (a.skill.toLowerCase().includes(s.label.toLowerCase()) || s.label.toLowerCase().includes(a.skill.toLowerCase()))
      );
      const matchingQuestion = questions.find(
        (q) => q.topic && (q.topic.toLowerCase().includes(s.label.toLowerCase()) || s.label.toLowerCase().includes(q.topic.toLowerCase())) && q.score < 70
      );

      let explanation = s.defaultExplanation;
      if (matchingArea?.interviewEvidence) {
        explanation = matchingArea.interviewEvidence;
      } else if (matchingQuestion?.whatWasMissing?.[0]) {
        explanation = `Needs deeper focus on: ${matchingQuestion.whatWasMissing[0]}`;
      } else if (weaknesses[idx]) {
        explanation = weaknesses[idx];
      }

      return {
        ...s,
        explanation,
      };
    });
  }, [reportPayload]);

  // Derived Strengths
  const strengthsList = useMemo(() => {
    if (!reportPayload?.finalReport) return [];
    const directStrengths = reportPayload.finalReport.strengths || [];
    if (directStrengths.length > 0) return directStrengths;

    const fromQuestions = (reportPayload.finalReport.questionByQuestionAnalysis || [])
      .flatMap((q) => q.whatWasGood || [])
      .filter((s) => s && s.length > 5);
    const unique = [...new Set(fromQuestions)];
    if (unique.length > 0) return unique.slice(0, 5);

    return ['Engaged directly with interview prompts throughout the session'];
  }, [reportPayload]);

  // Derived Weaknesses
  const weaknessesList = useMemo(() => {
    if (!reportPayload?.finalReport) return [];
    const directWeaknesses = reportPayload.finalReport.weaknesses || [];
    if (directWeaknesses.length > 0) return directWeaknesses;

    const fromQuestions = (reportPayload.finalReport.questionByQuestionAnalysis || [])
      .flatMap((q) => q.whatWasMissing || (q.mistakes || []).map((m) => m.concept))
      .filter((w) => w && w.length > 3);
    const unique = [...new Set(fromQuestions)];
    if (unique.length > 0) return unique.slice(0, 5);

    return ['Technical depth in edge cases and scaling considerations'];
  }, [reportPayload]);

  // Derived Recommendations
  const recommendationsList = useMemo(() => {
    if (!reportPayload?.finalReport) return [];
    const recs = reportPayload.finalReport.recommendations || [];
    if (recs.length > 0) return recs;

    const weaknesses = reportPayload.finalReport.weaknesses || [];
    if (weaknesses.length > 0) {
      return weaknesses.slice(0, 4).map((w, i) => ({
        title: `Strengthen ${w.length > 40 ? w.slice(0, 37) + '...' : w}`,
        description: `Dedicate focused prep sessions to address this identified area. Practice structuring your reasoning step-by-step.`,
        category: i % 2 === 0 ? 'Technical' : 'Communication',
      }));
    }

    return [
      {
        title: 'Deepen Technical Implementation Details',
        description: 'Practice explaining not just what technologies you used, but why you chose them over alternatives and how they scale.',
        category: 'Technical',
      },
      {
        title: 'Structure Behavioral Answers with STAR Metrics',
        description: 'Quantify the final impact and engineering metrics when describing past project challenges.',
        category: 'Communication',
      },
      {
        title: 'Review Missing Concepts from Question Breakdown',
        description: 'Review the missing concepts highlighted in your question breakdown and build concrete examples for each.',
        category: 'Problem Solving',
      },
    ];
  }, [reportPayload]);

  // Derived Improvement Plan
  const improvementPlanItems = useMemo(() => {
    if (!reportPayload?.finalReport) return [];
    const improvementAreas = reportPayload.finalReport.improvementAreas || [];
    const recommendations = reportPayload.finalReport.recommendations || [];

    if (improvementAreas.length > 0) {
      return improvementAreas.slice(0, 3).map((item, idx) => ({
        area: item.skill,
        action: item.interviewEvidence || item.skillGapConnection || recommendations[idx]?.description || 'Practice explaining core concepts with real-world examples.',
        priority: item.priority || (idx === 0 ? 'High' : idx === 1 ? 'Medium' : 'Focused'),
      }));
    }

    if (weakAreasList.length > 0) {
      return weakAreasList.slice(0, 3).map((w, idx) => ({
        area: w.label,
        action: recommendations[idx]?.description || w.explanation,
        priority: idx === 0 ? 'High' : idx === 1 ? 'Medium' : 'Focused',
      }));
    }

    return [
      {
        area: 'Technical Depth',
        action: 'Practice explaining implementation decisions and edge cases.',
        priority: 'High',
      },
      {
        area: 'Answer Structure',
        action: 'Structure answers using a clear beginning, approach, implementation, and result.',
        priority: 'Medium',
      },
      {
        area: 'Communication',
        action: 'Give concise answers with a clear logical sequence.',
        priority: 'Focused',
      },
    ];
  }, [reportPayload, weakAreasList]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mb-4 animate-pulse">
          <Brain className="w-7 h-7 text-indigo-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Synthesizing Final AI Interview Evaluation Report...
        </h2>
        <p className="text-xs text-slate-500 max-w-md">
          Aggregating question-by-question technical accuracy, mentor feedback, skill scores, and personalized improvement plan.
        </p>
      </div>
    );
  }

  if (!reportPayload || !reportPayload.finalReport) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Award className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          No Completed Interview Report Yet
        </h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
          Start an autonomous AI Mock Interview session first. Once completed, your comprehensive evaluation, detailed mentor feedback, and improvement plan will appear here.
        </p>
        <button
          onClick={() => navigate(`/preparation/${sessionId || 'default'}/mock-interview`)}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Start AI Mock Interview</span>
        </button>
      </div>
    );
  }

  const report = reportPayload.finalReport;
  const overall = report.overallPerformance || {};
  const skillScores = report.skillScores || {};
  const questionsAnalysis = report.questionByQuestionAnalysis || [];

  const overallScore = Math.round(Number(overall.overallScore || 0));
  const scoreColorClass =
    overallScore >= 75
      ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
      : overallScore >= 55
      ? 'text-blue-700 border-blue-300 bg-blue-50'
      : 'text-amber-700 border-amber-300 bg-amber-50';

  const questionsAnswered = overall.questionsAnswered || questionsAnalysis.length || 0;
  const totalQuestions =
    reportPayload.totalQuestions ||
    overall.plannedQuestions ||
    Math.max(questionsAnswered, questionsAnalysis.length);

  const interviewDuration = formatDuration(
    overall.interviewDurationSeconds || reportPayload.elapsedSeconds || reportPayload.duration || 0
  );

  const interviewType = reportPayload.interviewType || overall.interviewType || 'Mixed';

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      {/* ==================================================
          PAGE HEADER: TITLE, COMPANY, ROLE & CONTROLS
          ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(sessionId ? `/preparation/${sessionId}` : '/dashboard')}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Back to Preparation"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Final AI Interview Evaluation Report
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {interviewType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {reportPayload.companyName || 'Target Company'} • {reportPayload.targetRole || 'Software Engineer'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {historyList.length > 1 && (
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <select
                value={reportPayload.interviewId}
                onChange={(e) => setSearchParams({ interviewId: e.target.value })}
                className="text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {historyList.map((item, idx) => (
                  <option key={item._id} value={item._id}>
                    Session #{historyList.length - idx} ({item.interviewType}) —{' '}
                    {item.overallScore !== null ? `${item.overallScore}%` : item.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => navigate(`/preparation/${sessionId || 'default'}/mock-interview`)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice Another Interview</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ==================================================
          1. TOP — OVERALL INTERVIEW PERFORMANCE
          ================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            INTERVIEW PERFORMANCE
          </h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${scoreColorClass}`}>
            <Award className="w-3.5 h-3.5" />
            <span>{overall.readinessVerdict || (overallScore >= 75 ? 'Interview Ready' : overallScore >= 55 ? 'Approaching Readiness' : 'Developing')}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Overall Score */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Overall Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {overallScore}
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-400">
                / 100
              </span>
            </div>
          </div>

          {/* Questions Answered */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Questions Answered
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {questionsAnswered}
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-400">
                / {totalQuestions}
              </span>
            </div>
          </div>

          {/* Duration */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Interview Duration
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 truncate">
                {interviewDuration}
              </span>
            </div>
          </div>

          {/* Interview Type */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Interview Type
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Layers className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 capitalize truncate">
                {interviewType}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          2. PERFORMANCE SUMMARY
          ================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Performance Summary</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          {overall.executiveSummary ||
            `You completed ${questionsAnswered} questions in your ${interviewType} interview for ${reportPayload.targetRole || 'the role'} at ${reportPayload.companyName || 'the target company'}. Your responses were evaluated at an overall score of ${overallScore}%.`}
        </p>
      </div>

      {/* ==================================================
          3. WHAT YOU DID WELL & 4. WHAT YOU NEED TO IMPROVE
          ================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 3: What You Did Well */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">What You Did Well</h3>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
            {strengthsList.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  ✓
                </span>
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 4: What You Need to Improve */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">What You Need to Improve</h3>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
            {weaknessesList.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  ⚠
                </span>
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ==================================================
          5. YOUR WEAK AREAS
          ================================================== */}
      {weakAreasList.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Weak Areas</h3>
                <p className="text-xs text-slate-500">
                  Ranked by focus need based on your actual interview answers and concept coverage
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full self-start sm:self-auto">
              Lowest Scores First
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {weakAreasList.map((area) => (
              <div
                key={area.key}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{area.label}</span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      area.val >= 75
                        ? 'bg-emerald-100 text-emerald-800'
                        : area.val >= 55
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {area.val}%
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      area.val >= 75
                        ? 'bg-emerald-500'
                        : area.val >= 55
                        ? 'bg-blue-600'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(6, Math.min(100, area.val))}%` }}
                  />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  "{area.explanation}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================
          6. SKILL-WISE PERFORMANCE
          ================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Skill Performance</h3>
            <p className="text-xs text-slate-500">
              Evaluated across technical knowledge, problem solving, communication, resume depth, and role fit
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Technical Knowledge', val: skillScores.technicalKnowledge || 0 },
            { label: 'Problem Solving & Logic', val: skillScores.problemSolving || 0 },
            { label: 'Communication & Clarity', val: skillScores.communication || 0 },
            { label: 'Project Knowledge', val: skillScores.resumeKnowledge || 0 },
            { label: 'Answer Structure & Ownership', val: skillScores.behavioralPerformance || 0 },
            { label: 'Role Fit', val: skillScores.roleSpecificSkills || 0 },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 truncate">{item.label}</span>
                <span
                  className={`font-extrabold ${
                    item.val >= 75
                      ? 'text-emerald-600'
                      : item.val >= 55
                      ? 'text-indigo-600'
                      : 'text-amber-600'
                  }`}
                >
                  {item.val}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.val >= 75
                      ? 'bg-emerald-500'
                      : item.val >= 55
                      ? 'bg-indigo-600'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.max(6, Math.min(100, item.val))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================================================
          7. QUESTION-BY-QUESTION FEEDBACK
          ================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">
            Question-by-Question Feedback
          </h3>
          <p className="text-xs text-slate-500">
            Review your transcript, evaluation metrics, strengths, areas for improvement, and mentor model answers for each question
          </p>
        </div>

        <div className="space-y-3.5">
          {questionsAnalysis.map((qItem, idx) => {
            const isOpen = Boolean(expandedQuestions[idx]);
            const badge = getAnswerQualityBadge(qItem);
            const questionScore = Math.round(Number(qItem.score || 0));

            return (
              <div
                key={qItem.questionId || idx}
                className="rounded-xl border border-slate-200 overflow-hidden transition-all shadow-2xs"
              >
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => toggleQuestionAccordion(idx)}
                  className="w-full p-4 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between gap-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                      Q{qItem.index || idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {qItem.question}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.colorClass}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {qItem.topic || 'General Topic'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        questionScore >= 75
                          ? 'bg-emerald-100 text-emerald-800'
                          : questionScore >= 50
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {questionScore}%
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Collapsible Content */}
                {isOpen && (
                  <div className="p-5 bg-white border-t border-slate-200 space-y-4 text-xs">
                    {/* Full Question */}
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        QUESTION {qItem.index || idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {qItem.question}
                      </p>
                    </div>

                    {/* Candidate's Actual Answer */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Your Answer
                      </span>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {qItem.candidateAnswer || '(No answer provided)'}
                      </p>
                    </div>

                    {/* Evaluation Metrics (Technical Accuracy, Relevance, Communication) */}
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Evaluation
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
                            Technical Accuracy
                          </span>
                          <span className="text-base font-extrabold text-slate-900">
                            {Math.round((Number(qItem.technicalAccuracy ?? qItem.score) || 0) / 10)} / 10
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
                            Relevance
                          </span>
                          <span className="text-base font-extrabold text-slate-900">
                            {Math.round((Number(qItem.relevance ?? (qItem.score ? qItem.score * 0.95 : 70)) || 0) / 10)} / 10
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
                            Communication
                          </span>
                          <span className="text-base font-extrabold text-slate-900">
                            {Math.round((Number(qItem.communication ?? qItem.score) || 0) / 10)} / 10
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* What You Did Well & What Could Be Improved */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                        <span className="font-bold text-emerald-800 block mb-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>What You Did Well</span>
                        </span>
                        <ul className="space-y-1 text-emerald-950">
                          {(Array.isArray(qItem.whatWasGood) && qItem.whatWasGood.length > 0
                            ? qItem.whatWasGood
                            : ['Addressed the question prompt directly']
                          ).map((g, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-700 font-bold">✓</span>
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                        <span className="font-bold text-amber-800 block mb-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>What Could Be Improved</span>
                        </span>
                        <ul className="space-y-1 text-amber-950">
                          {(Array.isArray(qItem.whatWasMissing) && qItem.whatWasMissing.length > 0
                            ? qItem.whatWasMissing
                            : Array.isArray(qItem.expectedConcepts) && qItem.expectedConcepts.length > 0
                            ? qItem.expectedConcepts
                            : ['Elaborate with deeper implementation details and edge-case reasoning']
                          ).map((m, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-700 font-bold">⚠</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Weak Area & How to Improve */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                          Weak Area
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {qItem.topic || 'Technical Depth'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                          How to Improve
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {qItem.aiFeedback ||
                            `Structure your response around the approach first, followed by concrete implementation details and edge-case handling for ${qItem.topic || 'the topic'}.`}
                        </p>
                      </div>
                    </div>

                    {/* View Better Answer Toggle Button */}
                    <div className="pt-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleBetterAnswer(idx)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{showBetterAnswer[idx] ? 'Hide Better Answer' : 'View Better Answer'}</span>
                      </button>
                    </div>

                    {/* View Better Answer Panel */}
                    {showBetterAnswer[idx] && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-slate-50 border border-indigo-200 space-y-2.5 animate-fadeIn">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span>Example of a Stronger Answer</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Mentor model answer demonstrating high technical depth, structured delivery, and trade-off analysis:
                        </p>
                        <div className="p-3.5 rounded-lg bg-white border border-indigo-100 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans shadow-2xs">
                          {generateStrongerAnswer(
                            qItem,
                            reportPayload.targetRole,
                            reportPayload.companyName
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================
          8. HOW TO IMPROVE
          ================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">How to Improve</h3>
            <p className="text-xs text-slate-500">
              Actionable recommendations based specifically on the weaknesses identified during your interview
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {recommendationsList.map((rec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3.5"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{rec.title}</h4>
                  {rec.category && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                      {rec.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================================================
          9. YOUR INTERVIEW IMPROVEMENT PLAN
          ================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Interview Improvement Plan</h3>
            <p className="text-xs text-slate-500">
              Structured action plan focused on your highest-impact growth areas to maximize interview readiness
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {improvementPlanItems.map((plan, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col justify-between gap-3"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block mb-1">
                  Focus Area {idx + 1}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-2">{plan.area}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">→ </strong>
                  {plan.action}
                </p>
              </div>
              {plan.priority && (
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 self-start">
                  {plan.priority} Priority
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Persistent Concept Mastery Memory (if any tracked) */}
        {mistakesMemory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Persistent Mistake Memory & Concept Tracker ({mistakesMemory.length} concepts)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mistakesMemory.slice(0, 6).map((mem) => (
                <div
                  key={mem._id || `${mem.skill}-${mem.concept}`}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 truncate">{mem.concept}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        mem.improvement === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {mem.improvement}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{mem.mistake}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================
          10. INTERVIEW ENVIRONMENT & INTEGRITY
          ================================================== */}
      <EnvironmentReportSection
        environmentSummary={reportPayload.environmentSummary}
        identityVerification={reportPayload.identityVerification}
        livenessVerification={reportPayload.livenessVerification}
        monitoringIncidents={reportPayload.monitoringIncidents || []}
      />
    </div>
  );
};

export default InterviewReport;
