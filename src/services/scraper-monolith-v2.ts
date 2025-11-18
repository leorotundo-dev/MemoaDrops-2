// src/services/scraper-monolith-v2.ts
// Versão melhorada com pdfjs-dist

import OpenAI from "openai";
import * as crypto from "crypto";
import * as cheerio from "cheerio";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Não usar worker em Node.js - processar diretamente
// pdfjsLib.GlobalWorkerOptions.workerSrc não é necessário no backend

export interface ConcursoLink {
  titulo: string;
  url: string;
}

export interface EditalLink {
  titulo: string;
  url: string;
}

export interface BancoConfig {
  name: string;
  listUrl: string;
  listLinkPatterns: string[];
  editalInclude?: string[];
  editalExclude?: string[];
  usePuppeteer?: boolean;
}

export const BANKS_CONFIG: Record<string, BancoConfig> = {
  fgv: {
    name: "FGV",
    listUrl: "https://conhecimento.fgv.br/concursos",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "retificação", "retificacao"]
  },
  cebraspe: {
    name: "Cebraspe",
    listUrl: "https://www.cebraspe.org.br/concursos/inscricoes-abertas/",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"],
    usePuppeteer: true  // Site React/SPA
  },
  fcc: {
    name: "FCC",
    listUrl: "https://www.fcc.org.br/concursos/",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },
  vunesp: {
    name: "Vunesp",
    listUrl: "https://www.vunesp.com.br/",
    listLinkPatterns: ["VUNESP_Online", "VSOL"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },
  quadrix: {
    name: "Quadrix",
    listUrl: "https://site.quadrix.org.br/todos-os-concursos.aspx",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },
  aocp: {
    name: "AOCP",
    listUrl: "https://www.institutoaocp.org.br/concursos.jsp",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },
  ibfc: {
    name: "IBFC",
    listUrl: "https://concursos.ibfc.org.br/",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },
  iades: {
    name: "IADES",
    listUrl: "https://www.iades.com.br/inscricao/ProcessoSeletivo.aspx",
    listLinkPatterns: ["ProcessoSeletivo"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog"]
  },
  fundatec: {
    name: "Fundatec",
    listUrl: "https://fundatec.org.br/portal/concursos/index.php",
    listLinkPatterns: ["detalhe"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },
  idecan: {
    name: "IDECAN",
    listUrl: "https://idecan.selecao.net.br/informacoes/",
    listLinkPatterns: ["informacoes"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  }
};

export class BaseScraper {
  constructor(public config: BancoConfig) {}

  async fetchHtml(url: string): Promise<string> {
    if (this.config.usePuppeteer) {
      return this.fetchHtmlWithPuppeteer(url);
    }
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (MemoDropsBot)" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao acessar ${url}`);
    return res.text();
  }
  
  async fetchHtmlWithPuppeteer(url: string): Promise<string> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Aguardar conteúdo carregar (React)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  }

  extractConcursoLinks(html: string, baseUrl: string): ConcursoLink[] {
    const $ = cheerio.load(html);
    const links: Record<string, ConcursoLink> = {};
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const h = href.toLowerCase();
      if (!this.config.listLinkPatterns.some(p => h.includes(p.toLowerCase()))) return;
      const abs = new URL(href, baseUrl).toString();
      links[abs] = { titulo: text || abs, url: abs };
    });
    return Object.values(links);
  }

  extractEditaisFromHtml(html: string, concursoUrl: string): EditalLink[] {
    const $ = cheerio.load(html);
    const include = (this.config.editalInclude ?? ["edital", ".pdf"]).map(t => t.toLowerCase());
    const exclude = (this.config.editalExclude ?? ["gabarito","resultado","homolog","classificação","audiência","audiencia","cancelamento","comunicado"]).map(t => t.toLowerCase());
    const out: Record<string, EditalLink> = {};
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const t = text.toLowerCase();
      const h = href.toLowerCase();
      if (!h.endsWith(".pdf") && !t.includes("edital") && !h.includes("edital")) return;
      if (exclude.some(e => t.includes(e) || h.includes(e))) return;
      if (!include.some(i => t.includes(i) || h.includes(i))) return;
      const abs = new URL(href, concursoUrl).toString();
      out[abs] = { titulo: text || abs, url: abs };
    });
    return Object.values(out);
  }

  async runConcursoList() {
    const listHtml = await this.fetchHtml(this.config.listUrl);
    const concursos = this.extractConcursoLinks(listHtml, this.config.listUrl);
    const out: { concurso: ConcursoLink; editais: EditalLink[] }[] = [];
    for (const c of concursos) {
      try {
        const concursoHtml = await this.fetchHtml(c.url);
        const editais = this.extractEditaisFromHtml(concursoHtml, c.url);
        out.push({ concurso: c, editais });
      } catch (e) {
        console.error(`[${this.config.name}] erro em ${c.url}`, e);
      }
    }
    return out;
  }
}

// Filtro de concursos ativos
export const STATUS_EXCLUDE = [
  "homologado","homologação","encerrado","finalizado","concluído",
  "classificação final","resultado final","resultado definitivo","suspenso","cancelado"
];

export function isConcursoActive(html: string): boolean {
  const lower = html.toLowerCase();
  return !STATUS_EXCLUDE.some(s => lower.includes(s));
}

// PDF processing com pdfjs-dist
export async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Falha ao baixar PDF: ${url}`);
  
  const contentType = res.headers.get('content-type') || '';
  
  // Se retornou HTML em vez de PDF, tentar extrair link do PDF
  if (contentType.includes('text/html')) {
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Procurar link direto para PDF na página
    let pdfUrl = null;
    const candidates: Array<{href: string, text: string, score: number}> = [];
    
    $('a[href$=".pdf"]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      if (!href) return;
      
      let score = 0;
      
      // Pontos positivos
      if (text.includes('edital')) score += 10;
      if (text.includes('abertura')) score += 5;
      if (text.includes('completo') || text.includes('completa')) score += 5;
      if (text.includes('01/2024') || text.includes('02/2024')) score += 3;
      
      // Pontos negativos
      if (text.includes('gabarito')) score -= 100;
      if (text.includes('resultado')) score -= 100;
      if (text.includes('homolog')) score -= 100;
      if (text.includes('classificação')) score -= 100;
      if (text.includes('isencao') || text.includes('isenção')) score -= 50;
      if (text.includes('pcd') || text.includes('pne')) score -= 50;
      if (text.includes('preliminar') || text.includes('definitivo')) score -= 30;
      
      if (score > 0) {
        candidates.push({ href, text, score });
      }
    });
    
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      pdfUrl = candidates[0].href;
      console.log(`[PDF Selection] Escolhido: ${candidates[0].text} (score: ${candidates[0].score})`);
    }
    
    // Se não encontrou, pegar retificação que contém edital completo
    if (!pdfUrl) {
      const retificacoes: Array<{href: string, text: string, priority: number}> = [];
      $('a[href$=".pdf"]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        if (href && text.includes('retifica')) {
          // Prioridade: completo > primeira retificação > outras
          let priority = 0;
          if (text.includes('completo') || text.includes('completa')) priority = 3;
          else if (text.includes('1a') || text.includes('1ª') || text.includes('primeira')) priority = 2;
          else priority = 1;
          retificacoes.push({ href, text, priority });
        }
      });
      
      if (retificacoes.length > 0) {
        // Ordenar por prioridade (maior primeiro)
        retificacoes.sort((a, b) => b.priority - a.priority);
        pdfUrl = retificacoes[0].href;
      }
    }
    
    if (pdfUrl) {
      const absolutePdfUrl = new URL(pdfUrl, url).toString();
      return downloadPdf(absolutePdfUrl); // Recursivo
    }
    
    throw new Error(`URL retornou HTML sem link para PDF: ${url}`);
  }
  
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function hashPdf(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export async function readPdfText(buf: Buffer, maxPages = 3): Promise<string> {
  try {
    // Converter Buffer para Uint8Array
    const uint8Array = new Uint8Array(buf);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    const numPages = Math.min(pdfDocument.numPages, maxPages);
    let fullText = '';
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error: any) {
    console.error('Erro ao ler PDF:', error.message);
    throw new Error(`Falha ao processar PDF: ${error.message}`);
  }
}

export const PDF_KEYWORDS = {
  editalAbertura: [
    "edital de abertura","concurso público","processo seletivo",
    "disposições preliminares","conteúdo programático","programas das provas"
  ],
  retificacao: ["retificação","retificacao"],
  gabarito: ["gabarito preliminar","gabarito definitivo"],
  resultado: ["resultado preliminar","resultado final","classificação","homologação"]
};

export function classifyPdf(text: string): string {
  const lower = text.toLowerCase();
  
  // Prioridade: gabarito e resultado são excludentes
  if (PDF_KEYWORDS.gabarito.some(k => lower.includes(k))) return "gabarito";
  if (PDF_KEYWORDS.resultado.some(k => lower.includes(k))) return "resultado";
  
  // Se tem conteúdo programático, é edital válido (mesmo sendo retificação)
  const hasConteudoProgramatico = lower.includes('conteúdo programático') || 
                                   lower.includes('conteudo programatico') ||
                                   lower.includes('programa das provas') ||
                                   lower.includes('anexo') && lower.includes('disciplina');
  
  if (hasConteudoProgramatico) return "edital_de_abertura";
  
  // Se tem palavras-chave de edital de abertura
  if (PDF_KEYWORDS.editalAbertura.some(k => lower.includes(k))) return "edital_de_abertura";
  
  // Retificação sem conteúdo programático
  if (PDF_KEYWORDS.retificacao.some(k => lower.includes(k))) return "retificacao";
  
  return "outro";
}

export async function processPdf(url: string) {
  const buf = await downloadPdf(url);
  const hash = hashPdf(buf);
  const text = await readPdfText(buf, 3);
  const tipo = classifyPdf(text);
  return { url, hash, tipo, preview: text.slice(0, 600) };
}

// OpenAI extractor
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function recortarTrechosRelevantes(text: string): string {
  // Padrões para encontrar seções relevantes
  const blocos = [
    // Conteúdo programático (MAIS IMPORTANTE)
    /conteúdo\s+programático[\s\S]*/i,
    /programa[\s\S]*?(?=anexo|bibliografia)/i,
    /conhecimentos\s+específicos[\s\S]*?(?=anexo|bibliografia)/i,
    /disciplinas[\s\S]*?(?=anexo|bibliografia)/i,
    // Informações gerais
    /disposições\s+preliminares[\s\S]*?(?=das\s+inscrições)/i,
    /das\s+provas[\s\S]*?(?=conteúdo|programa)/i
  ];
  
  let final = "";
  let foundContent = false;
  
  for (const r of blocos) {
    const m = text.match(r);
    if (m) {
      final += m[0] + "\n---\n";
      foundContent = true;
    }
  }
  
  // Se não encontrou nada, tenta buscar por padrões mais genéricos
  if (!foundContent) {
    // Busca por listas numeradas ou com marcadores (comum em editais)
    const patterns = [
      /\d+\.\s+[A-ZÁ-Ú][\s\S]{100,}/,  // Listas numeradas
      /[A-ZÁ-Ú\s]{3,}:\s*\n[\s\S]{100,}/  // Títulos seguidos de conteúdo
    ];
    
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        final += m[0];
        break;
      }
    }
  }
  
  // Se ainda não encontrou nada, retorna o meio do documento (onde geralmente está o conteúdo)
  if (!final) {
    const middle = Math.floor(text.length / 3);
    return text.slice(middle, middle + 15000);
  }
  
  // Limita o tamanho para não exceder o limite do modelo
  return final.slice(0, 15000);
}

export async function extractWithOpenAI(pdfText: string): Promise<any> {
  const trecho = recortarTrechosRelevantes(pdfText);
  const messages = [{
    role: "user" as const,
    content: `Você é especialista em concursos públicos no Brasil.

Extraia APENAS um JSON válido com a seguinte estrutura:

{
  "orgao": "nome do órgão",
  "banca": "nome da banca organizadora",
  "cargos": ["cargo 1", "cargo 2"],
  "vagas": "número de vagas ou null",
  "salario": "faixa salarial ou null",
  "inscricoes_inicio": "data ou null",
  "inscricoes_fim": "data ou null",
  "prova_data": "data ou null",
  "disciplinas": [
    {
      "nome": "Nome da Disciplina/Matéria",
      "topicos": [
        {
          "nome": "Nome do Tópico Principal",
          "subtopicos": [
            "Subtópico 1",
            "Subtópico 2",
            "Subtópico 3"
          ]
        }
      ]
    }
  ]
}

**INSTRUÇÕES IMPORTANTES:**
1. A seção "disciplinas" é a MAIS IMPORTANTE - extraia com máximo detalhamento
2. Cada disciplina deve ter nome claro (ex: "Língua Portuguesa", "Direito Constitucional")
3. Cada tópico deve representar um tema principal da disciplina
4. Subtópicos devem ser os itens específicos listados no conteúdo programático
5. Se não houver hierarquia clara, coloque todos os itens como subtópicos de um tópico genérico
6. Mantenha a nomenclatura exata do edital
7. Se algo não existir, use null ou lista vazia []
8. Retorne APENAS o JSON, sem texto adicional

TEXTO DO EDITAL:
${trecho}`
  }];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    max_tokens: 8000,  // Aumentado para permitir hierarquias mais complexas
    temperature: 0
  });

  const content = completion.choices[0].message.content ?? "{}";
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

// Orquestrador geral
export async function runFullPipeline(bancaKey: string) {
  const cfg = BANKS_CONFIG[bancaKey];
  if (!cfg) throw new Error(`Banca não configurada: ${bancaKey}`);
  const scraper = new BaseScraper(cfg);
  const concursosComEditais = await scraper.runConcursoList();
  const saida: any[] = [];

  for (const item of concursosComEditais) {
    const { concurso, editais } = item;
    if (!editais || editais.length === 0) continue;
    
    try {
      const htmlConcurso = await scraper.fetchHtml(concurso.url);
      if (!isConcursoActive(htmlConcurso)) continue;

      for (const edital of editais) {
        try {
          console.log(`[${cfg.name}] processando edital: ${edital.titulo}`);
          const pdfInfo = await processPdf(edital.url);
          console.log(`[${cfg.name}] tipo do PDF: ${pdfInfo.tipo}`);
          if (pdfInfo.tipo !== "edital_de_abertura") {
            console.log(`[${cfg.name}] pulando ${pdfInfo.tipo}: ${edital.titulo}`);
            continue;
          }
          
          const buf = await downloadPdf(edital.url);
          const fullText = await readPdfText(buf, 6);
          const dados = await extractWithOpenAI(fullText);
          
          saida.push({
            banca: cfg.name,
            concurso,
            edital,
            pdf: { tipo: pdfInfo.tipo, hash: pdfInfo.hash },
            dados
          });
        } catch (e: any) {
          console.error(`[${cfg.name}] erro no edital ${edital.url}:`, e.message);
        }
      }
    } catch (e: any) {
      console.error(`[${cfg.name}] erro no concurso ${concurso.url}:`, e.message);
    }
  }
  return saida;
}

// Alias para compatibilidade
export const runScraperForBank = runFullPipeline;
