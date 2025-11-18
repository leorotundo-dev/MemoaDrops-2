// Rota temporária para popular banco com dados de teste
import { FastifyInstance } from 'fastify';
import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerSeedRoutes(app: FastifyInstance) {
  
  // POST /admin/seed-test-data
  app.post('/admin/seed-test-data', async (request, reply) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Criar banca FGV
      const bancaResult = await client.query(`
        INSERT INTO bancas (name, created_at)
        VALUES ('FGV', NOW())
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `);
      const bancaId = bancaResult.rows[0].id;

      // Criar concurso
      const concursoResult = await client.query(`
        INSERT INTO concursos (banca_id, name, url, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `, [bancaId, 'TRT-2 Analista Judiciário - Área Administrativa', 'https://conhecimento.fgv.br/concursos/trt2-25']);
      const concursoId = concursoResult.rows[0].id;

      // Matéria: Língua Portuguesa
      const materiaPortuguesResult = await client.query(`
        INSERT INTO materias (contest_id, nome, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [concursoId, 'Língua Portuguesa']);
      const materiaPortuguesId = materiaPortuguesResult.rows[0].id;

      // Tópico: Compreensão e interpretação
      const topicoCompreensaoResult = await client.query(`
        INSERT INTO topicos (materia_id, nome, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [materiaPortuguesId, 'Compreensão e interpretação de textos']);
      const topicoCompreensaoId = topicoCompreensaoResult.rows[0].id;

      // Subtópicos de Compreensão
      const subtopico1Result = await client.query(`
        INSERT INTO subtopicos (topico_id, nome, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [topicoCompreensaoId, 'Tipologia textual']);
      const subtopico1Id = subtopico1Result.rows[0].id;

      await client.query(`
        INSERT INTO subtopicos (topico_id, nome, created_at)
        VALUES ($1, $2, NOW())
      `, [topicoCompreensaoId, 'Ortografia oficial']);

      await client.query(`
        INSERT INTO subtopicos (topico_id, nome, created_at)
        VALUES ($1, $2, NOW())
      `, [topicoCompreensaoId, 'Acentuação gráfica']);

      // Tópico: Sintaxe
      const topicoSintaxeResult = await client.query(`
        INSERT INTO topicos (materia_id, nome, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [materiaPortuguesId, 'Sintaxe']);
      const topicoSintaxeId = topicoSintaxeResult.rows[0].id;

      // Subtópicos de Sintaxe
      const subtopico4Result = await client.query(`
        INSERT INTO subtopicos (topico_id, nome, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [topicoSintaxeId, 'Concordância nominal e verbal']);
      const subtopico4Id = subtopico4Result.rows[0].id;

      await client.query(`
        INSERT INTO subtopicos (topico_id, nome, created_at)
        VALUES ($1, $2, NOW())
      `, [topicoSintaxeId, 'Regência nominal e verbal']);

      // Matéria: Direito Constitucional
      const materiaConstResult = await client.query(`
        INSERT INTO materias (contest_id, nome, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [concursoId, 'Direito Constitucional']);
      const materiaConstId = materiaConstResult.rows[0].id;

      // Tópico: Princípios fundamentais
      const topicoPrincipiosResult = await client.query(`
        INSERT INTO topicos (materia_id, nome, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [materiaConstId, 'Princípios fundamentais']);
      const topicoPrincipiosId = topicoPrincipiosResult.rows[0].id;

      // Subtópicos de Princípios
      await client.query(`
        INSERT INTO subtopicos (topico_id, nome, created_at)
        VALUES ($1, $2, NOW())
      `, [topicoPrincipiosId, 'Direitos e garantias fundamentais']);

      await client.query(`
        INSERT INTO subtopicos (topico_id, nome, created_at)
        VALUES ($1, $2, NOW())
      `, [topicoPrincipiosId, 'Organização do Estado']);

      // Drop 1: Tipologia textual
      await client.query(`
        INSERT INTO drops (subtopico_id, titulo, conteudo, dificuldade, tempo_estimado_minutos, gerado_em)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        subtopico1Id,
        'Tipologia Textual - Tipos e Características',
        `# Tipologia Textual

## O que é Tipologia Textual?

Tipologia textual refere-se à classificação dos textos de acordo com suas características estruturais e funcionais. Os principais tipos textuais são:

### 1. Narrativo
- Conta uma história
- Presença de personagens, tempo e espaço
- Sequência de ações

### 2. Descritivo
- Caracteriza seres, objetos ou ambientes
- Uso abundante de adjetivos
- Detalhamento de características

### 3. Dissertativo
- Defende um ponto de vista
- Argumentação lógica
- Estrutura: introdução, desenvolvimento, conclusão

### 4. Expositivo
- Apresenta informações
- Linguagem clara e objetiva
- Finalidade informativa

### 5. Injuntivo
- Instrui, orienta, dá ordens
- Uso de verbos no imperativo
- Exemplo: receitas, manuais

## Dica para Concursos

Nas provas, é comum encontrar textos que misturam mais de um tipo textual. Identifique o tipo predominante!`,
        'facil',
        15
      ]);

      // Drop 2: Concordância
      await client.query(`
        INSERT INTO drops (subtopico_id, titulo, conteudo, dificuldade, tempo_estimado_minutos, gerado_em)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        subtopico4Id,
        'Concordância Nominal e Verbal - Regras Essenciais',
        `# Concordância Nominal e Verbal

## Concordância Verbal

O verbo concorda com o sujeito em número e pessoa.

### Regras Básicas:

1. **Sujeito simples:** O verbo concorda com o núcleo do sujeito
   - *O aluno* **estuda** para a prova.
   - *Os alunos* **estudam** para a prova.

2. **Sujeito composto anteposto:** Verbo no plural
   - *João e Maria* **chegaram** cedo.

3. **Sujeito composto posposto:** Verbo concorda com o mais próximo ou vai para o plural
   - **Chegou** *João e Maria*. (singular)
   - **Chegaram** *João e Maria*. (plural)

## Concordância Nominal

O artigo, o adjetivo, o numeral e o pronome concordam com o substantivo em gênero e número.

### Exemplos:
- *As* **belas** *flores* (artigo + adjetivo + substantivo)
- *Dois* **novos** *livros* (numeral + adjetivo + substantivo)

## Casos Especiais

- **Meio:** Quando adjetivo, concorda; quando advérbio, não.
  - Ela está *meia* cansada. (adjetivo)
  - Ela está *meio* cansada. (advérbio)

- **Bastante:** Quando adjetivo, concorda; quando advérbio, não.
  - Havia *bastantes* pessoas. (adjetivo)
  - Elas estudaram *bastante*. (advérbio)`,
        'medio',
        20
      ]);

      await client.query('COMMIT');

      return reply.send({
        success: true,
        message: 'Dados de teste criados com sucesso',
        concurso_id: concursoId,
        materias: 2,
        topicos: 3,
        subtopicos: 7,
        drops: 2
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[Seed] Erro:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar dados de teste',
        detalhe: error.message
      });
    } finally {
      client.release();
    }
  });
}
