const aptitudeService = require('../services/aptitudeService');
const aptitudeCoachAgent = require('../services/aptitudeCoachAgent');

exports.getCategories = async (req, res) => {
  try {
    const categories = aptitudeService.getCategoriesAndTopics();
    res.json({ success: true, categories });
  } catch (err) {
    console.error('[AptitudeController] getCategories error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.startTest = async (req, res) => {
  try {
    const { sessionId, testType, category, topic, difficulty, questionCount, durationMinutes } = req.body;
    const userId = req.user._id;

    const test = await aptitudeService.createTest({
      userId,
      sessionId,
      testType: testType || 'practice',
      category: category || 'Mixed',
      topic: topic || 'All Topics',
      difficulty: difficulty || 'Medium',
      questionCount: parseInt(questionCount, 10) || 10,
      durationMinutes: parseInt(durationMinutes, 10) || 15,
    });

    res.json({ success: true, test });
  } catch (err) {
    console.error('[AptitudeController] startTest error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.recordAnswer = async (req, res) => {
  try {
    const { testId } = req.params;
    const { questionIndex, userAnswer, timeTakenSeconds, markedForReview } = req.body;
    const userId = req.user._id;

    const result = await aptitudeService.recordAnswer({
      testId,
      userId,
      questionIndex,
      userAnswer,
      timeTakenSeconds,
      markedForReview,
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('[AptitudeController] recordAnswer error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user._id;

    const testResult = await aptitudeService.submitTest({ testId, userId });
    res.json({ success: true, testResult });
  } catch (err) {
    console.error('[AptitudeController] submitTest error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTestResult = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user._id;

    const test = await aptitudeService.getTestResult(testId, userId);
    res.json({ success: true, test });
  } catch (err) {
    console.error('[AptitudeController] getTestResult error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit } = req.query;

    const history = await aptitudeService.getUserHistory(userId, limit ? parseInt(limit, 10) : 20);
    res.json({ success: true, history });
  } catch (err) {
    console.error('[AptitudeController] getHistory error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.query;

    const progress = await aptitudeService.getUserProgress(userId, sessionId);
    res.json({ success: true, ...progress });
  } catch (err) {
    console.error('[AptitudeController] getProgress error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.query;

    const progress = await aptitudeService.getUserProgress(userId, sessionId);
    res.json({
      success: true,
      weakTopics: progress.weakTopics,
      strongTopics: progress.strongTopics,
      recommendedNextTopics: progress.recommendedNextTopics,
      roleContext: progress.roleContext,
    });
  } catch (err) {
    console.error('[AptitudeController] getRecommendations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAiHelp = async (req, res) => {
  try {
    const { action, question, userAnswer, correctAnswer, explanation, concept, topic, category } = req.body;

    const help = await aptitudeCoachAgent.getCoachAssistance({
      action,
      question,
      userAnswer,
      correctAnswer,
      explanation,
      concept,
      topic,
      category,
    });

    res.json({ success: true, ...help });
  } catch (err) {
    console.error('[AptitudeController] getAiHelp error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
