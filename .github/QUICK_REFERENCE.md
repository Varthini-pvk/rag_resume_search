# Quick Reference Guide

Enterprise-grade patterns for Resume Search RAG project. Copy-paste ready!

---

## 🏗️ Module Scaffolding

### Create Interface (First!)
```typescript
// src/modules/{name}/interface/{name}.interface.ts
export interface I{Name}Service {
  /**
   * Main method description
   * @param input - Validated request  
   * @returns Result with data
   * @throws ServiceError if fails
   */
  methodName(input: InputDto): Promise<OutputDto>;
}
```

### Create Service
```typescript
// src/modules/{name}/service/{name}.service.ts
export class {Name}Service implements I{Name}Service {
  constructor(
    private readonly logger: ILogger,
    private readonly db: IDatabase,
  ) {}

  async methodName(input: InputDto): Promise<OutputDto> {
    const startTime = Date.now();
    try {
      this.validateInput(input);
      const result = await this.db.operation(input);
      
      this.logger.info({
        action: 'method_completed',
        module: '{name}',
        duration: Date.now() - startTime,
      });
      
      return result;
    } catch (error) {
      this.logger.error({
        action: 'method_failed',
        error: error.message,
        code: 'METHOD_ERROR',
      });
      throw new ServiceError('Failed', 'METHOD_ERROR');
    }
  }

  private validateInput(input: InputDto): void {
    if (!input.field) throw new ValidationError('Field required');
  }
}
```

### Create Controller
```typescript
// src/modules/{name}/controller/{name}.controller.ts
export class {Name}Controller {
  constructor(private readonly service: I{Name}Service) {}

  async handleRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as InputDto;
      const result = await this.service.methodName(dto);
      
      return res.status(200).json({
        result,
        requestId: req.correlationId,
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Create Route
```typescript
// src/modules/{name}/route/{name}.route.ts
const router = express.Router();

router.post('/endpoint', (req, res, next) => 
  controller.handleRequest(req, res, next)
);

export default router;
```

### Module Entry
```typescript
// src/modules/{name}/index.ts
export { I{Name}Service } from './interface';
export { {Name}Service } from './service';
export { {Name}Controller } from './controller';
export { default as {name}Routes } from './route';
export {{ Name}Module } from './{name}.module';
```

---

## 🔍 Search Patterns

### BM25 Query
```typescript
const results = await db.collection('resumes')
  .find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(topK)
  .toArray();
```

### Vector Search Query
```typescript
const results = await db.collection('resumes')
  .aggregate([
    {
      $search: {
        cosmosSearch: {
          vector: queryEmbedding,
          k: 50
        },
        returnStoredSource: true
      }
    },
    {
      $project: {
        similarityScore: { $meta: 'searchScore' },
        document: '$$ROOT'
      }
    }
  ])
  .toArray();
```

### Hybrid Merge
```typescript
// Run both in parallel
const [bm25Results, vectorResults] = await Promise.all([
  bm25Service.search(query, topK * 2),
  vectorService.search(embedding, topK * 2),
]);

// Normalize scores
const norm = (scores) => {
  const max = Math.max(...scores);
  return scores.map(s => s / max);
};

// Merge by ID
const merged = new Map();
bm25Results.forEach(r => {
  merged.set(r._id, { ...r, bm25: 1, vector: 0 });
});
vectorResults.forEach(r => {
  const existing = merged.get(r._id);
  if (existing) existing.vector = 1;
  else merged.set(r._id, { ...r, bm25: 0, vector: 1 });
});

// Calculate final score
const final = Array.from(merged.values())
  .map(r => ({
    ...r,
    score: (r.bm25 * 0.4) + (r.vector * 0.6)
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, topK)
  .map(r => r.resume);
```

---

## 📊 Error Handling

### Standard Error Response
```typescript
export interface ErrorResponse {
  error: string;
  code: string;
  requestId: string;
  timestamp: string;
}

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}
```

### Error in Service
```typescript
try {
  // logic
} catch (error) {
  logger.error({
    action: 'failed',
    code: 'SPECIFIC_CODE',
    error: error.message,
    requestId,
  });
  throw new ServiceError('SPECIFIC_CODE', 'User message', 500);
}
```

### Error in Controller
```typescript
try {
  const result = await service.method();
  res.json(result);
} catch (error) {
  next(error);  // Pass to middleware
}

// In middleware
app.use((err: Error, req: Request, res: Response) => {
  const code = err instanceof ServiceError 
    ? err.code 
    : 'INTERNAL_ERROR';
  const status = err instanceof ServiceError 
    ? err.statusCode 
    : 500;
  
  res.status(status).json({
    error: err.message,
    code,
    requestId: req.correlationId,
    timestamp: new Date().toISOString(),
  });
});
```

---

## 🧪 Testing Pattern

### Service Test
```typescript
describe('MyService', () => {
  let service: MyService;
  let mockDb: jest.Mocked<IDatabase>;

  beforeEach(() => {
    mockDb = { find: jest.fn() } as any;
    service = new MyService(mockDb);
  });

  it('should return results for valid input', async () => {
    mockDb.find.mockResolvedValue([{ id: 1, name: 'Test' }]);
    
    const result = await service.search('test', 10);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test');
  });

  it('should throw on error', async () => {
    mockDb.find.mockRejectedValue(new Error('DB Error'));
    
    await expect(service.search('test', 10))
      .rejects.toThrow('Search failed');
  });
});
```

---

## 📝 Logging Pattern

### Log Levels
```typescript
// DEBUG: Low-level tracing
logger.debug({ action: 'start', phase: 'init' });

// INFO: Successful operations  
logger.info({
  action: 'search_completed',
  duration: 1250,
  resultCount: 10,
});

// WARN: Expected errors
logger.warn({
  action: 'rate_limit_approaching',
  remaining: 5,
});

// ERROR: Unexpected failures
logger.error({
  action: 'embedding_failed',
  code: 'MISTRAL_ERROR',
  statusCode: 429,
});
```

### Correlation ID
```typescript
// Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.correlationId = req.headers['x-correlation-id'] as string
    || `${Date.now()}-${Math.random()}`;
  next();
});

// Pass through services
async search(query: string, correlationId: string) {
  this.logger.info({
    action: 'search_start',
    requestId: correlationId,
  });
}
```

---

## ✅ Pre-Deployment Checklist

- [ ] All tests passing (`npm run test`)
- [ ] Coverage >= 80% (`npm run test -- --coverage`)
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] ESLint clean (`npm run lint`)
- [ ] Environment variables set in `.env`
- [ ] MongoDB indexes created
- [ ] Vector search index created (if using)
- [ ] API keys validated (Mistral, LLM)
- [ ] Health endpoint responding
- [ ] Performance tested (p95 < 2s for search)
- [ ] Load tested (100+ req/s)
- [ ] Security review done
- [ ] Logging aggregation configured

---

## 🎯 Common Decisions

### Should I use BM25 or Vector search?

**BM25 if**: Exact keywords, skill matching, title search

**Vector if**: Intent matching, paraphrasing, semantic search

**Hybrid if**: Production, unknown query type, best relevance

### What weight for hybrid merge?

```
Keyword-heavy queries → (bm25: 0.6, vector: 0.4)
Balanced queries      → (bm25: 0.4, vector: 0.6)
Semantic queries      → (bm25: 0.2, vector: 0.8)
```

### Should I re-rank with LLM?

**YES if**: 
- Top-50 results have close scores
- Precision > speed
- Budget allows 3s+ latency

**NO if**:
- <30 results
- Latency critical (<2s)
- Simple keyword query

### IndexesCreated?

```bash
# Check BM25 index
db.resumes.getIndexes() | grep text

# Check Vector index
db.resumes.getIndexes() | grep vector
```

---

## 🔗 TypeScript Tips

### No Implicit Any ❌
```typescript
// Bad
function search(query) { }

// Good
function search(query: string): Promise<Resume[]> { }
```

### Interface Before Implementation ❌
```typescript
// Bad
export class MyService { }

// Good  
export interface IMyService { }
export class MyService implements IMyService { }
```

### Dependency Injection ❌
```typescript
// Bad
const logger = new Logger();

// Good
constructor(private readonly logger: ILogger) { }
```

### Error Typing ❌
```typescript
// Bad
throw new Error('oops');

// Good
throw new ServiceError('SPECIFIC_CODE', 'oops', 500);
```

---

## 📈 Performance Tips

### Optimize BM25
- ✅ Set proper index weights (skills: 3, title: 2, fullText: 1)
- ✅ Use query expansion for synonyms
- ✅ Limit results with `.limit(100)`
- ❌ Don't filter after text search, use aggregation

### Optimize Vector
- ✅ Fetch k=100 candidates, filter by threshold 0.6
- ✅ Cache embeddings in MongoDB
- ✅ Batch embed multiple documents
- ❌ Don't embed every query in real-time

### Optimize Hybrid
- ✅ Run BM25 + Vector in `Promise.all()`
- ✅ Merge before LLM (reduce input size)
- ✅ Skip LLM for simple queries
- ❌ Don't do sequential searches

### Monitor
```typescript
logger.info({
  action: 'pipeline_trace',
  phases: {
    embedding: 1200,
    bm25: 450,
    vector: 850,
    merge: 180,
    rerank: 2100,
    summarize: 900,
  },
  total: 5680,
});
```

---

## 🆘 Quick Troubleshooting

| Issue | Check |
|-------|-------|
| Empty results | Index exists? Data populated? |
| Slow BM25 | Index scan or full table scan? |
| Slow vector | K too high? Index on vector field? |
| Wrong ranking | Weights tuned? Scores normalized? |
| API timeout | External service healthy? |
| Memory leak | Proper Promise cleanup? |
| Test failures | Mocks set correctly? Async awaited? |

---

**Print this sheet or pin in Copilot!** Use alongside the full prompts.
