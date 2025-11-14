import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';
import { generateDropFromSubtopico } from '../services/drop-from-topic-generator-simple.js';

export async function registerGerarDropsTopicosRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /admin/subtopicos/:id/gerar-drop
   * Gera drop educacional a partir de um subtópico
   */
  fastify.post('/admin/subtopicos/:id/gerar-drop', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      console.log(`[Admin] Gerando drop para subtópico ${id}`);
      
      // Verificar se já existe drop para este subtópico
      const existingDrop = await pool.query(       'SELECT id FROM drops WHERE subtopico_id = $1',
        [id]
      );
      
      if (existingDrop.rows.length > 0) {
        return reply.status(409).send({
          error: 'Drop já existe para este subtópico',
          drop_id: existingDrop.rows[0].id
        });
      }
      
      // Gerar drop
      const result = await generateDropFromSubtopico(id);
      
      // Buscar informações do subtópico para relacionamentos
      const subtopicoInfo = await pool.query(`
        SELECT 
          st.topico_id,
          t.materia_id,
          m.contest_id
        FROM subtopicos st
        JOIN topicos t ON st.topico_id = t.id
        JOIN materias m ON t.materia_id = m.id
        WHERE st.id = $1
      `, [id]);
      
      if (subtopicoInfo.rows.length === 0) {
        return reply.status(404).send({ error: 'Subtópico não encontrado' });
      }
      
      const { topico_id, materia_id, contest_id } = subtopicoInfo.rows[0];
      
      // Salvar drop no banco
      const savedDrop = await pool.query(`
        INSERT INTO drops (
          subtopico_id,
          titulo,
          slug,
          conteudo,
          exemplo_pratico,
          tecnicas_memorizacao,
          dificuldade,
          tempo_estimado_minutos,
          materia_id,
          topico_id,
          contest_id,
          origem,
          fontes_utilizadas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        id,
        result.drop.titulo,
        result.drop.slug,
        result.drop.conteudo,
        result.drop.exemplo_pratico,
        JSON.stringify(result.drop.tecnicas_memorizacao),
        result.drop.dificuldade,
        result.drop.tempo_estimado_minutos,
        materia_id,
        topico_id,
        contest_id,
        'subtopico',
        JSON.stringify(result.drop.fontes_utilizadas)
      ]);
      
      console.log(`[Admin] Drop salvo com ID: ${savedDrop.rows[0].id}`);
      
      return {
        success: true,
        drop: savedDrop.rows[0],
        metadata: result.metadata
      };
      
    } catch (error: any) {
      console.error(`[Admin] Erro ao gerar drop:`, error);
      return reply.status(500).send({
        error: 'Falha ao gerar drop',
        message: error.message
      });
    }
  });
  
  /**
   * POST /admin/concursos/:id/gerar-drops-lote
   * Gera drops em lote para todos os subtópicos de um concurso
   */
  fastify.post('/admin/concursos/:id/gerar-drops-lote', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limite } = request.body as { limite?: number };
    
    try {
      console.log(`[Admin] Gerando drops em lote para concurso ${id}`);
      
      const limit = limite || 10;
      
      // Buscar subtópicos sem drop
      const subtopicosQuery = await pool.query(`
        SELECT DISTINCT st.id, st.nome
        FROM subtopicos st
        JOIN topicos t ON st.topico_id = t.id
        JOIN materias m ON t.materia_id = m.id
        LEFT JOIN drops d ON st.id = d.subtopico_id
        WHERE m.contest_id = $1
          AND d.id IS NULL
        ORDER BY st.id
        LIMIT $2
      `, [id, limit]);
      
      if (subtopicosQuery.rows.length === 0) {
        return {
          success: true,
          message: 'Nenhum subtópico sem drop encontrado',
          drops_gerados: 0
        };
      }
      
      console.log(`[Admin] ${subtopicosQuery.rows.length} subtópicos sem drops encontrados`);
      
      const resultados = {
        total_processados: 0,
        sucesso: 0,
        erros: 0,
        detalhes: [] as any[],
        custo_total_usd: 0,
        tokens_total: 0
      };
      
      // Gerar drop para cada subtópico
      for (const subtopico of subtopicosQuery.rows) {
        resultados.total_processados++;
        
        try {
          console.log(`[Admin] Processando ${resultados.total_processados}/${subtopicosQuery.rows.length}: ${subtopico.nome}`);
          
          const result = await generateDropFromSubtopico(subtopico.id);
          
          // Buscar informações para relacionamentos
          const subtopicoInfo = await pool.query(`
            SELECT 
              st.topico_id,
              t.materia_id,
              m.contest_id
            FROM subtopicos st
            JOIN topicos t ON st.topico_id = t.id
            JOIN materias m ON t.materia_id = m.id
            WHERE st.id = $1
          `, [subtopico.id]);
          
          const { topico_id, materia_id, contest_id } = subtopicoInfo.rows[0];
          
          // Salvar drop
          const savedDrop = await pool.query(`
            INSERT INTO drops (
              subtopico_id,
              titulo,
              slug,
              conteudo,
              exemplo_pratico,
              tecnicas_memorizacao,
              dificuldade,
              tempo_estimado_minutos,
              materia_id,
              topico_id,
              contest_id,
              origem,
              fontes_utilizadas
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, titulo
          `, [
            subtopico.id,
            result.drop.titulo,
            result.drop.slug,
            result.drop.conteudo,
            result.drop.exemplo_pratico,
            JSON.stringify(result.drop.tecnicas_memorizacao),
            result.drop.dificuldade,
            result.drop.tempo_estimado_minutos,
            materia_id,
            topico_id,
            contest_id,
            'subtopico',
            JSON.stringify(result.drop.fontes_utilizadas)
          ]);
          
          resultados.sucesso++;
          resultados.custo_total_usd += result.metadata.cost_usd;
          resultados.tokens_total += result.metadata.tokens_used;
          
          resultados.detalhes.push({
            subtopico_id: subtopico.id,
            subtopico_nome: subtopico.nome,
            drop_id: savedDrop.rows[0].id,
            drop_titulo: savedDrop.rows[0].titulo,
            status: 'sucesso',
            tokens: result.metadata.tokens_used,
            custo_usd: result.metadata.cost_usd
          });
          
        } catch (error: any) {
          resultados.erros++;
          resultados.detalhes.push({
            subtopico_id: subtopico.id,
            subtopico_nome: subtopico.nome,
            status: 'erro',
            erro: error.message
          });
          console.error(`[Admin] Erro ao processar ${subtopico.nome}:`, error.message);
        }
      }
      
      console.log(`[Admin] Lote concluído: ${resultados.sucesso} sucessos, ${resultados.erros} erros`);
      console.log(`[Admin] Custo total: $${resultados.custo_total_usd.toFixed(6)}`);
      
      return {
        success: true,
        ...resultados
      };
      
    } catch (error: any) {
      console.error(`[Admin] Erro no processamento em lote:`, error);
      return reply.status(500).send({
        error: 'Falha no processamento em lote',
        message: error.message
      });
    }
  });
  
  /**
   * GET /admin/drops/estatisticas
   * Retorna estatísticas sobre drops gerados
   */
  fastify.get('/admin/drops/estatisticas', async (request, reply) => {
    try {
      // Total de drops
      const totalQuery = await pool.query('SELECT COUNT(*) as total FROM drops');
      const total = parseInt(totalQuery.rows[0].total);
      
      // Por origem
      const porOrigemQuery = await pool.query(`
        SELECT origem, COUNT(*) as count
        FROM drops
        GROUP BY origem
        ORDER BY count DESC
      `);
      const porOrigem = porOrigemQuery.rows.reduce((acc: any, row: any) => {
        acc[row.origem] = parseInt(row.count);
        return acc;
      }, {});
      
      // Por matéria
      const porMateriaQuery = await pool.query(`
        SELECT m.nome, COUNT(d.id) as count
        FROM drops d
        JOIN materias m ON d.materia_id = m.id
        GROUP BY m.nome
        ORDER BY count DESC
        LIMIT 10
      `);
      const porMateria = porMateriaQuery.rows.reduce((acc: any, row: any) => {
        acc[row.nome] = parseInt(row.count);
        return acc;
      }, {});
      
      // Por dificuldade
      const porDificuldadeQuery = await pool.query(`
        SELECT dificuldade, COUNT(*) as count
        FROM drops
        GROUP BY dificuldade
        ORDER BY count DESC
      `);
      const porDificuldade = porDificuldadeQuery.rows.reduce((acc: any, row: any) => {
        acc[row.dificuldade] = parseInt(row.count);
        return acc;
      }, {});
      
      return {
        total_drops: total,
        por_origem: porOrigem,
        por_materia: porMateria,
        por_dificuldade: porDificuldade
      };
      
    } catch (error: any) {
      console.error(`[Admin] Erro ao buscar estatísticas:`, error);
      return reply.status(500).send({
        error: 'Falha ao buscar estatísticas',
        message: error.message
      });
    }
  });
}
