import type { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';
import { scrapeQueue, vectorQueue } from '../jobs/queues.js';
import { pool } from '../db/connection.js';

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
      content: { contests: 0, subjects: 0, public_decks: 0, public_cards: 0 },
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

    try {
      const { rows: [publicDecks] } = await pool.query('SELECT COUNT(*)::int AS public_decks FROM decks WHERE is_public = true');
      stats.content.public_decks = publicDecks?.public_decks || 0;

      const { rows: [publicCards] } = await pool.query(`
        SELECT COUNT(*)::int AS public_cards 
        FROM cards c 
        JOIN decks d ON c.deck_id = d.id 
        WHERE d.is_public = true
      `);
      stats.content.public_cards = publicCards?.public_cards || 0;
    } catch (e) {
      // Tabelas decks/cards não existem
    }

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

    return { data: { ...contest, materias } };
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
    const { rows: subjects } = await pool.query(`
      SELECT id, name, slug, created_at
      FROM materias
      ORDER BY name ASC
    `);

    return { subjects };
  });

  // Criar matéria
  app.post('/admin/subjects', async (req, reply) => {
    const { nome, slug } = req.body as any;

    if (!nome || !slug) {
      return reply.code(400).send({ error: 'missing_fields' });
    }

    const { rows: [subject] } = await pool.query(`
      INSERT INTO materias (nome, slug, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id, nome, slug, created_at
    `, [nome, slug]);

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
  // BANCAS ORGANIZADORAS E SCRAPERS
  // ============================================
  // ENDPOINTS REMOVIDOS - Usar admin.bancas.ts e admin.scrapers.ts ao invés deste
  // Todas as rotas de /admin/bancas/* e /admin/scrapers/* foram movidas para
  // arquivos específicos com autenticação e autorização adequadas
}
