import { Router } from 'express';
import request from 'supertest';

import { createApp } from '../app';
import { AppConfig } from '../config';
import { DBModule } from '../modules/db';
import { DbHealthStatus, IDBService } from '../modules/db/interface/db.interface';

jest.mock('pino-http', () => {
  return () => (_req: unknown, _res: unknown, next: () => void) => next();
});

function createTestConfig(): AppConfig {
  return {
    app: {
      nodeEnv: 'test',
      port: 3001,
      logLevel: 'silent',
    },
    mongodb: {
      uri: 'mongodb://localhost:27017/resume-search-rag-test',
      timeout: 5000,
      maxPoolSize: 5,
      minPoolSize: 1,
    },
    mistral: {
      apiKey: 'test-key',
      embeddingModel: 'mistral-embed',
      timeout: 5000,
      maxRetries: 1,
    },
    llm: {
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      rerankerModel: 'gpt-4-turbo-preview',
      summarizerModel: 'gpt-4-turbo-preview',
      timeout: 5000,
      maxRetries: 1,
    },
    features: {
      enableReranking: true,
      enableSummarization: true,
      enableVectorSearch: true,
    },
    security: {
      corsOrigin: '*',
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
    },
    correlationIdHeader: 'x-correlation-id',
  };
}

function createDbModuleMock(dbStatus: DbHealthStatus): DBModule {
  const dbService: IDBService = {
    connect: async () => {},
    disconnect: async () => {},
    checkHealth: async () => dbStatus,
    isConnected: () => dbStatus.status === 'healthy',
    getDb: () => {
      throw new Error('Not required for these tests');
    },
  };

  const router = Router();
  router.get('/check', (_req, res) => {
    const statusCode = dbStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(dbStatus);
  });

  const dbModuleMock = {
    getService: () => dbService,
    createRoutes: () => router,
  };

  return dbModuleMock as DBModule;
}

describe('Phase 2 DB and health endpoints', () => {
  it('returns 200 for /api/v1/db/check when DB is healthy', async () => {
    const app = createApp(
      createTestConfig(),
      createDbModuleMock({ status: 'healthy', latency: 4 })
    );

    const response = await request(app).get('/api/v1/db/check');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.latency).toBeDefined();
  });

  it('returns 503 for /api/v1/db/check when DB is unhealthy', async () => {
    const app = createApp(
      createTestConfig(),
      createDbModuleMock({ status: 'unhealthy', error: 'Ping failed' })
    );

    const response = await request(app).get('/api/v1/db/check');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.error).toBe('Ping failed');
  });

  it('includes mongodb component in /health response', async () => {
    const app = createApp(
      createTestConfig(),
      createDbModuleMock({ status: 'healthy', latency: 3 })
    );

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.components).toBeDefined();
    expect(response.body.components.app.status).toBe('healthy');
    expect(response.body.components.mongodb.status).toBe('healthy');
  });
});
