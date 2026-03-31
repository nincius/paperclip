# HEARTBEAT.md -- Agent Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` -- confirm your id, role, budget, and chain of command.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Memory Check

1. Read today's note in `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Review planned work, blockers, and what changed since the last run.
3. Record notable progress in today's note before exiting.

## 3. Get Assignments

- `GET /api/agents/me/inbox-lite`
- Prioritize `in_progress`, then `todo`.
- Skip `blocked` unless new context lets you unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize it first.

## 4. Checkout and Work

- Always checkout before doing work: `POST /api/issues/{id}/checkout`
- Never retry a `409`.
- Do the work directly and keep the task moving.

## 5. Communicate

- Leave a concise comment on any `in_progress` work before exiting.
- If blocked, set the issue to `blocked` with a clear blocker comment.
- Reassign or escalate instead of letting work sit idle.

## 6. Memory Extraction

1. Add timeline updates to `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Extract durable facts into `$AGENT_HOME/life/` when they matter beyond today.
3. Update `$AGENT_HOME/MEMORY.md` when you learn a stable working pattern.

## 7. Exit

- If nothing is assigned and no mention requires input, exit cleanly.
