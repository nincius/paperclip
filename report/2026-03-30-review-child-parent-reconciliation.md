# 2026-03-30 Review Child Parent Reconciliation

## Context

Technical review child issues (`originKind = technical_review_dispatch`) were being completed correctly, but the source issue was not being reconciled automatically.

This left two broken outcomes in production:

- blocking review comments stayed only in the child review issue while the source issue remained stuck in `handoff_ready`
- clean reviews did not advance the source issue to `human_review`

Operationally this forced manual intervention to move the source issue back to the executor or forward to the board.

## Change

`PATCH /api/issues/:id` now reconciles the parent issue when a technical-review child issue is completed with a review summary comment.

Implemented behavior:

- if the child review summary indicates blocking findings:
  - wake the parent assignee
  - checkout the parent issue for that new run
  - move the parent issue back to `in_progress`
- if the child review summary indicates no blocking findings:
  - advance the parent issue from `handoff_ready -> technical_review -> human_review`
  - or from `technical_review -> human_review` when already in review

### Review summary parser (`classifyTechnicalReviewOutcome`)

Canonical implementation: `server/src/services/technical-review-outcome.ts` (see also `doc/plans/2026-04-05-review-outcome-classification-matrix.md`).

**What is validated**

- **Blocking / return-to-executor:** `retornar` … `` `in_progress` `` (with Markdown backticks) **or** the same intent with the token `in_progress` after normalization (accents are folded via NFD + combining marks only; backticks are preserved).
- **Approved (phrase):** e.g. `pode seguir para revisao humana`, `pronto para revisao humana`, `aprovado/aprovada para revisao humana`, and the English phrases listed in the matrix doc.
- **Approved / blocking (section):** a `### Findings bloqueantes` / `### Blocking findings` / `### Blocking (N)` section; empty or explicit “none” wording (`nenhum`, `none`, `n/a`, …) → approved; otherwise → blocking.
- **Ambiguity:** mixed signals (e.g. an approved phrase together with a non-empty blocking section, or “return to `in_progress`” together with an empty blocking section) → **no** automated classification (`null`).

**When parsing fails or is ambiguous (`null`)**

- The **child** issue still closes as requested (`done`); the **parent** issue is **not** auto-transitioned.
- The server emits a **structured warning** log (`technical review child closed but outcome text did not classify; parent issue left unchanged for manual follow-up`).
- An activity entry **`issue.review_outcome_unparsed`** is written on the **review child** (`reason: no_classified_outcome`, plus `parentIssueId` when present) so operators can filter the activity log / dashboards for manual follow-up.

**Format drift / monitoring**

- Watch for rising **`issue.review_outcome_unparsed`** rates after Revisor PR template or wording changes.
- Correlate with server **warn** logs containing the same message; add alerts if your platform aggregates log volume by message or by `reviewIssueId`.
- Prefer keeping the dispatched child **Definition of Done** block aligned with the matrix doc so new summaries stay classifiable.

Outcome detection is based on the review summary comment format already used by the `Revisor PR`, including:

- `### Findings bloqueantes`
- `### Decisao operacional`
- phrases such as `retornar ... para in_progress`
- phrases such as `pode seguir para revisao humana`

## Files

- `server/src/routes/issues.ts`
- `server/src/services/technical-review-outcome.ts`
- `server/src/__tests__/issue-review-outcome-reconciliation-routes.test.ts`
- `server/src/__tests__/technical-review-outcome.test.ts`
- `docs/api/issues.md`
- `docs/guides/board-operator/runtime-runbook.md`
- `doc/plans/2026-04-05-review-outcome-classification-matrix.md`

## Validation

**Happy-path route tests (existing)**

- blocking technical review child requeues the parent and returns it to `in_progress`
- non-blocking technical review child advances the parent to `human_review`

**Edge-case route tests (named)**

| Test | Scenario | Expected handling |
| --- | --- | --- |
| `test_blocking_review_malformed_summary` | Closing comment is vague (e.g. “Looks good”) | No parent transition; **`issue.review_outcome_unparsed`**; warn log |
| `test_nonblocking_review_missing_format_markers` | PT prose without `###` markers or approval phrases | Same as above |
| `test_review_ambiguous_phrases` | Blocking section + approved phrase in the same body | Classification `null`; no parent transition; **`issue.review_outcome_unparsed`** |
| `test_parent_in_unexpected_state` | Valid approved summary but parent already `done` | Early exit: no parent updates, no `issue.review_outcome_reconciled`, no unparsed activity (outcome is classified but parent is terminal) |

**Unit tests:** `technical-review-outcome.test.ts` covers ambiguous phrase pairs and section/phrase conflicts.

Unit / route tests: `pnpm exec vitest run server/src/__tests__/technical-review-outcome.test.ts server/src/__tests__/issue-review-outcome-reconciliation-routes.test.ts`.
