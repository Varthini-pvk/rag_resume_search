---
name: "generate-tests"
description: "Use when: Creating unit or integration tests for services, controllers, or pipelines. Generates Jest test suites with proper mocking, assertions, and error cases."
---

# Generate Tests

## Test Strategy & Structure

### Test Pyramid
```
        Integration Tests (20%)
       /                    \
    Component Tests (30%)
   /                      \
Unit Tests (50%) - Fast, isolated, minimal mocks
```

### Test Organization
```
src/modules/{moduleName}/
  ├── service/
  │   ├── {module}.service.ts
  │   └── {module}.service.test.ts        ← Unit test
  ├── controller/
  │   ├── {module}.controller.ts
  │   └── {module}.controller.test.ts     ← Unit test
  └── {module}.integration.test.ts        ← Component/Integration

src/__tests__/
  └── integration/
      ├── pipeline.integration.test.ts    ← Full pipeline test
      ├── search-hybrid.integration.test.ts
      └── fixtures/
          ├── resume-fixtures.ts
          └── mock-services.ts
```

## Jest Configuration

**jest.config.js**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.types.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Unit Test Template (Service Layer)

### Example: BM25Service Test

```typescript
// src/modules/search/service/bm25.service.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BM25Service } from './bm25.service';
import { IDatabase } from '../../db/interface';
import { ILogger } from '../../shared/logger';
import { Resume } from '../../shared/types';

describe('BM25Service', () => {
  let service: BM25Service;
  let mockDb: jest.Mocked<IDatabase>;
  let mockLogger: jest.Mocked<ILogger>;

  const mockResume: Resume = {
    _id: new ObjectId(),
    text: 'Java developer with 5 years experience',
    embedding: [0.1, 0.2],
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    location: 'Remote',
    company: 'TechCorp',
    role: 'Senior Developer',
    education: 'B.S Computer Science',
    total_Experience: 5,
    relevant_Experience: 5,
    skills: ['Java', 'Spring Boot'],
    fullText: 'Java developer...',
  };

  beforeEach(() => {
    // Create mocks
    mockDb = {
      find: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    // Instantiate service with mocks
    service = new BM25Service(mockDb, mockLogger);
  });

  describe('search()', () => {
    // TEST 1: Happy path
    it('should return ranked results for valid query', async () => {
      // Arrange
      const query = 'java developer';
      const topK = 10;
      const mockCursor = {
        toArray: jest.fn().mockResolvedValue([
          { ...mockResume, textScore: 2.5 },
          { ...mockResume, _id: new ObjectId(), textScore: 1.8 },
        ]),
      };
      mockDb.find.mockReturnValue(mockCursor as any);

      // Act
      const results = await service.search(query, topK);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].textScore).toBe(1.0); // Normalized
      expect(results[1].textScore).toBeCloseTo(0.72, 2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'search_completed',
          resultCount: 2,
        })
      );
    });

    // TEST 2: Error handling - empty query
    it('should throw ValidationError for empty query', async () => {
      // Arrange
      const query = '   '; // Whitespace only
      const topK = 10;

      // Act & Assert
      await expect(service.search(query, topK)).rejects.toThrow(
        'Query is required'
      );
    });

    // TEST 3: Error handling - DB failure
    it('should throw SearchError when database fails', async () => {
      // Arrange
      const query = 'java';
      mockDb.find.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      // Act & Assert
      await expect(service.search(query, 10)).rejects.toThrow('Search failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'search_failed',
          code: 'SEARCH_ERROR',
        })
      );
    });

    // TEST 4: Edge case - no results
    it('should return empty array when no results found', async () => {
      // Arrange
      const query = 'nonexistent-query';
      const mockCursor = {
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockDb.find.mockReturnValue(mockCursor as any);

      // Act
      const results = await service.search(query, 10);

      // Assert
      expect(results).toEqual([]);
    });

    // TEST 5: Edge case - respects topK limit
    it('should return at most topK results', async () => {
      // Arrange
      const query = 'java';
      const topK = 5;
      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        ...mockResume,
        _id: new ObjectId(),
        textScore: 2.5 - i * 0.1,
      }));
      const mockCursor = {
        toArray: jest.fn().mockResolvedValue(manyResults),
      };
      mockDb.find.mockReturnValue(mockCursor as any);

      // Act
      const results = await service.search(query, topK);

      // Assert
      expect(results).toHaveLength(topK);
    });

    // TEST 6: Performance - timing
    it('should complete within timeout (500ms)', async () => {
      // Arrange
      const startTime = Date.now();
      const mockCursor = {
        toArray: jest.fn().mockResolvedValue([mockResume]),
      };
      mockDb.find.mockReturnValue(mockCursor as any);

      // Act
      await service.search('java', 10);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });
  });
});
```

---

## Controller Test Template

### Example: SearchController Test

```typescript
// src/modules/search/controller/search.controller.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { SearchController } from './search.controller';
import { ISearchService } from '../interface';

describe('SearchController', () => {
  let controller: SearchController;
  let mockService: jest.Mocked<ISearchService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Setup mocks
    mockService = {
      search: jest.fn(),
    } as any;

    controller = new SearchController(mockService);

    mockRequest = {
      body: { query: 'java developer', topK: 10 },
      correlationId: 'req-123',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('handleSearch()', () => {
    it('should return 200 with search results', async () => {
      // Arrange
      const mockResults = [
        { name: 'John', role: 'Developer', finalScore: 0.95 },
      ];
      (mockService.search as jest.Mock).mockResolvedValue(mockResults);

      // Act
      await controller.handleSearch(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        results: mockResults,
        requestId: 'req-123',
      });
    });

    it('should call next(error) on service failure', async () => {
      // Arrange
      const error = new Error('Service error');
      (mockService.search as jest.Mock).mockRejectedValue(error);

      // Act
      await controller.handleSearch(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
```

---

## Integration Test Template

### Example: Pipeline Integration Test

```typescript
// src/__tests__/integration/pipeline.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import axios from 'axios';

describe('Pipeline Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  const baseUrl = 'http://localhost:3000';

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();

    // Seed test data
    const db = mongoClient.db('test-resumes');
    await db.collection('resumes').insertMany([
      {
        name: 'Alice',
        role: 'Java Developer',
        skills: ['Java', 'Spring Boot'],
        embedding: Array(1024).fill(0.1),
        fullText: 'Java developer...',
      },
    ]);

    // Create indexes
    await db.collection('resumes').createIndex({
      fullText: 'text',
      skills: 'text',
    });
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  it('should complete full pipeline search successfully', async () => {
    // Arrange
    const query = 'java developer';

    // Act
    const response = await axios.post(`${baseUrl}/api/v1/pipeline/search`, {
      query,
      topK: 10,
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('results');
    expect(response.data).toHaveProperty('summary');
    expect(response.data.results.length).toBeGreaterThan(0);
    expect(response.data.results[0]).toHaveProperty('finalScore');
  });

  it('should handle search timeout gracefully', async () => {
    // This test might mock Mistral API to be slow
    jest.setTimeout(10000);

    const response = await axios.post(
      `${baseUrl}/api/v1/pipeline/search`,
      { query: 'test', topK: 10 },
      { timeout: 20000 }
    );

    // Should complete or have error, not hang
    expect(response.status).toMatch(/2\d\d|5\d\d/);
  });
});
```

---

## Mocking Strategies

### Mock External APIs

```typescript
// Mock Mistral Embeddings
jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: Array(1024).fill(0.1) }],
      }),
    },
  })),
}));

// Mock MongoDB
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
      }),
    }),
  })),
}));

// Mock LLM API
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Reranked results' } }],
        }),
      },
    },
  })),
}));
```

---

## Test Checklist per Service

### BM25Service Tests
- ✅ Happy path: returns ranked results
- ✅ Validates query (non-empty, <1000 chars)
- ✅ Handles DB errors
- ✅ Returns empty on no matches
- ✅ Respects topK limit
- ✅ Normalizes scores to [0, 1]
- ✅ Logs with requestId
- ✅ Completes within timeout

### VectorService Tests
- ✅ Happy path: returns similar docs
- ✅ Validates embedding (1024 dims)
- ✅ Handles vector index missing
- ✅ Returns empty on low similarity
- ✅ Normalizes similarity scores
- ✅ Handles sparse vectors

### HybridService Tests
- ✅ Runs BM25 + Vector in parallel
- ✅ Merges results correctly
- ✅ Deduplicates by resume._id
- ✅ Applies correct weights (0.4/0.6)
- ✅ Normalizes before merge
- ✅ Returns top K results

### RerankerService Tests
- ✅ Calls LLM API correctly
- ✅ Formats input JSON properly
- ✅ Re-orders results
- ✅ Handles LLM API failure
- ✅ Respects timeout

### SummarizerService Tests
- ✅ Generates concise summary
- ✅ Includes key findings
- ✅ Handles empty results
- ✅ Respects token limits

---

## Coverage Report

**Run tests with coverage**
```bash
npm run test -- --coverage

# Expected output
# ✓ BM25Service - 85% coverage
# ✓ VectorService - 82% coverage
# ✓ HybridService - 78% coverage
# ✓ PipelineService - 75% coverage
# ─────────────────────────
# Total: 80%+ coverage
```

## CI/CD Integration

**GitHub Actions Example**
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test -- --coverage
      - run: npm run test:integration
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```
