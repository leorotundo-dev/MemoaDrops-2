import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export const docsRoutes = fp(async function (app: FastifyInstance) {
  // Registra o gerador OpenAPI
  await app.register(swagger, {
    openapi: {
      info: { title: 'MemoDrops API', version: '2.0.0' }
    }
  });

  // Registra a UI em /docs (e /docs/)
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
    staticCSP: true
  });

  // Não chame app.ready aqui; o server.ts fará isso e chamará app.swagger()
});
