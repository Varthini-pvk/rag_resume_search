---
name: "resume-search-rag"
description: "Core instructions for the RAG Resume Search monolith project. Use when: writing services, controllers, or debugging the pipeline."
---

# Resume Search RAG Project Guidelines

## 📋 Project Overview
Enterprise-grade Node.js + Express modular monolith for RAG-based Resume Search with:
- **Modules**: health, db, embeddings, search (bm25, vector, hybrid), llm (reranker, summarizer), pipeline
- **DB**: MongoDB with text & vector indexes
- **API Version**: /api/v1/
- **Language**: TypeScript (strict mode)
- **Quality Targets**: 80%+ test coverage, <2s latency per search

## 🏗️ Module Structure
Each service module MUST follow this structure:
```
src/modules/{moduleName}/
  ├── controller/           # HTTP handlers & request validation
  ├── service/              # Business logic & orchestration
  ├── interface/            # TypeScript interfaces & types
  ├── route/                # Express route definitions
  ├── dto/                  # Data transfer objects (request/response)
  ├── types/                # Type definitions
  ├── {module}.module.ts    # Module exports & DI setup
  └── index.ts              # Public API
```

## 📌 Enterprise Code Standards

### TypeScript Strict Mode (MANDATORY)
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitThis": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### Dependency Injection Pattern
```typescript
// 1. Define interface first (in interface/ folder)
export interface ISearchService {
  search(query: string, topK: number): Promise<SearchResult[]>;
}

// 2. Service implements interface
export class BM25Service implements ISearchService {
  constructor(
    private readonly logger: ILogger,
    private readonly db: IDatabase,
  ) {}
}

// 3. Controller depends on interface, not implementation
export class SearchController {
  constructor(private readonly searchService: ISearchService) {}
}

// 4. Factory or DI container wires dependencies
const container = new DIContainer();
container.register<ISearchService>('ISearchService', BM25Service);
```

### Module Boundaries - STRICTLY NO Direct Cross-Module Imports
```typescript
// ❌ FORBIDDEN
import { BM25Service } from '../search/service/bm25.service';
import bm25 from '../search';

// ✅ CORRECT - Import only types/interfaces
import type { ISearchService } from '../search/interface';
import { searchService } from '../shared/container';
```

### Error Handling - Enterprise Standard
```typescript
// Always use typed error responses
export interface ErrorResponse {
  error: string;
  code: string;        // e.g., "EMBEDDING_FAILED", "DB_UNAVAILABLE"
  requestId: string;   // Correlation ID
  timestamp: string;   // ISO 8601
  details?: Record<string, any>;
}

// HTTP Status Codes
400 Bad Request       - Invalid input/malformed request
401 Unauthorized      - Authentication failed
403 Forbidden         - Insufficient permissions
404 Not Found         - Resource not found
409 Conflict          - State conflict
429 Too Many Requests - Rate limited
500 Internal Error    - Unrecoverable server error
503 Unavailable       - External service down
```

### Structured Logging (Pino + Correlation IDs)
```typescript
// Every external call must be logged
logger.info({
  action: "embedding_generated",
  module: "embeddings",
  duration: 1250,
  requestId: correlationId,
  userId: userId,  // if applicable
  textLength: query.length,
  success: true,
});

// Errors with full context
logger.error({
  action: "embedding_failed",
  module: "embeddings",
  error: err.message,
  code: "EMBEDDING_API_ERROR",
  requestId: correlationId,
  statusCode: err.statusCode,
  retryCount: 0,
});
```

### Input Validation (DTO + Joi/Zod)
```typescript
// Define DTO for each endpoint
export interface SearchRequestDto {
  query: string;      // Required, 1-1000 chars
  topK?: number;      // Optional, 1-100, default: 10
  filters?: {
    skills?: string[];
    minExperience?: number;
    maxExperience?: number;
  };
}

// Validate before business logic
const schema = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  topK: Joi.number().min(1).max(100).default(10),
});
```

## 🔍 Search Implementation Guidelines

### BM25 (Full-Text Search)
**When to use**: Keyword search, skill matching, title search
- Uses MongoDB text index on `fullText`, `skills`, `title`
- Weights: `skills: 3, title: 2, fullText: 1`
- Returns results with `textScore` property
- Response time target: <500ms

### Vector Search (Semantic Similarity)
**When to use**: Job description matching, conceptual search, intent-based matching
- Uses MongoDB Atlas vector search on `embedding` field
- Cosine similarity scoring
- Query embedding generated via Mistral API (`mistral-embed`)
- Dimensions: 1024 (default)
- Response time target: <1000ms

### Hybrid Search (Balanced Approach)
**When to use**: Production general search across all resume types
```typescript
// Parallel execution (critical for performance)
const [bm25Results, vectorResults] = await Promise.all([
  bm25Service.search(query, topK * 2),
  vectorService.search(embedding, topK * 2),
]);

// Normalize scores to [0, 1] range
const normalizedBm25 = normalizeBm25Scores(bm25Results);
const normalizedVector = normalizeVectorScores(vectorResults);

// Merge with configurable weights
const finalScore = (normalizedBm25 * 0.4) + (normalizedVector * 0.6);

// Deduplicate by resume._id and take top K
const merged = deduplicateAndMerge(finalScore);
const topK = merged.slice(0, k);
```

### Pipeline Flow (Orchestration)
```
1. Input Validation & Sanitization
2. Generate Query Embedding (Mistral API)
   └─ Timeout: 5s, Retry: 2x
3. BM25 + Vector Search in PARALLEL
   └─ Timeout: 10s each, Retry: 1x
4. Merge Results with Weighted Scoring
   └─ Deduplication + normalization
5. Re-rank with LLM (Top 50 only)
   └─ Timeout: 15s, Retry: 1x
6. Summarize Insights from Top 10
   └─ Timeout: 10s, Retry: 1x
7. Return Results + Summary
```

## 📦 Service Interfaces (MANDATORY - Define Before Implementation)

```typescript
// embeddings.interface.ts
export interface IEmbeddingService {
  generateEmbedding(text: string, model?: string): Promise<number[]>;
  batchGenerateEmbeddings(texts: string[], model?: string): Promise<number[][]>;
}

// search.interface.ts
export interface IBM25Service {
  search(query: string, topK: number): Promise<SearchResult[]>;
}

export interface IVectorService {
  search(embedding: number[], topK: number): Promise<SearchResult[]>;
}

export interface IHybridService {
  search(query: string, embedding: number[], topK: number): Promise<Resume[]>;
}

// llm.interface.ts
export interface IRerankerService {
  rerank(query: string, results: Resume[]): Promise<Resume[]>;
}

export interface ISummarizerService {
  summarize(results: Resume[]): Promise<string>;
}

// pipeline.interface.ts
export interface IPipelineService {
  search(query: string, topK?: number): Promise<PipelineResponse>;
}
```

## 🚀 Common Patterns & Data Structures

### Resume Document (MongoDB Schema)
```typescript
export interface Resume {
  _id: ObjectId;
  text: string;
  embedding: number[];
  name: string;
  email: string;
  phone: string;
  location: string;
  company: string;
  role: string;
  education: string;
  total_Experience: number;
  relevant_Experience: number;
  skills: string[];
  fullText: string;  // Denormalized for BM25 index
  searchType?: 'bm25' | 'vector' | 'hybrid';
  textScore?: number;
  vectorScore?: number;
  finalScore?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Request/Response Templates

**Pipeline Search Request**
```json
{
  "query": "Java developer with 5 years experience",
  "topK": 10,
  "filters": {
    "skills": ["Java", "Spring Boot"],
    "minExperience": 3,
    "maxExperience": 10,
    "location": "Remote"
  }
}
```

**Pipeline Search Response**
```json
{
  "results": [
    {
      "_id": "ObjectId",
      "name": "John Doe",
      "role": "Senior Java Developer",
      "company": "Tech Corp",
      "skills": ["Java", "Spring Boot", "SQL"],
      "finalScore": 0.92,
      "matchedPhrases": ["Java developer", "5 years experience"]
    }
  ],
  "summary": "Found 10 qualified candidates. Top 3 have 5+ years Java/Spring Boot experience.",
  "totalCount": 125,
  "requestId": "req-1234-abcd",
  "executionTime": 1250
}
```

**Error Response**
```json
{
  "error": "Failed to generate embedding",
  "code": "EMBEDDING_API_ERROR",
  "requestId": "req-1234-abcd",
  "timestamp": "2026-04-17T10:30:00Z",
  "details": {
    "service": "mistral",
    "statusCode": 429,
    "message": "Rate limit exceeded"
  }
}
```

## 🔧 Enterprise Configuration Management

**Environment Variables (use .env with validation)**
```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/resumes
MONGODB_TIMEOUT=5000

# Mistral Embeddings
MISTRAL_API_KEY=***
MISTRAL_EMBEDDING_MODEL=mistral-embed
MISTRAL_TIMEOUT=5000

# LLM Services (Reranker & Summarizer)
LLM_API_KEY=***
LLM_RERANKER_MODEL=gpt-4
LLM_SUMMARIZER_MODEL=gpt-4
LLM_TIMEOUT=15000

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
CORRELATION_ID_HEADER=x-correlation-id

# Feature Flags
ENABLE_RERANKING=true
ENABLE_SUMMARIZATION=true
```

**Config validation on startup**
```typescript
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    timeout: parseInt(process.env.MONGODB_TIMEOUT || '5000'),
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    model: process.env.MISTRAL_EMBEDDING_MODEL || 'mistral-embed',
  },
  // ... validate all required fields
};

// Fail fast if critical config missing
if (!config.mongodb.uri) throw new Error('MONGODB_URI not set');
```

## 🧪 Testing Standards

**Unit Test Coverage Targets**
- Services: 80%+ line coverage
- Controllers: 75%+ 
- Utilities: 90%+

**Test File Organization**
```
src/modules/{module}/
  ├── service/{name}.service.test.ts
  ├── controller/{name}.controller.test.ts
  └── {name}.integration.test.ts
```

**Mock External Dependencies**
```typescript
// jest.setup.ts
jest.mock('../services/mistral');
jest.mock('../services/llm');
jest.mock('mongodb', () => ({ MongoClient: mockClient }));

// In tests
beforeEach(() => {
  jest.clearAllMocks();
  (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue([...]);
});
```

## 📊 Performance Targets

| Operation | Target Latency | SLA |
|-----------|-----------------|-----|
| Embedding generation | <1s | 99% |
| BM25 search | <500ms | 99.9% |
| Vector search | <1s | 99.9% |
| Hybrid search | <2s | 99% |
| Re-ranking (top 50) | <3s | 95% |
| Summarization | <2s | 95% |
| **Full pipeline** | **<8s** | **95%** |

## 🔐 Security Checklist

- ✅ Input validation on all endpoints (no SQL injection, XSS)
- ✅ Rate limiting: 100 req/min per IP
- ✅ CORS configured (whitelist allowed origins)
- ✅ API keys in env vars, never in code
- ✅ Request body size limit: 10KB
- ✅ Correlation IDs for audit trails
- ✅ Hash sensitive data (emails) if exposed in logs
- ✅ HTTPS enforced in production
- ✅ Error messages don't leak stack traces

## 🚀 Deployment Checklist

Before production deployment:
- ✅ All tests passing (>80% coverage)
- ✅ Environment variables configured
- ✅ MongoDB indexes created (`text`, `vector`)
- ✅ API load tested (>100 req/s)
- ✅ Error monitoring configured (Sentry, DataDog)
- ✅ Logging aggregation setup (ELK, Splunk)
- ✅ Health check endpoint responding
- ✅ Graceful shutdown handlers in place
