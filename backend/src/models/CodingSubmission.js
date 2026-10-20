const mongoose = require('mongoose');

const codingSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingProblem',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PreparationSession',
      default: null,
      index: true,
    },
    language: {
      type: String,
      required: true,
      enum: ['python', 'javascript', 'java', 'cpp'],
    },
    code: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'Accepted',
        'Wrong Answer',
        'Time Limit Exceeded',
        'Runtime Error',
        'Compilation Error',
      ],
      index: true,
    },
    passedTestCases: {
      type: Number,
      default: 0,
    },
    totalTestCases: {
      type: Number,
      default: 0,
    },
    runtimeMs: {
      type: Number,
      default: 0,
    },
    memoryKb: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    failedTestCase: {
      input: { type: String, default: '' },
      expectedOutput: { type: String, default: '' },
      actualOutput: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CodingSubmission', codingSubmissionSchema);
