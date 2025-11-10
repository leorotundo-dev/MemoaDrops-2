import { FastifyPluginAsync } from 'fastify';
import { AppError } from './AppError.js';

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      req.log.warn({ err }, 'AppError');
      return reply.code(err.status).send({ error: err.message, details: err.payload });
    }
    req.log.error({ err }, 'Unhandled');
    return reply.code(500).send({ error: 'internal_error' });
  });
};
