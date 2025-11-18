// src/routes/admin.scraper-v2.ts
import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';
import { runFullPipeline, BANKS_CONFIG } from '../services/scraper-monolith-v2.js';

export async function registerScraperV2Routes(app: FastifyInstance) {
  
  // POST /admin/scraper-v2/:banca
  app.post('/admin/scraper-v2/:banca', async (request, reply) => {
    const { banca } = request.params as { banca: string };
    const startTime = Date.now();

    // Validar se a banca existe
    if (!BANKS_CONFIG[banca]) {
      return reply.status(400).send({
        success: false,
        error: 'Banca inválida ou não configurada',
        banca,
        bancas_disponiveis: Object.keys(BANKS_CONFIG)
      });
    }

    try {
      console.log(`[Scraper V2] Iniciando scraping para banca: ${banca}`);
      
      // Executar o pipeline de scraping
      const resultados = await runFullPipeline(banca);
      
      console.log(`[Scraper V2] Pipeline concluído. ${resultados.length} resultados encontrados.`);

      let concursosSalvos = 0;
      let materiasCriadas = 0;
      let topicosCriados = 0;
      let subtopicosCriados = 0;

      // Processar cada resultado e salvar no banco
      for (const resultado of resultados) {
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');

          // 1. Buscar ou criar a banca no banco
          const bancaResult = await client.query(
            `SELECT id FROM bancas WHERE name ILIKE $1 LIMIT 1`,
            [resultado.banca]
          );

          let bancaId: number;
          if (bancaResult.rows.length === 0) {
            const insertBanca = await client.query(
              `INSERT INTO bancas (name) VALUES ($1) RETURNING id`,
              [resultado.banca]
            );
            bancaId = insertBanca.rows[0].id;
          } else {
            bancaId = bancaResult.rows[0].id;
          }

          // 2. Criar o concurso
          const concursoResult = await client.query(
            `INSERT INTO concursos (banca_id, name, url, created_at) 
             VALUES ($1, $2, $3, NOW()) 
             ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [bancaId, resultado.concurso.titulo, resultado.concurso.url]
          );
          const concursoId = concursoResult.rows[0].id;
          concursosSalvos++;

          // 3. Processar a hierarquia de disciplinas (se existir)
          const disciplinas = resultado.dados?.disciplinas || [];
          
          for (const disciplina of disciplinas) {
            if (!disciplina.nome) continue;

            // Criar matéria
            const materiaResult = await client.query(
              `INSERT INTO materias (contest_id, nome, created_at) 
               VALUES ($1, $2, NOW()) 
               RETURNING id`,
              [concursoId, disciplina.nome]
            );
            const materiaId = materiaResult.rows[0].id;
            materiasCriadas++;

            // Processar tópicos
            const topicos = disciplina.topicos || [];
            for (const topico of topicos) {
              if (!topico.nome) continue;

              // Criar tópico
              const topicoResult = await client.query(
                `INSERT INTO topicos (materia_id, nome, created_at) 
                 VALUES ($1, $2, NOW()) 
                 RETURNING id`,
                [materiaId, topico.nome]
              );
              const topicoId = topicoResult.rows[0].id;
              topicosCriados++;

              // Processar subtópicos
              const subtopicos = topico.subtopicos || [];
              for (const subtopico of subtopicos) {
                if (!subtopico) continue;

                // Se subtopico é string, usar diretamente; se é objeto, pegar o nome
                const subtopicoNome = typeof subtopico === 'string' ? subtopico : subtopico.nome;
                if (!subtopicoNome) continue;

                // Criar subtópico
                await client.query(
                  `INSERT INTO subtopicos (topico_id, nome, created_at) 
                   VALUES ($1, $2, NOW())`,
                  [topicoId, subtopicoNome]
                );
                subtopicosCriados++;
              }
            }
          }

          await client.query('COMMIT');
          console.log(`[Scraper V2] Concurso salvo: ${resultado.concurso.titulo}`);

        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`[Scraper V2] Erro ao salvar concurso ${resultado.concurso.titulo}:`, error);
        } finally {
          client.release();
        }
      }

      const tempoMs = Date.now() - startTime;

      return reply.send({
        success: true,
        banca,
        concursos_salvos: concursosSalvos,
        materias_criadas: materiasCriadas,
        topicos_criados: topicosCriados,
        subtopicos_criados: subtopicosCriados,
        tempo_ms: tempoMs,
        tempo_formatado: `${Math.floor(tempoMs / 1000)}s`
      });

    } catch (error: any) {
      console.error('[Scraper V2] Erro no pipeline:', error);
      return reply.status(500).send({
        success: false,
        error: 'Falha interna no scraper',
        detalhe: error?.message
      });
    }
  });
}
