import type { FastifyPluginAsync } from 'fastify';
import { IngestConversationSchema } from '../types/schemas';
import { detectionService } from '../services/detection-service';
import { prisma } from '../lib/db';
import { SignalType, SourceType, CaseStatus } from '@prisma/client';

/**
 * Detection API routes
 *
 * These endpoints handle conversation ingestion and conflict detection
 */

const detectionRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /api/detection/ingest
   * Ingest a conversation and detect potential conflicts
   */
  server.post('/ingest', async (request, reply) => {
    try {
      // Validate request body
      const body = IngestConversationSchema.parse(request.body);

      server.log.info({
        communityId: body.communityId,
        threadId: body.externalThreadId,
        messageCount: body.messages.length,
      }, 'Ingesting conversation');

      // Find or create conversation thread
      let thread = await prisma.conversationThread.findUnique({
        where: {
          communityId_externalThreadId: {
            communityId: body.communityId,
            externalThreadId: body.externalThreadId,
          },
        },
      });

      if (!thread) {
        thread = await prisma.conversationThread.create({
          data: {
            communityId: body.communityId,
            externalThreadId: body.externalThreadId,
            sourceType: body.sourceType === 'chat' ? SourceType.chat : SourceType.forum,
          },
        });

        server.log.info({ threadId: thread.id }, 'Created new conversation thread');
      }

      // Detect conflicts
      const detection = await detectionService.detect(body.messages);

      server.log.info({
        threadId: thread.id,
        hasConflict: detection.hasConflict,
        score: detection.score,
        method: detection.detectionMethod,
      }, 'Conflict detection completed');

      // Create conflict signal if detected
      let signal = null;
      let mediationCase = null;

      if (detection.hasConflict) {
        signal = await prisma.conflictSignal.create({
          data: {
            threadId: thread.id,
            timestamp: new Date(body.messages[body.messages.length - 1].timestamp),
            signalType: detection.signalType as SignalType,
            summaryMarkdown: detection.summaryMarkdown,
            score: detection.score,
            metaJson: {
              keywords: detection.keywords,
              participants: detection.participants,
              confidence: detection.confidence,
              detectionMethod: detection.detectionMethod,
              messageCount: body.messages.length,
            },
          },
        });

        server.log.info({ signalId: signal.id }, 'Created conflict signal');

        // Auto-create mediation case for escalated conflicts or high-score potentials
        if (detection.signalType === 'escalated' || detection.score >= 0.75) {
          // Check if there's already an open case for this thread
          const existingCase = await prisma.mediationCase.findFirst({
            where: {
              threadId: thread.id,
              status: {
                in: [CaseStatus.open, CaseStatus.in_progress],
              },
            },
          });

          if (!existingCase) {
            mediationCase = await prisma.mediationCase.create({
              data: {
                threadId: thread.id,
                status: CaseStatus.open,
                assignedMediatorRef: null,
                notesMarkdown: `## Auto-generated Case\n\nThis case was automatically created due to ${detection.signalType} conflict detection.\n\n**Detection Score:** ${Math.round(detection.score * 100)}%\n**Method:** ${detection.detectionMethod}\n\n${detection.summaryMarkdown}`,
              },
            });

            server.log.info({ caseId: mediationCase.id }, 'Auto-created mediation case');
          }
        }
      }

      return reply.status(200).send({
        thread: {
          id: thread.id,
          communityId: thread.communityId,
          externalThreadId: thread.externalThreadId,
        },
        detection: {
          hasConflict: detection.hasConflict,
          score: detection.score,
          signalType: detection.signalType,
          detectionMethod: detection.detectionMethod,
          confidence: detection.confidence,
        },
        signal: signal ? {
          id: signal.id,
          signalType: signal.signalType,
        } : null,
        mediationCase: mediationCase ? {
          id: mediationCase.id,
          status: mediationCase.status,
        } : null,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'Invalid request body',
          details: error,
        });
      }

      server.log.error({ error }, 'Failed to ingest conversation');
      throw error;
    }
  });

  /**
   * GET /api/detection/status
   * Get detection service status
   */
  server.get('/status', async (request, reply) => {
    return {
      aiEnabled: detectionService.isAIAvailable(),
      ruleBasedEnabled: true,
      timestamp: new Date().toISOString(),
    };
  });
};

export default detectionRoutes;
