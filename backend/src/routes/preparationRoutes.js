const express = require('express');
const router = express.Router();
const {
  createPreparation,
  getPreparations,
  getPreparationById,
  updatePreparation,
  getResumeFile,
  analyzeResume,
  getResumeAnalysis,
  analyzeCompanyRole,
  getCompanyRoleAnalysis,
  analyzeSkillGap,
  getSkillGapAnalysis,
  generateTailoredResume,
  getTailoredResume,
  updateTailoredResume,
  downloadTailoredResumePdf,
  downloadTailoredResumeDocx,
  getUserResume,
  updateUserResume,
  resetUserResume,
  downloadUserResumePdf,
  downloadUserResumeDocx,
  getOrchestrationStatus,
  runNextOrchestratedAgent,
  runAutoOrchestration,
  retryOrchestratedAgent,
  getJobReadinessTwin,
  recalculateJobReadinessTwin,
  generatePreparationPlan,
  getPreparationPlan,
  updatePreparationPlanProgress,
  regeneratePreparationPlan,
  getMockInterviewState,
  startMockInterview,
  submitMockInterviewAnswer,
  recordMockInterviewIntegritySignal,
  endMockInterview,
  recommendDifficulty,
  inferTargetRole,
} = require('../controllers/preparationController');
const { protect } = require('../middleware/authMiddleware');
const uploadResume = require('../middleware/uploadMiddleware');

router.use(protect); // All preparation routes require authentication

router.post('/', uploadResume.single('resume'), createPreparation);
router.get('/', getPreparations);

// Dynamic difficulty recommendation & role inference
router.post('/recommend-difficulty', uploadResume.single('resume'), recommendDifficulty);
router.post('/infer-role', uploadResume.single('resume'), inferTargetRole);

router.get('/:sessionId', getPreparationById);
router.put('/:sessionId', updatePreparation);
router.get('/:sessionId/resume', getResumeFile);

// Phase 6 — Job Preparation Plan routes
router.post('/:sessionId/preparation-plan', generatePreparationPlan);
router.get('/:sessionId/preparation-plan', getPreparationPlan);
router.put('/:sessionId/preparation-plan/progress', updatePreparationPlanProgress);
router.post('/:sessionId/preparation-plan/regenerate', regeneratePreparationPlan);

// Aliases for /job-preparation-plan
router.post('/:sessionId/job-preparation-plan', generatePreparationPlan);
router.get('/:sessionId/job-preparation-plan', getPreparationPlan);
router.put('/:sessionId/job-preparation-plan/progress', updatePreparationPlanProgress);
router.post('/:sessionId/job-preparation-plan/regenerate', regeneratePreparationPlan);

// Phase 7 — AI Job Readiness Twin routes
router.get('/:sessionId/readiness-twin', getJobReadinessTwin);
router.post('/:sessionId/readiness-twin/recalculate', recalculateJobReadinessTwin);
router.get('/:sessionId/job-readiness-twin', getJobReadinessTwin);
router.post('/:sessionId/job-readiness-twin/recalculate', recalculateJobReadinessTwin);

// Phase 8 — Real-Time AI Avatar Mock Interview routes
router.get('/:sessionId/mock-interview', getMockInterviewState);
router.get('/:sessionId/mock-interview/report', getMockInterviewState);   // Must be before /:interviewId
router.get('/:sessionId/mock-interview/:interviewId', getMockInterviewState);
router.post('/:sessionId/mock-interview/start', startMockInterview);
router.post('/:sessionId/mock-interview/question', getMockInterviewState);
router.post('/:sessionId/mock-interview/answer', submitMockInterviewAnswer);
router.post('/:sessionId/mock-interview/integrity-signal', recordMockInterviewIntegritySignal);
router.post('/:sessionId/mock-interview/end', endMockInterview);

// Phase 6 — Central Agent Orchestrator routes
router.get('/:sessionId/orchestrator/status', getOrchestrationStatus);
router.post('/:sessionId/orchestrator/status', getOrchestrationStatus);
router.post('/:sessionId/orchestrator/run', runNextOrchestratedAgent);
router.post('/:sessionId/orchestrator/auto', runAutoOrchestration);
router.post('/:sessionId/orchestrator/retry', retryOrchestratedAgent);

// Section 24 & 25 route aliases (/orchestrate)
router.get('/:sessionId/orchestrate', getOrchestrationStatus);
router.post('/:sessionId/orchestrate', getOrchestrationStatus);
router.post('/:sessionId/orchestrate/run', runNextOrchestratedAgent);
router.post('/:sessionId/orchestrate/auto', runAutoOrchestration);
router.post('/:sessionId/orchestrate/retry', retryOrchestratedAgent);

// Phase 3 — Resume Analysis Agent routes
router.post('/:sessionId/resume-analysis', analyzeResume);
router.get('/:sessionId/resume-analysis', getResumeAnalysis);

// Phase 4 — Company & Role Analysis Agent routes
router.post('/:sessionId/company-role-analysis', analyzeCompanyRole);
router.get('/:sessionId/company-role-analysis', getCompanyRoleAnalysis);

// Phase 5 — Skill Gap Analysis Agent & AI Resume Tailoring routes
router.post('/:sessionId/skill-gap', analyzeSkillGap);
router.get('/:sessionId/skill-gap', getSkillGapAnalysis);

// Phase 5 — AI Ideal Resume routes
router.post('/:sessionId/tailored-resume', generateTailoredResume);
router.get('/:sessionId/tailored-resume', getTailoredResume);
router.put('/:sessionId/tailored-resume', updateTailoredResume);
router.get('/:sessionId/tailored-resume/download/pdf', downloadTailoredResumePdf);
router.get('/:sessionId/tailored-resume/download/docx', downloadTailoredResumeDocx);

// Phase 5 — User Editable Resume routes
router.get('/:sessionId/user-resume', getUserResume);
router.put('/:sessionId/user-resume', updateUserResume);
router.post('/:sessionId/user-resume/reset', resetUserResume);
router.get('/:sessionId/user-resume/download/pdf', downloadUserResumePdf);
router.post('/:sessionId/user-resume/download/pdf', downloadUserResumePdf);
router.get('/:sessionId/user-resume/download/docx', downloadUserResumeDocx);

module.exports = router;

