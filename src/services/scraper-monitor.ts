// Arquivo para simular o monitoramento de scrapers
// Na realidade, isso seria um serviço que se comunica com um job queue (ex: BullMQ, Redis)

interface ScraperStatus {
  banca: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  found: number;
  saved: number;
  message?: string;
  lastRun?: string;
}

interface GlobalStatus {
  scrapers: ScraperStatus[];
  globalStatus: 'idle' | 'running' | 'completed';
  logs: string[];
}

// Simulação de estado global
let currentStatus: GlobalStatus = {
  scrapers: [
    { banca: 'Cebraspe', status: 'idle', progress: 0, found: 0, saved: 0, lastRun: new Date().toISOString() },
    { banca: 'FGV', status: 'idle', progress: 0, found: 0, saved: 0, lastRun: new Date().toISOString() },
    { banca: 'FCC', status: 'idle', progress: 0, found: 0, saved: 0, lastRun: new Date().toISOString() },
    { banca: 'Vunesp', status: 'idle', progress: 0, found: 0, saved: 0, lastRun: new Date().toISOString() },
  ],
  globalStatus: 'idle',
  logs: ['Serviço de monitoramento iniciado.'],
};

// Função que seria chamada pelo job queue para atualizar o status
export function updateScraperStatus(banca: string, status: ScraperStatus['status'], progress: number, found: number, saved: number, message?: string) {
  const scraper = currentStatus.scrapers.find(s => s.banca === banca);
  if (scraper) {
    scraper.status = status;
    scraper.progress = progress;
    scraper.found = found;
    scraper.saved = saved;
    scraper.message = message;
    if (status === 'completed' || status === 'error') {
      scraper.lastRun = new Date().toISOString();
    }
  }
  
  // Atualiza status global
  const running = currentStatus.scrapers.some(s => s.status === 'running');
  const allCompleted = currentStatus.scrapers.every(s => s.status === 'completed' || s.status === 'error' || s.status === 'idle');
  
  if (running) {
    currentStatus.globalStatus = 'running';
  } else if (allCompleted) {
    currentStatus.globalStatus = 'completed';
  } else {
    currentStatus.globalStatus = 'idle';
  }
  
  currentStatus.logs.push(`[${new Date().toLocaleTimeString()}] ${banca}: ${status} - ${message || ''}`);
  if (currentStatus.logs.length > 50) {
    currentStatus.logs.shift();
  }
}

// Função que o endpoint GET /admin/scrapers/status chamaria
export async function getScraperStatus(): Promise<GlobalStatus> {
  // Na realidade, buscaria o status do job queue
  return currentStatus;
}

// Simulação de como o job de scrape iniciaria
export function startScrapeSimulation() {
  currentStatus.globalStatus = 'running';
  currentStatus.logs.push(`[${new Date().toLocaleTimeString()}] Simulação de scrape iniciada.`);
  
  currentStatus.scrapers.forEach(s => {
    s.status = 'running';
    s.progress = 0;
    s.found = 0;
    s.saved = 0;
    s.message = 'Iniciando...';
  });
  
  // Simulação de progresso
  let interval = setInterval(() => {
    let allCompleted = true;
    currentStatus.scrapers.forEach(s => {
      if (s.status === 'running') {
        s.progress += 10;
        s.found = Math.min(s.found + 5, 50);
        s.saved = Math.min(s.saved + 2, 20);
        s.message = `Processando... ${s.progress}%`;
        if (s.progress >= 100) {
          s.status = 'completed';
          s.message = `Concluído. ${s.saved} salvos.`;
        } else {
          allCompleted = false;
        }
      }
    });
    
    if (allCompleted) {
      clearInterval(interval);
      currentStatus.globalStatus = 'completed';
      currentStatus.logs.push(`[${new Date().toLocaleTimeString()}] Simulação de scrape concluída.`);
    }
  }, 1000);
}

// Simulação de como o endpoint POST /admin/bancas/scrape-all chamaria
export function startAllScrapers() {
  // Na realidade, enviaria a mensagem para o job queue
  startScrapeSimulation();
  return { message: 'Scrapers iniciados (simulação)' };
}
