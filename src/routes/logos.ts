import { FastifyInstance } from 'fastify';
import { getBancaLogo } from '../services/logo-fetcher.js';

export default async function logosRoutes(app: FastifyInstance) {
  /**
   * GET /logos/bancas/:id
   * Retorna o logo de uma banca do banco de dados
   */
  app.get('/logos/bancas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const logo = await getBancaLogo(id);
      
      if (!logo) {
        return reply.code(404).send({ error: 'Logo não encontrado' });
      }
      
      // Define o Content-Type baseado no MIME type armazenado
      reply.type(logo.mimeType);
      
      // Define cache headers para melhor performance
      reply.header('Cache-Control', 'public, max-age=86400'); // 24 horas
      reply.header('ETag', `"${id}"`);
      
      // Retorna os dados binários da imagem
      return reply.send(logo.data);
      
    } catch (error) {
      console.error(`[Logos Route] Erro ao buscar logo da banca ${id}:`, error);
      return reply.code(500).send({ error: 'Erro ao buscar logo' });
    }
  });
  
  /**
   * GET /logos/bancas/:id/info
   * Retorna informações sobre o logo (sem os dados binários)
   */
  app.get('/logos/bancas/:id/info', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const logo = await getBancaLogo(id);
      
      if (!logo) {
        return reply.code(404).send({ 
          exists: false,
          message: 'Logo não encontrado' 
        });
      }
      
      return reply.send({
        exists: true,
        mimeType: logo.mimeType,
        size: logo.data.length,
        url: `/logos/bancas/${id}`
      });
      
    } catch (error) {
      console.error(`[Logos Route] Erro ao buscar info do logo da banca ${id}:`, error);
      return reply.code(500).send({ error: 'Erro ao buscar informações do logo' });
    }
  });
}
