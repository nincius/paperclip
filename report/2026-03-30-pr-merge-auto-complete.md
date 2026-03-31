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
- Open child issues with `originKind = technical_review_dispatch` are cancelled once the source issue is auto-completed

## Files

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-work-product-pr-reconciliation-routes.test.ts`
- `docs/api/issues.md`
- `docs/guides/board-operator/runtime-runbook.md`

## Validation

Focused route tests cover:

- merged PR work product auto-completes the source issue and cancels open review children
- closed-but-unmerged PR work product does not auto-complete the issue
