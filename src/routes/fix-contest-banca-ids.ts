import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

export default async function fixContestBancaIds(app: FastifyInstance) {
  app.post('/admin/fix-contest-banca-ids', async (request, reply) => {
    try {
      console.log('[Fix] Iniciando correção de banca_id dos concursos...');
      
      // Buscar todos os concursos com banca_id NULL
      const { rows: contests } = await pool.query(`
        SELECT id, nome, dou_url
        FROM concursos
        WHERE banca_id IS NULL
      `);
      
      console.log(`[Fix] Encontrados ${contests.length} concursos sem banca_id`);
      
      let fixedCount = 0;
      
      for (const contest of contests) {
        try {
          // Tentar identificar a banca pelo nome do concurso ou URL
          const contestName = contest.nome.toLowerCase();
          const contestUrl = (contest.dou_url || '').toLowerCase();
          
          // Mapeamento de palavras-chave para bancas
          const bancaKeywords: Record<string, string[]> = {
            'fgv': ['fgv', 'fundacao getulio vargas', 'conhecimento.fgv'],
            'fcc': ['fcc', 'fundacao carlos chagas', 'concursosfcc'],
            'cebraspe': ['cebraspe', 'cespe', 'unb'],
            'vunesp': ['vunesp'],
            'cesgranrio': ['cesgranrio'],
            'quadrix': ['quadrix'],
            'ibfc': ['ibfc'],
            'aocp': ['aocp', 'instituto aocp'],
          };
          
          let bancaName: string | null = null;
          
          // Procurar palavra-chave no nome ou URL
          for (const [banca, keywords] of Object.entries(bancaKeywords)) {
            for (const keyword of keywords) {
              if (contestName.includes(keyword) || contestUrl.includes(keyword)) {
                bancaName = banca;
                break;
              }
            }
            if (bancaName) break;
          }
          
          if (bancaName) {
            // Buscar ID da banca
            const { rows: [banca] } = await pool.query(
              'SELECT id FROM bancas WHERE LOWER(name) = $1 OR LOWER(sigla) = $1',
              [bancaName]
            );
            
            if (banca) {
              // Atualizar concurso com banca_id
              await pool.query(
                'UPDATE concursos SET banca_id = $1 WHERE id = $2',
                [banca.id, contest.id]
              );
              
              fixedCount++;
              console.log(`[Fix] Concurso "${contest.nome}" → Banca ID ${banca.id} (${bancaName})`);
            }
          }
        } catch (error) {
          console.error(`[Fix] Erro ao processar concurso ${contest.id}:`, error);
        }
      }
      
      console.log(`[Fix] Correção concluída: ${fixedCount} concursos atualizados`);
      
      return {
        success: true,
        total: contests.length,
        fixed: fixedCount,
        message: `${fixedCount} de ${contests.length} concursos foram corrigidos`
      };
      
    } catch (error: any) {
      console.error('[Fix] Erro ao corrigir banca_ids:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
}
