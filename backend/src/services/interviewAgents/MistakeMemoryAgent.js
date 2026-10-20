const InterviewMemory = require('../../models/InterviewMemory');

/**
 * MistakeMemoryAgent (Section 18)
 * Manages persistent mistake/progress tracking across interviews in MongoDB.
 * Tracks mistake frequency, firstDetected, lastDetected, improvement, proficiency, and related skill.
 */
class MistakeMemoryAgent {
  /**
   * Fetch existing mistake memory records for a candidate
   */
  async getCandidateMistakes(userId, limit = 25) {
    if (!userId) return [];
    const memories = await InterviewMemory.find({ userId })
      .sort({ resolved: 1, frequency: -1, lastDetected: -1 })
      .limit(limit)
      .lean();
    return memories;
  }

  /**
   * Process evaluation results after an answer and update persistent InterviewMemory
   */
  async updateMemoryFromEvaluation({
    userId,
    interviewId,
    preparationSessionId,
    companyName,
    targetRole,
    currentQuestion,
    evaluation,
  }) {
    const updatedMemories = [];
    const questionTopic = (currentQuestion?.topic || 'General').trim();
    const score = Number(evaluation?.overallScore || 0);

    // 1. Check if this question was testing a previous mistake memory (by ID or matching concept/skill)
    let matchedMemory = null;
    if (currentQuestion?.targetMemoryId) {
      matchedMemory = await InterviewMemory.findOne({
        _id: currentQuestion.targetMemoryId,
        userId,
      });
    }

    if (!matchedMemory && questionTopic) {
      matchedMemory = await InterviewMemory.findOne({
        userId,
        resolved: false,
        $or: [
          { concept: new RegExp(`^${questionTopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { skill: new RegExp(`^${questionTopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      });
    }

    if (matchedMemory) {
      const oldProficiency = matchedMemory.proficiency || 30;
      let newProficiency = oldProficiency;
      let improvementState = matchedMemory.improvement;

      if (score >= 75) {
        newProficiency = Math.min(100, Math.round(oldProficiency * 0.4 + score * 0.6 + 10));
        improvementState = newProficiency >= 80 ? 'RESOLVED' : 'IMPROVING';
      } else if (score >= 60) {
        newProficiency = Math.min(95, Math.round(oldProficiency * 0.5 + score * 0.5 + 4));
        improvementState = 'IMPROVING';
      } else {
        newProficiency = Math.max(15, Math.round(oldProficiency * 0.6 + score * 0.4 - 5));
        improvementState = 'RECURRING';
        matchedMemory.frequency = (matchedMemory.frequency || 1) + 1;
        matchedMemory.lastDetected = new Date();
      }

      matchedMemory.proficiency = newProficiency;
      matchedMemory.improvement = improvementState;
      matchedMemory.resolved = improvementState === 'RESOLVED';
      matchedMemory.lastTestedAt = new Date();
      if (currentQuestion?.question) {
        matchedMemory.previousQuestionsAsked = [
          ...new Set([...(matchedMemory.previousQuestionsAsked || []), currentQuestion.question]),
        ].slice(-8);
      }
      matchedMemory.improvementHistory.push({
        interviewId,
        date: new Date(),
        oldProficiency,
        newProficiency,
        questionAsked: currentQuestion?.question || '',
        answerScore: score,
        notes:
          score >= 70
            ? `Demonstrated clear improvement on ${matchedMemory.concept} (score: ${score}%).`
            : `Still struggled with ${matchedMemory.concept} (score: ${score}%).`,
      });

      await matchedMemory.save();
      updatedMemories.push(matchedMemory.toObject());
    }

    // 2. Record any newly detected mistakes from this evaluation
    const detectedMistakes = Array.isArray(evaluation?.mistakes) ? evaluation.mistakes : [];
    for (const mistakeItem of detectedMistakes) {
      const conceptName = (mistakeItem.concept || questionTopic || 'Core Concept').trim();
      const skillName = (mistakeItem.relatedSkill || questionTopic || targetRole || 'Technical Skill').trim();
      const description = (mistakeItem.description || `Incomplete understanding of ${conceptName}`).trim();

      const existing = await InterviewMemory.findOne({
        userId,
        concept: new RegExp(`^${conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });

      if (existing) {
        // Avoid double-updating if already updated above as matchedMemory
        if (matchedMemory && String(existing._id) === String(matchedMemory._id)) {
          continue;
        }
        const oldProf = existing.proficiency || 35;
        const newProf = Math.max(10, Math.round(oldProf * 0.65 + Math.min(score, 55) * 0.35));
        existing.frequency = (existing.frequency || 1) + 1;
        existing.lastDetected = new Date();
        existing.mistake = description;
        existing.severity = mistakeItem.severity || existing.severity || 'MEDIUM';
        existing.proficiency = newProf;
        existing.improvement = 'RECURRING';
        existing.resolved = false;
        if (currentQuestion?.question) {
          existing.previousQuestionsAsked = [
            ...new Set([...(existing.previousQuestionsAsked || []), currentQuestion.question]),
          ].slice(-8);
        }
        existing.improvementHistory.push({
          interviewId,
          date: new Date(),
          oldProficiency: oldProf,
          newProficiency: newProf,
          questionAsked: currentQuestion?.question || '',
          answerScore: score,
          notes: `Recurring mistake detected: ${description}`,
        });
        await existing.save();
        updatedMemories.push(existing.toObject());
      } else {
        const initialProficiency = Math.max(20, Math.min(55, score || 35));
        const created = await InterviewMemory.create({
          userId,
          preparationSessionId: preparationSessionId || null,
          companyName: companyName || '',
          targetRole: targetRole || '',
          skill: skillName,
          concept: conceptName,
          mistake: description,
          severity: ['LOW', 'MEDIUM', 'HIGH'].includes(mistakeItem.severity) ? mistakeItem.severity : 'MEDIUM',
          frequency: 1,
          firstDetected: new Date(),
          lastDetected: new Date(),
          lastTestedAt: new Date(),
          improvement: 'NEW',
          proficiency: initialProficiency,
          resolved: false,
          previousQuestionsAsked: currentQuestion?.question ? [currentQuestion.question] : [],
          improvementHistory: [
            {
              interviewId,
              date: new Date(),
              oldProficiency: 50,
              newProficiency: initialProficiency,
              questionAsked: currentQuestion?.question || '',
              answerScore: score,
              notes: `First detected weakness: ${description}`,
            },
          ],
        });
        updatedMemories.push(created.toObject());
      }
    }

    return updatedMemories;
  }
}

module.exports = new MistakeMemoryAgent();
