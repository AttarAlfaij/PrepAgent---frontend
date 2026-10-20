const mongoose = require('mongoose');

const aptitudeProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalAttempted: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalIncorrect: {
      type: Number,
      default: 0,
    },
    overallAccuracy: {
      type: Number,
      default: 0,
    },
    averageTimePerQuestion: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastPracticeDate: {
      type: Date,
      default: Date.now,
    },
    totalTestsCompleted: {
      type: Number,
      default: 0,
    },
    categoryMastery: {
      type: Map,
      of: new mongoose.Schema(
        {
          attempted: { type: Number, default: 0 },
          correct: { type: Number, default: 0 },
          accuracy: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },
    topicMastery: {
      type: Map,
      of: new mongoose.Schema(
        {
          attempted: { type: Number, default: 0 },
          correct: { type: Number, default: 0 },
          accuracy: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    strongTopics: {
      type: [String],
      default: [],
    },
    recommendedNextTopics: {
      type: [String],
      default: [],
    },
    difficultyBreakdown: {
      easy: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
      },
      medium: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
      },
      hard: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AptitudeProgress', aptitudeProgressSchema);
