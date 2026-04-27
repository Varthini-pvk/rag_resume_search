---
name: "optimize-search"
description: "Use when: Tuning search performance metrics (latency, relevance, ranking). Includes weight optimization, index tuning, and benchmark strategies."
---

# Optimize Search Performance

## Performance Targets (SLA)

| Metric | Target | SLA |
|--------|--------|-----|
| Embedding generation | <1s | 99% |
| BM25 search | <500ms | 99.9% |
| Vector search | <1s | 99.9% |
| Hybrid search | <2s | 99% |
| Re-ranking (top 50) | <3s | 95% |
| Summarization | <2s | 95% |
| **Full pipeline** | **<8s** | **95%** |

---

## 1. BM25 Tuning (Full-Text Search)

### Baseline Configuration
```javascript
// MongoDB index
db.resumes.createIndex({
  fullText: "text",
  skills: "text",
  title: "text"
}, {
  weights: {
    skills: 3,
    title: 2,
    fullText: 1
  },
  default_language: "english"
});
```

### Tuning Levers

#### A. Field Weights

**Problem**: Results skewed to skill matches, missing title matches

**Solution**: Adjust weights based on your data
```javascript
// Skill-heavy corpus → Increase fullText weight
weights: { skills: 2, title: 2, fullText: 2 };

// Title-dominant → Increase title weight
weights: { skills: 1, title: 4, fullText: 1 };

// Balanced (default)
weights: { skills: 3, title: 2, fullText: 1 };
```

**Tuning Process**
1. Run 10 sample queries manually
2. Rate results 1-5 (1=irrelevant, 5=exact match)
3. Calculate average score
4. Adjust weights and re-test
5. Target: average score >3.5 for top 3 results

#### B. Query Expansion (Synonyms)

**Problem**: Query "Java" misses "JVM" skills

**Solution**: Pre-process query with synonyms
```typescript
const synonyms = {
  'java': 'java OR jvm OR spring',
  'javascript': 'javascript OR js OR nodejs',
  'react': 'react OR reactjs',
};

function expandQuery(query: string): string {
  let expanded = query;
  Object.entries(synonyms).forEach(([key, value]) => {
    expanded = expanded.replace(new RegExp(key, 'gi'), value);
  });
  return expanded;
}

// Original query: "java developer"
// Expanded:     "java OR jvm OR spring developer"
```

#### C. Stop Word Configuration

**Problem**: Query "the java developer" matches too many

**Solution**: Configure MongoDB stop words
```javascript
db.resumes.createIndex(
  { fullText: "text", skills: "text" },
  {
    weights: { skills: 3, fullText: 1 },
    default_language: "english"
    // English stop words (the, a, an, etc) automatically ignored
  }
);

// Result: "java developer" same as "the java developer"
```

### Performance Tips

```typescript
// ✅ DO: Pre-warm indexes on startup
await db.collection('resumes').createIndex({ fullText: 'text' });

// ✅ DO: Use limit() to cap results early
await db.resumes
  .find({ $text: { $search: query } })
  .sort({ score: { $meta: 'textScore' } })
  .limit(100);  // Don't fetch all docs

// ❌ DON'T: Perform full-text search + additional filters
// If filtering by skills array, use aggregation pipeline

// ❌ DON'T: Change index weights frequently
// Only change if you have quantified improvement data
```

---

## 2. Vector Search Tuning (Semantic Search)

### Baseline Configuration

```javascript
// MongoDB Atlas Vector Search Index
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "similarity": "cosine",
      "dimensions": 1024
    }
  ]
}
```

### Tuning Levers

#### A. Candidate Pool Size (K Parameter)

**Problem**: Taking top 10 vector results misses good matches

**Solution**: Fetch more candidates, post-process
```typescript
// First retrieval: fetch 100 candidates
const vectorResults = await vectorSearch(embedding, k=100);

// Filter by similarity threshold
const filtered = vectorResults.filter(r => r.score > 0.6);

// Re-rank with LLM (if expensive)
const reranked = await reranker.rank(query, filtered);

// Return top 10
return reranked.slice(0, 10);
```

**Tuning Guidelines**
- K=50: Fast, may miss results (use if latency critical)
- K=100: Balanced (default)
- K=200: Thorough, slower (use if precision > speed)

#### B. Similarity Threshold

**Problem**: Getting low-quality matches (0.4 similarity)

**Solution**: Raise threshold
```typescript
const results = await vectorSearch(embedding, k=100);
const filtered = results
  .filter(r => r.cosineSimilarity > 0.65)  // Before: 0.4
  .slice(0, topK);

// Impact: May reduce results, but higher quality
```

**Thresholds by Use Case**
- `> 0.4`: Broad search, include distant matches
- `> 0.6`: Balanced (default)
- `> 0.75`: Strict, only very similar results

#### C. Embedding Model Optimization

**Problem**: Generic embeddings don't capture domain context

**Solution**: Use domain-specific embedding model
```typescript
// Current: Generic embeddings don't understand "QA Engineer" context

// Option 1: Fine-tune embeddings on resume data
async function generateEmbedding(text: string): Promise<number[]> {
  // Instead of generic mistral-embed, use fine-tuned model
  const response = await customEmbeddingModel.embed({
    text,
    domain: 'resume',
    model: 'mistral-embed-resume-v1',
  });
  return response.embedding;
}

// Option 2: Add context prefix
const contextualText = `Job domain: QA Engineer. Resume: ${text}`;
const embedding = await embeddingService.generateEmbedding(contextualText);
```

**Impact Summary**
- Generic model: 0.65 avg relevance
- Domain-tuned: 0.78 avg relevance (+20%)

### Performance Tips

```typescript
// ✅ DO: Batch embed documents
// Instead of individual API calls
const embeddings = await mistral.embeddings.batch(resumeTexts);

// ✅ DO: Cache embeddings in MongoDB
// Don't re-embed same resume twice
if (resume.embedding && resume.embedding.length > 0) {
  return resume.embedding;
}

// ✅ DO: Use dimension reduction for speed
// Original: 1024 → Reduced: 384 (saves 60% storage/bandwidth)
const reduced = embedding.slice(0, 384);

// ❌ DON'T: Query without threshold
// Always filter by minimum similarity
// Otherwise you get irrelevant matches
```

---

## 3. Hybrid Merge Tuning (Best of Both)

### Current Merge Algorithm
```typescript
finalScore = (bm25Score * 0.4) + (vectorScore * 0.6);
```

### Tuning Levers

#### A. Weight Optimization

**Problem**: Keyword queries return poor results

**Scenario**: Query = "Java developer 5 years"
- With 0.4 BM25, 0.6 vector: Misses exact keyword matches
- Solution: Increase BM25 weight for keyword-heavy queries

```typescript
function getWeights(query: string): { bm25: number; vector: number } {
  // Detect query type
  const isKeywordHeavy = /\d+\s+years|spring|kafka/i.test(query);
  
  if (isKeywordHeavy) {
    return { bm25: 0.6, vector: 0.4 };  // Favor keyword matching
  }
  
  const isSemanticHeavy = /passionate|motivated|seeking/i.test(query);
  if (isSemanticHeavy) {
    return { bm25: 0.3, vector: 0.7 };  // Favor semantic search
  }
  
  return { bm25: 0.4, vector: 0.6 };    // Default balanced
}

// Usage
const weights = getWeights(query);
const finalScore = (bm25 * weights.bm25) + (vector * weights.vector);
```

**Weight Tuning Table**
| Query Type | BM25 | Vector | Reason |
|------------|------|--------|--------|
| Exact skill list | 0.7 | 0.3 | Keywords dominate |
| Job description | 0.4 | 0.6 | Balanced |
| Conceptual search | 0.2 | 0.8 | Semantic priority |

#### B. Score Normalization

**Problem**: BM25 scores 0-100, vector scores 0-1 → Not comparable

**Solution**: Normalize before merge
```typescript
function normalizeScores(bm25Results, vectorResults) {
  // Normalize BM25 to [0, 1]
  const maxBm25 = Math.max(...bm25Results.map(r => r.textScore));
  const normalizedBm25 = bm25Results.map(r => ({
    ...r,
    score: r.textScore / maxBm25
  }));
  
  // Vector already in [0, 1], just use as-is
  const normalizedVector = vectorResults.map(r => ({
    ...r,
    score: r.similarityScore
  }));
  
  return { normalizedBm25, normalizedVector };
}
```

#### C. Deduplication Strategy

**Problem**: Same resume appears in both BM25 and vector, counted twice

**Solution**: Merge with proper deduplication
```typescript
const merged = new Map<string, any>();

// Add BM25 results
bm25Results.forEach(r => {
  merged.set(r.resume._id.toString(), {
    resume: r.resume,
    bm25Score: normalizeScore(r.textScore, maxBm25),
    vectorScore: 0,
  });
});

// Merge vector results
vectorResults.forEach(r => {
  const key = r.resume._id.toString();
  const existing = merged.get(key);
  
  if (existing) {
    // Resume already in BM25 results
    existing.vectorScore = r.similarityScore;
  } else {
    // New resume from vector search
    merged.set(key, {
      resume: r.resume,
      bm25Score: 0,
      vectorScore: r.similarityScore,
    });
  }
});

// Calculate final scores
const final = Array.from(merged.values())
  .map(item => ({
    ...item,
    finalScore: (item.bm25Score * weights.bm25) +
                (item.vectorScore * weights.vector)
  }))
  .sort((a, b) => b.finalScore - a.finalScore)
  .slice(0, topK)
  .map(item => item.resume);
```

---

## 4. Re-ranking Tuning (LLM-Based Ranking)

### Current Approach
- **Input**: Top 50 results from hybrid search
- **LLM**: Ask to re-order by relevance
- **Cost**: ~3 seconds for 50 documents

### Tuning Levers

#### A. Candidate Pool Size

**Problem**: Re-ranking 100 results takes 5+ seconds

**Solution**: Reduce candidates before LLM
```typescript
// Reduce to top 30 hybrid results
const topCandidates = hybridResults.slice(0, 30);

// Or: Filter by minimum score
const qualityCandidates = hybridResults
  .filter(r => r.finalScore > 0.5)
  .slice(0, 30);

// Then re-rank
const reranked = await reranker.rank(query, qualityCandidates);
```

**Impact**: 50→30 docs = 40% faster LLM call

#### B. Re-ranker Prompt Optimization

**Problem**: LLM re-ranker slow or returning bad order

**Solution**: Optimize LLM prompt
```typescript
// ❌ Slow/ineffective prompt
const prompt = `Re-rank these candidates for the query "${query}"`;

// ✅ Better prompt with context
const betterPrompt = `
Query: "${query}"

Rank these ${candidates.length} candidates by relevance (1=most relevant):
Consider: skill match, experience level, role alignment.

Format: "1. Name - Score
2. Name - Score"

Candidates:
${candidates.map(c => `- ${c.name} (${c.role}, ${c.total_Experience}y exp)`).join('\n')}
`;

// ✅ Even better: Few-shot examples
const prompt = `
Query: "Java developer with 5 years experience"

Example ranking (most to least relevant):
1. John Doe - Senior Java Dev, 6y exp ✓
2. Alice Smith - Java Dev, 4y exp ✓
3. Bob Johnson - Frontend Dev, 5y exp ✗ (wrong stack)

Now rank these candidates:
${candidates.slice(0, 10).map(c => `- ${c.name}`).join('\n')}
`;
```

#### C. Re-ranking Strategy Decision

**When to re-rank?**
```typescript
if (query.length > 50 || isSemanticQuery) {
  // Complex query needs LLM help
  return await reranker.rank(query, topResults);
}

if (hybridMerge.hasHighVarianceInScores) {
  // Results close in score → re-rank to break ties
  return await reranker.rank(query, topResults);
}

// Simple keyword query → skip expensive re-ranking
return topResults;
```

---

## 5. Benchmark & Measure

### Benchmark Queries (Test Suite)

Create 20 sample queries with known ideal results:
```typescript
const benchmarks = [
  {
    query: 'Java developer Spring Boot',
    expectedTopNames: ['Alice', 'Bob'],  // Should rank high
    notExpected: ['Frontend Dev'],       // Should rank low
  },
  {
    query: 'QA automation testing Selenium',
    expectedTopNames: ['Charlie'],
    notExpected: ['Data Scientist'],
  },
  // ... 18 more
];
```

### Metrics to Track

```typescript
function runBenchmark(query: string, searchFn: Function) {
  const startTime = Date.now();
  const results = await searchFn(query);
  const duration = Date.now() - startTime;
  
  return {
    duration,
    resultCount: results.length,
    topResult: results[0]?.name,
    avgScore: results.reduce((sum, r) => sum + r.finalScore, 0) / results.length,
    maxScore: Math.max(...results.map(r => r.finalScore)),
  };
}

// Before optimization
// { duration: 2100, avgScore: 0.65, maxScore: 0.92 }

// After tuning weights
// { duration: 2050, avgScore: 0.78, maxScore: 0.95 }  ← 20% relevance improvement!
```

### Continuous Monitoring

```typescript
// Application logging
logger.info({
  action: 'search_completed',
  query: query.substring(0, 50),
  duration,
  resultCount: results.length,
  topScores: results.slice(0, 3).map(r => r.finalScore),
  percentile: calculatePercentile(duration),
});

// Monitor over time
// Track: p50, p95, p99 latency
// Track: query success rate
// Alert if p95 > 3000ms
```

---

## 6. Quick Win Optimizations

| Issue | Fix | Impact |
|-------|-----|--------|
| Slow vector search | Add `k=50` limit | -40% latency |
| Wrong ranking | Increase BM25 weight to 0.5 | +25% relevance |
| LLM timeout | Remove re-ranking for simple queries | -3s latency |
| Empty results | Add query expansion | +15% recall |
| Bad results | Lower similarity threshold 0.4 | +10% recall |
| Duplicate results | Add deduplication | Data quality |
| Slow startup | Pre-warm indexes | -5s startup |

---

## Implementation Checklist

- [ ] Create benchmark query suite (20 queries)
- [ ] Measure baseline metrics (latency, relevance)
- [ ] Document current weights/thresholds
- [ ] Run A/B test on tuning changes
- [ ] Measure improvement %
- [ ] Deploy to staging first
- [ ] Monitor production metrics
- [ ] Document final tuning parameters
- [ ] Set up alerts for SLA violations
