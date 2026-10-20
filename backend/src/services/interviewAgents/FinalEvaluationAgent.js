const geminiClient = require('./geminiClient');

/**
 * FinalEvaluationAgent (Section 19)
 * Synthesizes all internal evaluations, transcripts, difficulty progression,
 * mistake memory records, and skill-gap context into the complete Final Interview Report.
 */
class FinalEvaluationAgent {
  async generateFinalReport({ interview, persistentMistakes }) {
    const evaluations = interview.evaluations || [];
    const questions = interview.questions || [];
    const answers = interview.answers || [];

    const avg = (arr) =>
      arr.length ? Math.round(arr.reduce((sum, v) => sum + Number(v || 0), 0) / arr.length) : 0;

    const overallScore = avg(evaluations.map((e) => e.overallScore));
    const technicalKnowledge = avg(evaluations.map((e) => e.technicalAccuracy));
    const problemSolving = avg(evaluations.map((e) => e.problemSolving));
    const communication = avg(evaluations.map((e) => e.communication));
    const resumeKnowledge = avg(evaluations.map((e) => e.resumeUnderstanding));
    const behavioralPerformance = avg(
      evaluations.map((e) => e.behavioralEvaluation?.score || e.communication)
    );
    const roleSpecificSkills = Math.round(
      technicalKnowledge * 0.45 + problemSolving * 0.35 + resumeKnowledge * 0.2
    );

    const skillScores = {
      technicalKnowledge,
      problemSolving,
      communication,
      resumeKnowledge,
      behavioralPerformance,
      roleSpecificSkills,
    };

    // Build Question-by-Question Analysis (Section 19)
    const questionByQuestionAnalysis = evaluations.map((ev, index) => {
      const qObj = questions.find((q) => q.questionId === ev.questionId) || questions[index] || {};
      const aObj = answers.find((a) => a.questionId === ev.questionId) || answers[index] || {};

      return {
        index: index + 1,
        questionId: ev.questionId,
        question: ev.question || qObj.question || '',
        candidateAnswer: ev.answer || aObj.text || '',
        questionType: ev.questionType || qObj.type || 'TECHNICAL',
        strategyUsed: qObj.strategyUsed || 'INITIAL',
        difficulty: ev.difficulty || qObj.difficulty || 'MEDIUM',
        topic: ev.topic || qObj.topic || 'Core Topic',
        score: ev.overallScore || 0,
        technicalAccuracy: ev.technicalAccuracy || 0,
        communication: ev.communication || 0,
        problemSolving: ev.problemSolving || 0,
        whatWasGood: Array.isArray(ev.strengths) && ev.strengths.length
          ? ev.strengths
          : ['Addressed the question prompt directly'],
        whatWasMissing: Array.isArray(ev.missingConcepts) ? ev.missingConcepts : [],
        mistakes: Array.isArray(ev.mistakes) ? ev.mistakes : [],
        expectedConcepts: Array.isArray(ev.expectedConcepts) && ev.expectedConcepts.length
          ? ev.expectedConcepts
          : [ev.topic || 'Core Implementation'],
        aiFeedback: ev.aiFeedback || '',
      };
    });

    // Aggregate strengths, weaknesses, and mistakes across all questions
    const allStrengths = [...new Set(evaluations.flatMap((e) => e.strengths || []))].filter(Boolean);
    const allWeaknesses = [...new Set(evaluations.flatMap((e) => e.weaknesses || []))].filter(Boolean);
    const sessionMistakes = evaluations.flatMap((e) => e.mistakes || []);

    // Connect weaknesses to Skill Gap Agent (Section 19)
    const existingSkillGaps =
      interview.contextSnapshot?.skillGapAnalysis?.missingSkills ||
      interview.contextSnapshot?.skillGapAnalysis?.needsPractice ||
      [];

    // Use Gemini to synthesize executive insights, skill-gap connections, and actionable recommendations
    const systemInstruction = `You are the Final Evaluation Agent for PrepAgent AI.
Synthesize a comprehensive, evidence-backed executive summary, strengths, weaknesses, skill-gap improvement mapping, and actionable preparation recommendations for the candidate's completed ${interview.interviewType} interview for ${interview.targetRole} at ${interview.companyName}.
Return strictly valid JSON.`;

    const userPrompt = `Interview Summary:
Company: "${interview.companyName}"
Target Role: "${interview.targetRole}"
Interview Type: "${interview.interviewType}"
Overall Score: ${overallScore}/100
Questions Answered: ${evaluations.length}
Topics Covered: ${JSON.stringify(interview.coveredTopics || [])}
Computed Skill Scores: ${JSON.stringify(skillScores)}
Observed Strengths: ${JSON.stringify(allStrengths.slice(0, 10))}
Observed Weaknesses: ${JSON.stringify(allWeaknesses.slice(0, 10))}
Detected Mistakes: ${JSON.stringify(sessionMistakes.slice(0, 10))}
Existing Skill Gap Agent Priorities: ${JSON.stringify(existingSkillGaps.slice(0, 8))}

Return JSON matching this exact structure:
{
  "readinessVerdict": "Interview Ready | Approaching Readiness | Developing | Needs Focused Practice",
  "executiveSummary": "2-4 sentence summary of the candidate's overall interview performance",
  "strengths": ["Specific demonstrated strength backed by evidence"],
  "weaknesses": ["Specific weakness backed by interview evidence"],
  "improvementAreas": [
    {
      "skill": "Skill or topic name",
      "interviewEvidence": "What happened during the interview",
      "skillGapConnection": "How this connects to their target role skill gap",
      "priority": "High|Medium|Low"
    }
  ],
  "recommendations": [
    {
      "title": "Actionable step title",
      "description": "Specific preparation step to fix the gap",
      "category": "Technical|Resume|Problem Solving|Communication|Behavioral"
    }
  ]
}`;

    const aiSynthesis = await geminiClient.generateStructuredJSON({
      agentName: 'FinalEvaluationAgent',
      systemInstruction,
      userPrompt,
      temperature: 0.3,
      fallbackFn: () => ({
        readinessVerdict:
          overallScore >= 78
            ? 'Interview Ready'
            : overallScore >= 62
            ? 'Approaching Readiness'
            : overallScore >= 45
            ? 'Developing'
            : 'Needs Focused Practice',
        executiveSummary: `You completed ${evaluations.length} dynamic questions in your ${interview.interviewType} interview for ${interview.targetRole} at ${interview.companyName}, achieving an overall score of ${overallScore}%.`,
        strengths: allStrengths.length
          ? allStrengths.slice(0, 6)
          : ['Maintained structured communication across questions', 'Engaged directly with role-specific scenarios'],
        weaknesses: allWeaknesses.length
          ? allWeaknesses.slice(0, 6)
          : ['Could provide deeper architectural trade-offs and edge-case analysis'],
        improvementAreas: (allWeaknesses.slice(0, 3).length ? allWeaknesses.slice(0, 3) : ['Deep System Architecture']).map(
          (w, idx) => ({
            skill: interview.coveredTopics?.[idx] || existingSkillGaps[idx] || 'Core Engineering Depth',
            interviewEvidence: w,
            skillGapConnection: existingSkillGaps[idx]
              ? `Directly aligns with Skill Gap priority: ${existingSkillGaps[idx]}`
              : `Key competency required for ${interview.targetRole} at ${interview.companyName}`,
            priority: idx === 0 ? 'High' : 'Medium',
          })
        ),
        recommendations: [
          {
            title: 'Deepen Resume Project Trade-Off Explanations',
            description:
              'Practice explaining not just what technologies you used, but why you chose them over alternatives and how they scale.',
            category: 'Resume',
          },
          {
            title: 'Address Missing Technical Concepts',
            description:
              'Review the missing concepts highlighted in the question-by-question breakdown and build concrete examples for each.',
            category: 'Technical',
          },
          {
            title: 'Structure Behavioral Answers with STAR Metrics',
            description:
              'Quantify the final impact and engineering metrics when describing past project challenges.',
            category: 'Communication',
          },
        ],
      }),
    });

    // Build Visual Chart Data (Section 19)
    const difficultyMap = { EASY: 1, MEDIUM: 2, HARD: 3 };
    const difficultyProgression = questionByQuestionAnalysis.map((q) => ({
      questionNumber: `Q${q.index}`,
      topic: q.topic,
      difficulty: q.difficulty,
      difficultyLevel: difficultyMap[q.difficulty] || 2,
      score: q.score,
      strategy: q.strategyUsed,
    }));

    let runningTotal = 0;
    const performanceProgression = questionByQuestionAnalysis.map((q, i) => {
      runningTotal += q.score;
      return {
        questionNumber: `Q${q.index}`,
        questionScore: q.score,
        cumulativeAverage: Math.round(runningTotal / (i + 1)),
        topic: q.topic,
      };
    });

    const topicCoverageMap = {};
    for (const q of questionByQuestionAnalysis) {
      if (!topicCoverageMap[q.topic]) {
        topicCoverageMap[q.topic] = { topic: q.topic, questionsCount: 0, totalScore: 0 };
      }
      topicCoverageMap[q.topic].questionsCount += 1;
      topicCoverageMap[q.topic].totalScore += q.score;
    }
    const topicCoverageChart = Object.values(topicCoverageMap).map((t) => ({
      topic: t.topic,
      questionsCount: t.questionsCount,
      averageScore: Math.round(t.totalScore / t.questionsCount),
    }));

    const strongCount = questionByQuestionAnalysis.filter((q) => q.score >= 75).length;
    const moderateCount = questionByQuestionAnalysis.filter((q) => q.score >= 50 && q.score < 75).length;
    const weakCount = questionByQuestionAnalysis.filter((q) => q.score < 50).length;

    const repeatedMistakes = (persistentMistakes || [])
      .filter((m) => m.frequency >= 1)
      .slice(0, 8)
      .map((m) => ({
        skill: m.skill,
        concept: m.concept,
        mistake: m.mistake,
        frequency: m.frequency,
        improvement: m.improvement,
        proficiency: m.proficiency,
        firstDetected: m.firstDetected,
        lastDetected: m.lastDetected,
      }));

    return {
      generatedAt: new Date(),
      overallPerformance: {
        overallScore,
        readinessVerdict: aiSynthesis.readinessVerdict || (overallScore >= 75 ? 'Interview Ready' : 'Developing'),
        executiveSummary: aiSynthesis.executiveSummary || '',
        interviewDurationSeconds: interview.elapsedSeconds || Math.round((Date.now() - new Date(interview.startTime).getTime()) / 1000),
        plannedDurationSeconds: interview.duration || 1200,
        questionsAnswered: evaluations.length,
        topicsCovered: interview.coveredTopics || [],
        interviewType: interview.interviewType,
        companyName: interview.companyName,
        targetRole: interview.targetRole,
      },
      skillScores,
      chartsData: {
        skillScoresBar: [
          { label: 'Technical Knowledge', score: skillScores.technicalKnowledge },
          { label: 'Problem Solving', score: skillScores.problemSolving },
          { label: 'Communication', score: skillScores.communication },
          { label: 'Resume Mastery', score: skillScores.resumeKnowledge },
          { label: 'Behavioral & Ownership', score: skillScores.behavioralPerformance },
          { label: 'Role-Specific Fit', score: skillScores.roleSpecificSkills },
        ],
        difficultyProgression,
        performanceProgression,
        topicCoverageChart,
        strengthVsWeaknessDistribution: {
          strongAnswers: strongCount,
          moderateAnswers: moderateCount,
          weakAnswers: weakCount,
          totalStrengths: (aiSynthesis.strengths || allStrengths).length,
          totalWeaknesses: (aiSynthesis.weaknesses || allWeaknesses).length,
          totalMistakes: sessionMistakes.length,
        },
      },
      questionByQuestionAnalysis,
      strengths: Array.isArray(aiSynthesis.strengths) && aiSynthesis.strengths.length
        ? aiSynthesis.strengths
        : allStrengths,
      weaknesses: Array.isArray(aiSynthesis.weaknesses) && aiSynthesis.weaknesses.length
        ? aiSynthesis.weaknesses
        : allWeaknesses,
      repeatedMistakes,
      improvementAreas: Array.isArray(aiSynthesis.improvementAreas) ? aiSynthesis.improvementAreas : [],
      recommendations: Array.isArray(aiSynthesis.recommendations) ? aiSynthesis.recommendations : [],
    };
  }
}

module.exports = new FinalEvaluationAgent();
