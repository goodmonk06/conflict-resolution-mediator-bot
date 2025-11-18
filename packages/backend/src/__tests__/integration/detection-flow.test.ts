import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../server';
import { prisma } from '../../lib/db';
import type { FastifyInstance } from 'fastify';

/**
 * Integration test for the complete detection and mediation flow
 * Tests the vertical slice: ingest → detect → case creation → retrieval
 */

describe('Detection and Mediation Flow - Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Clean database before tests
    await prisma.mediationStep.deleteMany();
    await prisma.mediationCase.deleteMany();
    await prisma.conflictSignal.deleteMany();
    await prisma.conversationThread.deleteMany();

    // Build server
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  it('should complete full flow: ingest → detect conflict → auto-create case → retrieve case', async () => {
    // Step 1: Ingest a conversation with clear conflict
    const ingestResponse = await server.inject({
      method: 'POST',
      url: '/api/detection/ingest',
      payload: {
        communityId: 'test-community',
        externalThreadId: 'conflict-thread-001',
        sourceType: 'chat',
        messages: [
          {
            id: 'msg-1',
            author: 'alice',
            content: 'I think we should use approach A for this feature.',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'msg-2',
            author: 'bob',
            content:
              'Are you serious? That approach is completely wrong and will never work. This is ridiculous!',
            timestamp: new Date(Date.now() + 5000).toISOString(),
          },
          {
            id: 'msg-3',
            author: 'alice',
            content:
              'You always dismiss my ideas! This is unacceptable. You never listen to anyone else.',
            timestamp: new Date(Date.now() + 10000).toISOString(),
          },
        ],
      },
    });

    expect(ingestResponse.statusCode).toBe(200);
    const ingestData = JSON.parse(ingestResponse.body);

    // Verify detection result
    expect(ingestData.detection.hasConflict).toBe(true);
    expect(ingestData.detection.score).toBeGreaterThan(0.5);
    expect(ingestData.signal).toBeDefined();
    expect(ingestData.signal.signalType).toMatch(/potential|escalated/);

    // Verify thread was created
    expect(ingestData.thread).toBeDefined();
    expect(ingestData.thread.communityId).toBe('test-community');
    expect(ingestData.thread.externalThreadId).toBe('conflict-thread-001');

    const threadId = ingestData.thread.id;

    // Step 2: Verify signal was created in database
    const signals = await prisma.conflictSignal.findMany({
      where: { threadId },
    });

    expect(signals.length).toBeGreaterThan(0);
    const signal = signals[0];
    expect(signal.summaryMarkdown).toBeTruthy();
    expect(signal.score).toBeGreaterThan(0.5);

    // Step 3: Check if mediation case was auto-created (for high-score conflicts)
    if (ingestData.mediationCase) {
      const caseId = ingestData.mediationCase.id;

      // Step 4: Retrieve the case via API
      const getCaseResponse = await server.inject({
        method: 'GET',
        url: `/api/cases/${caseId}`,
      });

      expect(getCaseResponse.statusCode).toBe(200);
      const caseData = JSON.parse(getCaseResponse.body);

      expect(caseData.id).toBe(caseId);
      expect(caseData.threadId).toBe(threadId);
      expect(caseData.status).toBe('open');
      expect(caseData.thread).toBeDefined();
      expect(caseData.steps).toBeDefined();
    }

    // Step 5: List all cases
    const listCasesResponse = await server.inject({
      method: 'GET',
      url: '/api/cases',
    });

    expect(listCasesResponse.statusCode).toBe(200);
    const listData = JSON.parse(listCasesResponse.body);
    expect(listData.cases).toBeDefined();
    expect(Array.isArray(listData.cases)).toBe(true);
  });

  it('should not create case for low-conflict conversation', async () => {
    const ingestResponse = await server.inject({
      method: 'POST',
      url: '/api/detection/ingest',
      payload: {
        communityId: 'test-community',
        externalThreadId: 'friendly-thread-001',
        sourceType: 'forum',
        messages: [
          {
            id: 'msg-1',
            author: 'carol',
            content: 'Great work on the project everyone!',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'msg-2',
            author: 'dave',
            content: 'Thanks! I appreciate the collaboration.',
            timestamp: new Date(Date.now() + 5000).toISOString(),
          },
        ],
      },
    });

    expect(ingestResponse.statusCode).toBe(200);
    const data = JSON.parse(ingestResponse.body);

    // Should detect no conflict
    expect(data.detection.hasConflict).toBe(false);
    expect(data.detection.score).toBeLessThan(0.4);

    // Should not auto-create mediation case
    expect(data.mediationCase).toBeNull();
  });

  it('should update case status via API', async () => {
    // First create a case by ingesting a conflict
    const ingestResponse = await server.inject({
      method: 'POST',
      url: '/api/detection/ingest',
      payload: {
        communityId: 'test-community',
        externalThreadId: 'update-test-thread',
        sourceType: 'chat',
        messages: [
          {
            id: 'msg-1',
            author: 'user1',
            content: 'This is completely unacceptable! I refuse to accept this approach.',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });

    const ingestData = JSON.parse(ingestResponse.body);

    // If case was created, try updating it
    if (ingestData.mediationCase) {
      const caseId = ingestData.mediationCase.id;

      // Update case status
      const updateResponse = await server.inject({
        method: 'PATCH',
        url: `/api/cases/${caseId}`,
        payload: {
          status: 'in_progress',
          assignedMediatorRef: 'mediator@test.com',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updatedCase = JSON.parse(updateResponse.body);

      expect(updatedCase.status).toBe('in_progress');
      expect(updatedCase.assignedMediatorRef).toBe('mediator@test.com');
    }
  });

  it('should retrieve signals via API with filters', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/signals?signalType=escalated&limit=10',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);

    expect(data.signals).toBeDefined();
    expect(Array.isArray(data.signals)).toBe(true);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.limit).toBe(10);
  });

  it('should get detection service status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/detection/status',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);

    expect(data).toHaveProperty('aiEnabled');
    expect(data).toHaveProperty('ruleBasedEnabled');
    expect(data.ruleBasedEnabled).toBe(true);
  });

  it('should handle invalid input gracefully', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/detection/ingest',
      payload: {
        // Missing required fields
        communityId: 'test',
      },
    });

    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.body);
    expect(data.error).toBe('ValidationError');
  });
});
