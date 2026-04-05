# @paperclipai/db

## Unreleased

### Patch Changes

- Migration `0049_issues_agent_health_historical_lookup_idx`: partial index on `issues.updated_at` for `agent_health_alert` rows with `hidden_at` null (supports time-bounded historical alert scans).
- Schema `issues`: `agentHealthAlertHistoricalLookupIdx` mirrors that partial index.
- Migration runner: detect `CREATE`/`DROP INDEX CONCURRENTLY` after leading SQL comments so those statements are not wrapped in a transaction (Postgres rejects `CONCURRENTLY` inside a transaction block).
- Migration `0048_issue_open_status_partial_indexes`: rebuild `issues_open_routine_execution_uq` and `issues_open_agent_health_alert_uq` with `CREATE`/`DROP INDEX CONCURRENTLY` plus rename so partial-index `WHERE` stays aligned with shared open-status lists without long blocking locks.
- Schema `issues`: partial unique indexes `openRoutineExecutionIdx` / `openAgentHealthAlertIdx` derive the `status IN (...)` clause from shared `OPEN_ISSUE_STATUSES` to avoid drift.
- Migration `0046_agent_health_alerts`: before `issues_open_agent_health_alert_uq`, hide duplicate open `agent_health_alert` rows per `(company_id, origin_id)`; create the partial unique index **concurrently** on `(company_id, origin_id)` only (same `WHERE` as before) so production avoids long write locks.
- Migration `0047_company_technical_reviewer_reference`: add nullable `companies.technical_reviewer_reference`, `COMMENT ON COLUMN`, and index `idx_companies_technical_reviewer_reference` (manual rollback SQL noted at end of migration file).
- Migration `0045_issue_review_workflow`: rebuild `issues_open_routine_execution_uq` via `CREATE`/`DROP INDEX CONCURRENTLY` plus rename (avoids long blocking locks). Manual migrator runs `CONCURRENTLY` statements outside a transaction so Postgres accepts them.
- Empty-database bootstrap (`applyPendingMigrations`, `migratePostgresIfEmpty`) applies the SQL journal via the manual migrator instead of Drizzle `migrate()`, so migrations are not forced into a single transaction (required for `CONCURRENTLY`).

## 0.3.1

### Patch Changes

- Stable release preparation for 0.3.1
- Updated dependencies
  - @paperclipai/shared@0.3.1

## 0.3.0

### Minor Changes

- Stable release preparation for 0.3.0

### Patch Changes

- Updated dependencies [6077ae6]
- Updated dependencies
  - @paperclipai/shared@0.3.0

## 0.2.7

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.7

## 0.2.6

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.6

## 0.2.5

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.5

## 0.2.4

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.4

## 0.2.3

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.3

## 0.2.2

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.2

## 0.2.1

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.1
