# Copilot Customizations for Resume Search RAG

This directory contains enterprise-grade Copilot instructions and prompts to guide AI-assisted code generation, debugging, testing, and optimization for the Resume Search RAG project.

## 📁 Structure

```
.github/
├── copilot-instructions.md              # Core project guidelines (always-on)
└── prompts/
    ├── scaffold-module.prompt.md        # Generate new service modules
    ├── implement-search-service.prompt.md  # Build search logic (BM25/Vector/Hybrid)
    ├── debug-api-failures.prompt.md     # Troubleshoot API errors systematically
    ├── generate-tests.prompt.md         # Create unit & integration tests
    └── optimize-search.prompt.md        # Tune performance and relevance
```

## 🚀 Quick Start

### 1. Use Core Instructions (Always Active)

The `copilot-instructions.md` file applies globally to all work in this project. It ensures:
- ✅ TypeScript strict mode enforcement
- ✅ Dependency injection patterns
- ✅ Module boundaries (no cross-module imports)
- ✅ Error handling standards
- ✅ Logging & correlation ID practices

**You don't need to do anything** — these are automatically applied.

### 2. Use Prompts (On-Demand)

When you need help with specific tasks, use the prompts via Copilot side chat:

#### Generator Prompts

**`scaffold-module`** — Create a complete service module
- *When*: Starting a new service (e.g., `bm25-service`, `reranker-service`)
- *Type it in chat*: `/scaffold-module` or just describe your module

**`implement-search-service`** — Build search logic
- *When*: Implementing BM25, vector, or hybrid search
- *Type it in chat*: `/implement-search-service`

#### Debug Prompts

**`debug-api-failures`** — Troubleshoot systematically
- *When*: 5xx errors, timeouts, empty results, or mysterious failures
- *Type it in chat*: `/debug-api-failures` + describe the issue
- *Includes*: Symptom decoder, diagnosis steps, recovery checklists

#### Testing Prompts

**`generate-tests`** — Create test suites
- *When*: Writing unit or integration tests
- *Type it in chat*: `/generate-tests` + specify module/test type

#### Optimization Prompts

**`optimize-search`** — Tune performance & relevance
- *When*: Improving latency or ranking quality
- *Type it in chat*: `/optimize-search` + describe what to improve

---

## 📝 Example Workflows

### Workflow 1: Create BM25 Service

```
1. Open Copilot chat (Cmd/Ctrl + I)
2. Type: "I need to create a BM25 search service"
3. Chat suggests using `/scaffold-module` prompt
4. Type: /scaffold-module
5. Answer questions:
   - Module name: bm25
   - Main methods: search(query, topK)
   - Dependencies: IDatabase, ILogger
6. Copilot generates:
   - interface/bm25.interface.ts
   - service/bm25.service.ts
   - controller/bm25.controller.ts
   - route/bm25.route.ts
   - Tests
```

### Workflow 2: Debug Empty Search Results

```
1. API returns 200 but empty results[]
2. Open Copilot chat
3. Type: "Search endpoint returning empty results"
4. Use `/debug-api-failures` prompt
5. Follow symptom decoder:
   - "Empty Results Array" section
   - Run diagnostic queries (MongoDB counts, indexes)
   - Check if data is indexed
6. Copilot suggests fixes (create indexes, populate data, etc.)
```

### Workflow 3: Optimize Hybrid Search Ranking

```
1. Your hybrid search scores don't match expected relevance
2. Open Copilot chat
3. Type: "Results are ranked incorrectly in hybrid search"
4. Use `/optimize-search` prompt
5. Copilot helps with:
   - Weight tuning (maybe 0.6 BM25 / 0.4 vector works better)
   - Normalization check
   - Benchmark queries
6. Measure and iterate
```

---

## 🎯 Enterprise Standards Built In

### Code Quality
✅ **80%+ test coverage** target  
✅ **TypeScript strict mode** enforced  
✅ **Dependency injection** pattern  
✅ **Module boundaries** strictly maintained  

### Performance
✅ **Latency SLA**: <8s total pipeline  
✅ **Search targets**: BM25 <500ms, Vector <1s, Hybrid <2s  
✅ **Availability**: 95-99% SLA depending on component  

### Observability
✅ **Structured logging** with correlation IDs  
✅ **Request tracing** through all services  
✅ **Duration metrics** on every operation  
✅ **Error codes** for programmatic handling  

### Documentation
✅ **Every service must have interface** defined first  
✅ **DTOs for all API contracts**  
✅ **JSDoc on public methods**  
✅ **Inline comments for non-obvious logic**  

---

## 🔧 Configuration Files

These customizations work best with:

### TypeScript Config
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Test Config (jest.config.js)
```javascript
{
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 75 }
  }
}
```

---

## 📊 Coverage of Each Prompt

| Prompt | Lines | Focus | Use Case |
|--------|-------|-------|----------|
| `copilot-instructions.md` | 450 | All standards | Always |
| `scaffold-module.prompt.md` | 180 | Module creation | New services |
| `implement-search-service.prompt.md` | 320 | Search algorithms | BM25/Vector/Hybrid |
| `debug-api-failures.prompt.md` | 410 | Troubleshooting | Debugging issues |
| `generate-tests.prompt.md` | 480 | Testing strategies | Creating tests |
| `optimize-search.prompt.md` | 520 | Performance tuning | Optimization |

**Total**: ~2,360 lines of enterprise-grade decisions baked in.

---

## ✅ Accessing Prompts in VS Code

### Method 1: Chat Slash Commands
```
Press: Cmd+I (Mac) or Ctrl+I (Windows/Linux)
Type: /
Copilot shows: All available prompts + instructions
Click: Select the one you need
```

### Method 2: Direct in Chat
```
Type: @prompts
Copilot shows: List of available prompts
Select: The one you need
```

### Method 3: Manual Search
```
Type: "I need help with [testing/debugging/scaffold]"
Copilot suggests: Relevant prompts
Execute: Copy/paste suggested prompt name
```

---

## 🎓 Key Concepts

### Why Dependency Injection?
- Testable code (mock dependencies)
- Reusable services
- Clear contracts (interfaces)
- No hidden dependencies

### Why Module Boundaries?
- Scalability (teams work independently)
- Maintainability (changes don't leak)
- Testing (easier to test isolated modules)
- Refactoring (safer to change internals)

### Why Structured Logging?
- Debugging is faster (correlate requests)
- Performance analysis (track durations)
- Compliance (audit trails)
- Monitoring (alert on errors)

---

## 🚨 Important Notes

### These Customizations Are NOT:
❌ Automatic code generation (they guide and explain)  
❌ Enforcement policies (they suggest best practices)  
❌ Replacement for human review (always QA/review code)  
❌ Magic (they require active engagement to work)  

### These Customizations ARE:
✅ Best practices packaged as guidance  
✅ Time-savers (reduce research/decision time)  
✅ Quality gates (raise minimum standards)  
✅ Knowledge transfer (team memory)  

---

## 📈 Success Metrics

After using these customizations, you should see:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Code review comments | 15-20 per PR | 5-8 per PR | <5 |
| Test coverage | 60% | 85% | 80%+ |
| Onboarding time (new dev) | 3 days | 1 day | <1 day |
| Bug rate | 2-3 per sprint | 0-1 per sprint | <1 |
| Search latency (p95) | 3.5s | 1.8s | <2s |

---

## 💬 Contributing

Found a gap or improvement? Update:
1. The relevant `.prompt.md` file
2. Add example or clarification
3. Update this README
4. Commit with `docs: enhanced [prompt-name] guidance`

---

## 📖 Reference

All prompts follow this structure:
1. **Purpose**: When and why to use it
2. **Context**: Background/architecture
3. **Implementation**: Step-by-step guidance
4. **Checklist**: Validation criteria
5. **Examples**: Real code samples
6. **Pitfalls**: What NOT to do

---

**Quick Links**
- [Architecture Overview](../Architecture.md)
- [Module Interfaces](../src/modules/)
- [Test Examples](../src/__tests__/)
- [Performance Targets](#-performance-targets-sla)

---

*Last updated: April 2026*  
*Enterprise Grade • Modular Monolith • RAG Resume Search*
