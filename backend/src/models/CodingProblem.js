const mongoose = require('mongoose');

const codingProblemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      index: true,
    },
    order: {
      type: Number,
      default: 1,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      index: true,
    },
    topics: {
      type: [String],
      required: true,
      index: true,
    },
    targetRoles: {
      type: [String],
      default: [],
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    examples: [
      {
        input: { type: String, required: true },
        output: { type: String, required: true },
        explanation: { type: String, default: '' },
      },
    ],
    constraints: {
      type: [String],
      default: [],
    },
    sampleTestCases: [
      {
        input: { type: String, required: true },
        expectedOutput: { type: String, required: true },
        explanation: { type: String, default: '' },
      },
    ],
    hiddenTestCases: [
      {
        input: { type: String, required: true },
        expectedOutput: { type: String, required: true },
      },
    ],
    functionName: {
      type: String,
      required: true,
      default: 'solution',
    },
    returnType: {
      type: String,
      default: 'any',
    },
    starterTemplates: {
      python: { type: String, default: '' },
      javascript: { type: String, default: '' },
      java: { type: String, default: '' },
      cpp: { type: String, default: '' },
    },
    acceptanceRate: {
      type: Number,
      default: 75.0,
    },
    hints: {
      type: [String],
      default: [],
    },
    conceptExplanation: {
      type: String,
      default: '',
    },
    timeComplexity: {
      type: String,
      default: 'O(n)',
    },
    spaceComplexity: {
      type: String,
      default: 'O(n)',
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CodingProblem', codingProblemSchema);
