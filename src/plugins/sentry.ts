import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export default fp(async (app) => {
  if (!process.env.SENTRY_DSN) {
    app.log.warn('[sentry] SENTRY_DSN not set, skipping Sentry init');
    return;
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 0.3,
    profilesSampleRate: 0.2,
  });

  app.addHook('onRequest', (req, _reply, done) => {
    Sentry.addBreadcrumb({ category: 'http', message: `${req.method} ${req.url}`, level: 'info' });
    done();
  });

  app.setErrorHandler((err, req, reply) => {
    Sentry.captureException(err, { tags: { route: (req as any).routeOptions?.url || req.url } });
    reply.status((err as any).statusCode || 500).send({ error: 'internal_error' });
  });
});
