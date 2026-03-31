---
title: Runtime Runbook
summary: Shared operating guide for agent bootstrap, task flow, review dispatch, routines, and troubleshooting
---

This is the operator runbook for the current Paperclip runtime. Use it when setting up agents, choosing workspace policy, or diagnosing why work is not moving. If this guide and runtime behavior ever disagree, trust the code in `server/src/services` and `packages/shared/src/constants.ts`.

## Source Documents

Keep these open while operating the system:

- [Managing Agents](/guides/board-operator/managing-agents)
- [Managing Tasks](/guides/board-operator/managing-tasks)
- [Agent Runtime Guide](/agents-runtime)
- [Adapters Overview](/adapters/overview)
- [Issues API](/api/issues)
- [Agents API](/api/agents)
- [Routines API](/api/routines)

## 1. Bootstrap Rules For Managed Agents

For managed local adapters, a healthy agent now requires the same four bootstrap files in two places:

- inside the managed instructions bundle
- inside `$AGENT_HOME`

Required files:

- `AGENTS.md`
- `HEARTBEAT.md`
- `SOUL.md`
- `TOOLS.md`

This integrity check applies to these adapter types:

- `claude_local`
- `codex_local`
- `cursor`
- `gemini_local`
- `opencode_local`
- `pi_local`

Operational rules:

- Run "Test environment" before saving agent config changes.
- Agent create/update is blocked when the environment test returns errors or blocking warnings.
- Broken bootstrap is now treated as an operational fault and surfaced as an auto-managed health alert issue.

## 2. Supported Adapter Families

| Adapter type | Use it for | Notes |
| --- | --- | --- |
| `claude_local` | Local Claude Code workers | Host CLI must be installed and authenticated |
| `codex_local` | Local Codex workers | Persists sessions; uses isolated `CODEX_HOME` inside managed worktrees |
| `gemini_local` | Local Gemini workers | Same heartbeat/runtime model as other local CLIs |
| `opencode_local` | Local OpenCode workers | Model list is discovered live in `provider/model` format |
| `openclaw` | External OpenClaw agents | Use for remote agent onboarding and webhook delivery |
| `process` | Scripts, probes, non-LLM workers | Good for deterministic local commands |
| `http` | External HTTP executors | Use when Paperclip should call a remote service |

Use local coding adapters for agents that need repo context and filesystem access. Use `process` or `http` when the task is operational automation instead of interactive coding.

## 3. Workspace And Worktree Policy

Paperclip now separates "where this task runs" from raw adapter `cwd`.

Default model:

- `shared_workspace` uses the project's primary workspace
- `isolated_workspace` uses a derived execution workspace, usually `git_worktree`
- `agent_default` leaves workspace handling to the adapter/runtime

Current guardrails:

- The `git_worktree` strategy is only meaningful when isolated workspaces are enabled.
- A `git_worktree` policy must resolve from a real project git checkout. If the project workspace is not a git repo, the heartbeat fails early with `execution_workspace_policy_violation`.
- Issue-level workspace settings may override the project default when enabled, but should still stay inside the declared workspace strategy rather than ad hoc `cwd` edits.

Codex-specific note:

- When `PAPERCLIP_IN_WORKTREE=true`, `codex_local` switches to a worktree-isolated `CODEX_HOME` so skills, sessions, and logs do not leak across checkouts.

## 4. Issue Lifecycle And Ownership

Current lifecycle:

```text
backlog -> todo -> claimed -> in_progress -> handoff_ready -> technical_review -> human_review -> done
              \______________________________/                     \-> changes_requested -/
                                       \-> blocked                          \-> blocked
```

Key rules:

- Enter `in_progress` from `todo`, `blocked`, or `changes_requested` via `POST /api/issues/{id}/checkout`.
- `claimed -> in_progress` is allowed after the issue is already explicitly claimed.
- Legacy `in_review` data is treated as `handoff_ready`.
- Do not checkout `handoff_ready`, `technical_review`, or `human_review` just to add operational context; leave a comment without reopening the execution lane.

The UI now exposes `currentOwner`, which answers "who acts now" instead of just "who is assigned":

- `handoff_ready`: the technical reviewer child issue, if one exists; otherwise an unassigned technical-review queue
- `human_review`: the board by default, or the explicit human/user assignee when set
- other active states: the assignee agent or user

This keeps the assignee field stable while still showing who should move the issue next.

## 5. Technical Review Dispatch

Moving a source issue to `handoff_ready` can dispatch technical review automatically.

Current dispatch contract:

- Reviewer is resolved by the agent reference `revisor-pr`.
- PR context is resolved in this order:
  1. attached work product of type pull request
  2. latest handoff comment containing a GitHub PR URL
  3. source issue description containing a GitHub PR URL
- Review children are created with `originKind='technical_review_dispatch'`.
- Dedup uses the current diff identity:
  - preferred: repository + PR number + head SHA
  - fallback: repository + PR number + handoff comment or description identity

Practical effect:

- same PR, new diff: a new review ticket can be opened
- same PR, same diff: the dispatcher reuses or reports the existing review ticket
- same PR, same code but a restored handoff comment explicitly says there was no new code/commit/push: the dispatcher treats it as the same diff and does not open a duplicate review ticket
- no PR reference: dispatch is a no-op and the operator must attach or mention the PR explicitly
- when the review child is closed with blocking findings, Paperclip requeues the source issue for the assigned executor and restores it to `in_progress`
- when the review child is closed without blocking findings, Paperclip advances the source issue to `human_review`
- this reconciliation also works when the reviewer posts the summary comment first and closes the review child in a later separate update
- manual child issues titled like `Revisar PR #... de ...` are reconciled the same way as dispatched review children, which helps clean up historical/manual review tickets
- when the source issue's pull-request work product is later updated to `merged` (or `closed` with merge metadata), Paperclip auto-reconciles the source issue to `done` and cancels any still-open technical-review child tickets for that PR

## 6. Routines And Compensation Loops

Use routines for recurring operational work, not as a substitute for missing issue transitions.

Rules that matter in practice:

- Agents can only create and manage routines assigned to themselves.
- Board operators can create or reassign routines for any agent.
- `coalesce_if_active` is the safest default for periodic nudges.
- `always_enqueue` is only appropriate when every trigger must become its own issue/run.

Recommended pattern:

- use assignment/comment wakes for normal task execution
- use scheduled routines for reconciliation, backlog opening, health sweeps, and other recurring control-plane work
- retire compensation routines once the runtime gains a first-class automation path

## 7. Health Monitoring And Observability

Two runtime signals matter most when you are operating the system:

### Agent health alerts

The native health monitor now creates or reuses corrective issues with `originKind='agent_health_alert'` when it detects:

- broken company membership or permissions
- stale heartbeat activity
- queue starvation
- adapter/runtime state mismatch
- managed bootstrap integrity failures
- adapter `testEnvironment` regressions

When the underlying problem disappears, the alert is automatically cancelled.

### Operational effect per run

Heartbeat runs now expose `operationalEffect`, which answers whether a completed run changed anything meaningful.

Signals include:

- comments
- status changes
- handoffs
- assignment changes
- checkouts
- document updates
- work product updates
- approvals
- issue creations

Interpretation:

- `Effect`: the run produced at least one meaningful mutation
- `No effect`: the run finished but only read state, coalesced, or exited without changing anything material

This is the fastest way to separate "the process ran" from "the system actually moved."

## 8. Troubleshooting

| Symptom | Likely cause | Operator action |
| --- | --- | --- |
| `409 Conflict` on checkout | Another run or agent already owns the issue | Do not retry. Move to another assignment or wait for the owning run to finish |
| Run fails with `execution_workspace_policy_violation` | `git_worktree` policy resolved from a non-git project workspace | Fix the project primary workspace first, then rerun |
| Health alert for `bootstrap_integrity` | Required bootstrap files are missing in bundle or `$AGENT_HOME` | Rebuild the managed instructions bundle and restore `AGENTS.md`, `HEARTBEAT.md`, `SOUL.md`, `TOOLS.md` |
| Issue reaches `handoff_ready` but no review ticket appears | No reviewer agent reference or no PR artifact could be resolved | Ensure `revisor-pr` exists and attach a pull-request work product or handoff comment with the GitHub PR URL |
| Routine creation fails for another agent | Agents cannot manage routines assigned to others | Create or reassign the routine as the board, or have the target agent own the routine |
| Run shows `No effect` | The heartbeat completed without operational mutations | Check the run log and issue comments; this may be valid for no-op triage or a sign the prompt is not driving action |

## 9. Minimal Operating Checklist

When the system feels off, verify these in order:

1. Agent config passes "Test environment".
2. Managed agents have all four bootstrap files in bundle and `$AGENT_HOME`.
3. Project workspace policy matches the repo reality, especially before enabling `git_worktree`.
4. The issue state is valid for the intended next action (`checkout`, `handoff_ready`, review, or human review).
5. The expected reviewer/worker agent exists and is not paused.
6. The latest run produced `Effect`; if not, read the run log before changing more config.
