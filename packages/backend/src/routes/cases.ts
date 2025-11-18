import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db';
import {
  UpdateCaseSchema,
  CreateMediationStepSchema,
  UpdateMediationStepSchema,
} from '../types/schemas';
import { detectionService } from '../services/detection-service';

/**
 * Mediation Case API routes
 */

const caseRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/cases
   * List mediation cases with optional filters
   */
  server.get('/', async (request, reply) => {
    const {
      status,
      assignedMediatorRef,
      limit = 50,
      offset = 0
    } = request.query as {
      status?: string;
      assignedMediatorRef?: string;
      limit?: number;
      offset?: number;
    };

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (assignedMediatorRef) {
      where.assignedMediatorRef = assignedMediatorRef;
    }

    const [cases, total] = await Promise.all([
      prisma.mediationCase.findMany({
        where,
        include: {
          thread: {
            select: {
              id: true,
              communityId: true,
              externalThreadId: true,
              sourceType: true,
            },
          },
          steps: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.mediationCase.count({ where }),
    ]);

    return {
      cases,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    };
  });

  /**
   * GET /api/cases/:id
   * Get a specific mediation case with full details
   */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const mediationCase = await prisma.mediationCase.findUnique({
      where: { id },
      include: {
        thread: {
          include: {
            conflictSignals: {
              orderBy: { timestamp: 'desc' },
            },
          },
        },
        steps: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!mediationCase) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Mediation case not found',
      });
    }

    return mediationCase;
  });

  /**
   * PATCH /api/cases/:id
   * Update a mediation case
   */
  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const body = UpdateCaseSchema.parse(request.body);

      const updated = await prisma.mediationCase.update({
        where: { id },
        data: body,
        include: {
          thread: true,
          steps: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'Invalid request body',
          details: error,
        });
      }

      return reply.status(404).send({
        error: 'NotFound',
        message: 'Mediation case not found',
      });
    }
  });

  /**
   * POST /api/cases/:id/steps
   * Add a new step to a mediation case
   */
  server.post('/:id/steps', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const body = CreateMediationStepSchema.parse(request.body);

      // Get the current max orderIndex
      const maxStep = await prisma.mediationStep.findFirst({
        where: { caseId: id },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const nextIndex = maxStep ? maxStep.orderIndex + 1 : 0;

      const step = await prisma.mediationStep.create({
        data: {
          caseId: id,
          orderIndex: nextIndex,
          actionType: body.actionType,
          notesMarkdown: body.notesMarkdown,
          suggestedMessageMarkdown: body.suggestedMessageMarkdown,
        },
      });

      return reply.status(201).send(step);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'Invalid request body',
          details: error,
        });
      }

      server.log.error({ error }, 'Failed to create mediation step');
      throw error;
    }
  });

  /**
   * POST /api/cases/:id/steps/generate
   * Generate AI suggestion for next mediation step
   */
  server.post('/:id/steps/generate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { actionType } = request.body as { actionType: string };

    if (!actionType) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: 'actionType is required',
      });
    }

    try {
      // Get case details
      const mediationCase = await prisma.mediationCase.findUnique({
        where: { id },
        include: {
          thread: {
            include: {
              conflictSignals: {
                orderBy: { timestamp: 'desc' },
                take: 1,
              },
            },
          },
          steps: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!mediationCase) {
        return reply.status(404).send({
          error: 'NotFound',
          message: 'Mediation case not found',
        });
      }

      // Build context for AI
      const latestSignal = mediationCase.thread.conflictSignals[0];
      const threadSummary = latestSignal?.summaryMarkdown || 'No conflict summary available';

      const previousSteps = mediationCase.steps
        .filter(s => s.completedAt)
        .map(s => `${s.actionType}: ${s.notesMarkdown || 'Completed'}`);

      const suggestion = await detectionService.generateMediationSuggestion(
        actionType,
        {
          threadSummary,
          previousSteps,
          caseNotes: mediationCase.notesMarkdown || undefined,
        }
      );

      return {
        actionType,
        suggestedMessageMarkdown: suggestion,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not available')) {
        return reply.status(503).send({
          error: 'ServiceUnavailable',
          message: error.message,
        });
      }

      server.log.error({ error }, 'Failed to generate mediation suggestion');
      throw error;
    }
  });

  /**
   * PATCH /api/cases/:caseId/steps/:stepId
   * Update a mediation step
   */
  server.patch('/:caseId/steps/:stepId', async (request, reply) => {
    const { caseId, stepId } = request.params as { caseId: string; stepId: string };

    try {
      const body = UpdateMediationStepSchema.parse(request.body);

      const data: any = {};

      if (body.notesMarkdown !== undefined) {
        data.notesMarkdown = body.notesMarkdown;
      }

      if (body.suggestedMessageMarkdown !== undefined) {
        data.suggestedMessageMarkdown = body.suggestedMessageMarkdown;
      }

      if (body.completedAt !== undefined) {
        data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
      }

      const step = await prisma.mediationStep.update({
        where: { id: stepId },
        data,
      });

      return step;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'Invalid request body',
          details: error,
        });
      }

      return reply.status(404).send({
        error: 'NotFound',
        message: 'Mediation step not found',
      });
    }
  });

  /**
   * GET /api/cases/stats/summary
   * Get summary statistics about mediation cases
   */
  server.get('/stats/summary', async (request, reply) => {
    const [
      totalCases,
      openCount,
      inProgressCount,
      resolvedCount,
      dismissedCount,
    ] = await Promise.all([
      prisma.mediationCase.count(),
      prisma.mediationCase.count({ where: { status: 'open' } }),
      prisma.mediationCase.count({ where: { status: 'in_progress' } }),
      prisma.mediationCase.count({ where: { status: 'resolved' } }),
      prisma.mediationCase.count({ where: { status: 'dismissed' } }),
    ]);

    return {
      totalCases,
      byStatus: {
        open: openCount,
        in_progress: inProgressCount,
        resolved: resolvedCount,
        dismissed: dismissedCount,
      },
    };
  });
};

export default caseRoutes;
