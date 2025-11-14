import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { gerarDropComEstatisticas } from '../services/drop-generator.js';

/**
 * Rotas de geração de Drops (Pílulas de Conhecimento)
 */
const adminGerarDropsRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * POST /admin/questoes/:id/gerar-drop
   * Gera um drop a partir de uma questão
   */
  fastify.post('/admin/questoes/:id/gerar-drop', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { incluir_gabarito = true } = request.body as any;
    
    try {
      console.log(`[Gerar Drop] Iniciando geração para questão ${id}...`);
      
      // 1. Buscar questão completa
      const questao = await db('questoes')
        .where('questoes.id', id)
        .leftJoin('concursos', 'questoes.concurso_id', 'concursos.id')
        .select(
          'questoes.*',
          'concursos.name as concurso_nome'
        )
        .first();
      
      if (!questao) {
        return reply.status(404).send({ error: 'Questão não encontrada' });
      }
      
      // 2. Verificar se já existe drop
      const dropExistente = await db('drops')
        .where('questao_id', id)
        .first();
      
      if (dropExistente) {
        console.log(`[Gerar Drop] Drop já existe para questão ${id}`);
        return reply.send({
          sucesso: true,
          mensagem: 'Drop já existe para esta questão',
          drop_existente: dropExistente,
          regenerar: false
        });
      }
      
      // 3. Buscar alternativas
      const alternativas = await db('alternativas')
        .where('questao_id', id)
        .select('letra', 'texto', 'correta')
        .orderBy('letra', 'asc');
      
      // 4. Buscar classificação (matéria/tópico)
      const classificacao = await db('questoes_materias')
        .where('questao_id', id)
        .leftJoin('materias', 'questoes_materias.materia_id', 'materias.id')
        .leftJoin('topicos', 'questoes_materias.topico_id', 'topicos.id')
        .select(
          'materias.id as materia_id',
          'materias.nome as materia_nome',
          'topicos.id as topico_id',
          'topicos.nome as topico_nome'
        )
        .orderBy('questoes_materias.relevancia', 'desc')
        .first();
      
      if (!classificacao) {
        return reply.status(400).send({
          error: 'Questão não está classificada',
          sugestao: 'Classifique a questão antes de gerar o drop'
        });
      }
      
      console.log(`[Gerar Drop] Matéria: ${classificacao.materia_nome}, Tópico: ${classificacao.topico_nome || 'N/A'}`);
      
      // 5. Gerar drop via IA
      const resultado = await gerarDropComEstatisticas(
        {
          enunciado: questao.enunciado,
          alternativas,
          gabarito: questao.gabarito,
          materia_nome: classificacao.materia_nome,
          topico_nome: classificacao.topico_nome
        },
        { incluir_gabarito }
      );
      
      if (!resultado.sucesso || !resultado.drop) {
        return reply.status(500).send({
          sucesso: false,
          error: 'Erro ao gerar drop',
          detalhes: resultado.erro
        });
      }
      
      console.log(`[Gerar Drop] Drop gerado: "${resultado.drop.titulo}"`);
      
      // 6. Salvar drop no banco
      const [dropSalvo] = await db('drops')
        .insert({
          questao_id: id,
          titulo: resultado.drop.titulo,
          slug: resultado.drop.slug,
          conteudo: resultado.drop.conteudo,
          exemplo_pratico: resultado.drop.exemplo_pratico,
          tecnicas_memorizacao: JSON.stringify(resultado.drop.tecnicas_memorizacao),
          dificuldade: resultado.drop.dificuldade,
          tempo_estimado_minutos: resultado.drop.tempo_estimado_minutos,
          materia_id: classificacao.materia_id,
          topico_id: classificacao.topico_id || null,
          concurso_id: questao.concurso_id
        })
        .returning('*');
      
      console.log(`[Gerar Drop] Drop salvo com ID ${dropSalvo.id}`);
      
      return reply.send({
        sucesso: true,
        drop: dropSalvo,
        duracao_segundos: resultado.duracao_segundos,
        tecnicas_memorizacao_count: resultado.drop.tecnicas_memorizacao.length
      });
      
    } catch (error: any) {
      console.error(`[Gerar Drop] Erro ao gerar drop para questão ${id}:`, error);
      return reply.status(500).send({
        sucesso: false,
        error: 'Erro ao gerar drop',
        detalhes: error.message
      });
    }
  });
  
  /**
   * POST /admin/drops/gerar-lote
   * Gera drops para múltiplas questões em lote
   */
  fastify.post('/admin/drops/gerar-lote', async (request, reply) => {
    const { 
      concurso_id,
      materia_id,
      apenas_classificadas = true,
      apenas_sem_drop = true,
      limite = 10,
      incluir_gabarito = true
    } = request.body as any;
    
    try {
      console.log(`[Gerar Drops Lote] Iniciando geração em lote...`);
      
      // Buscar questões classificadas sem drop
      let query = db('questoes')
        .select('questoes.id', 'questoes.numero')
        .limit(limite);
      
      if (concurso_id) {
        query = query.where('questoes.concurso_id', concurso_id);
      }
      
      if (apenas_classificadas) {
        query = query.whereExists(
          db('questoes_materias')
            .whereRaw('questoes_materias.questao_id = questoes.id')
        );
      }
      
      if (materia_id) {
        query = query.whereExists(
          db('questoes_materias')
            .whereRaw('questoes_materias.questao_id = questoes.id')
            .where('questoes_materias.materia_id', materia_id)
        );
      }
      
      if (apenas_sem_drop) {
        query = query.whereNotExists(
          db('drops')
            .whereRaw('drops.questao_id = questoes.id')
        );
      }
      
      const questoes = await query;
      
      console.log(`[Gerar Drops Lote] ${questoes.length} questões encontradas para gerar drops`);
      
      if (questoes.length === 0) {
        return reply.send({
          sucesso: true,
          mensagem: 'Nenhuma questão pendente de geração de drop',
          drops_gerados: 0
        });
      }
      
      const resultados = [];
      
      // Gerar drop para cada questão
      for (const questao of questoes) {
        try {
          console.log(`[Gerar Drops Lote] Gerando drop para questão ${questao.id}...`);
          
          // Chamar rota de geração individual
          const response = await fastify.inject({
            method: 'POST',
            url: `/admin/questoes/${questao.id}/gerar-drop`,
            payload: { incluir_gabarito }
          });
          
          const resultado = JSON.parse(response.body);
          
          resultados.push({
            questao_id: questao.id,
            numero: questao.numero,
            ...resultado
          });
          
          // Aguardar 2 segundos entre gerações (evitar sobrecarga)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error: any) {
          console.error(`[Gerar Drops Lote] Erro ao gerar drop para ${questao.id}:`, error.message);
          resultados.push({
            questao_id: questao.id,
            numero: questao.numero,
            sucesso: false,
            error: error.message
          });
        }
      }
      
      const sucessos = resultados.filter(r => r.sucesso).length;
      const falhas = resultados.filter(r => !r.sucesso).length;
      
      console.log(`[Gerar Drops Lote] Geração concluída: ${sucessos} sucessos, ${falhas} falhas`);
      
      return reply.send({
        sucesso: true,
        total_questoes: questoes.length,
        drops_gerados: sucessos,
        falhas,
        resultados
      });
      
    } catch (error: any) {
      console.error(`[Gerar Drops Lote] Erro:`, error);
      return reply.status(500).send({
        sucesso: false,
        error: 'Erro ao gerar drops em lote',
        detalhes: error.message
      });
    }
  });
  
  /**
   * GET /admin/drops/estatisticas
   * Retorna estatísticas de drops gerados
   */
  fastify.get('/admin/drops/estatisticas', async (request, reply) => {
    try {
      const { concurso_id, materia_id } = request.query as any;
      
      let questoesQuery = db('questoes');
      if (concurso_id) {
        questoesQuery = questoesQuery.where('concurso_id', concurso_id);
      }
      
      const questoesStats = await questoesQuery
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(DISTINCT id) FILTER (WHERE id IN (SELECT questao_id FROM drops)) as com_drop'),
          db.raw('COUNT(DISTINCT id) FILTER (WHERE id NOT IN (SELECT questao_id FROM drops)) as sem_drop'),
          db.raw('COUNT(DISTINCT id) FILTER (WHERE id IN (SELECT questao_id FROM questoes_materias)) as classificadas')
        )
        .first();
      
      let dropsQuery = db('drops');
      if (concurso_id) {
        dropsQuery = dropsQuery.where('concurso_id', concurso_id);
      }
      if (materia_id) {
        dropsQuery = dropsQuery.where('materia_id', materia_id);
      }
      
      const dropsStats = await dropsQuery
        .select(
          db.raw('COUNT(*) as total_drops'),
          db.raw('COUNT(DISTINCT materia_id) as materias_cobertas'),
          db.raw('COUNT(DISTINCT topico_id) FILTER (WHERE topico_id IS NOT NULL) as topicos_cobertos'),
          db.raw('AVG(tempo_estimado_minutos) as tempo_medio_minutos'),
          db.raw('COUNT(*) FILTER (WHERE dificuldade = \'facil\') as faceis'),
          db.raw('COUNT(*) FILTER (WHERE dificuldade = \'medio\') as medios'),
          db.raw('COUNT(*) FILTER (WHERE dificuldade = \'dificil\') as dificeis')
        )
        .first();
      
      return reply.send({
        questoes: {
          total: parseInt(questoesStats?.total || '0'),
          com_drop: parseInt(questoesStats?.com_drop || '0'),
          sem_drop: parseInt(questoesStats?.sem_drop || '0'),
          classificadas: parseInt(questoesStats?.classificadas || '0'),
          percentual_com_drop: questoesStats?.total > 0 
            ? ((parseInt(questoesStats.com_drop) / parseInt(questoesStats.total)) * 100).toFixed(1)
            : '0.0'
        },
        drops: {
          total: parseInt(dropsStats?.total_drops || '0'),
          materias_cobertas: parseInt(dropsStats?.materias_cobertas || '0'),
          topicos_cobertos: parseInt(dropsStats?.topicos_cobertos || '0'),
          tempo_medio_minutos: parseFloat(dropsStats?.tempo_medio_minutos || '0').toFixed(1),
          por_dificuldade: {
            facil: parseInt(dropsStats?.faceis || '0'),
            medio: parseInt(dropsStats?.medios || '0'),
            dificil: parseInt(dropsStats?.dificeis || '0')
          }
        }
      });
      
    } catch (error: any) {
      console.error(`[Estatísticas Drops] Erro:`, error);
      return reply.status(500).send({
        error: 'Erro ao buscar estatísticas',
        detalhes: error.message
      });
    }
  });
  
  /**
   * GET /admin/drops/:id
   * Busca um drop específico
   */
  fastify.get('/admin/drops/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const drop = await db('drops')
        .where('drops.id', id)
        .leftJoin('questoes', 'drops.questao_id', 'questoes.id')
        .leftJoin('materias', 'drops.materia_id', 'materias.id')
        .leftJoin('topicos', 'drops.topico_id', 'topicos.id')
        .leftJoin('concursos', 'drops.concurso_id', 'concursos.id')
        .select(
          'drops.*',
          'questoes.numero as questao_numero',
          'questoes.enunciado as questao_enunciado',
          'materias.nome as materia_nome',
          'topicos.nome as topico_nome',
          'concursos.name as concurso_nome'
        )
        .first();
      
      if (!drop) {
        return reply.status(404).send({ error: 'Drop não encontrado' });
      }
      
      // Parsear JSON
      if (drop.tecnicas_memorizacao) {
        drop.tecnicas_memorizacao = JSON.parse(drop.tecnicas_memorizacao);
      }
      
      return reply.send({ drop });
      
    } catch (error: any) {
      console.error(`[Buscar Drop] Erro:`, error);
      return reply.status(500).send({
        error: 'Erro ao buscar drop',
        detalhes: error.message
      });
    }
  });
  
  /**
   * DELETE /admin/drops/:id
   * Remove um drop
   */
  fastify.delete('/admin/drops/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const deleted = await db('drops')
        .where('id', id)
        .del();
      
      if (deleted === 0) {
        return reply.status(404).send({ error: 'Drop não encontrado' });
      }
      
      return reply.send({
        sucesso: true,
        drop_id: id,
        mensagem: 'Drop removido com sucesso'
      });
      
    } catch (error: any) {
      console.error(`[Remover Drop] Erro:`, error);
      return reply.status(500).send({
        error: 'Erro ao remover drop',
        detalhes: error.message
      });
    }
  });
};

export default adminGerarDropsRoutes;
