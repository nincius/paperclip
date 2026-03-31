# 2026-03-31 Review Loop Hardening From TCN-338

## Context

`TCN-338` exposed two workflow problems around technical review:

1. the same PR could receive duplicate review tickets when a restored handoff comment explicitly said there was no new diff
2. some historical/manual review child issues did not reconcile the parent issue state after the review completed

## Changes

- Hardened `reviewDispatchService` so comment-based handoffs that explicitly declare there was no new code/commit/push reuse the prior review ticket for the same PR instead of opening a duplicate review
- Broadened parent reconciliation so manual child issues that clearly match the review-ticket pattern (`Revisar PR #... de ...`) follow the same outcome propagation rules as `technical_review_dispatch` children
- Reused the same broader review-child detection when cancelling still-open review children after PR merge reconciliation

## Files

- `server/src/services/review-dispatch.ts`
- `server/src/routes/issues.ts`
- `server/src/__tests__/review-dispatch.test.ts`
- `server/src/__tests__/issue-review-outcome-reconciliation-routes.test.ts`
- `docs/api/issues.md`
- `docs/guides/board-operator/runtime-runbook.md`

## Validation

- `npx pnpm vitest run server/src/__tests__/review-dispatch.test.ts`
- `npx pnpm vitest run server/src/__tests__/issue-review-outcome-reconciliation-routes.test.ts`

## Expected Effect

- Restored handoffs that explicitly say there is no new diff stop creating redundant review issues for the same PR
- Historical/manual review tickets no longer leave the parent issue stuck after the review decision is already known
