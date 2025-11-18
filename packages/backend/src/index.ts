import 'dotenv/config';
import { buildServer } from './server';
import { logger } from './lib/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    const server = await buildServer();

    await server.listen({
      port: PORT,
      host: HOST,
    });

    logger.info(`🚀 Server running at http://${HOST}:${PORT}`);
    logger.info(`📊 Health check available at http://${HOST}:${PORT}/health`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
