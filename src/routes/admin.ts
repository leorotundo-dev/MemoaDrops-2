import type { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';
import { scrapeQueue, vectorQueue } from '../jobs/queues.js';
import { pool } from '../db/connection.js';
import {
  calcularProximaRevisao,
  calcularQualidadeMedia,
  verificarDominado,
  calcularEstatisticas,
  calcularDropsNovos
} from '../services/sm2-algorithm.js';

export async function adminRoutes(app: FastifyInstance) {
  
  // ============================================
  // CRIAR USUÁRIO ADMIN (Setup Inicial)
  // ============================================
  
  app.post('/admin/setup/run-migration', async (request, reply) => {
    try {
      const { sql } = request.body as { sql: string };
      await pool.query(sql);
      return { message: 'Migration executada com sucesso!' };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  app.post('/admin/setup/query', async (request, reply) => {
    try {
      const { sql } = request.body as { sql: string };
      const result = await pool.query(sql);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  app.post('/admin/setup/create-admin', async (request, reply) => {
    try {
      const { email, password, name } = request.body as { email: string; password: string; name?: string };
      
      // Verificar se já existe
      const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (existing.length > 0) {
        // Atualizar para superadmin
        await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['superadmin', email]);
        return { message: 'Usuário existente atualizado para superadmin', email };
      }
      
      // Criar novo usuário admin
      const { rows: [newUser] } = await pool.query(`
        INSERT INTO users (email, password_hash, name, role, plan, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, email, name, role
      `, [email, password, name || 'Admin', 'superadmin', 'premium']);
      
      return { message: 'Superadmin criado com sucesso!', user: newUser };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // ============================================
  // ESTATÍSTICAS GERAIS (Dashboard Principal)
  // ============================================
  
  app.get('/admin/stats', async () => {
    const stats: any = {
      users: { total: 0, active_dau: 0, active_mau: 0 },
      finance: { mrr: 0, total_cost: 0, costs_by_category: {}, costs_by_service: [] },
      content: { contests: 0, subjects: 0, topicos: 0, subtopicos: 0, drops: 0, public_decks: 0, public_cards: 0 },
      system: { api_status: 'healthy', db_status: 'healthy', active_jobs: 0, failed_jobs: 0 }
    };

    // Usuários
    try {
      const { rows: [usersCount] } = await pool.query('SELECT COUNT(*)::int AS total FROM users');
      stats.users.total = usersCount?.total || 0;
    } catch (e) {
      console.error('Error counting users:', e);
    }

    // DAU/MAU
    try {
      const { rows: [activeDAU] } = await pool.query(`
        SELECT COUNT(DISTINCT user_id)::int AS active_dau 
        FROM study_sessions 
        WHERE session_date >= NOW() - INTERVAL '1 day'
      `);
      stats.users.active_dau = activeDAU?.active_dau || 0;

      const { rows: [activeMAU] } = await pool.query(`
        SELECT COUNT(DISTINCT user_id)::int AS active_mau 
        FROM study_sessions 
        WHERE session_date >= NOW() - INTERVAL '30 days'
      `);
      stats.users.active_mau = activeMAU?.active_mau || 0;
    } catch (e) {
      // Tabela study_sessions não existe ainda
    }

    // Custos
    try {
      const { rows: costsByCategory } = await pool.query(`
        SELECT category, SUM(amount)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY category
      `);
      
      stats.finance.costs_by_category = costsByCategory.reduce((acc: any, row: any) => {
        acc[row.category] = parseFloat(row.total);
        return acc;
      }, {});

      const { rows: costsByService } = await pool.query(`
        SELECT service, category, SUM(amount)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY service, category
        ORDER BY total DESC
      `);
      
      stats.finance.costs_by_service = costsByService.map((row: any) => ({
        service: row.service,
        category: row.category,
        total: parseFloat(row.total)
      }));

      const { rows: [totalCostRow] } = await pool.query(`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      stats.finance.total_cost = parseFloat(totalCostRow?.total || '0');
      stats.finance.mrr = 0; // TODO: calcular MRR real quando houver assinaturas
    } catch (e) {
      console.error('Error fetching costs:', e);
    }

    // Conteúdo
    try {
      const { rows: [contests] } = await pool.query('SELECT COUNT(*)::int AS contests FROM concursos');
      stats.content.contests = contests?.contests || 0;
    } catch (e) {
      // Tabela concursos não existe
    }

    try {
      const { rows: [subjects] } = await pool.query('SELECT COUNT(*)::int AS subjects FROM materias');
      stats.content.subjects = subjects?.subjects || 0;
    } catch (e) {
      // Tabela materias não existe
    }

    // Adicionar contagem de tópicos
    try {
      const { rows: [topicos] } = await pool.query('SELECT COUNT(*)::int AS topicos FROM topicos');
      stats.content.topicos = topicos?.topicos || 0;
    } catch (e) {
      // Tabela topicos não existe
    }

    // Adicionar contagem de subtópicos
    try {
      const { rows: [subtopicos] } = await pool.query('SELECT COUNT(*)::int AS subtopicos FROM subtopicos');
      stats.content.subtopicos = subtopicos?.subtopicos || 0;
    } catch (e) {
      // Tabela subtopicos não existe
    }

    // Adicionar contagem de drops
    try {
      const { rows: [drops] } = await pool.query('SELECT COUNT(*)::int AS drops FROM drops');
      stats.content.drops = drops?.drops || 0;
    } catch (e) {
      // Tabela drops não existe
    }

    // Remover contagem de decks/cards (não usados no sistema atual)
    stats.content.public_decks = 0;
    stats.content.public_cards = 0;

    // Sistema - Jobs
    try {
      const { rows: [activeJobs] } = await pool.query(`
        SELECT COUNT(*)::int AS active_jobs 
        FROM jobs 
        WHERE status IN ('active', 'waiting')
      `);
      stats.system.active_jobs = activeJobs?.active_jobs || 0;

      const { rows: [failedJobs] } = await pool.query(`
        SELECT COUNT(*)::int AS failed_jobs 
        FROM jobs 
        WHERE status = 'failed'
      `);
      stats.system.failed_jobs = failedJobs?.failed_jobs || 0;
    } catch (e) {
      // Tabela jobs não existe
    }

    // Testar conexão com DB
    try {
      await pool.query('SELECT 1');
      stats.system.db_status = 'healthy';
    } catch (e) {
      stats.system.db_status = 'error';
    }

    return stats;
  });

  // Endpoint separado para custos
  app.get('/admin/costs', async () => {
    try {
      const { rows: costsByCategory } = await pool.query(`
        SELECT category, SUM(amount)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY category
      `);
      
      const { rows: costsByService } = await pool.query(`
        SELECT service, category, SUM(amount)::numeric AS total, description
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY service, category, description
        ORDER BY total DESC
      `);
      
      const { rows: [totalCostRow] } = await pool.query(`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM api_costs
        WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      return {
        total_cost: parseFloat(totalCostRow?.total || '0'),
        by_category: costsByCategory.reduce((acc: any, row: any) => {
          acc[row.category] = parseFloat(row.total);
          return acc;
        }, {}),
        by_service: costsByService.map((row: any) => ({
          service: row.service,
          category: row.category,
          total: parseFloat(row.total),
          description: row.description
        }))
      };
    } catch (error: any) {
      console.error('Error fetching costs:', error);
      return { total_cost: 0, by_category: {}, by_service: [] };
    }
  });

  // ============================================
  // GESTÃO DE USUÁRIOS
  // ============================================

  // Listar usuários com paginação e filtros
  // ENDPOINT REMOVIDO - Usar admin-users.ts ao invés deste
  // app.get('/admin/users', ...) foi movido para src/routes/admin-users.ts

  // ENDPOINTS REMOVIDOS - Usar admin-users.ts ao invés deste
  // As rotas /admin/users/:id/add-cash, /admin/users/:id/ban e /admin/users/:id/unban
  // foram movidas para src/routes/admin-users.ts com autenticação adequada

  // ============================================
  // GESTÃO DE CONTEÚDO - CONCURSOS
  // ============================================

  // Listar concursos
  app.get('/admin/contests', async (req, reply) => {
    const { rows: contests } = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        COALESCE(b.display_name, b.name) as banca,
        c.ano, 
        c.nivel, 
        c.data_prova, 
        c.salario, 
        c.numero_vagas, 
        c.orgao, 
        c.cidade, 
        c.estado, 
        c.edital_url,
        c.contest_url, 
        c.created_at
      FROM concursos c
      LEFT JOIN bancas b ON c.banca_id = b.id
      ORDER BY c.name ASC
    `);

    return { data: contests };
  });

  // Buscar detalhes de um concurso específico
  app.get('/admin/contests/:id', async (req, reply) => {
    const { id } = req.params as any;

    const { rows: [contest] } = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        COALESCE(b.display_name, b.name) as banca,
        c.ano, 
        c.nivel, 
        c.data_prova, 
        c.salario, 
        c.numero_vagas, 
        c.orgao, 
        c.cidade, 
        c.estado, 
        c.edital_url,
        c.contest_url, 
        c.informacoes_scraper, 
        c.created_at, 
        c.updated_at
      FROM concursos c
      LEFT JOIN bancas b ON c.banca_id = b.id
      WHERE c.id = $1
    `, [id]);

    if (!contest) {
      return reply.code(404).send({ error: 'contest_not_found' });
    }

    // Buscar matérias do concurso
    const { rows: materias } = await pool.query(`
      SELECT id, nome, created_at
      FROM materias
      WHERE contest_id = $1
      ORDER BY nome ASC
    `, [id]);

    // Buscar hierarquia completa (tópicos e subtópicos)
    for (const materia of materias) {
      const { rows: topicos } = await pool.query(`
        SELECT id, nome, created_at
        FROM topicos
        WHERE materia_id = $1
        ORDER BY nome ASC
      `, [materia.id]);

      for (const topico of topicos) {
        const { rows: subtopicos } = await pool.query(`
          SELECT id, nome, created_at
          FROM subtopicos
          WHERE topico_id = $1
          ORDER BY nome ASC
        `, [topico.id]);
        topico.subtopicos = subtopicos;
      }

      materia.topicos = topicos;
    }

    // Buscar drops do concurso (via subtópicos)
    const { rows: drops } = await pool.query(`
      SELECT 
        d.id,
        d.titulo,
        d.conteudo,
        d.subtopico_id,
        d.gerado_em as created_at
      FROM drops d
      JOIN subtopicos s ON d.subtopico_id = s.id
      JOIN topicos t ON s.topico_id = t.id
      JOIN materias m ON t.materia_id = m.id
      WHERE m.contest_id = $1
      ORDER BY d.gerado_em DESC
      LIMIT 10
    `, [id]);

    // Calcular estatísticas
    const { rows: [stats] } = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.id)::int as total_materias,
        COUNT(DISTINCT t.id)::int as total_topicos,
        COUNT(DISTINCT s.id)::int as total_subtopicos,
        COUNT(DISTINCT d.id)::int as total_drops
      FROM materias m
      LEFT JOIN topicos t ON t.materia_id = m.id
      LEFT JOIN subtopicos s ON s.topico_id = t.id
      LEFT JOIN drops d ON d.subtopico_id = s.id
      WHERE m.contest_id = $1
    `, [id]);

    return { 
      data: { 
        ...contest, 
        materias,
        drops,
        stats: stats || { total_materias: 0, total_topicos: 0, total_subtopicos: 0, total_drops: 0 }
      } 
    };
  });

  // Criar concurso
  app.post('/admin/contests', async (req, reply) => {
    const { name, slug } = req.body as any;

    if (!name || !slug) {
      return reply.code(400).send({ error: 'missing_fields' });
    }

    const { rows: [contest] } = await pool.query(`
      INSERT INTO concursos (name, slug, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id, name, slug, created_at
    `, [name, slug]);

    return { contest };
  });

  // Atualizar concurso
  app.put('/admin/contests/:id', async (req, reply) => {
    const { id } = req.params as any;
    const { name, slug } = req.body as any;

    const { rows: [contest] } = await pool.query(`
      UPDATE concursos
      SET name = COALESCE($1, name),
          slug = COALESCE($2, slug)
      WHERE id = $3
      RETURNING id, name, slug, created_at
    `, [name, slug, id]);

    if (!contest) {
      return reply.code(404).send({ error: 'contest_not_found' });
    }

    return { contest };
  });

  // Deletar concurso
  app.delete('/admin/contests/:id', async (req, reply) => {
    const { id } = req.params as any;

    await pool.query('DELETE FROM concursos WHERE id = $1', [id]);

    return { ok: true, message: `Concurso ${id} deletado` };
  });

  // ============================================
  // GESTÃO DE CONTEÚDO - MATÉRIAS
  // ============================================

  // Listar matérias
  app.get('/admin/subjects', async (req, reply) => {
    const { concurso_id } = req.query as any;
    
    let query = `
      SELECT id, nome, slug, contest_id, created_at
      FROM materias
    `;
    const params: any[] = [];
    
    if (concurso_id) {
      query += ` WHERE contest_id = $1`;
      params.push(concurso_id);
    }
    
    query += ` ORDER BY nome ASC`;
    
    const { rows: subjects } = await pool.query(query, params);

    return { subjects };
  });

  // Criar matéria
  app.post('/admin/subjects', async (req, reply) => {
    const { nome, slug, concurso_id } = req.body as any;

    if (!nome || !slug || !concurso_id) {
      return reply.code(400).send({ error: 'missing_fields' });
    }

    const { rows: [subject] } = await pool.query(`
      INSERT INTO materias (nome, slug, contest_id, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, nome, slug, contest_id, created_at
    `, [nome, slug, concurso_id]);

    return { subject };
  });

  // Atualizar matéria
  app.put('/admin/subjects/:id', async (req, reply) => {
    const { id } = req.params as any;
    const { nome, slug } = req.body as any;

    const { rows: [subject] } = await pool.query(`
      UPDATE materias
      SET nome = COALESCE($1, nome),
          slug = COALESCE($2, slug)
      WHERE id = $3
      RETURNING id, nome, slug, created_at
    `, [nome, slug, id]);

    if (!subject) {
      return reply.code(404).send({ error: 'subject_not_found' });
    }

    return { subject };
  });

  // Deletar matéria
  app.delete('/admin/subjects/:id', async (req, reply) => {
    const { id } = req.params as any;

    await pool.query('DELETE FROM materias WHERE id = $1', [id]);

    return { ok: true, message: `Matéria ${id} deletada` };
  });

  // Listar tópicos de uma matéria
  app.get('/admin/subjects/:id/topicos', async (req, reply) => {
    const { id } = req.params as any;

    const { rows: topicos } = await pool.query(`
      SELECT id, materia_id, nome, slug, descricao, parent_id, nivel, ordem, created_at
      FROM topicos
      WHERE materia_id = $1
      ORDER BY nivel ASC, ordem ASC, nome ASC
    `, [id]);

    return { data: topicos, total: topicos.length };
  });

  // ============================================
  // GESTÃO FINANCEIRA
  // ============================================

  // MRR (Receita Mensal Recorrente)
  app.get('/admin/finance/mrr', async () => {
    // TODO: Implementar cálculo real baseado em assinaturas
    const mrr = 2500.00;
    return { mrr };
  });

  // Custos
  app.get('/admin/finance/costs', async () => {
    // TODO: Implementar busca real de custos do banco
    const costs = [
      { service: 'OpenAI', amount: 300.00 },
      { service: 'Railway', amount: 400.00 },
      { service: 'Vercel', amount: 0.00 },
      { service: 'Outros', amount: 100.00 }
    ];
    const total = costs.reduce((sum, c) => sum + c.amount, 0);
    return { costs, total };
  });

  // Planos
  app.get('/admin/finance/plans', async () => {
    // TODO: Implementar tabela de planos no banco
    const plans = [
      { id: 1, name: 'Iniciante', price: 0, features: ['100 cards', 'Decks públicos'] },
      { id: 2, name: 'Pro', price: 19.90, features: ['Ilimitado', 'IA', 'Sem anúncios'] },
      { id: 3, name: 'Equipe', price: 49.90, features: ['Tudo do Pro', 'Colaboração', 'Suporte prioritário'] }
    ];
    return { plans };
  });

  // ============================================
  // MONITORAMENTO
  // ============================================

  // Health check
  app.get('/admin/health', async () => {
    try {
      await pool.query('SELECT 1');
      return { api: 'healthy', database: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { api: 'healthy', database: 'unhealthy', timestamp: new Date().toISOString() };
    }
  });

  // Listar jobs (BullMQ)
  app.get('/admin/queues/jobs', async () => {
    const scrapeJobs = await scrapeQueue.getJobs(['active', 'waiting', 'failed', 'completed'], 0, 50);
    const vectorJobs = await vectorQueue.getJobs(['active', 'waiting', 'failed', 'completed'], 0, 50);

    const formatJob = async (j: any) => ({
      id: j.id,
      name: j.name,
      status: await j.getState(),
      data: j.data,
      progress: j.progress,
      attemptsMade: j.attemptsMade,
      failedReason: j.failedReason,
      timestamp: j.timestamp
    });

    const jobs = [
      ...await Promise.all(scrapeJobs.map(formatJob)),
      ...await Promise.all(vectorJobs.map(formatJob))
    ];

    return { jobs, total: jobs.length };
  });

  // Reprocessar job
  app.post('/admin/jobs/:queue/:id/retry', async (req, reply) => {
    const { queue, id } = req.params as any;
    const q: Queue = queue === 'vector' ? vectorQueue : scrapeQueue;
    const job = await q.getJob(id);
    if (!job) return reply.code(404).send({ error: 'not_found' });
    await job.retry();
    return { ok: true };
  });

  // Deletar job
  app.delete('/admin/queues/jobs/:id', async (req, reply) => {
    const { id } = req.params as any;
    
    // Tentar encontrar em ambas as filas
    let job = await scrapeQueue.getJob(id);
    if (!job) job = await vectorQueue.getJob(id);
    
    if (!job) return reply.code(404).send({ error: 'job_not_found' });
    
    await job.remove();
    return { ok: true, message: `Job ${id} removido` };
  });

  // Logs de auditoria (mockado por enquanto)
  app.get('/admin/audit-logs', async () => {
    // TODO: Implementar tabela de audit_logs
    const logs = [
      { id: 1, user: 'admin@memodrops.com', action: 'user_banned', target: 'user_123', timestamp: new Date() },
      { id: 2, user: 'admin@memodrops.com', action: 'contest_created', target: 'FGV', timestamp: new Date() }
    ];
    return { logs };
  });

  // ============================================
  // ROTAS ANTIGAS (mantidas para compatibilidade)
  // ============================================

  // Reenfileirar vetorização de um conteúdo
  app.post('/admin/requeue/vector', async (req, reply) => {
    const { conteudoId } = req.body as any || {};
    if (!conteudoId) return reply.code(400).send({ error: 'missing_conteudoId' });
    await vectorQueue.add('vector:conteudo', { conteudoId }, { removeOnComplete: true, attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
    return { ok: true };
  });

  // Executar migration 003 manualmente
  app.post('/admin/migrate003', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const file = resolve(process.cwd(), 'src/db/migrations/003_add_password.sql');
    const sql = readFileSync(file, 'utf-8');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      return { success: true, message: 'Migration 003 executed' };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return { success: false, error: err.message, code: err.code, detail: err.detail };
    } finally {
      client.release();
    }
  });

  // Executar migration 002 manualmente
  app.post('/admin/migrate002', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const file = resolve(process.cwd(), 'src/db/migrations/002_app_schema.sql');
    const sql = readFileSync(file, 'utf-8');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      return { success: true, message: 'Migration 002 executed' };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return { success: false, error: err.message, code: err.code, detail: err.detail };
    } finally {
      client.release();
    }
  });

  // Listar tabelas do banco
  app.get('/admin/tables', async () => {
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    return { tables: rows.map(r => r.table_name) };
  });

  // ============================================
  // DISTRIBUIÇÃO TEMPORAL DE DROPS (SM-2)
  // ============================================

  /**

  /**
   * GET /drops/today
   * Retorna drops do dia para o usuário (revisões + novos)
   */
  app.get('/drops/today', async (request, reply) => {
    try {
      // TODO: Pegar usuario_id do token de autenticação
      // Por enquanto, usar um usuário padrão para testes
      const { rows: usuarios } = await pool.query('SELECT id FROM users LIMIT 1');
      
      if (usuarios.length === 0) {
        return reply.status(404).send({ erro: 'Nenhum usuário encontrado' });
      }
      
      const usuarioId = usuarios[0].id;
      
      // Buscar drops para revisar hoje
      const { rows: dropsRevisar } = await pool.query(`
        SELECT 
          d.*,
          ud.id as usuario_drop_id,
          ud.numero_revisoes,
          ud.status,
          ud.proxima_revisao_em,
          ud.easiness_factor,
          ud.qualidade_media,
          m.nome as materia_nome,
          t.nome as topico_nome,
          c.name as concurso_nome
        FROM usuarios_drops ud
        JOIN drops d ON d.id = ud.drop_id
        LEFT JOIN materias m ON m.id = d.materia_id
        LEFT JOIN topicos t ON t.id = d.topico_id
        LEFT JOIN concursos c ON c.id = d.concurso_id
        WHERE ud.usuario_id = $1
          AND ud.proxima_revisao_em <= NOW()
          AND ud.status != 'dominado'
        ORDER BY ud.proxima_revisao_em ASC
      `, [usuarioId]);
      
      const numRevisoes = dropsRevisar.length;
      
      // Calcular quantos drops novos introduzir
      const numNovos = calcularDropsNovos(numRevisoes, 1.0);
      
      // Buscar drops novos (ainda não atribuídos ao usuário)
      const { rows: dropsNovos } = await pool.query(`
        SELECT 
          d.*,
          m.nome as materia_nome,
          t.nome as topico_nome,
          c.name as concurso_nome
        FROM drops d
        LEFT JOIN materias m ON m.id = d.materia_id
        LEFT JOIN topicos t ON t.id = d.topico_id
        LEFT JOIN concursos c ON c.id = d.concurso_id
        WHERE d.id NOT IN (
          SELECT drop_id FROM usuarios_drops WHERE usuario_id = $1
        )
        ORDER BY d.gerado_em DESC
        LIMIT $2
      `, [usuarioId, numNovos]);
      
      // Atribuir drops novos ao usuário
      for (const drop of dropsNovos) {
        await pool.query(`
          INSERT INTO usuarios_drops (
            usuario_id, drop_id, proxima_revisao_em, status
          ) VALUES ($1, $2, NOW(), 'pendente')
          ON CONFLICT (usuario_id, drop_id) DO NOTHING
        `, [usuarioId, drop.id]);
      }
      
      // Combinar drops de revisão e novos
      const todosDrops = [
        ...dropsRevisar.map(d => ({ ...d, tipo: 'revisao' })),
        ...dropsNovos.map(d => ({ ...d, tipo: 'novo', numero_revisoes: 0, status: 'pendente' }))
      ];
      
      return {
        sucesso: true,
        drops: todosDrops,
        total: todosDrops.length,
        novos: dropsNovos.length,
        revisoes: dropsRevisar.length
      };
    } catch (error: any) {
      console.error('Erro ao buscar drops do dia:', error);
      return reply.status(500).send({ erro: error.message });
    }
  });

  /**
   * POST /drops/:id/revisar
   * Registra revisão de um drop e atualiza algoritmo SM-2
   */
  app.post('/drops/:id/revisar', async (request, reply) => {
    try {
      const { id: dropId } = request.params as { id: string };
      const { qualidade } = request.body as { qualidade: number };
      
      // Validar qualidade
      if (qualidade < 0 || qualidade > 5) {
        return reply.status(400).send({ erro: 'Qualidade deve estar entre 0 e 5' });
      }
      
      // TODO: Pegar usuario_id do token de autenticação
      const { rows: usuarios } = await pool.query('SELECT id FROM users LIMIT 1');
      if (usuarios.length === 0) {
        return reply.status(404).send({ erro: 'Nenhum usuário encontrado' });
      }
      const usuarioId = usuarios[0].id;
      
      // Buscar registro atual do usuário para este drop
      const { rows: [usuarioDrop] } = await pool.query(`
        SELECT * FROM usuarios_drops
        WHERE usuario_id = $1 AND drop_id = $2
      `, [usuarioId, dropId]);
      
      if (!usuarioDrop) {
        return reply.status(404).send({ erro: 'Drop não encontrado para este usuário' });
      }
      
      // Calcular próxima revisão usando SM-2
      // Garantir valores padrão caso sejam null
      const easinessFactor = parseFloat(usuarioDrop.easiness_factor) || 2.5;
      const intervaloAtual = parseInt(usuarioDrop.intervalo_atual_dias) || 1;
      const numRevisoes = parseInt(usuarioDrop.numero_revisoes) || 0;
      
      const resultado = calcularProximaRevisao(
        {
          easiness_factor: easinessFactor,
          intervalo_atual_dias: intervaloAtual,
          numero_revisoes: numRevisoes
        },
        qualidade
      );
      
      
      // Calcular nova qualidade média
      const novaQualidadeMedia = calcularQualidadeMedia(
        usuarioDrop.qualidade_media,
        qualidade,
        usuarioDrop.numero_revisoes
      );
      
      // Verificar se dominou
      const dominado = verificarDominado(
        resultado.easinessFactor,
        resultado.numeroRevisoes,
        novaQualidadeMedia
      );
      
      // Atualizar registro
      await pool.query(`
        UPDATE usuarios_drops SET
          primeira_revisao_em = COALESCE(primeira_revisao_em, NOW()),
          ultima_revisao_em = NOW(),
          proxima_revisao_em = $1,
          numero_revisoes = $2,
          easiness_factor = $3,
          intervalo_atual_dias = $4,
          ultima_qualidade = $5,
          qualidade_media = $6,
          status = $7,
          dominado_em = $8,
          atualizado_em = NOW()
        WHERE usuario_id = $9 AND drop_id = $10
      `, [
        resultado.proximaRevisao,
        resultado.numeroRevisoes,
        resultado.easinessFactor,
        resultado.intervalo,
        qualidade,
        novaQualidadeMedia,
        dominado ? 'dominado' : 'revisado',
        dominado ? new Date() : null,
        usuarioId,
        dropId
      ]);
      
      return {
        sucesso: true,
        proximo_intervalo_dias: resultado.intervalo,
        proxima_revisao: resultado.proximaRevisao,
        easiness_factor: resultado.easinessFactor,
        numero_revisoes: resultado.numeroRevisoes,
        qualidade_media: novaQualidadeMedia,
        dominado
      };
    } catch (error: any) {
      console.error('Erro ao revisar drop:', error);
      return reply.status(500).send({ erro: error.message });
    }
  });

  /**
   * GET /drops/estatisticas
   * Retorna estatísticas de progresso do usuário
   */
  app.get('/drops/estatisticas', async (request, reply) => {
    try {
      // TODO: Pegar usuario_id do token de autenticação
      const { rows: usuarios } = await pool.query('SELECT id FROM users LIMIT 1');
      if (usuarios.length === 0) {
        return reply.status(404).send({ erro: 'Nenhum usuário encontrado' });
      }
      const usuarioId = usuarios[0].id;
      
      // Buscar todos os drops do usuário
      const { rows: drops } = await pool.query(`
        SELECT status, qualidade_media
        FROM usuarios_drops
        WHERE usuario_id = $1
      `, [usuarioId]);
      
      // Calcular estatísticas
      const stats = calcularEstatisticas(drops);
      
      // Calcular sequência de dias (simplificado por enquanto)
      const { rows: [sequencia] } = await pool.query(`
        SELECT COUNT(DISTINCT DATE(ultima_revisao_em)) as dias_consecutivos
        FROM usuarios_drops
        WHERE usuario_id = $1
          AND ultima_revisao_em >= NOW() - INTERVAL '7 days'
      `, [usuarioId]);
      
      return {
        sucesso: true,
        total_drops: stats.total,
        pendentes: stats.pendentes,
        em_revisao: stats.emRevisao,
        dominados: stats.dominados,
        taxa_dominio: stats.taxaDominio,
        qualidade_media_geral: stats.qualidadeMediaGeral,
        sequencia_dias: sequencia?.dias_consecutivos || 0
      };
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      return reply.status(500).send({ erro: error.message });
    }
  });

  // ============================================
  // PROCESSAR HIERARQUIA DE CONCURSO
  // ============================================
  app.post('/admin/contests/:id/process-hierarquia', async (req, reply) => {
    const { id } = req.params as any;
    const { editalUrl } = req.body as any;
    
    try {
      // Importar dinamicamente para evitar problemas de dependência circular
      const { processHierarquiaForContest } = await import('../services/hierarquia-processor.js');
      
      const result = await processHierarquiaForContest(id, editalUrl);
      
      return {
        success: result.success,
        materias: result.materiasCount,
        topicos: result.topicosCount,
        subtopicos: result.subtopicosCount,
        subsubtopicos: result.subsubtopicosCount,
        error: result.error
      };
    } catch (error: any) {
      console.error('[Admin] Erro ao processar hierarquia:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // ============================================
  // VARREDURA DE EDITAIS
  // ============================================
  app.post('/admin/editais/scan-all', async (req, reply) => {
    try {
      const { scanAllEditais } = await import('../services/edital-scanner.js');
      const result = await scanAllEditais();
      return result;
    } catch (error: any) {
      console.error('[Admin] Erro ao varrer editais:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  app.post('/admin/editais/scan-banca/:bancaId', async (req, reply) => {
    const { bancaId } = req.params as any;
    
    try {
      const { scanEditalsByBanca } = await import('../services/edital-scanner.js');
      const result = await scanEditalsByBanca(parseInt(bancaId));
      return result;
    } catch (error: any) {
      console.error('[Admin] Erro ao varrer editais da banca:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // ============================================
  // BANCAS ORGANIZADORAS E SCRAPERS
  // ============================================
  // ENDPOINTS REMOVIDOS - Usar admin.bancas.ts e admin.scrapers.ts ao invés deste
  // Todas as rotas de /admin/bancas/* e /admin/scrapers/* foram movidas para
  // arquivos específicos com autenticação e autorização adequadas
}
