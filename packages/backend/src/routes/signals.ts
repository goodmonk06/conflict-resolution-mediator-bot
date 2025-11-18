import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db';

/**
 * Conflict Signal API routes
 */

const signalRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/signals
   * List conflict signals with optional filters
   */
  server.get('/', async (request, reply) => {
    const {
      threadId,
      signalType,
      minScore,
      limit = 50,
      offset = 0
    } = request.query as {
      threadId?: string;
      signalType?: string;
      minScore?: number;
      limit?: number;
      offset?: number;
    };

    const where: any = {};

    if (threadId) {
      where.threadId = threadId;
    }

    if (signalType) {
      where.signalType = signalType;
    }

    if (minScore !== undefined) {
      where.score = { gte: Number(minScore) };
    }

    const [signals, total] = await Promise.all([
      prisma.conflictSignal.findMany({
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
        },
        orderBy: { timestamp: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.conflictSignal.count({ where }),
    ]);

    return {
      signals,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    };
  });

  /**
   * GET /api/signals/:id
   * Get a specific conflict signal
   */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const signal = await prisma.conflictSignal.findUnique({
      where: { id },
      include: {
        thread: true,
      },
    });

    if (!signal) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Signal not found',
      });
    }

    return signal;
  });

  /**
   * GET /api/signals/stats/summary
   * Get summary statistics about conflict signals
   */
  server.get('/stats/summary', async (request, reply) => {
    const { communityId } = request.query as { communityId?: string };

    const where = communityId
      ? { thread: { communityId } }
      : {};

    const [
      totalSignals,
      potentialCount,
      escalatedCount,
      resolvedCount,
      avgScore,
    ] = await Promise.all([
      prisma.conflictSignal.count({ where }),
      prisma.conflictSignal.count({ where: { ...where, signalType: 'potential' } }),
      prisma.conflictSignal.count({ where: { ...where, signalType: 'escalated' } }),
      prisma.conflictSignal.count({ where: { ...where, signalType: 'resolved' } }),
      prisma.conflictSignal.aggregate({
        where,
        _avg: { score: true },
      }),
    ]);

    return {
      totalSignals,
      byType: {
        potential: potentialCount,
        escalated: escalatedCount,
        resolved: resolvedCount,
      },
      averageScore: avgScore._avg.score || 0,
    };
  });
};

export default signalRoutes;
