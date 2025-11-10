import Fastify from 'fastify';
import { authRoutes } from '../../src/routes/auth';
import { llmRoutes } from '../../src/routes/llm';
import { usersRoutes } from '../../src/routes/users';
import { cardsRoutes } from '../../src/routes/cards';
import { decksRoutes } from '../../src/routes/decks';
import { reviewsRoutes } from '../../src/routes/reviews';
import { studySessionsRoutes } from '../../src/routes/study-sessions';

export async function buildTestApp() {
  const app = Fastify({ logger: false });
  // Register only the routes we need; if some files don't exist in your repo,
  // comment out the corresponding line.
  try { await app.register(authRoutes as any); } catch {}
  try { await app.register(llmRoutes as any); } catch {}
  try { await app.register(usersRoutes as any); } catch {}
  try { await app.register(cardsRoutes as any); } catch {}
  try { await app.register(decksRoutes as any); } catch {}
  try { await app.register(reviewsRoutes as any); } catch {}
  try { await app.register(studySessionsRoutes as any); } catch {}
  await app.ready();
  return app;
}
