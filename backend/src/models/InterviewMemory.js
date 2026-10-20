const mongoose = require('mongoose');

const improvementLogSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    oldProficiency: {
      type: Number,
      default: 0,
    },
    newProficiency: {
      type: Number,
      default: 0,
    },
    questionAsked: {
      type: String,
      default: '',
    },
    answerScore: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const interviewMemorySchema = new mongoose.Schema(
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
      trim: true,
      default: '',
    },
    targetRole: {
      type: String,
      trim: true,
      default: '',
    },
    skill: {
      type: String,
      required: true,
      trim: true,
    },
    concept: {
      type: String,
      required: true,
      trim: true,
    },
    mistake: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    frequency: {
      type: Number,
      default: 1,
      min: 1,
    },
    firstDetected: {
      type: Date,
      default: Date.now,
    },
    lastDetected: {
      type: Date,
      default: Date.now,
    },
    lastTestedAt: {
      type: Date,
      default: null,
    },
    improvement: {
      type: String,
      enum: ['NEW', 'RECURRING', 'IMPROVING', 'RESOLVED'],
      default: 'NEW',
    },
    proficiency: {
      type: Number,
      default: 25,
      min: 0,
      max: 100,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    previousQuestionsAsked: [{ type: String }],
    improvementHistory: [improvementLogSchema],
  },
  {
    timestamps: true,
  }
);

interviewMemorySchema.index({ userId: 1, skill: 1, concept: 1 });

module.exports = mongoose.model('InterviewMemory', interviewMemorySchema);
