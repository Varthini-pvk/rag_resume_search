Build a Node.js + Express modular monolith application for a RAG-based Resume Search system with the following requirements:

────────────────────────────────────
🏗️ ARCHITECTURE
────────────────────────────────────

* Modular monolith with domain modules:

  * health
  * db
  * embeddings
  * search (bm25, vector, hybrid)
  * llm (reranker, summarizer)
  * pipeline

* Use strict module boundaries:

  * Define interfaces for each service
  * Use dependency injection
  * No direct cross-module imports

* Each module contains:

  * controller/
  * service/
  * interface/
  * route/

────────────────────────────────────
🌐 API DESIGN
────────────────────────────────────

* REST API
* URL versioning: /api/v1/
* JSON request/response format

────────────────────────────────────
🔑 KEY ENDPOINTS
────────────────────────────────────

1. GET /api/v1/health

   * Returns service status and uptime

2. GET /api/v1/db/check

   * Validates MongoDB connectivity

3. POST /api/v1/embeddings

   * Input: { text: string, model?: string }
   * Output: embedding vector

4. POST /api/v1/search/bm25

   * Input: { query: string, indexName?: string }
   * Output: BM25-ranked resumes

5. POST /api/v1/search/vector

   * Input: { query: string, embeddingModel?: string }
   * Output: vector similarity results

6. POST /api/v1/search/hybrid

   * Input: { query: string }
   * Output: merged BM25 + vector results

7. POST /api/v1/llm/rerank

   * Input: { query: string, results: Resume[] }
   * Output: re-ranked results

8. POST /api/v1/llm/summarize

   * Input: { results: Resume[] }
   * Output: summarized insights

9. POST /api/v1/pipeline/search

   * Input: { query: string, topK?: number }
   * Output:
     {
     results: Resume[],
     summary: string
     }

────────────────────────────────────
🗄️ DATABASE DESIGN (MongoDB)
────────────────────────────────────
Collection: resumes

Fields:

* name, title, experienceYears
* skills[], education[], experience[]
* fullText (for BM25)
* embedding (vector array)
* metadata (flexible JSON)

 Example document:
            {
  "_id": {
    "$oid": "691db80aa895776f97b6eca6"
  },
  "text": "ASHWIN P is an experienced Automation QA Engineer with 3.3 years of hands-on experience in designing, developing, and executing automated test scripts for web and API applications. He is skilled in ensuring high-quality software delivery through robust automation frameworks and continuous integration processes. He has worked on projects involving automation testing of banking and retail applications, utilizing tools and technologies such as Selenium WebDriver, Java, TestNG, Maven, Jenkins, Git, Postman, and SQL. His responsibilities included analyzing business requirements, creating automation test strategies, developing automation scripts, integrating automation suites with Jenkins, validating API services, and maintaining version control using Git.",
  "embedding": [
  ],
  "name": "ASHWIN P",
  "email": "ashwinp@gmail.com",
  "phone": {
    Not Extracted
  },
  "location": "Chennai, India",
  "company": "Tcs",
  "role": "QA Engineer",
  "education": "B.E COMPUTER SCIENCE ENGINEERING",
  "total_Experience": 1.3,
  "relevant_Experience": 1.3,
  "skills": "[\"Selenium WebDriver\", \"TestNG\", \"Cucumber\", \"Maven\", \"Jenkins\", \"Java\", \"SQL\", \"Postman\", \"Git\", \"GitHub\", \"JIRA\", \"Agile\"]"
}

Indexes:

* Text index on fullText, skills, title
* Vector index on embedding field

────────────────────────────────────
🔍 SEARCH IMPLEMENTATION
────────────────────────────────────

BM25:

* Use MongoDB text index
* Score using textScore

Vector:

* Use MongoDB Atlas vector search
* Use cosine similarity

Hybrid:

* Run BM25 + vector in parallel
* Merge results using weighted scoring

Example:
finalScore = (bm25Score * 0.4) + (vectorScore * 0.6)

────────────────────────────────────
🧠 EMBEDDINGS
────────────────────────────────────

* Resume embeddings precomputed and stored
* Query embedding generated via Mistral API

────────────────────────────────────
🤖 LLM USAGE
────────────────────────────────────

Re-ranking:

* Apply to ALL retrieved documents
* Input: query + resumes
* Output: sorted results

Summarization:

* Always triggered
* Generate insights from final results

────────────────────────────────────
🧩 SERVICE IMPLEMENTATION BRIEF
────────────────────────────────────

HealthService:

* Returns uptime, status, timestamp

DBService:

* Establish MongoDB connection
* Provide connection health check

EmbeddingService:

* Calls Mistral embedding API
* Supports configurable model + dimensions

BM25Service:

* Executes MongoDB text search
* Returns score + documents

VectorService:

* Queries MongoDB vector index
* Computes similarity scores

HybridService:

* Merges BM25 + vector results
* Applies weighted scoring
* Deduplicates results

RerankerService:

* Calls LLM API
* Inputs query + results
* Outputs sorted list

SummarizerService:

* Calls LLM API
* Generates concise summary

PipelineService:

* Orchestrates entire flow:

  1. Generate embedding
  2. Run BM25 + vector
  3. Merge results
  4. Re-rank results
  5. Summarize output

────────────────────────────────────
⚠️ ERROR HANDLING
────────────────────────────────────

* Fail fast strategy
* Any failure → return error response
* Standard error format:
  {
  error: string,
  code: string,
  requestId: string
  }

────────────────────────────────────
📊 LOGGING
────────────────────────────────────

* Use structured logging (Pino or Winston)
* Include:

  * requestId
  * module
  * action
  * duration
* Log all external calls (DB, LLM, embeddings)

────────────────────────────────────
📦 INTERFACES (MANDATORY)
────────────────────────────────────
Define interfaces for all services:

* IBM25Service
* IVectorService
* IHybridService
* IEmbeddingService
* IRerankerService
* ISummarizerService

────────────────────────────────────
🚧 INCREMENTAL IMPLEMENTATION STRATEGY
────────────────────────────────────

Phase 1: Project Setup

* Create folder structure
* Setup Express app
* Add logger
* Setup config management

Phase 2: Core Infrastructure

* MongoDB connection module
* Health + DB check endpoints

Phase 3: Embeddings

* Implement Mistral embedding service
* Test embedding endpoint

Phase 4: Search Foundations

* Implement BM25 service
* Implement vector search service
* Add MongoDB indexes

Phase 5: Hybrid Search

* Implement parallel execution
* Add weighted merge logic

Phase 6: LLM Integration

* Implement reranker service
* Implement summarizer service

Phase 7: Pipeline Orchestration

* Build pipeline service
* Integrate all modules

Phase 8: API Completion

* Wire all controllers + routes
* Validate inputs

Phase 9: Observability

* Add request logging middleware
* Add correlation IDs

Phase 10: Testing

* Unit tests for services
* Integration tests for pipeline

────────────────────────────────────
📤 DELIVERABLES
────────────────────────────────────

1. Folder structure
2. Base Express app
3. Module scaffolding
4. Service interfaces
5. Sample implementations:

   * BM25
   * Vector
   * Hybrid merge
   * Pipeline
6. Example API request/response
7. Logging setup

Start by generating:

1. Folder structure
2. Base Express app
3. Logger setup
4. Config module
