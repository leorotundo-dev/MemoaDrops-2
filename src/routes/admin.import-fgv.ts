import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';

/**
 * Rotas de importação de dados da FGV
 * Importa metadados de concursos e arquivos scraped
 */
const adminImportFgvRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Importar metadados completos (concursos + arquivos)
  fastify.post('/admin/import/fgv-metadata', async (request, reply) => {
    const { concursos } = request.body as { concursos: any[] };

    if (!Array.isArray(concursos) || concursos.length === 0) {
      return reply.status(400).send({ error: 'Array de concursos é obrigatório' });
    }

    const resultados = {
      concursos_inseridos: 0,
      concursos_atualizados: 0,
      arquivos_inseridos: 0,
      arquivos_duplicados: 0,
      erros: 0,
      detalhes: [] as any[]
    };

    // Buscar ID da banca FGV
    const bancaFgv = await db('bancas').where('name', 'FGV').first();
    if (!bancaFgv) {
      return reply.status(404).send({ 
        error: 'Banca FGV não encontrada. Execute a migration 039 primeiro.' 
      });
    }

    for (const concursoData of concursos) {
      try {
        // Verificar se concurso já existe (por slug)
        let concurso = await db('concursos')
          .where('slug', concursoData.slug)
          .first();

        if (concurso) {
          // Atualizar concurso existente
          [concurso] = await db('concursos')
            .where('id', concurso.id)
            .update({
              name: concursoData.nome || concursoData.name || concurso.name,
              status: concursoData.status || concurso.status,
              descricao: concursoData.descricao || concurso.descricao,
              email: concursoData.email || concurso.email,
              telefone: concursoData.telefone || concurso.telefone,
              fonte_url: concursoData.url || concursoData.fonte_url || concurso.fonte_url,
              scraped_at: db.fn.now(),
              updated_at: db.fn.now()
            })
            .returning('*');

          resultados.concursos_atualizados++;
        } else {
          // Inserir novo concurso
          [concurso] = await db('concursos')
            .insert({
              banca_id: bancaFgv.id,
              name: concursoData.nome || concursoData.name,
              slug: concursoData.slug,
              status: concursoData.status || 'Em Andamento',
              descricao: concursoData.descricao,
              email: concursoData.email,
              telefone: concursoData.telefone,
              fonte_url: concursoData.url || concursoData.fonte_url,
              scraped_at: db.fn.now()
            })
            .returning('*');

          resultados.concursos_inseridos++;
        }

        // Importar arquivos do concurso
        if (concursoData.arquivos && Array.isArray(concursoData.arquivos)) {
          for (const arquivo of concursoData.arquivos) {
            try {
              // Verificar duplicata
              const existente = await db('arquivos_concurso')
                .where({ 
                  concurso_id: concurso.id, 
                  url: arquivo.url 
                })
                .first();

              if (existente) {
                resultados.arquivos_duplicados++;
                continue;
              }

              // Inserir arquivo
              await db('arquivos_concurso').insert({
                concurso_id: concurso.id,
                titulo: arquivo.titulo,
                url: arquivo.url,
                tipo: arquivo.tipo || 'pdf',
                categoria: arquivo.categoria,
                bloco_tematico: arquivo.bloco_tematico,
                tipo_prova: arquivo.tipo_prova,
                area_conhecimento: arquivo.area_conhecimento,
                data_publicacao: arquivo.data_publicacao,
                metadata: arquivo.metadata ? JSON.stringify(arquivo.metadata) : null
              });

              resultados.arquivos_inseridos++;

            } catch (error: any) {
              // Erro ao inserir arquivo individual (continua com próximo)
              console.error(`Erro ao inserir arquivo: ${error.message}`);
            }
          }

          // Atualizar contador de arquivos no concurso
          const totalArquivos = await db('arquivos_concurso')
            .where('concurso_id', concurso.id)
            .count('* as count')
            .first();

          await db('concursos')
            .where('id', concurso.id)
            .update({ 
              total_arquivos: parseInt(totalArquivos?.count as string || '0')
            });
        }

        resultados.detalhes.push({
          slug: concursoData.slug,
          status: concurso ? 'atualizado' : 'inserido',
          concurso_id: concurso.id,
          arquivos: concursoData.arquivos?.length || 0
        });

      } catch (error: any) {
        resultados.erros++;
        resultados.detalhes.push({
          slug: concursoData.slug,
          status: 'erro',
          erro: error.message
        });
      }
    }

    // Atualizar total de concursos na banca
    const totalConcursos = await db('concursos')
      .where('banca_id', bancaFgv.id)
      .count('* as count')
      .first();

    await db('bancas')
      .where('id', bancaFgv.id)
      .update({ 
        total_contests: parseInt(totalConcursos?.count as string || '0')
      });

    return resultados;
  });

  // Importar um único concurso
  fastify.post('/admin/import/fgv-concurso', async (request, reply) => {
    const { concurso, arquivos } = request.body as any;

    if (!concurso || !concurso.slug) {
      return reply.status(400).send({ error: 'Dados do concurso são obrigatórios' });
    }

    // Buscar ID da banca FGV
    const bancaFgv = await db('bancas').where('name', 'FGV').first();
    if (!bancaFgv) {
      return reply.status(404).send({ 
        error: 'Banca FGV não encontrada' 
      });
    }

    // Verificar se concurso já existe
    let concursoDb = await db('concursos')
      .where('slug', concurso.slug)
      .first();

    if (concursoDb) {
      // Atualizar
      [concursoDb] = await db('concursos')
        .where('id', concursoDb.id)
        .update({
          name: concurso.name || concursoDb.name,
          status: concurso.status || concursoDb.status,
          descricao: concurso.descricao || concursoDb.descricao,
          email: concurso.email || concursoDb.email,
          telefone: concurso.telefone || concursoDb.telefone,
          fonte_url: concurso.fonte_url || concursoDb.fonte_url,
          scraped_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('*');
    } else {
      // Inserir
      [concursoDb] = await db('concursos')
        .insert({
          banca_id: bancaFgv.id,
          name: concurso.name,
          slug: concurso.slug,
          status: concurso.status || 'Em Andamento',
          descricao: concurso.descricao,
          email: concurso.email,
          telefone: concurso.telefone,
          fonte_url: concurso.fonte_url,
          scraped_at: db.fn.now()
        })
        .returning('*');
    }

    // Importar arquivos
    const arquivosIds: string[] = [];
    if (arquivos && Array.isArray(arquivos)) {
      for (const arquivo of arquivos) {
        // Verificar duplicata
        const existente = await db('arquivos_concurso')
          .where({ 
            concurso_id: concursoDb.id, 
            url: arquivo.url 
          })
          .first();

        if (!existente) {
          const [inserted] = await db('arquivos_concurso')
            .insert({
              concurso_id: concursoDb.id,
              titulo: arquivo.titulo,
              url: arquivo.url,
              tipo: arquivo.tipo || 'pdf',
              categoria: arquivo.categoria,
              bloco_tematico: arquivo.bloco_tematico,
              tipo_prova: arquivo.tipo_prova,
              area_conhecimento: arquivo.area_conhecimento,
              data_publicacao: arquivo.data_publicacao,
              metadata: arquivo.metadata ? JSON.stringify(arquivo.metadata) : null
            })
            .returning('id');

          arquivosIds.push(inserted.id);
        } else {
          arquivosIds.push(existente.id);
        }
      }

      // Atualizar contador
      await db('concursos')
        .where('id', concursoDb.id)
        .update({ total_arquivos: arquivosIds.length });
    }

    return {
      concurso_id: concursoDb.id,
      arquivos_ids: arquivosIds,
      total_arquivos: arquivosIds.length
    };
  });

  // Estatísticas da importação
  fastify.get('/admin/import/fgv-stats', async (request, reply) => {
    const bancaFgv = await db('bancas').where('name', 'FGV').first();
    if (!bancaFgv) {
      return reply.status(404).send({ error: 'Banca FGV não encontrada' });
    }

    const [
      totalConcursos,
      totalArquivos,
      totalQuestoes,
      arquivosProcessados,
      questoesRevisadas
    ] = await Promise.all([
      db('concursos').where('banca_id', bancaFgv.id).count('* as count').first(),
      db('arquivos_concurso')
        .join('concursos', 'arquivos_concurso.concurso_id', 'concursos.id')
        .where('concursos.banca_id', bancaFgv.id)
        .count('* as count')
        .first(),
      db('questoes').where('banca_id', bancaFgv.id).count('* as count').first(),
      db('arquivos_concurso')
        .join('concursos', 'arquivos_concurso.concurso_id', 'concursos.id')
        .where('concursos.banca_id', bancaFgv.id)
        .where('arquivos_concurso.processado', true)
        .count('* as count')
        .first(),
      db('questoes')
        .where('banca_id', bancaFgv.id)
        .where('revisado', true)
        .count('* as count')
        .first()
    ]);

    return {
      banca: 'FGV',
      concursos: parseInt(totalConcursos?.count as string || '0'),
      arquivos: parseInt(totalArquivos?.count as string || '0'),
      arquivos_processados: parseInt(arquivosProcessados?.count as string || '0'),
      questoes: parseInt(totalQuestoes?.count as string || '0'),
      questoes_revisadas: parseInt(questoesRevisadas?.count as string || '0')
    };
  });
};

export default adminImportFgvRoutes;
