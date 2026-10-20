const mongoose = require('mongoose');

const companyInterviewKnowledgeSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedCompany: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedRole: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    commonTopics: [{ type: String }],
    frequentlyTestedSkills: [{ type: String }],
    interviewRounds: [
      {
        roundName: { type: String },
        focus: { type: String },
        typicalDifficulty: { type: String, default: 'MEDIUM' },
      },
    ],
    technicalAreas: [{ type: String }],
    hrThemes: [{ type: String }],
    codingPatterns: [{ type: String }],
    commonBehavioralThemes: [{ type: String }],
    difficultyProfile: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM',
    },
    evaluationFocus: [{ type: String }],
    internalExperiencesCount: {
      type: Number,
      default: 0,
    },
    observedWeaknessPatterns: [{ type: String }],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

companyInterviewKnowledgeSchema.index({ normalizedCompany: 1, normalizedRole: 1 }, { unique: true });

module.exports = mongoose.model('CompanyInterviewKnowledge', companyInterviewKnowledgeSchema);
