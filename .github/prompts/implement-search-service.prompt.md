---
name: "implement-search-service"
description: "Use when: Implementing BM25, vector, or hybrid search services. Include MongoDB queries, scoring logic, result merging, and performance optimization."
---

# Implement Search Service

## Architecture Overview

Search in this RAG system happens in 3 complementary layers:

### 1. BM25 Search (Lexical/Keyword-Based)
**Purpose**: Fast keyword matching, exact phrase search, skill extraction
**Technology**: MongoDB full-text index
**Strengths**: Fast, deterministic, exact matching, weighted field search
**Weaknesses**: No semantic understanding, typo-sensitive

**Query Pattern**
```typescript
db.resumes.find(
  { $text: { $search: "java developer" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

**Index Configuration**
```javascript
db.resumes.createIndex({
  fullText: "text",
  skills: "text",
  title: "text"
}, {
  weights: {
    skills: 3,      // Most important
    title: 2,
    fullText: 1
  },
  default_language: "english"
})
```

### 2. Vector Search (Semantic/Similarity-Based)
**Purpose**: Intent-based search, query paraphrasing, semantic matching
**Technology**: MongoDB Atlas vector search with cosine similarity
**Strengths**: Understands intent, handles paraphrasing, fuzzy matching
**Weaknesses**: Slower than BM25, requires pre-computed embeddings

**Query Pattern**
```typescript
db.resumes.aggregate([
  {
    $search: {
      cosmosSearch: {
        vector: queryEmbedding,  // [0.1, 0.2, ..., 0.5]
        k: 100                    // Retrieve top 100
      },
      returnStoredSource: true
    }
  },
  {
    $project: {
      similarityScore: { $meta: "searchScore" },
      document: "$$ROOT"
    }
  }
])
```

**Embedding Specifications**
- Model: `mistral-embed`
- Dimensions: 1024
- Cache embeddings in `resume.embedding` field
- Query embeddings generated on-the-fly via Mistral API

### 3. Hybrid Search (Best of Both)
**Purpose**: Production search combining precision (BM25) + semantics (vector)
**Strategy**: Run in parallel, merge with configurable weights
**Performance**: <2s end-to-end for top-100 results

## Implementation Requirements

### BM25Service (`src/modules/search/service/bm25.service.ts`)

```typescript
export interface IBM25Service {
  search(query: string, topK: number): Promise<BM25Result[]>;
  bulkIndex(documents: Resume[]): Promise<void>;
}

interface BM25Result {
  resume: Resume;
  textScore: number;
  matchedFields?: string[];
}
```

**Key Implementation Details**
- ✅ Query sanitization (escape special MongoDB chars)
- ✅ Score normalization to [0, 1] range
- ✅ Timeout handling (>5s = error)
- ✅ Retry logic for transient failures
- ✅ Log search metrics (query, result count, duration)
- ✅ Cache popular queries (optional LRU cache)

**Pseudocode**
```
1. Validate query (length, characters)
2. Build MongoDB $text query
3. Execute find() with timeout
4. Map results to BM25Result[]
5. Normalize scores by dividing by max
6. Return top K sorted by score
```

### VectorService (`src/modules/search/service/vector.service.ts`)

```typescript
export interface IVectorService {
  search(embedding: number[], topK: number): Promise<VectorResult[]>;
}

interface VectorResult {
  resume: Resume;
  similarityScore: number;
  cosineSimilarity?: number;
}
```

**Key Implementation Details**
- ✅ Embedding dimension validation (must be 1024)
- ✅ Cosine similarity scoring (-1 to +1, typically 0-1)
- ✅ Vector index health check on startup
- ✅ Aggregation pipeline construction
- ✅ Timeout handling (>10s = error)
- ✅ Sparse vector handling (skip if all zeros)

**Pseudocode**
```
1. Validate embedding (length, values)
2. Build MongoDB $search aggregation
3. Execute with timeout
4. Extract similarity scores from $meta
5. Normalize to [0, 1] range
6. Return top K results
```

### HybridService (`src/modules/search/service/hybrid.service.ts`)

```typescript
export interface IHybridService {
  search(
    query: string,
    embedding: number[],
    topK: number,
    weights?: { bm25: number; vector: number }
  ): Promise<Resume[]>;
}
```

**Merge Algorithm**
```typescript
// 1. Run BM25 + Vector in PARALLEL
const [bm25Results, vectorResults] = await Promise.all([
  this.bm25Service.search(query, topK * 2),
  this.vectorService.search(embedding, topK * 2),
]);

// 2. Normalize scores to [0, 1]
const normalizedBm25 = bm25Results.map(r => ({
  ...r,
  score: r.textScore / Math.max(...bm25Results.map(x => x.textScore))
}));

const normalizedVector = vectorResults.map(r => ({
  ...r,
  score: r.similarityScore  // Already in [0, 1]
}));

// 3. Merge by resume._id
const merged = new Map<string, any>();
normalizedBm25.forEach(r => {
  merged.set(r.resume._id.toString(), {
    resume: r.resume,
    bm25Score: r.score,
    vectorScore: 0,
  });
});

normalizedVector.forEach(r => {
  const key = r.resume._id.toString();
  if (merged.has(key)) {
    merged.get(key).vectorScore = r.score;
  } else {
    merged.set(key, {
      resume: r.resume,
      bm25Score: 0,
      vectorScore: r.score,
    });
  }
});

// 4. Calculate final score with weights
const weights = { bm25: 0.4, vector: 0.6 };
const scored = Array.from(merged.values()).map(item => ({
  ...item,
  finalScore: (item.bm25Score * weights.bm25) + 
              (item.vectorScore * weights.vector),
}));

// 5. Sort and return top K
return scored
  .sort((a, b) => b.finalScore - a.finalScore)
  .slice(0, topK)
  .map(item => item.resume);
```

## Performance & Optimization

### BM25 Optimization
- **Field Weights**: Tune if results skewed (skills too high/low)
- **Query Expansion**: Add synonyms (`java` + `jvm`)
- **Index Caching**: MongoDB maintains index in memory

### Vector Search Optimization
- **K Parameter**: Retrieve more candidates (e.g., 200) and rerank
- **Similarity Threshold**: Filter results below 0.6 similarity
- **Batch Embeddings**: If indexing many resumes, use batch API

### Hybrid Merge Optimization
- **Weight Tuning**: Adjust based on query type
  - Keyword-heavy: `{ bm25: 0.6, vector: 0.4 }`
  - Semantic-heavy: `{ bm25: 0.3, vector: 0.7 }`
- **Parallel Execution**: Critical—never use `.then()` for sequential
- **Deduplication**: Must happen before normalization, not after

## Error Handling

```typescript
export class SearchError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

// Use specific error codes
new SearchError('QUERY_INVALID', 'Query too short', 400);
new SearchError('INDEX_NOT_FOUND', 'BM25 index missing', 503);
new SearchError('VECTOR_DIM_MISMATCH', 'Embedding dimension mismatch', 400);
new SearchError('DB_TIMEOUT', 'Database query timeout', 503);
```

## Logging Requirements

Every search operation must log:
```typescript
logger.info({
  action: 'search_executed',
  module: 'search',
  searchType: 'hybrid',
  query: query.substring(0, 50),  // Don't log full query if sensitive
  topK: topK,
  resultCount: results.length,
  duration: endTime - startTime,
  bm25Count: bm25Results.length,
  vectorCount: vectorResults.length,
  requestId: correlationId,
});
```

## Testing Checklist

- [ ] BM25 returns results for valid query
- [ ] Vector search works with valid embedding
- [ ] Hybrid merge deduplicates correctly
- [ ] Weights apply correctly (bm25=0.4, vector=0.6)
- [ ] Empty results handled gracefully
- [ ] Timeouts caught and reported
- [ ] Invalid queries rejected (too short, special chars)
- [ ] Parallel execution confirmed (no sequential await)
- [ ] Scores normalized to [0, 1]
- [ ] Top K results returned (not top K+1)

## MongoDB Index Setup

Run before deployment:
```javascript
// Text index for BM25
db.resumes.createIndex({
  fullText: "text",
  skills: "text",
  title: "text"
}, {
  weights: { skills: 3, title: 2, fullText: 1 },
  default_language: "english"
});

// Vector index for semantic search (Atlas only)
db.resumes.createIndex({
  embedding: "cosmosSearch",
  // Vector index parameters
});
```

## Example Request/Response

**Request**
```json
{
  "query": "Java developer with Spring Boot experience",
  "topK": 10
}
```

**Response (Hybrid)**
```json
{
  "results": [
    {
      "_id": "ObjectId(...)",
      "name": "Alice Chen",
      "role": "Senior Java Developer",
      "skills": ["Java", "Spring Boot", "Kafka"],
      "bm25Score": 0.95,
      "vectorScore": 0.87,
      "finalScore": 0.89,
      "matchedPhrases": ["Java developer", "Spring Boot"]
    }
  ],
  "metrics": {
    "bm25ResultCount": 45,
    "vectorResultCount": 32,
    "mergedCount": 68,
    "finalCount": 10,
    "executionTime": 1200
  }
}
```
