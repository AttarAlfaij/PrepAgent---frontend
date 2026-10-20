const geminiClient = require('./interviewAgents/geminiClient');

class AptitudeCoachAgent {
  /**
   * Action types: 'hint' | 'concept' | 'mistake' | 'similar_question'
   */
  async getCoachAssistance({ action, question, userAnswer, correctAnswer, explanation, concept, topic, category }) {
    if (geminiClient.isConfigured()) {
      try {
        const systemInstruction = `You are PrepAgent's elite Aptitude and Reasoning AI Coach.
Your goal is to help candidates master Quantitative Aptitude, Logical Reasoning, Verbal Ability, and Data Interpretation.
Be concise, clear, encouraging, and provide step-by-step mathematical or deductive insights.`;

        let userPrompt = '';
        if (action === 'hint') {
          userPrompt = `Category: ${category}, Topic: ${topic}
Question: "${question}"
Action: Provide a gentle, progressive hint to guide the candidate towards the right thought process or formula.
Do NOT reveal the answer option directly. Return JSON: { "reply": "..." }`;
        } else if (action === 'concept') {
          userPrompt = `Topic: ${topic}, Concept: ${concept}
Question: "${question}"
Action: Explain the foundational mathematical or logical concept, key formulas, and common shortcuts used for this type of problem. Return JSON: { "reply": "..." }`;
        } else if (action === 'mistake') {
          userPrompt = `Question: "${question}"
Correct Answer: ${correctAnswer}
Candidate's Selected Answer: ${userAnswer || '(none)'}
Official Explanation: ${explanation}
Action: Explain why the candidate's selected answer (${userAnswer}) was incorrect, what cognitive trap or calculation error might have led to it, and how to avoid it. Return JSON: { "reply": "..." }`;
        } else if (action === 'similar_question') {
          userPrompt = `Create a brand new practice question on the same topic: ${topic} (${category}).
Return JSON:
{
  "question": "...",
  "options": [
    { "key": "A", "text": "..." },
    { "key": "B", "text": "..." },
    { "key": "C", "text": "..." },
    { "key": "D", "text": "..." }
  ],
  "correctAnswer": "...",
  "explanation": "...",
  "shortcut": "..."
}`;
        }

        const res = await geminiClient.generateStructuredJSON({
          agentName: 'AptitudeCoachAgent',
          systemInstruction,
          userPrompt,
          fallbackFn: () =>
            this.generateHeuristicResponse({ action, question, userAnswer, correctAnswer, explanation, concept, topic, category }),
        });

        return res;
      } catch (err) {
        console.warn('[AptitudeCoachAgent] Gemini error, using heuristic fallback:', err.message);
      }
    }

    return this.generateHeuristicResponse({ action, question, userAnswer, correctAnswer, explanation, concept, topic, category });
  }

  generateHeuristicResponse({ action, question, userAnswer, correctAnswer, explanation, concept, topic, category }) {
    switch (action) {
      case 'hint':
        return {
          reply: `💡 **AI Hint**\n\n• Focus on the relationship between the given quantities.\n• Consider if a direct formula applies (e.g. converting units or computing net rates).\n• Eliminate choices that are mathematically improbable before calculating!`,
        };

      case 'concept':
        return {
          reply: `📚 **Concept Breakdown: ${concept || topic}**\n\n• **Core Principle:** This problem tests standard principles of **${topic}** under **${category}**.\n• **Formula/Rule:** Break down the statement into variables and establish an equation.\n• **Time-saving Trick:** Work backwards from given options when numbers are clean!`,
        };

      case 'mistake':
        return {
          reply: `⚠️ **Mistake Analysis**\n\n• You selected **Option ${userAnswer || 'None'}**, whereas the correct choice was **Option ${correctAnswer}**.\n• **Common Pitfall:** A frequent mistake in ${topic} is missing a unit conversion or calculating percentage on the wrong base (e.g., Cost Price vs Selling Price).\n• **Correction:** ${explanation}`,
        };

      case 'similar_question':
        return {
          reply: `🎯 **Similar Practice Challenge (${topic})**\n\nA machine produces 120 components in 4 hours. How many components will 3 such machines produce in 6 hours?\n\nA) 360  B) 480  C) 540  D) 600\n\n*(Answer: C — 540 components)*`,
        };

      default:
        return { reply: 'Select an AI coaching action to receive contextual guidance.' };
    }
  }
}

module.exports = new AptitudeCoachAgent();
