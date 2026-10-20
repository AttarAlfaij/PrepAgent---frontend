const mongoose = require('mongoose');

const aptitudeQuestionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: [
        'Quantitative Aptitude',
        'Logical Reasoning',
        'Verbal Ability',
        'Data Interpretation',
        'Analytical Reasoning',
      ],
      index: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Easy', 'Medium', 'Hard'],
      index: true,
    },
    question: {
      type: String,
      required: true,
    },
    chartData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    options: [
      {
        key: { type: String, required: true }, // 'A', 'B', 'C', 'D'
        text: { type: String, required: true },
      },
    ],
    correctAnswer: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
    explanation: {
      type: String,
      required: true,
    },
    solution: {
      type: String,
      required: true,
    },
    concept: {
      type: String,
      default: '',
    },
    shortcut: {
      type: String,
      default: '',
    },
    estimatedTimeSeconds: {
      type: Number,
      default: 60,
    },
    tags: {
      type: [String],
      default: [],
    },
    targetRoles: {
      type: [String],
      default: [],
    },
    isSeeded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);
