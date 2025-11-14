import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';

/**
 * Rotas de administração para questões de concursos
 */
const adminQuestoesRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Listar questões com filtros
  fastify.get('/admin/questoes', async (request, reply) => {
    const { 
      concurso_id,
      banca_id,
      arquivo_id,
      revisado,
      qualidade,
      tipo,
      search,
      limit = 50, 
      offset = 0 
    } = request.query as any;

    let query = db('questoes')
      .select(
        'questoes.*',
        'concursos.name as concurso_name',
        'bancas.name as banca_name'
      )
      .leftJoin('concursos', 'questoes.concurso_id', 'concursos.id')
      .leftJoin('bancas', 'questoes.banca_id', 'bancas.id');

    if (concurso_id) {
      query = query.where('questoes.concurso_id', concurso_id);
    }
    if (banca_id) {
      query = query.where('questoes.banca_id', banca_id);
    }
    if (arquivo_id) {
      query = query.where('questoes.arquivo_id', arquivo_id);
    }
    if (revisado !== undefined) {
      query = query.where('questoes.revisado', revisado === 'true');
    }
    if (qualidade) {
      query = query.where('questoes.qualidade', qualidade);
    }
    if (tipo) {
      query = query.where('questoes.tipo', tipo);
    }
    if (search) {
      query = query.where('questoes.enunciado', 'ilike', `%${search}%`);
    }

    const [questoes, countResult] = await Promise.all([
      query.limit(limit).offset(offset).orderBy('questoes.created_at', 'desc'),
      db('questoes').count('* as count').first()
    ]);

    return {
      data: questoes,
      total: parseInt(countResult?.count as string || '0'),
      limit,
      offset
    };
  });

  // Buscar questão por ID com alternativas
  fastify.get('/admin/questoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const questao = await db('questoes')
      .select(
        'questoes.*',
        'concursos.name as concurso_name',
        'bancas.name as banca_name'
      )
      .leftJoin('concursos', 'questoes.concurso_id', 'concursos.id')
      .leftJoin('bancas', 'questoes.banca_id', 'bancas.id')
      .where('questoes.id', id)
      .first();

    if (!questao) {
      return reply.status(404).send({ error: 'Questão não encontrada' });
    }

    // Buscar alternativas
    const alternativas = await db('alternativas')
      .where('questao_id', id)
      .orderBy('ordem', 'asc');

    // Buscar matérias relacionadas
    const materias = await db('questoes_materias')
      .select(
        'materias.id',
        'materias.name',
        'topicos.id as topico_id',
        'topicos.nome as topico_nome',
        'questoes_materias.relevancia'
      )
      .leftJoin('materias', 'questoes_materias.materia_id', 'materias.id')
      .leftJoin('topicos', 'questoes_materias.topico_id', 'topicos.id')
      .where('questoes_materias.questao_id', id);

    // Buscar cards gerados
    const cards = await db('cards')
      .where('questao_id', id)
      .select('id', 'front', 'back', 'deck_id');

    return {
      ...questao,
      alternativas,
      materias,
      cards
    };
  });

  // Criar nova questão
  fastify.post('/admin/questoes', async (request, reply) => {
    const {
      arquivo_id,
      concurso_id,
      banca_id,
      numero,
      codigo,
      enunciado,
      tipo = 'multipla_escolha',
      nivel_dificuldade,
      resposta_correta,
      explicacao,
      alternativas,
      materias,
      tem_imagem,
      tem_tabela,
      tem_grafico
    } = request.body as any;

    // Validações
    if (!concurso_id || !banca_id || !numero || !enunciado) {
      return reply.status(400).send({ 
        error: 'Campos obrigatórios: concurso_id, banca_id, numero, enunciado' 
      });
    }

    if (tipo === 'multipla_escolha' && !resposta_correta) {
      return reply.status(400).send({ 
        error: 'resposta_correta é obrigatória para questões de múltipla escolha' 
      });
    }

    // Inserir questão
    const [questao] = await db('questoes')
      .insert({
        arquivo_id,
        concurso_id,
        banca_id,
        numero,
        codigo,
        enunciado,
        tipo,
        nivel_dificuldade,
        resposta_correta,
        explicacao,
        tem_imagem: tem_imagem || false,
        tem_tabela: tem_tabela || false,
        tem_grafico: tem_grafico || false
      })
      .returning('*');

    // Inserir alternativas
    if (alternativas && Array.isArray(alternativas)) {
      const alternativasData = alternativas.map((alt: any, index: number) => ({
        questao_id: questao.id,
        letra: alt.letra,
        ordem: alt.ordem || index + 1,
        texto: alt.texto,
        tem_imagem: alt.tem_imagem || false
      }));

      await db('alternativas').insert(alternativasData);
    }

    // Relacionar com matérias
    if (materias && Array.isArray(materias)) {
      const materiasData = materias.map((mat: any) => ({
        questao_id: questao.id,
        materia_id: mat.materia_id,
        topico_id: mat.topico_id || null,
        relevancia: mat.relevancia || 1.0
      }));

      await db('questoes_materias').insert(materiasData);
    }

    // Atualizar contador no concurso
    await db('concursos')
      .where('id', concurso_id)
      .increment('total_questoes', 1);

    return questao;
  });

  // Atualizar questão
  fastify.put('/admin/questoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    const questao = await db('questoes').where('id', id).first();
    if (!questao) {
      return reply.status(404).send({ error: 'Questão não encontrada' });
    }

    // Atualizar
    const [updated] = await db('questoes')
      .where('id', id)
      .update({
        ...updates,
        updated_at: db.fn.now()
      })
      .returning('*');

    return updated;
  });

  // Deletar questão
  fastify.delete('/admin/questoes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const questao = await db('questoes').where('id', id).first();
    if (!questao) {
      return reply.status(404).send({ error: 'Questão não encontrada' });
    }

    // Deletar (CASCADE vai deletar alternativas e relacionamentos)
    await db('questoes').where('id', id).delete();

    // Atualizar contador
    await db('concursos')
      .where('id', questao.concurso_id)
      .decrement('total_questoes', 1);

    return { success: true };
  });

  // Revisar questão
  fastify.post('/admin/questoes/:id/revisar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { qualidade, explicacao } = request.body as any;
    const user_id = (request as any).user?.id;

    const updates: any = {
      revisado: true,
      revisado_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    if (user_id) {
      updates.revisado_por = user_id;
    }
    if (qualidade) {
      updates.qualidade = qualidade;
    }
    if (explicacao) {
      updates.explicacao = explicacao;
    }

    const [questao] = await db('questoes')
      .where('id', id)
      .update(updates)
      .returning('*');

    if (!questao) {
      return reply.status(404).send({ error: 'Questão não encontrada' });
    }

    return questao;
  });

  // Gerar flashcard de uma questão
  fastify.post('/admin/questoes/:id/gerar-card', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { deck_id } = request.body as any;
    const user_id = (request as any).user?.id;

    // Buscar questão com alternativas
    const questao = await db('questoes').where('id', id).first();
    if (!questao) {
      return reply.status(404).send({ error: 'Questão não encontrada' });
    }

    const alternativas = await db('alternativas')
      .where('questao_id', id)
      .orderBy('ordem', 'asc');

    // Montar frente do card
    let front = `**Questão ${questao.numero}**\n\n${questao.enunciado}\n\n`;
    alternativas.forEach((alt: any) => {
      front += `(${alt.letra}) ${alt.texto}\n`;
    });

    // Montar verso do card
    let back = `**Resposta:** ${questao.resposta_correta}\n\n`;
    if (questao.explicacao) {
      back += `**Explicação:**\n${questao.explicacao}`;
    }

    // Criar card
    const [card] = await db('cards')
      .insert({
        deck_id: deck_id || null,
        user_id: user_id || null,
        front,
        back,
        questao_id: id,
        tipo: 'questao_concurso'
      })
      .returning('*');

    return card;
  });

  // Importação em lote
  fastify.post('/admin/questoes/importar-lote', async (request, reply) => {
    const { questoes } = request.body as { questoes: any[] };

    if (!Array.isArray(questoes) || questoes.length === 0) {
      return reply.status(400).send({ error: 'Array de questões é obrigatório' });
    }

    const resultados = {
      inseridas: 0,
      erros: 0,
      detalhes: [] as any[]
    };

    for (const q of questoes) {
      try {
        // Inserir questão
        const [questao] = await db('questoes')
          .insert({
            arquivo_id: q.arquivo_id,
            concurso_id: q.concurso_id,
            banca_id: q.banca_id,
            numero: q.numero,
            enunciado: q.enunciado,
            tipo: q.tipo || 'multipla_escolha',
            resposta_correta: q.resposta_correta,
            explicacao: q.explicacao,
            tem_imagem: q.tem_imagem || false,
            tem_tabela: q.tem_tabela || false,
            tem_grafico: q.tem_grafico || false
          })
          .returning('*');

        // Inserir alternativas
        if (q.alternativas && Array.isArray(q.alternativas)) {
          const alternativasData = q.alternativas.map((alt: any, index: number) => ({
            questao_id: questao.id,
            letra: alt.letra,
            ordem: alt.ordem || index + 1,
            texto: alt.texto
          }));
          await db('alternativas').insert(alternativasData);
        }

        resultados.inseridas++;
        resultados.detalhes.push({
          numero: q.numero,
          status: 'inserida',
          questao_id: questao.id
        });

        // Atualizar contador
        await db('concursos')
          .where('id', q.concurso_id)
          .increment('total_questoes', 1);

      } catch (error: any) {
        resultados.erros++;
        resultados.detalhes.push({
          numero: q.numero,
          status: 'erro',
          erro: error.message
        });
      }
    }

    return resultados;
  });
};

export default adminQuestoesRoutes;
