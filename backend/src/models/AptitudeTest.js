const mongoose = require('mongoose');

const aptitudeTestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PreparationSession',
      default: null,
      index: true,
    },
    testType: {
      type: String,
      enum: ['full_test', 'practice', 'adaptive', 'quick_quiz'],
      default: 'practice',
    },
    category: {
      type: String,
      default: 'Mixed',
    },
    topic: {
      type: String,
      default: 'All Topics',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Adaptive', 'Mixed'],
      default: 'Medium',
    },
    totalQuestions: {
      type: Number,
      required: true,
      default: 10,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 15,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'timed_out', 'abandoned'],
      default: 'in_progress',
      index: true,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AptitudeQuestion',
        },
        questionText: { type: String, required: true },
        chartData: { type: mongoose.Schema.Types.Mixed, default: null },
        category: { type: String, required: true },
        topic: { type: String, required: true },
        difficulty: { type: String, required: true },
        options: [
          {
            key: { type: String, required: true },
            text: { type: String, required: true },
          },
        ],
        userAnswer: { type: String, default: null }, // 'A', 'B', 'C', 'D'
        correctAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, default: null },
        timeTakenSeconds: { type: Number, default: 0 },
        explanation: { type: String, default: '' },
        solution: { type: String, default: '' },
        concept: { type: String, default: '' },
        shortcut: { type: String, default: '' },
        markedForReview: { type: Boolean, default: false },
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    totalTimeTakenSeconds: {
      type: Number,
      default: 0,
    },
    categoryBreakdown: {
      type: Map,
      of: new mongoose.Schema(
        {
          total: { type: Number, default: 0 },
          correct: { type: Number, default: 0 },
          accuracy: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },
    topicBreakdown: {
      type: Map,
      of: new mongoose.Schema(
        {
          total: { type: Number, default: 0 },
          correct: { type: Number, default: 0 },
          accuracy: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },
    weakAreas: {
      type: [String],
      default: [],
    },
    strongAreas: {
      type: [String],
      default: [],
    },
    recommendations: [
      {
        topic: { type: String, required: true },
        priority: { type: String, default: 'Needs Practice' },
        accuracy: { type: Number, default: 0 },
        reason: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AptitudeTest', aptitudeTestSchema);
