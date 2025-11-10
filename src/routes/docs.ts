import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';

export async function docsRoutes(app: FastifyInstance) {
  await app.register(fastifySwagger, {
    openapi: {
      info: { title: 'MemoDrops API', version: '2.0.0' }
    }
  });
  await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true }
  });
  app.ready(err => {
    if (!err) app.swagger();
  });
}
