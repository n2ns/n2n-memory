# Changelog

[中文版](./docs/CHANGELOG_zh.md)

---

All notable changes to this project will be documented in this file.

## [1.2.1] - 2026-01-12

### Added
- **Structured JSON Tool Responses**:
  - Upgraded all tool responses from plain text to structured JSON.
  - Added `status`, `message`, and `_protocol` metadata fields for better machine readability.
- **Dynamic N2N-SYNC Protocol Reminders**:
  - Implemented automatic injection of `[N2N-SYNC]` protocol reminders into `nextSteps`.
  - Embedded protocol hints in tool metadata to guide AI assistants toward better synchronization habits.
- **Similarity-Based Observation Deduplication**:
  - New `similarity.ts` utility module with Jaccard similarity, Levenshtein distance, and containment detection algorithms.
  - `addEntities()` and `addObservations()` now use intelligent deduplication instead of exact-match `Set` deduplication.
  - Automatically keeps the longer (more detailed) observation when duplicates are detected.
  - Prevents redundant entries like "version 2.4.1" and "version 2.4.1 is the current release" from coexisting.
- **Fuzzy Search with Relevance Ranking**:
  - `n2n_search` tool now supports fuzzy matching by default.
  - New optional parameters: `fuzzy` (boolean) and `minScore` (0-1 threshold).
  - Search results are ranked by relevance score (highest first).
  - Handles typos via Levenshtein similarity.
  - Supports word-level partial matching and semantic similarity via Jaccard index.
- **New Unit Tests**:
  - Comprehensive test suite for all similarity functions (`similarity.test.ts`).
  - 99 tests passing.

## [1.1.0] - 2024-12-19

### Added
- Bilingual documentation support: 
  - Separated `README` into English and Chinese.
  - All supplemental docs (`API_REFERENCE`, `DESIGN`, `DEVELOPMENT`, `CHANGELOG`) are now bilingual and cross-linked.
- **Infrastructure Hardening**:
  - Updated `engines` field in `package.json` to require Node.js >= 20 and npm >= 10 (aligned with MCP SDK).
  - Implemented runtime environment check (Node & npm) during MCP server startup to prevent deployment issues.
- **Dependency Maintenance**:
  - Upgraded all dependencies to their latest stable versions (including `sinon`, `typescript`, `eslint`, etc.).
  - Verified zero vulnerabilities and zero outdated packages.
- **High-Reliability Architecture**:
  - Implemented **Dual-Buffer Service**:
    - **Snapshot Buffer**: In-memory cache for ultra-fast reads.
    - **Write Queue**: Sequentialized background writes to prevent data corruption.
  - **Atomic Persistence**: Uses temporary file swaps to ensure JSON integrity during crashes.
  - **Cross-Process Locking**: Integrated `proper-lockfile` to handle multiple IDE windows accessing the same project.
  - **AI-Driven Path Pinning**: Updated tool descriptions to guide AI assistants to report project paths at session start.
  - **Clean Architecture & SDK Modernization**:
    - Migrated to the latest `@modelcontextprotocol/sdk` high-level `McpServer` API.
    - Resolved `Server` class deprecation warnings (TS6385).
    - Decentralized `index.ts` into a maintainable directory structure:
      - `/core`: Domain logic (MemoryService, MemoryManager).
      - `/tools`: Tool definitions and Zod schemas.
      - `/handlers`: Pure request dispatching logic via `registerAll`.
      - `/utils`: Environment and system utilities.
    - **Hot/Cold Data Separation (Project Context)**:
      - Introduced `context.json` to store high-frequency "Hot State" (active tasks, status, next steps).
      - Isolated memory graph in `memory.json` to preserve architectural "Cold Knowledge".
      - Implemented independent physical locking (`proper-lockfile`) and memory mutexes for `context.json`.
      - New tool `n2n_update_context` with mandatory Git-Sync protocol enforcement.
      - `n2n_read_graph` now performs a "Unified Read" returning both Knowledge Graph and Active Context.
    - **N2N-SYNC Protocol Enforcement**:
      - Hardcoded mandatory synchronization constraints into MCP tool metadata.
      - Every session start (`n2n_read_graph`) now binds the AI to a "Memory Update before Git Commit" policy.
      - Added `[MANDATORY PROTOCOL]` and `[HARD CONSTRAINT]` tags to write tools to prevent context drift during refactoring.
    - Improved test coverage and fixed cross-module import paths.
- Initial `CHANGELOG.md` to track project evolution and technical discoveries.

### Fixed
- **NPM Publishing Compatibility**: Identified and documented requirements for Trusted Publishing (OIDC).
  - **Discovery**: NPM CLI version 10.x may have issues with OIDC-based publishing.
  - **Recommendation**: Use Node.js 20+ LTS with npm 10+ for reliable publishing.

## [1.0.0] - Prior to 2024-12-19

### Added
- Core MCP functionality for project-local memory isolation.
- Cognitive persistence at `[Project Root]/.mcp/memory.json`.
- Tools: `n2n_add_entities`, `n2n_add_observations`, `n2n_create_relations`, `n2n_read_graph`, `n2n_search`.
