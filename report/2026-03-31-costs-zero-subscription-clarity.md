# Costs zero with active usage: metered cost capture + subscription clarity

## Problem

The Paperclip costs surfaces were showing `$0.00` across the board even though the instance had heavy active usage.

There were two different reasons:

1. `codex_local` was not propagating `total_cost_usd` into the adapter result, so any metered Codex run would also be dropped on the floor.
2. The current instance is dominated by `subscription_included` billing, which correctly produces zero billed cents while still recording large token volumes and run counts. The UI exposed the dollar total prominently without explaining that zero spend can coexist with real subscription-covered usage.

## Changes

### Adapter/runtime

- `packages/adapters/codex-local/src/server/parse.ts`
  - now extracts `total_cost_usd` / `cost_usd` from Codex `turn.completed` and `turn.failed` events
- `packages/adapters/codex-local/src/server/execute.ts`
  - now forwards parsed `costUsd` instead of hardcoding `null`
- `server/src/__tests__/codex-local-adapter.test.ts`
  - now covers cost extraction from Codex stdout

### UI clarity

- `ui/src/pages/Costs.tsx`
  - top summary now separates billed spend from subscription usage
  - overview adds an explicit "subscription-covered usage" explanation when spend is zero but usage exists
  - wording now says "billed spend" instead of implying all usage should map to dollars
- `ui/src/pages/AgentDetail.tsx`
  - inline costs section now explains zero billed cost when usage exists under subscription-covered runs

## Expected outcome

- Metered Codex runs can now populate `cost_events` with non-zero billed dollars when the provider reports cost.
- Subscription-heavy instances no longer look broken just because billed spend is zero; the UI now makes it explicit that usage exists and is covered by subscription billing.
