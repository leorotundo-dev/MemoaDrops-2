import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { registerDeviceController } from '../controllers/devicesController.js';

export async function devicesRoutes(app: FastifyInstance){
  app.post('/devices/register', { preHandler: [authenticate] }, registerDeviceController);
}
