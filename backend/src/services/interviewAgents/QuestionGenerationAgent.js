const geminiClient = require('./geminiClient');

/**
 * QuestionGenerationAgent (Sections 5B, 8, 9)
 * Dynamically generates context-aware, role-specific, non-repetitive questions
 * and contextual silence hints based on the orchestrator & decision agent's chosen strategy.
 */
class QuestionGenerationAgent {
  async generateFirstQuestion({
    companyName,
    targetRole,
    interviewType,
    candidateProfile,
    skillGapAnalysis,
    jobPreparationPlan,
    companyPatterns,
    previousMistakes,
  }) {
    const projects = candidateProfile?.projects || [];
    const primaryProject = projects[0] || null;
    const allSkills = this.flattenCandidateSkills(candidateProfile);
    const priorityGaps = (skillGapAnalysis?.preparationPriorities || [])
      .map((p) => p.skill)
      .filter(Boolean)
      .slice(0, 5);

    const systemInstruction = `You are the Question Generation Agent for PrepAgent AI, conducting a live job interview for ${companyName} for the role of ${targetRole}.
Primary Interview Mode: ${interviewType}.
Generate an engaging, realistic, professional opening interview question.
- For Technical interviews: Start by connecting their background/featured project (${
      primaryProject?.name || 'their engineering work'
    }) with a concrete technical design or implementation question relevant to ${targetRole} at ${companyName}.
- For HR interviews: Start with a warm, role-tailored introduction or motivation question connecting their experience to ${companyName}.
- For Mixed interviews: Start with a focused introduction that asks them to highlight a key project from their resume (${
      primaryProject?.name || 'their recent project'
    }) and the core technical challenge they solved.
Also generate a subtle, supportive contextual hint (1-2 sentences) to offer if the candidate becomes silent for too long, without giving away the answer.
Return strictly valid JSON.`;

    const userPrompt = `Candidate Context:
Company: "${companyName}"
Target Role: "${targetRole}"
Interview Type: "${interviewType}"
Candidate Name: "${candidateProfile?.personalInfo?.name || 'Candidate'}"
Resume Projects: ${JSON.stringify(
      projects.slice(0, 3).map((p) => ({
        name: p.name,
        technologies: p.technologies,
        description: p.description,
      }))
    )}
Candidate Skills: ${JSON.stringify(allSkills.slice(0, 15))}
Skill Gaps to Probe During Session: ${JSON.stringify(priorityGaps)}
Company Interview Themes: ${JSON.stringify(companyPatterns?.commonTopics?.slice(0, 5) || [])}

Return JSON with this exact structure:
{
  "question": "The spoken interview question text (natural, direct, conversational, 1-3 sentences)",
  "type": "INTRODUCTION|RESUME_BASED|TECHNICAL|HR|BEHAVIORAL",
  "difficulty": "EASY|MEDIUM",
  "topic": "Specific topic or project name being assessed",
  "source": "Resume + Company Role Context",
  "reason": "Why this opening question was chosen",
  "hint": "Supportive hint if candidate pauses (e.g., 'Take your time. You can start by walking through the architecture of your project and your specific role in building it.')"
}`;

    const generated = await geminiClient.generateStructuredJSON({
      agentName: 'QuestionGenerationAgent:FirstQuestion',
      systemInstruction,
      userPrompt,
      temperature: 0.45,
      fallbackFn: () =>
        this.buildFallbackFirstQuestion({
          companyName,
          targetRole,
          interviewType,
          primaryProject,
          allSkills,
        }),
    });

    return {
      questionId: `q_${Date.now()}_1`,
      question: generated.question || this.buildFallbackFirstQuestion({ companyName, targetRole, interviewType, primaryProject, allSkills }).question,
      type: generated.type || (interviewType === 'HR' ? 'HR' : 'RESUME_BASED'),
      strategyUsed: 'INITIAL',
      difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(generated.difficulty) ? generated.difficulty : 'MEDIUM',
      topic: generated.topic || (primaryProject?.name ? `${primaryProject.name} Overview` : `${targetRole} Foundations`),
      source: generated.source || 'Resume & Role Context',
      reason: generated.reason || `Opening ${interviewType} question tailored to ${companyName} and candidate resume.`,
      hint:
        generated.hint ||
        'Take your time. You can start by summarizing your core approach and the technologies you worked with directly.',
      targetMemoryId: null,
      timestamp: new Date(),
    };
  }

  async generateNextQuestion({
    interview,
    decisionResult,
    latestEvaluation,
    candidateMistakes,
  }) {
    const context = interview.contextSnapshot || {};
    const candidateProfile = context.candidateProfile || {};
    const projects = candidateProfile.projects || [];
    const allSkills = this.flattenCandidateSkills(candidateProfile);
    const previousQuestions = (interview.questions || []).map((q) => q.question);
    const lastAnswer = (interview.answers || []).slice(-1)[0]?.text || '';

    // Find specific mistake memory if targetMemoryId was set
    const targetMemory = decisionResult.targetMemoryId
      ? (candidateMistakes || []).find((m) => String(m._id) === String(decisionResult.targetMemoryId))
      : null;

    const systemInstruction = `You are the Question Generation Agent for PrepAgent AI, interviewing a candidate for ${interview.targetRole} at ${interview.companyName}.
Your task is to generate the NEXT dynamic interview question following the Decision Agent's strategy:
- Strategy: ${decisionResult.decision}
- Target Difficulty: ${decisionResult.nextDifficulty}
- Target Topic: ${decisionResult.targetTopic}
- Primary Interview Mode: ${interview.interviewType}

CRITICAL RULES:
1. NEVER repeat any question in "Previously Asked Questions".
2. If Strategy is FOLLOW_UP or DEEP_DIVE: Reference what the candidate just said in their last answer and probe the missing or deeper concept (${JSON.stringify(
      latestEvaluation?.missingConcepts || []
    )}).
3. If Strategy is SIMPLIFY: Ask a clearer, more foundational question on "${decisionResult.targetTopic}" so the candidate can demonstrate core understanding.
4. If Strategy is INCREASE_DIFFICULTY: Ask an architectural, scalability, edge-case, or complex trade-off question on "${decisionResult.targetTopic}".
5. If Strategy is RESUME_BASED: Explicitly name one of the candidate's actual resume projects (${projects
      .map((p) => p.name)
      .join(', ') || 'their project'}) and technologies (${allSkills.slice(0, 8).join(', ')}) and ask how they implemented a specific mechanism or handled a real engineering trade-off.
6. If Retesting a Past Mistake (${targetMemory ? targetMemory.concept : 'N/A'}): Test the underlying concept using a DIFFERENT question than: ${JSON.stringify(
      targetMemory?.previousQuestionsAsked || []
    )}.
7. Keep the question natural for a live voice interviewer (1-3 clear sentences).
Return strictly valid JSON.`;

    const userPrompt = `Interview Context:
Company: "${interview.companyName}"
Target Role: "${interview.targetRole}"
Interview Type: "${interview.interviewType}"
Decision Strategy: "${decisionResult.decision}"
Decision Reason: "${decisionResult.reason}"
Target Topic: "${decisionResult.targetTopic}"
Target Difficulty: "${decisionResult.nextDifficulty}"
Candidate Last Question: "${interview.currentQuestion?.question || ''}"
Candidate Last Answer: "${lastAnswer}"
Latest Evaluation Missing Concepts: ${JSON.stringify(latestEvaluation?.missingConcepts || [])}
Candidate Resume Projects: ${JSON.stringify(
      projects.map((p) => ({
        name: p.name,
        technologies: p.technologies,
        description: p.description,
        responsibilities: p.responsibilities,
      }))
    )}
Candidate Skills: ${JSON.stringify(allSkills)}
Previously Asked Questions (DO NOT REPEAT): ${JSON.stringify(previousQuestions)}

Return JSON with this exact structure:
{
  "question": "The spoken next interview question",
  "type": "TECHNICAL|HR|BEHAVIORAL|RESUME_BASED|CODING|SCENARIO|FOLLOW_UP|DEEP_DIVE",
  "difficulty": "EASY|MEDIUM|HARD",
  "topic": "Specific topic/skill/project name",
  "source": "Follow-up Evaluation | Resume Interrogation | Skill Gap | Mistake Memory | Company Pattern",
  "reason": "Why this question was generated now",
  "hint": "A supportive 1-2 sentence hint if the candidate pauses silently, nudging their thought process without giving away the answer"
}`;

    const generated = await geminiClient.generateStructuredJSON({
      agentName: 'QuestionGenerationAgent:NextQuestion',
      systemInstruction,
      userPrompt,
      temperature: 0.5,
      fallbackFn: () =>
        this.buildFallbackNextQuestion({
          interview,
          decisionResult,
          latestEvaluation,
          projects,
          allSkills,
          previousQuestions,
        }),
    });

    const stepNum = (interview.questions || []).length + 1;

    return {
      questionId: `q_${Date.now()}_${stepNum}`,
      question:
        generated.question ||
        this.buildFallbackNextQuestion({
          interview,
          decisionResult,
          latestEvaluation,
          projects,
          allSkills,
          previousQuestions,
        }).question,
      type: generated.type || decisionResult.nextQuestionType || 'TECHNICAL',
      strategyUsed: decisionResult.decision,
      difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(generated.difficulty)
        ? generated.difficulty
        : decisionResult.nextDifficulty || 'MEDIUM',
      topic: generated.topic || decisionResult.targetTopic || 'Core Engineering',
      source: generated.source || decisionResult.decision,
      reason: generated.reason || decisionResult.reason,
      hint:
        generated.hint ||
        `Take your time. Think about how ${decisionResult.targetTopic || 'this mechanism'} works step by step in a real production scenario.`,
      targetMemoryId: decisionResult.targetMemoryId || null,
      timestamp: new Date(),
    };
  }

  /**
   * Generate a real-time contextual hint when silence detection triggers (Section 9)
   */
  async generateSilenceHint({ currentQuestion, partialTranscript, companyName, targetRole }) {
    if (partialTranscript && partialTranscript.trim().length > 10) {
      const systemInstruction = `You are a supportive human interviewer at ${companyName}. The candidate paused while answering a question for ${targetRole}.
Offer a brief, encouraging 1-2 sentence nudge based on what they have already said, without giving away the answer. Return JSON { "hint": "string" }.`;

      const res = await geminiClient.generateStructuredJSON({
        agentName: 'QuestionGenerationAgent:SilenceHint',
        systemInstruction,
        userPrompt: `Question: "${currentQuestion?.question}"\nCandidate partial response before silence: "${partialTranscript}"\nReturn JSON { "hint": "string" }`,
        temperature: 0.4,
        fallbackFn: () => ({
          hint: `You're on the right track mentioning that. Take your time—how would you handle the next step regarding ${
            currentQuestion?.topic || 'implementation'
          }?`,
        }),
      });
      return res.hint || currentQuestion?.hint;
    }

    return (
      currentQuestion?.hint ||
      'Take your time. You can start by explaining the core approach you would take and the trade-offs involved.'
    );
  }

  flattenCandidateSkills(candidateProfile) {
    if (!candidateProfile?.skills) return [];
    const s = candidateProfile.skills;
    const list = [
      ...(s.programmingLanguages || []),
      ...(s.frontend || []),
      ...(s.backend || []),
      ...(s.frameworks || []),
      ...(s.databases || []),
      ...(s.cloud || []),
      ...(s.devops || []),
      ...(s.tools || []),
      ...(s.technologies || []),
    ].filter(Boolean);
    return [...new Set(list)];
  }

  buildFallbackFirstQuestion({ companyName, targetRole, interviewType, primaryProject, allSkills }) {
    const projectName = primaryProject?.name;
    const projectTechs = primaryProject?.technologies?.length
      ? primaryProject.technologies.slice(0, 3).join(', ')
      : allSkills.slice(0, 3).join(', ') || 'your core tech stack';

    if (interviewType === 'HR') {
      return {
        question: `Welcome to your ${companyName} interview for the ${targetRole} position. To start, could you walk me through your background and share what specifically excites you about contributing as a ${targetRole} at ${companyName}?`,
        type: 'HR',
        difficulty: 'EASY',
        topic: 'Introduction & Role Motivation',
        source: 'Company & Role Context',
        reason: 'Opening HR question to assess motivation, clarity, and role alignment.',
        hint: 'Take your time. Highlight your most relevant experience and connect your career goals to this role.',
      };
    }

    if (projectName) {
      return {
        question: `Welcome to your ${companyName} ${targetRole} interview. I noticed on your resume that you built "${projectName}" using ${projectTechs}. Could you explain the core architecture of ${projectName} and the most challenging technical problem you solved while building it?`,
        type: 'RESUME_BASED',
        difficulty: 'MEDIUM',
        topic: `${projectName} Architecture`,
        source: 'Resume Interrogation',
        reason: `Probing candidate's featured resume project (${projectName}) and claimed technologies (${projectTechs}).`,
        hint: `Take your time. Start by explaining what ${projectName} does, how requests flow through ${projectTechs}, and one key design decision you made.`,
      };
    }

    return {
      question: `Welcome to your ${companyName} ${targetRole} interview. Based on your experience with ${projectTechs}, how do you typically structure and design a production-ready application for reliability and maintainability?`,
      type: 'TECHNICAL',
      difficulty: 'MEDIUM',
      topic: 'Application Architecture',
      source: 'Role & Resume Context',
      reason: 'Assessing core architectural understanding for the target role.',
      hint: 'Take your time. You can structure your answer around API design, data modeling, error handling, and security.',
    };
  }

  buildFallbackNextQuestion({
    interview,
    decisionResult,
    latestEvaluation,
    projects,
    allSkills,
    previousQuestions,
  }) {
    const topic = decisionResult.targetTopic || 'System Scalability';
    const decision = decisionResult.decision;
    const project = projects[(interview.questions || []).length % Math.max(1, projects.length)];
    const tech = allSkills[(interview.questions || []).length % Math.max(1, allSkills.length)] || topic;

    let candidateQuestion = '';

    if (decision === 'SIMPLIFY') {
      candidateQuestion = `Let's break "${topic}" down to its fundamentals. In simple terms, what is the core purpose of ${topic}, and when would you use it in a ${interview.targetRole} project?`;
    } else if (decision === 'FOLLOW_UP' || decision === 'DEEP_DIVE') {
      const missing = latestEvaluation?.missingConcepts?.[0] || topic;
      candidateQuestion = `Building on your previous answer, how would you specifically handle ${missing} under the hood, and what edge cases or failure scenarios could arise?`;
    } else if (decision === 'INCREASE_DIFFICULTY') {
      candidateQuestion = `Let's take "${topic}" to a production scale at ${interview.companyName}. If traffic increased 10x and latency started spiking, how would you diagnose the bottleneck and re-architect ${topic}?`;
    } else if (decision === 'RESUME_BASED' && project?.name) {
      candidateQuestion = `In your "${project.name}" project, how did you handle data validation, authentication, or state consistency across ${
        (project.technologies || []).slice(0, 2).join(' and ') || tech
      }, and what would you improve if you rebuilt it today?`;
    } else if (decision === 'BEHAVIORAL' || decision === 'HR') {
      candidateQuestion = `Tell me about a situation where you faced a tight deadline or conflicting technical opinions while working on a project. What specific actions did you take, and what was the measurable outcome?`;
    } else if (decision === 'CODING') {
      candidateQuestion = `Suppose you need to implement an efficient mechanism for ${topic} in ${tech}. Walk me through the algorithm, data structures, and time/space complexity of your approach.`;
    } else {
      candidateQuestion = `In the context of a ${interview.targetRole} at ${interview.companyName}, how do you approach designing and optimizing ${topic} for both security and high performance?`;
    }

    // Ensure non-repetition
    if (previousQuestions.includes(candidateQuestion)) {
      candidateQuestion = `Regarding ${topic} (${tech}): what are the most critical trade-offs you evaluate before deploying a solution to production at ${interview.companyName}?`;
    }

    return {
      question: candidateQuestion,
      type: decisionResult.nextQuestionType || 'TECHNICAL',
      difficulty: decisionResult.nextDifficulty || 'MEDIUM',
      topic,
      source: decision,
      reason: decisionResult.reason,
      hint: `Take your time. Focus on the practical workflow for ${topic} and explain the trade-offs step by step.`,
    };
  }
}

module.exports = new QuestionGenerationAgent();
