import { pool } from '../db/connection.js';
import OpenAI from 'openai';
import { retrieveContent } from './content-retriever.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface DropGenerationResult {
  drop: {
    titulo: string;
    slug: string;
    conteudo: string;
    exemplo_pratico: string;
    tecnicas_memorizacao: string[];
    dificuldade: 'facil' | 'medio' | 'dificil';
    tempo_estimado_minutos: number;
    fontes_utilizadas: Array<{
      source: string;
      title: string;
      url: string;
      license: string;
    }>;
  };
  metadata: {
    tokens_used: number;
    cost_usd: number;
    content_chunks_used: number;
    sources_consulted: string[];
  };
}

/**
 * Gera drop educacional a partir de um subtópico usando GPT-4.1-mini + RAG
 */
export async function generateDropFromSubtopico(
  subtopicoId: string
): Promise<DropGenerationResult> {
  console.log(`[Drop Generator] Gerando drop para subtópico ${subtopicoId}`);
  
  // Buscar informações do subtópico
  const subtopicoQuery = await pool.query(`
    SELECT 
      st.id,
      st.nome as subtopico_nome,
      st.descricao as subtopico_descricao,
      t.nome as topico_nome,
      m.nome as materia_nome,
      c.name as concurso_nome,
      c.id as concurso_id
    FROM subtopicos st
    JOIN topicos t ON st.topico_id = t.id
    JOIN materias m ON t.materia_id = m.id
    LEFT JOIN concursos c ON m.contest_id = c.id
    WHERE st.id = $1
  `, [subtopicoId]);
  
  if (subtopicoQuery.rows.length === 0) {
    throw new Error(`Subtópico ${subtopicoId} não encontrado`);
  }
  
  const subtopico = subtopicoQuery.rows[0];
  
  // Determinar categorias prioritárias baseado na matéria
  const categoriasMap: Record<string, string[]> = {
    'direito': ['lei-seca', 'jurisprudencia'],
    'português': ['oer', 'didatico'],
    'matemática': ['oer', 'didatico'],
    'administração': ['lei-seca', 'oer'],
    'default': ['lei-seca', 'oer', 'jurisprudencia', 'didatico']
  };
  
  const materiaLower = (subtopico.materia_nome || '').toLowerCase();
  const categorias = Object.keys(categoriasMap).find(k => materiaLower.includes(k))
    ? categoriasMap[Object.keys(categoriasMap).find(k => materiaLower.includes(k))!]
    : categoriasMap['default'];
  
  // Buscar conteúdo relevante via RAG
  console.log(`[Drop Generator] Buscando conteúdo para: ${subtopico.subtopico_nome}`);
  const contentResult = await retrieveContent(subtopico.subtopico_nome, {
    limit: 5,
    categories: categorias
  });
  
  // Preparar contexto para GPT
  const contexto = contentResult.chunks.length > 0
    ? contentResult.chunks.map(c => `[${c.source_label}] ${c.text_snippet}`).join('\n\n')
    : 'Nenhum conteúdo específico encontrado. Use conhecimento geral.';
  
  // Gerar drop via GPT-4.1-mini
  console.log(`[Drop Generator] Gerando conteúdo via GPT-4.1-mini...`);
  const prompt = `Você é um especialista em educação para concursos públicos brasileiros.

TAREFA: Criar um "drop" educacional (pílula de conhecimento) sobre o tema abaixo.

TEMA: ${subtopico.subtopico_nome}
MATÉRIA: ${subtopico.materia_nome}
TÓPICO: ${subtopico.topico_nome}
CONCURSO: ${subtopico.concurso_nome || 'Geral'}

CONTEXTO (fontes oficiais):
${contexto}

INSTRUÇÕES:
1. Escreva um conteúdo didático claro e objetivo (200-400 palavras)
2. Crie um exemplo prático de aplicação em questões de concurso
3. Sugira 2-3 técnicas de memorização (mnemônicos, associações visuais, etc)
4. Avalie a dificuldade: facil, medio ou dificil
5. Estime tempo de estudo em minutos (5, 10, 15, 20, 30)

FORMATO DE RESPOSTA (JSON):
{
  "titulo": "Título do drop (máx 60 caracteres)",
  "conteudo": "Conteúdo didático completo",
  "exemplo_pratico": "Exemplo de questão ou aplicação prática",
  "tecnicas_memorizacao": ["Técnica 1", "Técnica 2"],
  "dificuldade": "medio",
  "tempo_estimado_minutos": 15
}

IMPORTANTE:
- Use linguagem clara e acessível
- Foque em concursos públicos brasileiros
- Base-se nas fontes fornecidas quando disponíveis
- Seja preciso e objetivo`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: 'Você é um especialista em educação para concursos públicos. Responda SEMPRE em JSON válido.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' }
  });

  const responseText = completion.choices[0].message.content || '{}';
  const dropData = JSON.parse(responseText);
  
  // Calcular custo
  const tokensUsed = completion.usage?.total_tokens || 0;
  const costPer1kTokens = 0.00015; // GPT-4.1-mini pricing
  const costUsd = (tokensUsed / 1000) * costPer1kTokens;
  
  // Preparar fontes utilizadas
  const fontesUtilizadas = contentResult.chunks.map(c => ({
    source: c.source_label,
    title: c.doc_title,
    url: c.doc_url || '',
    license: c.license || 'Uso livre'
  }));
  
  // Se não houver fontes, adicionar fonte genérica
  if (fontesUtilizadas.length === 0) {
    fontesUtilizadas.push({
      source: 'Conhecimento Geral',
      title: 'Base de conhecimento do modelo',
      url: '',
      license: 'N/A'
    });
  }
  
  // Gerar drop
  const drop = {
    titulo: dropData.titulo || subtopico.subtopico_nome.substring(0, 60),
    slug: slugify(dropData.titulo || subtopico.subtopico_nome),
    conteudo: dropData.conteudo || '',
    exemplo_pratico: dropData.exemplo_pratico || '',
    tecnicas_memorizacao: dropData.tecnicas_memorizacao || [],
    dificuldade: dropData.dificuldade || 'medio',
    tempo_estimado_minutos: dropData.tempo_estimado_minutos || 15,
    fontes_utilizadas: fontesUtilizadas
  };
  
  console.log(`[Drop Generator] Drop gerado! Tokens: ${tokensUsed}, Custo: $${costUsd.toFixed(6)}`);
  
  return {
    drop,
    metadata: {
      tokens_used: tokensUsed,
      cost_usd: costUsd,
      content_chunks_used: contentResult.chunks.length,
      sources_consulted: [...new Set(contentResult.chunks.map(c => c.source_label))]
    }
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
