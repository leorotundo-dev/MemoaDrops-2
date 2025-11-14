import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Rota para executar migrations automaticamente
 * ATENÇÃO: Esta rota deve ser protegida em produção!
 */
const adminRunMigrationsRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Executar todas as migrations pendentes
  fastify.post('/admin/run-migrations', async (request, reply) => {
    const { migrations, force } = request.body as { 
      migrations?: string[], 
      force?: boolean 
    };

    // Criar tabela de controle de migrations se não existir
    await db.raw(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '../db/migrations');
    
    // Listar todas as migrations disponíveis
    const allMigrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Filtrar migrations específicas se fornecidas
    const migrationsToRun = migrations && migrations.length > 0
      ? allMigrations.filter(m => migrations.includes(m))
      : allMigrations;

    const resultados = {
      executadas: 0,
      puladas: 0,
      erros: 0,
      detalhes: [] as any[]
    };

    for (const migrationFile of migrationsToRun) {
      try {
        // Verificar se já foi executada
        const executed = await db('schema_migrations')
          .where('migration', migrationFile)
          .first();

        if (executed && !force) {
          resultados.puladas++;
          resultados.detalhes.push({
            migration: migrationFile,
            status: 'pulada',
            motivo: 'já executada'
          });
          continue;
        }

        // Ler arquivo SQL
        const migrationPath = path.join(migrationsDir, migrationFile);
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        // Executar migration
        await db.raw(sql);

        // Registrar execução
        if (executed) {
          // Se force=true, atualizar timestamp
          await db('schema_migrations')
            .where('migration', migrationFile)
            .update({ executed_at: db.fn.now() });
        } else {
          // Inserir novo registro
          await db('schema_migrations').insert({
            migration: migrationFile,
            executed_at: db.fn.now()
          });
        }

        resultados.executadas++;
        resultados.detalhes.push({
          migration: migrationFile,
          status: 'executada',
          force: force || false
        });

      } catch (error: any) {
        resultados.erros++;
        resultados.detalhes.push({
          migration: migrationFile,
          status: 'erro',
          erro: error.message
        });
      }
    }

    return {
      ...resultados,
      total_disponivel: allMigrations.length,
      total_solicitado: migrationsToRun.length
    };
  });

  // Listar migrations executadas
  fastify.get('/admin/migrations/status', async (request, reply) => {
    // Criar tabela se não existir
    await db.raw(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '../db/migrations');
    const allMigrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const executed = await db('schema_migrations')
      .select('migration', 'executed_at')
      .orderBy('migration', 'asc');

    const executedSet = new Set(executed.map(m => m.migration));

    const status = allMigrations.map(migration => {
      const exec = executed.find(e => e.migration === migration);
      return {
        migration,
        executada: executedSet.has(migration),
        executed_at: exec?.executed_at || null
      };
    });

    return {
      total: allMigrations.length,
      executadas: executed.length,
      pendentes: allMigrations.length - executed.length,
      migrations: status
    };
  });

  // Executar migrations específicas (031-039 para FGV)
  fastify.post('/admin/migrations/run-fgv', async (request, reply) => {
    const fgvMigrations = [
      '031_add_fgv_fields_to_concursos.sql',
      '032_create_arquivos_concurso.sql',
      '033_create_questoes.sql',
      '034_create_alternativas.sql',
      '035_create_topicos.sql',
      '036_create_questoes_materias.sql',
      '037_create_gabaritos.sql',
      '038_add_questao_id_to_cards.sql',
      '039_insert_banca_fgv.sql'
    ];

    // Redirecionar para rota principal
    return fastify.inject({
      method: 'POST',
      url: '/admin/run-migrations',
      payload: {
        migrations: fgvMigrations,
        force: false
      }
    }).then(response => JSON.parse(response.body));
  });

  // Rollback de uma migration específica (cuidado!)
  fastify.post('/admin/migrations/rollback/:migration', async (request, reply) => {
    const { migration } = request.params as { migration: string };
    const { confirm } = request.body as { confirm?: boolean };

    if (!confirm) {
      return reply.status(400).send({ 
        error: 'Confirmação necessária. Envie { "confirm": true } no body.' 
      });
    }

    // Remover registro da migration
    const deleted = await db('schema_migrations')
      .where('migration', migration)
      .delete();

    if (deleted === 0) {
      return reply.status(404).send({ 
        error: 'Migration não encontrada no registro' 
      });
    }

    return {
      success: true,
      migration,
      message: 'Migration removida do registro. Execute novamente para reaplicar.'
    };
  });
};

export default adminRunMigrationsRoutes;
