const mongoose = require('mongoose');
const AptitudeQuestion = require('../models/AptitudeQuestion');
const AptitudeTest = require('../models/AptitudeTest');
const AptitudeProgress = require('../models/AptitudeProgress');
const PreparationSession = require('../models/PreparationSession');
const { seedAptitudeQuestions } = require('../utils/seedAptitudeQuestions');

class AptitudeService {
  async ensureSeeded() {
    const count = await AptitudeQuestion.countDocuments();
    if (count < 52) {
      await seedAptitudeQuestions();
    }
  }

  async getOrCreateProgress(userId) {
    let progress = await AptitudeProgress.findOne({ userId });
    if (!progress) {
      progress = await AptitudeProgress.create({
        userId,
        totalAttempted: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        overallAccuracy: 0,
        averageTimePerQuestion: 0,
        streak: 0,
        lastPracticeDate: new Date(),
        totalTestsCompleted: 0,
        categoryMastery: {},
        topicMastery: {},
        weakTopics: [],
        strongTopics: [],
        recommendedNextTopics: ['Percentages', 'Number Series', 'Sentence Correction'],
        difficultyBreakdown: {
          easy: { attempted: 0, correct: 0 },
          medium: { attempted: 0, correct: 0 },
          hard: { attempted: 0, correct: 0 },
        },
      });
    }
    return progress;
  }

  getCategoriesAndTopics() {
    return [
      {
        category: 'Quantitative Aptitude',
        topics: [
          'Percentages',
          'Profit & Loss',
          'Time & Work',
          'Time, Speed & Distance',
          'Ratio & Proportion',
          'Probability',
          'Average',
          'Number System',
          'Simple Interest',
          'Compound Interest',
        ],
      },
      {
        category: 'Logical Reasoning',
        topics: [
          'Number Series',
          'Coding-Decoding',
          'Blood Relations',
          'Direction Sense',
          'Seating Arrangement',
          'Syllogisms',
          'Puzzles',
        ],
      },
      {
        category: 'Verbal Ability',
        topics: [
          'Sentence Correction',
          'Synonyms',
          'Antonyms',
          'Error Detection',
          'Reading Comprehension',
          'Vocabulary',
        ],
      },
      {
        category: 'Data Interpretation',
        topics: ['Tables', 'Pie Charts', 'Bar Graphs', 'Line Graphs'],
      },
      {
        category: 'Analytical Reasoning',
        topics: ['Logical Sequence', 'Statement & Conclusion', 'Classification'],
      },
    ];
  }

  // Calculate dynamic category question distribution from target role & requirements
  getCategoryDistribution(targetRole = '', requirements = {}) {
    const roleLower = (targetRole || '').toLowerCase();
    let weights = {
      'Quantitative Aptitude': 0.40,
      'Logical Reasoning': 0.35,
      'Verbal Ability': 0.25,
    };

    if (roleLower.includes('data') || roleLower.includes('analyst') || roleLower.includes('analytics') || roleLower.includes('bi')) {
      weights = {
        'Quantitative Aptitude': 0.35,
        'Data Interpretation': 0.25,
        'Logical Reasoning': 0.25,
        'Verbal Ability': 0.15,
      };
    } else if (roleLower.includes('product') || roleLower.includes('consult') || roleLower.includes('management') || roleLower.includes('hr')) {
      weights = {
        'Logical Reasoning': 0.35,
        'Verbal Ability': 0.35,
        'Quantitative Aptitude': 0.30,
      };
    }

    const counts = {};
    let total = 0;
    let largestCat = null;
    let maxCount = -1;

    for (const [cat, wt] of Object.entries(weights)) {
      const cnt = Math.round(wt * 20);
      counts[cat] = cnt;
      total += cnt;
      if (cnt > maxCount) {
        maxCount = cnt;
        largestCat = cat;
      }
    }

    // Ensure sum strictly equals 20
    const diff = 20 - total;
    if (diff !== 0 && largestCat) {
      counts[largestCat] += diff;
    }

    return counts;
  }

  // Question validator
  isValidQuestion(q) {
    if (!q || !q._id) return false;
    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    for (const opt of q.options) {
      if (!opt.key || !opt.text || opt.text.trim().length === 0) return false;
    }
    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) return false;
    if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length === 0) return false;
    if (!q.category || !q.topic || !q.difficulty) return false;
    return true;
  }

  async createTest({ userId, sessionId, testType = 'practice', category = 'Mixed', topic = 'All Topics', difficulty = 'Medium', questionCount = 10, durationMinutes = 15 }) {
    await this.ensureSeeded();

    const progress = await this.getOrCreateProgress(userId);

    // Personalization context from preparation session
    let targetRole = '';
    let requirements = null;
    let prioritizedTopics = [];
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      const session = await PreparationSession.findById(sessionId);
      if (session) {
        targetRole = session.targetRole || '';
        requirements = session.requirements || null;
        if (targetRole.toLowerCase().includes('backend') || targetRole.toLowerCase().includes('engineer')) {
          prioritizedTopics = ['Time & Work', 'Percentages', 'Number Series', 'Probability'];
        } else if (targetRole.toLowerCase().includes('analyst') || targetRole.toLowerCase().includes('data')) {
          prioritizedTopics = ['Tables', 'Pie Charts', 'Percentages', 'Average'];
        }
      }
    }

    // Blend user's weak topics from past performance
    if (progress.weakTopics?.length > 0) {
      prioritizedTopics = [...new Set([...prioritizedTopics, ...progress.weakTopics])];
    }

    const isAssessment = (testType === 'full_test' || questionCount === 20);
    let selected = [];
    const selectedIds = new Set();

    if (isAssessment) {
      // Standard Aptitude Assessment must contain EXACTLY 20 questions
      questionCount = 20;
      category = 'Mixed';
      topic = 'All Topics';
      durationMinutes = durationMinutes || 25;

      const distribution = this.getCategoryDistribution(targetRole, requirements);

      // Select distinct questions per category according to calculated distribution
      for (const [catName, targetCount] of Object.entries(distribution)) {
        let catCandidates = await AptitudeQuestion.find({ category: catName });
        // Filter out already selected and invalid
        catCandidates = catCandidates.filter(q => !selectedIds.has(q._id.toString()) && this.isValidQuestion(q));

        // Prioritize weak topics or role-relevant topics
        catCandidates.sort((a, b) => {
          const aPrio = prioritizedTopics.includes(a.topic) ? 1 : 0;
          const bPrio = prioritizedTopics.includes(b.topic) ? 1 : 0;
          if (bPrio !== aPrio) return bPrio - aPrio;
          return Math.random() - 0.5;
        });

        const picked = catCandidates.slice(0, targetCount);
        for (const q of picked) {
          selected.push(q);
          selectedIds.add(q._id.toString());
        }
      }

      // If any category was short, backfill from remaining valid questions
      if (selected.length < 20) {
        let allRemaining = await AptitudeQuestion.find({ _id: { $nin: Array.from(selectedIds) } });
        allRemaining = allRemaining.filter(q => this.isValidQuestion(q)).sort(() => Math.random() - 0.5);
        for (const q of allRemaining) {
          if (selected.length >= 20) break;
          selected.push(q);
          selectedIds.add(q._id.toString());
        }
      }

      // Interleave/shuffle the 20 questions so categories are nicely mixed
      selected.sort(() => Math.random() - 0.5);

      // Final strict safety check
      if (selected.length !== 20) {
        throw new Error(`Aptitude assessment requires exactly 20 valid questions, but only ${selected.length} were available`);
      }
    } else {
      // Practice mode
      const query = {};
      if (category && category !== 'Mixed') query.category = category;
      if (topic && topic !== 'All Topics') query.topic = topic;
      if (difficulty && difficulty !== 'Adaptive' && difficulty !== 'Mixed') query.difficulty = difficulty;

      let candidates = await AptitudeQuestion.find(query);
      candidates = candidates.filter(q => this.isValidQuestion(q));

      if (candidates.length < questionCount) {
        const fallbackQuery = {};
        if (category && category !== 'Mixed') fallbackQuery.category = category;
        const moreCandidates = await AptitudeQuestion.find(fallbackQuery);
        for (const mc of moreCandidates) {
          if (this.isValidQuestion(mc) && !candidates.some(c => c._id.toString() === mc._id.toString())) {
            candidates.push(mc);
          }
        }
      }

      if (candidates.length === 0) {
        candidates = await AptitudeQuestion.find();
        candidates = candidates.filter(q => this.isValidQuestion(q));
      }

      candidates.sort((a, b) => {
        const aPrio = prioritizedTopics.includes(a.topic) ? 1 : 0;
        const bPrio = prioritizedTopics.includes(b.topic) ? 1 : 0;
        if (bPrio !== aPrio) return bPrio - aPrio;
        return Math.random() - 0.5;
      });

      selected = candidates.slice(0, questionCount);
    }

    // Build test document questions (storing answer secretly on server)
    const testQuestions = selected.map((q) => ({
      questionId: q._id,
      questionText: q.question,
      chartData: q.chartData || null,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty,
      options: q.options,
      userAnswer: null,
      correctAnswer: q.correctAnswer,
      isCorrect: null,
      timeTakenSeconds: 0,
      explanation: q.explanation,
      solution: q.solution,
      concept: q.concept,
      shortcut: q.shortcut,
      markedForReview: false,
    }));

    const test = await AptitudeTest.create({
      userId,
      sessionId: sessionId && mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : null,
      testType,
      category,
      topic,
      difficulty,
      totalQuestions: testQuestions.length,
      durationMinutes,
      startTime: new Date(),
      status: 'in_progress',
      questions: testQuestions,
    });

    // Return sanitized questions (STRIP correct answers during test mode!)
    const sanitizedQuestions = test.questions.map((q, idx) => ({
      index: idx,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.questionText,
      chartData: q.chartData,
      options: q.options,
      userAnswer: q.userAnswer,
      markedForReview: q.markedForReview,
    }));

    return {
      testId: test._id,
      testType: test.testType,
      category: test.category,
      topic: test.topic,
      difficulty: test.difficulty,
      totalQuestions: test.totalQuestions,
      durationMinutes: test.durationMinutes,
      startTime: test.startTime,
      questions: sanitizedQuestions,
    };
  }

  async recordAnswer({ testId, userId, questionIndex, userAnswer, timeTakenSeconds, markedForReview }) {
    const test = await AptitudeTest.findOne({ _id: testId, userId });
    if (!test) throw new Error('Test session not found');
    if (test.status !== 'in_progress') throw new Error('Test is no longer active');

    if (test.questions[questionIndex]) {
      if (userAnswer !== undefined) test.questions[questionIndex].userAnswer = userAnswer;
      if (timeTakenSeconds !== undefined) test.questions[questionIndex].timeTakenSeconds = timeTakenSeconds;
      if (markedForReview !== undefined) test.questions[questionIndex].markedForReview = markedForReview;
    }

    await test.save();
    return { success: true, questionIndex, savedAnswer: userAnswer };
  }

  async submitTest({ testId, userId }) {
    const test = await AptitudeTest.findOne({ _id: testId, userId });
    if (!test) throw new Error('Test session not found');

    let correctCount = 0;
    let totalTimeTaken = 0;
    const categoryStats = new Map();
    const topicStats = new Map();

    test.questions.forEach((q) => {
      const isCorrect = q.userAnswer === q.correctAnswer;
      q.isCorrect = isCorrect;
      if (isCorrect) correctCount++;
      totalTimeTaken += q.timeTakenSeconds || 0;

      // Category breakdown
      const cStat = categoryStats.get(q.category) || { total: 0, correct: 0 };
      cStat.total += 1;
      if (isCorrect) cStat.correct += 1;
      categoryStats.set(q.category, cStat);

      // Topic breakdown
      const tStat = topicStats.get(q.topic) || { total: 0, correct: 0 };
      tStat.total += 1;
      if (isCorrect) tStat.correct += 1;
      topicStats.set(q.topic, tStat);
    });

    test.score = correctCount;
    test.accuracy = Math.round((correctCount / test.totalQuestions) * 100);
    test.totalTimeTakenSeconds = totalTimeTaken;
    test.status = 'completed';
    test.endTime = new Date();

    // Compute category breakdown with accuracy %
    const formattedCategoryMap = {};
    for (const [cat, data] of categoryStats.entries()) {
      formattedCategoryMap[cat] = {
        total: data.total,
        correct: data.correct,
        accuracy: Math.round((data.correct / data.total) * 100),
      };
    }
    test.categoryBreakdown = formattedCategoryMap;

    // Compute topic breakdown with accuracy %
    const formattedTopicMap = {};
    const weakList = [];
    const strongList = [];
    const recommendations = [];

    for (const [top, data] of topicStats.entries()) {
      const acc = Math.round((data.correct / data.total) * 100);
      formattedTopicMap[top] = {
        total: data.total,
        correct: data.correct,
        accuracy: acc,
      };

      if (acc < 65) {
        weakList.push(top);
        recommendations.push({
          topic: top,
          priority: acc < 50 ? 'High Priority' : 'Needs Practice',
          accuracy: acc,
          reason: `Accuracy is ${acc}%. Practice foundational formulas and shortcuts.`,
        });
      } else if (acc >= 80) {
        strongList.push(top);
      }
    }

    test.topicBreakdown = formattedTopicMap;
    test.weakAreas = weakList;
    test.strongAreas = strongList;
    test.recommendations = recommendations;

    await test.save();

    // Update user's persistent AptitudeProgress
    const progress = await this.getOrCreateProgress(userId);
    progress.totalAttempted += test.totalQuestions;
    progress.totalCorrect += correctCount;
    progress.totalIncorrect += test.totalQuestions - correctCount;
    progress.totalTestsCompleted += 1;
    progress.overallAccuracy = Math.round((progress.totalCorrect / progress.totalAttempted) * 100);
    progress.averageTimePerQuestion = Math.round(
      (progress.averageTimePerQuestion * (progress.totalAttempted - test.totalQuestions) + totalTimeTaken) /
        progress.totalAttempted
    );

    // Update streak
    const now = new Date();
    const lastActive = progress.lastPracticeDate ? new Date(progress.lastPracticeDate) : null;
    const oneDay = 24 * 60 * 60 * 1000;

    if (!progress.streak || progress.streak === 0) {
      progress.streak = 1;
    } else if (lastActive && now.toDateString() !== lastActive.toDateString()) {
      const diffDays = Math.round((now - lastActive) / oneDay);
      if (diffDays <= 1) {
        progress.streak += 1;
      } else {
        progress.streak = 1;
      }
    }
    progress.lastPracticeDate = now;

    // Update topic mastery
    for (const [top, data] of topicStats.entries()) {
      const current = progress.topicMastery.get(top) || { attempted: 0, correct: 0, accuracy: 0 };
      current.attempted += data.total;
      current.correct += data.correct;
      current.accuracy = Math.round((current.correct / current.attempted) * 100);
      progress.topicMastery.set(top, current);
    }

    // Refresh weak and strong topics on profile
    const allMastered = Array.from(progress.topicMastery.entries());
    progress.weakTopics = allMastered.filter(([_, d]) => d.attempted >= 2 && d.accuracy < 65).map(([t]) => t);
    progress.strongTopics = allMastered.filter(([_, d]) => d.attempted >= 2 && d.accuracy >= 80).map(([t]) => t);

    if (weakList.length > 0) {
      progress.recommendedNextTopics = weakList.slice(0, 3);
    }

    await progress.save();

    return test;
  }

  async getTestResult(testId, userId) {
    const test = await AptitudeTest.findOne({ _id: testId, userId });
    if (!test) throw new Error('Test not found');
    return test;
  }

  async getUserHistory(userId, limit = 20) {
    return AptitudeTest.find({ userId, status: 'completed' })
      .select('testType category topic difficulty totalQuestions score accuracy totalTimeTakenSeconds createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getUserProgress(userId, sessionId) {
    await this.ensureSeeded();

    const progress = await this.getOrCreateProgress(userId);

    let targetRole = '';
    let roleAptitudePriorities = ['Quantitative Aptitude', 'Logical Reasoning'];

    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      const session = await PreparationSession.findById(sessionId);
      if (session) {
        targetRole = session.targetRole || '';
        if (targetRole.toLowerCase().includes('data') || targetRole.toLowerCase().includes('analyst')) {
          roleAptitudePriorities = ['Data Interpretation', 'Quantitative Aptitude', 'Logical Reasoning'];
        } else if (targetRole.toLowerCase().includes('product') || targetRole.toLowerCase().includes('consultant')) {
          roleAptitudePriorities = ['Logical Reasoning', 'Verbal Ability', 'Data Interpretation'];
        }
      }
    }

    // Build category stats and topic mastery list
    const categories = this.getCategoriesAndTopics();
    const topicMasteryList = [];
    const categoryStats = [];

    for (const cat of categories) {
      let catAttempted = 0;
      let catCorrect = 0;
      for (const t of cat.topics) {
        const stat = progress.topicMastery.get(t);
        const att = stat?.attempted || 0;
        const cor = stat?.correct || 0;
        catAttempted += att;
        catCorrect += cor;
        topicMasteryList.push({
          category: cat.category,
          topic: t,
          attempted: att,
          correct: cor,
          accuracy: stat?.accuracy || 0,
        });
      }
      categoryStats.push({
        category: cat.category,
        topicsCount: cat.topics.length,
        attempted: catAttempted,
        correct: catCorrect,
        accuracy: catAttempted > 0 ? Math.round((catCorrect / catAttempted) * 100) : 0,
        hasHistory: catAttempted > 0,
      });
    }

    const distribution = this.getCategoryDistribution(targetRole, null);
    const preparationRequirements = [
      {
        priority: 'HIGH PRIORITY',
        level: 'high',
        category: roleAptitudePriorities[0] || 'Quantitative Aptitude',
        targetWeight: distribution[roleAptitudePriorities[0]] ? `${Math.round((distribution[roleAptitudePriorities[0]] / 20) * 100)}%` : '40%',
      },
      {
        priority: 'MEDIUM',
        level: 'medium',
        category: roleAptitudePriorities[1] || 'Logical Reasoning',
        targetWeight: distribution[roleAptitudePriorities[1]] ? `${Math.round((distribution[roleAptitudePriorities[1]] / 20) * 100)}%` : '35%',
      },
      {
        priority: 'LOW',
        level: 'low',
        category: roleAptitudePriorities[2] || (roleAptitudePriorities.includes('Verbal Ability') ? 'Data Interpretation' : 'Verbal Ability'),
        targetWeight: '25%',
      },
    ];

    return {
      stats: {
        overallScore: progress.overallAccuracy,
        overallAccuracy: progress.overallAccuracy,
        totalAttempted: progress.totalAttempted,
        totalCorrect: progress.totalCorrect,
        averageTimePerQuestion: progress.averageTimePerQuestion || 45,
        currentStreak: progress.streak || 0,
        totalTestsCompleted: progress.totalTestsCompleted,
      },
      categoryStats,
      preparationRequirements,
      topicMastery: topicMasteryList,
      weakTopics: progress.weakTopics,
      strongTopics: progress.strongTopics,
      recommendedNextTopics: progress.recommendedNextTopics,
      roleContext: {
        targetRole: targetRole || 'Software Engineer',
        priorities: roleAptitudePriorities,
      },
    };
  }
}

module.exports = new AptitudeService();
