const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getInterviewPreContext,
  startInterview,
  submitAnswer,
  evaluateAnswer,
  getNextQuestion,
  requestSilenceHint,
  endInterview,
  getInterviewById,
  getInterviewReport,
  getInterviewHistory,
  getInterviewMistakes,
  pingReadiness,
  recordMonitoringIncident,
  updateMonitoringSummary,
} = require('../controllers/interviewController');

// All interview routes require authentication (Section 24 Security)
router.use(protect);

// Static & list routes first before parameterized :id routes
router.get('/history', getInterviewHistory);
router.get('/mistakes', getInterviewMistakes);
router.get('/context/:sessionId', getInterviewPreContext);
router.get('/readiness/ping', pingReadiness);

// Core agentic lifecycle routes (Section 22)
router.post('/start', startInterview);
router.post('/:id/answer', submitAnswer);
router.post('/:id/evaluate', evaluateAnswer);
router.post('/:id/next-question', getNextQuestion);
router.post('/:id/hint', requestSilenceHint);
router.post('/:id/end', endInterview);

// Responsible Proctoring & Monitoring routes
router.post('/:id/monitoring/incident', recordMonitoringIncident);
router.post('/:id/monitoring/summary', updateMonitoringSummary);

// State & Final Report retrieval
router.get('/:id/report', getInterviewReport);
router.get('/:id', getInterviewById);

module.exports = router;
