# 2026-03-30 Reviewer Codex Session Recovery

## Context

The `Revisor PR` agent was switched from `claude_local` to `codex_local` with model `gpt-5.3-codex`.

Subsequent manual review runs failed immediately with:

- `Error: thread/resume: thread/resume failed: no rollout found for thread id ...`

The failing runs were reusing a persisted Claude session id (`919c11f4-...`) that does not exist in Codex rollout storage.

## Findings

1. The `codex_local` adapter already retries with a fresh session when it recognizes an "unknown session" error, but the new stderr variant `no rollout found for thread id ...` was not matched.
2. The UI-facing route `POST /api/agents/:id/heartbeat/invoke` did not propagate `forceFreshSession`, while `POST /api/agents/:id/wakeup` already did.

## Changes

- Extended Codex stale-session detection in `packages/adapters/codex-local/src/server/parse.ts` to treat `no rollout found for thread id` as an unknown-session error.
- Updated `server/src/routes/agents.ts` so `POST /api/agents/:id/heartbeat/invoke` forwards `forceFreshSession` into the run context, matching `POST /api/agents/:id/wakeup`.
- Added test coverage in:
  - `server/src/__tests__/codex-local-adapter.test.ts`
  - `server/src/__tests__/agent-permissions-routes.test.ts`

## Operational Recovery

To unblock the live instance immediately, the reviewer was re-invoked through:

- `POST /api/agents/:id/wakeup` with `forceFreshSession: true`

That produced run `141f0941-2637-44b9-970a-3157fe913399`, which skipped saved session resume and started a fresh Codex thread successfully.
