const express = require('express');
const router = express.Router();
const {
  getLatestResume,
  downloadResume,
  getResumeFile,
} = require('../controllers/preparationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All resume routes require authentication

router.get('/latest', getLatestResume);
router.get('/download/:resumeId', downloadResume);
router.get('/:resumeId', getResumeFile);

module.exports = router;
