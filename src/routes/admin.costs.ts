import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { aggregateMonthlyAPICosts } from '../jobs/aggregate-costs.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

export const adminCostsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/admin/costs/aggregate', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const body = (request.body || {}) as { month?: string };
    const target = body.month ? new Date(body.month) : undefined;
    const results = await aggregateMonthlyAPICosts(target);
    return { message: 'Costs aggregated successfully', aggregated: results, total: results.reduce((s, r) => s + r.total_cost, 0) };
  });
};
