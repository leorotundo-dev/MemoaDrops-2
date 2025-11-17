// @ts-nocheck
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { extrairQuestoesComEstatisticas } from '../services/pdf-questoes-extractor.js';
import { downloadPdf } from '../services/pdf-downloader.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Rotas de processamento de arquivos de concursos
 */
const adminProcessarArquivoRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * POST /admin/arquivos/:id/processar
   * Processa um arquivo de prova (extrai questões do PDF)
   */
  fastify.post('/admin/arquivos/:id/processar', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      console.log(`[Processar Arquivo] Iniciando processamento do arquivo ${id}...`);
      
      // 1. Buscar arquivo no banco
      const arquivo = await db('arquivos_concurso')
        .where('id', id)
        .first();
      
      if (!arquivo) {
        return reply.status(404).send({ error: 'Arquivo não encontrado' });
      }
      
      // 2. Verificar se já foi processado
      if (arquivo.processado) {
        console.log(`[Processar Arquivo] Arquivo ${id} já foi processado anteriormente`);
        
        // Buscar questões existentes
        const questoesExistentes = await db('questoes')
          .where('arquivo_id', id)
          .count('* as count')
          .first();
        
        return reply.send({
          sucesso: true,
          mensagem: 'Arquivo já foi processado anteriormente',
          ja_processado: true,
          questoes_existentes: parseInt(questoesExistentes?.count as string || '0')
        });
      }
      
      // 3. Verificar se é PDF
      if (!arquivo.url.toLowerCase().endsWith('.pdf')) {
        return reply.status(400).send({ 
          error: 'Apenas arquivos PDF são suportados para extração de questões' 
        });
      }
      
      // 4. Download do PDF
      console.log(`[Processar Arquivo] Fazendo download do PDF: ${arquivo.url}`);
      const tempDir = os.tmpdir();
      const pdfPath = path.join(tempDir, `arquivo_${id}.pdf`);
      
      await downloadPdf(arquivo.url, pdfPath);
      console.log(`[Processar Arquivo] PDF baixado em: ${pdfPath}`);
      
      // 5. Extrair questões via IA
      console.log(`[Processar Arquivo] Extraindo questões via IA...`);
      const resultado = await extrairQuestoesComEstatisticas(pdfPath);
      
      if (!resultado.sucesso) {
        // Marcar como processado com erro
        await db('arquivos_concurso')
          .where('id', id)
          .update({
            processado: false,
            erro_processamento: resultado.erro,
            updated_at: db.fn.now()
          });
        
        // Limpar arquivo temporário
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
        
        return reply.status(500).send({
          sucesso: false,
          error: 'Erro ao extrair questões',
          detalhes: resultado.erro
        });
      }
      
      console.log(`[Processar Arquivo] ${resultado.total_questoes} questões extraídas`);
      
      // 6. Buscar banca_id do concurso
      const concurso = await db('concursos')
        .where('id', arquivo.concurso_id)
        .select('banca_id')
        .first();
      
      if (!concurso || !concurso.banca_id) {
        throw new Error('Concurso não possui banca_id associada');
      }
      
      // 7. Salvar questões no banco
      const questoesInseridas = [];
      const erros = [];
      
      for (const questao of resultado.questoes) {
        try {
          // Inserir questão
          const [questaoInserida] = await db('questoes')
            .insert({
              arquivo_id: id,
              concurso_id: arquivo.concurso_id,
              banca_id: concurso.banca_id,
              numero: questao.numero,
              enunciado: questao.enunciado,
              tipo: 'multipla_escolha',
              resposta_correta: questao.resposta_correta || null,
              tem_imagem: questao.tem_imagem || false,
              tem_tabela: questao.tem_tabela || false,
              tem_grafico: questao.tem_grafico || false,
              revisado: false
            })
            .returning('*');
          
          // Inserir alternativas
          if (questao.alternativas && questao.alternativas.length > 0) {
            const alternativasData = questao.alternativas.map((alt: any) => ({
              questao_id: questaoInserida.id,
              letra: alt.letra,
              ordem: alt.ordem,
              texto: alt.texto,
              tem_imagem: false
            }));
            
            await db('alternativas').insert(alternativasData);
          }
          
          questoesInseridas.push(questaoInserida);
          
        } catch (error: any) {
          console.error(`[Processar Arquivo] Erro ao salvar questão ${questao.numero}:`, error.message);
          erros.push({
            numero: questao.numero,
            erro: error.message
          });
        }
      }
      
      // 7. Atualizar contador no concurso
      if (questoesInseridas.length > 0) {
        await db('concursos')
          .where('id', arquivo.concurso_id)
          .increment('total_questoes', questoesInseridas.length);
      }
      
      // 8. Marcar arquivo como processado
      await db('arquivos_concurso')
        .where('id', id)
        .update({
          processado: true,
          processado_at: db.fn.now(),
          erro_processamento: erros.length > 0 
            ? `${erros.length} questões com erro` 
            : null,
          updated_at: db.fn.now()
        });
      
      // 9. Limpar arquivo temporário
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      
      console.log(`[Processar Arquivo] Processamento concluído: ${questoesInseridas.length} questões salvas`);
      
      return reply.send({
        sucesso: true,
        arquivo_id: id,
        questoes_extraidas: resultado.total_questoes,
        questoes_salvas: questoesInseridas.length,
        questoes_com_erro: erros.length,
        duracao_segundos: resultado.duracao_segundos,
        erros: erros.length > 0 ? erros : undefined
      });
      
    } catch (error: any) {
      console.error(`[Processar Arquivo] Erro ao processar arquivo ${id}:`, error);
      
      // Tentar marcar como erro no banco
      try {
        await db('arquivos_concurso')
          .where('id', id)
          .update({
            processado: false,
            erro_processamento: error.message,
            updated_at: db.fn.now()
          });
      } catch (dbError) {
        console.error(`[Processar Arquivo] Erro ao atualizar banco:`, dbError);
      }
      
      return reply.status(500).send({
        sucesso: false,
        error: 'Erro ao processar arquivo',
        detalhes: error.message
      });
    }
  });
  
  /**
   * POST /admin/arquivos/processar-lote
   * Processa múltiplos arquivos em lote
   */
  fastify.post('/admin/arquivos/processar-lote', async (request, reply) => {
    const { 
      concurso_id, 
      categoria = 'prova',
      limite = 5 
    } = request.body as any;
    
    try {
      console.log(`[Processar Lote] Iniciando processamento em lote...`);
      
      // Buscar arquivos não processados
      let query = db('arquivos_concurso')
        .where('processado', false)
        .where('tipo', 'pdf')
        .whereRaw("(titulo ILIKE '%prova%' OR titulo ILIKE '%objetiva%' OR titulo ILIKE '%bloco%' OR titulo ILIKE '%questões%' OR titulo ILIKE '%questoes%' OR titulo ILIKE '%gabarito%')")
        .limit(limite);
      
      if (concurso_id) {
        query = query.where('concurso_id', concurso_id);
      }
      
      const arquivos = await query;
      
      console.log(`[Processar Lote] ${arquivos.length} arquivos encontrados para processar`);
      
      if (arquivos.length === 0) {
        return reply.send({
          sucesso: true,
          mensagem: 'Nenhum arquivo pendente de processamento',
          arquivos_processados: 0
        });
      }
      
      const resultados = [];
      
      // Processar cada arquivo
      for (const arquivo of arquivos) {
        try {
          console.log(`[Processar Lote] Processando arquivo ${arquivo.id}...`);
          
          // Chamar rota de processamento individual
          const response = await fastify.inject({
            method: 'POST',
            url: `/admin/arquivos/${arquivo.id}/processar`
          });
          
          const resultado = JSON.parse(response.body);
          
          resultados.push({
            arquivo_id: arquivo.id,
            titulo: arquivo.titulo,
            ...resultado
          });
          
          // Aguardar 2 segundos entre processamentos (evitar sobrecarga)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error: any) {
          console.error(`[Processar Lote] Erro ao processar ${arquivo.id}:`, error.message);
          resultados.push({
            arquivo_id: arquivo.id,
            titulo: arquivo.titulo,
            sucesso: false,
            error: error.message
          });
        }
      }
      
      const sucessos = resultados.filter(r => r.sucesso).length;
      const falhas = resultados.filter(r => !r.sucesso).length;
      
      console.log(`[Processar Lote] Processamento concluído: ${sucessos} sucessos, ${falhas} falhas`);
      
      return reply.send({
        sucesso: true,
        total_arquivos: arquivos.length,
        sucessos,
        falhas,
        resultados
      });
      
    } catch (error: any) {
      console.error(`[Processar Lote] Erro:`, error);
      return reply.status(500).send({
        sucesso: false,
        error: 'Erro ao processar lote',
        detalhes: error.message
      });
    }
  });
  
  /**
   * GET /admin/arquivos/estatisticas-processamento
   * Retorna estatísticas de processamento
   */
  fastify.get('/admin/arquivos/estatisticas-processamento', async (request, reply) => {
    try {
      const stats = await db('arquivos_concurso')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(*) FILTER (WHERE processado = true) as processados'),
          db.raw('COUNT(*) FILTER (WHERE processado = false) as pendentes'),
          db.raw('COUNT(*) FILTER (WHERE erro_processamento IS NOT NULL) as com_erro'),
          db.raw("COUNT(*) FILTER (WHERE categoria = 'prova' AND url ILIKE '%.pdf') as provas_pdf")
        )
        .first();
      
      const questoesStats = await db('questoes')
        .select(
          db.raw('COUNT(*) as total_questoes'),
          db.raw('COUNT(DISTINCT arquivo_id) as arquivos_com_questoes'),
          db.raw('COUNT(*) FILTER (WHERE revisado = true) as questoes_revisadas')
        )
        .first();
      
      return reply.send({
        arquivos: {
          total: parseInt(stats?.total || '0'),
          processados: parseInt(stats?.processados || '0'),
          pendentes: parseInt(stats?.pendentes || '0'),
          com_erro: parseInt(stats?.com_erro || '0'),
          provas_pdf: parseInt(stats?.provas_pdf || '0')
        },
        questoes: {
          total: parseInt(questoesStats?.total_questoes || '0'),
          arquivos_com_questoes: parseInt(questoesStats?.arquivos_com_questoes || '0'),
          revisadas: parseInt(questoesStats?.questoes_revisadas || '0')
        }
      });
      
    } catch (error: any) {
      console.error(`[Estatísticas] Erro:`, error);
      return reply.status(500).send({
        error: 'Erro ao buscar estatísticas',
        detalhes: error.message
      });
    }
  });
};

export default adminProcessarArquivoRoutes;
