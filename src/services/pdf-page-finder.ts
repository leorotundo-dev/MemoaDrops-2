import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PageRange {
  start: number;
  end: number;
  keyword: string;
}

/**
 * Busca páginas que contêm palavras-chave relacionadas a conteúdo programático
 */
export async function findRelevantPages(pdfPath: string): Promise<PageRange[]> {
  const keywords = [
    'CONTEÚDO PROGRAMÁTICO',
    'CONTEUDO PROGRAMATICO',
    'ANEXO',
    'DISCIPLINAS',
    'MATÉRIAS',
    'MATERIAS',
    'CONHECIMENTOS',
    'PROGRAMA',
    'ÁREAS DE CONHECIMENTO',
    'AREAS DE CONHECIMENTO'
  ];

  const ranges: PageRange[] = [];

  try {
    // Extrair texto completo com números de página
    const { stdout } = await execAsync(
      `pdftotext -layout "${pdfPath}" - | grep -n -i -E "${keywords.join('|')}" | head -50`
    );

    if (!stdout.trim()) {
      console.log('[PDF Page Finder] Nenhuma palavra-chave encontrada no PDF');
      return [];
    }

    // Parse das linhas encontradas
    const lines = stdout.trim().split('\n');
    const pageNumbers = new Set<number>();

    for (const line of lines) {
      const match = line.match(/^(\d+):/);
      if (match) {
        const lineNumber = parseInt(match[1]);
        // Estimar número da página (aproximadamente 50 linhas por página)
        const estimatedPage = Math.ceil(lineNumber / 50);
        pageNumbers.add(estimatedPage);
      }
    }

    if (pageNumbers.size === 0) {
      return [];
    }

    // Criar ranges de páginas (página encontrada ± 5 páginas)
    const sortedPages = Array.from(pageNumbers).sort((a, b) => a - b);
    
    for (const page of sortedPages) {
      ranges.push({
        start: Math.max(1, page - 5),
        end: page + 10,
        keyword: 'CONTEÚDO PROGRAMÁTICO'
      });
    }

    // Mesclar ranges sobrepostos
    const mergedRanges = mergeRanges(ranges);

    console.log(`[PDF Page Finder] Encontradas ${mergedRanges.length} seções relevantes:`, 
      mergedRanges.map(r => `páginas ${r.start}-${r.end}`).join(', '));

    return mergedRanges;

  } catch (error: any) {
    console.error('[PDF Page Finder] Erro ao buscar páginas:', error.message);
    return [];
  }
}

/**
 * Mescla ranges de páginas sobrepostos
 */
function mergeRanges(ranges: PageRange[]): PageRange[] {
  if (ranges.length === 0) return [];

  const sorted = ranges.sort((a, b) => a.start - b.start);
  const merged: PageRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end + 1) {
      // Mesclar ranges sobrepostos
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Extrai texto apenas das páginas relevantes
 */
export async function extractTextFromRelevantPages(
  pdfPath: string,
  ranges: PageRange[]
): Promise<string> {
  if (ranges.length === 0) {
    console.log('[PDF Page Finder] Nenhum range fornecido, extraindo primeiras 30 páginas');
    const { stdout } = await execAsync(
      `pdftotext -layout -enc UTF-8 -l 30 "${pdfPath}" -`
    );
    return stdout;
  }

  let fullText = '';

  for (const range of ranges) {
    try {
      const { stdout } = await execAsync(
        `pdftotext -layout -enc UTF-8 -f ${range.start} -l ${range.end} "${pdfPath}" -`
      );
      fullText += `\n\n=== PÁGINAS ${range.start}-${range.end} ===\n\n${stdout}`;
    } catch (error: any) {
      console.error(`[PDF Page Finder] Erro ao extrair páginas ${range.start}-${range.end}:`, error.message);
    }
  }

  console.log(`[PDF Page Finder] Texto extraído: ${fullText.length} caracteres`);

  return fullText;
}
