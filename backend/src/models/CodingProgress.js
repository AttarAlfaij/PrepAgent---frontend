const mongoose = require('mongoose');

const codingProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    solvedProblemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingProblem',
      },
    ],
    attemptedProblemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingProblem',
      },
    ],
    streak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: Date.now,
    },
    easySolved: {
      type: Number,
      default: 0,
    },
    mediumSolved: {
      type: Number,
      default: 0,
    },
    hardSolved: {
      type: Number,
      default: 0,
    },
    topicStats: {
      type: Map,
      of: new mongoose.Schema(
        {
          solved: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CodingProgress', codingProgressSchema);
