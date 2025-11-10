# Correções para Rotas 404 (/metrics, /env, /docs)

## Problema Identificado

As rotas `/metrics`, `/env` e `/docs` estão retornando 404 em produção, apesar de estarem registradas corretamente no código.

## Causas Raízes Identificadas:

1. **Helmet CSP desabilitado completamente** - Pode estar bloqueando assets do Swagger UI
2. **Uso de `fastify-plugin` sem configuração adequada** - Pode estar causando problemas de escopo
3. **Falta de configuração específica para Fastify 5.x**

## Correções Necessárias:

### 1. Corrigir `src/plugins/security.ts`

**Problema:** `contentSecurityPolicy: false` desabilita completamente o CSP, o que pode bloquear assets do Swagger.

**Correção:**
```typescript
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

export default fp(async (app) => {
  await app.register(cors, { origin: true, credentials: true });
  
  // Configurar CSP para permitir Swagger UI
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });
  
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip
  });
});
```

### 2. Simplificar `src/routes/health.ts`

**Problema:** Uso de `fastify-plugin` pode estar causando problemas de escopo.

**Correção:** Remover `fastify-plugin` e usar função simples:
```typescript
import type { FastifyInstance } from 'fastify';
import os from 'node:os';
import process from 'node:process';
import * as client from 'prom-client';

const registry = new client.Registry();
registry.setDefaultLabels({ app: 'memodrops' });
client.collectDefaultMetrics({ register: registry });

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/metrics', async (_req, reply) => {
    const metrics = await registry.metrics();
    reply.type(registry.contentType).send(metrics);
  });

  app.get('/env', async () => ({
    node: process.version,
    platform: os.platform(),
    mem: process.memoryUsage().rss
  }));
}
```

### 3. Simplificar `src/routes/docs.ts`

**Problema:** Uso de `fastify-plugin` e configuração inadequada do Swagger.

**Correção:** Remover `fastify-plugin` e configurar corretamente:
```typescript
import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function docsRoutes(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MemoDrops API',
        version: '2.0.0',
        description: 'API para o sistema de flashcards MemoDrops'
      },
      servers: [
        {
          url: 'https://api-production-5ffc.up.railway.app',
          description: 'Production server'
        }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
}
```

### 4. Atualizar `src/server.ts`

**Problema:** Falta de chamada explícita para `app.swagger()` após `app.ready()`.

**Correção:** Já está correto, mas garantir que está assim:
```typescript
// Garanta que tudo foi carregado antes de expor o Swagger
await app.ready();

// Se o decorator swagger existir (registrado por docsRoutes), constrói o JSON
if (typeof (app as any).swagger === 'function') {
  (app as any).swagger();
}

const port = Number(process.env.PORT || 3001);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log('[API] Listening on', port);
});
```

## Aplicação das Correções

Execute os seguintes comandos:

```bash
# 1. Aplicar as correções nos arquivos
# (Editar manualmente ou usar os comandos abaixo)

# 2. Compilar
npm run build

# 3. Commit e push
git add -A
git commit -m "fix: resolve 404 for /metrics, /env and /docs routes"
git push origin main
```

## Validação

Após o deploy, testar:

```bash
curl https://api-production-5ffc.up.railway.app/health
curl https://api-production-5ffc.up.railway.app/metrics
curl https://api-production-5ffc.up.railway.app/env
curl https://api-production-5ffc.up.railway.app/docs
```

Todos devem retornar 200 OK.
