const geminiClient = require('./geminiClient');

/**
 * NextQuestionDecisionAgent (Sections 6, 7, 15, 16)
 * Autonomous decision-making agent that:
 * 1. Evaluates whether sufficient coverage has been achieved (CONTINUE vs END_INTERVIEW)
 * 2. Dynamically regulates difficulty (EASY, MEDIUM, HARD)
 * 3. Selects the next interrogation strategy (FOLLOW_UP, SIMPLIFY, INCREASE_DIFFICULTY,
 *    SWITCH_TOPIC, RESUME_BASED, TECHNICAL, CODING, BEHAVIORAL, HR, SCENARIO, DEEP_DIVE)
 */
class NextQuestionDecisionAgent {
  async decideNextAction({
    interview,
    latestEvaluation,
    candidateMistakes,
  }) {
    const questionsAskedCount = (interview.questions || []).length;
    const evaluations = interview.evaluations || [];
    const elapsedSeconds = Number(interview.elapsedSeconds || 0);
    const plannedDuration = Number(interview.duration || 1200);
    const timeRatio = plannedDuration > 0 ? elapsedSeconds / plannedDuration : 0;

    const coveredTopics = interview.coveredTopics || [];
    const uncoveredTopics = interview.uncoveredTopics || [];
    const totalTargetTopics = coveredTopics.length + uncoveredTopics.length;
    const coverageRatio = totalTargetTopics > 0 ? coveredTopics.length / totalTargetTopics : 0.5;

    // Update consecutive performance counters
    const latestScore = Number(latestEvaluation?.overallScore || 65);
    const consecutiveStrong =
      latestScore >= 75 ? (interview.consecutiveStrongAnswers || 0) + 1 : 0;
    const consecutiveWeak =
      latestScore < 52 ? (interview.consecutiveWeakAnswers || 0) + 1 : 0;

    // Check coverage across resume, technical, and behavioral
    const hasResumeQuestion = (interview.questions || []).some((q) => q.type === 'RESUME_BASED');
    const hasBehavioralQuestion = (interview.questions || []).some((q) =>
      ['BEHAVIORAL', 'HR'].includes(q.type)
    );
    const hasTechnicalOrCoding = (interview.questions || []).some((q) =>
      ['TECHNICAL', 'CODING', 'DEEP_DIVE', 'SCENARIO'].includes(q.type)
    );

    // Determine if termination criteria are met
    const targetTotalQuestions =
      Number(interview.totalQuestions) || (interview.interviewType === 'Mixed' ? 6 : 5);
    const minMeaningfulQuestions = Math.min(targetTotalQuestions, 5);
    const timeExpired = elapsedSeconds >= plannedDuration;
    const sufficientCoverageAchieved =
      questionsAskedCount >= targetTotalQuestions;

    if (timeExpired || sufficientCoverageAchieved) {
      return {
        terminationDecision: 'END_INTERVIEW',
        decision: 'END_INTERVIEW',
        nextDifficulty: interview.currentDifficulty || 'MEDIUM',
        nextStage: 'COMPLETED',
        targetTopic: 'Complete',
        reason: timeExpired
          ? 'Interview duration completed with sufficient evaluation evidence gathered across key role dimensions.'
          : 'Sufficient topic, skill-gap, and resume coverage achieved to generate a comprehensive evaluation.',
        consecutiveStrongAnswers: consecutiveStrong,
        consecutiveWeakAnswers: consecutiveWeak,
      };
    }

    // Check if there is an unverified past mistake from InterviewMemory to retest with a different question
    const askedTopicsLower = coveredTopics.map((t) => t.toLowerCase());
    const unverifiedPastMistake = (candidateMistakes || []).find(
      (m) =>
        !m.resolved &&
        m.concept &&
        !askedTopicsLower.includes(m.concept.toLowerCase()) &&
        !(interview.questions || []).some(
          (q) => String(q.targetMemoryId || '') === String(m._id || '')
        )
    );

    // Calculate adaptive difficulty baseline before AI refinement
    let computedDifficulty = interview.currentDifficulty || 'MEDIUM';
    if (consecutiveWeak >= 1 && latestScore < 48) {
      computedDifficulty = computedDifficulty === 'HARD' ? 'MEDIUM' : 'EASY';
    } else if (consecutiveStrong >= 2 && latestScore >= 78) {
      computedDifficulty = computedDifficulty === 'EASY' ? 'MEDIUM' : 'HARD';
    } else if (latestScore >= 72 && computedDifficulty === 'EASY') {
      computedDifficulty = 'MEDIUM';
    }

    const systemInstruction = `You are the Next Question Decision Agent & Termination Evaluator for PrepAgent AI.
Your job is to observe the candidate's latest evaluation, interview history, resume projects, skill gaps, and uncovered topics, and decide:
1. Whether to CONTINUE or END_INTERVIEW (only END_INTERVIEW if comprehensive coverage is achieved and at least ${minMeaningfulQuestions} questions have been answered).
2. Which strategy to execute next from:
   FOLLOW_UP, SIMPLIFY, INCREASE_DIFFICULTY, SWITCH_TOPIC, RESUME_BASED, TECHNICAL, CODING, BEHAVIORAL, HR, SCENARIO, DEEP_DIVE
3. What difficulty level (EASY, MEDIUM, HARD) is appropriate next.
4. Which specific topic, project, or skill to target next and why.
Return strictly valid JSON.`;

    const userPrompt = `Current Interview Context:
Company: "${interview.companyName}"
Target Role: "${interview.targetRole}"
Primary Interview Type: "${interview.interviewType}"
Questions Answered So Far: ${questionsAskedCount}
Elapsed Time: ${elapsedSeconds}s / ${plannedDuration}s
Current Difficulty: "${interview.currentDifficulty}"
Consecutive Strong Answers: ${consecutiveStrong}
Consecutive Weak Answers: ${consecutiveWeak}
Covered Topics: ${JSON.stringify(coveredTopics)}
Uncovered Priority Topics: ${JSON.stringify(uncoveredTopics)}
Has Asked Resume Question Yet: ${hasResumeQuestion}
Has Asked Behavioral/HR Question Yet: ${hasBehavioralQuestion}
Has Asked Technical/Coding Question Yet: ${hasTechnicalOrCoding}
Unverified Past Mistake Memory to Retest: ${JSON.stringify(
      unverifiedPastMistake
        ? {
            memoryId: unverifiedPastMistake._id,
            skill: unverifiedPastMistake.skill,
            concept: unverifiedPastMistake.concept,
            mistake: unverifiedPastMistake.mistake,
          }
        : null
    )}

Latest Question & Evaluation:
Question: "${latestEvaluation?.question || ''}"
Topic: "${latestEvaluation?.topic || ''}"
Overall Score: ${latestScore}/100
Strengths: ${JSON.stringify(latestEvaluation?.strengths || [])}
Weaknesses: ${JSON.stringify(latestEvaluation?.weaknesses || [])}
Missing Concepts: ${JSON.stringify(latestEvaluation?.missingConcepts || [])}
Evaluator Recommendation: "${latestEvaluation?.followUpRecommendation || 'FOLLOW_UP'}"

Return JSON with this exact structure:
{
  "terminationDecision": "CONTINUE|END_INTERVIEW",
  "decision": "FOLLOW_UP|SIMPLIFY|INCREASE_DIFFICULTY|SWITCH_TOPIC|RESUME_BASED|TECHNICAL|CODING|BEHAVIORAL|HR|SCENARIO|DEEP_DIVE",
  "nextDifficulty": "EASY|MEDIUM|HARD",
  "nextQuestionType": "TECHNICAL|HR|BEHAVIORAL|RESUME_BASED|CODING|SCENARIO|FOLLOW_UP|DEEP_DIVE",
  "targetTopic": "string",
  "targetMemoryId": "string or null",
  "reason": "Clear explanation of why this strategy and topic were chosen next"
}`;

    const rawDecision = await geminiClient.generateStructuredJSON({
      agentName: 'NextQuestionDecisionAgent',
      systemInstruction,
      userPrompt,
      temperature: 0.3,
      fallbackFn: () =>
        this.buildDeterministicDecision({
          interview,
          latestEvaluation,
          latestScore,
          computedDifficulty,
          uncoveredTopics,
          hasResumeQuestion,
          hasBehavioralQuestion,
          unverifiedPastMistake,
        }),
    });

    const validDecisions = [
      'FOLLOW_UP',
      'SIMPLIFY',
      'INCREASE_DIFFICULTY',
      'SWITCH_TOPIC',
      'RESUME_BASED',
      'TECHNICAL',
      'CODING',
      'BEHAVIORAL',
      'HR',
      'SCENARIO',
      'DEEP_DIVE',
    ];

    const chosenDecision = validDecisions.includes(rawDecision.decision)
      ? rawDecision.decision
      : latestEvaluation?.followUpRecommendation || 'FOLLOW_UP';

    const nextDifficulty = ['EASY', 'MEDIUM', 'HARD'].includes(rawDecision.nextDifficulty)
      ? rawDecision.nextDifficulty
      : computedDifficulty;

    // Safeguard: do not allow premature END_INTERVIEW if fewer than minMeaningfulQuestions asked
    const terminationDecision =
      rawDecision.terminationDecision === 'END_INTERVIEW' &&
      questionsAskedCount >= minMeaningfulQuestions &&
      coverageRatio >= 0.55
        ? 'END_INTERVIEW'
        : 'CONTINUE';

    const targetTopic =
      rawDecision.targetTopic ||
      (chosenDecision === 'FOLLOW_UP' || chosenDecision === 'SIMPLIFY'
        ? latestEvaluation?.missingConcepts?.[0] || latestEvaluation?.topic || uncoveredTopics[0] || 'Core Architecture'
        : unverifiedPastMistake?.concept || uncoveredTopics[0] || 'System Design & Implementation');

    return {
      terminationDecision,
      decision: chosenDecision,
      nextDifficulty,
      nextQuestionType: rawDecision.nextQuestionType || this.mapDecisionToQuestionType(chosenDecision, interview.interviewType),
      targetTopic,
      targetMemoryId: rawDecision.targetMemoryId || (unverifiedPastMistake ? String(unverifiedPastMistake._id) : null),
      reason:
        rawDecision.reason ||
        `Selected ${chosenDecision} at ${nextDifficulty} difficulty based on recent answer score (${latestScore}%) and remaining topic coverage.`,
      consecutiveStrongAnswers: consecutiveStrong,
      consecutiveWeakAnswers: consecutiveWeak,
    };
  }

  mapDecisionToQuestionType(decision, interviewType) {
    if (decision === 'RESUME_BASED') return 'RESUME_BASED';
    if (decision === 'CODING') return 'CODING';
    if (decision === 'BEHAVIORAL') return 'BEHAVIORAL';
    if (decision === 'HR') return 'HR';
    if (decision === 'SCENARIO') return 'SCENARIO';
    if (decision === 'DEEP_DIVE') return 'DEEP_DIVE';
    if (decision === 'FOLLOW_UP' || decision === 'SIMPLIFY') return 'FOLLOW_UP';
    return interviewType === 'HR' ? 'BEHAVIORAL' : 'TECHNICAL';
  }

  buildDeterministicDecision({
    interview,
    latestEvaluation,
    latestScore,
    computedDifficulty,
    uncoveredTopics,
    hasResumeQuestion,
    hasBehavioralQuestion,
    unverifiedPastMistake,
  }) {
    const questionsAskedThisTopic = (interview.questions || []).filter(
      (q) => q.topic === latestEvaluation?.topic
    ).length;

    // 1. If weak answer and we haven't simplified on this topic yet -> SIMPLIFY
    if (latestScore < 52 && questionsAskedThisTopic < 2) {
      const missingConcept = latestEvaluation?.missingConcepts?.[0] || latestEvaluation?.topic || 'Fundamentals';
      return {
        terminationDecision: 'CONTINUE',
        decision: 'SIMPLIFY',
        nextDifficulty: 'EASY',
        nextQuestionType: 'FOLLOW_UP',
        targetTopic: missingConcept,
        targetMemoryId: null,
        reason: `Candidate struggled with ${latestEvaluation?.topic}. Simplifying to verify fundamental understanding of ${missingConcept}.`,
      };
    }

    // 2. If moderate answer with missing concept and < 2 questions on this topic -> FOLLOW_UP
    if (latestScore >= 52 && latestScore < 74 && questionsAskedThisTopic < 2) {
      const followUpTopic = latestEvaluation?.missingConcepts?.[0] || latestEvaluation?.topic;
      return {
        terminationDecision: 'CONTINUE',
        decision: 'FOLLOW_UP',
        nextDifficulty: computedDifficulty,
        nextQuestionType: 'FOLLOW_UP',
        targetTopic: followUpTopic,
        targetMemoryId: null,
        reason: `Probing deeper into ${followUpTopic} to assess practical depth.`,
      };
    }

    // 3. If unverified past mistake exists -> retest concept with fresh question
    if (unverifiedPastMistake) {
      return {
        terminationDecision: 'CONTINUE',
        decision: 'TECHNICAL',
        nextDifficulty: computedDifficulty,
        nextQuestionType: 'TECHNICAL',
        targetTopic: unverifiedPastMistake.concept,
        targetMemoryId: String(unverifiedPastMistake._id),
        reason: `Retesting previous interview weakness (${unverifiedPastMistake.concept}) using a fresh angle.`,
      };
    }

    // 4. If resume hasn't been interrogated deeply yet -> RESUME_BASED
    if (!hasResumeQuestion) {
      const project = interview.contextSnapshot?.candidateProfile?.projects?.[0];
      return {
        terminationDecision: 'CONTINUE',
        decision: 'RESUME_BASED',
        nextDifficulty: computedDifficulty,
        nextQuestionType: 'RESUME_BASED',
        targetTopic: project?.name ? `${project.name} Architecture` : 'Resume Project Implementation',
        targetMemoryId: null,
        reason: 'Interrogating candidate resume project claims and implementation decisions.',
      };
    }

    // 5. If HR or Mixed and no behavioral question asked yet -> BEHAVIORAL
    if ((interview.interviewType === 'HR' || interview.interviewType === 'Mixed') && !hasBehavioralQuestion) {
      return {
        terminationDecision: 'CONTINUE',
        decision: 'BEHAVIORAL',
        nextDifficulty: computedDifficulty,
        nextQuestionType: 'BEHAVIORAL',
        targetTopic: 'Ownership & Problem Resolution',
        targetMemoryId: null,
        reason: 'Assessing behavioral ownership and communication under pressure.',
      };
    }

    // 6. Switch to next uncovered priority topic or increase difficulty
    const nextTopic = uncoveredTopics[0] || 'Scalability & Edge Cases';
    return {
      terminationDecision: 'CONTINUE',
      decision: latestScore >= 78 ? 'INCREASE_DIFFICULTY' : 'SWITCH_TOPIC',
      nextDifficulty: computedDifficulty,
      nextQuestionType: interview.interviewType === 'HR' ? 'HR' : 'TECHNICAL',
      targetTopic: nextTopic,
      targetMemoryId: null,
      reason: `Moving to priority topic "${nextTopic}" at ${computedDifficulty} difficulty.`,
    };
  }
}

module.exports = new NextQuestionDecisionAgent();
