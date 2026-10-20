import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Flame,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Check,
  Send,
  Target,
  Layers,
  Terminal,
  Zap,
  Star,
  Copy,
  Info,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import codingService from '../services/codingService';
import { preparationService } from '../services/preparationService';

const CodingPreparation = () => {
  const { sessionId, problemId: routeProblemId } = useParams();
  const navigate = useNavigate();

  // Session & Target Role info
  const [session, setSession] = useState(null);

  // Platform State
  const [activeTab, setActiveTab] = useState('problems'); // 'problems' | 'workspace'
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState({
    totalSolved: 0,
    totalAttempted: 0,
    streak: 0,
    easySolved: 0,
    totalEasy: 0,
    mediumSolved: 0,
    totalMedium: 0,
    hardSolved: 0,
    totalHard: 0,
    totalProblems: 0,
  });
  const [topicProgress, setTopicProgress] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [rolePersonalization, setRolePersonalization] = useState({
    targetRole: 'Software Engineer',
    priorityTopics: [],
    recommendedCount: 0,
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Active Problem & Workspace State
  const [currentProblem, setCurrentProblem] = useState(null);
  const [problemLoading, setProblemLoading] = useState(false);
  const [language, setLanguage] = useState('python'); // 'python' | 'javascript' | 'java' | 'cpp'
  const [code, setCode] = useState('');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('description'); // 'description' | 'submissions' | 'ai'
  const [submissions, setSubmissions] = useState([]);

  // Execution & Testing State
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcases'); // 'testcases' | 'run' | 'submit'
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // AI Coding Assistant State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [copiedAi, setCopiedAi] = useState(false);

  // Fetch session details on mount
  useEffect(() => {
    const fetchSession = async () => {
      if (sessionId) {
        try {
          const res = await preparationService.getPreparationById(sessionId);
          if (res?.success) {
            setSession(res.data);
          }
        } catch (err) {
          console.warn('[CodingPrep] Could not load session:', err.message);
        }
      }
    };
    fetchSession();
  }, [sessionId]);

  // Fetch problems & user progress
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [probRes, progRes] = await Promise.all([
        codingService.getProblems({
          sessionId,
          search: searchQuery,
          difficulty: selectedDifficulty,
          topic: selectedTopic,
          status: selectedStatus,
        }),
        codingService.getProgress(sessionId),
      ]);

      if (probRes?.success) {
        setProblems(probRes.problems || []);
        if (probRes.rolePersonalization) {
          setRolePersonalization(probRes.rolePersonalization);
        }
      }

      if (progRes?.success) {
        setStats(progRes.stats || {});
        setTopicProgress(progRes.topicProgress || []);
        setDailyChallenge(progRes.dailyChallenge || null);
      }
    } catch (err) {
      console.error('[CodingPrep] Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [sessionId, selectedDifficulty, selectedTopic, selectedStatus]);

  // Handle route problem ID (e.g. if loaded via direct URL)
  useEffect(() => {
    if (routeProblemId) {
      openProblem(routeProblemId);
    }
  }, [routeProblemId]);

  // Open a problem into the two-panel coding workspace
  const openProblem = async (problemIdOrSlug) => {
    setProblemLoading(true);
    setActiveTab('workspace');
    setRunResult(null);
    setSubmitResult(null);
    setAiResponse(null);
    setCurrentHintIndex(0);
    setActiveConsoleTab('testcases');

    try {
      const res = await codingService.getProblemById(problemIdOrSlug);
      if (res?.success && res.problem) {
        const prob = res.problem;
        setCurrentProblem(prob);

        // Set starter code or user's previous code
        const initialLang = res.lastSubmission?.language || 'python';
        setLanguage(initialLang);

        const initialCode =
          res.lastSubmission?.code ||
          prob.starterTemplates?.[initialLang] ||
          '// Write your solution here';
        setCode(initialCode);

        // Fetch submissions for this problem
        loadProblemSubmissions(prob._id);
      }
    } catch (err) {
      console.error('[CodingPrep] Error loading problem:', err);
    } finally {
      setProblemLoading(false);
    }
  };

  const loadProblemSubmissions = async (probId) => {
    try {
      const res = await codingService.getSubmissions({ problemId: probId });
      if (res?.success) {
        setSubmissions(res.submissions || []);
      }
    } catch (err) {
      console.warn('[CodingPrep] Could not fetch submissions:', err.message);
    }
  };

  // Change active language in editor
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (currentProblem) {
      const template = currentProblem.starterTemplates?.[newLang] || '// Write your code here';
      setCode(template);
    }
  };

  // Reset to starter template
  const handleResetCode = () => {
    if (currentProblem) {
      const template = currentProblem.starterTemplates?.[language] || '';
      setCode(template);
    }
  };

  // Run Code against sample test cases
  const handleRunCode = async () => {
    if (!currentProblem || running || submitting) return;
    setRunning(true);
    setActiveConsoleTab('run');
    try {
      const res = await codingService.runCode({
        problemId: currentProblem._id,
        language,
        code,
      });
      setRunResult(res);
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        errorMessage: err.response?.data?.message || err.message,
        testResults: [],
      });
    } finally {
      setRunning(false);
    }
  };

  // Submit Code for full evaluation
  const handleSubmitCode = async () => {
    if (!currentProblem || running || submitting) return;
    setSubmitting(true);
    setActiveConsoleTab('submit');
    try {
      const res = await codingService.submitCode({
        problemId: currentProblem._id,
        sessionId,
        language,
        code,
      });
      setSubmitResult(res);

      // Refresh submissions list & global progress
      loadProblemSubmissions(currentProblem._id);
      codingService.getProgress(sessionId).then((progRes) => {
        if (progRes?.success) setStats(progRes.stats || {});
      });
    } catch (err) {
      setSubmitResult({
        status: 'Runtime Error',
        errorMessage: err.response?.data?.message || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Request AI Coding Assistant Help
  const handleAiAction = async (action) => {
    if (!currentProblem || aiLoading) return;
    setAiLoading(true);
    setActiveWorkspaceTab('ai');
    try {
      const res = await codingService.getAiHelp({
        action,
        problemId: currentProblem._id,
        code,
        language,
        error: submitResult?.errorMessage || runResult?.errorMessage || '',
        currentHintIndex,
      });
      if (res?.success) {
        setAiResponse(res.reply);
        if (res.hintIndex) setCurrentHintIndex(res.hintIndex);
      }
    } catch (err) {
      setAiResponse('AI service encountered an issue. Please try again in a moment.');
    } finally {
      setAiLoading(false);
    }
  };

  // Filtered problems list
  const filteredProblems = useMemo(() => {
    if (!searchQuery.trim()) return problems;
    const q = searchQuery.toLowerCase();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.difficulty.toLowerCase().includes(q) ||
        p.topics.some((t) => t.toLowerCase().includes(q))
    );
  }, [problems, searchQuery]);

  const displayRole = session?.targetRole || rolePersonalization.targetRole || 'Software Engineer';

  // Navigation handlers
  const handleContinueNext = () => {
    if (sessionId) {
      navigate(`/preparation/${sessionId}/aptitude-prep`);
    } else {
      navigate('/dashboard');
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'Easy':
        return 'bg-[#EEF4FF] text-[#315BEA] border border-[#C7D7FE]';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Hard':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 py-2 sm:py-4 px-2 sm:px-4 text-slate-800">
      {/* Top Breadcrumb & Preparation Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Link to="/dashboard" className="hover:text-royal-600 transition-colors">
            Preparations
          </Link>
          <span>&gt;</span>
          {sessionId && (
            <>
              <Link
                to={`/preparation/${sessionId}/job-readiness-twin`}
                className="hover:text-royal-600 transition-colors"
              >
                AI Job Readiness Twin
              </Link>
              <span>&gt;</span>
            </>
          )}
          <span className="font-semibold text-slate-800">
            {activeTab === 'workspace' && currentProblem
              ? `Coding Prep: ${currentProblem.title}`
              : 'Coding Preparation'}
          </span>
        </div>

        {session && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Preparation:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 shadow-2xs">
              <Target className="w-3.5 h-3.5 text-royal-600" />
              <span>
                {session.targetRole} - {session.company}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Header & Top-Right Continue Next */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-indigo-900/20 flex-shrink-0">
            <Code2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Coding Preparation
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                LeetCode Engine
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
          {activeTab === 'workspace' && (
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              onClick={() => setActiveTab('problems')}
              className="text-xs"
            >
              Problem Browser
            </Button>
          )}
        </div>
      </div>

      {/* VIEW 1: PROBLEM BROWSER & DASHBOARD */}
      {activeTab === 'problems' && (
        <div className="space-y-5">
          {/* Top Visual Statistics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card padding="p-3.5" className="border-slate-200/80 bg-white shadow-2xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Problems Solved</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.totalSolved || 0}</span>
                <span className="text-xs text-slate-400 font-medium">/ {stats.totalProblems || 8}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-royal-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((stats.totalSolved || 0) / (stats.totalProblems || 1)) * 100)}%`,
                  }}
                />
              </div>
            </Card>

            <Card padding="p-3.5" className="border-slate-200/80 bg-white shadow-2xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Problems Tried</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.totalAttempted || 0}</span>
                <span className="text-xs text-slate-400 font-medium">attempted</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Across active topics</p>
            </Card>

            <Card padding="p-3.5" className="border-slate-200/80 bg-white shadow-2xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Streak</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span className="text-2xl font-black text-slate-900">{stats.streak || 0}</span>
                <span className="text-xs text-slate-500 font-medium">days</span>
              </div>
              <p className="text-[10px] text-amber-700 mt-2 font-semibold">Keep the momentum!</p>
            </Card>

            <Card padding="p-3.5" className="border-slate-200/80 bg-white shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-[#315BEA] uppercase tracking-wider">Easy</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EEF4FF] text-[#315BEA]">
                  {stats.easySolved || 0} / {stats.totalEasy || 3}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-[#315BEA] h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((stats.easySolved || 0) / (stats.totalEasy || 1)) * 100)}%`,
                  }}
                />
              </div>
            </Card>

            <Card padding="p-3.5" className="border-slate-200/80 bg-white shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Medium</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                  {stats.mediumSolved || 0} / {stats.totalMedium || 5}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((stats.mediumSolved || 0) / (stats.totalMedium || 1)) * 100)}%`,
                  }}
                />
              </div>
            </Card>

            <Card padding="p-3.5" className="border-slate-200/80 bg-white shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Hard</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                  {stats.hardSolved || 0} / {stats.totalHard || 0}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((stats.hardSolved || 0) / (stats.totalHard || 1)) * 100)}%`,
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Role Personalization & Today's Challenge Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card padding="p-4" className="lg:col-span-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 fill-indigo-600" />
                </div>
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Recommended for {displayRole}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rolePersonalization.priorityTopics?.length > 0 ? (
                  rolePersonalization.priorityTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-200/80 shadow-2xs"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-200/80 shadow-2xs">
                      Hash Maps
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-200/80 shadow-2xs">
                      Two Pointers
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-200/80 shadow-2xs">
                      Arrays & Buffers
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-200/80 shadow-2xs">
                      Dynamic Programming
                    </span>
                  </>
                )}
              </div>
            </Card>

            {dailyChallenge && (
              <Card padding="p-4" className="border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                      Today's Challenge
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDifficultyColor(dailyChallenge.difficulty)}`}>
                      {dailyChallenge.difficulty}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 line-clamp-1">{dailyChallenge.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {dailyChallenge.topics?.join(' • ')}
                  </p>
                </div>
                <button
                  onClick={() => openProblem(dailyChallenge._id)}
                  className="mt-3 w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Start Challenge</span>
                </button>
              </Card>
            )}
          </div>

          {/* Topic-wise Progress Progress Bars */}
          {topicProgress.length > 0 && (
            <Card padding="p-4" className="border-slate-200/80">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Coding Progress by Topic
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {topicProgress.slice(0, 8).map((tp, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800 truncate">{tp.topic}</span>
                      <span className="text-[11px] font-extrabold text-slate-600">{tp.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-royal-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${tp.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search problems, topics, difficulty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-royal-500/20 focus:border-royal-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Difficulty */}
              <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      selectedDifficulty === diff
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              {/* Status */}
              <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                {['All', 'Solved', 'Unsolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      selectedStatus === st
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Problem List Table */}
          <Card padding="p-0" className="border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">Status</th>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Problem</th>
                    <th className="py-3 px-4 w-28">Difficulty</th>
                    <th className="py-3 px-4 hidden md:table-cell">Topics</th>
                    <th className="py-3 px-4 w-24 text-right">Acceptance</th>
                    <th className="py-3 px-4 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center">
                        <LoadingSpinner size="md" message="Loading coding challenges..." />
                      </td>
                    </tr>
                  ) : filteredProblems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        No coding problems match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProblems.map((p) => {
                      const isSolved = p.userStatus === 'Solved';
                      const isAttempted = p.userStatus === 'Attempted';

                      return (
                        <tr
                          key={p._id}
                          onClick={() => openProblem(p._id)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-4 text-center">
                            {isSolved ? (
                              <CheckCircle2 className="w-4 h-4 text-[#2563EB] inline" />
                            ) : isAttempted ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 inline-block" />
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {p.order}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-royal-600 transition-colors">
                            <div className="flex items-center gap-2">
                              <span>{p.title}</span>
                              {p.isRecommended && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Star className="w-2.5 h-2.5 fill-amber-500" />
                                  <span>Role Match</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getDifficultyColor(
                                p.difficulty
                              )}`}
                            >
                              {p.difficulty}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {p.topics?.slice(0, 3).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-500">
                            {p.acceptanceRate}%
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="text-xs font-bold text-royal-600 group-hover:underline">
                              Solve →
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: TWO-PANEL CODING WORKSPACE */}
      {activeTab === 'workspace' && currentProblem && (
        <div className="space-y-3">
          {/* Workspace Subheader Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900 text-white rounded-xl shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('problems')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Problems</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-400">#{currentProblem.order}</span>
                <span className="font-bold text-xs text-white truncate max-w-[200px] sm:max-w-xs">
                  {currentProblem.title}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDifficultyColor(
                    currentProblem.difficulty
                  )}`}
                >
                  {currentProblem.difficulty}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Acceptance: {currentProblem.acceptanceRate}%
              </span>
            </div>
          </div>

          {/* Two-Panel Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* Left Panel: Problem Statement / AI Mentor / Submissions */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-[700px] overflow-hidden">
              {/* Left Panel Tabs */}
              <div className="flex items-center border-b border-slate-200 px-3 pt-2 gap-1 bg-slate-50/70">
                <button
                  onClick={() => setActiveWorkspaceTab('description')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeWorkspaceTab === 'description'
                      ? 'border-royal-600 text-royal-600 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Description</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveWorkspaceTab('submissions')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeWorkspaceTab === 'submissions'
                      ? 'border-royal-600 text-royal-600 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submissions ({submissions.length})</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveWorkspaceTab('ai')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeWorkspaceTab === 'ai'
                      ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AI Mentor</span>
                  </div>
                </button>
              </div>

              {/* Left Tab 1: Description */}
              {activeWorkspaceTab === 'description' && (
                <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs text-slate-700 leading-relaxed">
                  <div>
                    <h2 className="text-base font-black text-slate-900 mb-1">
                      {currentProblem.order}. {currentProblem.title}
                    </h2>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentProblem.topics?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="whitespace-pre-line text-slate-800 text-xs">
                    {currentProblem.description}
                  </div>

                  {/* Examples */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Examples
                    </h3>
                    {currentProblem.examples?.map((ex, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                        <p className="font-bold text-slate-900 text-xs">Example {i + 1}:</p>
                        <div className="font-mono text-[11px] bg-slate-900 text-slate-100 p-2.5 rounded-lg space-y-1">
                          <p>
                            <span className="text-slate-400">Input:</span> {ex.input}
                          </p>
                          <p>
                            <span className="text-slate-400">Output:</span> {ex.output}
                          </p>
                          {ex.explanation && (
                            <p className="text-slate-300 border-t border-slate-800 pt-1 mt-1 text-[10px]">
                              <span className="text-slate-400">Explanation:</span> {ex.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Constraints */}
                  {currentProblem.constraints?.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Constraints
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-slate-600">
                        {currentProblem.constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Left Tab 2: Submissions */}
              {activeWorkspaceTab === 'submissions' && (
                <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
                  {submissions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      No submissions recorded yet for this problem.
                    </div>
                  ) : (
                    submissions.map((sub, idx) => {
                      const isAcc = sub.status === 'Accepted';
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            {isAcc ? (
                              <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            )}
                            <div>
                              <p className={`font-bold ${isAcc ? 'text-[#2563EB]' : 'text-rose-700'}`}>
                                {sub.status}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase">
                                {sub.language} • {new Date(sub.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-slate-600 font-mono">
                            <p>{sub.runtimeMs} ms</p>
                            <p className="text-[10px] text-slate-400">{sub.memoryKb} KB</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Left Tab 3: AI Coding Assistant */}
              {activeWorkspaceTab === 'ai' && (
                <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs flex flex-col">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-slate-900 text-xs">PrepAgent AI Coding Mentor</h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Get hints, conceptual guidance, code analysis, and complexity reviews without spoiling the solution.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleAiAction('hint')}
                      disabled={aiLoading}
                      className="py-1.5 px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 font-bold text-[11px] text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>💡</span>
                      <span>Give Hint</span>
                    </button>

                    <button
                      onClick={() => handleAiAction('concept')}
                      disabled={aiLoading}
                      className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>📚</span>
                      <span>Explain Concept</span>
                    </button>

                    <button
                      onClick={() => handleAiAction('analyze')}
                      disabled={aiLoading}
                      className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>🔍</span>
                      <span>Analyze Approach</span>
                    </button>

                    <button
                      onClick={() => handleAiAction('explain_error')}
                      disabled={aiLoading}
                      className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>⚠️</span>
                      <span>Explain Error</span>
                    </button>

                    <button
                      onClick={() => handleAiAction('complexity')}
                      disabled={aiLoading}
                      className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 col-span-2"
                    >
                      <span>⏱️</span>
                      <span>Show Complexity Breakdown</span>
                    </button>
                  </div>

                  {/* AI Output Response Box */}
                  <div className="flex-1 min-h-[220px] p-3 rounded-xl bg-slate-900 text-slate-100 font-sans text-xs overflow-y-auto leading-relaxed border border-slate-800 relative">
                    {aiLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <LoadingSpinner size="sm" message="Analyzing your code..." />
                      </div>
                    ) : aiResponse ? (
                      <div>
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            Mentor Guidance
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(aiResponse);
                              setCopiedAi(true);
                              setTimeout(() => setCopiedAi(false), 2000);
                            }}
                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedAi ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="whitespace-pre-line text-slate-200">{aiResponse}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-4">
                        <HelpCircle className="w-6 h-6 mb-2 stroke-[1.5]" />
                        <p>Click one of the AI guidance buttons above to inspect hints, concepts, or errors.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Code Editor & Test Console */}
            <div className="lg:col-span-7 space-y-3">
              {/* Code Editor Container */}
              <div className="rounded-xl border border-slate-800 bg-[#1e1e1e] overflow-hidden shadow-sm flex flex-col">
                {/* Editor Header Toolbar */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-slate-800 text-xs">
                  {/* Language Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Language:</span>
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-[#333333] text-white text-xs font-semibold py-1 px-2.5 rounded border border-slate-700 focus:outline-none focus:border-royal-500 cursor-pointer"
                    >
                      <option value="python">Python 3</option>
                      <option value="javascript">JavaScript (Node.js)</option>
                      <option value="java">Java (OpenJDK)</option>
                      <option value="cpp">C++ (GCC)</option>
                    </select>
                  </div>

                  {/* Reset Code */}
                  <button
                    onClick={handleResetCode}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Monaco Code Editor */}
                <div className="h-[380px] w-full">
                  <Editor
                    height="100%"
                    language={
                      language === 'python'
                        ? 'python'
                        : language === 'javascript'
                        ? 'javascript'
                        : language === 'java'
                        ? 'java'
                        : 'cpp'
                    }
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      roundedSelection: true,
                      scrollBeyondLastLine: false,
                      readOnly: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                    }}
                  />
                </div>

                {/* Editor Actions Bottom Bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Console & Test Cases</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunCode}
                      disabled={running || submitting}
                      className="py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{running ? 'Running...' : 'Run Code'}</span>
                    </button>

                    <button
                      onClick={handleSubmitCode}
                      disabled={running || submitting}
                      className="py-1.5 px-3.5 rounded-lg bg-[#315BEA] hover:bg-[#2648C7] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Evaluating...' : 'Submit'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Console & Test Results Bottom Card */}
              <Card padding="p-0" className="border-slate-200/80 overflow-hidden shadow-2xs">
                {/* Console Tabs */}
                <div className="flex items-center border-b border-slate-200 px-3 pt-2 gap-1 bg-slate-50">
                  <button
                    onClick={() => setActiveConsoleTab('testcases')}
                    className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeConsoleTab === 'testcases'
                        ? 'border-royal-600 text-royal-600 bg-white rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Test Cases
                  </button>

                  <button
                    onClick={() => setActiveConsoleTab('run')}
                    className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeConsoleTab === 'run'
                        ? 'border-royal-600 text-royal-600 bg-white rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Test Result {runResult && (runResult.status === 'Accepted' ? '✓' : '✗')}
                  </button>

                  <button
                    onClick={() => setActiveConsoleTab('submit')}
                    className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeConsoleTab === 'submit'
                        ? 'border-[#315BEA] text-[#315BEA] bg-white rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Submission Result {submitResult && (submitResult.status === 'Accepted' ? '✓' : '✗')}
                  </button>
                </div>

                {/* Console Content */}
                <div className="p-3.5 min-h-[160px] text-xs">
                  {/* TAB 1: Sample Test Cases */}
                  {activeConsoleTab === 'testcases' && (
                    <div className="space-y-3">
                      {/* Case Selectors */}
                      <div className="flex items-center gap-1.5">
                        {currentProblem.sampleTestCases?.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedTestCaseIndex(idx)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              selectedTestCaseIndex === idx
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>

                      {/* Case Details */}
                      {currentProblem.sampleTestCases?.[selectedTestCaseIndex] && (
                        <div className="space-y-2 font-mono text-[11px]">
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Input:</p>
                            <div className="p-2 rounded bg-slate-900 text-slate-100">
                              {currentProblem.sampleTestCases[selectedTestCaseIndex].input}
                            </div>
                          </div>

                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">
                              Expected Output:
                            </p>
                            <div className="p-2 rounded bg-slate-900 text-slate-100">
                              {currentProblem.sampleTestCases[selectedTestCaseIndex].expectedOutput}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Run Code Results */}
                  {activeConsoleTab === 'run' && (
                    <div>
                      {running ? (
                        <div className="py-6 text-center">
                          <LoadingSpinner size="sm" message="Executing code on isolated engine..." />
                        </div>
                      ) : !runResult ? (
                        <p className="text-slate-400 py-6 text-center">
                          Click "Run Code" to test your solution against the sample test cases.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {/* Status Badge & Metrics */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {runResult.status === 'Accepted' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#EFF6FF] text-[#2563EB] border border-[#C7D7FE]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Sample Tests Passed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>{runResult.status}</span>
                                </span>
                              )}
                              <span className="text-xs text-slate-500 font-bold">
                                {runResult.passedTestCases} / {runResult.totalTestCases} Cases
                              </span>
                            </div>

                            {runResult.runtimeMs > 0 && (
                              <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                                <span>⏱ {runResult.runtimeMs} ms</span>
                                <span>💾 {runResult.memoryKb} KB</span>
                              </div>
                            )}
                          </div>

                          {/* Individual Test Cases Output */}
                          {runResult.testResults?.length > 0 && (
                            <div className="space-y-2">
                              {runResult.testResults.map((tr, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2.5 rounded-lg border font-mono text-[11px] ${
                                    tr.passed
                                      ? 'bg-[#EFF6FF] border-[#C7D7FE] text-[#172B4D]'
                                      : 'bg-rose-50/50 border-rose-200 text-rose-950'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold">Case {tr.testCaseIndex}</span>
                                    <span className="font-bold">{tr.passed ? '✓ Passed' : '✗ Failed'}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600">Input: {tr.input}</p>
                                  <p className="text-[10px] text-slate-600">Expected: {tr.expected}</p>
                                  <p className="text-[10px] font-bold">Actual: {tr.actual || tr.error}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Error Message if Compilation / Runtime Error */}
                          {runResult.errorMessage && (
                            <div className="p-3 bg-rose-900/90 text-rose-100 rounded-lg font-mono text-[11px] whitespace-pre-wrap">
                              {runResult.errorMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Full Submission Result */}
                  {activeConsoleTab === 'submit' && (
                    <div>
                      {submitting ? (
                        <div className="py-6 text-center">
                          <LoadingSpinner size="sm" message="Evaluating solution against full test suite..." />
                        </div>
                      ) : !submitResult ? (
                        <p className="text-slate-400 py-6 text-center">
                          Click "Submit" to evaluate your solution against all test cases.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div>
                              <h4
                                className={`text-base font-black ${
                                  submitResult.status === 'Accepted'
                                    ? 'text-[#2563EB]'
                                    : 'text-rose-600'
                                }`}
                              >
                                {submitResult.status === 'Accepted' ? '✓ Accepted' : `✗ ${submitResult.status}`}
                              </h4>
                              <p className="text-xs text-slate-500 font-bold mt-0.5">
                                Passed {submitResult.passedTestCases} of {submitResult.totalTestCases} test cases
                              </p>
                            </div>

                            {submitResult.runtimeMs > 0 && (
                              <div className="text-right font-mono text-[11px] text-slate-600">
                                <p className="font-bold">Runtime: {submitResult.runtimeMs} ms</p>
                                <p className="text-slate-400">Memory: {(submitResult.memoryKb / 1024).toFixed(1)} MB</p>
                              </div>
                            )}
                          </div>

                          {/* Failed Test Case Details if Wrong Answer */}
                          {submitResult.failedTestCase && (
                            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 font-mono text-[11px] space-y-1.5 text-rose-950">
                              <p className="font-bold text-rose-900">Failed on Test Case:</p>
                              <p>
                                <span className="text-rose-600">Input:</span> {submitResult.failedTestCase.input}
                              </p>
                              <p>
                                <span className="text-rose-600">Expected:</span>{' '}
                                {submitResult.failedTestCase.expectedOutput}
                              </p>
                              <p>
                                <span className="text-rose-600">Output:</span>{' '}
                                {submitResult.failedTestCase.actualOutput}
                              </p>
                            </div>
                          )}

                          {submitResult.errorMessage && submitResult.status !== 'Wrong Answer' && (
                            <div className="p-3 bg-slate-900 text-rose-300 rounded-lg font-mono text-[11px] whitespace-pre-wrap">
                              {submitResult.errorMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodingPreparation;
