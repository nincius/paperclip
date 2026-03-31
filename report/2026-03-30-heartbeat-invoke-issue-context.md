# 2026-03-30 - Heartbeat Invoke Issue Context

## Context

Manual `heartbeat/invoke` calls were waking agents without issue context, even when the caller knew exactly which issue should be resumed. Operationally this showed up when `TCN-160` was reset to `todo` after a review-blocking finding: the board-triggered wake created a generic heartbeat instead of a task-scoped retry, so `Claudio` could wake without immediately re-entering the issue flow.

## Change

- `POST /api/agents/:id/heartbeat/invoke` now forwards optional issue-scoped fields from the request body into the heartbeat context:
  - `issueId`
  - `taskId`
  - `taskKey`
  - `commentId`
  - `wakeCommentId`
- Added route coverage in `server/src/__tests__/agent-permissions-routes.test.ts`.

## Expected Effect

- Manual invokes can preserve task scope instead of behaving like context-free heartbeats.
- Board/operator retries can wake an agent directly against a known issue when that is the intended action.
- This reduces false impressions that the agent "found nothing new" when the real problem was a context-free wake.
