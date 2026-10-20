const geminiClient = require('./geminiClient');

/**
 * AnswerEvaluationAgent (Section 5C & 17)
 * Internally evaluates every candidate answer across technical accuracy, relevance,
 * problem solving, communication, confidence indicators (observable conversational signals only),
 * resume understanding, and behavioral dimensions.
 */
class AnswerEvaluationAgent {
  async evaluateAnswer({
    companyName,
    targetRole,
    interviewType,
    currentQuestion,
    answerText,
    answerDurationSeconds,
    silenceDetected,
    hintUsed,
    candidateProfile,
    skillGapAnalysis,
  }) {
    const cleanAnswer = (answerText || '').trim();

    if (!cleanAnswer || cleanAnswer.length < 3) {
      return {
        questionId: currentQuestion.questionId,
        question: currentQuestion.question,
        questionType: currentQuestion.type || 'TECHNICAL',
        difficulty: currentQuestion.difficulty || 'MEDIUM',
        topic: currentQuestion.topic || 'General',
        answer: cleanAnswer || '(No response provided)',
        overallScore: 10,
        technicalAccuracy: 10,
        relevance: 10,
        completeness: 5,
        problemSolving: 10,
        communication: 15,
        resumeUnderstanding: 10,
        behavioralEvaluation: {
          situationClarity: 10,
          actionTaken: 10,
          resultImpact: 10,
          ownership: 10,
          score: 10,
        },
        confidenceIndicators: {
          clarityLevel: 'Low',
          structureQuality: 'Incomplete',
          conciseness: 'Too Brief',
          observableSignals: ['Answer was empty or extremely brief', 'Did not address core concepts of the question'],
          score: 15,
        },
        strengths: [],
        weaknesses: [`Did not provide a substantive response regarding ${currentQuestion.topic || 'the topic'}`],
        mistakes: [
          {
            concept: currentQuestion.topic || 'Core Concept',
            description: `Unable to explain ${currentQuestion.topic || 'the asked concept'} when prompted.`,
            severity: 'HIGH',
            relatedSkill: currentQuestion.topic || targetRole,
          },
        ],
        missingConcepts: [currentQuestion.topic || 'Core explanation', 'Practical implementation details'],
        expectedConcepts: [currentQuestion.topic || 'Core explanation', 'Real-world application'],
        aiFeedback: 'The answer was missing or too brief to demonstrate understanding. Break the question into fundamentals and explain step by step.',
        followUpRecommendation: 'SIMPLIFY',
        avatarReaction: 'CONCERNED',
      };
    }

    const systemInstruction = `You are the Answer Evaluation Agent for PrepAgent AI, an expert technical and behavioral interviewer for ${companyName} (${targetRole}).
Evaluate the candidate's response rigorously and objectively.
IMPORTANT RULES:
1. For Confidence Indicators, use ONLY observable conversational signals (sentence structure, specificity, logical flow, directness, use of examples). Never make psychological or medical conclusions.
2. Detect specific technical or conceptual mistakes, missing concepts, and strengths.
3. Recommend the most appropriate next pedagogical/interrogation strategy from:
   FOLLOW_UP, SIMPLIFY, INCREASE_DIFFICULTY, SWITCH_TOPIC, RESUME_BASED, TECHNICAL, CODING, BEHAVIORAL, HR, SCENARIO, DEEP_DIVE.
   - If the answer mentions a concept superficially without explaining how it works (e.g., mentions JWT without validation details), recommend FOLLOW_UP or DEEP_DIVE.
   - If the answer is weak or confused on fundamentals, recommend SIMPLIFY.
   - If the answer is strong, comprehensive, and accurate, recommend INCREASE_DIFFICULTY or SWITCH_TOPIC.
Return strictly valid JSON.`;

    const userPrompt = `Evaluate this candidate answer:
Company: "${companyName}"
Target Role: "${targetRole}"
Interview Type: "${interviewType}"
Question Asked: "${currentQuestion.question}"
Question Type: "${currentQuestion.type}"
Question Difficulty: "${currentQuestion.difficulty}"
Question Topic: "${currentQuestion.topic}"
Candidate Answer: "${cleanAnswer}"
Answer Duration (seconds): ${answerDurationSeconds || 30}
Silence Detected During Answer: ${Boolean(silenceDetected)}
Hint Used: ${Boolean(hintUsed)}
Relevant Resume Projects/Skills: ${JSON.stringify({
      projects: (candidateProfile?.projects || []).map((p) => ({ name: p.name, technologies: p.technologies })),
      skills: candidateProfile?.skills || {},
    })}

Return JSON matching this exact structure:
{
  "overallScore": 0-100,
  "technicalAccuracy": 0-100,
  "relevance": 0-100,
  "completeness": 0-100,
  "problemSolving": 0-100,
  "communication": 0-100,
  "resumeUnderstanding": 0-100,
  "behavioralEvaluation": {
    "situationClarity": 0-100,
    "actionTaken": 0-100,
    "resultImpact": 0-100,
    "ownership": 0-100,
    "score": 0-100
  },
  "confidenceIndicators": {
    "clarityLevel": "High|Moderate|Low",
    "structureQuality": "Well-Structured|Moderately Structured|Unstructured",
    "conciseness": "Concise|Balanced|Verbose|Too Brief",
    "observableSignals": ["string"],
    "score": 0-100
  },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "mistakes": [
    {
      "concept": "string",
      "description": "string",
      "severity": "LOW|MEDIUM|HIGH",
      "relatedSkill": "string"
    }
  ],
  "missingConcepts": ["string"],
  "expectedConcepts": ["string"],
  "aiFeedback": "Constructive, specific feedback referencing what the candidate said and how to improve.",
  "followUpRecommendation": "FOLLOW_UP|SIMPLIFY|INCREASE_DIFFICULTY|SWITCH_TOPIC|RESUME_BASED|TECHNICAL|CODING|BEHAVIORAL|HR|SCENARIO|DEEP_DIVE",
  "avatarReaction": "ENCOURAGING|LISTENING|CONCERNED"
}`;

    const rawEval = await geminiClient.generateStructuredJSON({
      agentName: 'AnswerEvaluationAgent',
      systemInstruction,
      userPrompt,
      temperature: 0.25,
      fallbackFn: () =>
        this.buildHeuristicEvaluation({
          currentQuestion,
          cleanAnswer,
          silenceDetected,
          hintUsed,
          targetRole,
        }),
    });

    const clamp = (val, def = 65) => {
      const n = Number(val);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : def;
    };

    const overallScore = clamp(rawEval.overallScore, 65);
    const validStrategies = [
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

    const followUpRecommendation = validStrategies.includes(rawEval.followUpRecommendation)
      ? rawEval.followUpRecommendation
      : overallScore < 50
      ? 'SIMPLIFY'
      : overallScore < 75
      ? 'FOLLOW_UP'
      : 'INCREASE_DIFFICULTY';

    const avatarReaction =
      overallScore >= 72 ? 'ENCOURAGING' : overallScore < 48 ? 'CONCERNED' : 'LISTENING';

    return {
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      questionType: currentQuestion.type || 'TECHNICAL',
      difficulty: currentQuestion.difficulty || 'MEDIUM',
      topic: currentQuestion.topic || 'General',
      answer: cleanAnswer,
      overallScore,
      technicalAccuracy: clamp(rawEval.technicalAccuracy, overallScore),
      relevance: clamp(rawEval.relevance, overallScore),
      completeness: clamp(rawEval.completeness, overallScore),
      problemSolving: clamp(rawEval.problemSolving, overallScore),
      communication: clamp(rawEval.communication, overallScore),
      resumeUnderstanding: clamp(rawEval.resumeUnderstanding, overallScore),
      behavioralEvaluation: {
        situationClarity: clamp(rawEval.behavioralEvaluation?.situationClarity, overallScore),
        actionTaken: clamp(rawEval.behavioralEvaluation?.actionTaken, overallScore),
        resultImpact: clamp(rawEval.behavioralEvaluation?.resultImpact, overallScore),
        ownership: clamp(rawEval.behavioralEvaluation?.ownership, overallScore),
        score: clamp(rawEval.behavioralEvaluation?.score, overallScore),
      },
      confidenceIndicators: {
        clarityLevel: rawEval.confidenceIndicators?.clarityLevel || (overallScore >= 70 ? 'High' : 'Moderate'),
        structureQuality: rawEval.confidenceIndicators?.structureQuality || 'Moderately Structured',
        conciseness: rawEval.confidenceIndicators?.conciseness || 'Balanced',
        observableSignals: Array.isArray(rawEval.confidenceIndicators?.observableSignals)
          ? rawEval.confidenceIndicators.observableSignals
          : ['Addressed the question directly with domain vocabulary'],
        score: clamp(rawEval.confidenceIndicators?.score, overallScore),
      },
      strengths: Array.isArray(rawEval.strengths) ? rawEval.strengths : [],
      weaknesses: Array.isArray(rawEval.weaknesses) ? rawEval.weaknesses : [],
      mistakes: Array.isArray(rawEval.mistakes)
        ? rawEval.mistakes.map((m) => ({
            concept: m.concept || currentQuestion.topic || 'Core Concept',
            description: m.description || 'Incomplete technical explanation',
            severity: ['LOW', 'MEDIUM', 'HIGH'].includes(m.severity) ? m.severity : 'MEDIUM',
            relatedSkill: m.relatedSkill || currentQuestion.topic || targetRole,
          }))
        : [],
      missingConcepts: Array.isArray(rawEval.missingConcepts) ? rawEval.missingConcepts : [],
      expectedConcepts: Array.isArray(rawEval.expectedConcepts) ? rawEval.expectedConcepts : [currentQuestion.topic],
      aiFeedback:
        rawEval.aiFeedback ||
        'Your answer covered the main idea, but adding concrete architecture trade-offs and edge-case handling would strengthen it.',
      followUpRecommendation,
      avatarReaction,
    };
  }

  buildHeuristicEvaluation({ currentQuestion, cleanAnswer, silenceDetected, hintUsed, targetRole }) {
    const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;
    const hasTechnicalDepth = /because|example|implemented|architecture|performance|latency|database|index|token|security|scale|async|state|api/i.test(
      cleanAnswer
    );
    let baseScore = Math.min(88, Math.max(32, 40 + Math.min(wordCount * 1.1, 35) + (hasTechnicalDepth ? 12 : 0)));
    if (hintUsed) baseScore = Math.max(30, baseScore - 6);
    if (silenceDetected && wordCount < 20) baseScore = Math.max(25, baseScore - 8);
    const score = Math.round(baseScore);

    const isWeak = score < 55;
    const isStrong = score >= 76;

    return {
      overallScore: score,
      technicalAccuracy: score,
      relevance: Math.min(100, score + 5),
      completeness: isWeak ? score - 8 : score,
      problemSolving: score,
      communication: Math.min(95, score + 4),
      resumeUnderstanding: score,
      behavioralEvaluation: {
        situationClarity: score,
        actionTaken: score,
        resultImpact: Math.max(30, score - 5),
        ownership: score,
        score,
      },
      confidenceIndicators: {
        clarityLevel: isStrong ? 'High' : isWeak ? 'Low' : 'Moderate',
        structureQuality: wordCount >= 35 ? 'Well-Structured' : 'Moderately Structured',
        conciseness: wordCount < 15 ? 'Too Brief' : wordCount > 180 ? 'Verbose' : 'Balanced',
        observableSignals: [
          wordCount >= 35
            ? 'Provided multi-step explanation with supporting context'
            : 'Brief response with limited elaboration on underlying trade-offs',
        ],
        score,
      },
      strengths: isWeak
        ? ['Attempted to address the prompt directly']
        : [`Demonstrated working familiarity with ${currentQuestion.topic || 'the topic'}`, 'Communicated core logic clearly'],
      weaknesses: isStrong
        ? ['Could further quantify measurable production impact or edge-case metrics']
        : [`Lacked deep implementation details on ${currentQuestion.topic || 'the concept'}`, 'Did not discuss edge cases or failure recovery'],
      mistakes: isWeak
        ? [
            {
              concept: currentQuestion.topic || 'Core Implementation',
              description: `Omitted concrete mechanics and trade-offs when explaining ${currentQuestion.topic || 'the solution'}.`,
              severity: score < 42 ? 'HIGH' : 'MEDIUM',
              relatedSkill: currentQuestion.topic || targetRole,
            },
          ]
        : [],
      missingConcepts: isStrong ? [] : [`Internal mechanics of ${currentQuestion.topic}`, 'Edge-case & scalability trade-offs'],
      expectedConcepts: [currentQuestion.topic || 'Core Design', 'Implementation Workflow', 'Edge-Case Handling'],
      aiFeedback: isStrong
        ? `Strong explanation of ${currentQuestion.topic}. You structured your approach well and connected it to practical application.`
        : `Your answer touched on ${currentQuestion.topic} at a high level, but an interviewer expects deeper explanation of how it works under the hood and what trade-offs you considered.`,
      followUpRecommendation: isWeak ? 'SIMPLIFY' : score < 74 ? 'FOLLOW_UP' : 'INCREASE_DIFFICULTY',
      avatarReaction: isStrong ? 'ENCOURAGING' : isWeak ? 'CONCERNED' : 'LISTENING',
    };
  }
}

module.exports = new AnswerEvaluationAgent();
