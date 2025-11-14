import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';

/**
 * Rotas de administração para arquivos de concursos
 * Gerencia PDFs, editais, provas, gabaritos, etc
 */
const adminArquivosRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Listar arquivos com filtros
  fastify.get('/admin/arquivos', async (request, reply) => {
    const { 
      concurso_id, 
      categoria, 
      processado,
      bloco_tematico,
      tipo_prova,
      limit = 50, 
      offset = 0 
    } = request.query as any;

    let query = db('arquivos_concurso').select('*');

    if (concurso_id) {
      query = query.where('concurso_id', concurso_id);
    }
    if (categoria) {
      query = query.where('categoria', categoria);
    }
    if (processado !== undefined) {
      query = query.where('processado', processado === 'true');
    }
    if (bloco_tematico) {
      query = query.where('bloco_tematico', bloco_tematico);
    }
    if (tipo_prova) {
      query = query.where('tipo_prova', parseInt(tipo_prova));
    }

    const [arquivos, countResult] = await Promise.all([
      query.limit(limit).offset(offset).orderBy('created_at', 'desc'),
      db('arquivos_concurso').count('* as count').first()
    ]);

    return {
      data: arquivos,
      total: parseInt(countResult?.count as string || '0'),
      limit,
      offset
    };
  });

  // Buscar arquivo por ID
  fastify.get('/admin/arquivos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const arquivo = await db('arquivos_concurso')
      .where('id', id)
      .first();

    if (!arquivo) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }

    // Buscar questões relacionadas
    const questoes = await db('questoes')
      .where('arquivo_id', id)
      .select('id', 'numero', 'enunciado', 'resposta_correta', 'revisado')
      .orderBy('numero', 'asc');

    return {
      ...arquivo,
      questoes
    };
  });

  // Criar novo arquivo
  fastify.post('/admin/arquivos', async (request, reply) => {
    const {
      concurso_id,
      titulo,
      url,
      tipo = 'pdf',
      categoria,
      bloco_tematico,
      tipo_prova,
      area_conhecimento,
      data_publicacao,
      metadata
    } = request.body as any;

    // Validações
    if (!concurso_id || !titulo || !url) {
      return reply.status(400).send({ 
        error: 'Campos obrigatórios: concurso_id, titulo, url' 
      });
    }

    // Verificar se concurso existe
    const concurso = await db('concursos').where('id', concurso_id).first();
    if (!concurso) {
      return reply.status(404).send({ error: 'Concurso não encontrado' });
    }

    // Verificar duplicata (URL)
    const existente = await db('arquivos_concurso')
      .where({ concurso_id, url })
      .first();

    if (existente) {
      return reply.status(409).send({ 
        error: 'Arquivo já existe com esta URL',
        arquivo_id: existente.id
      });
    }

    // Inserir
    const [arquivo] = await db('arquivos_concurso')
      .insert({
        concurso_id,
        titulo,
        url,
        tipo,
        categoria,
        bloco_tematico,
        tipo_prova,
        area_conhecimento,
        data_publicacao,
        metadata: metadata ? JSON.stringify(metadata) : null
      })
      .returning('*');

    // Atualizar contador no concurso
    await db('concursos')
      .where('id', concurso_id)
      .increment('total_arquivos', 1);

    return arquivo;
  });

  // Atualizar arquivo
  fastify.put('/admin/arquivos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    const arquivo = await db('arquivos_concurso')
      .where('id', id)
      .first();

    if (!arquivo) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }

    // Atualizar
    const [updated] = await db('arquivos_concurso')
      .where('id', id)
      .update({
        ...updates,
        updated_at: db.fn.now()
      })
      .returning('*');

    return updated;
  });

  // Deletar arquivo
  fastify.delete('/admin/arquivos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const arquivo = await db('arquivos_concurso')
      .where('id', id)
      .first();

    if (!arquivo) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }

    // Deletar (CASCADE vai deletar questões relacionadas)
    await db('arquivos_concurso').where('id', id).delete();

    // Atualizar contador no concurso
    await db('concursos')
      .where('id', arquivo.concurso_id)
      .decrement('total_arquivos', 1);

    return { success: true };
  });

  // Marcar arquivo como processado
  fastify.post('/admin/arquivos/:id/marcar-processado', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { erro } = request.body as any;

    const [updated] = await db('arquivos_concurso')
      .where('id', id)
      .update({
        processado: true,
        processado_at: db.fn.now(),
        erro_processamento: erro || null
      })
      .returning('*');

    if (!updated) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }

    return updated;
  });

  // Importação em lote
  fastify.post('/admin/arquivos/importar-lote', async (request, reply) => {
    const { arquivos } = request.body as { arquivos: any[] };

    if (!Array.isArray(arquivos) || arquivos.length === 0) {
      return reply.status(400).send({ error: 'Array de arquivos é obrigatório' });
    }

    const resultados = {
      inseridos: 0,
      duplicados: 0,
      erros: 0,
      detalhes: [] as any[]
    };

    for (const arquivo of arquivos) {
      try {
        // Verificar duplicata
        const existente = await db('arquivos_concurso')
          .where({ 
            concurso_id: arquivo.concurso_id, 
            url: arquivo.url 
          })
          .first();

        if (existente) {
          resultados.duplicados++;
          resultados.detalhes.push({
            url: arquivo.url,
            status: 'duplicado',
            arquivo_id: existente.id
          });
          continue;
        }

        // Inserir
        const [inserted] = await db('arquivos_concurso')
          .insert({
            concurso_id: arquivo.concurso_id,
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

        resultados.inseridos++;
        resultados.detalhes.push({
          url: arquivo.url,
          status: 'inserido',
          arquivo_id: inserted.id
        });

        // Atualizar contador
        await db('concursos')
          .where('id', arquivo.concurso_id)
          .increment('total_arquivos', 1);

      } catch (error: any) {
        resultados.erros++;
        resultados.detalhes.push({
          url: arquivo.url,
          status: 'erro',
          erro: error.message
        });
      }
    }

    return resultados;
  });
};

export default adminArquivosRoutes;
