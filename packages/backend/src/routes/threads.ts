import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db';

/**
 * Conversation Thread API routes
 */

const threadRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/threads
   * List all conversation threads
   */
  server.get('/', async (request, reply) => {
    const { communityId, limit = 50, offset = 0 } = request.query as {
      communityId?: string;
      limit?: number;
      offset?: number;
    };

    const where = communityId ? { communityId } : {};

    const [threads, total] = await Promise.all([
      prisma.conversationThread.findMany({
        where,
        include: {
          conflictSignals: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          mediationCases: {
            where: {
              status: {
                in: ['open', 'in_progress'],
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.conversationThread.count({ where }),
    ]);

    return {
      threads,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    };
  });

  /**
   * GET /api/threads/:id
   * Get a specific thread with all signals and cases
   */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const thread = await prisma.conversationThread.findUnique({
      where: { id },
      include: {
        conflictSignals: {
          orderBy: { timestamp: 'desc' },
        },
        mediationCases: {
          include: {
            steps: {
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!thread) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Thread not found',
      });
    }

    return thread;
  });

  /**
   * DELETE /api/threads/:id
   * Delete a thread (and cascade to signals and cases)
   */
  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.conversationThread.delete({
        where: { id },
      });

      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Thread not found',
      });
    }
  });
};

export default threadRoutes;
