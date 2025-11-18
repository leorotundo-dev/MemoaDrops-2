import { FastifyInstance } from 'fastify';
import { getAllBanks, isValidBankSlug, getBankConfig } from '../config/banks.js';

export default async function adminAvailableBanksRoutes(app: FastifyInstance) {
  
  // GET /admin/available-banks - Lista todas as bancas disponíveis
  app.get('/admin/available-banks', async (request, reply) => {
    try {
      const banks = getAllBanks();
      
      return reply.send({
        total: banks.length,
        banks: banks.sort((a, b) => a.name.localeCompare(b.name))
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        erro: 'Erro ao listar bancas disponíveis',
        detalhe: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /admin/available-banks/:slug - Detalhes de uma banca específica
  app.get('/admin/available-banks/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    
    try {
      if (!isValidBankSlug(slug)) {
        return reply.status(404).send({
          erro: 'Banca não encontrada',
          detalhe: `A banca '${slug}' não está configurada no sistema`
        });
      }
      
      const config = getBankConfig(slug);
      
      return reply.send({
        slug,
        ...config
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        erro: 'Erro ao buscar detalhes da banca',
        detalhe: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
