import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function docsRoutes(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MemoDrops API',
        version: '2.0.0',
        description: 'API para o sistema de flashcards MemoDrops'
      },
      servers: [
        {
          url: 'https://api-production-5ffc.up.railway.app',
          description: 'Production server'
        }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
}
