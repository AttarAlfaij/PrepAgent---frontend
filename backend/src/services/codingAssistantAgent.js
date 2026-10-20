const geminiClient = require('./interviewAgents/geminiClient');

class CodingAssistantAgent {
  /**
   * Action types: 'hint' | 'concept' | 'analyze' | 'explain_error' | 'complexity' | 'solution'
   */
  async getAssistance({ action, problem, code, language, error, currentHintIndex = 0 }) {
    // If Gemini is configured, use it with a strict prompt
    if (geminiClient.isConfigured()) {
      try {
        const systemInstruction = `You are PrepAgent's elite Data Structures & Algorithms AI Mentor.
Your role is to guide the user towards understanding and solving the coding problem without giving away code unless explicitly asked for 'solution'.
Keep your explanations concise, encouraging, structured, and easy to read in markdown.`;

        let prompt = '';
        if (action === 'hint') {
          prompt = `Problem: "${problem.title}" (${problem.difficulty})
Description: ${problem.description}
User's Current Code in ${language}:
\`\`\`
${code || '(empty)'}
\`\`\`
Action: Give a progressive hint. Currently on hint #${currentHintIndex + 1}.
Do NOT reveal the full algorithm or code. Offer an intuitive nudge about data structures or invariants. Return JSON: { "reply": "...", "hintIndex": ${currentHintIndex + 1} }`;
        } else if (action === 'concept') {
          prompt = `Problem: "${problem.title}" (${problem.difficulty})
Topics: ${problem.topics?.join(', ')}
Action: Explain the core algorithmic concept or pattern (e.g., Sliding Window, Two Pointers, HashMap lookup) needed to solve this problem efficiently. Return JSON: { "reply": "..." }`;
        } else if (action === 'analyze') {
          prompt = `Problem: "${problem.title}"
User's Code (${language}):
\`\`\`
${code}
\`\`\`
Action: Analyze the user's approach. Point out potential bugs, edge cases (e.g. empty inputs, duplicates, off-by-one errors), or complexity bottlenecks. Do NOT write the complete working solution. Return JSON: { "reply": "..." }`;
        } else if (action === 'explain_error') {
          prompt = `Problem: "${problem.title}"
User's Code (${language}):
\`\`\`
${code}
\`\`\`
Error / Failed Execution:
${error || 'Test case output did not match expected value.'}
Action: Explain clearly why this error or test failure occurred and what logic need adjustment. Return JSON: { "reply": "..." }`;
        } else if (action === 'complexity') {
          prompt = `Problem: "${problem.title}"
Optimal Time Complexity: ${problem.timeComplexity}
Optimal Space Complexity: ${problem.spaceComplexity}
User's Code (${language}):
\`\`\`
${code}
\`\`\`
Action: Analyze the user's current code complexity and compare it against the optimal ${problem.timeComplexity} / ${problem.spaceComplexity}. Explain clearly in 3-4 bullet points. Return JSON: { "reply": "..." }`;
        } else if (action === 'solution') {
          prompt = `Problem: "${problem.title}" (${problem.difficulty})
Language: ${language}
Action: Provide the clean, idiomatic reference solution with brief comments explaining the key lines. Return JSON: { "reply": "..." }`;
        }

        const res = await geminiClient.generateStructuredJSON({
          agentName: 'CodingAssistantAgent',
          systemInstruction,
          userPrompt: prompt,
          fallbackFn: () => this.generateHeuristicResponse({ action, problem, code, language, error, currentHintIndex }),
        });

        return res;
      } catch (err) {
        console.warn('[CodingAssistantAgent] Gemini call failed, falling back to heuristics:', err.message);
      }
    }

    return this.generateHeuristicResponse({ action, problem, code, language, error, currentHintIndex });
  }

  generateHeuristicResponse({ action, problem, code, language, error, currentHintIndex = 0 }) {
    switch (action) {
      case 'hint': {
        const hints = problem.hints || [];
        const nextIndex = currentHintIndex % Math.max(1, hints.length);
        const hintText = hints[nextIndex] || 'Consider what data structure enables fast O(1) lookups or how sorting might simplify the search space.';
        return {
          reply: `💡 **Hint ${nextIndex + 1} of ${hints.length || 1}**\n\n${hintText}\n\n*Click "Give Hint" again if you need another nudge!*`,
          hintIndex: nextIndex + 1,
        };
      }

      case 'concept': {
        const topicsStr = problem.topics?.join(', ') || 'DSA';
        const explanation = problem.conceptExplanation || `This problem focuses on **${topicsStr}**. Mastering this pattern helps with similar interview questions.`;
        return {
          reply: `📚 **Core Algorithmic Concept: ${topicsStr}**\n\n${explanation}\n\n**Key Invariant:** Focus on minimizing redundant work by keeping track of state as you iterate.`,
        };
      }

      case 'analyze': {
        const hasLoops = /for|while/i.test(code || '');
        const hasMap = /Map|dict|lookup|unordered_map|\{\}/i.test(code || '');
        let feedback = `🔍 **Code Review & Approach Analysis**\n\n`;

        if (!code || code.trim().length < 30) {
          feedback += `Your editor looks mostly empty. Start by identifying the input parameters and outlining your base approach in pseudocode.`;
        } else if (hasLoops && !hasMap && problem.topics?.includes('Hashing')) {
          feedback += `• You are using iterative loops, but notice how a **Hash Table** or Set could reduce repeated scanning from O(n²) to O(n).\n• Make sure you check boundary conditions (e.g. empty collections or single-element inputs).`;
        } else if (hasLoops) {
          feedback += `• Solid structured start! Ensure you handle edge cases such as empty inputs, negative numbers, or duplicate values.\n• Verify loop termination conditions to avoid potential index out-of-bounds or infinite loops.`;
        } else {
          feedback += `• Review the return type requirement: this problem expects **${problem.returnType}**.\n• Check that your function name matches \`${problem.functionName}\`.`;
        }
        return { reply: feedback };
      }

      case 'explain_error': {
        let explanation = `⚠️ **Error Analysis**\n\n`;
        if (error && error.includes('SyntaxError')) {
          explanation += `• There is a syntax error in your code. Check for missing brackets, parentheses, colons, or quotation marks.`;
        } else if (error && (error.includes('KeyError') || error.includes('Undefined') || error.includes('null'))) {
          explanation += `• You attempted to access an element or property that does not exist in your collection. Always check presence before accessing.`;
        } else if (error && error.includes('IndexError')) {
          explanation += `• Array index out of bounds. Verify your loop bounds (\`0\` to \`n - 1\`).`;
        } else {
          explanation += `• **Output Mismatch:** Your function returned a value different from the expected test case output.\n• Trace your algorithm manually with the input provided in the failed test case.`;
        }
        return { reply: explanation };
      }

      case 'complexity': {
        return {
          reply: `⏱️ **Complexity Breakdown**\n\n• **Optimal Time Complexity:** \`${problem.timeComplexity || 'O(n)'}\`\n• **Optimal Space Complexity:** \`${problem.spaceComplexity || 'O(n)'}\`\n\n**Why?** An optimal solution visits each element a constant number of times and uses memory proportional to unique elements stored.`,
        };
      }

      case 'solution': {
        const template = problem.starterTemplates?.[language.toLowerCase()] || '';
        return {
          reply: `💡 **Reference Solution & Walkthrough**\n\nRefer to the **${problem.conceptExplanation}** section and utilize the optimal algorithm:\n- Time Complexity: \`${problem.timeComplexity}\`\n- Space Complexity: \`${problem.spaceComplexity}\`\n\n*Review the hints or explore the concept guide to code it yourself!*`,
        };
      }

      default:
        return { reply: 'Select an AI action above to receive contextual guidance.' };
    }
  }
}

module.exports = new CodingAssistantAgent();
