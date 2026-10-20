const mongoose = require('mongoose');
const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const CodingProgress = require('../models/CodingProgress');
const PreparationSession = require('../models/PreparationSession');
const codingExecutionService = require('../services/codingExecutionService');
const codingAssistantAgent = require('../services/codingAssistantAgent');
const { seedCodingProblems } = require('../utils/seedCodingProblems');

/**
 * Helper to ensure seed data is present in database
 */
async function ensureProblemsSeeded() {
  const count = await CodingProblem.countDocuments();
  if (count === 0) {
    await seedCodingProblems();
  }
}

/**
 * Helper to get or create CodingProgress for a user
 */
async function getOrCreateProgress(userId) {
  let progress = await CodingProgress.findOne({ userId });
  if (!progress) {
    progress = await CodingProgress.create({
      userId,
      solvedProblemIds: [],
      attemptedProblemIds: [],
      streak: 0,
      lastActiveDate: new Date(),
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      topicStats: {},
    });
  }
  return progress;
}

/**
 * @desc    Get all coding problems with filters, search, and target-role recommendation
 * @route   GET /api/coding/problems
 * @access  Private
 */
exports.getProblems = async (req, res) => {
  try {
    await ensureProblemsSeeded();

    const { search, difficulty, topic, status, sessionId } = req.query;
    const userId = req.user?._id;

    const progress = userId ? await getOrCreateProgress(userId) : null;
    const solvedSet = new Set(progress?.solvedProblemIds?.map((id) => id.toString()) || []);
    const attemptedSet = new Set(progress?.attemptedProblemIds?.map((id) => id.toString()) || []);

    // Filter query
    const query = {};

    if (difficulty && difficulty !== 'All') {
      query.difficulty = difficulty;
    }

    if (topic && topic !== 'All') {
      query.topics = topic;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { topics: regex }, { difficulty: regex }];
    }

    // Role personalization from preparation session if available
    let targetRole = '';
    let priorityTopics = [];
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      const session = await PreparationSession.findById(sessionId);
      if (session) {
        targetRole = session.targetRole || '';
        // Extract top skills from skill gap or plan if available
        if (session.skillGapAnalysis?.topGaps?.length > 0) {
          priorityTopics = session.skillGapAnalysis.topGaps.map((g) => g.skill);
        } else {
          priorityTopics = ['Arrays', 'Hashing', 'Strings', 'Two Pointers'];
        }
      }
    }

    const allProblems = await CodingProblem.find(query).sort({ order: 1 });

    const problems = allProblems
      .map((p) => {
        const idStr = p._id.toString();
        const isSolved = solvedSet.has(idStr);
        const isAttempted = !isSolved && attemptedSet.has(idStr);

        let userStatus = 'Unsolved';
        if (isSolved) userStatus = 'Solved';
        else if (isAttempted) userStatus = 'Attempted';

        // Check if recommended for user target role
        const isRoleMatch = targetRole
          ? p.targetRoles.some((r) => r.toLowerCase().includes(targetRole.toLowerCase()) || targetRole.toLowerCase().includes(r.toLowerCase()))
          : p.isRecommended;

        return {
          _id: p._id,
          order: p.order,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          topics: p.topics,
          targetRoles: p.targetRoles,
          acceptanceRate: p.acceptanceRate,
          userStatus,
          isRecommended: isRoleMatch || p.isRecommended,
        };
      })
      .filter((p) => {
        if (!status || status === 'All') return true;
        if (status === 'Solved') return p.userStatus === 'Solved';
        if (status === 'Unsolved') return p.userStatus !== 'Solved';
        return true;
      });

    res.json({
      success: true,
      count: problems.length,
      problems,
      rolePersonalization: {
        targetRole: targetRole || 'Software Engineer',
        priorityTopics,
        recommendedCount: problems.filter((p) => p.isRecommended).length,
      },
    });
  } catch (err) {
    console.error('[CodingController] getProblems error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get single problem by ID or slug
 * @route   GET /api/coding/problems/:id
 * @access  Private
 */
exports.getProblemById = async (req, res) => {
  try {
    await ensureProblemsSeeded();

    const { id } = req.params;
    let problem = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      problem = await CodingProblem.findById(id).select('-hiddenTestCases');
    }

    if (!problem) {
      problem = await CodingProblem.findOne({ slug: id }).select('-hiddenTestCases');
    }

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    // Get user's latest submission for this problem
    let lastSubmission = null;
    if (req.user?._id) {
      lastSubmission = await CodingSubmission.findOne({
        userId: req.user._id,
        problemId: problem._id,
      }).sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      problem,
      lastSubmission: lastSubmission
        ? {
            code: lastSubmission.code,
            language: lastSubmission.language,
            status: lastSubmission.status,
            runtimeMs: lastSubmission.runtimeMs,
            memoryKb: lastSubmission.memoryKb,
            createdAt: lastSubmission.createdAt,
          }
        : null,
    });
  } catch (err) {
    console.error('[CodingController] getProblemById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Run code against sample test cases
 * @route   POST /api/coding/run
 * @access  Private
 */
exports.runCode = async (req, res) => {
  try {
    const { problemId, language, code, customTestCases } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        success: false,
        message: 'Problem ID, language, and code are required',
      });
    }

    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const testCasesToRun =
      Array.isArray(customTestCases) && customTestCases.length > 0
        ? customTestCases
        : problem.sampleTestCases;

    const execResult = await codingExecutionService.execute({
      language,
      code,
      functionName: problem.functionName,
      testCases: testCasesToRun,
    });

    res.json({
      success: true,
      ...execResult,
    });
  } catch (err) {
    console.error('[CodingController] runCode error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Submit solution and evaluate against full test suite
 * @route   POST /api/coding/submit
 * @access  Private
 */
exports.submitCode = async (req, res) => {
  try {
    const { problemId, sessionId, language, code } = req.body;
    const userId = req.user._id;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        success: false,
        message: 'Problem ID, language, and code are required',
      });
    }

    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    // Combine sample and hidden test cases for full evaluation
    const allTestCases = [...problem.sampleTestCases, ...(problem.hiddenTestCases || [])];

    const execResult = await codingExecutionService.execute({
      language,
      code,
      functionName: problem.functionName,
      testCases: allTestCases,
    });

    // Save submission record
    const submission = await CodingSubmission.create({
      userId,
      problemId: problem._id,
      sessionId: sessionId && mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : null,
      language,
      code,
      status: execResult.status,
      passedTestCases: execResult.passedTestCases,
      totalTestCases: execResult.totalTestCases,
      runtimeMs: execResult.runtimeMs,
      memoryKb: execResult.memoryKb,
      errorMessage: execResult.errorMessage,
      failedTestCase: execResult.failedTestCase || null,
    });

    // Update user CodingProgress
    const progress = await getOrCreateProgress(userId);

    const isAlreadySolved = progress.solvedProblemIds.some((id) => id.toString() === problem._id.toString());
    const isAlreadyAttempted = progress.attemptedProblemIds.some((id) => id.toString() === problem._id.toString());

    if (execResult.status === 'Accepted') {
      if (!isAlreadySolved) {
        progress.solvedProblemIds.push(problem._id);

        if (problem.difficulty === 'Easy') progress.easySolved += 1;
        else if (problem.difficulty === 'Medium') progress.mediumSolved += 1;
        else if (problem.difficulty === 'Hard') progress.hardSolved += 1;

        // Calculate streak
        const now = new Date();
        const lastActive = progress.lastActiveDate ? new Date(progress.lastActiveDate) : null;
        const oneDay = 24 * 60 * 60 * 1000;

        if (!progress.streak || progress.streak === 0) {
          progress.streak = 1;
          progress.lastActiveDate = now;
        } else if (lastActive && now.toDateString() !== lastActive.toDateString()) {
          const diffDays = Math.round((now - lastActive) / oneDay);
          if (diffDays <= 1) {
            progress.streak += 1;
          } else {
            progress.streak = 1;
          }
          progress.lastActiveDate = now;
        }

        // Update topic stats
        problem.topics.forEach((t) => {
          const current = progress.topicStats.get(t) || { solved: 0, total: 0 };
          current.solved += 1;
          progress.topicStats.set(t, current);
        });
      }
    } else {
      if (!isAlreadyAttempted && !isAlreadySolved) {
        progress.attemptedProblemIds.push(problem._id);
      }
    }

    await progress.save();

    res.json({
      success: true,
      submissionId: submission._id,
      ...execResult,
    });
  } catch (err) {
    console.error('[CodingController] submitCode error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get user coding progress statistics
 * @route   GET /api/coding/progress
 * @access  Private
 */
exports.getProgress = async (req, res) => {
  try {
    await ensureProblemsSeeded();

    const userId = req.user._id;
    const progress = await getOrCreateProgress(userId);

    const totalProblems = await CodingProblem.countDocuments();
    const totalEasy = await CodingProblem.countDocuments({ difficulty: 'Easy' });
    const totalMedium = await CodingProblem.countDocuments({ difficulty: 'Medium' });
    const totalHard = await CodingProblem.countDocuments({ difficulty: 'Hard' });

    // Topic-wise progress calculation
    const allTopics = [
      'Arrays',
      'Strings',
      'Hashing',
      'Two Pointers',
      'Sliding Window',
      'Stack',
      'Dynamic Programming',
      'Binary Search',
    ];

    const topicProgress = [];
    for (const t of allTopics) {
      const totalInTopic = await CodingProblem.countDocuments({ topics: t });
      const solvedInTopic = await CodingProblem.countDocuments({
        _id: { $in: progress.solvedProblemIds },
        topics: t,
      });

      if (totalInTopic > 0) {
        topicProgress.push({
          topic: t,
          solved: solvedInTopic,
          total: totalInTopic,
          percentage: Math.round((solvedInTopic / totalInTopic) * 100),
        });
      }
    }

    // Daily challenge: select an unsolved problem or recommended problem
    const unsolved = await CodingProblem.findOne({
      _id: { $nin: progress.solvedProblemIds },
    }).sort({ order: 1 });

    const dailyChallenge = unsolved || (await CodingProblem.findOne().sort({ order: 1 }));

    res.json({
      success: true,
      stats: {
        totalSolved: progress.solvedProblemIds.length,
        totalAttempted: progress.attemptedProblemIds.length,
        streak: progress.streak || 0,
        easySolved: progress.easySolved || 0,
        totalEasy,
        mediumSolved: progress.mediumSolved || 0,
        totalMedium,
        hardSolved: progress.hardSolved || 0,
        totalHard,
        totalProblems,
      },
      topicProgress,
      dailyChallenge: dailyChallenge
        ? {
            _id: dailyChallenge._id,
            title: dailyChallenge.title,
            slug: dailyChallenge.slug,
            difficulty: dailyChallenge.difficulty,
            topics: dailyChallenge.topics,
          }
        : null,
    });
  } catch (err) {
    console.error('[CodingController] getProgress error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get user submission history
 * @route   GET /api/coding/submissions
 * @access  Private
 */
exports.getSubmissions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { problemId, limit = 20 } = req.query;

    const query = { userId };
    if (problemId && mongoose.Types.ObjectId.isValid(problemId)) {
      query.problemId = problemId;
    }

    const submissions = await CodingSubmission.find(query)
      .populate('problemId', 'title slug difficulty')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error('[CodingController] getSubmissions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    AI Coding Assistant Help
 * @route   POST /api/coding/ai-help
 * @access  Private
 */
exports.getAiHelp = async (req, res) => {
  try {
    const { action, problemId, code, language, error, currentHintIndex } = req.body;

    if (!action || !problemId) {
      return res.status(400).json({ success: false, message: 'Action and problemId are required' });
    }

    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const helpResult = await codingAssistantAgent.getAssistance({
      action,
      problem,
      code,
      language: language || 'python',
      error,
      currentHintIndex: currentHintIndex || 0,
    });

    res.json({
      success: true,
      ...helpResult,
    });
  } catch (err) {
    console.error('[CodingController] getAiHelp error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
