// @ts-nocheck
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { classificarQuestaoComEstatisticas, MateriaDisponivel } from '../services/questao-classificador.js';

/**
 * Rotas de classificação automática de questões
 */
const adminClassificarQuestoesRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * POST /admin/questoes/:id/classificar
   * Classifica uma questão automaticamente via IA
   */
  fastify.post('/admin/questoes/:id/classificar', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      console.log(`[Classificar Questão] Iniciando classificação da questão ${id}...`);
      
      // 1. Buscar questão no banco
      const questao = await db('questoes')
        .where('id', id)
        .first();
      
      if (!questao) {
        return reply.status(404).send({ error: 'Questão não encontrada' });
      }
      
      // 2. Verificar se já está classificada
      const classificacoesExistentes = await db('questoes_materias')
        .where('questao_id', id)
        .count('* as count')
        .first();
      
      const jaClassificada = parseInt(classificacoesExistentes?.count as string || '0') > 0;
      
      if (jaClassificada) {
        console.log(`[Classificar Questão] Questão ${id} já possui classificação`);
      }
      
      // 3. Buscar matérias e tópicos do concurso
      const materias = await db('materias')
        .where('contest_id', questao.concurso_id)
        .select('id', 'nome');
      
      if (materias.length === 0) {
        return reply.status(400).send({ 
          error: 'Concurso não possui matérias cadastradas',
          sugestao: 'Cadastre as matérias do concurso antes de classificar questões'
        });
      }
      
      // 4. Buscar tópicos de cada matéria
      const materiasComTopicos: MateriaDisponivel[] = await Promise.all(
        materias.map(async (materia) => {
          const topicos = await db('topicos')
            .where('materia_id', materia.id)
            .select('id', 'nome', 'nivel')
            .orderBy('nivel', 'asc')
            .orderBy('ordem', 'asc');
          
          return {
            id: materia.id,
            nome: materia.nome,
            topicos: topicos.length > 0 ? topicos : undefined
          };
        })
      );
      
      console.log(`[Classificar Questão] ${materiasComTopicos.length} matérias disponíveis`);
      
      // 5. Classificar via IA
      const resultado = await classificarQuestaoComEstatisticas(
        questao.enunciado,
        materiasComTopicos,
        { maxClassificacoes: 2 }
      );
      
      if (!resultado.sucesso) {
        return reply.status(500).send({
          sucesso: false,
          error: 'Erro ao classificar questão',
          detalhes: resultado.erro
        });
      }
      
      console.log(`[Classificar Questão] ${resultado.classificacoes.length} classificações sugeridas`);
      
      // 6. Salvar classificações no banco
      const classificacoesSalvas = [];
      const erros = [];
      
      for (const classificacao of resultado.classificacoes) {
        try {
          // Verificar se já existe
          const existe = await db('questoes_materias')
            .where('questao_id', id)
            .where('materia_id', classificacao.materia_id)
            .where('topico_id', classificacao.topico_id || null)
            .first();
          
          if (existe) {
            console.log(`[Classificar Questão] Classificação já existe, atualizando...`);
            
            await db('questoes_materias')
              .where('id', existe.id)
              .update({
                relevancia: classificacao.relevancia
              });
            
            classificacoesSalvas.push({
              ...existe,
              relevancia: classificacao.relevancia,
              atualizado: true
            });
          } else {
            const [nova] = await db('questoes_materias')
              .insert({
                questao_id: id,
                materia_id: classificacao.materia_id,
                topico_id: classificacao.topico_id || null,
                relevancia: classificacao.relevancia
              })
              .returning('*');
            
            classificacoesSalvas.push({
              ...nova,
              atualizado: false
            });
          }
          
        } catch (error: any) {
          console.error(`[Classificar Questão] Erro ao salvar classificação:`, error.message);
          erros.push({
            materia: classificacao.materia_nome,
            erro: error.message
          });
        }
      }
      
      console.log(`[Classificar Questão] ${classificacoesSalvas.length} classificações salvas`);
      
      return reply.send({
        sucesso: true,
        questao_id: id,
        ja_classificada: jaClassificada,
        classificacoes_sugeridas: resultado.classificacoes,
        classificacoes_salvas: classificacoesSalvas.length,
        classificacoes_com_erro: erros.length,
        duracao_segundos: resultado.duracao_segundos,
        erros: erros.length > 0 ? erros : undefined
      });
      
    } catch (error: any) {
      console.error(`[Classificar Questão] Erro ao classificar questão ${id}:`, error);
      return reply.status(500).send({
        sucesso: false,
        error: 'Erro ao classificar questão',
        detalhes: error.message
      });
    }
  });
  
  /**
   * POST /admin/questoes/classificar-lote
   * Classifica múltiplas questões em lote
   */
  fastify.post('/admin/questoes/classificar-lote', async (request, reply) => {
    const { 
      concurso_id,
      apenas_nao_classificadas = true,
      limite = 10
    } = request.body as any;
    
    try {
      console.log(`[Classificar Lote] Iniciando classificação em lote...`);
      
      // Buscar questões não classificadas
      let query = db('questoes')
        .select('questoes.*')
        .limit(limite);
      
      if (concurso_id) {
        query = query.where('questoes.concurso_id', concurso_id);
      }
      
      if (apenas_nao_classificadas) {
        query = query.leftJoin('questoes_materias', 'questoes.id', 'questoes_materias.questao_id')
          .whereNull('questoes_materias.id');
      }
      
      const questoes = await query;
      
      console.log(`[Classificar Lote] ${questoes.length} questões encontradas para classificar`);
      
      if (questoes.length === 0) {
        return reply.send({
          sucesso: true,
          mensagem: 'Nenhuma questão pendente de classificação',
          questoes_classificadas: 0
        });
      }
      
      const resultados = [];
      
      // Classificar cada questão
      for (const questao of questoes) {
        try {
          console.log(`[Classificar Lote] Classificando questão ${questao.id}...`);
          
          // Chamar rota de classificação individual
          const response = await fastify.inject({
            method: 'POST',
            url: `/admin/questoes/${questao.id}/classificar`
          });
          
          const resultado = JSON.parse(response.body);
          
          resultados.push({
            questao_id: questao.id,
            numero: questao.numero,
            ...resultado
          });
          
          // Aguardar 1 segundo entre classificações (evitar sobrecarga)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          console.error(`[Classificar Lote] Erro ao classificar ${questao.id}:`, error.message);
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
      
      console.log(`[Classificar Lote] Classificação concluída: ${sucessos} sucessos, ${falhas} falhas`);
      
      return reply.send({
        sucesso: true,
        total_questoes: questoes.length,
        sucessos,
        falhas,
        resultados
      });
      
    } catch (error: any) {
      console.error(`[Classificar Lote] Erro:`, error);
      return reply.status(500).send({
        sucesso: false,
        error: 'Erro ao classificar lote',
        detalhes: error.message
      });
    }
  });
  
  /**
   * GET /admin/questoes/estatisticas-classificacao
   * Retorna estatísticas de classificação
   */
  fastify.get('/admin/questoes/estatisticas-classificacao', async (request, reply) => {
    try {
      const { concurso_id } = request.query as any;
      
      let questoesQuery = db('questoes');
      if (concurso_id) {
        questoesQuery = questoesQuery.where('concurso_id', concurso_id);
      }
      
      const questoesStats = await questoesQuery
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(DISTINCT id) FILTER (WHERE id IN (SELECT questao_id FROM questoes_materias)) as classificadas'),
          db.raw('COUNT(DISTINCT id) FILTER (WHERE id NOT IN (SELECT questao_id FROM questoes_materias)) as nao_classificadas')
        )
        .first();
      
      const classificacoesStats = await db('questoes_materias')
        .select(
          db.raw('COUNT(*) as total_classificacoes'),
          db.raw('COUNT(DISTINCT questao_id) as questoes_com_classificacao'),
          db.raw('COUNT(DISTINCT materia_id) as materias_utilizadas'),
          db.raw('COUNT(*) FILTER (WHERE topico_id IS NOT NULL) as com_topico'),
          db.raw('AVG(relevancia) as relevancia_media')
        )
        .first();
      
      return reply.send({
        questoes: {
          total: parseInt(questoesStats?.total || '0'),
          classificadas: parseInt(questoesStats?.classificadas || '0'),
          nao_classificadas: parseInt(questoesStats?.nao_classificadas || '0'),
          percentual_classificadas: questoesStats?.total > 0 
            ? ((parseInt(questoesStats.classificadas) / parseInt(questoesStats.total)) * 100).toFixed(1)
            : '0.0'
        },
        classificacoes: {
          total: parseInt(classificacoesStats?.total_classificacoes || '0'),
          questoes_com_classificacao: parseInt(classificacoesStats?.questoes_com_classificacao || '0'),
          materias_utilizadas: parseInt(classificacoesStats?.materias_utilizadas || '0'),
          com_topico: parseInt(classificacoesStats?.com_topico || '0'),
          relevancia_media: parseFloat(classificacoesStats?.relevancia_media || '0').toFixed(2)
        }
      });
      
    } catch (error: any) {
      console.error(`[Estatísticas Classificação] Erro:`, error);
      return reply.status(500).send({
        error: 'Erro ao buscar estatísticas',
        detalhes: error.message
      });
    }
  });
  
  /**
   * DELETE /admin/questoes/:id/classificacoes
   * Remove todas as classificações de uma questão
   */
  fastify.delete('/admin/questoes/:id/classificacoes', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const deleted = await db('questoes_materias')
        .where('questao_id', id)
        .del();
      
      return reply.send({
        sucesso: true,
        questao_id: id,
        classificacoes_removidas: deleted
      });
      
    } catch (error: any) {
      console.error(`[Remover Classificações] Erro:`, error);
      return reply.status(500).send({
        error: 'Erro ao remover classificações',
        detalhes: error.message
      });
    }
  });
  
  /**
   * POST /admin/questoes/:id/classificacoes
   * Adiciona uma classificação manual
   */
  fastify.post('/admin/questoes/:id/classificacoes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { materia_id, topico_id, relevancia } = request.body as any;
    
    try {
      await db('questoes_materias').insert({
        questao_id: id,
        materia_id,
        topico_id: topico_id || null,
        relevancia: relevancia || 1.0
      });
      
      return { sucesso: true };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
};

export default adminClassificarQuestoesRoutes;
