import { FastifyInstance } from 'fastify';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { pool } from '../db/connection.js';

// Adicionar stealth plugin
chromium.use(StealthPlugin());

export async function adminPopulateVunespEditaisRoutes(app: FastifyInstance) {
  
  // Popular edital_url dos concursos da Vunesp
  app.post('/admin/populate-vunesp-editais', async (request, reply) => {
    try {
      console.log(`[Vunesp Editais] Iniciando extração de editais`);
      
      // Buscar concursos da Vunesp sem edital_url
      const { rows: contests } = await pool.query(`
        SELECT c.id, c.name, c.contest_url as url, b.name as banca_name
        FROM concursos c
        JOIN bancas b ON c.banca_id = b.id
        WHERE LOWER(b.name) = 'vunesp'
        AND (c.edital_url IS NULL OR c.edital_url = '')
        ORDER BY c.created_at DESC
        LIMIT 50
      `);
      
      console.log(`[Vunesp Editais] Encontrados ${contests.length} concursos sem edital_url`);
      
      if (contests.length === 0) {
        return {
          success: true,
          message: 'Nenhum concurso da Vunesp sem edital_url',
          updated: 0,
        };
      }
      
      // Iniciar navegador com stealth
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
      });
      
      let updatedCount = 0;
      let failedCount = 0;
      const results: any[] = [];
      
      for (const contest of contests) {
        try {
          console.log(`[Vunesp Editais] Processando: ${contest.name}`);
          
          const page = await context.newPage();
          
          // Navegar para a página do concurso
          await page.goto(contest.url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          
          // Aguardar um pouco para garantir que o conteúdo carregou
          await page.waitForTimeout(2000);
          
          // Extrair links de editais
          const editais = await page.evaluate(() => {
            const editaisLinks: Array<{title: string; url: string; date: string}> = [];
            
            // Procurar por links que contenham "documento" ou "edital"
            const allLinks = Array.from(document.querySelectorAll('a'));
            
            for (const link of allLinks) {
              const href = link.getAttribute('href') || '';
              const title = link.getAttribute('title') || link.textContent?.trim() || '';
              
              // Verificar se é um link de documento
              if (href.includes('documento.vunesp.com.br') || 
                  (href.includes('.pdf') && title.toLowerCase().includes('edital'))) {
                
                // Tentar extrair data do contexto
                let date = '';
                const parent = link.closest('div, li, tr');
                if (parent) {
                  const dateMatch = parent.textContent?.match(/(\d{2}\/\d{2}\/\d{4})/);
                  if (dateMatch) {
                    date = dateMatch[1];
                  }
                }
                
                editaisLinks.push({
                  title: title.substring(0, 200),
                  url: href.startsWith('http') ? href : `https://www.vunesp.com.br${href}`,
                  date,
                });
              }
            }
            
            return editaisLinks;
          });
          
          await page.close();
          
          if (editais.length > 0) {
            // Pegar o primeiro edital (geralmente é o de abertura)
            const editalPrincipal = editais[0];
            
            // Atualizar no banco
            await pool.query(
              'UPDATE concursos SET edital_url = $1 WHERE id = $2',
              [editalPrincipal.url, contest.id]
            );
            
            console.log(`[Vunesp Editais] ✅ Atualizado: ${contest.name}`);
            console.log(`[Vunesp Editais] Edital: ${editalPrincipal.title}`);
            console.log(`[Vunesp Editais] URL: ${editalPrincipal.url}`);
            
            results.push({
              contest: contest.name,
              success: true,
              editais_encontrados: editais.length,
              edital_principal: editalPrincipal.title,
            });
            
            updatedCount++;
          } else {
            console.log(`[Vunesp Editais] ❌ Nenhum edital encontrado: ${contest.name}`);
            results.push({
              contest: contest.name,
              success: false,
              error: 'Nenhum edital encontrado',
            });
            failedCount++;
          }
          
          // Delay para não sobrecarregar
          await page.waitForTimeout(2000);
          
        } catch (error: any) {
          console.error(`[Vunesp Editais] Erro ao processar ${contest.name}:`, error.message);
          results.push({
            contest: contest.name,
            success: false,
            error: error.message,
          });
          failedCount++;
        }
      }
      
      await context.close();
      await browser.close();
      
      return {
        success: true,
        total: contests.length,
        updated: updatedCount,
        failed: failedCount,
        successRate: `${(updatedCount / contests.length * 100).toFixed(1)}%`,
        results,
      };
      
    } catch (error: any) {
      console.error('[Vunesp Editais] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
