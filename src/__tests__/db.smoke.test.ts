import { AppConfig } from '../config';
import { DBService } from '../modules/db/service/db.service';
import { getLogger } from '../modules/shared/logger';

const mongoUri = process.env.MONGODB_URI;
const runSmokeTest = Boolean(mongoUri);

function createSmokeConfig(uri: string): AppConfig {
  return {
    app: {
      nodeEnv: 'test',
      port: 3001,
      logLevel: 'silent',
    },
    mongodb: {
      uri,
      timeout: 5000,
      maxPoolSize: 5,
      minPoolSize: 1,
    },
    mistral: {
      apiKey: 'not-required-for-db-smoke-test',
      embeddingModel: 'mistral-embed',
      timeout: 5000,
      maxRetries: 1,
    },
    llm: {
      apiKey: 'not-required-for-db-smoke-test',
      baseUrl: 'https://api.openai.com/v1',
      rerankerModel: 'gpt-4-turbo-preview',
      summarizerModel: 'gpt-4-turbo-preview',
      timeout: 5000,
      maxRetries: 1,
    },
    features: {
      enableReranking: false,
      enableSummarization: false,
      enableVectorSearch: false,
    },
    security: {
      corsOrigin: '*',
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
    },
    correlationIdHeader: 'x-correlation-id',
  };
}

const maybeDescribe = runSmokeTest ? describe : describe.skip;

maybeDescribe('MongoDB smoke test (requires MONGODB_URI)', () => {
  it('connects and responds healthy to ping', async () => {
    const service = new DBService(
      createSmokeConfig(mongoUri as string),
      getLogger({ level: 'silent', name: 'db-smoke-test' })
    );

    await service.connect();
    const health = await service.checkHealth();
    await service.disconnect();

    expect(health.status).toBe('healthy');
  }, 15000);
});
