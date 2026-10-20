const express = require('express');
const router = express.Router();
const {
  getCategories,
  startTest,
  recordAnswer,
  submitTest,
  getTestResult,
  getHistory,
  getProgress,
  getRecommendations,
  getAiHelp,
} = require('../controllers/aptitudeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/categories', getCategories);
router.post('/test/start', startTest);
router.post('/test/:testId/answer', recordAnswer);
router.post('/test/:testId/submit', submitTest);
router.get('/test/:testId/result', getTestResult);
router.get('/history', getHistory);
router.get('/progress', getProgress);
router.get('/recommendations', getRecommendations);
router.post('/ai-help', getAiHelp);

module.exports = router;
