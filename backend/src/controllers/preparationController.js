const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PreparationSession = require('../models/PreparationSession');
const Resume = require('../models/Resume');
const agentOrchestrator = require('../services/orchestrator/AgentOrchestrator');
const jobPreparationPlanAgent = require('../services/agents/jobPreparationPlanAgent');
const jobReadinessTwinAgent = require('../services/agents/jobReadinessTwinAgent');
const mockInterviewAgent = require('../services/agents/mockInterviewAgent');
const resumeAnalysisAgent = require('../services/agents/resumeAnalysisAgent');

// @desc    Create a new Preparation Session
// @route   POST /api/preparations
// @access  Private
const createPreparation = async (req, res, next) => {
  try {
    const {
      targetRole,
      customRole,
      company,
      jobDescription,
      experienceLevel,
      resumeId,
      interviewType,
      questionCount,
      difficulty,
      difficultyReason,
      difficultyOverride,
    } = req.body;

    // 1. Resume validation
    let resolvedResumeId = resumeId;
    let resumeSnapshot = null;

    if (req.file) {
      // User uploaded a new resume
      const newResume = await Resume.create({
        userId: req.user._id,
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });

      resolvedResumeId = newResume._id;
      resumeSnapshot = {
        originalName: newResume.originalName,
        filename: newResume.filename,
        path: newResume.path,
        size: newResume.size,
        mimeType: newResume.mimeType,
      };
    } else if (resumeId) {
      // User selected an existing resume
      const existingResume = await Resume.findOne({
        _id: resumeId,
        userId: req.user._id,
      });

      if (!existingResume) {
        return res.status(404).json({
          success: false,
          message: 'Selected resume not found or does not belong to your account.',
        });
      }

      resolvedResumeId = existingResume._id;
      resumeSnapshot = {
        originalName: existingResume.originalName,
        filename: existingResume.filename,
        path: existingResume.path,
        size: existingResume.size,
        mimeType: existingResume.mimeType,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload your resume or select a previously uploaded resume.',
      });
    }

    // 2. Target Job Role validation
    if (!targetRole || targetRole.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please select a target job role.',
      });
    }

    if (targetRole === 'Other / Custom Role' && (!customRole || customRole.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Please specify your custom target role.',
      });
    }

    // 3. Company validation
    if (!company || company.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please enter the company name.',
      });
    }

    // 4. Job Description validation
    if (!jobDescription || jobDescription.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide the job description.',
      });
    }

    // 5. Experience Level validation (defaults gracefully to Fresher if not specified)
    const validLevels = ['Fresher', 'Entry Level', 'Intermediate', 'Experienced'];
    const finalExperienceLevel = validLevels.includes(experienceLevel) ? experienceLevel : 'Fresher';

    // 6. Interview Configuration validation & normalization
    const validInterviewTypes = ['Technical', 'Behavioral / HR', 'Mixed'];
    const finalInterviewType = validInterviewTypes.includes(interviewType) ? interviewType : 'Mixed';

    const parsedQuestionCount = parseInt(questionCount, 10);
    const finalQuestionCount =
      !isNaN(parsedQuestionCount) && parsedQuestionCount >= 1 && parsedQuestionCount <= 20
        ? parsedQuestionCount
        : 10;

    const validDifficulties = ['Easy', 'Medium', 'Medium-Hard', 'Hard'];
    const finalDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'Medium';

    // Create session (Progress starts at 0% without fake AI data)
    const session = await PreparationSession.create({
      userId: req.user._id,
      resumeId: resolvedResumeId,
      resumeSnapshot,
      targetRole: targetRole.trim(),
      customRole: customRole ? customRole.trim() : '',
      company: company.trim(),
      jobDescription: jobDescription.trim(),
      experienceLevel: finalExperienceLevel,
      interviewType: finalInterviewType,
      questionCount: finalQuestionCount,
      difficulty: finalDifficulty,
      difficultyReason: typeof difficultyReason === 'string' ? difficultyReason.trim() : '',
      difficultyOverride: validDifficulties.includes(difficultyOverride) ? difficultyOverride : null,
      currentStage: 'setup',
      status: 'active',
      progress: 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Preparation session created successfully.',
      session,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Preparation Sessions for authenticated user
// @route   GET /api/preparations
// @access  Private
const getPreparations = async (req, res, next) => {
  try {
    const sessions = await PreparationSession.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single Preparation Session by ID (enforcing user isolation)
// @route   GET /api/preparations/:sessionId
// @access  Private
const getPreparationById = async (req, res, next) => {
  try {
    const session = await PreparationSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this preparation session.',
      });
    }

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Preparation Session
// @route   PUT /api/preparations/:sessionId
// @access  Private
const updatePreparation = async (req, res, next) => {
  try {
    const session = await PreparationSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to modify this preparation session.',
      });
    }

    const {
      company,
      targetRole,
      customRole,
      jobDescription,
      experienceLevel,
      status,
      interviewType,
      questionCount,
      difficulty,
      difficultyOverride,
      difficultyReason,
    } = req.body;
    const changedFields = [];

    if (company && company.trim() !== session.company) {
      session.company = company.trim();
      changedFields.push('company');
    }
    if (targetRole && targetRole.trim() !== session.targetRole) {
      session.targetRole = targetRole.trim();
      changedFields.push('targetRole');
    }
    if (customRole !== undefined && customRole.trim() !== session.customRole) {
      session.customRole = customRole.trim();
      changedFields.push('customRole');
    }
    if (jobDescription && jobDescription.trim() !== session.jobDescription) {
      session.jobDescription = jobDescription.trim();
      changedFields.push('jobDescription');
    }
    if (experienceLevel && experienceLevel !== session.experienceLevel) {
      session.experienceLevel = experienceLevel;
      changedFields.push('experienceLevel');
    }
    if (interviewType && ['Technical', 'Behavioral / HR', 'Mixed'].includes(interviewType)) {
      session.interviewType = interviewType;
    }
    if (questionCount !== undefined) {
      const parsed = parseInt(questionCount, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
        session.questionCount = parsed;
      }
    }
    if (difficulty && ['Easy', 'Medium', 'Medium-Hard', 'Hard'].includes(difficulty)) {
      session.difficulty = difficulty;
    }
    if (difficultyReason !== undefined) {
      session.difficultyReason = difficultyReason;
    }
    if (difficultyOverride !== undefined) {
      session.difficultyOverride = difficultyOverride;
    }
    if (status) session.status = status;

    const updatedSession = await session.save();

    if (changedFields.length > 0) {
      await agentOrchestrator.handleSessionChange(session._id, req.user._id, changedFields);
    }

    return res.status(200).json({
      success: true,
      message: 'Preparation session updated successfully.',
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's most recently uploaded resume for reuse
// @route   GET /api/resumes/latest
// @access  Private
const getLatestResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      resume: resume || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download or preview resume file securely
// @route   GET /api/resumes/:resumeId
// @route   GET /api/resumes/download/:resumeId
// @route   GET /api/preparations/:sessionId/resume
// @access  Private
const getResumeFile = async (req, res, next) => {
  try {
    const identifier = req.params.resumeId || req.params.sessionId || req.params.id;
    const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Resume identifier is required.',
      });
    }

    let resume = null;
    let session = null;

    // 1. Try finding by Resume ID
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      resume = await Resume.findById(identifier);
    }

    // 2. If not found as Resume, check if identifier is a PreparationSession ID
    if (!resume && mongoose.Types.ObjectId.isValid(identifier)) {
      session = await PreparationSession.findById(identifier);
      if (session) {
        if (session.resumeId) {
          resume = await Resume.findById(session.resumeId);
        }
      }
    }

    // Strict user isolation check
    if (resume) {
      if (resume.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this resume.',
        });
      }
    } else if (session) {
      if (session.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this preparation session.',
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: 'Resume document not found.',
      });
    }

    // Gather file metadata
    const originalName = resume?.originalName || session?.resumeSnapshot?.originalName || 'Resume.pdf';
    const filename = resume?.filename || session?.resumeSnapshot?.filename || '';
    const storedPath = resume?.path || session?.resumeSnapshot?.path || '';

    // Robust disk path resolution across relative/moved environments
    const uploadsDir = path.resolve(__dirname, '../../uploads/resumes');
    const candidatePaths = [
      storedPath ? path.resolve(storedPath) : null,
      storedPath ? path.join(uploadsDir, path.basename(storedPath)) : null,
      filename ? path.join(uploadsDir, filename) : null,
      storedPath ? path.join(process.cwd(), 'uploads/resumes', path.basename(storedPath)) : null,
      storedPath ? path.join(process.cwd(), 'backend/uploads/resumes', path.basename(storedPath)) : null,
      filename ? path.join(process.cwd(), 'uploads/resumes', filename) : null,
      filename ? path.join(process.cwd(), 'backend/uploads/resumes', filename) : null,
    ].filter(Boolean);

    let resolvedPath = null;
    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        resolvedPath = candidate;
        break;
      }
    }

    if (!resolvedPath) {
      return res.status(404).json({
        success: false,
        message: 'Resume file does not exist on disk.',
      });
    }

    // Accurate MIME type determination
    const ext = path.extname(originalName || resolvedPath).toLowerCase();
    let mimeType = resume?.mimeType || session?.resumeSnapshot?.mimeType;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.doc') mimeType = 'application/msword';
      else if (ext === '.txt') mimeType = 'text/plain';
      else mimeType = 'application/pdf';
    }

    // Set headers with UTF-8 safe filename
    const safeFilename = originalName.replace(/["'\r\n]/g, '_');
    const encodedFilename = encodeURIComponent(originalName);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    );

    return res.sendFile(path.resolve(resolvedPath));
  } catch (error) {
    next(error);
  }
};

const downloadResume = getResumeFile;

// @desc    Start / Run Resume Analysis Agent
// @route   POST /api/preparations/:sessionId/resume-analysis
// @access  Private
const analyzeResume = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const force = req.query.force === 'true' || req.body?.force === true;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to analyze this preparation session.',
      });
    }

    const resumeAnalysisAgent = require('../services/agents/resumeAnalysisAgent');
    const result = await resumeAnalysisAgent.executeAnalysis(sessionId, req.user._id, { force });

    // Fetch fresh session to get rawText if saved
    const updatedSession = await PreparationSession.findById(sessionId);

    return res.status(200).json({
      success: true,
      message: result.alreadyAnalyzed
        ? 'Retrieved existing resume analysis.'
        : 'Resume analysis completed successfully.',
      ...result,
      atsScore: result.resumeAnalysis?.atsScore ?? null,
      atsBreakdown: result.resumeAnalysis?.atsBreakdown ?? null,
      atsStrengths: result.resumeAnalysis?.atsStrengths ?? [],
      atsImprovements: result.resumeAnalysis?.atsImprovements ?? [],
      resumeId: session.resumeId,
      resumeSnapshot: session.resumeSnapshot,
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole,
      experienceLevel: session.experienceLevel,
      rawResumeText: updatedSession?.resumeAnalysis?.rawText || '',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Resume Analysis & Understanding Map
// @route   GET /api/preparations/:sessionId/resume-analysis
// @access  Private
const getResumeAnalysis = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this resume analysis.',
      });
    }

    let rawResumeText = session.resumeAnalysis?.rawText || '';
    if (!rawResumeText && session.resumeSnapshot?.path && fs.existsSync(session.resumeSnapshot.path)) {
      try {
        const resumeAnalysisAgent = require('../services/agents/resumeAnalysisAgent');
        rawResumeText = await resumeAnalysisAgent.extractText(
          session.resumeSnapshot.path,
          session.resumeSnapshot.mimeType,
          session.resumeSnapshot.originalName
        );
        if (session.resumeAnalysis) {
          session.resumeAnalysis.rawText = rawResumeText;
          await session.save();
        }
      } catch (e) {
        // Fallback gracefully
      }
    }

    // Ensure ATS Score & Breakdown are computed if already completed
    if (
      session.resumeAnalysis?.status === 'completed' &&
      (session.resumeAnalysis.atsScore == null || !session.resumeAnalysis.atsStrengths?.length) &&
      session.candidateProfile
    ) {
      try {
        const resumeAnalysisAgent = require('../services/agents/resumeAnalysisAgent');
        const atsData = resumeAnalysisAgent.calculateAtsScore(session.candidateProfile, rawResumeText);
        session.resumeAnalysis.atsScore = atsData.score;
        session.resumeAnalysis.atsBreakdown = atsData;
        session.resumeAnalysis.atsStrengths = atsData.strengths || [];
        session.resumeAnalysis.atsImprovements = atsData.improvements || [];
        session.resumeAnalysis.atsAnalyzedAt = new Date();
        await session.save();
      } catch (e) {
        // Fallback gracefully
      }
    }

    return res.status(200).json({
      success: true,
      resumeId: session.resumeId,
      candidateProfile: session.candidateProfile,
      resumeUnderstandingMap: session.resumeUnderstandingMap,
      resumeAnalysis: session.resumeAnalysis,
      atsScore: session.resumeAnalysis?.atsScore ?? null,
      atsBreakdown: session.resumeAnalysis?.atsBreakdown ?? null,
      atsStrengths: session.resumeAnalysis?.atsStrengths ?? [],
      atsImprovements: session.resumeAnalysis?.atsImprovements ?? [],
      progress: session.progress,
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole,
      experienceLevel: session.experienceLevel,
      jobDescription: session.jobDescription,
      resumeSnapshot: session.resumeSnapshot,
      rawResumeText,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start / Run Company & Role Analysis Agent
// @route   POST /api/preparations/:sessionId/company-role-analysis
// @access  Private
const analyzeCompanyRole = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const force = req.query.force === 'true' || req.body?.force === true;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to analyze this preparation session.',
      });
    }

    const companyRoleAnalysisAgent = require('../services/agents/companyRoleAnalysisAgent');
    const result = await companyRoleAnalysisAgent.executeAnalysis(sessionId, req.user._id, { force });

    const updatedSession = await PreparationSession.findById(sessionId);

    return res.status(200).json({
      success: true,
      message: result.alreadyAnalyzed
        ? 'Retrieved existing company & role analysis.'
        : 'Company & role analysis completed successfully.',
      ...result,
      candidateProfile: updatedSession.candidateProfile,
      skillGapAnalysis: updatedSession.skillGapAnalysis,
      company: updatedSession.company,
      targetRole: updatedSession.targetRole,
      customRole: updatedSession.customRole,
      displayRole: updatedSession.displayRole,
      experienceLevel: updatedSession.experienceLevel,
      jobDescription: updatedSession.jobDescription,
      resumeId: updatedSession.resumeId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Company & Role Analysis
// @route   GET /api/preparations/:sessionId/company-role-analysis
// @access  Private
const getCompanyRoleAnalysis = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this company & role analysis.',
      });
    }

    return res.status(200).json({
      success: true,
      companyRoleAnalysis: session.companyRoleAnalysis,
      companyAnalysis: session.companyAnalysis,
      roleAnalysis: session.roleAnalysis,
      requirements: session.requirements,
      interviewRelevantAreas: session.interviewRelevantAreas,
      jobRequirementMap: session.jobRequirementMap,
      candidateProfile: session.candidateProfile,
      skillGapAnalysis: session.skillGapAnalysis,
      progress: session.progress,
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole,
      displayRole: session.displayRole,
      experienceLevel: session.experienceLevel,
      jobDescription: session.jobDescription,
      resumeId: session.resumeId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start / Run Skill Gap Analysis Agent
// @route   POST /api/preparations/:sessionId/skill-gap
// @access  Private
const analyzeSkillGap = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const force = req.query.force === 'true' || req.body?.force === true;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to analyze this preparation session.',
      });
    }

    // Auto-complete prerequisites if not yet analyzed
    if (!session.candidateProfile?.personalInfo?.name && session.resumeAnalysis?.status !== 'completed') {
      try {
        const resumeAnalysisAgent = require('../services/agents/resumeAnalysisAgent');
        await resumeAnalysisAgent.executeAnalysis(sessionId, req.user._id, { force: false });
      } catch (e) {
        console.warn('[PreparationController] Auto resume analysis prerequisite error:', e.message);
      }
    }

    if (!session.requirements?.technicalSkills?.length && session.companyRoleAnalysis?.status !== 'completed') {
      try {
        const companyRoleAnalysisAgent = require('../services/agents/companyRoleAnalysisAgent');
        await companyRoleAnalysisAgent.executeAnalysis(sessionId, req.user._id, { force: false });
      } catch (e) {
        console.warn('[PreparationController] Auto company role analysis prerequisite error:', e.message);
      }
    }

    const skillGapAnalysisAgent = require('../services/agents/skillGapAnalysisAgent');
    const result = await skillGapAnalysisAgent.executeAnalysis(sessionId, req.user._id, { force });

    const updatedSession = await PreparationSession.findById(sessionId);

    return res.status(200).json({
      success: true,
      message: result.alreadyAnalyzed
        ? 'Retrieved existing skill gap analysis.'
        : 'Skill gap analysis completed successfully.',
      skillGapAnalysis: updatedSession.skillGapAnalysis,
      progress: updatedSession.progress,
      company: updatedSession.company,
      targetRole: updatedSession.targetRole,
      customRole: updatedSession.customRole,
      displayRole: updatedSession.displayRole,
      experienceLevel: updatedSession.experienceLevel,
      jobDescription: updatedSession.jobDescription,
      candidateProfile: updatedSession.candidateProfile,
      requirements: updatedSession.requirements,
      roleAnalysis: updatedSession.roleAnalysis,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Skill Gap Analysis
// @route   GET /api/preparations/:sessionId/skill-gap
// @access  Private
const getSkillGapAnalysis = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this skill gap analysis.',
      });
    }

    return res.status(200).json({
      success: true,
      skillGapAnalysis: session.skillGapAnalysis,
      progress: session.progress,
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole,
      displayRole: session.displayRole,
      experienceLevel: session.experienceLevel,
      jobDescription: session.jobDescription,
      candidateProfile: session.candidateProfile,
      requirements: session.requirements,
      roleAnalysis: session.roleAnalysis,
      tailoredResume: session.tailoredResume,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate / Tailor Resume with AI
// @route   POST /api/preparations/:sessionId/tailored-resume
// @access  Private
const generateTailoredResume = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to tailor this resume.',
      });
    }

    const resumeTailoringAgent = require('../services/agents/resumeTailoringAgent');
    const result = await resumeTailoringAgent.generateTailoredResume(sessionId, req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Tailored resume generated successfully.',
      tailoredResume: result.tailoredResume,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Tailored Resume
// @route   GET /api/preparations/:sessionId/tailored-resume
// @access  Private
const getTailoredResume = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this tailored resume.',
      });
    }

    return res.status(200).json({
      success: true,
      tailoredResume: session.tailoredResume,
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole,
      displayRole: session.displayRole,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Editable Tailored Resume Content
// @route   PUT /api/preparations/:sessionId/tailored-resume
// @access  Private
const updateTailoredResume = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid resume content object is required.',
      });
    }

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to update this tailored resume.',
      });
    }

    session.tailoredResume = session.tailoredResume || {};
    session.tailoredResume.content = content;
    session.tailoredResume.editedAt = new Date();
    session.tailoredResume.status = 'edited';
    const nextVersion = (session.tailoredResume.currentVersion || 1) + 1;
    session.tailoredResume.currentVersion = nextVersion;
    session.tailoredResume.versions = session.tailoredResume.versions || [];
    session.tailoredResume.versions.push({
      version: nextVersion,
      label: `Manual Edit v${nextVersion}`,
      createdAt: new Date(),
      content: content,
    });

    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Tailored resume saved successfully.',
      tailoredResume: session.tailoredResume,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Tailored Resume as PDF
// @route   GET /api/preparations/:sessionId/tailored-resume/download/pdf
// @access  Private
const downloadTailoredResumePdf = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to download this tailored resume.',
      });
    }

    const content = session.tailoredResume?.content || {};
    const candidateName = content.personalInfo?.name || session.candidateProfile?.personalInfo?.name || 'Candidate';
    const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');

    const resumeExportService = require('../services/resumeExportService');
    const pdfBuffer = await resumeExportService.generatePdf(content);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Tailored_Resume.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Download Tailored Resume as DOCX (Word Document)
// @route   GET /api/preparations/:sessionId/tailored-resume/download/docx
// @access  Private
const downloadTailoredResumeDocx = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to download this tailored resume.',
      });
    }

    const content = session.tailoredResume?.content || {};
    const candidateName = content.personalInfo?.name || session.candidateProfile?.personalInfo?.name || 'Candidate';
    const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');

    const resumeExportService = require('../services/resumeExportService');
    const docxBuffer = await resumeExportService.generateDocx(content);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Tailored_Resume.docx"`);
    res.setHeader('Content-Length', docxBuffer.length);

    return res.send(docxBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Build initial user editable resume content from candidateProfile
 */
const buildInitialUserResumeContent = (candidateProfile, displayRole) => {
  const p = candidateProfile?.personalInfo || {};
  const s = candidateProfile?.skills || {};

  const technicalSkills = Array.from(
    new Set([
      ...(Array.isArray(s.programmingLanguages) ? s.programmingLanguages : []),
      ...(Array.isArray(s.languages) ? s.languages : []),
      ...(Array.isArray(s.frameworks) ? s.frameworks : []),
      ...(Array.isArray(s.libraries) ? s.libraries : []),
      ...(Array.isArray(s.databases) ? s.databases : []),
      ...(Array.isArray(s.tools) ? s.tools : []),
      ...(Array.isArray(s.cloud) ? s.cloud : []),
      ...(Array.isArray(s.technologies) ? s.technologies : []),
      ...(Array.isArray(s.technicalSkills) ? s.technicalSkills : []),
      ...(Array.isArray(s) ? s : []),
    ])
  );

  return {
    personalInfo: {
      name: p.name || 'Candidate Name',
      title: p.title || displayRole || 'Professional',
      email: p.email || '',
      phone: p.phone || '',
      location: p.location || '',
      linkedin: p.linkedin || '',
      github: p.github || '',
      portfolio: p.portfolio || '',
    },
    professionalSummary:
      candidateProfile?.professionalSummary ||
      candidateProfile?.careerObjective ||
      'Detail-oriented professional with hands-on experience in modern technologies. Seeking to apply technical skills and problem-solving abilities to deliver high-quality software solutions.',
    skills: {
      technicalSkills: technicalSkills.length ? technicalSkills : ['Java', 'SQL', 'Git', 'Postman', 'REST APIs'],
      softSkills:
        Array.isArray(s.other) && s.other.length
          ? s.other
          : ['Problem Solving', 'Team Collaboration', 'Communication', 'Attention to Detail'],
      tools: Array.isArray(s.tools) && s.tools.length ? s.tools : ['Git', 'Postman', 'VS Code'],
      languages:
        Array.isArray(s.programmingLanguages) && s.programmingLanguages.length
          ? s.programmingLanguages
          : ['Java', 'JavaScript', 'SQL'],
      databases:
        Array.isArray(s.databases) && s.databases.length ? s.databases : ['MongoDB', 'MySQL'],
      frameworks:
        Array.isArray(s.frameworks) && s.frameworks.length ? s.frameworks : ['React', 'Node.js', 'Express'],
    },
    projects:
      Array.isArray(candidateProfile?.projects) && candidateProfile.projects.length
        ? candidateProfile.projects.map((proj) => ({
            name: proj.name || 'Project',
            role: proj.role || 'Developer',
            description: proj.description || '',
            technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
            responsibilities:
              Array.isArray(proj.responsibilities) && proj.responsibilities.length
                ? proj.responsibilities
                : [proj.description || 'Designed and implemented core software features.'],
            links: Array.isArray(proj.links) ? proj.links : [],
          }))
        : [
            {
              name: 'LeaveEase - Automated Leave and Attendance Management System',
              role: 'Full-Stack Developer',
              description: 'Automated workflow system for leave requests and balance updates.',
              technologies: ['React', 'Node.js', 'Express', 'MongoDB'],
              responsibilities: [
                'Developed full-stack web application with role-based access control and automated leave deduction.',
                'Optimized database queries to improve response latency.',
              ],
              links: [],
            },
          ],
    experience:
      Array.isArray(candidateProfile?.experience) && candidateProfile.experience.length
        ? candidateProfile.experience.map((exp) => ({
            company: exp.company || 'Company',
            role: exp.role || 'Position',
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || 'Present',
            responsibilities:
              Array.isArray(exp.responsibilities) && exp.responsibilities.length
                ? exp.responsibilities
                : ['Contributed to engineering features, code reviews, and quality assurance.'],
            technologies: Array.isArray(exp.technologies) ? exp.technologies : [],
          }))
        : [],
    education:
      Array.isArray(candidateProfile?.education) && candidateProfile.education.length
        ? candidateProfile.education.map((ed) => ({
            degree: ed.degree || 'Bachelor of Engineering',
            institution: ed.institution || 'University',
            fieldOfStudy: ed.fieldOfStudy || 'Computer Science and Engineering',
            startYear: ed.startYear || '',
            endYear: ed.endYear || '',
            percentageOrCGPA: ed.percentageOrCGPA || '',
          }))
        : [
            {
              degree: 'Bachelor of Technology / Engineering',
              institution: 'Engineering Institute',
              fieldOfStudy: 'Computer Science and Engineering',
              startYear: '2020',
              endYear: '2024',
              percentageOrCGPA: '8.5 CGPA',
            },
          ],
    certifications:
      Array.isArray(candidateProfile?.certifications) && candidateProfile.certifications.length
        ? candidateProfile.certifications.map((c) => ({
            name: c.name || '',
            issuer: c.issuer || '',
            date: c.date || '',
            credentialId: c.credentialId || '',
          }))
        : [],
    achievements: Array.isArray(candidateProfile?.achievements)
      ? candidateProfile.achievements.map((a) => (typeof a === 'string' ? a : a.title || a.description || ''))
      : [],
    additionalSections: Array.isArray(candidateProfile?.additionalSections)
      ? candidateProfile.additionalSections
      : [],
  };
};

// @desc    Get User Editable Resume
// @route   GET /api/preparations/:sessionId/user-resume
// @access  Private
const getUserResume = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this resume.',
      });
    }

    // If userResume is uninitialized or missing personalInfo name, build from candidateProfile
    if (!session.userResume?.content?.personalInfo?.name) {
      const initialContent = buildInitialUserResumeContent(
        session.candidateProfile,
        session.displayRole || session.targetRole
      );
      session.userResume = {
        status: 'original',
        lastSavedAt: new Date(),
        currentVersion: 1,
        content: initialContent,
        versions: [
          {
            version: 1,
            label: 'Original Uploaded Resume',
            createdAt: new Date(),
            content: initialContent,
          },
        ],
      };
      await session.save();
    }

    return res.status(200).json({
      success: true,
      userResume: session.userResume,
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole,
      displayRole: session.displayRole,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update User Editable Resume Content
// @route   PUT /api/preparations/:sessionId/user-resume
// @access  Private
const updateUserResume = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid resume content object is required.',
      });
    }

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to update this resume.',
      });
    }

    session.userResume = session.userResume || {};
    session.userResume.content = content;
    session.userResume.status = 'edited';
    session.userResume.lastSavedAt = new Date();
    const nextVersion = (session.userResume.currentVersion || 1) + 1;
    session.userResume.currentVersion = nextVersion;
    session.userResume.versions = session.userResume.versions || [];
    session.userResume.versions.push({
      version: nextVersion,
      label: `Manual Edit v${nextVersion}`,
      createdAt: new Date(),
      content: content,
    });

    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Resume saved successfully.',
      userResume: session.userResume,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset User Resume back to Original Uploaded Profile
// @route   POST /api/preparations/:sessionId/user-resume/reset
// @access  Private
const resetUserResume = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to reset this resume.',
      });
    }

    const originalContent = buildInitialUserResumeContent(
      session.candidateProfile,
      session.displayRole || session.targetRole
    );

    const nextVersion = (session.userResume?.currentVersion || 1) + 1;
    session.userResume = {
      status: 'original',
      lastSavedAt: new Date(),
      currentVersion: nextVersion,
      content: originalContent,
      versions: [
        ...(session.userResume?.versions || []),
        {
          version: nextVersion,
          label: 'Reset to Original Upload',
          createdAt: new Date(),
          content: originalContent,
        },
      ],
    };

    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Resume reset to original successfully.',
      userResume: session.userResume,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download User Edited Resume as PDF
// @route   GET /api/preparations/:sessionId/user-resume/download/pdf
// @access  Private
const downloadUserResumePdf = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to download this resume.',
      });
    }

    // Support current in-memory content if sent in POST body, or use saved content
    let content = (req.body && req.body.content && typeof req.body.content === 'object')
      ? req.body.content
      : session.userResume?.content;

    // Persist content to session if provided in request
    if (req.body && req.body.content && typeof req.body.content === 'object') {
      session.userResume = session.userResume || {};
      session.userResume.content = req.body.content;
      session.userResume.status = 'edited';
      session.userResume.lastSavedAt = new Date();
      await session.save();
    }

    if (!content || !content.personalInfo?.name) {
      content = buildInitialUserResumeContent(
        session.candidateProfile,
        session.displayRole || session.targetRole
      );
    }

    const candidateName = content.personalInfo?.name?.trim();
    const safeName = candidateName ? candidateName.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const downloadFileName = (safeName && safeName.toLowerCase() !== 'candidate')
      ? `${safeName}_Resume.pdf`
      : 'Improved_Resume.pdf';

    const resumeExportService = require('../services/resumeExportService');
    const pdfBuffer = await resumeExportService.generatePdf(content);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Download User Edited Resume as DOCX (Word Document)
// @route   GET /api/preparations/:sessionId/user-resume/download/docx
// @access  Private
const downloadUserResumeDocx = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found.',
      });
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to download this resume.',
      });
    }

    let content = session.userResume?.content;
    if (!content || !content.personalInfo?.name) {
      content = buildInitialUserResumeContent(
        session.candidateProfile,
        session.displayRole || session.targetRole
      );
    }

    const candidateName = content.personalInfo?.name || 'Candidate';
    const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');

    const resumeExportService = require('../services/resumeExportService');
    const docxBuffer = await resumeExportService.generateDocx(content);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Resume.docx"`);
    res.setHeader('Content-Length', docxBuffer.length);

    return res.send(docxBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Agent Orchestrator state & context
// @route   GET /api/preparations/:sessionId/orchestrator/status
// @access  Private
const getOrchestrationStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const state = await agentOrchestrator.getOrchestrationState(sessionId, req.user._id);
    return res.status(200).json(state);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Execute the next required agent through orchestrator
// @route   POST /api/preparations/:sessionId/orchestrator/run
// @access  Private
const runNextOrchestratedAgent = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await agentOrchestrator.runNextAgent(sessionId, req.user._id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Run automated agent chain
// @route   POST /api/preparations/:sessionId/orchestrator/auto
// @access  Private
const runAutoOrchestration = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await agentOrchestrator.runAutoFlow(sessionId, req.user._id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Retry a failed agent
// @route   POST /api/preparations/:sessionId/orchestrator/retry
// @access  Private
const retryOrchestratedAgent = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { agentKey } = req.body;
    const result = await agentOrchestrator.retryAgent(sessionId, req.user._id, agentKey);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get AI Job Readiness Twin
// @route   GET /api/preparations/:sessionId/readiness-twin
// @access  Private
const getJobReadinessTwin = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await PreparationSession.findOne({ _id: sessionId, userId: req.user._id });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Preparation session not found or access denied.',
      });
    }

    // If readiness twin is not computed or stale, compute it now
    if (
      !session.jobReadinessTwin ||
      session.jobReadinessTwin.status === 'not_started' ||
      session.jobReadinessTwin.status === 'stale'
    ) {
      const twin = await jobReadinessTwinAgent.calculateReadinessTwin(sessionId, req.user._id);
      return res.status(200).json({
        success: true,
        jobReadinessTwin: twin,
      });
    }

    return res.status(200).json({
      success: true,
      jobReadinessTwin: session.jobReadinessTwin,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Recalculate AI Job Readiness Twin
// @route   POST /api/preparations/:sessionId/readiness-twin/recalculate
// @access  Private
const recalculateJobReadinessTwin = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const twin = await jobReadinessTwinAgent.calculateReadinessTwin(sessionId, req.user._id, {
      source: 'manual_recalculation',
    });

    return res.status(200).json({
      success: true,
      message: 'Job Readiness Twin recalculated successfully.',
      jobReadinessTwin: twin,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Generate / Retrieve Job Preparation Plan (Phase 6)
// @route   POST /api/preparations/:sessionId/preparation-plan
// @access  Private
const generatePreparationPlan = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const force = req.query.force === 'true' || req.body?.force === true;

    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Preparation session not found.' });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Auto-run prerequisites if missing
    if (session.skillGapAnalysis?.status !== 'completed') {
      try {
        const skillGapAnalysisAgent = require('../services/agents/skillGapAnalysisAgent');
        await skillGapAnalysisAgent.executeAnalysis(sessionId, req.user._id, { force: false });
      } catch (e) {
        console.warn('[PreparationController] Auto skill gap prerequisite error:', e.message);
      }
    }

    const result = await jobPreparationPlanAgent.generatePlan(sessionId, req.user._id, { force });
    const updated = await PreparationSession.findById(sessionId);

    return res.status(200).json({
      success: true,
      message: result.alreadyGenerated
        ? 'Retrieved existing Job Preparation Plan.'
        : 'Job Preparation Plan generated successfully.',
      jobPreparationPlan: updated.jobPreparationPlan,
      progress: updated.progress,
      company: updated.company,
      targetRole: updated.targetRole,
      customRole: updated.customRole,
      displayRole: updated.displayRole,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get Job Preparation Plan
// @route   GET /api/preparations/:sessionId/preparation-plan
// @access  Private
const getPreparationPlan = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Preparation session not found.' });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // If not yet generated, auto-generate it
    if (
      !session.jobPreparationPlan ||
      session.jobPreparationPlan.status === 'not_started' ||
      !session.jobPreparationPlan.roadmap?.length
    ) {
      await jobPreparationPlanAgent.generatePlan(sessionId, req.user._id, { force: false });
      const updated = await PreparationSession.findById(sessionId);
      return res.status(200).json({
        success: true,
        jobPreparationPlan: updated.jobPreparationPlan,
        progress: updated.progress,
        company: updated.company,
        targetRole: updated.targetRole,
        customRole: updated.customRole,
        displayRole: updated.displayRole,
      });
    }

    return res.status(200).json({
      success: true,
      jobPreparationPlan: session.jobPreparationPlan,
      progress: session.progress,
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole,
      displayRole: session.displayRole,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Update interactive task or checklist completion in Job Preparation Plan
// @route   PUT /api/preparations/:sessionId/preparation-plan/progress
// @access  Private
const updatePreparationPlanProgress = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await jobPreparationPlanAgent.updateProgress(sessionId, req.user._id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Preparation plan progress updated successfully.',
      ...result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Force regenerate Job Preparation Plan
// @route   POST /api/preparations/:sessionId/preparation-plan/regenerate
// @access  Private
const regeneratePreparationPlan = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await jobPreparationPlanAgent.generatePlan(sessionId, req.user._id, { force: true });
    const updated = await PreparationSession.findById(sessionId);
    return res.status(200).json({
      success: true,
      message: 'Job Preparation Plan regenerated successfully.',
      jobPreparationPlan: updated.jobPreparationPlan,
      progress: updated.progress,
      company: updated.company,
      targetRole: updated.targetRole,
      customRole: updated.customRole,
      displayRole: updated.displayRole,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get Mock Interview State
// @route   GET /api/preparations/:sessionId/mock-interview
// @access  Private
const getMockInterviewState = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await mockInterviewAgent.getInterviewState(sessionId, req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Start / Initialize Mock Interview Session
// @route   POST /api/preparations/:sessionId/mock-interview/start
// @access  Private
const startMockInterview = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await mockInterviewAgent.startInterview(sessionId, req.user._id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Submit Candidate Answer & Get Next Adaptive Question
// @route   POST /api/preparations/:sessionId/mock-interview/answer
// @access  Private
const submitMockInterviewAnswer = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { answer, transcript, durationSeconds } = req.body;
    const result = await mockInterviewAgent.submitAnswer(sessionId, req.user._id, {
      answer,
      transcript,
      durationSeconds,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Record Interview Integrity Signal
// @route   POST /api/preparations/:sessionId/mock-interview/integrity-signal
// @access  Private
const recordMockInterviewIntegritySignal = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await mockInterviewAgent.recordIntegritySignal(sessionId, req.user._id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Explicitly End Mock Interview Early
// @route   POST /api/preparations/:sessionId/mock-interview/end
// @access  Private
const endMockInterview = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await mockInterviewAgent.endInterview(sessionId, req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Dynamically recommend interview difficulty via Gemini AI
// @route   POST /api/preparations/recommend-difficulty
// @access  Private
const recommendDifficulty = async (req, res, next) => {
  try {
    const {
      company,
      companyName,
      targetRole,
      customRole,
      jobDescription,
      resumeId,
      skillGap,
    } = req.body;

    const resolvedCompany = (company || companyName || '').trim();
    const resolvedRole =
      targetRole === 'Other / Custom Role' && customRole
        ? customRole.trim()
        : (targetRole || '').trim();

    // Extract resume text if resume is available
    let resumeText = '';
    try {
      if (req.file) {
        resumeText = await resumeAnalysisAgent.extractText(
          req.file.path,
          req.file.mimetype,
          req.file.originalname
        );
      } else if (resumeId) {
        const existingResume = await Resume.findOne({
          _id: resumeId,
          userId: req.user._id,
        });
        if (existingResume && existingResume.path && fs.existsSync(existingResume.path)) {
          resumeText = await resumeAnalysisAgent.extractText(
            existingResume.path,
            existingResume.mimeType,
            existingResume.originalName
          );
        }
      }
    } catch (extractErr) {
      console.warn(
        '[preparationController] Resume text extraction error for difficulty recommendation:',
        extractErr.message
      );
    }

    let parsedSkillGaps = null;
    if (skillGap) {
      try {
        parsedSkillGaps = typeof skillGap === 'string' ? JSON.parse(skillGap) : skillGap;
      } catch (e) {
        parsedSkillGaps = skillGap;
      }
    }

    const recommendation = await mockInterviewAgent.recommendDifficulty({
      company: resolvedCompany,
      targetRole: resolvedRole,
      jobDescription: (jobDescription || '').trim(),
      resumeText,
      skillGaps: parsedSkillGaps,
    });

    return res.status(200).json(recommendation);
  } catch (error) {
    console.warn('[preparationController] recommendDifficulty error:', error.message);
    return res.status(200).json({
      success: false,
      difficulty: 'Medium',
      reason: 'AI recommendation unavailable. You can choose the difficulty manually.',
      isAiGenerated: false,
    });
  }
};

// @desc    Intelligently infer target job role from JD / Resume via Gemini AI
// @route   POST /api/preparations/infer-role
// @access  Private
const inferTargetRole = async (req, res, next) => {
  try {
    const { jobDescription, resumeId, company, companyName } = req.body;

    let resumeText = '';
    try {
      if (req.file) {
        resumeText = await resumeAnalysisAgent.extractText(
          req.file.path,
          req.file.mimetype,
          req.file.originalname
        );
      } else if (resumeId) {
        const existingResume = await Resume.findOne({
          _id: resumeId,
          userId: req.user._id,
        });
        if (existingResume && existingResume.path && fs.existsSync(existingResume.path)) {
          resumeText = await resumeAnalysisAgent.extractText(
            existingResume.path,
            existingResume.mimeType,
            existingResume.originalName
          );
        }
      }
    } catch (extractErr) {
      console.warn(
        '[preparationController] Resume text extraction error for role inference:',
        extractErr.message
      );
    }

    const result = await mockInterviewAgent.inferTargetRole({
      jobDescription: (jobDescription || '').trim(),
      resumeText,
      company: (company || companyName || '').trim(),
    });

    return res.status(200).json(result);
  } catch (error) {
    console.warn('[preparationController] inferTargetRole error:', error.message);
    return res.status(200).json({ success: false, targetRole: '' });
  }
};

module.exports = {
  createPreparation,
  getPreparations,
  getPreparationById,
  updatePreparation,
  getLatestResume,
  downloadResume,
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
};




