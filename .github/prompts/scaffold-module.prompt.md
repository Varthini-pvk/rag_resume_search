---
name: "scaffold-module"
description: "Use when: Creating a new service module (search, embeddings, llm, etc). Generates controller, service, interface, and route files with proper DI structure and enterprise standards."
---

# Scaffold New Service Module

## Purpose
Generate a complete, enterprise-grade service module with:
- Type-safe TypeScript interfaces
- Dependency injection pattern
- Input validation (DTO)
- Structured logging
- Error handling
- Unit test skeleton

## Module Structure Generated
```
src/modules/{moduleName}/
  ├── interface/
  │   ├── {module}.interface.ts
  │   └── {module}.types.ts
  ├── dto/
  │   ├── {module}.request.dto.ts
  │   └── {module}.response.dto.ts
  ├── service/
  │   ├── {module}.service.ts
  │   └── {module}.service.test.ts
  ├── controller/
  │   ├── {module}.controller.ts
  │   └── {module}.controller.test.ts
  ├── route/
  │   └── {module}.route.ts
  ├── {module}.module.ts           # DI setup
  ├── index.ts                     # Public exports
  └── README.md
```

## Input Parameters

### Required
- **Module Name**: `search`, `embeddings`, `llm`, `pipeline`, etc.
- **Service Responsibilities**: List main methods (e.g., "search by query", "generate embedding")

### Optional
- **Dependencies**: What other services? (e.g., `IDatabase`, `ILogger`, `IEmbeddingService`)
- **HTTP Methods**: GET, POST, PUT, DELETE to expose
- **Database Operations**: CRUD, read-only, batch operations

## Generation Guidelines

### 1. Interface First (Type-Driven Development)
```typescript
// ✅ DO: Define interface with JSDoc
export interface IMyService {
  /**
   * Performs operation X
   * @param input - Validated request
   * @returns Result with score
   * @throws ServiceError if preconditions fail
   */
  searchRecords(input: SearchRequestDto): Promise<SearchResult[]>;
}
```

### 2. DTO for Request/Response Validation
```typescript
// ✅ Request DTO with type guards
export interface SearchRequestDto {
  query: string;
  topK?: number;
  filters?: FiltersDto;
}

// ✅ Response DTO with explicit fields
export interface SearchResponseDto {
  results: SearchResult[];
  executionTime: number;
  requestId: string;
}
```

### 3. Service Implementation
```typescript
export class MyService implements IMyService {
  constructor(
    private readonly db: IDatabase,
    private readonly logger: ILogger,
  ) {}

  async searchRecords(input: SearchRequestDto): Promise<SearchResult[]> {
    const startTime = Date.now();
    try {
      // Validate input
      this.validateInput(input);
      
      // Business logic
      const results = await this.db.find({...});
      
      // Log with context
      this.logger.info({
        action: 'search_completed',
        module: 'search',
        duration: Date.now() - startTime,
        resultCount: results.length,
      });
      
      return results;
    } catch (error) {
      this.logger.error({
        action: 'search_failed',
        module: 'search',
        error: error.message,
        code: 'SEARCH_ERROR',
      });
      throw new ServiceError('Search failed', 'SEARCH_ERROR');
    }
  }

  private validateInput(input: SearchRequestDto): void {
    if (!input.query || input.query.trim().length === 0) {
      throw new ValidationError('Query is required');
    }
  }
}
```

### 4. Controller (Request Context)
```typescript
export class MyController {
  constructor(private readonly service: IMyService) {}

  async handleSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as SearchRequestDto;
      const results = await this.service.searchRecords(dto);
      
      return res.status(200).json({
        results,
        requestId: req.correlationId,
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### 5. Routes
```typescript
const router = express.Router();

router.post('/search', (req, res, next) => controller.handleSearch(req, res, next));

export default router;
```

### 6. Module Entry Point (DI Wiring)
```typescript
// {module}.module.ts
export const registerModule = (container: DIContainer) => {
  container.register<IMyService>('IMyService', MyService, [
    'IDatabase',
    'ILogger',
  ]);
};
```

## Validation Checklist

- ✅ All public methods documented with JSDoc
- ✅ Input validation on every method
- ✅ Error handling with typed exceptions
- ✅ Logging for debugging (action, module, duration, requestId)
- ✅ Correlation ID passed through service layer
- ✅ DTO defined for API contracts
- ✅ No direct cross-module imports (only interfaces)
- ✅ Test skeleton created
- ✅ README with examples created

## Common Pitfalls to Avoid

❌ **Wrong**: `import { ConcreteService } from '../other/service'`
✅ **Right**: `constructor(private readonly service: IOtherService)`

❌ **Wrong**: `async search(query) { }`
✅ **Right**: `async search(query: string): Promise<SearchResult[]> { }`

❌ **Wrong**: Logging only errors
✅ **Right**: Log success path too (with metrics: duration, result count)

❌ **Wrong**: Throwing generic `Error`
✅ **Right**: Throwing typed `ServiceError` with code

## Output Verification
After generation, verify:
- [ ] `tsc --noEmit` passes (no type errors)
- [ ] All interfaces implemented
- [ ] Test file imports correct interfaces
- [ ] README has usage example
- [ ] `index.ts` exports public API only
