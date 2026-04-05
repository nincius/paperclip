# 2026-03-30 PR Merge Auto-Complete

## Context

Source issues were remaining in `handoff_ready` or `human_review` even after the linked GitHub PR had already been approved and merged. In practice this forced a human operator to:

1. approve or merge the PR in GitHub
2. return to Paperclip
3. manually walk the issue to `done`

This also left stale technical-review child issues behind when the merge had already happened.

## Change

Paperclip now reconciles source issues automatically when a pull-request work product is updated to a merged state.

Implemented behavior:

- Trigger point: `POST /api/issues/:id/work-products` and `PATCH /api/work-products/:id`
- Merge detection:
  - `status = merged`
  - or `status = closed` with explicit merge metadata such as `merged=true`, `isMerged=true`, `state=merged`, `status=merged`, `mergedAt`, or `merged_at`
- Source issue reconciliation:
  - `handoff_ready -> technical_review -> human_review -> done`
  - `technical_review -> human_review -> done`
  - `human_review -> done`
- **Selection logic (not three alternate system paths):** the server applies **one state-dependent chain** in order. It reads the source issue’s current status, then walks forward **only through the steps that still apply**: from `handoff_ready` it may perform up to three updates; from `technical_review` at most two; from `human_review` a single transition to `done`. It **skips** steps whose source status is already past (for example, an issue already in `human_review` only runs `human_review -> done`). These bullets are therefore **possible prefixes** of the same linear machine, not competing branches the runtime chooses between at random.
- Open child issues with `originKind = technical_review_dispatch` (and legacy manual review titles matching `Revisar PR #…`) are cancelled in the **same database transaction** as the parent reaching `done`, so the control plane does not persist “parent `done` with still-open review children” when cancellation fails mid-flight. Nested `issueService.update` calls run under Drizzle’s transaction/savepoint model so parent transitions and child `cancelled` updates commit or roll back together. After commit, routine run sync and activity logging run **outside** that transaction; failures there leave issues correctly updated in the DB but may delay routine finalization or omit an activity row until a retry (see runbook).

### Why merge detection checks multiple fields

Integrations send **different shapes**: REST vs webhook payloads, provider quirks, and historical GitHub field naming. The server therefore treats **`issue_work_products.status === merged`** as authoritative when set, and when status is **`closed`** it inspects **metadata** for any of: `merged`, `isMerged`, `state === "merged"`, `status === "merged"`, non-empty string `mergedAt`, non-empty string `merged_at`. That covers common camelCase/snake_case timestamps and boolean flags without requiring a single canonical JSON shape from every caller.

**Test coverage:** route tests in `server/src/__tests__/issue-work-product-pr-reconciliation-routes.test.ts` assert the **happy path** (`status: merged` with `metadata.merged`) and **closed without merge evidence** (`status: closed`, `merged: false`) so unmerged closes do not auto-complete. **Automated tests do not exhaust every metadata variant** (`isMerged`, `merged_at` strings, etc.); those variants are accepted by `isMergedPullRequestProduct` in `server/src/routes/issues.ts` and should be spot-checked when changing that helper or adding a new integration. Work-product route tests use **UUID** ids for `PATCH /api/work-products/:id` because `router.param("id")` also resolves human-readable issue keys (`PAP-1`); tokens like `wp-1` match the same pattern and were incorrectly normalized as issue identifiers.

### Operational characteristics

- **Idempotency:** Re-sending the same merged work product (or repeating `PATCH` with merge signals) is safe. `reconcileMergedPullRequestIssue` returns immediately when the source issue is already `done` or `cancelled`, without duplicating child cancellations or emitting another auto-complete activity for the same terminal state.
- **Reconciliation state machine:** `handoff_ready -> technical_review -> human_review -> done` (full path), or shorter prefixes when the issue already advanced. No other statuses are moved by this hook.
- **Failure behavior:**
  - **Inside the DB transaction:** any thrown error (including failed child cancel) rolls back **all** issue updates in that reconciliation attempt—no partial “parent `done` + active children.” The API call that updated the work product may still return **200** with the updated work product if the failure happens after the work-product write; the handler will surface **500** if reconciliation throws before the response is sent. A **retry** of the same merged payload re-enters reconciliation idempotently.
  - **After commit:** `routineService.syncRunStatusForIssue` failures are **logged and swallowed** (parent and per-child); issues remain `done` / `cancelled` in the DB. Operators should check logs and routine run rows if execution-linked issues look stuck.
- **Retry policy:** There is **no** server-side queue or exponential backoff for this path—only what the **client** retries. Transient DB errors should be retried by the caller; validation/conflict errors surface as HTTP errors from `issueService.update`.
- **Logging (structured fields for operators / log aggregation):**
  - **Success:** `logger.info` with `event: "issue.pr_merge_auto_complete"`, `issueId`, `workProductId`, `transitions`, `cancelledChildIssueCount`, `cancelledChildIssueIds`.
  - **Transaction failure:** `logger.warn` with `issue.pr_merge_auto_complete transaction failed`, `issueId`, `workProductId`, `err`.
  - **Post-commit routine sync failure:** `logger.warn` with `routine sync failed after PR merge auto-complete (parent)` or `... child cancel`, including `issueId`, `childIssueId` (child path), `workProductId`, `err`.
- **Metrics (recommended, not yet emitted as Prometheus counters):** `auto_complete_attempts` (count reconciliation entries), `auto_complete_successes`, `auto_complete_transaction_failures`, `auto_complete_post_commit_sync_failures`. Use the `event` / message strings above until metrics exist. **Correlation:** reuse the request’s trace/correlation id if your deployment injects one into `pino` bindings; the structured fields above are the stable join keys.

## Files

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-work-product-pr-reconciliation-routes.test.ts`
- `docs/api/issues.md`
- `docs/guides/board-operator/runtime-runbook.md`

## Validation

Focused route tests cover:

- merged PR work product auto-completes the source issue and cancels open review children
- closed-but-unmerged PR work product does not auto-complete the issue.
