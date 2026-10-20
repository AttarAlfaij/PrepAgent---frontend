const express = require('express');
const router = express.Router();
const {
  getProblems,
  getProblemById,
  runCode,
  submitCode,
  getProgress,
  getSubmissions,
  getAiHelp,
} = require('../controllers/codingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/problems', getProblems);
router.get('/problems/:id', getProblemById);
router.post('/run', runCode);
router.post('/submit', submitCode);
router.get('/progress', getProgress);
router.get('/submissions', getSubmissions);
router.post('/ai-help', getAiHelp);

module.exports = router;
