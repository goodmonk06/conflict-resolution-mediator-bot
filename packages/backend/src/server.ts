import Fastify from 'fastify';
import cors from '@fastify/cors';
import { logger } from './lib/logger';
import { prisma } from './lib/db';

export async function buildServer() {
  const server = Fastify({
    logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
  });

  // Register CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  // Health check endpoint
  server.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      server.log.error(error, 'Health check failed');
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      };
    }
  });

  // Register routes
  await server.register(import('./routes/threads'), { prefix: '/api/threads' });
  await server.register(import('./routes/signals'), { prefix: '/api/signals' });
  await server.register(import('./routes/cases'), { prefix: '/api/cases' });
  await server.register(import('./routes/detection'), { prefix: '/api/detection' });

  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error({ error, url: request.url, method: request.method }, 'Request error');

    reply.status(error.statusCode || 500).send({
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
      statusCode: error.statusCode || 500,
    });
  });

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    server.log.info(`Received ${signal}, closing server gracefully`);
    await server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  process.on('SIGINT', () => closeGracefully('SIGINT'));

  return server;
}
