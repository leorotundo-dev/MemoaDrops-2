import OpenAI from 'openai';
import { pdfToText } from './pdf.js';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedContestData {
  status?: string;
  ano?: number;
  nivel?: string;
  orgao?: string;
  estado?: string;
  cidade?: string;
  total_vagas?: number;
  salario?: string;
  data_inscricao_inicio?: string;
  data_inscricao_fim?: string;
  data_prova?: string;
  data_resultado?: string;
}

/**
 * Extrai dados estruturados de um PDF de edital usando OpenAI
 */
export async function extractContestDataFromPdf(pdfUrl: string): Promise<ExtractedContestData> {
  try {
    console.log(`[PDF Extractor] Baixando PDF: ${pdfUrl}`);
    
    // Baixar PDF
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const pdfBuffer = Buffer.from(response.data);
    
    // Converter PDF para texto
    console.log(`[PDF Extractor] Convertendo PDF para texto...`);
    const pdfText = await pdfToText(pdfBuffer);
    
    if (!pdfText || pdfText.length < 100) {
      throw new Error('PDF vazio ou muito pequeno');
    }

    // Limitar tamanho do texto (primeiros 8000 caracteres geralmente contém as informações principais)
    const textSample = pdfText.substring(0, 8000);

    console.log(`[PDF Extractor] Extraindo dados com OpenAI...`);
    
    // Usar OpenAI para extrair dados estruturados
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em extrair informações de editais de concursos públicos brasileiros.
Extraia as seguintes informações do texto fornecido e retorne APENAS um JSON válido, sem texto adicional:

{
  "status": "string (aberto, em andamento, encerrado, suspenso)",
  "ano": "number (ano do concurso)",
  "nivel": "string (fundamental, médio, técnico, superior)",
  "orgao": "string (nome do órgão/instituição)",
  "estado": "string (sigla do estado: SP, RJ, etc)",
  "cidade": "string (nome da cidade)",
  "total_vagas": "number (total de vagas)",
  "salario": "string (ex: R$ 5.000,00)",
  "data_inscricao_inicio": "string (formato YYYY-MM-DD)",
  "data_inscricao_fim": "string (formato YYYY-MM-DD)",
  "data_prova": "string (formato YYYY-MM-DD)",
  "data_resultado": "string (formato YYYY-MM-DD)"
}

Se alguma informação não estiver disponível, omita o campo do JSON.
Retorne APENAS o JSON, sem explicações.`
        },
        {
          role: 'user',
          content: `Extraia as informações deste edital:\n\n${textSample}`
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '{}';
    
    console.log(`[PDF Extractor] Resposta da OpenAI: ${responseText}`);

    // Parse JSON
    const extractedData = JSON.parse(responseText) as ExtractedContestData;

    console.log(`[PDF Extractor] ✅ Dados extraídos com sucesso`);
    
    return extractedData;

  } catch (error: any) {
    console.error(`[PDF Extractor] Erro ao extrair dados do PDF:`, error.message);
    throw error;
  }
}

/**
 * Atualiza concurso no banco com dados extraídos
 */
export async function updateContestWithExtractedData(
  contestId: string,
  data: ExtractedContestData,
  pool: any
): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Construir query dinâmica apenas com campos presentes
    if (data.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.ano) {
      fields.push(`ano = $${paramCount++}`);
      values.push(data.ano);
    }
    if (data.nivel) {
      fields.push(`nivel = $${paramCount++}`);
      values.push(data.nivel);
    }
    if (data.orgao) {
      fields.push(`orgao = $${paramCount++}`);
      values.push(data.orgao);
    }
    if (data.estado) {
      fields.push(`estado = $${paramCount++}`);
      values.push(data.estado);
    }
    if (data.cidade) {
      fields.push(`cidade = $${paramCount++}`);
      values.push(data.cidade);
    }
    if (data.total_vagas) {
      fields.push(`total_vagas = $${paramCount++}`);
      values.push(data.total_vagas);
    }
    if (data.salario) {
      fields.push(`salario = $${paramCount++}`);
      values.push(data.salario);
    }
    if (data.data_inscricao_inicio) {
      fields.push(`data_inscricao_inicio = $${paramCount++}`);
      values.push(data.data_inscricao_inicio);
    }
    if (data.data_inscricao_fim) {
      fields.push(`data_inscricao_fim = $${paramCount++}`);
      values.push(data.data_inscricao_fim);
    }
    if (data.data_prova) {
      fields.push(`data_prova = $${paramCount++}`);
      values.push(data.data_prova);
    }
    if (data.data_resultado) {
      fields.push(`data_resultado = $${paramCount++}`);
      values.push(data.data_resultado);
    }

    if (fields.length === 0) {
      console.log(`[PDF Extractor] Nenhum dado para atualizar`);
      return;
    }

    // Adicionar ID do concurso como último parâmetro
    values.push(contestId);

    const query = `
      UPDATE concursos 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
    `;

    await pool.query(query, values);

    console.log(`[PDF Extractor] ✅ Concurso ${contestId} atualizado com dados extraídos`);

  } catch (error: any) {
    console.error(`[PDF Extractor] Erro ao atualizar concurso:`, error.message);
    throw error;
  }
}
