---
name: "debug-api-failures"
description: "Use when: Troubleshooting 5xx errors, endpoint timeouts, empty results, or unexpected behaviors. Systematically trace through the pipeline with structured diagnostics."
---

# Debug API Failures

## Systematic Debugging Framework

### Phase 1: Immediate Triage (2 minutes)

**Q1: What's the error?**
- [ ] 5xx error? → Internal server error
- [ ] 4xx error? → Client mistake
- [ ] Timeout? → Performance issue
- [ ] Empty results? → No matches found (expected) or bug

**Q2: Which endpoint?**
- `/api/v1/pipeline/search` → Full orchestration
- `/api/v1/search/bm25` → Text search only
- `/api/v1/search/vector` → Vector search only
- `/api/v1/embeddings` → Embedding generation
- `/api/v1/llm/rerank` → Re-ranking
- `/api/v1/llm/summarize` → Summarization
- `/api/v1/health` → Service status

**Q3: What's the request ID?**
- Look for `requestId` in error response
- Use this to trace logs: `grep "req-12345" logs/*`

### Phase 2: Log Analysis (5 minutes)

**Search for the full trace**
```bash
# Terminal command
grep "requestId: 'req-12345'" app.log | grep -E "start|end|error" | tail -20
```

**Look for these patterns**
```
✅ "pipeline_search_started"           → Request entered system
❌ "embedding_failed"                  → Mistral API error
❌ "bm25_search_failed"                → MongoDB text index error
❌ "vector_search_failed"              → MongoDB vector index error
❌ "reranking_failed"                  → LLM API timeout
❌ "summarization_failed"              → Summarizer timeout
✅ "pipeline_search_completed"         → Request succeeded
```

**Check duration metrics**
```json
{
  "duration": 5200,   // Expected: <8000ms
  "phase_timings": {
    "embedding": 1200,
    "search": 2100,
    "rerank": 1500,
    "summarize": 400
  }
}
```

### Phase 3: Dependency Health Checks (3 minutes)

**MongoDB Status**
```bash
# Run health endpoint
curl http://localhost:3000/api/v1/health

# Look for this response
{
  "status": "healthy",
  "mongodb": {
    "connected": true,
    "latency": 45
  }
}
```

**Mistral API Status**
```bash
# Test embedding endpoint directly
curl -X POST http://localhost:3000/api/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test query"}'

# Expected: [0.1, 0.2, ..., 0.5] (1024 numbers)
```

**LLM Services Status** (Reranker & Summarizer)
```bash
# Check if API key works
curl -H "Authorization: Bearer ${LLM_API_KEY}" \
  https://api.openai.com/v1/models

# Should return 200 with model list
```

### Phase 4: Data Validation (5 minutes)

**Q4: Is MongoDB populated?**
```bash
# Count documents
mongosh --eval "db.resumes.countDocuments()"

# Expected: >0 (should have resume documents)
```

**Q5: Are indexes created?**
```bash
# List indexes
mongosh --eval "db.resumes.getIndexes()"

# Should include:
# - fullText_text_skills_text_title_text (BM25)
# - embedding_cosmosSearch or similar (Vector)
```

**Q6: Do documents have embeddings?**
```bash
# Check embedding field
mongosh --eval \
  "db.resumes.find({embedding: {\$exists: false}}).count()"

# Expected: 0 (all documents should have embeddings)
```

### Phase 5: Targeted Diagnosis by Symptom

---

## Symptom Decoder

### Symptom: Empty Results Array (200 OK but [] returned)

**Most Likely Causes**
1. **No matching documents** (expected in some cases)
2. **Search index not created**
3. **Query too restrictive**
4. **Filters too narrow**

**Diagnosis Steps**
```bash
# 1. Check if ANY documents match query
mongosh --eval "db.resumes.find({\$text: {\$search: 'java'}}).limit(1)"

# 2. Check query text is valid
mongosh --eval "db.resumes.find({fullText: /java/i}).limit(1)"

# 3. Check if indexes exist
mongosh --eval "db.resumes.getIndexes()" | grep -i text

# 4. Try running search WITHOUT filters
# POST /api/v1/search/bm25 with just "query: 'java'"
```

**Fix Strategy**
- [ ] If no docs match: Expected (not a bug)
- [ ] If index missing: Create indexes (see MongoDB Index Setup)
- [ ] If query malformed: Sanitize input
- [ ] If filters too strict: Relax filter conditions

---

### Symptom: Timeout (>30 seconds or errors with "TIMEOUT")

**Most Likely Causes**
1. **MongoDB query slow** (table scan, bad index)
2. **Mistral API slow** (rate limited, infrastructure issue)
3. **LLM API slow** (reranker/summarizer slow)
4. **Vector search slow** (too many candidates, no index)

**Diagnosis Steps**
```bash
# 1. Check MongoDB query plan
mongosh --explain "executionStats" << 'EOF'
db.resumes.find({$text: {$search: "java"}})
EOF

# Look for: executionStages.stage
# ✅ Good: IXSCAN (index scan)
# ❌ Bad: COLLSCAN (full table scan)

# 2. Test Mistral directly
curl -X POST https://api.mistral.ai/v1/embeddings \
  -H "Authorization: Bearer ${MISTRAL_API_KEY}" \
  -d '{"input": "test", "model": "mistral-embed"}'
# Measure response time

# 3. Test LLM API
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer ${LLM_API_KEY}" \
  -d '{"model": "gpt-4", "messages": [...]}'
# Measure response time
```

**Fix Strategy**
- [ ] If Mistral slow: Check API status, rate limits, API key
- [ ] If LLM slow: May be normal; increase timeout in config
- [ ] If MongoDB slow: Rebuild indexes, check disk I/O

---

### Symptom: "EMBEDDING_FAILED" or "embedding_failed" in logs

**Most Likely Causes**
1. **Mistral API key invalid/expired**
2. **Rate limit exceeded** (too many requests)
3. **Network timeout** (can't reach Mistral)
4. **Input text too long** (>8192 chars)

**Diagnosis Steps**
```bash
# 1. Verify API key
echo $MISTRAL_API_KEY  # Should print key, not empty

# 2. Test API directly
curl -X POST https://api.mistral.ai/v1/embeddings \
  -H "Authorization: Bearer ${MISTRAL_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral-embed",
    "input": "test query"
  }'

# Response codes:
# 200 OK ✅
# 401 Unauthorized → Bad API key
# 429 Too Many Requests → Rate limited
# 500 → Mistral infrastructure issue

# 3. Check text length
echo -n "your-query-text" | wc -c  # Should be <8192
```

**Fix Strategy**
- [ ] If 401: Verify `MISTRAL_API_KEY` in `.env`
- [ ] If 429: Implement backoff retry, reduce concurrent requests
- [ ] If 500: Wait and retry, contact Mistral support
- [ ] If timeout: Check network, increase `MISTRAL_TIMEOUT` in config

---

### Symptom: "VECTOR_SEARCH_FAILED" or "vector_search_failed"

**Most Likely Causes**
1. **Vector index not created** (MongoDB Atlas only)
2. **Embedding dimensions mismatch** (1024 expected)
3. **All embedding vectors are zero** (not computed)
4. **Atlas vector search not enabled**

**Diagnosis Steps**
```bash
# 1. Check if index exists
mongosh --eval "db.resumes.getIndexes()" | grep -i vector

# 2. Check embedding dimensions
mongosh --eval \
  "db.resumes.findOne({embedding: {\$exists: true}}, \
    {embedding: {$slice: 1}})" | grep -o ',' | wc -l
# Expected output: ~1024 (dimensions - 1, since commas)

# 3. Check if embeddings are all zeros
mongosh --eval \
  "db.resumes.findOne({embedding: {\$not: {\$elemMatch: {\$ne: 0}}}})"
# Expected: null (no all-zero embeddings)

# 4. Check MongoDB Atlas cluster has vector search enabled
# Log into Atlas console → Check cluster type
```

**Fix Strategy**
- [ ] If index missing: Create vector index in MongoDB Atlas
- [ ] If dimensions wrong: Regenerate embeddings with correct model
- [ ] If all zeros: Run embedding service on all documents
- [ ] If Atlas doesn't support: Upgrade cluster or use vector DB

---

### Symptom: "RE_RANKING_FAILED" or "reranking_failed"

**Most Likely Causes**
1. **LLM API key invalid**
2. **LLM API down** (service maintenance)
3. **Input format wrong** (wrong JSON structure)
4. **Timeout** (LLM slow)

**Diagnosis Steps**
```bash
# 1. Test LLM API directly
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer ${LLM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "test"}]
  }'

# Response codes:
# 200 OK ✅
# 401 Unauthorized → Bad API key
# 429 Too Many Requests → Rate limited
# 503 Service Unavailable → Maintenance
```

**Fix Strategy**
- [ ] If 401: Verify `LLM_API_KEY` env var
- [ ] If 429: Implement exponential backoff
- [ ] If 503: Retry after delay, disable reranking temporarily
- [ ] If timeout: Increase `LLM_TIMEOUT` in config or disable reranking

---

### Symptom: Results are in Wrong Order / Bad Ranking

**Most Likely Causes**
1. **Hybrid merge weights misconfigured** (should be 0.4/0.6)
2. **Score normalization broken** (not in [0, 1])
3. **Deduplication happening wrong** (same resume twice)
4. **Re-ranking disabled**

**Diagnosis Steps**
```bash
# 1. Check response includes scores
curl -X POST http://localhost:3000/api/v1/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "query": "java developer",
    "topK": 5
  }' | jq '.results[] | {name: .name, finalScore, bm25Score, vectorScore}'

# 2. Verify weights sum to 1.0
grep -r "bm25.*0.4" src/  # Should find 0.4 and 0.6

# 3. Check if LLM reranking is enabled
grep "ENABLE_RERANKING" .env
```

**Fix Strategy**
- [ ] If weights wrong: Update in hybrid.service.ts
- [ ] If scores not in range: Check normalization logic
- [ ] If duplicates: Fix deduplication in merge
- [ ] If not reranked: Enable `ENABLE_RERANKING=true` in .env

---

## Recovery Checklist

After identifying root cause, execute:

```bash
# 1. Clear caches (if applicable)
redis-cli FLUSHALL  # If using Redis

# 2. Restart service
pm2 restart app
# or
docker-compose restart api

# 3. Re-run tests
npm run test

# 4. Verify health
curl http://localhost:3000/api/v1/health

# 5. Test search endpoint
curl -X POST http://localhost:3000/api/v1/pipeline/search \
  -H "Content-Type: application/json" \
  -d '{"query": "java developer", "topK": 5}'
```

## Escalation Path

If still failing after diagnosis:

1. **Check infrastructure**: DB uptime, API quotas, network latency
2. **Review recent deployments**: Did config/code change?
3. **Check external service status**: Mistral, OpenAI status pages
4. **Enable debug logging**: Set `LOG_LEVEL=debug` temporarily
5. **Contact support** with:
   - RequestId
   - Error code
   - Full logs for request
   - Steps to reproduce
