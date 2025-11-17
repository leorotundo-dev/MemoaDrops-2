import { pool } from '../db/connection.js';
import puppeteer, { Browser, Page } from 'puppeteer';

interface WorkerStatus {
  running: boolean;
  processed: number;
  failed: number;
  remaining: number;
  currentContest: string | null;
  startedAt: Date | null;
  lastError: string | null;
}

class EditalWorker {
  private status: WorkerStatus = {
    running: false,
    processed: 0,
    failed: 0,
    remaining: 0,
    currentContest: null,
    startedAt: null,
    lastError: null,
  };
  
  private browser: Browser | null = null;
  private shouldStop = false;
  
  /**
   * Inicia o worker
   */
  async start(limit?: number): Promise<void> {
    if (this.status.running) {
      console.log('[Edital Worker] Já está rodando');
      return;
    }
    
    this.status.running = true;
    this.status.startedAt = new Date();
    this.status.processed = 0;
    this.status.failed = 0;
    this.shouldStop = false;
    
    console.log('[Edital Worker] Iniciando...');
    
    try {
      // Iniciar navegador
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      
      // Processar fila
      await this.processQueue(limit);
      
    } catch (error: any) {
      console.error('[Edital Worker] Erro fatal:', error);
      this.status.lastError = error.message;
    } finally {
      // Fechar navegador
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.status.running = false;
      this.status.currentContest = null;
      
      console.log('[Edital Worker] Finalizado');
      console.log(`[Edital Worker] Processados: ${this.status.processed}`);
      console.log(`[Edital Worker] Falhas: ${this.status.failed}`);
    }
  }
  
  /**
   * Para o worker
   */
  stop(): void {
    if (!this.status.running) {
      console.log('[Edital Worker] Não está rodando');
      return;
    }
    
    console.log('[Edital Worker] Parando...');
    this.shouldStop = true;
  }
  
  /**
   * Retorna status atual
   */
  getStatus(): WorkerStatus {
    return { ...this.status };
  }
  
  /**
   * Processa fila de concursos sem edital
   */
  private async processQueue(limit?: number): Promise<void> {
    while (!this.shouldStop) {
      // Buscar próximo concurso sem edital
      const { rows } = await pool.query(`
        SELECT id, name, contest_url, banca_id
        FROM concursos
        WHERE (edital_url IS NULL OR edital_url = '')
          AND contest_url IS NOT NULL
          AND contest_url != ''
        ORDER BY created_at DESC
        ${limit ? `LIMIT ${limit}` : ''}
      `);
      
      if (rows.length === 0) {
        console.log('[Edital Worker] Fila vazia, nenhum concurso sem edital');
        break;
      }
      
      this.status.remaining = rows.length;
      
      for (const contest of rows) {
        if (this.shouldStop) {
          console.log('[Edital Worker] Parado pelo usuário');
          break;
        }
        
        this.status.currentContest = contest.name;
        console.log(`[Edital Worker] Processando: ${contest.name}`);
        
        try {
          const editalUrl = await this.extractEditalUrl(contest.contest_url);
          
          if (editalUrl) {
            // Atualizar no banco
            await pool.query(
              'UPDATE concursos SET edital_url = $1, updated_at = NOW() WHERE id = $2',
              [editalUrl, contest.id]
            );
            
            console.log(`[Edital Worker] ✅ Edital encontrado: ${editalUrl}`);
            this.status.processed++;
          } else {
            console.log(`[Edital Worker] ⚠️ Nenhum edital encontrado`);
            this.status.failed++;
          }
          
        } catch (error: any) {
          console.error(`[Edital Worker] ❌ Erro ao processar ${contest.name}:`, error.message);
          this.status.failed++;
          this.status.lastError = error.message;
        }
        
        // Delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Se tinha limite, processar apenas uma vez
      if (limit) break;
    }
  }
  
  /**
   * Extrai URL do edital de uma página de concurso
   */
  private async extractEditalUrl(contestUrl: string): Promise<string | null> {
    if (!this.browser) {
      throw new Error('Browser não inicializado');
    }
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(contestUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      
      // Aguardar um pouco para garantir que o conteúdo carregou
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Extrair link do PDF do edital de abertura
      const editalUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        
        // Prioridade 1: Edital de Abertura específico
        for (const link of links) {
          const text = link.textContent?.trim().toLowerCase() || '';
          const href = link.getAttribute('href') || '';
          
          if (
            text.includes('edital') &&
            text.includes('abertura') &&
            !text.includes('acessível') &&
            !text.includes('vlibras') &&
            !text.includes('retificação') &&
            !text.includes('retificacao') &&
            href &&
            href.includes('.pdf')
          ) {
            // Retornar URL absoluta
            return new URL(href, window.location.href).href;
          }
        }
        
        // Prioridade 2: Qualquer edital em PDF (sem retificação)
        for (const link of links) {
          const text = link.textContent?.trim().toLowerCase() || '';
          const href = link.getAttribute('href') || '';
          
          if (
            text.includes('edital') &&
            !text.includes('acessível') &&
            !text.includes('vlibras') &&
            !text.includes('retificação') &&
            !text.includes('retificacao') &&
            href &&
            href.includes('.pdf')
          ) {
            return new URL(href, window.location.href).href;
          }
        }
        
        return null;
      });
      
      return editalUrl;
      
    } finally {
      await page.close();
    }
  }
}

// Singleton
export const editalWorker = new EditalWorker();
