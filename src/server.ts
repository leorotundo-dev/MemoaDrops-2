import Fastify from 'fastify';
import cors from '@fastify/cors';

// Plugins utilitários existentes no projeto
import sentry from './plugins/sentry.js';
import security from './plugins/security.js';
import { metricsOnResponse } from './metrics/metrics.js';

// Rotas básicas e de documentação
import { healthRoutes } from './routes/health.js';
import { docsRoutes } from './routes/docs.js';

// (Suas demais rotas — manter como já estão)
// import { authRoutes } from './routes/auth.js';
// import { usersRoutes } from './routes/users.js';
// import { decksRoutes } from './routes/decks.js';
// import { cardsRoutes } from './routes/cards.js';
// import { llmRoutes } from './routes/llm.js';
// ...

export async function buildApp() {
  // ignoreTrailingSlash evita 404 quando o cliente usa /path/ em vez de /path
  const app = Fastify({ logger: true, ignoreTrailingSlash: true });

  // Segurança/observabilidade básicos
  await app.register(sentry);
  await app.register(security);
  await app.register(cors, {
    origin: (process.env.CORS_ORIGIN || '*').split(','),
    credentials: true
  });
  app.addHook('onResponse', metricsOnResponse());

  // Registre primeiramente rotas de health/docs para facilitar troubleshooting
  await app.register(healthRoutes);
  await app.register(docsRoutes);

  // (Demais rotas do seu app)
  // await app.register(authRoutes);
  // await app.register(usersRoutes);
  // await app.register(decksRoutes);
  // await app.register(cardsRoutes);
  // await app.register(llmRoutes);
  // ...

  // Garante que tudo foi carregado antes de expor o Swagger
  await app.ready();
  // Se o decorator swagger existir (registrado por docsRoutes), constrói o JSON
  if (typeof (app as any).swagger === 'function') {
    (app as any).swagger();
  }

  return app;
}

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Inicia somente se este arquivo for o entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
