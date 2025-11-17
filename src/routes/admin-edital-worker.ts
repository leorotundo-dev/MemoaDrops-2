import { FastifyInstance } from 'fastify';
import { editalWorker } from '../workers/edital-worker.js';

export async function adminEditalWorkerRoutes(app: FastifyInstance) {
  
  /**
   * Inicia o worker de extração de editais
   * POST /admin/edital-worker/start?limit=N
   */
  app.post('/admin/edital-worker/start', async (request, reply) => {
    try {
      const { limit } = request.query as { limit?: string };
      const limitNum = limit ? parseInt(limit) : undefined;
      
      const status = editalWorker.getStatus();
      
      if (status.running) {
        return reply.status(400).send({
          success: false,
          error: 'Worker já está rodando',
          status,
        });
      }
      
      // Iniciar worker em background (não aguardar)
      editalWorker.start(limitNum).catch(error => {
        console.error('[Admin] Erro no worker:', error);
      });
      
      // Aguardar um pouco para o worker inicializar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: 'Worker iniciado',
        status: editalWorker.getStatus(),
      };
      
    } catch (error: any) {
      console.error('[Admin] Erro ao iniciar worker:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  /**
   * Retorna status do worker
   * GET /admin/edital-worker/status
   */
  app.get('/admin/edital-worker/status', async (request, reply) => {
    try {
      const status = editalWorker.getStatus();
      
      return {
        success: true,
        status,
      };
      
    } catch (error: any) {
      console.error('[Admin] Erro ao obter status:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  /**
   * Para o worker
   * POST /admin/edital-worker/stop
   */
  app.post('/admin/edital-worker/stop', async (request, reply) => {
    try {
      const status = editalWorker.getStatus();
      
      if (!status.running) {
        return reply.status(400).send({
          success: false,
          error: 'Worker não está rodando',
          status,
        });
      }
      
      editalWorker.stop();
      
      return {
        success: true,
        message: 'Worker parando...',
        status: editalWorker.getStatus(),
      };
      
    } catch (error: any) {
      console.error('[Admin] Erro ao parar worker:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
