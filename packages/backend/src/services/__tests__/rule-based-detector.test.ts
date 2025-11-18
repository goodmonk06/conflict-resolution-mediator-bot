import { describe, it, expect } from 'vitest';
import { RuleBasedDetector } from '../rule-based-detector';
import type { Message } from '../../types/schemas';

describe('RuleBasedDetector', () => {
  const detector = new RuleBasedDetector();

  it('should detect no conflict in friendly conversation', () => {
    const messages: Message[] = [
      {
        id: '1',
        author: 'alice',
        content: 'Hey team, great work on the project!',
        timestamp: '2025-11-18T10:00:00Z',
      },
      {
        id: '2',
        author: 'bob',
        content: 'Thanks! I appreciate the collaboration.',
        timestamp: '2025-11-18T10:05:00Z',
      },
    ];

    const result = detector.detect(messages);

    expect(result.hasConflict).toBe(false);
    expect(result.score).toBeLessThan(0.4);
    expect(result.detectionMethod).toBe('rule-based');
  });

  it('should detect potential conflict with disagreement keywords', () => {
    const messages: Message[] = [
      {
        id: '1',
        author: 'alice',
        content: 'I think we should use approach A for this feature.',
        timestamp: '2025-11-18T10:00:00Z',
      },
      {
        id: '2',
        author: 'bob',
        content: 'I disagree. That approach is wrong and won\'t work.',
        timestamp: '2025-11-18T10:05:00Z',
      },
      {
        id: '3',
        author: 'alice',
        content: 'No way, you\'re mistaken about the requirements.',
        timestamp: '2025-11-18T10:10:00Z',
      },
    ];

    const result = detector.detect(messages);

    expect(result.hasConflict).toBe(true);
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.signalType).toBe('potential');
    expect(result.keywords).toContain('disagree');
  });

  it('should detect escalated conflict with personal remarks', () => {
    const messages: Message[] = [
      {
        id: '1',
        author: 'alice',
        content: 'This is ridiculous! You always do this.',
        timestamp: '2025-11-18T10:00:00Z',
      },
      {
        id: '2',
        author: 'bob',
        content: 'That\'s offensive. You people never listen.',
        timestamp: '2025-11-18T10:05:00Z',
      },
      {
        id: '3',
        author: 'alice',
        content: 'This is unacceptable! I absolutely refuse to work like this.',
        timestamp: '2025-11-18T10:10:00Z',
      },
    ];

    const result = detector.detect(messages);

    expect(result.hasConflict).toBe(true);
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.signalType).toBe('escalated');
  });

  it('should detect resolution signals', () => {
    const messages: Message[] = [
      {
        id: '1',
        author: 'alice',
        content: 'I disagree with approach A.',
        timestamp: '2025-11-18T10:00:00Z',
      },
      {
        id: '2',
        author: 'bob',
        content: 'I understand your concerns. Let me clarify my reasoning.',
        timestamp: '2025-11-18T10:05:00Z',
      },
      {
        id: '3',
        author: 'alice',
        content: 'I appreciate the explanation. I agree, we can compromise on this.',
        timestamp: '2025-11-18T10:10:00Z',
      },
      {
        id: '4',
        author: 'bob',
        content: 'Great! Sorry for any confusion earlier.',
        timestamp: '2025-11-18T10:15:00Z',
      },
    ];

    const result = detector.detect(messages);

    expect(result.signalType).toBe('resolved');
    expect(result.keywords).toEqual(expect.arrayContaining(['agree', 'understand', 'appreciate']));
  });

  it('should include participants in the result', () => {
    const messages: Message[] = [
      {
        id: '1',
        author: 'alice',
        content: 'Test message',
        timestamp: '2025-11-18T10:00:00Z',
      },
      {
        id: '2',
        author: 'bob',
        content: 'Another message',
        timestamp: '2025-11-18T10:05:00Z',
      },
      {
        id: '3',
        author: 'charlie',
        content: 'Third message',
        timestamp: '2025-11-18T10:10:00Z',
      },
    ];

    const result = detector.detect(messages);

    expect(result.participants).toHaveLength(3);
    expect(result.participants).toContain('alice');
    expect(result.participants).toContain('bob');
    expect(result.participants).toContain('charlie');
  });

  it('should boost score for rapid message exchange', () => {
    // Create many messages in a short time span
    const messages: Message[] = [];
    const baseTime = new Date('2025-11-18T10:00:00Z').getTime();

    for (let i = 0; i < 20; i++) {
      messages.push({
        id: `${i}`,
        author: i % 2 === 0 ? 'alice' : 'bob',
        content: `I disagree with that point`,
        timestamp: new Date(baseTime + i * 60000).toISOString(), // 1 minute apart
      });
    }

    const result = detector.detect(messages);

    // Rapid exchange with conflict keywords should have elevated score
    expect(result.hasConflict).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('should handle ALL CAPS as emotional indicator', () => {
    const messages: Message[] = [
      {
        id: '1',
        author: 'alice',
        content: 'THIS IS COMPLETELY WRONG!',
        timestamp: '2025-11-18T10:00:00Z',
      },
      {
        id: '2',
        author: 'bob',
        content: 'I ABSOLUTELY DISAGREE WITH THIS APPROACH!',
        timestamp: '2025-11-18T10:05:00Z',
      },
      {
        id: '3',
        author: 'alice',
        content: 'YOU ARE MAKING A HUGE MISTAKE!',
        timestamp: '2025-11-18T10:10:00Z',
      },
    ];

    const result = detector.detect(messages);

    expect(result.hasConflict).toBe(true);
    // Score should be boosted by ALL CAPS heuristic
    expect(result.score).toBeGreaterThan(0.6);
  });
});
