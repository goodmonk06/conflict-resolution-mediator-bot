# Changelog

All notable changes to the Conflict Resolution Mediator Bot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-18

### Added - Phase 3: Deep Expansion

**Domain Model Expansion:**
- Added `MediatorProfile` entity with skills, availability, and performance tracking
- Added `CommunityProfile` entity for community-specific configuration and policies
- Added `MediationTemplate` entity for reusable workflow templates
- Added `ConflictCategory` entity with hierarchical taxonomy support
- Added `Resolution` entity to track outcomes and follow-ups
- Added `MediatorAssignment` entity for load-balanced case assignment
- Added `CaseCategory` junction table for many-to-many categorization
- Added `AuditLog` entity for complete audit trail
- Added `CasePriority` enum (low, medium, high, critical)
- Added `AvailabilityStatus` enum for mediator availability
- Added `ResolutionOutcome` enum with 5 outcome types

**Extension & Integration Architecture:**
- Created `INotificationAdapter` interface with console and no-op implementations
- Created `IMetricsAdapter` interface with in-memory and console implementations
- Added centralized metrics manager with domain-specific tracking
- Added event system with strongly-typed domain events
- Added `EventBus` for event-driven architecture (in-memory, swappable to Redis/Kafka)
- Event types: ConflictDetected, CaseCreated, CaseStatusChanged, CaseAssigned, StepCompleted, ResolutionReached

**CLI Tools:**
- Added `mediator-cli` with multiple commands:
  - `stats` - System statistics with optional community filtering
  - `assign-case` - Assign cases to mediators
  - `list-cases` - List and filter cases
  - `export-report` - Export CSV reports with date filtering
  - `clean-old-data` - Archive/delete old resolved cases

**Observability & Metrics:**
- Added centralized metrics system with adapters
- Metrics for: detections, cases, API requests, mediators
- Support for counters, gauges, and histograms
- Metrics endpoint ready for Prometheus export

**Testing:**
- Added comprehensive integration tests for detection flow
- Tests cover: ingestion, detection, case creation, retrieval, updates, error handling
- Test coverage for rule-based detector with multiple scenarios

**Documentation:**
- Added `PHASE3_OVERVIEW.md` with detailed implementation plan
- Added this CHANGELOG
- Enhanced inline code documentation

### Added - Phase 2: Foundation & Consistency

**DX & Scripts:**
- Added `lint` and `lint:fix` scripts for ESLint
- Added `typecheck` for TypeScript checking
- Added `format` and `format:check` for Prettier
- Added `db:push` and `db:reset` database scripts
- Added root-level orchestration scripts
- Added ESLint configuration for backend
- Added Prettier configuration (shared across workspace)
- Added testing scripts: `test`, `test:watch`, `test:coverage`

**Docker & Infrastructure:**
- Added `Dockerfile` for backend with multi-stage build
- Added `Dockerfile` for frontend with Next.js standalone output
- Enhanced `docker-compose.yml` with backend and frontend services
- Added `docker-compose.dev.yml` for local development (DB only)
- Added Docker healthchecks and restart policies
- Added Docker networking between services
- Updated Next.js config for standalone output

**Dependencies:**
- Added ESLint and TypeScript ESLint plugins
- Added Prettier
- Added Vitest coverage plugin
- Added Commander for CLI
- Added eslint-config-next for frontend

### Changed

- Improved package.json scripts organization across all packages
- Enhanced README structure (will be further updated in Phase 3+)
- Updated MediationCase model with priority, closedAt, and new relations
- Improved error handling consistency

### Fixed

- TypeScript strict mode compatibility
- Docker build context issues
- Package workspace script orchestration

---

## [1.0.0] - 2025-11-18

### Initial Release

**Core Features:**
- AI-powered conflict detection using OpenAI GPT-4
- Rule-based fallback detection with keyword matching and heuristics
- Complete mediation workflow management
- REST API built with Fastify
- Next.js admin panel for case management
- PostgreSQL database with Prisma ORM
- Comprehensive seed data with demo scenarios
- Docker support

**Domain Model:**
- ConversationThread
- ConflictSignal
- MediationCase
- MediationStep

**API Endpoints:**
- `/api/detection/ingest` - Ingest and analyze conversations
- `/api/detection/status` - Detection service status
- `/api/cases/*` - Case management CRUD operations
- `/api/signals/*` - Signal browsing and filtering
- `/api/threads/*` - Thread management

**UI Features:**
- Dashboard with statistics
- Cases list with filtering
- Case detail view with step tracking
- Signals browser with conflict summaries
- Markdown rendering for AI suggestions

**Documentation:**
- Comprehensive README with quick start guide
- API usage examples
- Ethical boundaries and responsible use guidelines
- Deployment instructions

---

## Future Releases

### Planned for Phase 4+ (Future)

- Real-time conflict detection via WebSockets
- Machine learning model training for improved accuracy
- Multi-language support
- Advanced analytics dashboard
- Mobile app for mediators
- Integration marketplace
- Automated resolution recommendations
- Video/audio call mediation support
- Community health scoring
- Slack/Discord bot integrations
- Webhook integrations
- Custom detection plugins
- RBAC and multi-tenancy
- SSO integration
- Backup and restore utilities
