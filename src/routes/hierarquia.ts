import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';

/**
 * Rotas para consultar hierarquia de matérias/tópicos/subtópicos
 */
export default async function hierarquiaRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/concursos/:contestId/hierarquia
   * Retorna hierarquia completa de um concurso
   */
  fastify.get('/api/concursos/:contestId/hierarquia', async (request, reply) => {
    const { contestId } = request.params as { contestId: string };
    
    try {
      const result = await pool.query(`
        SELECT 
          m.id as materia_id,
          m.nome as materia_nome,
          m.slug as materia_slug,
          t.id as topico_id,
          t.nome as topico_nome,
          t.slug as topico_slug,
          t.descricao as topico_descricao,
          t.ordem as topico_ordem,
          st.id as subtopico_id,
          st.nome as subtopico_nome,
          st.slug as subtopico_slug,
          st.descricao as subtopico_descricao,
          st.ordem as subtopico_ordem,
          sst.id as subsubtopico_id,
          sst.nome as subsubtopico_nome,
          sst.slug as subsubtopico_slug,
          sst.descricao as subsubtopico_descricao,
          sst.ordem as subsubtopico_ordem
        FROM materias m
        LEFT JOIN topicos t ON t.materia_id = m.id
        LEFT JOIN subtopicos st ON st.topico_id = t.id
        LEFT JOIN subsubtopicos sst ON sst.subtopico_id = st.id
        WHERE m.contest_id = $1
        ORDER BY 
          m.nome,
          t.ordem NULLS LAST,
          st.ordem NULLS LAST,
          sst.ordem NULLS LAST
      `, [contestId]);
      
      // Organizar em hierarquia
      const materias: any[] = [];
      const materiasMap = new Map();
      
      for (const row of result.rows) {
        // Matéria
        if (!materiasMap.has(row.materia_id)) {
          const materia = {
            id: row.materia_id,
            nome: row.materia_nome,
            slug: row.materia_slug,
            topicos: []
          };
          materiasMap.set(row.materia_id, materia);
          materias.push(materia);
        }
        
        const materia = materiasMap.get(row.materia_id);
        
        // Tópico
        if (row.topico_id) {
          let topico = materia.topicos.find((t: any) => t.id === row.topico_id);
          if (!topico) {
            topico = {
              id: row.topico_id,
              nome: row.topico_nome,
              slug: row.topico_slug,
              descricao: row.topico_descricao,
              ordem: row.topico_ordem,
              subtopicos: []
            };
            materia.topicos.push(topico);
          }
          
          // Subtópico
          if (row.subtopico_id) {
            let subtopico = topico.subtopicos.find((st: any) => st.id === row.subtopico_id);
            if (!subtopico) {
              subtopico = {
                id: row.subtopico_id,
                nome: row.subtopico_nome,
                slug: row.subtopico_slug,
                descricao: row.subtopico_descricao,
                ordem: row.subtopico_ordem,
                subsubtopicos: []
              };
              topico.subtopicos.push(subtopico);
            }
            
            // Sub-subtópico
            if (row.subsubtopico_id) {
              const subsubtopico = {
                id: row.subsubtopico_id,
                nome: row.subsubtopico_nome,
                slug: row.subsubtopico_slug,
                descricao: row.subsubtopico_descricao,
                ordem: row.subsubtopico_ordem
              };
              if (!subtopico.subsubtopicos.find((sst: any) => sst.id === subsubtopico.id)) {
                subtopico.subsubtopicos.push(subsubtopico);
              }
            }
          }
        }
      }
      
      return { materias };
      
    } catch (error: any) {
      console.error('[Hierarquia API] Erro:', error.message);
      return reply.status(500).send({ error: error.message });
    }
  });
  
  /**
   * GET /api/materias/:materiaId/topicos
   * Retorna tópicos de uma matéria
   */
  fastify.get('/api/materias/:materiaId/topicos', async (request, reply) => {
    const { materiaId } = request.params as { materiaId: string };
    
    try {
      const result = await pool.query(`
        SELECT 
          id,
          nome,
          slug,
          descricao,
          ordem
        FROM topicos
        WHERE materia_id = $1
        ORDER BY ordem
      `, [materiaId]);
      
      return { topicos: result.rows };
      
    } catch (error: any) {
      console.error('[Hierarquia API] Erro:', error.message);
      return reply.status(500).send({ error: error.message });
    }
  });
  
  /**
   * GET /api/topicos/:topicoId/subtopicos
   * Retorna subtópicos de um tópico
   */
  fastify.get('/api/topicos/:topicoId/subtopicos', async (request, reply) => {
    const { topicoId } = request.params as { topicoId: string };
    
    try {
      const result = await pool.query(`
        SELECT 
          id,
          nome,
          slug,
          descricao,
          ordem
        FROM subtopicos
        WHERE topico_id = $1
        ORDER BY ordem
      `, [topicoId]);
      
      return { subtopicos: result.rows };
      
    } catch (error: any) {
      console.error('[Hierarquia API] Erro:', error.message);
      return reply.status(500).send({ error: error.message });
    }
  });
  
  /**
   * GET /api/subtopicos/:subtopicoId/subsubtopicos
   * Retorna sub-subtópicos de um subtópico
   */
  fastify.get('/api/subtopicos/:subtopicoId/subsubtopicos', async (request, reply) => {
    const { subtopicoId } = request.params as { subtopicoId: string };
    
    try {
      const result = await pool.query(`
        SELECT 
          id,
          nome,
          slug,
          descricao,
          ordem
        FROM subsubtopicos
        WHERE subtopico_id = $1
        ORDER BY ordem
      `, [subtopicoId]);
      
      return { subsubtopicos: result.rows };
      
    } catch (error: any) {
      console.error('[Hierarquia API] Erro:', error.message);
      return reply.status(500).send({ error: error.message });
    }
  });
}
