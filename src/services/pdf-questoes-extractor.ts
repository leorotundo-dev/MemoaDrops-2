import { extractTextFromPdf } from './pdf-text-extractor.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface QuestaoExtraida {
  numero: number;
  enunciado: string;
  alternativas: {
    letra: string;
    texto: string;
    ordem: number;
  }[];
  resposta_correta?: string;
  tem_imagem?: boolean;
  tem_tabela?: boolean;
  tem_grafico?: boolean;
}

export interface ResultadoExtracao {
  sucesso: boolean;
  questoes: QuestaoExtraida[];
  total_questoes: number;
  erro?: string;
  texto_extraido_length?: number;
}

/**
 * Extrai questões de um PDF de prova usando IA (GPT-4)
 */
export async function extrairQuestoesDePdf(
  pdfPath: string,
  opcoes?: {
    maxQuestoes?: number;
    modelo?: string;
  }
): Promise<ResultadoExtracao> {
  try {
    console.log(`[PDF Questões Extractor] Iniciando extração de ${pdfPath}...`);
    
    // 1. Extrair texto do PDF
    const textoCompleto = await extractTextFromPdf(pdfPath);
    console.log(`[PDF Questões Extractor] Texto extraído: ${textoCompleto.length} caracteres`);
    
    if (textoCompleto.length < 500) {
      return {
        sucesso: false,
        questoes: [],
        total_questoes: 0,
        erro: 'Texto extraído muito curto (< 500 caracteres)',
        texto_extraido_length: textoCompleto.length
      };
    }
    
    // 2. Limitar tamanho do texto (GPT-4 tem limite de tokens)
    // Aproximadamente 4 caracteres = 1 token
    // GPT-4 Turbo: 128k tokens = ~500k caracteres
    const maxCaracteres = 400000; // ~100k tokens (deixa margem para resposta)
    const textoParaProcessar = textoCompleto.length > maxCaracteres 
      ? textoCompleto.substring(0, maxCaracteres) 
      : textoCompleto;
    
    if (textoCompleto.length > maxCaracteres) {
      console.warn(`[PDF Questões Extractor] Texto truncado de ${textoCompleto.length} para ${maxCaracteres} caracteres`);
    }
    
    // 3. Chamar GPT-4 para extrair questões
    console.log(`[PDF Questões Extractor] Chamando GPT-4 para extrair questões...`);
    
    const prompt = `Você é um especialista em extrair questões de provas de concursos públicos.

Analise o texto abaixo, que foi extraído de um PDF de prova, e extraia TODAS as questões de múltipla escolha encontradas.

Para cada questão, extraia:
1. Número da questão
2. Enunciado completo
3. Todas as alternativas (A, B, C, D, E, etc)
4. Se houver menção a imagem, tabela ou gráfico no enunciado

IMPORTANTE:
- Extraia APENAS questões de múltipla escolha
- Mantenha o texto original sem modificações
- Se uma questão mencionar "figura", "tabela", "gráfico", marque tem_imagem/tem_tabela/tem_grafico como true
- Ignore cabeçalhos, rodapés, instruções gerais
- Retorne um JSON válido

Formato de saída (JSON):
{
  "questoes": [
    {
      "numero": 1,
      "enunciado": "Texto completo da questão...",
      "alternativas": [
        {"letra": "A", "texto": "Texto da alternativa A", "ordem": 1},
        {"letra": "B", "texto": "Texto da alternativa B", "ordem": 2},
        ...
      ],
      "tem_imagem": false,
      "tem_tabela": false,
      "tem_grafico": false
    }
  ]
}

TEXTO DA PROVA:
${textoParaProcessar}`;

    const completion = await openai.chat.completions.create({
      model: opcoes?.modelo || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em extrair questões de provas de concursos. Sempre retorne JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Baixa temperatura para maior precisão
      response_format: { type: 'json_object' }
    });
    
    const resposta = completion.choices[0].message.content;
    if (!resposta) {
      throw new Error('GPT-4 retornou resposta vazia');
    }
    
    console.log(`[PDF Questões Extractor] Resposta recebida do GPT-4`);
    
    // 4. Parsear resposta JSON
    const dados = JSON.parse(resposta);
    const questoes: QuestaoExtraida[] = dados.questoes || [];
    
    // 5. Validar questões extraídas
    const questoesValidas = questoes.filter(q => {
      return (
        q.numero > 0 &&
        q.enunciado && q.enunciado.length > 10 &&
        q.alternativas && q.alternativas.length >= 2
      );
    });
    
    console.log(`[PDF Questões Extractor] Questões extraídas: ${questoesValidas.length}/${questoes.length}`);
    
    if (opcoes?.maxQuestoes && questoesValidas.length > opcoes.maxQuestoes) {
      questoesValidas.splice(opcoes.maxQuestoes);
      console.log(`[PDF Questões Extractor] Limitado a ${opcoes.maxQuestoes} questões`);
    }
    
    return {
      sucesso: true,
      questoes: questoesValidas,
      total_questoes: questoesValidas.length,
      texto_extraido_length: textoCompleto.length
    };
    
  } catch (error: any) {
    console.error(`[PDF Questões Extractor] Erro:`, error.message);
    return {
      sucesso: false,
      questoes: [],
      total_questoes: 0,
      erro: error.message
    };
  }
}

/**
 * Extrai questões e retorna estatísticas
 */
export async function extrairQuestoesComEstatisticas(pdfPath: string) {
  const inicio = Date.now();
  const resultado = await extrairQuestoesDePdf(pdfPath);
  const duracao = Date.now() - inicio;
  
  return {
    ...resultado,
    duracao_ms: duracao,
    duracao_segundos: Math.round(duracao / 1000),
    questoes_por_segundo: resultado.total_questoes > 0 
      ? (resultado.total_questoes / (duracao / 1000)).toFixed(2)
      : '0'
  };
}
