import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { registerDeviceController } from '../controllers/devicesController.js';

export async function devicesRoutes(app: FastifyInstance){
  // Registra/atualiza token de push do dispositivo do usuário autenticado
  app.post('/devices', { preHandler: [authenticate] }, registerDeviceController);
}
