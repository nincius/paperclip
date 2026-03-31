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

Outcome detection is based on the review summary comment format already used by the `Revisor PR`, including:

- `### Findings bloqueantes`
- `### Decisao operacional`
- phrases such as `retornar ... para in_progress`
- phrases such as `pode seguir para revisao humana`

## Files

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-review-outcome-reconciliation-routes.test.ts`
- `docs/api/issues.md`
- `docs/guides/board-operator/runtime-runbook.md`

## Validation

Focused route tests cover:

- blocking technical review child requeues the parent and returns it to `in_progress`
- non-blocking technical review child advances the parent to `human_review`
