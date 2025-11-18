import type { Message, ConflictDetectionResult } from '../types/schemas';

/**
 * Rule-based conflict detection fallback
 *
 * This provides a simple, deterministic detection mechanism when AI is unavailable.
 * It uses keyword matching and heuristics to identify potential conflicts.
 *
 * ⚠️ Note: This is a simplified detection method and should not be considered
 * as authoritative. It serves as a fallback and for testing purposes.
 */

// Conflict indicator keywords organized by category
const CONFLICT_KEYWORDS = {
  disagreement: ['disagree', 'wrong', 'incorrect', 'mistaken', 'no way'],
  frustration: ['frustrated', 'annoying', 'ridiculous', 'stupid', 'waste of time'],
  personal: ['always', 'never', 'you people', 'typical', 'attack', 'offensive'],
  escalation: ['unacceptable', 'demand', 'insist', 'refuse', 'absolutely not'],
  resolution: ['agree', 'understand', 'sorry', 'appreciate', 'clarify', 'compromise'],
};

// Weight for each category (higher = more indicative of conflict)
const CATEGORY_WEIGHTS = {
  disagreement: 0.15,
  frustration: 0.25,
  personal: 0.35,
  escalation: 0.40,
  resolution: -0.30, // Negative weight for resolution indicators
};

interface KeywordMatch {
  category: keyof typeof CONFLICT_KEYWORDS;
  keyword: string;
  count: number;
}

export class RuleBasedDetector {
  /**
   * Detect potential conflicts in a conversation using rule-based heuristics
   */
  detect(messages: Message[]): ConflictDetectionResult {
    const conversationText = messages.map(m => m.content.toLowerCase()).join(' ');
    const authors = new Set(messages.map(m => m.author));

    // Find keyword matches
    const matches = this.findKeywordMatches(conversationText);

    // Calculate base score from keywords
    let score = this.calculateKeywordScore(matches);

    // Apply heuristics
    score = this.applyHeuristics(score, messages, matches);

    // Determine signal type
    const signalType = this.determineSignalType(score, matches);

    // Extract keywords and generate summary
    const keywords = this.extractKeywords(matches);
    const summaryMarkdown = this.generateSummary(signalType, score, matches, authors.size);

    return {
      hasConflict: score >= 0.4,
      score: Math.min(1.0, Math.max(0.0, score)),
      signalType,
      summaryMarkdown,
      keywords,
      participants: Array.from(authors),
      confidence: this.calculateConfidence(score, matches.length, messages.length),
      detectionMethod: 'rule-based',
    };
  }

  private findKeywordMatches(text: string): KeywordMatch[] {
    const matches: KeywordMatch[] = [];

    for (const [category, keywords] of Object.entries(CONFLICT_KEYWORDS)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const count = (text.match(regex) || []).length;

        if (count > 0) {
          matches.push({
            category: category as keyof typeof CONFLICT_KEYWORDS,
            keyword,
            count,
          });
        }
      }
    }

    return matches;
  }

  private calculateKeywordScore(matches: KeywordMatch[]): number {
    let score = 0;

    for (const match of matches) {
      const weight = CATEGORY_WEIGHTS[match.category];
      // Diminishing returns for repeated keywords
      score += weight * Math.log(match.count + 1);
    }

    return score;
  }

  private applyHeuristics(
    baseScore: number,
    messages: Message[],
    matches: KeywordMatch[]
  ): number {
    let score = baseScore;

    // Heuristic 1: Rapid message exchange suggests heated discussion
    if (messages.length > 10) {
      const timeSpan = new Date(messages[messages.length - 1].timestamp).getTime() -
                       new Date(messages[0].timestamp).getTime();
      const minutesSpan = timeSpan / (1000 * 60);

      if (minutesSpan < 30 && messages.length > 15) {
        score += 0.1; // Boost for rapid exchange
      }
    }

    // Heuristic 2: Multiple participants with conflict keywords
    const conflictAuthors = new Set<string>();
    const conflictCategories = ['frustration', 'personal', 'escalation', 'disagreement'];

    if (matches.some(m => conflictCategories.includes(m.category))) {
      // Simplified: assume multiple authors if there are many messages
      if (messages.length > 5) {
        score += 0.05;
      }
    }

    // Heuristic 3: Presence of ALL CAPS suggests strong emotion
    const allCapsCount = messages.filter(m => {
      const words = m.content.split(/\s+/);
      const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
      return capsWords.length > 0;
    }).length;

    if (allCapsCount > 2) {
      score += 0.15;
    }

    // Heuristic 4: Long messages may indicate detailed arguments
    const longMessages = messages.filter(m => m.content.length > 500).length;
    if (longMessages > 2) {
      score += 0.05;
    }

    return score;
  }

  private determineSignalType(
    score: number,
    matches: KeywordMatch[]
  ): 'potential' | 'escalated' | 'resolved' {
    // Check for resolution indicators
    const resolutionMatches = matches.filter(m => m.category === 'resolution');
    const hasStrongResolution = resolutionMatches.reduce((sum, m) => sum + m.count, 0) >= 3;

    if (hasStrongResolution && score < 0.5) {
      return 'resolved';
    }

    // Check for escalation
    const escalationMatches = matches.filter(m =>
      m.category === 'escalation' || m.category === 'personal'
    );
    const hasEscalation = escalationMatches.length > 0;

    if (score >= 0.7 || hasEscalation) {
      return 'escalated';
    }

    return 'potential';
  }

  private extractKeywords(matches: KeywordMatch[]): string[] {
    // Return top keywords by frequency
    return matches
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(m => m.keyword);
  }

  private generateSummary(
    signalType: 'potential' | 'escalated' | 'resolved',
    score: number,
    matches: KeywordMatch[],
    participantCount: number
  ): string {
    const scorePercentage = Math.round(score * 100);

    let title = '';
    let description = '';

    switch (signalType) {
      case 'potential':
        title = '## Potential Conflict Detected (Rule-Based)';
        description = `A conversation pattern suggests potential disagreement or tension among ${participantCount} participant(s).`;
        break;
      case 'escalated':
        title = '## Escalated Conflict Detected (Rule-Based)';
        description = `Strong indicators of conflict escalation detected. The conversation shows signs of heightened tension or personal remarks.`;
        break;
      case 'resolved':
        title = '## Conflict Resolution Detected (Rule-Based)';
        description = `The conversation appears to be moving toward resolution with conciliatory language.`;
        break;
    }

    const topCategories = this.getTopCategories(matches);
    const categoriesText = topCategories.length > 0
      ? `\n\n**Key indicators:** ${topCategories.join(', ')}`
      : '';

    return `${title}\n\n${description}\n\n**Conflict score:** ${scorePercentage}%${categoriesText}\n\n⚠️ **Note:** This detection used rule-based heuristics. For more accurate analysis, enable AI detection.`;
  }

  private getTopCategories(matches: KeywordMatch[]): string[] {
    const categoryCounts = new Map<string, number>();

    for (const match of matches) {
      const current = categoryCounts.get(match.category) || 0;
      categoryCounts.set(match.category, current + match.count);
    }

    return Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }

  private calculateConfidence(score: number, matchCount: number, messageCount: number): number {
    // Confidence is lower for rule-based detection
    // It increases with more matches relative to message count
    const matchDensity = matchCount / Math.max(1, messageCount);
    const baseConfidence = 0.5; // Rule-based has moderate confidence at best

    return Math.min(0.8, baseConfidence + (matchDensity * 0.3));
  }
}
