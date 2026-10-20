const mongoose = require('mongoose');

const interviewQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'TECHNICAL',
        'HR',
        'BEHAVIORAL',
        'RESUME_BASED',
        'CODING',
        'SCENARIO',
        'FOLLOW_UP',
        'DEEP_DIVE',
        'INTRODUCTION',
      ],
      default: 'TECHNICAL',
    },
    strategyUsed: {
      type: String,
      default: 'INITIAL',
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM',
    },
    topic: {
      type: String,
      default: 'General',
    },
    source: {
      type: String,
      default: 'Agentic Generation',
    },
    reason: {
      type: String,
      default: '',
    },
    hint: {
      type: String,
      default: 'Take your time. Start by breaking the problem down into its core components or sharing your practical approach.',
    },
    targetMemoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewMemory',
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    transcription: {
      type: String,
      default: '',
    },
    answerMode: {
      type: String,
      enum: ['voice', 'text'],
      default: 'voice',
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    silenceDetected: {
      type: Boolean,
      default: false,
    },
    hintUsed: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      default: 'TECHNICAL',
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM',
    },
    topic: {
      type: String,
      default: 'General',
    },
    answer: {
      type: String,
      default: '',
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    technicalAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    relevance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completeness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    problemSolving: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    communication: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    resumeUnderstanding: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    behavioralEvaluation: {
      situationClarity: { type: Number, default: 0 },
      actionTaken: { type: Number, default: 0 },
      resultImpact: { type: Number, default: 0 },
      ownership: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },
    confidenceIndicators: {
      clarityLevel: { type: String, default: 'Moderate' },
      structureQuality: { type: String, default: 'Structured' },
      conciseness: { type: String, default: 'Balanced' },
      observableSignals: [{ type: String }],
      score: { type: Number, default: 70 },
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    mistakes: [
      {
        concept: { type: String, default: '' },
        description: { type: String, default: '' },
        severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
        relatedSkill: { type: String, default: '' },
      },
    ],
    missingConcepts: [{ type: String }],
    expectedConcepts: [{ type: String }],
    aiFeedback: {
      type: String,
      default: '',
    },
    followUpRecommendation: {
      type: String,
      enum: [
        'FOLLOW_UP',
        'SIMPLIFY',
        'INCREASE_DIFFICULTY',
        'SWITCH_TOPIC',
        'RESUME_BASED',
        'TECHNICAL',
        'CODING',
        'BEHAVIORAL',
        'HR',
        'SCENARIO',
        'DEEP_DIVE',
      ],
      default: 'SWITCH_TOPIC',
    },
    avatarReaction: {
      type: String,
      enum: ['IDLE', 'SPEAKING', 'LISTENING', 'THINKING', 'ENCOURAGING', 'CONCERNED', 'COMPLETED'],
      default: 'LISTENING',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    preparationSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PreparationSession',
      default: null,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
    },
    interviewType: {
      type: String,
      enum: ['Technical', 'HR', 'Mixed'],
      required: true,
      default: 'Mixed',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      // Automatically computed target duration in seconds
      type: Number,
      default: 1200,
    },
    durationReasoning: {
      type: String,
      default: '',
    },
    elapsedSeconds: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 10,
      min: 1,
      max: 20,
    },
    status: {
      type: String,
      enum: ['INITIALIZING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    currentStage: {
      type: String,
      default: 'INTRODUCTION',
    },
    currentDifficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM',
    },
    avatarState: {
      type: String,
      enum: ['IDLE', 'SPEAKING', 'LISTENING', 'THINKING', 'ENCOURAGING', 'CONCERNED', 'COMPLETED'],
      default: 'SPEAKING',
    },
    currentQuestion: {
      type: interviewQuestionSchema,
      default: null,
    },
    questions: [interviewQuestionSchema],
    answers: [answerSchema],
    evaluations: [evaluationSchema],
    coveredTopics: [{ type: String }],
    uncoveredTopics: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    mistakes: [{ type: mongoose.Schema.Types.Mixed }],
    consecutiveStrongAnswers: {
      type: Number,
      default: 0,
    },
    consecutiveWeakAnswers: {
      type: Number,
      default: 0,
    },
    contextSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    agentDecisionHistory: [
      {
        step: { type: Number },
        decision: { type: String },
        difficulty: { type: String },
        targetTopic: { type: String },
        reason: { type: String },
        terminationDecision: { type: String, enum: ['CONTINUE', 'END_INTERVIEW'], default: 'CONTINUE' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    finalReport: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    identityVerification: {
      status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'FAILED', 'NOT_APPLICABLE'],
        default: 'PENDING',
      },
      method: {
        type: String,
        default: 'BROWSER_FACIAL_DESCRIPTOR',
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      confidenceScore: {
        type: Number,
        default: 0,
      },
    },
    livenessVerification: {
      status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'FAILED'],
        default: 'PENDING',
      },
      method: {
        type: String,
        default: 'MULTI_SIGNAL_CHALLENGE',
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      signalsDetected: [{ type: String }],
    },
    monitoringIncidents: [
      {
        incidentId: { type: String },
        type: {
          type: String,
          enum: [
            'CAMERA_DISCONNECTED',
            'MICROPHONE_DISCONNECTED',
            'NETWORK_UNSTABLE',
            'NETWORK_DISCONNECTED',
            'FACE_NOT_DETECTED',
            'MULTIPLE_PERSONS_DETECTED',
            'INTERVIEW_PAGE_HIDDEN',
            'LIVENESS_CHECK_FAILED',
            'IDENTITY_VERIFICATION_FAILED',
            'FACE_TURNED_AWAY',
            'BROWSER_UNSUPPORTED',
          ],
        },
        timestamp: { type: Date, default: Date.now },
        duration: { type: Number, default: 0 },
        severity: { type: String, enum: ['minor', 'warning', 'critical'], default: 'warning' },
        resolved: { type: Boolean, default: true },
        details: { type: String, default: '' },
      },
    ],
    environmentSummary: {
      cameraRemainedConnected: { type: Boolean, default: true },
      microphoneRemainedAvailable: { type: Boolean, default: true },
      networkRemainedConnected: { type: Boolean, default: true },
      onePersonEnvironmentMaintained: { type: Boolean, default: true },
      identityVerificationCompleted: { type: Boolean, default: true },
      livenessVerificationCompleted: { type: Boolean, default: true },
      totalWarningsCount: { type: Number, default: 0 },
      totalWarningDurationSeconds: { type: Number, default: 0 },
      eventsSummary: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Interview', interviewSchema);
