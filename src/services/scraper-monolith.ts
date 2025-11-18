// src/services/scraper-monolith.ts
// Monolito simplificado: estrutura completa + 10 bancas principais.

import OpenAI from "openai";
import crypto from "crypto";
import pdf from "pdf-parse";
import * as cheerio from "cheerio";

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
}

export const BANKS_CONFIG: Record<string, BancoConfig> = {
  fgv: {
    name: "FGV",
    listUrl: "https://conhecimento.fgv.br/concursos",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado"]
  },
  cebraspe: {
    name: "CEBRASPE",
    listUrl: "https://www.cebraspe.org.br/concursos/",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  },
  fcc: {
    name: "FCC",
    listUrl: "https://www.fcc.org.br/concursos/",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  },
  vunesp: {
    name: "Vunesp",
    listUrl: "https://www.vunesp.com.br/",
    listLinkPatterns: ["VUNESP_Online","VSOL"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  },
  quadrix: {
    name: "Quadrix",
    listUrl: "https://site.quadrix.org.br/todos-os-concursos.aspx",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  },
  aocp: {
    name: "AOCP",
    listUrl: "https://www.institutoaocp.org.br/concursos.jsp",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  },
  ibfc: {
    name: "IBFC",
    listUrl: "https://concursos.ibfc.org.br/",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  },
  iades: {
    name: "IADES",
    listUrl: "https://www.iades.com.br/inscricao/ProcessoSeletivo.aspx",
    listLinkPatterns: ["ProcessoSeletivo"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito","homolog"]
  },
  fundatec: {
    name: "Fundatec",
    listUrl: "https://fundatec.org.br/portal/concursos/index.php",
    listLinkPatterns: ["detalhe"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  },
  idecan: {
    name: "IDECAN",
    listUrl: "https://idecan.selecao.net.br/informacoes/",
    listLinkPatterns: ["informacoes"],
    editalInclude: ["edital"],
    editalExclude: ["resultado","gabarito"]
  }
};

export class BaseScraper {
  constructor(public config: BancoConfig) {}

  async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (MemoDropsBot)" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao acessar ${url}`);
    return res.text();
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
    const exclude = (this.config.editalExclude ?? ["gabarito","resultado","homolog","classificação","retificação"]).map(t => t.toLowerCase());
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

// Filtro de concursos ativos (status + datas simples)
export const STATUS_EXCLUDE = [
  "homologado","homologação","encerrado","finalizado","concluído",
  "classificação final","resultado final","resultado definitivo","suspenso","cancelado"
];

export const DATE_REGEX = /\b(\d{2}\/\d{2}\/\d{4})\b/g;

export function extractDates(text: string): Date[] {
  const matches = text.match(DATE_REGEX) || [];
  return matches.map(d => {
    const [dia, mes, ano] = d.split("/").map(Number);
    return new Date(ano, mes - 1, dia);
  });
}

export function isConcursoActive(html: string): boolean {
  const lower = html.toLowerCase();
  if (STATUS_EXCLUDE.some(s => lower.includes(s))) return false;
  const datas = extractDates(lower);
  if (datas.length === 0) return true;
  const last = datas.sort((a,b) => b.getTime() - a.getTime())[0];
  const hoje = new Date(); 
  hoje.setHours(0,0,0,0);
  return last >= hoje;
}

// PDF + classificação
export async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar PDF: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function hashPdf(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export async function readPdfText(buf: Buffer, maxPages = 3): Promise<string> {
  const data = await pdf(buf);
  const approxChars = maxPages * 6000;
  return data.text.slice(0, approxChars);
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
  if (PDF_KEYWORDS.gabarito.some(k => lower.includes(k))) return "gabarito";
  if (PDF_KEYWORDS.resultado.some(k => lower.includes(k))) return "resultado";
  if (PDF_KEYWORDS.retificacao.some(k => lower.includes(k))) return "retificacao";
  if (PDF_KEYWORDS.editalAbertura.some(k => lower.includes(k))) return "edital_de_abertura";
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
  const blocos = [
    /disposições preliminares[\s\S]*?(?=das inscrições)/i,
    /conteúdo programático[\s\S]*/i,
    /provas[\s\S]*?(?=conteúdo programático)/i
  ];
  let final = "";
  for (const r of blocos) {
    const m = text.match(r);
    if (m) final += m[0] + "\n---\n";
  }
  if (!final) return text.slice(0, 10000);
  return final.slice(0, 12000);
}

export async function extractWithOpenAI(pdfText: string): Promise<any> {
  const trecho = recortarTrechosRelevantes(pdfText);
  const messages = [{
    role: "user" as const,
    content: `Você é especialista em concursos públicos no Brasil.
Extraia APENAS um JSON com dados do edital (órgão, banca, cargos, vagas, salários, datas principais, disciplinas e tópicos de conteúdo programático).
Se algo não existir, use null ou lista vazia.

TEXTO:
${trecho}`
  }];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    max_tokens: 4000,
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
    const htmlConcurso = await scraper.fetchHtml(concurso.url);
    if (!isConcursoActive(htmlConcurso)) continue;

    for (const edital of editais) {
      try {
        const pdfInfo = await processPdf(edital.url);
        if (pdfInfo.tipo !== "edital_de_abertura") continue;
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
      } catch (e) {
        console.error(`[${cfg.name}] erro no edital ${edital.url}`, e);
      }
    }
  }
  return saida;
}
