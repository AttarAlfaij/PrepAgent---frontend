import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  RefreshCw,
  BookOpen,
  Award,
  Zap,
  BarChart2,
  Bookmark,
  Send,
  HelpCircle,
  Copy,
  Layers,
  Check,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import aptitudeService from '../services/aptitudeService';
import { preparationService } from '../services/preparationService';

const AptitudePreparation = () => {
  const { sessionId, testId: routeTestId } = useParams();
  const navigate = useNavigate();

  // Session & Target Role context
  const [session, setSession] = useState(null);

  // Top-level View Mode: 'dashboard' | 'testing' | 'result'
  const [viewMode, setViewMode] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  // Dashboard Data
  const [categoriesData, setCategoriesData] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [preparationRequirements, setPreparationRequirements] = useState([]);
  const [stats, setStats] = useState({
    overallScore: 0,
    overallAccuracy: 0,
    totalAttempted: 0,
    totalCorrect: 0,
    averageTimePerQuestion: 45,
    currentStreak: 0,
    totalTestsCompleted: 0,
  });
  const [topicMastery, setTopicMastery] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [strongTopics, setStrongTopics] = useState([]);
  const [recommendedNextTopics, setRecommendedNextTopics] = useState([]);
  const [roleContext, setRoleContext] = useState({
    targetRole: 'Software Engineer',
    priorities: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
  });
  const [testHistory, setTestHistory] = useState([]);

  // Practice Mode State
  const [selectedCategory, setSelectedCategory] = useState('Quantitative Aptitude');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Adaptive');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [startingTest, setStartingTest] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Active Test State (Strictly 20 questions for standard assessment)
  const [currentTest, setCurrentTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [index]: 'A' | 'B' | 'C' | 'D' }
  const [markedForReview, setMarkedForReview] = useState({}); // { [index]: boolean }
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  // Test Result State
  const [completedResult, setCompletedResult] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'incorrect' | 'correct'

  // AI Aptitude Coach State
  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [aiCoachReply, setAiCoachReply] = useState(null);
  const [activeAiQuestionIndex, setActiveAiQuestionIndex] = useState(null);
  const [copiedCoach, setCopiedCoach] = useState(false);

  // Real-time Timer Interval Reference
  const timerRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());

  // Load session context on mount
  useEffect(() => {
    const fetchSession = async () => {
      if (sessionId) {
        try {
          const res = await preparationService.getPreparationById(sessionId);
          if (res?.success) {
            setSession(res.data);
          }
        } catch (err) {
          console.warn('[AptitudePrep] Could not fetch preparation session:', err.message);
        }
      }
    };
    fetchSession();
  }, [sessionId]);

  // Load dashboard data: categories, progress, history
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [catRes, progRes, histRes] = await Promise.all([
        aptitudeService.getCategories(),
        aptitudeService.getProgress(sessionId),
        aptitudeService.getHistory(20),
      ]);

      if (catRes?.success) {
        setCategoriesData(catRes.categories || []);
      }

      if (progRes?.success) {
        if (progRes.stats) setStats(progRes.stats);
        if (progRes.categoryStats) setCategoryStats(progRes.categoryStats);
        if (progRes.preparationRequirements) setPreparationRequirements(progRes.preparationRequirements);
        if (progRes.topicMastery) setTopicMastery(progRes.topicMastery);
        if (progRes.weakTopics) setWeakTopics(progRes.weakTopics);
        if (progRes.strongTopics) setStrongTopics(progRes.strongTopics);
        if (progRes.recommendedNextTopics) setRecommendedNextTopics(progRes.recommendedNextTopics);
        if (progRes.roleContext) setRoleContext(progRes.roleContext);
      }

      if (histRes?.success) {
        setTestHistory(histRes.history || []);
      }
    } catch (err) {
      console.error('[AptitudePrep] Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [sessionId]);

  // Load specific test if passed via route
  useEffect(() => {
    if (routeTestId) {
      loadExistingTestResult(routeTestId);
    }
  }, [routeTestId]);

  const loadExistingTestResult = async (testId) => {
    try {
      setLoading(true);
      const res = await aptitudeService.getTestResult(testId);
      if (res?.success && res.test) {
        setCompletedResult(res.test);
        setViewMode('result');
      }
    } catch (err) {
      console.error('[AptitudePrep] Could not load test result:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronized countdown timer handler
  useEffect(() => {
    if (viewMode === 'testing' && currentTest) {
      timerRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [viewMode, currentTest]);

  // Auto-submit test when countdown expires
  const handleAutoSubmitOnTimeout = async () => {
    if (submittingTest || !currentTest) return;
    await executeSubmitTest();
  };

  // Topics for currently selected category
  const availableTopics = [
    'All Topics',
    ...(categoriesData.find((c) => c.category === selectedCategory)?.topics || []),
  ];

  // Helper for category icons
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Quantitative Aptitude':
        return '🔢';
      case 'Logical Reasoning':
        return '🧩';
      case 'Verbal Ability':
        return '📖';
      case 'Data Interpretation':
        return '📊';
      case 'Analytical Reasoning':
        return '🧠';
      default:
        return '🎯';
    }
  };

  // Start Practice or Standard 20-Question Assessment Test
  const handleStartTest = async (testType = 'practice', customConfig = {}) => {
    setStartingTest(true);
    setValidationError(null);
    try {
      const isFull = testType === 'full_test';
      const config = {
        sessionId,
        testType,
        category: isFull ? 'Mixed' : (customConfig.category || selectedCategory),
        topic: isFull ? 'All Topics' : (customConfig.topic || selectedTopic),
        difficulty: isFull ? 'Adaptive' : (customConfig.difficulty || selectedDifficulty),
        questionCount: isFull ? 20 : (customConfig.questionCount || questionCount),
        durationMinutes: isFull ? 25 : (customConfig.durationMinutes || durationMinutes),
      };

      const res = await aptitudeService.startTest(config);
      if (res?.success && res.test) {
        const test = res.test;

        // Strict Validation: Standard assessment MUST contain EXACTLY 20 questions
        if (isFull) {
          if (!Array.isArray(test.questions) || test.questions.length !== 20) {
            setValidationError(`Assessment generation error: Expected exactly 20 questions, but received ${test.questions?.length || 0}. Please retry.`);
            setStartingTest(false);
            return;
          }

          // Validate unique question items, 4 options, valid categories, topics, and difficulties
          const idSet = new Set();
          for (let i = 0; i < test.questions.length; i++) {
            const q = test.questions[i];
            const qId = q.questionId || q._id || `q_${i}`;
            if (idSet.has(qId)) {
              setValidationError(`Assessment validation failed: Duplicate question detected at #${i + 1}.`);
              setStartingTest(false);
              return;
            }
            idSet.add(qId);

            if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.trim() === '') {
              setValidationError(`Assessment validation failed: Missing question text at #${i + 1}.`);
              setStartingTest(false);
              return;
            }
            if (!Array.isArray(q.options) || q.options.length !== 4) {
              setValidationError(`Assessment validation failed: Question #${i + 1} must have exactly 4 options.`);
              setStartingTest(false);
              return;
            }
            if (!q.category || !q.topic || !q.difficulty) {
              setValidationError(`Assessment validation failed: Missing metadata on question #${i + 1}.`);
              setStartingTest(false);
              return;
            }
          }
        }

        setCurrentTest(test);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setMarkedForReview({});

        // Calculate synchronized remaining seconds based on duration
        const totalSecs = (test.durationMinutes || (isFull ? 25 : 15)) * 60;
        setTimeRemainingSeconds(totalSecs);
        questionStartTimeRef.current = Date.now();

        setViewMode('testing');
      }
    } catch (err) {
      console.error('[AptitudePrep] Failed to start test:', err);
      setValidationError(err.response?.data?.message || err.message || 'Failed to start assessment. Please try again.');
    } finally {
      setStartingTest(false);
    }
  };

  // Record answer selection
  const handleSelectOption = async (optionKey) => {
    if (!currentTest) return;

    const newAnswers = { ...selectedAnswers, [currentQuestionIndex]: optionKey };
    setSelectedAnswers(newAnswers);

    // Compute time taken on current question
    const elapsedSecs = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));

    // Save answer in background to backend
    try {
      await aptitudeService.recordAnswer(currentTest.testId, {
        questionIndex: currentQuestionIndex,
        userAnswer: optionKey,
        timeTakenSeconds: elapsedSecs,
        markedForReview: Boolean(markedForReview[currentQuestionIndex]),
      });
    } catch (err) {
      console.warn('[AptitudePrep] Could not record answer to server:', err.message);
    }
  };

  // Clear current answer
  const handleClearAnswer = async () => {
    const newAnswers = { ...selectedAnswers };
    delete newAnswers[currentQuestionIndex];
    setSelectedAnswers(newAnswers);

    try {
      await aptitudeService.recordAnswer(currentTest.testId, {
        questionIndex: currentQuestionIndex,
        userAnswer: null,
      });
    } catch (err) {
      console.warn('[AptitudePrep] Clear answer sync error:', err.message);
    }
  };

  // Toggle Marked for Review
  const handleToggleMarkReview = async () => {
    const newVal = !markedForReview[currentQuestionIndex];
    setMarkedForReview({ ...markedForReview, [currentQuestionIndex]: newVal });

    try {
      await aptitudeService.recordAnswer(currentTest.testId, {
        questionIndex: currentQuestionIndex,
        markedForReview: newVal,
      });
    } catch (err) {
      console.warn('[AptitudePrep] Review flag sync error:', err.message);
    }
  };

  // Navigate between questions
  const goToQuestion = (idx) => {
    if (idx >= 0 && idx < (currentTest?.questions?.length || 0)) {
      questionStartTimeRef.current = Date.now();
      setCurrentQuestionIndex(idx);
    }
  };

  // Submit Test execution
  const executeSubmitTest = async () => {
    if (!currentTest || submittingTest) return;
    setSubmittingTest(true);
    setSubmitConfirmOpen(false);
    clearInterval(timerRef.current);

    try {
      const res = await aptitudeService.submitTest(currentTest.testId);
      if (res?.success && res.testResult) {
        setCompletedResult(res.testResult);
        setViewMode('result');
        // Refresh dashboard progress in background
        aptitudeService.getProgress(sessionId).then((progRes) => {
          if (progRes?.success) {
            if (progRes.stats) setStats(progRes.stats);
            if (progRes.categoryStats) setCategoryStats(progRes.categoryStats);
            if (progRes.topicMastery) setTopicMastery(progRes.topicMastery);
            if (progRes.weakTopics) setWeakTopics(progRes.weakTopics);
          }
        });
      }
    } catch (err) {
      console.error('[AptitudePrep] Submit test error:', err);
    } finally {
      setSubmittingTest(false);
    }
  };

  // AI Aptitude Coach trigger
  const handleAiCoachAction = async (action, qObj) => {
    setAiCoachLoading(true);
    setAiCoachReply(null);
    try {
      const res = await aptitudeService.getAiHelp({
        action,
        question: qObj.questionText,
        userAnswer: qObj.userAnswer,
        correctAnswer: qObj.correctAnswer,
        explanation: qObj.explanation,
        concept: qObj.concept,
        topic: qObj.topic,
        category: qObj.category,
      });
      if (res?.success) {
        setAiCoachReply(res.reply);
      }
    } catch (err) {
      setAiCoachReply('AI Coach encountered an error. Please try again.');
    } finally {
      setAiCoachLoading(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Continue Next navigation handler
  const handleContinueNext = () => {
    if (sessionId) {
      navigate(`/preparation/${sessionId}/mock-interview`);
    } else {
      navigate('/dashboard');
    }
  };

  const currentQ = currentTest?.questions?.[currentQuestionIndex];
  const totalTestQuestions = currentTest?.questions?.length || 20;
  const isLastQuestion = currentQuestionIndex === totalTestQuestions - 1;
  const answeredCount = Object.keys(selectedAnswers).length;

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
                to={`/preparation/${sessionId}/coding-prep`}
                className="hover:text-royal-600 transition-colors"
              >
                Coding Preparation
              </Link>
              <span>&gt;</span>
            </>
          )}
          <span className="font-semibold text-slate-800">Aptitude Preparation</span>
        </div>

        {session && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Preparation:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 shadow-2xs">
              <Target className="w-3.5 h-3.5 text-royal-600" />
              <span>
                {session.targetRole} • {session.company}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Header & Top-Right Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 flex-shrink-0">
            <Brain className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                APTITUDE PREPARATION
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                20 Questions Standard
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setReloading(true);
              await loadDashboardData();
              setReloading(false);
            }}
            disabled={reloading || viewMode === 'testing'}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
            <span>{reloading ? 'Analyzing...' : 'Re-Analyze'}</span>
          </Button>

          {viewMode !== 'dashboard' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('dashboard')}
              className="text-xs"
            >
              Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Validation Error Alert if any */}
      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{validationError}</span>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold text-xs cursor-pointer ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 1: APTITUDE DASHBOARD                                */}
      {/* ========================================================= */}
      {viewMode === 'dashboard' && (
        <div className="space-y-4">
          {/* 1. Top Dashboard Grid (Compact stat blocks) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Accuracy */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-base">🎯</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Accuracy</span>
              </div>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {stats.totalAttempted > 0 ? `${stats.overallAccuracy}%` : '0%'}
              </p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-[#3B82F6] h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.overallAccuracy}%` }}
                />
              </div>
            </div>

            {/* Solved */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-base">📝</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Solved</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-black text-slate-900">{stats.totalCorrect}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {stats.totalAttempted}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                {stats.totalTestsCompleted} tests completed
              </p>
            </div>

            {/* Avg Time */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-base">⏱</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Time</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-900">{stats.averageTimePerQuestion || 45}</span>
                <span className="text-xs text-slate-400 font-semibold">s</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Target benchmark &lt; 60s</p>
            </div>

            {/* Streak */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-base">🔥</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Streak</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-900">{stats.currentStreak || 0}</span>
                <span className="text-xs text-slate-400 font-semibold">days</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-2 font-medium">Daily practice activity</p>
            </div>
          </div>

          {/* 2. Visual Personalization Cards (Target Role, Company, Skill Gap, Priority Topics) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center gap-2.5">
              <span className="text-lg flex-shrink-0">🎯</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Target Role</p>
                <p className="text-xs font-bold text-slate-900 truncate">{session?.targetRole || roleContext.targetRole}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2.5">
              <span className="text-lg flex-shrink-0">💼</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Company</p>
                <p className="text-xs font-bold text-slate-900 truncate">{session?.company || 'Target Company'}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-2.5">
              <span className="text-lg flex-shrink-0">📊</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Skill Gap</p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {weakTopics.length > 0 ? `${weakTopics.length} Focus Areas` : 'Standard Calibration'}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center gap-2.5">
              <span className="text-lg flex-shrink-0">🔥</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Priority Topics</p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {(roleContext.priorities || []).join(', ') || 'Quantitative, Logical'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Empty State or Assessment Launcher */}
          {stats.totalAttempted === 0 ? (
            <Card padding="p-5" className="border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xl">🎯</span>
                    <h3 className="text-base font-black text-white">Start Your Aptitude Assessment</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      20 Questions
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 font-medium">
                    Personalized to your preparation requirements across Quantitative, Logical & Verbal
                  </p>
                </div>
                <button
                  onClick={() => handleStartTest('full_test', { questionCount: 20, durationMinutes: 25 })}
                  disabled={startingTest}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-royal-600 to-indigo-600 hover:from-royal-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{startingTest ? 'Preparing 20 Questions...' : 'Start Assessment (20 Qs) →'}</span>
                </button>
              </div>
            </Card>
          ) : (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">Standard Aptitude Assessment</h3>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      EXACTLY 20 QUESTIONS
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-200 mt-0.5">
                    Quantitative (40%) • Logical (35%) • Verbal (25%) • 25 Mins
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleStartTest('full_test', { questionCount: 20, durationMinutes: 25 })}
                disabled={startingTest}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-royal-600 to-indigo-600 hover:from-royal-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{startingTest ? 'Generating...' : 'Take 20-Q Assessment →'}</span>
              </button>
            </div>
          )}

          {/* 4. Topic Preparation Cards (Visual Cards with actual user data) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                TOPIC PREPARATION
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Real Progress & Mastery</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(categoryStats.length > 0 ? categoryStats : categoriesData.map(c => ({
                category: c.category,
                topicsCount: c.topics.length,
                accuracy: 0,
                hasHistory: false,
              }))).map((cat) => {
                const icon = getCategoryIcon(cat.category);
                return (
                  <div
                    key={cat.category}
                    className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <h3 className="text-xs font-bold text-slate-900">{cat.category}</h3>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          {cat.topicsCount || 8} Topics
                        </span>
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-400 text-[11px]">Accuracy</span>
                          <span className="font-bold text-slate-900">
                            {cat.hasHistory ? `${cat.accuracy}%` : 'Not started'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              cat.hasHistory
                                ? cat.accuracy >= 75
                                  ? 'bg-[#3B82F6]'
                                  : cat.accuracy >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                                : 'bg-slate-200'
                            }`}
                            style={{ width: `${cat.hasHistory ? cat.accuracy : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedCategory(cat.category);
                        setSelectedTopic('All Topics');
                        handleStartTest('practice', { category: cat.category, topic: 'All Topics', questionCount: 10, durationMinutes: 15 });
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <span>Practice {icon}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Preparation Requirements & Weak Areas Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Preparation Requirements (Visual Priority Cards) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  PREPARATION REQUIREMENTS
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">Role Priorities</span>
              </div>

              <div className="space-y-2">
                {(preparationRequirements.length > 0
                  ? preparationRequirements
                  : [
                      { priority: 'HIGH PRIORITY', level: 'high', category: 'Quantitative Aptitude', targetWeight: '40%' },
                      { priority: 'MEDIUM', level: 'medium', category: 'Logical Reasoning', targetWeight: '35%' },
                      { priority: 'LOW', level: 'low', category: 'Verbal Ability', targetWeight: '25%' },
                    ]
                ).map((req, idx) => {
                  const isHigh = req.level === 'high' || req.priority.includes('HIGH');
                  const isMedium = req.level === 'medium' || req.priority.includes('MEDIUM');
                  const dotColor = isHigh ? '🔴' : isMedium ? '🟡' : '🔵';

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{dotColor}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isHigh
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : isMedium
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-[rgba(59,130,246,0.12)] text-[#2563EB] border border-[rgba(59,130,246,0.30)]'
                              }`}
                            >
                              {req.priority}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">{req.targetWeight}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1">{req.category}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCategory(req.category);
                          setSelectedTopic('All Topics');
                          handleStartTest('practice', { category: req.category, topic: 'All Topics', questionCount: 10, durationMinutes: 15 });
                        }}
                        className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                      >
                        Practice →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weak Areas (Compact Visual Cards) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  NEEDS PRACTICE
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">Real Performance</span>
              </div>

              {weakTopics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {weakTopics.slice(0, 4).map((top, idx) => {
                    const topStat = topicMastery.find((tm) => tm.topic === top);
                    const accuracy = topStat ? topStat.accuracy : 45;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">🔴</span>
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                              {top}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-rose-600">
                            {accuracy}%
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${accuracy}%` }}
                          />
                        </div>

                        <button
                          onClick={() => {
                            setSelectedTopic(top);
                            handleStartTest('practice', { topic: top, questionCount: 5, durationMinutes: 8 });
                          }}
                          className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs cursor-pointer transition-colors"
                        >
                          Practice
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-white border border-slate-200/80 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-[rgba(59,130,246,0.12)] text-[#3B82F6] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">No Critical Weak Areas</p>
                  <p className="text-[11px] text-slate-400">
                    Complete the 20-question Aptitude Assessment to pinpoint topics needing practice.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 6. Custom Interactive Practice Configurator (Compact) */}
          <Card padding="p-4 sm:p-5" className="border-slate-200/80 bg-white shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-royal-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Custom Practice Session
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Targeted topic drill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Category */}
              <div>
                <label className="font-bold text-slate-600 block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedTopic('All Topics');
                  }}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-royal-500 bg-white"
                >
                  {categoriesData.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic */}
              <div>
                <label className="font-bold text-slate-600 block mb-1">Topic</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-royal-500 bg-white"
                >
                  {availableTopics.map((top) => (
                    <option key={top} value={top}>
                      {top}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="font-bold text-slate-600 block mb-1">Difficulty</label>
                <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-center">
                  {['Easy', 'Medium', 'Hard', 'Adaptive'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`py-1.5 rounded transition-all cursor-pointer ${
                        selectedDifficulty === diff
                          ? 'bg-white text-royal-600 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions Count */}
              <div>
                <label className="font-bold text-slate-600 block mb-1">Questions</label>
                <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-center">
                  {[5, 10, 15, 20].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => {
                        setQuestionCount(cnt);
                        setDurationMinutes(Math.round(cnt * 1.5));
                      }}
                      className={`py-1.5 rounded transition-all cursor-pointer ${
                        questionCount === cnt
                          ? 'bg-white text-royal-600 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => handleStartTest('practice')}
                disabled={startingTest}
                className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{startingTest ? 'Preparing...' : 'Start Practice Session →'}</span>
              </button>
            </div>
          </Card>

          {/* 7. Aptitude History */}
          <Card padding="p-0" className="border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Test History
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">{testHistory.length} attempts</span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Category / Topic</th>
                    <th className="py-2.5 px-4 text-center">Score</th>
                    <th className="py-2.5 px-4 text-center">Accuracy</th>
                    <th className="py-2.5 px-4 text-right">Time</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                        No previous test attempts. Take the 20-question assessment to see history.
                      </td>
                    </tr>
                  ) : (
                    testHistory.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => loadExistingTestResult(item._id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 capitalize">
                          {item.testType.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                          {item.category} • {item.topic}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-900">
                          {item.score} / {item.totalQuestions}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.accuracy >= 75
                                ? 'bg-[rgba(59,130,246,0.12)] text-[#2563EB] border border-[rgba(59,130,246,0.30)]'
                                : item.accuracy >= 50
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {item.accuracy}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {formatTime(item.totalTimeTakenSeconds || 0)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-xs font-bold text-royal-600 group-hover:underline">
                            View Solutions →
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: ACTIVE APTITUDE QUESTION INTERFACE (EXACTLY 20 Q) */}
      {/* ========================================================= */}
      {viewMode === 'testing' && currentTest && currentQ && (
        <div className="space-y-3">
          {/* Top Assessment Control Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  APTITUDE ASSESSMENT
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-black text-white">
                    Question {currentQuestionIndex + 1} / {totalTestQuestions}
                  </span>
                  <span className="text-xs text-indigo-300 font-semibold">
                    ({Math.round(((currentQuestionIndex + 1) / totalTestQuestions) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Compact Timer with visual warning states */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-xs border ${
                    timeRemainingSeconds < 120
                      ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                      : timeRemainingSeconds < 300
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-slate-800 text-[#60A5FA] border-slate-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>⏱ {formatTime(timeRemainingSeconds)}</span>
                </div>

                <button
                  onClick={() => setSubmitConfirmOpen(true)}
                  className="py-1.5 px-3 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </button>
              </div>
            </div>

            {/* Progress Bar based on 20 questions */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round(((currentQuestionIndex + 1) / totalTestQuestions) * 100)}%` }}
              />
            </div>
          </div>

          {/* Badges for Question Context */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-1">
              <span>{getCategoryIcon(currentQ.category)}</span>
              <span>{currentQ.category}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
              {currentQ.topic}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                currentQ.difficulty === 'Easy'
                  ? 'bg-[rgba(59,130,246,0.12)] text-[#2563EB] border border-[rgba(59,130,246,0.30)]'
                  : currentQ.difficulty === 'Hard'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {currentQ.difficulty}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* Left: Main Question Presentation */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-5">
              {/* Question Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Question #{currentQuestionIndex + 1}
                  </span>
                  <button
                    onClick={handleToggleMarkReview}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      markedForReview[currentQuestionIndex]
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                    <span>{markedForReview[currentQuestionIndex] ? 'Flagged' : 'Flag Question'}</span>
                  </button>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                  {currentQ.questionText}
                </h3>
              </div>

              {/* Large Clickable Options Cards */}
              <div className="space-y-2.5">
                {currentQ.options?.map((opt) => {
                  const isSelected = selectedAnswers[currentQuestionIndex] === opt.key;
                  return (
                    <div
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-royal-600 bg-royal-50/50 shadow-2xs text-slate-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-royal-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.key}
                      </div>
                      <span className="text-xs sm:text-sm font-semibold flex-1">
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={currentQuestionIndex === 0}
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                >
                  Previous
                </Button>

                <button
                  onClick={handleClearAnswer}
                  disabled={!selectedAnswers[currentQuestionIndex]}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                >
                  Clear Selection
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={() => setSubmitConfirmOpen(true)}
                    className="py-1.5 px-3.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Finish & Submit</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ChevronRight}
                    iconPosition="right"
                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>

            {/* Right: Question Navigation Navigator (1..20 Grid) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Question Navigator
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {answeredCount} / {totalTestQuestions}
                  </span>
                </div>

                {/* 20 Questions Grid (1..10, 11..20) */}
                <div className="grid grid-cols-5 sm:grid-cols-5 gap-1.5">
                  {currentTest.questions.map((_, idx) => {
                    const isAnswered = selectedAnswers[idx] !== undefined;
                    const isMarked = markedForReview[idx] === true;
                    const isCurrent = currentQuestionIndex === idx;

                    return (
                      <button
                        key={idx}
                        onClick={() => goToQuestion(idx)}
                        className={`h-9 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center relative ${
                          isCurrent
                            ? 'ring-2 ring-indigo-600 scale-105 font-black z-10'
                            : ''
                        } ${
                          isMarked
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isAnswered
                            ? 'bg-[#3B82F6] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isAnswered && !isMarked && <span className="mr-0.5 text-[10px]">✓</span>}
                        {isMarked && <span className="mr-0.5 text-[9px]">🚩</span>}
                        <span>{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual States Legend */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-[#3B82F6] flex items-center justify-center text-[8px] text-white">✓</div>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-indigo-600 ring-2 ring-indigo-300" />
                  <span>Current Question</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                  <span>Flagged ({Object.values(markedForReview).filter(Boolean).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-100" />
                  <span>Not attempted ({totalTestQuestions - answeredCount})</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                onClick={() => setSubmitConfirmOpen(true)}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#60A5FA]" />
                <span>Review & Submit Test</span>
              </button>
            </div>
          </div>

          {/* Submit Confirmation Modal */}
          {submitConfirmOpen && (
            <Modal
              isOpen={submitConfirmOpen}
              onClose={() => setSubmitConfirmOpen(false)}
              title="Submit Aptitude Assessment"
              size="sm"
            >
              <div className="space-y-4 text-xs text-slate-700">
                <p className="font-medium">Are you sure you want to finalize your submission?</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-semibold">
                  <p>• Total Questions: {totalTestQuestions}</p>
                  <p>• Answered: {answeredCount}</p>
                  <p>• Unanswered: {totalTestQuestions - answeredCount}</p>
                  <p>• Flagged: {Object.values(markedForReview).filter(Boolean).length}</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setSubmitConfirmOpen(false)}>
                    Back to Test
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={executeSubmitTest}
                    disabled={submittingTest}
                  >
                    {submittingTest ? 'Evaluating...' : 'Confirm Submission'}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: APTITUDE TEST RESULT & DETAILED SOLUTIONS        */}
      {/* ========================================================= */}
      {viewMode === 'result' && completedResult && (
        <div className="space-y-4">
          {/* Result Score Banner */}
          <Card padding="p-6" className="border-[rgba(59,130,246,0.30)] bg-gradient-to-br from-white via-white to-blue-50/30 shadow-xs text-center">
            <div className="max-w-md mx-auto space-y-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[rgba(59,130,246,0.12)] text-[#2563EB] border border-[rgba(59,130,246,0.30)] uppercase tracking-wider">
                Assessment Complete
              </span>

              {/* Large Score & Accuracy Display */}
              <div className="text-4xl font-black text-slate-900 tracking-tight">
                {completedResult.score} / {completedResult.totalQuestions}
              </div>
              <p className="text-xl font-bold text-[#3B82F6]">
                {completedResult.accuracy}% Accuracy
              </p>

              {/* Compact Stat Blocks: Correct, Incorrect, Avg Time */}
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.30)]">
                  <p className="text-[11px] font-bold text-[#2563EB]">✓ Correct</p>
                  <p className="text-xl font-black text-[#1E3A8A] mt-0.5">{completedResult.score}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <p className="text-[11px] font-bold text-rose-700">✕ Incorrect</p>
                  <p className="text-xl font-black text-rose-900 mt-0.5">
                    {completedResult.totalQuestions - completedResult.score}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500">⏱ Avg Time</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    {Math.round((completedResult.totalTimeTakenSeconds || 0) / (completedResult.totalQuestions || 20))}s
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Topic Performance & Recommended Practice Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Topic Performance (Requirement 14) */}
            <Card padding="p-4 sm:p-5" className="border-slate-200/80 bg-white">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                TOPIC PERFORMANCE
              </h3>
              <div className="space-y-3">
                {Object.entries(
                  completedResult.categoryBreakdown && Object.keys(completedResult.categoryBreakdown).length > 0
                    ? completedResult.categoryBreakdown
                    : completedResult.topicBreakdown || {}
                )
                  .filter(([name, data]) => !name.startsWith('$') && data && typeof data === 'object' && data.accuracy !== undefined)
                  .map(([name, data]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{name}</span>
                        <span className="text-slate-900">{data.accuracy}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            data.accuracy >= 75 ? 'bg-[#3B82F6]' : data.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${data.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Recommended Practice (Requirement 15) */}
            <Card padding="p-4 sm:p-5" className="border-slate-200/80 bg-white flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  RECOMMENDED PRACTICE
                </h3>
                <div className="space-y-2">
                  {completedResult.recommendations?.length > 0 ? (
                    completedResult.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">
                            🔥 {rec.priority || 'HIGH PRIORITY'}
                          </span>
                          <p className="font-bold text-slate-900 mt-0.5">{rec.topic}</p>
                          <p className="text-[11px] text-slate-500">
                            {rec.accuracy !== undefined ? `${rec.accuracy}% accuracy` : 'Needs practice'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartTest('practice', { category: 'Mixed', topic: rec.topic, questionCount: 5, durationMinutes: 8 })}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                        >
                          Practice
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-[rgba(59,130,246,0.12)] text-[#1E3A8A] rounded-xl border border-[rgba(59,130,246,0.30)] text-xs font-semibold">
                      🎉 Great job! No critical weak areas detected on this attempt.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('dashboard')}
                >
                  Return to Dashboard
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartTest('full_test', { questionCount: 20, durationMinutes: 25 })}
                >
                  Retake Assessment (20 Qs) →
                </Button>
              </div>
            </Card>
          </div>

          {/* Detailed Question Review */}
          <Card padding="p-4 sm:p-5" className="border-slate-200/80 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Question-by-Question Review
              </h3>

              {/* Filter Pills */}
              <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-bold">
                {['all', 'incorrect', 'correct'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={`px-3 py-1 rounded-md capitalize transition-all cursor-pointer ${
                      reviewFilter === f
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {completedResult.questions
                ?.filter((q) => {
                  if (reviewFilter === 'correct') return q.isCorrect;
                  if (reviewFilter === 'incorrect') return !q.isCorrect;
                  return true;
                })
                .map((q, idx) => {
                  const isCorrect = q.isCorrect;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${
                        isCorrect ? 'border-[rgba(59,130,246,0.30)] bg-[rgba(59,130,246,0.06)]' : 'border-rose-200 bg-rose-50/20'
                      } space-y-3`}
                    >
                      {/* Question Header */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">#{idx + 1}</span>
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold text-[10px]">
                            {q.category} • {q.topic}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isCorrect
                              ? 'bg-[rgba(59,130,246,0.12)] text-[#2563EB] border border-[rgba(59,130,246,0.30)]'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correct</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Incorrect</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                        {q.questionText}
                      </p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options?.map((opt) => {
                          const isUserChoice = q.userAnswer === opt.key;
                          const isTargetAnswer = q.correctAnswer === opt.key;

                          return (
                            <div
                              key={opt.key}
                              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2.5 ${
                                isTargetAnswer
                                  ? 'bg-[rgba(59,130,246,0.12)] border-[#3B82F6] font-bold text-[#1E3A8A]'
                                  : isUserChoice
                                  ? 'bg-rose-100/70 border-rose-400 font-bold text-rose-950'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-bold">{opt.key})</span>
                              <span>{opt.text}</span>
                              {isTargetAnswer && <span className="ml-auto text-[10px] text-[#2563EB] font-bold">✓ Correct</span>}
                              {isUserChoice && !isTargetAnswer && (
                                <span className="ml-auto text-[10px] text-rose-800">✗ Your Choice</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation & Shortcut Box */}
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1 text-slate-700">
                        <p className="font-bold text-slate-900">
                          Explanation: <span className="font-normal">{q.explanation}</span>
                        </p>
                        {q.shortcut && (
                          <p className="font-bold text-indigo-700 text-[11px]">
                            ⚡ Shortcut: <span className="font-normal text-slate-700">{q.shortcut}</span>
                          </p>
                        )}
                      </div>

                      {/* AI Aptitude Coach Action Row */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>AI Coach:</span>
                        </span>

                        <button
                          onClick={() => {
                            setActiveAiQuestionIndex(idx);
                            handleAiCoachAction('hint', q);
                          }}
                          className="py-1 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[11px] font-bold border border-indigo-200 transition-colors cursor-pointer"
                        >
                          💡 Hint
                        </button>

                        <button
                          onClick={() => {
                            setActiveAiQuestionIndex(idx);
                            handleAiCoachAction('concept', q);
                          }}
                          className="py-1 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          📚 Concept
                        </button>

                        {!isCorrect && (
                          <button
                            onClick={() => {
                              setActiveAiQuestionIndex(idx);
                              handleAiCoachAction('mistake', q);
                            }}
                            className="py-1 px-2.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-900 text-[11px] font-bold border border-rose-200 transition-colors cursor-pointer"
                          >
                            ⚠️ Why was I wrong?
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setActiveAiQuestionIndex(idx);
                            handleAiCoachAction('similar_question', q);
                          }}
                          className="py-1 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          🎯 Similar Question
                        </button>
                      </div>

                      {/* AI Response Drawer */}
                      {activeAiQuestionIndex === idx && (
                        <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs leading-relaxed border border-slate-800 relative mt-2">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-2">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                              AI Coach Guidance
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(aiCoachReply || '');
                                setCopiedCoach(true);
                                setTimeout(() => setCopiedCoach(false), 2000);
                              }}
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedCoach ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          {aiCoachLoading ? (
                            <LoadingSpinner size="sm" message="AI Coach is thinking..." />
                          ) : (
                            <div className="whitespace-pre-line text-slate-200">{aiCoachReply}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AptitudePreparation;
