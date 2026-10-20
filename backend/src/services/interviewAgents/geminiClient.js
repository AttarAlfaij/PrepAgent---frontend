const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Dedicated Gemini AI client for the Agentic Interview Module.
 * Separates prompts by agent responsibility and enforces structured JSON validation.
 */
class GeminiInterviewClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  isConfigured() {
    return Boolean(this.genAI && this.apiKey && this.apiKey !== 'your_gemini_api_key_here');
  }

  /**
   * Extract and parse JSON safely from Gemini text responses
   */
  parseStructuredJSON(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Empty AI response');
    }

    let cleaned = rawText.trim();
    // Remove markdown code fences if present
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (directError) {
      // Find first { and last }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extracted = cleaned.slice(firstBrace, lastBrace + 1);
        return JSON.parse(extracted);
      }
      throw directError;
    }
  }

  /**
   * Generate structured JSON from a specific agent prompt with fallback protection
   */
  async generateStructuredJSON({ agentName, systemInstruction, userPrompt, temperature = 0.4, fallbackFn }) {
    if (!this.isConfigured()) {
      if (typeof fallbackFn === 'function') {
        return fallbackFn(new Error('Gemini API key not configured'));
      }
      throw new Error('Gemini API key is not configured');
    }

    const modelsToTry = [this.modelName, 'gemini-2.0-flash', 'gemini-1.5-flash'].filter(
      (v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx
    );

    let lastError = null;

    for (const modelId of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelId,
          systemInstruction: systemInstruction || undefined,
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(userPrompt);
        const text = result?.response?.text?.() || '';
        const parsed = this.parseStructuredJSON(text);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (typeof fallbackFn === 'function') {
      return fallbackFn(lastError);
    }
    throw lastError || new Error(`${agentName} failed to generate valid JSON`);
  }
}

module.exports = new GeminiInterviewClient();
