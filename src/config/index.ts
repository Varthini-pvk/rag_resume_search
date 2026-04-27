import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  app: {
    nodeEnv: 'development' | 'production' | 'test';
    port: number;
    logLevel: string;
  };
  mongodb: {
    uri: string;
    timeout: number;
    maxPoolSize: number;
    minPoolSize: number;
  };
  mistral: {
    apiKey: string;
    embeddingModel: string;
    timeout: number;
    maxRetries: number;
  };
  llm: {
    apiKey: string;
    baseUrl: string;
    rerankerModel: string;
    summarizerModel: string;
    timeout: number;
    maxRetries: number;
  };
  features: {
    enableReranking: boolean;
    enableSummarization: boolean;
    enableVectorSearch: boolean;
  };
  security: {
    corsOrigin: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  correlationIdHeader: string;
}

/**
 * Load and validate application configuration
 */
function loadConfig(): AppConfig {
  const requiredEnvVars = [
    'MONGODB_URI',
    'MISTRAL_API_KEY',
    'LLM_API_KEY',
  ];

  // Validate required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(
        `Missing required environment variable: ${envVar}. Please check .env file.`
      );
    }
  }

  const config: AppConfig = {
    app: {
      nodeEnv: (process.env.NODE_ENV || 'development') as
        | 'development'
        | 'production'
        | 'test',
      port: parseInt(process.env.PORT || '3000', 10),
      logLevel: process.env.LOG_LEVEL || 'info',
    },
    mongodb: {
      uri: process.env.MONGODB_URI!,
      timeout: parseInt(process.env.MONGODB_TIMEOUT || '5000', 10),
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY!,
      embeddingModel: process.env.MISTRAL_EMBEDDING_MODEL || 'mistral-embed',
      timeout: parseInt(process.env.MISTRAL_TIMEOUT || '5000', 10),
      maxRetries: parseInt(process.env.MISTRAL_MAX_RETRIES || '2', 10),
    },
    llm: {
      apiKey: process.env.LLM_API_KEY!,
      baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
      rerankerModel: process.env.LLM_RERANKER_MODEL || 'gpt-4-turbo-preview',
      summarizerModel:
        process.env.LLM_SUMMARIZER_MODEL || 'gpt-4-turbo-preview',
      timeout: parseInt(process.env.LLM_TIMEOUT || '15000', 10),
      maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '2', 10),
    },
    features: {
      enableReranking: process.env.ENABLE_RERANKING === 'true',
      enableSummarization: process.env.ENABLE_SUMMARIZATION === 'true',
      enableVectorSearch: process.env.ENABLE_VECTOR_SEARCH !== 'false',
    },
    security: {
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      rateLimitWindowMs: parseInt(
        process.env.RATE_LIMIT_WINDOW_MS || '60000',
        10
      ),
      rateLimitMaxRequests: parseInt(
        process.env.RATE_LIMIT_MAX_REQUESTS || '100',
        10
      ),
    },
    correlationIdHeader:
      process.env.CORRELATION_ID_HEADER || 'x-correlation-id',
  };

  return config;
}

// Load config on module import
const config = loadConfig();

export default config;
