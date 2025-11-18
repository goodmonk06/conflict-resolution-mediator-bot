import OpenAI from 'openai';
import type { Message, ConflictDetectionResult } from '../types/schemas';
import { logger } from '../lib/logger';

/**
 * AI-powered conflict detection using OpenAI
 *
 * This service uses LLMs to analyze conversation threads and detect
 * potential conflicts with nuanced understanding of context and tone.
 *
 * ⚠️ Important: AI suggestions are assistive tools, not authoritative decisions.
 * Human judgment should always be the final arbiter in conflict resolution.
 */

interface AIAnalysisResult {
  hasConflict: boolean;
  score: number;
  signalType: 'potential' | 'escalated' | 'resolved';
  summary: string;
  keywords: string[];
  reasoning: string;
}

export class AIDetector {
  private client: OpenAI | null = null;
  private enabled: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey !== 'sk-your-key-here') {
      this.client = new OpenAI({ apiKey });
      this.enabled = true;
      logger.info('AI detection enabled with OpenAI');
    } else {
      logger.warn('AI detection disabled: OPENAI_API_KEY not configured');
    }
  }

  /**
   * Check if AI detection is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Detect potential conflicts using AI analysis
   */
  async detect(messages: Message[]): Promise<ConflictDetectionResult> {
    if (!this.enabled || !this.client) {
      throw new Error('AI detection is not enabled. Configure OPENAI_API_KEY to use this feature.');
    }

    try {
      const conversationText = this.formatConversation(messages);
      const analysis = await this.analyzeConversation(conversationText);

      const participants = Array.from(new Set(messages.map(m => m.author)));

      return {
        hasConflict: analysis.hasConflict,
        score: analysis.score,
        signalType: analysis.signalType,
        summaryMarkdown: this.formatSummary(analysis),
        keywords: analysis.keywords,
        participants,
        confidence: this.estimateConfidence(analysis),
        detectionMethod: 'ai',
      };
    } catch (error) {
      logger.error({ error }, 'AI detection failed');
      throw error;
    }
  }

  /**
   * Generate mediation step suggestion
   */
  async generateMediationSuggestion(
    actionType: string,
    context: {
      threadSummary: string;
      previousSteps?: string[];
      caseNotes?: string;
    }
  ): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new Error('AI suggestions are not enabled. Configure OPENAI_API_KEY to use this feature.');
    }

    try {
      const prompt = this.buildMediationPrompt(actionType, context);

      const completion = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert conflict mediator assistant. Generate helpful, empathetic, and professional mediation message suggestions.

IMPORTANT GUIDELINES:
- Keep messages respectful and neutral
- Focus on understanding and resolution, not blame
- Use inclusive, non-judgmental language
- Acknowledge emotions while focusing on facts
- Suggest concrete, actionable steps
- Remember: these are suggestions only; human mediators make final decisions`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const suggestion = completion.choices[0]?.message?.content || '';

      return this.formatMediationSuggestion(suggestion, actionType);
    } catch (error) {
      logger.error({ error }, 'Failed to generate mediation suggestion');
      throw error;
    }
  }

  private formatConversation(messages: Message[]): string {
    return messages
      .map((msg, idx) => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${idx + 1}] ${msg.author} (${timestamp}):\n${msg.content}`;
      })
      .join('\n\n---\n\n');
  }

  private async analyzeConversation(conversationText: string): Promise<AIAnalysisResult> {
    const completion = await this.client!.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert conflict detection system for online communities. Analyze conversations and detect potential conflicts, disagreements, or tensions.

Provide your analysis in JSON format with the following structure:
{
  "hasConflict": boolean,
  "score": number (0.0 to 1.0, where 0 is no conflict and 1 is severe conflict),
  "signalType": "potential" | "escalated" | "resolved",
  "summary": "A brief markdown summary of the situation",
  "keywords": ["array", "of", "relevant", "keywords"],
  "reasoning": "Brief explanation of your analysis"
}

Signal type guidance:
- "potential": Initial signs of disagreement or tension
- "escalated": Conflict is intensifying with personal remarks or strong language
- "resolved": Parties are working toward or have reached resolution

Remember: You're detecting patterns, not making judgments about who's right or wrong.`,
        },
        {
          role: 'user',
          content: `Analyze this conversation for conflict signals:\n\n${conversationText}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content) as AIAnalysisResult;

    // Validate and normalize the result
    return {
      hasConflict: result.hasConflict ?? false,
      score: Math.min(1.0, Math.max(0.0, result.score ?? 0)),
      signalType: result.signalType || 'potential',
      summary: result.summary || 'No summary available',
      keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 10) : [],
      reasoning: result.reasoning || '',
    };
  }

  private formatSummary(analysis: AIAnalysisResult): string {
    const title = analysis.signalType === 'escalated'
      ? '## Escalated Conflict Detected (AI Analysis)'
      : analysis.signalType === 'resolved'
      ? '## Conflict Resolution Detected (AI Analysis)'
      : '## Potential Conflict Detected (AI Analysis)';

    const scorePercentage = Math.round(analysis.score * 100);

    return `${title}

${analysis.summary}

**Conflict score:** ${scorePercentage}%

${analysis.reasoning ? `**Analysis:** ${analysis.reasoning}` : ''}

---

⚠️ **Important:** This analysis is generated by AI and should be reviewed by human mediators. AI suggestions are assistive tools, not authoritative decisions.`;
  }

  private estimateConfidence(analysis: AIAnalysisResult): number {
    // AI generally has higher confidence than rule-based
    // Confidence correlates with score clarity (very low or very high scores are more confident)
    const scoreCertainty = Math.abs(analysis.score - 0.5) * 2; // 0 at 0.5, 1 at 0 or 1
    const baseConfidence = 0.75;

    return Math.min(0.95, baseConfidence + (scoreCertainty * 0.2));
  }

  private buildMediationPrompt(
    actionType: string,
    context: {
      threadSummary: string;
      previousSteps?: string[];
      caseNotes?: string;
    }
  ): string {
    let prompt = `Generate a mediation message for the following action: "${actionType}"\n\n`;

    prompt += `**Context:**\n${context.threadSummary}\n\n`;

    if (context.caseNotes) {
      prompt += `**Case Notes:**\n${context.caseNotes}\n\n`;
    }

    if (context.previousSteps && context.previousSteps.length > 0) {
      prompt += `**Previous Steps:**\n${context.previousSteps.join('\n')}\n\n`;
    }

    prompt += `Please generate a professional, empathetic message appropriate for this "${actionType}" action. The message should be ready to send with minimal editing.`;

    return prompt;
  }

  private formatMediationSuggestion(suggestion: string, actionType: string): string {
    return `${suggestion}

---

💡 **AI Suggestion for:** ${actionType}
⚠️ **Note:** This is an AI-generated suggestion. Please review and modify as needed before sending.`;
  }
}
