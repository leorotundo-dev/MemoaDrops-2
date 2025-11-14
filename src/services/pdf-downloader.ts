import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório para armazenar PDFs temporariamente
const PDF_TEMP_DIR = path.join(__dirname, '../../temp/pdfs');

/**
 * Garante que o diretório de PDFs existe
 */
function ensurePdfDir(): void {
  if (!fs.existsSync(PDF_TEMP_DIR)) {
    fs.mkdirSync(PDF_TEMP_DIR, { recursive: true });
  }
}

/**
 * Baixa um PDF de uma URL e salva localmente
 */
export async function downloadPdf(url: string, destPathOrContestId: string): Promise<string> {
  try {
    ensurePdfDir();
    
    console.log(`[PDF Downloader] Baixando PDF de ${url}...`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 segundos
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      maxRedirects: 5,
    });
    
    // Verificar se é realmente um PDF
    const contentType = response.headers['content-type'];
    if (!contentType?.includes('pdf') && !url.endsWith('.pdf')) {
      throw new Error(`URL não retornou um PDF (Content-Type: ${contentType})`);
    }
    
    // Salvar arquivo
    // Se destPathOrContestId contém '/', é um caminho completo
    const filepath = destPathOrContestId.includes('/') || destPathOrContestId.includes('\\')
      ? destPathOrContestId
      : path.join(PDF_TEMP_DIR, `${destPathOrContestId}.pdf`);
    
    fs.writeFileSync(filepath, response.data);
    
    const fileSize = fs.statSync(filepath).size;
    console.log(`[PDF Downloader] PDF baixado com sucesso (${fileSize} bytes): ${filepath}`);
    
    return filepath;
    
  } catch (error: any) {
    console.error(`[PDF Downloader] Erro ao baixar PDF de ${url}:`, error.message);
    throw error;
  }
}

/**
 * Remove um PDF temporário
 */
export function deletePdf(filepath: string): void {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`[PDF Downloader] PDF removido: ${filepath}`);
    }
  } catch (error: any) {
    console.error(`[PDF Downloader] Erro ao remover PDF ${filepath}:`, error.message);
  }
}

/**
 * Limpa PDFs antigos (mais de 1 hora)
 */
export function cleanupOldPdfs(): void {
  try {
    ensurePdfDir();
    
    const files = fs.readdirSync(PDF_TEMP_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    let cleaned = 0;
    
    for (const file of files) {
      const filepath = path.join(PDF_TEMP_DIR, file);
      const stats = fs.statSync(filepath);
      
      if (now - stats.mtimeMs > oneHour) {
        fs.unlinkSync(filepath);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[PDF Downloader] ${cleaned} PDFs antigos removidos`);
    }
    
  } catch (error: any) {
    console.error(`[PDF Downloader] Erro ao limpar PDFs antigos:`, error.message);
  }
}
