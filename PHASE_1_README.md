# Phase 1: Project Setup - README

## ✅ Completed in Phase 1

### 1. **Folder Structure**
```
src/
├── config/              # Configuration management
├── modules/
│   ├── shared/         # Shared utilities (logger, errors)
│   └── health/         # Health check module (phase 1)
├── __tests__/          # Test directory
├── app.ts              # Express app factory
└── index.ts            # Entry point
```

### 2. **Core Files Created**

**Configuration & Setup**
- `package.json` — Dependencies & scripts
- `tsconfig.json` — TypeScript strict mode config
- `.env.example` — Environment variables template
- `jest.config.js` — Jest testing configuration
- `.gitignore` — Git ignore rules

**Shared Utilities**
- `src/modules/shared/logger.ts` — Pino logger (ILogger interface)
- `src/modules/shared/errors.ts` — Custom error types & helpers

**Application Core**
- `src/config/index.ts` — Config loader with validation
- `src/app.ts` — Express app factory with middleware
- `src/index.ts` — Application bootstrap with graceful shutdown

**Health Module** (Test module for Phase 1)
- `src/modules/health/interface/health.interface.ts` — IHealthService interface
- `src/modules/health/dto/health.response.dto.ts` — Health response DTO
- `src/modules/health/service/health.service.ts` — Health check logic
- `src/modules/health/controller/health.controller.ts` — HTTP handler
- `src/modules/health/route/health.route.ts` — Route definitions
- `src/modules/health/health.module.ts` — Module factory
- `src/modules/health/index.ts` — Public exports

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your values
# IMPORTANT: Set at least:
# - MONGODB_URI
# - MISTRAL_API_KEY
# - LLM_API_KEY
```

### 3. Type Check
```bash
npm run type-check
# Should print: ✓ No TypeScript errors
```

### 4. Start Development Server
```bash
# Terminal 1: Development mode (hot reload)
npm run dev

# You should see:
# 🚀 Resume Search RAG listening on port 3000
```

### 5. Test Health Endpoint
```bash
# Terminal 2: Test the API
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-04-17T10:30:00.000Z",
  "uptime": 2.5,
  "components": {
    "app": {
      "status": "healthy",
      "latency": 0.5
    }
  },
  "version": "0.1.0"
}
```

### 6. Check Root Endpoint
```bash
curl http://localhost:3000/

# Returns:
{
  "service": "Resume Search RAG",
  "version": "0.1.0",
  "status": "running",
  "documentation": "/api/v1/health"
}
```

---

## 📊 Architecture Overview (Phase 1)

### Module Structure Pattern

Every module follows this structure:

```
src/modules/{moduleName}/
├── interface/          # Service contracts (IXxxService)
├── dto/               # Data transfer objects
├── service/           # Business logic
├── controller/        # HTTP handlers
├── route/             # Express routes
├── {module}.module.ts # Module factory
└── index.ts           # Public API
```

### Dependency Injection

The health module demonstrates DI:

```typescript
// 1. Define interface
export interface IHealthService { }

// 2. Implement in service
export class HealthService implements IHealthService { }

// 3. Inject in controller
constructor(private readonly healthService: IHealthService) { }

// 4. Wire in module factory
new HealthModule(logger)
```

### Error Handling

Standard error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "correlation-id-123",
  "timestamp": "2026-04-17T10:30:00.000Z",
  "details": {}
}
```

### Logging

Every action is logged with:
- `action`: What happened (e.g., "health_check_completed")
- `module`: Which module (e.g., "health")
- `requestId`: Correlation ID for tracing
- `duration`: Time taken (ms)

```bash
# Check logs
npm run dev 2>&1 | grep "action"
```

---

## 📋 Scripts Available

```bash
# Development
npm run dev          # Start with hot reload

# Building
npm run build        # Compile TypeScript → dist/
npm run start        # Run compiled app

# Quality
npm run type-check   # TypeScript check
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix linting issues
npm run test         # Run tests once
npm run test:watch   # Watch tests
npm run test:coverage # With coverage report

# Maintenance
npm run clean        # Remove dist/, coverage/, cache
```

---

## 🔧 Configuration Notes

### Required Environment Variables
- `MONGODB_URI` — MongoDB connection string
- `MISTRAL_API_KEY` — Mistral API key for embeddings
- `LLM_API_KEY` — OpenAI API key for LLM services

### Optional (Defaults Provided)
- `NODE_ENV` — development | production | test
- `PORT` — Default: 3000
- `LOG_LEVEL` — Default: info

### Feature Flags
- `ENABLE_RERANKING` — Enable LLM reranking (default: true)
- `ENABLE_SUMMARIZATION` — Enable summarizer (default: true)
- `ENABLE_VECTOR_SEARCH` — Enable vector search (default: true)

---

## ✨ Enterprise Standards Implemented

✅ **TypeScript Strict Mode** — All strict compiler options enabled  
✅ **Dependency Injection** — Interfaces first, then implementations  
✅ **Structured Logging** — Pino logger with correlation IDs  
✅ **Error Handling** — Typed ServiceError with codes  
✅ **Config Management** — Validated on startup, fail fast  
✅ **Security Middleware** — Helmet, CORS, rate limiting ready  
✅ **Graceful Shutdown** — Proper signal handling  
✅ **Module Boundaries** — No cross-module imports  

---

## 📈 What's Next (Phase 2)

After Phase 1 is verified:

- MongoDB connection module (db service)
- DB health check integration
- Embeddings service (Mistral API)
- BM25 search service
- Vector search service
- Complete test coverage

---

## 🆘 Troubleshooting

### "Cannot find module 'pino-pretty'"
```bash
# pino-pretty is optional for development
npm install --save-dev pino-pretty
```

### "MONGODB_URI not set"
```bash
# Copy and edit .env file
cp .env.example .env
# Edit MONGODB_URI value
```

### TypeScript errors
```bash
# Ensure strict mode violations are fixed
npm run type-check

# Common: missing types
npm install --save-dev @types/your-package
```

### Port already in use
```bash
# Check what's using port 3000
lsof -i :3000

# Or use different port
PORT=3001 npm run dev
```

---

## 📚 Reference

- **Prompts**: See `.github/prompts/` for generation templates
- **Instructions**: See `.github/copilot-instructions.md` for standards
- **Architecture**: See `Architecture.md` for full spec

---

**Phase 1 Complete! ✅**  
Ready for Phase 2: Core Infrastructure (Database module)
