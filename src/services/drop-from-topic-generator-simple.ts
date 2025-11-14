import { pool } from '../db/connection.js';

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
 * Gera drop educacional MOCK a partir de um subtópico
 * Versão simplificada para testar sem GPT-4
 */
export async function generateDropFromSubtopico(
  subtopicoId: string
): Promise<DropGenerationResult> {
  console.log(`[Drop Generator MOCK] Gerando drop para subtópico ${subtopicoId}`);
  
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
  
  // Gerar drop MOCK
  const drop = {
    titulo: subtopico.subtopico_nome.substring(0, 60),
    slug: slugify(subtopico.subtopico_nome),
    conteudo: `Este é um drop sobre ${subtopico.subtopico_nome}. Conteúdo didático completo seria gerado aqui via GPT-4.1-mini com base em fontes oficiais.`,
    exemplo_pratico: `Exemplo prático de aplicação de ${subtopico.subtopico_nome} em concursos públicos.`,
    tecnicas_memorizacao: ['Mnemônico MOCK', 'Associação visual MOCK'],
    dificuldade: 'medio' as const,
    tempo_estimado_minutos: 10,
    fontes_utilizadas: [{
      source: 'Planalto',
      title: 'Constituição Federal 1988',
      url: 'https://www.planalto.gov.br',
      license: 'Uso livre'
    }]
  };
  
  return {
    drop,
    metadata: {
      tokens_used: 0,
      cost_usd: 0,
      content_chunks_used: 1,
      sources_consulted: ['Planalto']
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
