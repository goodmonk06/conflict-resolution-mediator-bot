import { AIDetector } from './ai-detector';
import { RuleBasedDetector } from './rule-based-detector';
import type { Message, ConflictDetectionResult } from '../types/schemas';
import { logger } from '../lib/logger';

/**
 * Main detection service that coordinates between AI and rule-based detection
 *
 * This service attempts to use AI detection when available and falls back
 * to rule-based detection when AI is unavailable or fails.
 */

export class DetectionService {
  private aiDetector: AIDetector;
  private ruleBasedDetector: RuleBasedDetector;

  constructor() {
    this.aiDetector = new AIDetector();
    this.ruleBasedDetector = new RuleBasedDetector();
  }

  /**
   * Detect conflicts in a conversation
   * Uses AI if available, falls back to rule-based detection
   */
  async detect(messages: Message[]): Promise<ConflictDetectionResult> {
    if (messages.length === 0) {
      throw new Error('Cannot detect conflicts in empty conversation');
    }

    // Try AI detection first
    if (this.aiDetector.isEnabled()) {
      try {
        logger.info('Using AI detection');
        return await this.aiDetector.detect(messages);
      } catch (error) {
        logger.warn({ error }, 'AI detection failed, falling back to rule-based');
      }
    }

    // Fallback to rule-based detection
    logger.info('Using rule-based detection');
    return this.ruleBasedDetector.detect(messages);
  }

  /**
   * Force use of rule-based detection (useful for testing)
   */
  detectWithRules(messages: Message[]): ConflictDetectionResult {
    return this.ruleBasedDetector.detect(messages);
  }

  /**
   * Force use of AI detection (throws if unavailable)
   */
  async detectWithAI(messages: Message[]): Promise<ConflictDetectionResult> {
    if (!this.aiDetector.isEnabled()) {
      throw new Error('AI detection is not available');
    }
    return await this.aiDetector.detect(messages);
  }

  /**
   * Generate mediation step suggestion using AI
   */
  async generateMediationSuggestion(
    actionType: string,
    context: {
      threadSummary: string;
      previousSteps?: string[];
      caseNotes?: string;
    }
  ): Promise<string> {
    if (!this.aiDetector.isEnabled()) {
      throw new Error('AI suggestions are not available. Configure OPENAI_API_KEY to enable.');
    }

    return await this.aiDetector.generateMediationSuggestion(actionType, context);
  }

  /**
   * Check if AI detection is available
   */
  isAIAvailable(): boolean {
    return this.aiDetector.isEnabled();
  }
}

// Singleton instance
export const detectionService = new DetectionService();
