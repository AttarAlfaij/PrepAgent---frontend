const { GoogleGenerativeAI } = require('@google/generative-ai');
const PreparationSession = require('../../models/PreparationSession');

// ============================================================
// AGENT A: Interview Planning Agent
// ============================================================
class InterviewPlanningAgent {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async createPlan(ctx) {
    const {
      company, role, jobDescription, experienceLevel, candidateProfile,
      skillGap, interviewType, jobPreparationPlan, readinessTwin,
      previousHistory, previousMistakes,
    } = ctx;

    const strongSkills = skillGap.strongSkills || [];
    const missingSkills = skillGap.missingSkills || [];
    const needsPractice = skillGap.needsPractice || [];
    const projects = candidateProfile.projects || [];
    const experience = candidateProfile.experience || [];
    const previousTopics = previousHistory.flatMap(h =>
      (h.answers || []).map(a => a.topic).filter(Boolean)
    );
    const weakTopics = previousMistakes.filter(m => !m.resolved).map(m => m.topic);

    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        });

        const prompt = `You are PrepAgent AI's Interview Planning Agent.
Your job is to create a structured interview plan for a ${interviewType} mock interview.

CANDIDATE CONTEXT:
- Company: ${company}
- Role: ${role}
- Experience Level: ${experienceLevel}
- Interview Type: ${interviewType}
- Job Description: ${(jobDescription || '').slice(0, 600)}
- Strong Skills: ${strongSkills.join(', ') || 'Not specified'}
- Missing Skills: ${missingSkills.join(', ') || 'None identified'}
- Needs Practice: ${needsPractice.join(', ') || 'None identified'}
- Projects: ${projects.map(p => p.name).join(', ') || 'None listed'}
- Experience: ${experience.map(e => e.role + ' at ' + e.company).join('; ') || 'Fresher'}
- Previously Tested Topics: ${previousTopics.slice(0, 10).join(', ') || 'First interview'}
- Known Weak Topics from History: ${weakTopics.join(', ') || 'None'}

INTERVIEW TYPE FOCUS:
- Technical: focus on technical knowledge, project implementation, skill gaps, system design, coding
- HR: focus on behavioral questions, motivation, teamwork, conflict, leadership, communication
- Mixed: dynamically balance all types

NOTE ON COMPANY PATTERNS: Use only the candidate's actual data (resume, skill gaps, JD). Do NOT invent company-specific questions. Do NOT claim to know what the company actually asks. Company context is used only to calibrate role-appropriate difficulty and topic relevance.

Create a concrete interview plan.

Return ONLY valid JSON:
{
  "objectives": ["Cover X", "Test Y", "Probe Z"],
  "estimatedDurationMinutes": 25,
  "topicPriorities": [{ "topic": "...", "priority": "High"|"Medium"|"Low", "category": "Technical"|"Resume"|"SkillGap"|"Behavioral"|"HR" }],
  "difficultyRange": { "start": "Easy"|"Medium"|"Hard", "max": "Medium"|"Hard" },
  "questionStrategy": "Brief description of question selection strategy",
  "coverageRequirements": {
    "technical": 30,
    "resume": 20,
    "skillGap": 25,
    "behavioral": 25
  },
  "companyPatternNote": "Short note: using candidate data only; no company-specific pattern data available at this time."
}`;

        const res = await model.generateContent(prompt);
        const parsed = JSON.parse(res.response.text());
        if (parsed && Array.isArray(parsed.objectives) && parsed.objectives.length > 0) {
          return this._validatePlan(parsed, ctx);
        }
      } catch (err) {
        console.warn('[InterviewPlanningAgent] Gemini error, using fallback:', err.message);
      }
    }

    return this._fallbackPlan(ctx);
  }

  _validatePlan(parsed, ctx) {
    const { interviewType } = ctx;
    const technicalPct = interviewType === 'Technical' ? 55 : interviewType === 'HR' ? 10 : 30;
    const behavioralPct = interviewType === 'HR' ? 60 : interviewType === 'Technical' ? 10 : 25;
    return {
      objectives: Array.isArray(parsed.objectives) ? parsed.objectives.slice(0, 8) : ['Cover technical fundamentals', 'Test resume claims', 'Assess communication'],
      estimatedDurationMinutes: typeof parsed.estimatedDurationMinutes === 'number' ? Math.max(15, Math.min(60, parsed.estimatedDurationMinutes)) : 25,
      topicPriorities: Array.isArray(parsed.topicPriorities) ? parsed.topicPriorities : [],
      difficultyRange: parsed.difficultyRange || { start: 'Medium', max: 'Hard' },
      questionStrategy: typeof parsed.questionStrategy === 'string' ? parsed.questionStrategy : 'Adaptive strategy based on candidate profile',
      coverageRequirements: parsed.coverageRequirements || { technical: technicalPct, resume: 20, skillGap: 25, behavioral: behavioralPct },
      companyPatternNote: parsed.companyPatternNote || 'Using candidate preparation data only.',
    };
  }

  _fallbackPlan(ctx) {
    const { interviewType, skillGap, candidateProfile } = ctx;
    const projects = candidateProfile.projects || [];
    const missingSkills = skillGap.missingSkills || [];
    const objectives = [];

    if (interviewType === 'Technical' || interviewType === 'Mixed') {
      objectives.push('Assess core technical knowledge for the role');
      objectives.push('Probe understanding of candidate\'s tech stack');
      if (missingSkills.length > 0) objectives.push(`Test skill gap areas: ${missingSkills.slice(0, 2).join(', ')}`);
    }
    if (projects.length > 0) objectives.push(`Evaluate resume claims for project: ${projects[0].name}`);
    if (interviewType === 'HR' || interviewType === 'Mixed') {
      objectives.push('Assess behavioral competencies using STAR format');
      objectives.push('Evaluate motivation, teamwork, and communication');
    }
    if (objectives.length === 0) objectives.push('Conduct comprehensive interview assessment');

    const isHR = interviewType === 'HR';
    const isTech = interviewType === 'Technical';
    return {
      objectives,
      estimatedDurationMinutes: isHR ? 20 : isTech ? 25 : 30,
      topicPriorities: [],
      difficultyRange: { start: 'Medium', max: 'Hard' },
      questionStrategy: `Adaptive ${interviewType} interview strategy`,
      coverageRequirements: {
        technical: isTech ? 55 : isHR ? 10 : 30,
        resume: 20,
        skillGap: isTech ? 25 : isHR ? 5 : 20,
        behavioral: isHR ? 60 : isTech ? 10 : 25,
      },
      companyPatternNote: 'Using candidate preparation data only. No external company pattern source available.',
    };
  }
}

// ============================================================
// AGENT B: Answer Evaluation Agent
// ============================================================
class AnswerEvaluationAgent {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async evaluate({ question, category, topic, candidateAnswer, interviewType, targetRole, company }) {
    const answerText = (candidateAnswer || '').trim();

    if (!answerText || answerText.length < 15) {
      return this._emptyAnswerResult();
    }

    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        });

        const isBehavioral = ['Behavioral', 'HR'].includes(category);
        const isCoding = category === 'Coding';

        const prompt = `You are PrepAgent AI's Answer Evaluation Agent.
Evaluate this candidate's interview answer strictly and fairly.

Context:
- Role: ${targetRole} at ${company}
- Question: "${question}"
- Category: ${category} (Topic: ${topic})
- Interview Type: ${interviewType}
- Candidate Answer: "${answerText}"

Evaluate ALL of the following dimensions (0-100 score each):
Common (ALL questions):
- relevance: How relevant is the answer to the question asked?
- technicalAccuracy: How technically correct is the information provided?
- completeness: How completely does the answer address the question?
- communication: How clear and articulate is the answer?
- clarity: How easy is it to understand the answer?
- structure: How well-organized is the answer?
- conceptualUnderstanding: Does the candidate understand the concept, not just recall it?
- practicalUnderstanding: Does the candidate show practical/hands-on knowledge?
- depth: How deeply does the candidate explain the topic?
- roleRelevance: How relevant is this to the actual role requirements?

${isBehavioral ? `Behavioral/HR (ADDITIONAL for behavioral questions):
- situationClarity: Was the situation clearly described?
- actionClarity: Were the actions taken clearly explained?
- resultClarity: Were the results/outcomes clearly stated?
- ownership: Did the candidate show personal ownership/responsibility?
- behavioralRelevance: Is the example relevant to the behavioral trait being assessed?` : ''}

${isCoding ? `Coding (ADDITIONAL for coding questions):
- approach: Was the approach to solving the problem sound?
- correctness: Is the solution correct?
- complexity: Does the candidate understand time/space complexity?
- edgeCases: Did the candidate consider edge cases?` : ''}

Return ONLY valid JSON:
{
  "relevance": 0-100,
  "technicalAccuracy": 0-100,
  "completeness": 0-100,
  "communication": 0-100,
  "clarity": 0-100,
  "structure": 0-100,
  "conceptualUnderstanding": 0-100,
  "practicalUnderstanding": 0-100,
  "depth": 0-100,
  "roleRelevance": 0-100,
  ${isBehavioral ? '"situationClarity": 0-100, "actionClarity": 0-100, "resultClarity": 0-100, "ownership": 0-100, "behavioralRelevance": 0-100,' : ''}
  ${isCoding ? '"approach": 0-100, "correctness": 0-100, "complexity": 0-100, "edgeCases": 0-100,' : ''}
  "quality": "Strong"|"Partial"|"Weak",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "weaknesses": ["Specific area needing improvement"],
  "missedConcepts": ["Key concept that was not mentioned but should have been"],
  "feedback": "1-2 sentence constructive coaching tip (not shown during interview)."
}`;

        const res = await model.generateContent(prompt);
        const parsed = JSON.parse(res.response.text());
        if (parsed && typeof parsed.relevance === 'number') {
          return this._normalizeEvaluation(parsed);
        }
      } catch (err) {
        console.warn('[AnswerEvaluationAgent] Gemini error, using fallback:', err.message);
      }
    }

    return this._deterministicEvaluation(answerText);
  }

  _normalizeEvaluation(parsed) {
    const coreScore = [
      parsed.relevance, parsed.technicalAccuracy, parsed.completeness,
      parsed.communication, parsed.depth, parsed.conceptualUnderstanding
    ].filter(v => typeof v === 'number');
    const avg = coreScore.reduce((a, b) => a + b, 0) / coreScore.length;
    const quality = avg >= 78 ? 'Strong' : avg >= 58 ? 'Partial' : 'Weak';
    return {
      ...parsed,
      quality: ['Strong', 'Partial', 'Weak'].includes(parsed.quality) ? parsed.quality : quality,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      missedConcepts: Array.isArray(parsed.missedConcepts) ? parsed.missedConcepts : [],
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    };
  }

  _deterministicEvaluation(answerText) {
    const wordCount = answerText.split(/\s+/).length;
    let base = wordCount > 80 ? 78 : wordCount > 40 ? 70 : wordCount > 20 ? 60 : 45;
    const quality = base >= 75 ? 'Strong' : base >= 60 ? 'Partial' : 'Weak';
    return {
      relevance: base + 5, technicalAccuracy: base, completeness: base - 2,
      communication: base + 3, clarity: base + 2, structure: base,
      conceptualUnderstanding: base - 3, practicalUnderstanding: base - 2,
      depth: base - 5, roleRelevance: base + 2,
      quality,
      strengths: ['Candidate provided an answer demonstrating awareness of the topic.'],
      weaknesses: wordCount < 30 ? ['Answer was brief; more detail would demonstrate deeper understanding.'] : ['Consider providing specific examples or trade-offs.'],
      missedConcepts: [],
      feedback: quality === 'Strong' ? 'Solid answer with good coverage.' : 'Add more specific examples and mechanisms to strengthen your answer.',
    };
  }

  _emptyAnswerResult() {
    return {
      relevance: 30, technicalAccuracy: 25, completeness: 20,
      communication: 35, clarity: 30, structure: 25,
      conceptualUnderstanding: 20, practicalUnderstanding: 20,
      depth: 15, roleRelevance: 25,
      quality: 'Weak',
      strengths: [],
      weaknesses: ['No substantive answer was provided.'],
      missedConcepts: [],
      feedback: 'Please provide a detailed answer. Even a partial response helps demonstrate your thinking process.',
    };
  }
}

// ============================================================
// AGENT C: Mistake / Progress Agent
// ============================================================
class MistakeProgressAgent {
  updateMemory(existingMemory, { topic, category, evaluation, questionId }) {
    const quality = evaluation.quality;
    const score = Math.round(
      (evaluation.relevance + evaluation.technicalAccuracy + evaluation.completeness + evaluation.depth) / 4
    );

    let memory = Array.isArray(existingMemory) ? [...existingMemory] : [];
    const existingIdx = memory.findIndex(
      m => m.topic && m.topic.toLowerCase() === (topic || '').toLowerCase()
    );

    if (quality === 'Weak' || quality === 'Partial') {
      const severity = quality === 'Weak' ? 'High' : 'Medium';
      const weakness = (evaluation.weaknesses || []).join('; ');

      if (existingIdx >= 0) {
        const existing = memory[existingIdx];
        const trend = score > (existing.lastScore || 0) + 5 ? 'improving'
          : score < (existing.lastScore || 0) - 5 ? 'declining' : 'stable';
        memory[existingIdx] = {
          ...existing,
          occurrenceCount: (existing.occurrenceCount || 1) + 1,
          lastSeenAt: new Date(),
          lastScore: score,
          trend,
          severity: severity,
          weakness: weakness || existing.weakness,
          resolved: false,
        };
      } else {
        memory.push({
          topic: topic || 'Unknown',
          category: category || 'General',
          weakness,
          severity,
          occurrenceCount: 1,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          lastScore: score,
          trend: 'new',
          resolved: false,
        });
      }
    } else if (quality === 'Strong' && existingIdx >= 0) {
      // Mark as improving or resolved
      const existing = memory[existingIdx];
      memory[existingIdx] = {
        ...existing,
        occurrenceCount: (existing.occurrenceCount || 1) + 1,
        lastSeenAt: new Date(),
        lastScore: score,
        trend: 'improving',
        resolved: score >= 80,
      };
    }

    return memory;
  }

  getWeakTopics(memory) {
    return (memory || []).filter(m => !m.resolved && m.severity !== 'Low').map(m => m.topic);
  }

  getHighPriorityMistakes(memory, limit = 3) {
    return (memory || [])
      .filter(m => !m.resolved)
      .sort((a, b) => (b.occurrenceCount || 0) - (a.occurrenceCount || 0))
      .slice(0, limit);
  }
}

// ============================================================
// AGENT D: Interview Agent — Decision + Question Generation
// ============================================================
class InterviewAgent {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async decide(ctx) {
    const {
      currentQuestion, latestAnswer, latestEvaluation, previousQuestions,
      coveredTopics, objectives, skillGap, candidateProfile, previousMistakes,
      difficultyState, interviewType, estimatedDurationMinutes, elapsedMinutes,
      plan, company, role,
    } = ctx;

    const coverage = ctx.coverage || {};
    const overallCoverage = coverage.overall || 0;
    const questionsAsked = previousQuestions.length;
    const weakTopicsToTest = (previousMistakes || [])
      .filter(m => !m.resolved && m.occurrenceCount >= 1)
      .map(m => m.topic);

    // Hard stop conditions (checked before Gemini)
    const timeExceeded = elapsedMinutes >= (estimatedDurationMinutes || 25) * 1.2;
    const sufficientCoverage = overallCoverage >= 75 && questionsAsked >= 6;
    const veryDeep = questionsAsked >= 20;

    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.25 },
        });

        const quality = latestEvaluation?.quality || 'Partial';
        const coveredTopicsList = (coveredTopics || []).slice(-8).join(', ');
        const uncoveredObjectives = (objectives || []).filter(
          obj => !(coveredTopics || []).some(t => t.toLowerCase().includes(obj.toLowerCase().slice(0, 15)))
        ).slice(0, 4);

        const prompt = `You are PrepAgent AI's Interview Agent. Your job is to decide what happens NEXT in a live interview.

CURRENT INTERVIEW STATE:
- Interview Type: ${interviewType}
- Questions Asked: ${questionsAsked}
- Elapsed: ${Math.round(elapsedMinutes)} min / Estimated: ${estimatedDurationMinutes} min
- Overall Coverage: ${Math.round(overallCoverage)}%
- Current Difficulty: ${difficultyState}
- Covered Topics: ${coveredTopicsList || 'None yet'}
- Uncovered Objectives: ${uncoveredObjectives.join('; ') || 'Most covered'}
- Weak Topics from History: ${weakTopicsToTest.join(', ') || 'None'}
- Strong Skills: ${(skillGap.strongSkills || []).slice(0, 5).join(', ')}
- Missing Skills: ${(skillGap.missingSkills || []).slice(0, 5).join(', ')}

LAST QUESTION:
"${currentQuestion?.question || 'N/A'}" (Category: ${currentQuestion?.category}, Topic: ${currentQuestion?.topic})

CANDIDATE'S LAST ANSWER:
"${(latestAnswer || '').slice(0, 400)}"

EVALUATION OF LAST ANSWER:
- Quality: ${quality}
- Key Weaknesses: ${(latestEvaluation?.weaknesses || []).join('; ')}
- Missed Concepts: ${(latestEvaluation?.missedConcepts || []).join('; ')}

DECISION RULES:
- If answer is Weak and topic is important: consider FOLLOW_UP or EASIER
- If answer is Strong: consider HARDER, NEW_TOPIC, or topic change
- If answer is Partial: consider FOLLOW_UP or same-category NEW_TOPIC
- For HR interview type: prefer HR, BEHAVIORAL actions
- For Technical interview type: prefer TECHNICAL, RESUME, PROJECT, SKILL_GAP, CODING
- For Mixed: balance all types
- If important weak topics from history exist: SKILL_GAP or NEW_TOPIC with that topic
- COMPLETE only if: coverage >= 75% AND questions >= 6 AND sufficient evidence exists
- Do NOT complete early just because answer is weak
- ${timeExceeded ? 'TIME EXCEEDED: Strongly prefer COMPLETE unless absolutely necessary to continue.' : ''}
- ${sufficientCoverage ? 'SUFFICIENT COVERAGE: Can complete if appropriate.' : 'Continue building coverage.'}

NEXT_ACTION must be EXACTLY ONE of:
FOLLOW_UP | EASIER | HARDER | NEW_TOPIC | RESUME | PROJECT | TECHNICAL | CODING | BEHAVIORAL | HR | SKILL_GAP | COMPLETE

Return ONLY valid JSON:
{
  "nextAction": "...",
  "reasoning": "Brief machine-readable reason (1-2 sentences max, not shown to user)",
  "questionCategory": "Technical"|"Project"|"Skill Gap"|"Behavioral"|"HR"|"Coding"|"Resume",
  "topic": "Specific topic for next question",
  "difficulty": "Easy"|"Medium"|"Hard",
  "source": "resume"|"job_description"|"skill_gap"|"previous_answer"|"project"|"behavioral"|"preparation_plan",
  "whySelected": "Short reason for this topic selection",
  "expectedEvidence": ["What a good answer should include"],
  "isWeaknessVerification": true|false,
  "shouldComplete": true|false,
  "completionReason": "If shouldComplete is true, brief reason",
  "avatarBehavior": {
    "expression": "neutral"|"smile"|"attentive"|"thinking"|"encouraging"|"serious/professional",
    "gesture": "open_hand_explanation"|"small_hand_emphasis"|"two_hand_explanation"|"listening_hands"|"neutral_hands",
    "headMovement": "subtle_nod"|"speaking_movement"|"listening_nod",
    "emotion": "engaged"|"thoughtful"|"supportive"
  }
}`;

        const res = await model.generateContent(prompt);
        const parsed = JSON.parse(res.response.text());
        if (parsed && parsed.nextAction) {
          return this._validateDecision(parsed, { timeExceeded, sufficientCoverage, veryDeep });
        }
      } catch (err) {
        console.warn('[InterviewAgent] decide() Gemini error:', err.message);
      }
    }

    return this._fallbackDecision(ctx, { timeExceeded, sufficientCoverage, veryDeep });
  }

  _validateDecision(parsed, flags) {
    const validActions = ['FOLLOW_UP', 'EASIER', 'HARDER', 'NEW_TOPIC', 'RESUME', 'PROJECT', 'TECHNICAL', 'CODING', 'BEHAVIORAL', 'HR', 'SKILL_GAP', 'COMPLETE'];
    const validExpressions = ['neutral', 'smile', 'attentive', 'thinking', 'encouraging', 'serious/professional'];
    const validGestures = ['open_hand_explanation', 'pointing', 'small_hand_emphasis', 'two_hand_explanation', 'listening_hands', 'neutral_hands', 'welcoming_gesture'];
    const validHeadMovements = ['subtle_nod', 'slight_tilt', 'idle_movement', 'speaking_movement', 'listening_nod'];

    let nextAction = validActions.includes(parsed.nextAction) ? parsed.nextAction : 'NEW_TOPIC';
    if (flags.veryDeep) nextAction = 'COMPLETE';
    const shouldComplete = nextAction === 'COMPLETE' || parsed.shouldComplete === true;

    return {
      nextAction,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 200) : 'Adaptive decision based on interview state.',
      questionCategory: parsed.questionCategory || 'Technical',
      topic: parsed.topic || 'Core Engineering',
      difficulty: ['Easy', 'Medium', 'Hard'].includes(parsed.difficulty) ? parsed.difficulty : 'Medium',
      source: parsed.source || 'job_description',
      whySelected: typeof parsed.whySelected === 'string' ? parsed.whySelected : '',
      expectedEvidence: Array.isArray(parsed.expectedEvidence) ? parsed.expectedEvidence : [],
      isWeaknessVerification: Boolean(parsed.isWeaknessVerification),
      shouldComplete,
      completionReason: typeof parsed.completionReason === 'string' ? parsed.completionReason : '',
      avatarBehavior: {
        expression: validExpressions.includes(parsed.avatarBehavior?.expression) ? parsed.avatarBehavior.expression : 'attentive',
        gesture: validGestures.includes(parsed.avatarBehavior?.gesture) ? parsed.avatarBehavior.gesture : 'open_hand_explanation',
        headMovement: validHeadMovements.includes(parsed.avatarBehavior?.headMovement) ? parsed.avatarBehavior.headMovement : 'speaking_movement',
        emotion: parsed.avatarBehavior?.emotion || 'engaged',
      },
    };
  }

  _fallbackDecision(ctx, flags) {
    const { latestEvaluation, interviewType, coveredTopics, objectives, questionsAsked } = ctx;
    const qualityMap = { quality: latestEvaluation?.quality };
    const nTopics = (coveredTopics || []).length;

    if (flags.timeExceeded || flags.veryDeep) {
      return { nextAction: 'COMPLETE', reasoning: 'Estimated duration or question limit reached.', questionCategory: 'Technical', topic: 'Summary', difficulty: 'Medium', source: 'job_description', whySelected: '', expectedEvidence: [], isWeaknessVerification: false, shouldComplete: true, completionReason: 'Sufficient interview time elapsed.', avatarBehavior: { expression: 'smile', gesture: 'welcoming_gesture', headMovement: 'subtle_nod', emotion: 'engaged' } };
    }

    const quality = latestEvaluation?.quality || 'Partial';
    let nextAction = 'NEW_TOPIC';
    if (quality === 'Weak' && ctx.currentQuestion?.category !== 'Behavioral') nextAction = 'FOLLOW_UP';
    else if (quality === 'Strong') nextAction = 'HARDER';

    const isHR = interviewType === 'HR';
    const category = isHR ? 'HR' : 'Technical';
    const source = isHR ? 'behavioral' : 'job_description';

    return { nextAction, reasoning: 'Fallback adaptive decision.', questionCategory: category, topic: 'Core Engineering', difficulty: quality === 'Weak' ? 'Easy' : quality === 'Strong' ? 'Hard' : 'Medium', source, whySelected: '', expectedEvidence: [], isWeaknessVerification: false, shouldComplete: false, completionReason: '', avatarBehavior: { expression: 'attentive', gesture: 'open_hand_explanation', headMovement: 'speaking_movement', emotion: 'engaged' } };
  }

  async generateQuestion(ctx) {
    const {
      decision, company, role, experienceLevel, interviewType, candidateProfile,
      skillGap, previousQuestions, currentQuestion, latestAnswer, latestEvaluation, plan,
      previousMistakes,
    } = ctx;

    const { nextAction, topic, difficulty, questionCategory, source, isWeaknessVerification, expectedEvidence } = decision;
    const previousQTexts = (previousQuestions || []).map(q => q.question);
    const projects = candidateProfile.projects || [];
    const missingSkills = skillGap.missingSkills || [];
    const weakTopics = (previousMistakes || []).filter(m => !m.resolved).map(m => m.topic);

    if (this.apiKey && this.apiKey.trim().length > 0) {
      let attempts = 0;
      while (attempts < 3) {
        attempts++;
        try {
          const genAI = new GoogleGenerativeAI(this.apiKey);
          const model = genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: { responseMimeType: 'application/json', temperature: 0.35 },
          });

          const actionContext = this._getActionContext(nextAction, currentQuestion, latestAnswer, latestEvaluation, topic);

          const prompt = `You are PrepAgent AI's AI Interviewer (Sarah). Generate ONE perfect interview question.

INTERVIEW CONTEXT:
- Role: ${role} at ${company}
- Experience Level: ${experienceLevel}
- Interview Type: ${interviewType}
- Decision: ${nextAction} (${actionContext})
- Target Topic: ${topic}
- Category: ${questionCategory}
- Required Difficulty: ${difficulty}
- Source: ${source}
- Is Weakness Verification: ${isWeaknessVerification}
- Expected Evidence: ${expectedEvidence.join(', ')}

CANDIDATE INFO:
- Projects: ${projects.map(p => `"${p.name}": ${(p.description || '').slice(0, 100)}`).join('; ')}
- Missing Skills: ${missingSkills.join(', ')}
- Known Weak Topics: ${weakTopics.join(', ')}

${latestAnswer ? `LAST ANSWER BY CANDIDATE:
"${(latestAnswer || '').slice(0, 300)}"
Last Evaluation Quality: ${latestEvaluation?.quality}
Weaknesses: ${(latestEvaluation?.weaknesses || []).join('; ')}
Missed: ${(latestEvaluation?.missedConcepts || []).join('; ')}` : ''}

PREVIOUSLY ASKED (DO NOT REPEAT):
${previousQTexts.slice(-8).map((q, i) => `${i + 1}. ${q}`).join('\n') || 'None'}

QUESTION RULES:
1. Generate EXACTLY ONE complete question (12-30 words)
2. MUST end with a question mark
3. Must be specific, contextual, and grounded in the candidate's actual resume/skills
4. Never repeat or closely paraphrase a previous question
5. Never accuse or embarrass the candidate
6. For FOLLOW_UP: probe the specific gap in the last answer
7. For EASIER: simplify the topic from the last question
8. For HARDER: deepen the last topic or ask about edge cases
9. For SKILL_GAP: directly test a missing/weak skill
10. For RESUME: ask about a specific project, technology or experience claim from the resume
11. For BEHAVIORAL/HR: use situational or STAR format
12. For CODING: ask about algorithms, data structures, or problem-solving approach

Also generate a contextual silence hint (1 sentence, does NOT reveal the answer, just guides the candidate on where to start).

Return ONLY valid JSON:
{
  "question": "Complete, natural interview question ending with ?",
  "category": "Technical"|"Project"|"Skill Gap"|"Behavioral"|"HR"|"Coding"|"Resume",
  "topic": "Specific topic",
  "difficulty": "Easy"|"Medium"|"Hard",
  "source": "resume"|"job_description"|"skill_gap"|"previous_answer"|"project"|"behavioral",
  "reason": "Why this question was selected",
  "expectedFocus": ["Key concept 1", "Key concept 2"],
  "hint": "One sentence to guide candidate if they become silent (does NOT reveal answer)",
  "silenceHint": "A slightly different, more specific hint if silence persists longer",
  "avatarBehavior": {
    "expression": "neutral"|"smile"|"attentive"|"thinking"|"encouraging"|"serious/professional",
    "gesture": "open_hand_explanation"|"small_hand_emphasis"|"two_hand_explanation"|"listening_hands"|"neutral_hands"|"welcoming_gesture",
    "headMovement": "subtle_nod"|"speaking_movement"|"listening_nod",
    "emotion": "engaged"|"thoughtful"|"supportive"
  }
}`;

          const res = await model.generateContent(prompt);
          const parsed = JSON.parse(res.response.text());
          if (parsed && parsed.question && this._isValidQuestion(parsed.question, previousQuestions)) {
            return this._buildQuestionObject(parsed, decision, previousQuestions.length + 1);
          }
        } catch (err) {
          console.warn(`[InterviewAgent] generateQuestion attempt ${attempts} error:`, err.message);
        }
      }
    }

    return this._deterministicQuestion(ctx);
  }

  _getActionContext(nextAction, currentQuestion, latestAnswer, evaluation, topic) {
    switch (nextAction) {
      case 'FOLLOW_UP': return `Follow up on weak/partial answer about "${currentQuestion?.topic || topic}"`;
      case 'EASIER': return `Simplify from last question on "${currentQuestion?.topic || topic}"`;
      case 'HARDER': return `Deepen or extend from strong answer on "${currentQuestion?.topic || topic}"`;
      case 'RESUME': return 'Ask about a specific resume claim or project';
      case 'PROJECT': return 'Deep dive into project architecture or implementation';
      case 'SKILL_GAP': return `Test identified skill gap: ${topic}`;
      case 'BEHAVIORAL': return 'Ask STAR-format behavioral question';
      case 'HR': return 'Ask HR/motivational question';
      case 'CODING': return 'Ask problem-solving or coding approach question';
      default: return `New topic: ${topic}`;
    }
  }

  _isValidQuestion(question, previousQuestions = []) {
    if (!question || typeof question !== 'string') return false;
    const trimmed = question.trim();
    if (trimmed.length < 25 || !trimmed.endsWith('?')) return false;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 10) return false;
    if (/^(1\.|2\.|q1:|question 1:)/i.test(trimmed)) return false;
    const lower = trimmed.toLowerCase();
    return !previousQuestions.some(prev => {
      const prevText = typeof prev === 'string' ? prev : prev.question || '';
      return prevText.toLowerCase().trim() === lower;
    });
  }

  _buildQuestionObject(parsed, decision, questionIndex) {
    const validExpressions = ['neutral', 'smile', 'attentive', 'thinking', 'surprised', 'encouraging', 'serious/professional'];
    const validGestures = ['open_hand_explanation', 'pointing', 'small_hand_emphasis', 'two_hand_explanation', 'listening_hands', 'neutral_hands', 'welcoming_gesture'];
    const validHeadMovements = ['subtle_nod', 'slight_tilt', 'idle_movement', 'speaking_movement', 'listening_nod'];
    const ab = parsed.avatarBehavior || {};

    return {
      id: `q-${Date.now()}-${questionIndex}`,
      question: parsed.question.trim(),
      category: parsed.category || decision.questionCategory || 'Technical',
      topic: parsed.topic || decision.topic || 'Core Engineering',
      difficulty: ['Easy', 'Medium', 'Hard'].includes(parsed.difficulty) ? parsed.difficulty : decision.difficulty || 'Medium',
      source: parsed.source || decision.source || 'job_description',
      reason: parsed.reason || decision.whySelected || 'Selected based on interview state.',
      expectedFocus: Array.isArray(parsed.expectedFocus) ? parsed.expectedFocus : decision.expectedEvidence || [],
      hint: typeof parsed.hint === 'string' ? parsed.hint : 'Take your time. Share your understanding of the topic.',
      silenceHint: typeof parsed.silenceHint === 'string' ? parsed.silenceHint : '',
      isFollowUp: ['FOLLOW_UP', 'EASIER', 'HARDER'].includes(decision.nextAction),
      nextAction: decision.nextAction,
      avatarBehavior: {
        expression: validExpressions.includes(ab.expression) ? ab.expression : 'attentive',
        gesture: validGestures.includes(ab.gesture) ? ab.gesture : 'open_hand_explanation',
        headMovement: validHeadMovements.includes(ab.headMovement) ? ab.headMovement : 'speaking_movement',
        emotion: ab.emotion || 'engaged',
      },
    };
  }

  _deterministicQuestion(ctx) {
    const { decision, company, role, candidateProfile, skillGap, previousQuestions } = ctx;
    const { nextAction, topic, difficulty, questionCategory } = decision;
    const projects = candidateProfile.projects || [];
    const missingSkills = skillGap.missingSkills || [];
    const pName = projects[0]?.name || 'your primary project';
    const missingTopic = missingSkills[0] || topic || 'system architecture';
    const qi = (previousQuestions || []).length + 1;

    const fallbacks = {
      FOLLOW_UP: `Building on your previous response, could you walk me through the specific technical mechanisms and explain why you chose that approach over alternative solutions?`,
      EASIER: `Let\'s revisit the concept: could you explain the fundamental purpose of ${topic || 'this technology'} and describe a practical scenario where you would use it?`,
      HARDER: `Given your experience, how would you design a production-grade system using ${topic || 'this technology'} that handles high concurrency, fault tolerance, and horizontal scaling?`,
      RESUME: `Looking at your resume, you mentioned working on "${pName}" — could you walk me through the technical architecture and your specific contributions to that project?`,
      PROJECT: `In your project "${pName}", what was the most challenging technical problem you faced, and how did you diagnose and resolve it systematically?`,
      TECHNICAL: `Can you explain how ${topic || 'this technology'} works under the hood and describe a real scenario where you applied it to solve a production problem?`,
      CODING: `How would you design an efficient algorithm to solve a search and retrieval problem, and what time and space complexity trade-offs would you consider?`,
      SKILL_GAP: `${company} requires proficiency in ${missingTopic} — how would you approach designing a solution using ${missingTopic} in a production environment?`,
      BEHAVIORAL: `Can you describe a specific situation where you had a technical disagreement with a colleague, explain the steps you took to resolve it, and share the outcome?`,
      HR: `Why are you interested in joining ${company} as a ${role}, and what specific technical challenges here align with your long-term career aspirations?`,
      NEW_TOPIC: `Can you explain how you would approach building a reliable, scalable backend service for ${role} at ${company} using your primary tech stack?`,
    };

    const questionText = fallbacks[nextAction] || fallbacks.NEW_TOPIC;

    return {
      id: `q-${Date.now()}-${qi}`,
      question: questionText,
      category: questionCategory || 'Technical',
      topic: topic || 'Core Engineering',
      difficulty: difficulty || 'Medium',
      source: 'job_description',
      reason: `Contextual fallback for ${nextAction} decision.`,
      expectedFocus: ['practical implementation', 'technical reasoning'],
      hint: 'Take your time. Start with the core concept, then describe your practical experience.',
      silenceHint: `You might start by explaining what you know about ${topic || 'this topic'} from your own experience.`,
      isFollowUp: ['FOLLOW_UP', 'EASIER', 'HARDER'].includes(nextAction),
      nextAction,
      avatarBehavior: {
        expression: 'attentive',
        gesture: 'open_hand_explanation',
        headMovement: 'speaking_movement',
        emotion: 'engaged',
      },
    };
  }
}

// ============================================================
// AGENT E: Final Evaluation Agent
// ============================================================
class FinalEvaluationAgent {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generate(ctx) {
    const {
      answers, questions, objectives, interviewType, candidateProfile,
      skillGap, previousMistakes, company, role, startedAt, endedAt, coverage,
    } = ctx;

    const durationSeconds = endedAt && startedAt
      ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)
      : answers.length * 120;
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    // Compute per-category scores from stored evaluations
    const categoryGroups = {};
    answers.forEach(ans => {
      const cat = ans.category || 'Technical';
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      const ev = ans.answerAnalysis || {};
      const scores = [ev.relevance, ev.technicalAccuracy, ev.completeness, ev.communication, ev.depth, ev.conceptualUnderstanding].filter(v => typeof v === 'number');
      if (scores.length > 0) categoryGroups[cat].push(scores.reduce((a, b) => a + b, 0) / scores.length);
    });

    const categoryScores = {};
    for (const [cat, scores] of Object.entries(categoryGroups)) {
      categoryScores[cat] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    }

    const allScores = Object.values(categoryScores);
    const overallScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 60;

    // Collect strengths and weaknesses across all answers
    const allStrengths = answers.flatMap(a => a.answerAnalysis?.strengths || []).filter(Boolean);
    const allWeaknesses = answers.flatMap(a => a.answerAnalysis?.weaknesses || []).filter(Boolean);
    const allMissed = answers.flatMap(a => a.answerAnalysis?.missedConcepts || []).filter(Boolean);

    // Unique topics covered
    const uniqueTopics = [...new Set(answers.map(a => a.topic).filter(Boolean))];

    // Skill gap performance
    const testedSkills = (skillGap.missingSkills || []).filter(skill =>
      answers.some(a => (a.topic || '').toLowerCase().includes(skill.toLowerCase().slice(0, 10)))
    );
    const skillGapPerformance = testedSkills.map(skill => {
      const relevantAnswers = answers.filter(a => (a.topic || '').toLowerCase().includes(skill.toLowerCase().slice(0, 10)));
      const avgScore = relevantAnswers.length > 0
        ? Math.round(relevantAnswers.reduce((s, a) => s + ((a.answerAnalysis?.relevance || 0) + (a.answerAnalysis?.technicalAccuracy || 0)) / 2, 0) / relevantAnswers.length)
        : 0;
      const prevMistake = (previousMistakes || []).find(m => m.topic && m.topic.toLowerCase().includes(skill.toLowerCase().slice(0, 10)));
      return {
        skill,
        score: avgScore,
        previousScore: prevMistake?.lastScore || null,
        improvement: prevMistake ? (avgScore > (prevMistake.lastScore || 0) ? 'Improved' : avgScore < (prevMistake.lastScore || 0) ? 'Declined' : 'Stable') : 'First Attempt',
        wasWeakPreviously: Boolean(prevMistake),
      };
    });

    // Question-by-question with follow-up chains
    const questionReport = answers.map((ans, idx) => {
      const followUpAnswer = ans.isFollowUp ? answers[idx - 1] : null;
      return {
        questionNumber: idx + 1,
        questionId: ans.questionId,
        question: ans.question,
        category: ans.category,
        topic: ans.topic,
        difficulty: ans.difficulty,
        source: ans.source,
        reason: questions[idx]?.reason || '',
        answer: ans.answer,
        isFollowUp: ans.isFollowUp || false,
        parentQuestionId: ans.parentQuestionId || null,
        nextAction: ans.nextAction || '',
        evaluation: ans.answerAnalysis || {},
        durationSeconds: ans.durationSeconds,
      };
    });

    // Mistake evolution
    const mistakeEvolution = (previousMistakes || [])
      .filter(m => uniqueTopics.some(t => t.toLowerCase().includes((m.topic || '').toLowerCase().slice(0, 10))))
      .map(m => ({
        topic: m.topic,
        previousOccurrences: m.occurrenceCount,
        previousScore: m.lastScore,
        trend: m.trend,
        resolved: m.resolved,
      }));

    // Generate AI recommendations
    let recommendations = this._deterministicRecommendations(answers, skillGap, interviewType);
    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        });

        const weakAreas = answers
          .filter(a => a.answerAnalysis?.quality === 'Weak' || a.answerAnalysis?.quality === 'Partial')
          .map(a => `${a.topic}: ${(a.answerAnalysis?.weaknesses || []).join(', ')}`)
          .slice(0, 5);

        const prompt = `You are PrepAgent AI's Final Evaluation Agent.
Generate specific, actionable recommendations for a candidate who just completed a ${interviewType} interview for ${role} at ${company}.

Weak areas identified:
${weakAreas.join('\n')}

Missed concepts:
${allMissed.slice(0, 6).join(', ')}

For each weak area, provide a specific, actionable recommendation (not generic advice like 'study more').

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "area": "Specific topic/skill",
      "issue": "What was weak in the interview",
      "action": "Specific actionable step to improve",
      "priority": "High"|"Medium"|"Low"
    }
  ],
  "overallFeedback": "2-3 sentence overall assessment of the interview performance.",
  "strongPoints": ["Top 3 things the candidate did well"],
  "focusAreas": ["Top 3 areas to focus on for improvement"]
}`;

        const res = await model.generateContent(prompt);
        const parsed = JSON.parse(res.response.text());
        if (parsed && Array.isArray(parsed.recommendations)) {
          recommendations = parsed;
        }
      } catch (err) {
        console.warn('[FinalEvaluationAgent] Recommendations Gemini error:', err.message);
      }
    }

    const badgeText = overallScore >= 85 ? 'Exceptional Performance!' : overallScore >= 70 ? 'Good Performance!' : overallScore >= 55 ? 'Developing' : 'Needs Practice';
    const summary = overallScore >= 85
      ? 'Outstanding interview performance with strong technical depth and clear communication.'
      : overallScore >= 70
      ? 'Good overall performance. Some areas for improvement identified.'
      : 'Developing performance. Focused practice in identified areas will help significantly.';

    return {
      overallScore,
      badgeText,
      summary,
      durationMinutes,
      durationSeconds,
      questionsAnswered: answers.length,
      topicsCovered: uniqueTopics.length,
      interviewType,
      categoryScores,
      coverage: coverage || {},
      topStrengths: [...new Set(allStrengths)].slice(0, 5),
      topWeaknesses: [...new Set(allWeaknesses)].slice(0, 5),
      missedConcepts: [...new Set(allMissed)].slice(0, 8),
      resumePerformance: this._computeResumePerformance(answers, candidateProfile),
      skillGapPerformance,
      communicationAnalysis: this._computeCommunicationAnalysis(answers),
      questionByQuestion: questionReport,
      mistakeEvolution,
      recommendations,
      objectives: objectives || [],
    };
  }

  _computeResumePerformance(answers, candidateProfile) {
    const projects = candidateProfile.projects || [];
    return projects.map(project => {
      const relatedAnswers = answers.filter(a =>
        a.topic && (a.topic.toLowerCase().includes(project.name?.toLowerCase()?.slice(0, 10) || '')
          || a.source === 'resume' || a.source === 'project')
      );
      const avgScore = relatedAnswers.length > 0
        ? Math.round(relatedAnswers.reduce((s, a) => s + ((a.answerAnalysis?.relevance || 0) + (a.answerAnalysis?.technicalAccuracy || 0)) / 2, 0) / relatedAnswers.length)
        : null;
      return {
        projectName: project.name,
        questionsAsked: relatedAnswers.length,
        avgScore,
        knowledge: avgScore !== null ? (avgScore >= 75 ? 'Strong' : avgScore >= 55 ? 'Partial' : 'Weak') : 'Not Tested',
      };
    });
  }

  _computeCommunicationAnalysis(answers) {
    const commScores = answers.map(a => a.answerAnalysis?.communication || 0).filter(v => v > 0);
    const clarityScores = answers.map(a => a.answerAnalysis?.clarity || 0).filter(v => v > 0);
    const structureScores = answers.map(a => a.answerAnalysis?.structure || 0).filter(v => v > 0);
    const avg = arr => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return {
      overallCommunication: avg(commScores),
      clarity: avg(clarityScores),
      structure: avg(structureScores),
      avgAnswerLength: answers.length > 0
        ? Math.round(answers.reduce((s, a) => s + (a.answer || '').split(/\s+/).length, 0) / answers.length)
        : 0,
    };
  }

  _deterministicRecommendations(answers, skillGap, interviewType) {
    const weakAnswers = answers.filter(a => a.answerAnalysis?.quality === 'Weak');
    const recommendations = weakAnswers.slice(0, 3).map(a => ({
      area: a.topic || 'General',
      issue: (a.answerAnalysis?.weaknesses || ['Answer lacked depth']).join('; '),
      action: `Practice ${a.topic || 'this topic'} with hands-on exercises and review core concepts.`,
      priority: 'High',
    }));
    (skillGap.missingSkills || []).slice(0, 2).forEach(skill => {
      if (!recommendations.some(r => r.area.toLowerCase().includes(skill.toLowerCase()))) {
        recommendations.push({
          area: skill,
          issue: 'Identified as a missing skill in skill gap analysis',
          action: `Build foundational knowledge in ${skill} through project-based learning and practice exercises.`,
          priority: 'High',
        });
      }
    });
    return {
      recommendations,
      overallFeedback: 'Review the identified weak areas and focus on hands-on practice.',
      strongPoints: answers.filter(a => a.answerAnalysis?.quality === 'Strong').slice(0, 3).map(a => a.topic).filter(Boolean),
      focusAreas: weakAnswers.slice(0, 3).map(a => a.topic).filter(Boolean),
    };
  }
}

// ============================================================
// MAIN: MockInterviewAgent — Public API Wrapper
// ============================================================
class MockInterviewAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // Initialize all sub-agents
    this.planningAgent = new InterviewPlanningAgent(this.apiKey, this.modelName);
    this.interviewAgent = new InterviewAgent(this.apiKey, this.modelName);
    this.evaluationAgent = new AnswerEvaluationAgent(this.apiKey, this.modelName);
    this.mistakeAgent = new MistakeProgressAgent();
    this.finalAgent = new FinalEvaluationAgent(this.apiKey, this.modelName);
  }

  /**
   * Helper to verify session ownership and load complete context
   */
  async getVerifiedSession(sessionId, userId) {
    const session = await PreparationSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const err = new Error('Preparation session not found or access denied.');
      err.statusCode = 404;
      throw err;
    }
    return session;
  }

  /**
   * Compute display role
   */
  _getDisplayRole(session) {
    return session.targetRole === 'Other / Custom Role' && session.customRole
      ? session.customRole
      : session.targetRole || 'Software Engineer';
  }

  /**
   * Compute coverage from current session state
   */
  _computeCoverage(mockSession, plan) {
    const answers = mockSession.answers || [];
    const coveredTopics = mockSession.coveredTopics || [];
    const coverageReqs = plan?.coverageRequirements || { technical: 30, resume: 20, skillGap: 25, behavioral: 25 };
    const objectives = mockSession.objectives || [];

    const technicalAnswers = answers.filter(a => ['Technical', 'Coding', 'Project', 'Skill Gap'].includes(a.category));
    const resumeAnswers = answers.filter(a => ['Resume', 'Project'].includes(a.category) || a.source === 'resume');
    const skillGapAnswers = answers.filter(a => a.category === 'Skill Gap' || a.source === 'skill_gap');
    const behavioralAnswers = answers.filter(a => ['Behavioral', 'HR'].includes(a.category));

    const totalAnswers = Math.max(1, answers.length);
    const technical = Math.min(100, Math.round((technicalAnswers.length / Math.max(1, coverageReqs.technical / 100 * 8)) * 100));
    const resume = Math.min(100, Math.round((resumeAnswers.length / Math.max(1, coverageReqs.resume / 100 * 8)) * 100));
    const skillGap = Math.min(100, Math.round((skillGapAnswers.length / Math.max(1, coverageReqs.skillGap / 100 * 8)) * 100));
    const behavioral = Math.min(100, Math.round((behavioralAnswers.length / Math.max(1, coverageReqs.behavioral / 100 * 8)) * 100));

    // Overall: blend category coverage with objectives coverage
    const objectiveCoverage = objectives.length > 0
      ? Math.round((coveredTopics.filter(t => objectives.some(o => t.toLowerCase().includes(o.toLowerCase().slice(0, 12)))).length / objectives.length) * 100)
      : Math.min(100, totalAnswers * 10);

    const weighted = Math.round(
      (technical * (coverageReqs.technical / 100) +
       resume * (coverageReqs.resume / 100) +
       skillGap * (coverageReqs.skillGap / 100) +
       behavioral * (coverageReqs.behavioral / 100)) * 0.6 +
      objectiveCoverage * 0.4
    );

    return { overall: Math.min(100, weighted), technical, resume, skillGap, behavioral };
  }

  /**
   * Get current or setup state for Mock Interview
   */
  async getInterviewState(sessionId, userId) {
    const session = await this.getVerifiedSession(sessionId, userId);
    const mockSession = session.mockInterviewSession || { status: 'setup' };
    const displayRole = this._getDisplayRole(session);
    const company = session.company || 'Target Company';
    const experienceLevel = session.experienceLevel || 'Fresher';

    return {
      success: true,
      sessionId: session._id,
      company,
      targetRole: displayRole,
      experienceLevel,
      interviewType: mockSession.interviewType || session.interviewType || 'Mixed',
      interviewState: mockSession,
      hasInterviewHistory: (session.interviewHistory || []).length > 0,
      lastInterviewSummary: (session.interviewHistory || []).slice(-1)[0]?.performanceSnapshot || null,
      mistakeMemory: (session.mistakeMemory || []).filter(m => !m.resolved).slice(0, 10),
    };
  }

  /**
   * Start or Restart Mock Interview session
   */
  async startInterview(sessionId, userId, options = {}) {
    const session = await this.getVerifiedSession(sessionId, userId);

    const displayRole = this._getDisplayRole(session);
    const company = session.company || 'Target Company';
    const experienceLevel = session.experienceLevel || 'Fresher';
    const candidateProfile = session.candidateProfile || {};
    const requirements = session.requirements || {};
    const skillGap = session.skillGapAnalysis || {};
    const jobPreparationPlan = session.jobPreparationPlan || {};
    const readinessTwin = session.jobReadinessTwin || {};
    const previousHistory = session.interviewHistory || [];
    const previousMistakes = session.mistakeMemory || [];

    // Determine interview type: options.interviewType > session.interviewType > 'Mixed'
    const interviewType = options.interviewType || session.interviewType || 'Mixed';

    // ── PLANNING AGENT ──
    const plan = await this.planningAgent.createPlan({
      company, role: displayRole, jobDescription: session.jobDescription || '',
      experienceLevel, candidateProfile, skillGap, interviewType,
      jobPreparationPlan, readinessTwin, previousHistory, previousMistakes,
    });

    // ── GENERATE FIRST QUESTION ──
    const firstDecision = {
      nextAction: 'TECHNICAL',
      reasoning: 'Opening question to establish baseline.',
      questionCategory: interviewType === 'HR' ? 'HR' : 'Technical',
      topic: interviewType === 'HR' ? 'Introduction & Motivation' : (skillGap.strongSkills?.[0] || 'Core Engineering'),
      difficulty: plan.difficultyRange?.start || 'Medium',
      source: 'job_description',
      whySelected: 'Opening question',
      expectedEvidence: ['Technical background', 'Core competencies'],
      isWeaknessVerification: false,
      shouldComplete: false,
      completionReason: '',
      avatarBehavior: { expression: 'smile', gesture: 'welcoming_gesture', headMovement: 'speaking_movement', emotion: 'engaged' },
    };

    const q1 = await this.interviewAgent.generateQuestion({
      decision: firstDecision,
      company, role: displayRole, experienceLevel, interviewType,
      candidateProfile, skillGap, previousQuestions: [],
      currentQuestion: null, latestAnswer: '', latestEvaluation: null,
      plan, previousMistakes,
    });

    const mockInterviewSession = {
      status: 'active',
      interviewType,
      estimatedDurationMinutes: plan.estimatedDurationMinutes || 25,
      objectives: plan.objectives || [],
      coverage: { overall: 0, technical: 0, resume: 0, skillGap: 0, behavioral: 0 },
      coveredTopics: [],
      uncoveredTopics: plan.objectives || [],
      difficultyState: plan.difficultyRange?.start || 'Medium',
      agentDecisions: [],
      completionReason: '',
      finalEvaluation: null,
      currentQuestion: q1,
      questions: [q1],
      answers: [],
      integritySignals: [],
      performanceSnapshot: {
        overallPerformance: 0,
        badgeText: 'In Progress',
        summary: 'Interview in progress.',
        questionsAnswered: 0,
        topicsCovered: 0,
        totalDurationSeconds: 0,
        integritySignalsCount: 0,
      },
      startedAt: new Date(),
      endedAt: null,
      durationSeconds: 0,
      completed: false,
      // Legacy compat fields
      currentRound: 1,
      totalRounds: 4,
      currentRoundTitle: interviewType === 'HR' ? 'Behavioral & HR' : interviewType === 'Technical' ? 'Technical Assessment' : 'Adaptive Interview',
      questionNumber: 1,
      totalQuestionsTarget: 0, // Not used for completion
    };

    session.mockInterviewSession = mockInterviewSession;
    session.currentStage = 'mock_interview';
    session.lastAgent = 'Mock Interview Agent';
    session.markModified('mockInterviewSession');
    await session.save();

    return {
      success: true,
      company,
      targetRole: displayRole,
      experienceLevel,
      interviewType,
      estimatedDurationMinutes: plan.estimatedDurationMinutes,
      objectives: plan.objectives,
      mockInterviewSession,
    };
  }

  /**
   * Submit candidate answer, evaluate, update memory, decide next action
   */
  async submitAnswer(sessionId, userId, { answer, transcript, durationSeconds = 30 }) {
    const session = await this.getVerifiedSession(sessionId, userId);
    const mockSession = session.mockInterviewSession;

    if (!mockSession || mockSession.status !== 'active') {
      const err = new Error('No active mock interview session found. Please start an interview first.');
      err.statusCode = 400;
      throw err;
    }

    const currentQ = mockSession.currentQuestion;
    const finalAnswer = (answer || transcript || '').trim();
    const interviewType = mockSession.interviewType || session.interviewType || 'Mixed';
    const displayRole = this._getDisplayRole(session);
    const startedAt = mockSession.startedAt ? new Date(mockSession.startedAt) : new Date();
    const elapsedMinutes = (Date.now() - startedAt.getTime()) / 60000;

    // ── EVALUATION AGENT ──
    const evaluation = await this.evaluationAgent.evaluate({
      question: currentQ.question,
      category: currentQ.category,
      topic: currentQ.topic,
      candidateAnswer: finalAnswer,
      interviewType,
      targetRole: displayRole,
      company: session.company,
    });

    // ── MISTAKE PROGRESS AGENT ──
    const updatedMistakeMemory = this.mistakeAgent.updateMemory(
      session.mistakeMemory || [],
      { topic: currentQ.topic, category: currentQ.category, evaluation, questionId: currentQ.id }
    );

    // Build answer record
    const answerRecord = {
      questionId: currentQ.id,
      question: currentQ.question,
      category: currentQ.category,
      topic: currentQ.topic,
      difficulty: currentQ.difficulty,
      source: currentQ.source,
      answer: finalAnswer,
      transcript: transcript || finalAnswer,
      durationSeconds: Number(durationSeconds) || 30,
      roundNumber: mockSession.currentRound || 1,
      answerAnalysis: evaluation,
      isFollowUp: currentQ.isFollowUp || false,
      parentQuestionId: currentQ.parentQuestionId || '',
      followUpGenerated: false,
      submittedAt: new Date(),
    };

    mockSession.answers.push(answerRecord);

    // Update covered topics
    if (currentQ.topic && !mockSession.coveredTopics.includes(currentQ.topic)) {
      mockSession.coveredTopics = [...(mockSession.coveredTopics || []), currentQ.topic];
    }
    mockSession.uncoveredTopics = (mockSession.objectives || []).filter(
      obj => !(mockSession.coveredTopics || []).some(t => t.toLowerCase().includes(obj.toLowerCase().slice(0, 12)))
    );

    // Update coverage
    const planContext = { coverageRequirements: { technical: 30, resume: 20, skillGap: 25, behavioral: 25 }, objectives: mockSession.objectives };
    mockSession.coverage = this._computeCoverage(mockSession, planContext);

    // ── INTERVIEW AGENT DECISION ──
    const decision = await this.interviewAgent.decide({
      currentQuestion: currentQ,
      latestAnswer: finalAnswer,
      latestEvaluation: evaluation,
      previousQuestions: mockSession.questions || [],
      coveredTopics: mockSession.coveredTopics || [],
      objectives: mockSession.objectives || [],
      skillGap: session.skillGapAnalysis || {},
      candidateProfile: session.candidateProfile || {},
      previousMistakes: updatedMistakeMemory,
      difficultyState: mockSession.difficultyState || 'Medium',
      interviewType,
      estimatedDurationMinutes: mockSession.estimatedDurationMinutes || 25,
      elapsedMinutes,
      plan: null,
      company: session.company,
      role: displayRole,
      coverage: mockSession.coverage,
    });

    // Log agent decision
    mockSession.agentDecisions = mockSession.agentDecisions || [];
    mockSession.agentDecisions.push({
      questionId: currentQ.id,
      nextAction: decision.nextAction,
      reasoning: decision.reasoning,
      timestamp: new Date(),
    });

    // Update difficulty state
    if (decision.difficulty) mockSession.difficultyState = decision.difficulty;

    // Check completion
    if (decision.shouldComplete) {
      // Mark current answer's next action
      mockSession.answers[mockSession.answers.length - 1].nextAction = 'COMPLETE';
      mockSession.answers[mockSession.answers.length - 1].nextActionReasoning = decision.reasoning;
      mockSession.completionReason = decision.completionReason || 'Interview objectives sufficiently covered.';

      session.mistakeMemory = updatedMistakeMemory;
      session.markModified('mistakeMemory');
      session.markModified('mockInterviewSession');
      await session.save();

      return await this._finalizeInterview(session);
    }

    // ── GENERATE NEXT QUESTION ──
    const nextQ = await this.interviewAgent.generateQuestion({
      decision,
      company: session.company,
      role: displayRole,
      experienceLevel: session.experienceLevel,
      interviewType,
      candidateProfile: session.candidateProfile || {},
      skillGap: session.skillGapAnalysis || {},
      previousQuestions: mockSession.questions || [],
      currentQuestion: currentQ,
      latestAnswer: finalAnswer,
      latestEvaluation: evaluation,
      plan: null,
      previousMistakes: updatedMistakeMemory,
    });

    // Link follow-up relationship
    if (['FOLLOW_UP', 'EASIER', 'HARDER'].includes(decision.nextAction)) {
      nextQ.isFollowUp = true;
      nextQ.parentQuestionId = currentQ.id;
    }

    // Mark last answer's next action
    mockSession.answers[mockSession.answers.length - 1].nextAction = decision.nextAction;
    mockSession.answers[mockSession.answers.length - 1].nextActionReasoning = decision.reasoning;

    mockSession.currentQuestion = nextQ;
    mockSession.questions.push(nextQ);
    mockSession.questionNumber = (mockSession.questionNumber || 1) + 1;
    mockSession.currentRound = this._getCategoryRound(nextQ.category);
    mockSession.currentRoundTitle = nextQ.category;

    session.mistakeMemory = updatedMistakeMemory;
    session.markModified('mistakeMemory');
    session.markModified('mockInterviewSession');
    await session.save();

    return {
      success: true,
      isComplete: false,
      nextQuestion: nextQ,
      coverage: mockSession.coverage,
      coveredTopics: mockSession.coveredTopics,
      nextAction: decision.nextAction,
      nextActionReasoning: decision.reasoning,
      currentRound: mockSession.currentRound,
      currentRoundTitle: mockSession.currentRoundTitle,
      questionNumber: mockSession.questionNumber,
      answerAnalysis: evaluation, // Included for debugging; frontend must NOT display this during interview
    };
  }

  _getCategoryRound(category) {
    switch (category) {
      case 'Technical': case 'Coding': return 1;
      case 'Project': case 'Resume': return 2;
      case 'Skill Gap': return 3;
      case 'Behavioral': case 'HR': return 4;
      default: return 1;
    }
  }

  /**
   * Finalize interview and generate comprehensive final evaluation
   */
  async _finalizeInterview(session) {
    const mockSession = session.mockInterviewSession;
    const answers = mockSession.answers || [];
    const displayRole = this._getDisplayRole(session);
    const startedAt = mockSession.startedAt ? new Date(mockSession.startedAt) : new Date();
    const endedAt = new Date();

    // ── FINAL EVALUATION AGENT ──
    const finalEvaluation = await this.finalAgent.generate({
      answers,
      questions: mockSession.questions || [],
      objectives: mockSession.objectives || [],
      interviewType: mockSession.interviewType || 'Mixed',
      candidateProfile: session.candidateProfile || {},
      skillGap: session.skillGapAnalysis || {},
      previousMistakes: session.mistakeMemory || [],
      company: session.company,
      role: displayRole,
      startedAt,
      endedAt,
      coverage: mockSession.coverage || {},
    });

    const performanceSnapshot = {
      overallPerformance: finalEvaluation.overallScore,
      badgeText: finalEvaluation.badgeText,
      summary: finalEvaluation.summary,
      questionsAnswered: answers.length,
      topicsCovered: finalEvaluation.topicsCovered,
      totalDurationSeconds: finalEvaluation.durationSeconds,
      durationMinutes: finalEvaluation.durationMinutes,
      integritySignalsCount: (mockSession.integritySignals || []).length,
    };

    mockSession.status = 'completed';
    mockSession.completed = true;
    mockSession.endedAt = endedAt;
    mockSession.durationSeconds = finalEvaluation.durationSeconds;
    mockSession.performanceSnapshot = performanceSnapshot;
    mockSession.finalEvaluation = finalEvaluation;

    // Archive to interview history
    session.interviewHistory = session.interviewHistory || [];
    session.interviewHistory.push({
      interviewId: `interview-${Date.now()}`,
      completedAt: endedAt,
      interviewType: mockSession.interviewType,
      performanceSnapshot,
      questionsCount: answers.length,
      answers,
      integritySignals: mockSession.integritySignals,
      finalEvaluation,
    });

    session.progress = Math.max(session.progress || 0, 95);
    session.currentStage = 'mock_interview';

    session.markModified('mockInterviewSession');
    session.markModified('interviewHistory');
    await session.save();

    return {
      success: true,
      isComplete: true,
      performanceSnapshot,
      finalEvaluation,
      mockInterviewSession: mockSession,
    };
  }

  /**
   * Explicitly end interview early
   */
  async endInterview(sessionId, userId) {
    const session = await this.getVerifiedSession(sessionId, userId);
    if (!session.mockInterviewSession || session.mockInterviewSession.status !== 'active') {
      // If already completed, return current state
      if (session.mockInterviewSession?.status === 'completed') {
        return {
          success: true,
          isComplete: true,
          performanceSnapshot: session.mockInterviewSession.performanceSnapshot,
          finalEvaluation: session.mockInterviewSession.finalEvaluation,
          mockInterviewSession: session.mockInterviewSession,
        };
      }
      const err = new Error('No active mock interview to end.');
      err.statusCode = 400;
      throw err;
    }
    session.mockInterviewSession.completionReason = 'Interview ended early by candidate.';
    session.markModified('mockInterviewSession');
    return await this._finalizeInterview(session);
  }

  /**
   * Record interview integrity signal
   */
  async recordIntegritySignal(sessionId, userId, signalData) {
    const session = await this.getVerifiedSession(sessionId, userId);
    const mockSession = session.mockInterviewSession;

    if (!mockSession) {
      const err = new Error('No interview session found.');
      err.statusCode = 400;
      throw err;
    }

    const { type, severity = 'low', description } = signalData;
    const signal = {
      type: type || 'visibility_change',
      severity: severity || 'low',
      timestamp: new Date(),
      description: description || 'Tab visibility changed during interview.',
    };

    mockSession.integritySignals = mockSession.integritySignals || [];
    mockSession.integritySignals.push(signal);

    const count = mockSession.integritySignals.length;
    let warningLevel = 1;
    let warningMessage = '⚠ Please keep your focus on the interview.';
    if (count >= 4) { warningLevel = 3; warningMessage = '⚠ Repeated interview integrity signals detected. Please remain focused.'; }
    else if (count >= 2) { warningLevel = 2; warningMessage = '⚠ Interview integrity warning. Repeated attention signals were detected.'; }

    session.markModified('mockInterviewSession');
    await session.save();

    return { success: true, warningLevel, warningMessage, totalSignals: count, latestSignal: signal };
  }

  /**
   * Preserved: Recommend interview difficulty
   */
  async recommendDifficulty({ company = '', targetRole = '', jobDescription = '', resumeText = '', skillGaps = null }) {
    const validDifficulties = ['Easy', 'Medium', 'Medium-Hard', 'Hard'];
    const fallback = { success: false, difficulty: 'Medium', reason: 'AI recommendation unavailable. You can choose the difficulty manually.', isAiGenerated: false };

    if (!this.apiKey || !this.apiKey.trim()) return fallback;

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.modelName, generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } });

      const prompt = `You are PrepAgent AI's Senior Interview Architect.
Analyze the candidate's preparation context and determine the most appropriate starting mock interview difficulty.

Consider:
- Company: ${company || 'Not specified'}
- Target Role: ${targetRole || 'Not specified'}
- Job Description:
"""
${(jobDescription || '').slice(0, 3000)}
"""
- Candidate Resume Context:
"""
${(resumeText || '').slice(0, 3000) || 'Resume details not provided'}
"""
- Known Skill Gaps / Analysis:
${skillGaps ? JSON.stringify(skillGaps) : 'None identified yet'}

Evaluation Criteria:
1. Technical depth and complexity demanded by the Job Description
2. Role seniority implied (e.g. intern/junior vs mid vs senior/staff/architect)
3. Candidate's current background, projects, and skills from resume
4. Alignment and gap between candidate skills and required technical skills
5. Problem-solving and architectural requirements

CRITICAL RULES:
- Do NOT determine difficulty based only on the company name
- Evaluate the COMBINATION of Role + JD + Skills + Resume
- Return one difficulty from: "Easy", "Medium", "Medium-Hard", "Hard"

Return ONLY valid JSON:
{ "difficulty": "Easy"|"Medium"|"Medium-Hard"|"Hard", "reason": "Short 1-2 sentence explanation." }`;

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      const difficulty = validDifficulties.includes(parsed.difficulty) ? parsed.difficulty : 'Medium';
      const reason = (parsed.reason && typeof parsed.reason === 'string') ? parsed.reason.trim() : `Recommended based on ${targetRole || 'the target role'} requirements.`;
      return { success: true, difficulty, reason, isAiGenerated: true };
    } catch (err) {
      console.warn('[MockInterviewAgent] recommendDifficulty Gemini error:', err.message);
      return fallback;
    }
  }

  /**
   * Preserved: Infer target role
   */
  async inferTargetRole({ jobDescription = '', resumeText = '', company = '' }) {
    if (!this.apiKey || !this.apiKey.trim()) return { success: false, targetRole: '' };
    if ((!jobDescription || jobDescription.trim().length < 20) && (!resumeText || resumeText.trim().length < 20)) return { success: false, targetRole: '' };

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.modelName, generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } });

      const prompt = `You are an expert technical talent recruiter. Analyze the following Job Description and/or Resume and infer the single most accurate, standard professional target job role title.

Company: ${company || 'Unknown'}
Job Description:
"""
${(jobDescription || '').slice(0, 3000)}
"""
Resume Context:
"""
${(resumeText || '').slice(0, 3000)}
"""

Return ONLY valid JSON:
{ "targetRole": "Inferred Professional Job Title", "confidence": "high"|"medium"|"low" }`;

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      const targetRole = typeof parsed.targetRole === 'string' ? parsed.targetRole.trim() : '';
      return { success: Boolean(targetRole), targetRole, confidence: parsed.confidence || 'medium' };
    } catch (err) {
      console.warn('[MockInterviewAgent] inferTargetRole Gemini error:', err.message);
      return { success: false, targetRole: '' };
    }
  }

  // Keep mapAvatarBehavior for any external references
  mapAvatarBehavior(intent = {}) {
    const validExpressions = ['neutral', 'smile', 'attentive', 'thinking', 'surprised', 'encouraging', 'serious/professional'];
    const validGestures = ['open_hand_explanation', 'pointing', 'small_hand_emphasis', 'two_hand_explanation', 'listening_hands', 'neutral_hands', 'welcoming_gesture'];
    const validHeadMovements = ['subtle_nod', 'slight_tilt', 'idle_movement', 'speaking_movement', 'listening_nod'];
    return {
      expression: validExpressions.includes(intent.expression) ? intent.expression : 'attentive',
      gesture: validGestures.includes(intent.gesture) ? intent.gesture : 'open_hand_explanation',
      headMovement: validHeadMovements.includes(intent.headMovement) ? intent.headMovement : 'speaking_movement',
      emotion: intent.emotion || 'engaged',
    };
  }
}

const mockInterviewAgent = new MockInterviewAgent();
module.exports = mockInterviewAgent;
