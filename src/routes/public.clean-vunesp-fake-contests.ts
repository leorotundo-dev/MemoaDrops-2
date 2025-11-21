import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export async function publicCleanVunespFakeContestsRoutes(app: FastifyInstance) {
  
  // Limpar "concursos" que são na verdade links de menu/footer
  app.post('/public/clean-vunesp-fake-contests', async (request, reply) => {
    try {
      console.log(`[Clean Vunesp Fake] Iniciando limpeza de concursos falsos`);
      
      // Lista de nomes que NÃO são concursos
      const fakeNames = [
        'Teclas de atalho',
        'licitações',
        'Transparência',
        'Portal do Cliente',
        'Portal do Colaborador',
        'Área do Candidato',
        'Quem Somos',
        'Fundação Vunesp',
        'Política do SGI',
        'Política de Privacidade',
        'Instituições Atendidas',
        'Como Contratar',
        'Certificações',
        'Certificação',
        'Diferenciais',
        'Área de atuação',
        'Encerrados',
        'Em andamento',
        'Próximos',
        'Inscrições abertas',
        'Home',
        'LGPD',
        'Comissões',
      ];
      
      // Deletar concursos com esses nomes
      const { rowCount } = await pool.query(`
        DELETE FROM concursos
        WHERE banca_id IN (SELECT id FROM bancas WHERE LOWER(name) = 'vunesp')
        AND name = ANY($1::text[])
      `, [fakeNames]);
      
      console.log(`[Clean Vunesp Fake] ✅ Removidos ${rowCount} concursos falsos`);
      
      return {
        success: true,
        removed: rowCount,
        message: `${rowCount} concursos falsos foram removidos`,
      };
      
    } catch (error: any) {
      console.error('[Clean Vunesp Fake] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
