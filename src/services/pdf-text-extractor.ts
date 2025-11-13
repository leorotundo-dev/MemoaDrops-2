import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Extrai texto de um PDF usando pdftotext (poppler-utils)
 */
export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    console.log(`[PDF Text Extractor] Extraindo texto de ${pdfPath}...`);
    
    // Verificar se arquivo existe
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Arquivo PDF não encontrado: ${pdfPath}`);
    }
    
    // Usar pdftotext para extrair texto
    // -layout: mantém o layout original
    // -enc UTF-8: codificação UTF-8
    // -: output para stdout
    const { stdout, stderr } = await execAsync(`pdftotext -layout -enc UTF-8 "${pdfPath}" -`);
    
    if (stderr && !stderr.includes('Warning')) {
      console.warn(`[PDF Text Extractor] Avisos: ${stderr}`);
    }
    
    const text = stdout.trim();
    
    if (!text || text.length < 100) {
      throw new Error('PDF vazio ou texto extraído muito curto');
    }
    
    console.log(`[PDF Text Extractor] Texto extraído com sucesso (${text.length} caracteres)`);
    
    return text;
    
  } catch (error: any) {
    console.error(`[PDF Text Extractor] Erro ao extrair texto de ${pdfPath}:`, error.message);
    throw error;
  }
}

/**
 * Extrai apenas as primeiras N páginas de um PDF
 */
export async function extractTextFromPdfPages(pdfPath: string, maxPages: number = 10): Promise<string> {
  try {
    console.log(`[PDF Text Extractor] Extraindo primeiras ${maxPages} páginas de ${pdfPath}...`);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Arquivo PDF não encontrado: ${pdfPath}`);
    }
    
    // -l: limitar número de páginas
    const { stdout, stderr } = await execAsync(`pdftotext -layout -enc UTF-8 -l ${maxPages} "${pdfPath}" -`);
    
    if (stderr && !stderr.includes('Warning')) {
      console.warn(`[PDF Text Extractor] Avisos: ${stderr}`);
    }
    
    const text = stdout.trim();
    
    console.log(`[PDF Text Extractor] Texto extraído (${text.length} caracteres)`);
    
    return text;
    
  } catch (error: any) {
    console.error(`[PDF Text Extractor] Erro ao extrair texto:`, error.message);
    throw error;
  }
}

/**
 * Limpa e normaliza texto extraído de PDF
 */
export function cleanPdfText(text: string): string {
  return text
    // Remover múltiplas quebras de linha
    .replace(/\n{3,}/g, '\n\n')
    // Remover espaços múltiplos
    .replace(/ {2,}/g, ' ')
    // Remover linhas com apenas espaços
    .replace(/^\s+$/gm, '')
    // Normalizar caracteres especiais
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .trim();
}
