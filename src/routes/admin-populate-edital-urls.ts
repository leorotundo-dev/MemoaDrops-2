import { FastifyInstance } from 'fastify';
import puppeteer from 'puppeteer';
import { pool } from '../db/connection.js';

export async function adminPopulateEditalUrlsRoutes(app: FastifyInstance) {
  
  // Popular edital_url dos concursos de uma banca
  app.post('/admin/populate-edital-urls/:bancaId', async (request, reply) => {
    try {
      const { bancaId } = request.params as { bancaId: string };
      const bancaIdNum = parseInt(bancaId);
      
      console.log(`[Populate Edital URLs] Iniciando para banca ${bancaIdNum}`);
      
      // Buscar concursos sem edital_url
      const { rows: contests } = await pool.query(`
        SELECT id, name, contest_url 
        FROM concursos 
        WHERE banca_id = $1 
        AND (edital_url IS NULL OR edital_url = '')
        ORDER BY created_at DESC
      `, [bancaIdNum]);
      
      console.log(`[Populate Edital URLs] Encontrados ${contests.length} concursos sem edital_url`);
      
      if (contests.length === 0) {
        return {
          success: true,
          message: 'Nenhum concurso sem edital_url',
          updated: 0,
        };
      }
      
      // Iniciar navegador
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      
      let updatedCount = 0;
      let failedCount = 0;
      
      for (const contest of contests) {
        try {
          console.log(`[Populate Edital URLs] Processando: ${contest.name}`);
          
          const page = await browser.newPage();
          await page.goto(contest.contest_url, {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });
          
          // Aguardar um pouco para garantir que o conteúdo carregou
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Extrair link do PDF do edital de abertura
          const editalUrl = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            
            for (const link of links) {
              const text = link.textContent?.trim().toLowerCase() || '';
              const href = link.href;
              
              // Procurar "Edital nº 1 - Abertura" (sem Acessível ou VLibras)
              if (
                text.includes('edital') &&
                text.includes('abertura') &&
                !text.includes('acessível') &&
                !text.includes('vlibras') &&
                href &&
                href.includes('.pdf')
              ) {
                return href;
              }
            }
            
            return null;
          });
          
          await page.close();
          
          if (editalUrl) {
            // Atualizar no banco
            await pool.query(
              'UPDATE concursos SET edital_url = $1 WHERE id = $2',
              [editalUrl, contest.id]
            );
            
            console.log(`[Populate Edital URLs] ✅ Atualizado: ${contest.name}`);
            console.log(`[Populate Edital URLs] PDF: ${editalUrl}`);
            updatedCount++;
          } else {
            console.log(`[Populate Edital URLs] ❌ Nenhum PDF encontrado: ${contest.name}`);
            failedCount++;
          }
          
          // Delay para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`[Populate Edital URLs] Erro ao processar ${contest.name}:`, error);
          failedCount++;
        }
      }
      
      await browser.close();
      
      return {
        success: true,
        total: contests.length,
        updated: updatedCount,
        failed: failedCount,
        successRate: `${(updatedCount / contests.length * 100).toFixed(1)}%`,
      };
      
    } catch (error: any) {
      console.error('[Populate Edital URLs] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
