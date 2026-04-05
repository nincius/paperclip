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
- Prioritize `in_progress`, then `changes_requested` (rework after review), then `todo` / `claimed`.
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

## 6. Direct merge delegate (executors)

When the server wakes you after **technical review approved** with payload `mutation: "review_approved_merge_delegate"` (often with `contextSnapshot.pullRequestUrl`, `pullRequestNumber`, `workProductId`):

1. Confirm the GitHub PR is **not draft** and is the one linked to the task.
2. **Merge strategy (explicit runtime signal only—do not guess).** You **must** consult the configured **operator merge mode** from **one** documented runtime source for this deployment—**never** infer it from heuristics alone. **Do not** infer the strategy from the PR body, labels, branch names, CI status, or repository layout alone—those may correlate with `.github/workflows/direct-merge-eligible.yml` but are **not** a substitute for the configured signal. Use whichever single source your operator documents, for example:
   - Environment variable **`MERGE_STRATEGY`**
   - Operator API endpoint **`/operator/merge-strategy`** (e.g. **`GET /operator/merge-strategy`** if your deployment exposes it)
   - Agent context key **`"operator.mergeStrategy"`** (wake payload, task context, or company settings your operator documents)

   **After you resolve the strategy:**

   - **Skip your own `gh pr merge` (step 3) only when** the resolved strategy value is **exactly** `action-only` **and** the PR description contains the literal validation token **`direct_merge_eligible`** inside the marker your operator uses (e.g. HTML comment `<!-- direct_merge_eligible -->` that `.github/workflows/direct-merge-eligible.yml` matches). Treat the marker as **invalid** if the inner token is not exactly `direct_merge_eligible` (case and spelling per runbook)—in that case do **not** assume Action-only delegation; fall back to the safe default below.
   - If the strategy is **missing**, **unknown**, **invalid**, or **not documented for this deployment**, use a **safe fallback**: defer merge completion to the human/operator—**hybrid-safe** behavior is to **not** perform an automatic `gh pr merge` locally, avoiding a race with the GitHub Action **`.github/workflows/direct-merge-eligible.yml`** when you lack an explicit runtime merge-strategy signal. Prefer the same fallback whenever you cannot confidently resolve the configured source.
   - If the strategy is **known** and **not** `action-only`, follow the operator’s runbook for that value (often: you **do** run `gh pr merge` when you are the delegated executor).
3. **`gh pr merge` (GitHub merge execution; run only when step 2 authorizes you to merge locally):** use the repo’s usual method (typically `gh pr merge <n> --squash` from the correct checkout).
   - **Transient failures:** retry with **exponential backoff** (bounded attempts, capped total wait, increasing delay) on rate limits, network blips, timeouts, or GitHub **5xx**; **log each attempt** with error class and backoff interval.
   - **Deterministic failures:** **detect** merge conflicts, failing required checks, branch protection denials, and auth/permission errors; **stop retrying**, **log** with a stable **failure class** (e.g. `merge_conflict`, `checks_failed`, `permission_denied`), and **post an automatic PR comment** (required) with the failure summary and **required manual steps**, meeting the **messaging requirements** below. Then **escalate**: create or update a tracking issue and/or **notify on-call** per company playbook; cross-link that escalation in the PR and issue comments when applicable.
4. **`PATCH /api/work-products/{id}`** with `status: "merged"` and merge metadata so Paperclip can move the issue to `done` (see board docs / Issues API).
   - Apply **retry with exponential backoff** (bounded attempts) for transient HTTP/API errors (timeouts, connection resets, **429**, **502/503**). **Log** each failed attempt; after **exhausted retries** without success, treat as a failed PATCH for messaging and escalation (even if GitHub merge already succeeded—see below).
   - If **`PATCH` fails after a successful GitHub merge** (including after retries are exhausted), treat this as a **reconciliation incident**: append a **tombstone log entry** to today’s `$AGENT_HOME/memory/YYYY-MM-DD.md` (UTC timestamp, work product id, issue id, PR URL/number, merge evidence such as merge commit SHA or `gh` output, PATCH status/body/error), **notify the operator/on-call**, create a **compensating task** for manual reconciliation (align work product / issue on the board), and **comment on the issue** (and PR if helpful) per the **messaging requirements** below. State clearly that GitHub may already show the PR merged while Paperclip is out of sync until someone fixes it. Do not imply the board is updated until PATCH succeeds.
5. Leave a short comment on the issue with the merge result (success path), or on failure paths with failure class, links to the PR comment, escalation reference, and explicit **manual intervention** vs **rollback** guidance when applicable.

**Messaging requirements (all error comments—PR, issue, escalation):** Include **(1)** failure class and **UTC timestamp**, **(2)** identifiers: issue id, work product id, PR URL and number, **(3)** short **verbatim or summarized** error from `gh` or the API response, **(4)** **whether the PR was merged on GitHub** (yes/no/unknown), **(5)** **actionable manual steps** or pointer to the operator runbook, **(6)** that automatic merge or PATCH was **aborted** or **incomplete** as appropriate. **Manual intervention** triggers: any deterministic `gh pr merge` failure; any exhausted-retry PATCH failure; any ambiguity after partial success. **Rollback discussion** triggers: GitHub shows a merge (or you have merge evidence) but Paperclip was not updated—state that the operator may need to **reconcile the board** or, per policy, **revert the merge on GitHub**; do not silently recommend revert without aligning with operator governance.

You do **not** need checkout for this path unless your tools require a local git checkout to run `gh`.

## 7. Memory Extraction

1. Add timeline updates to `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Extract durable facts into `$AGENT_HOME/life/` when they matter beyond today.
3. Update `$AGENT_HOME/MEMORY.md` when you learn a stable working pattern.

## 8. Exit

- If nothing is assigned and no mention requires input, exit cleanly.
