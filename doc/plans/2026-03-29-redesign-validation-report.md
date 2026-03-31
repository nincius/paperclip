# Redesign Validation Report

Date: 2026-03-29
Scope: validate the redesign checklist against the current Paperclip source tree
Repo: `/Users/nincius/paperclip`

## Summary

The redesign is materially implemented in the codebase, but not fully closed.

High-confidence items implemented:

- explicit review workflow states
- issue ownership by current operational actor
- technical review dispatcher
- agent bootstrap validation for managed local adapters
- agent health monitor with review-queue alerts
- heartbeat run operational-effect summaries
- operator documentation for the new runtime model

Items still partial or not fully proven from code inspection alone:

- hard enforcement of isolated git worktree usage for every implementation path
- end-to-end validation of the complete workflow in a runnable environment
- automated verification of all targeted tests in this shell session

## Verification Constraints

- Source inspection was performed directly against server, shared, db, ui, and docs files.
- Focused tests were identified, but they were not executed here because `pnpm` and `corepack` are not available in the current shell, and the repo currently has no installed root `node_modules`.
- Conclusion quality is therefore: strong for static implementation coverage, weaker for runtime confidence.

## Checklist Results

### 1. Bootstrap

Status: Implemented

Evidence:

- Managed local agents now require `AGENTS.md`, `HEARTBEAT.md`, `SOUL.md`, and `TOOLS.md` in both the managed bundle and `$AGENT_HOME`.
- Agent create/update validates bootstrap integrity and runs adapter `testEnvironment` before allowing the change.
- Default onboarding assets now include the full bootstrap set.

References:

- [server/src/routes/agents.ts](/Users/nincius/paperclip/server/src/routes/agents.ts)
- [server/src/services/default-agent-instructions.ts](/Users/nincius/paperclip/server/src/services/default-agent-instructions.ts)
- [server/src/__tests__/agent-skills-routes.test.ts](/Users/nincius/paperclip/server/src/__tests__/agent-skills-routes.test.ts)
- [docs/guides/board-operator/runtime-runbook.md](/Users/nincius/paperclip/docs/guides/board-operator/runtime-runbook.md)

Assessment:

- The create/update path is substantially covered.
- This directly addresses the historical failure mode where managed agents were created with incomplete bootstrap files or invalid adapter config.

### 2. Guardrails

Status: Partial

Evidence:

- Direct creation or update into `in_progress` without checkout is blocked.
- Heartbeat setup now verifies checkout ownership for `in_progress` issues.
- When `git_worktree` strategy is configured, heartbeat fails early if the resolved workspace is not a real git project checkout.
- Worktree realization logic exists and creates isolated git worktrees under a configured parent directory.

References:

- [server/src/services/issues.ts](/Users/nincius/paperclip/server/src/services/issues.ts)
- [server/src/services/heartbeat.ts](/Users/nincius/paperclip/server/src/services/heartbeat.ts)
- [server/src/services/workspace-runtime.ts](/Users/nincius/paperclip/server/src/services/workspace-runtime.ts)
- [server/src/services/execution-workspace-policy.ts](/Users/nincius/paperclip/server/src/services/execution-workspace-policy.ts)
- [server/src/__tests__/issues-service.test.ts](/Users/nincius/paperclip/server/src/__tests__/issues-service.test.ts)
- [docs/guides/board-operator/runtime-runbook.md](/Users/nincius/paperclip/docs/guides/board-operator/runtime-runbook.md)

Assessment:

- Checkout enforcement is implemented.
- Git-worktree policy validation is implemented when that policy is active.
- The remaining gap is stronger proof that every implementation path is forced through isolated worktree mode when required by policy. The code strongly suggests this, but the final runtime proof was not executed here.

### 3. States

Status: Implemented

Evidence:

- Shared constants now define the redesigned lifecycle:
  `backlog -> todo -> claimed -> in_progress -> handoff_ready -> technical_review -> changes_requested -> human_review -> done|blocked|cancelled`
- Allowed transitions are encoded centrally.
- DB migration backfills legacy `in_review` rows to `handoff_ready`.
- API docs were updated to describe the new lifecycle.

References:

- [packages/shared/src/constants.ts](/Users/nincius/paperclip/packages/shared/src/constants.ts)
- [packages/shared/src/types/issue.ts](/Users/nincius/paperclip/packages/shared/src/types/issue.ts)
- [packages/db/src/schema/issues.ts](/Users/nincius/paperclip/packages/db/src/schema/issues.ts)
- [packages/db/src/migrations/0045_issue_review_workflow.sql](/Users/nincius/paperclip/packages/db/src/migrations/0045_issue_review_workflow.sql)
- [docs/api/issues.md](/Users/nincius/paperclip/docs/api/issues.md)
- [doc/SPEC-implementation.md](/Users/nincius/paperclip/doc/SPEC-implementation.md)

Assessment:

- This is one of the strongest parts of the redesign.
- The state model is now explicit and no longer overloads `in_review`.

### 4. Ownership

Status: Implemented

Evidence:

- `Issue.currentOwner` is now part of the shared contract.
- Server-side issue service derives current owner based on status and review children.
- UI surfaces `Acts now` through `IssueCurrentOwnerBadge`.
- Tests assert ownership for `technical_review` and `human_review`.

References:

- [packages/shared/src/types/issue.ts](/Users/nincius/paperclip/packages/shared/src/types/issue.ts)
- [server/src/services/issues.ts](/Users/nincius/paperclip/server/src/services/issues.ts)
- [server/src/__tests__/issues-service.test.ts](/Users/nincius/paperclip/server/src/__tests__/issues-service.test.ts)
- [ui/src/components/IssueCurrentOwnerBadge.tsx](/Users/nincius/paperclip/ui/src/components/IssueCurrentOwnerBadge.tsx)
- [ui/src/components/IssueProperties.tsx](/Users/nincius/paperclip/ui/src/components/IssueProperties.tsx)

Assessment:

- The ownership ambiguity of the old `in_review` model is materially reduced.
- The remaining question is UX completeness across all surfaces, not contract existence.

### 5. Dispatcher

Status: Implemented

Evidence:

- Dedicated review-dispatch service resolves reviewer `revisor-pr`.
- Dispatch resolves PR context from work products, latest handoff comment, or issue description.
- Dedup uses diff identity, preferring repo + PR + head SHA.
- Tests cover create, reuse, and already-reviewed cases.

References:

- [server/src/services/review-dispatch.ts](/Users/nincius/paperclip/server/src/services/review-dispatch.ts)
- [server/src/routes/issues.ts](/Users/nincius/paperclip/server/src/routes/issues.ts)
- [server/src/__tests__/review-dispatch.test.ts](/Users/nincius/paperclip/server/src/__tests__/review-dispatch.test.ts)
- [docs/guides/board-operator/runtime-runbook.md](/Users/nincius/paperclip/docs/guides/board-operator/runtime-runbook.md)

Assessment:

- The compensating manual review queue logic has largely been replaced by native code.
- This is a clear closure of one of the largest historical runtime gaps.

### 6. Revisor Técnico

Status: Partially verified

Evidence:

- The dispatcher and ownership model support technical review as a first-class phase.
- Bootstrap validation and health monitoring explicitly cover local managed adapters.
- Runtime docs describe the technical review contract and fallback behavior.

References:

- [server/src/services/review-dispatch.ts](/Users/nincius/paperclip/server/src/services/review-dispatch.ts)
- [server/src/services/agent-health-monitor.ts](/Users/nincius/paperclip/server/src/services/agent-health-monitor.ts)
- [docs/guides/board-operator/runtime-runbook.md](/Users/nincius/paperclip/docs/guides/board-operator/runtime-runbook.md)

Assessment:

- The system infrastructure for the reviewer is present.
- What is not fully proven here is the exact runtime behavior for mention-based wakes and full review publication in this current branch, because runtime tests were not executed in this shell.

### 7. Health Monitor

Status: Implemented

Evidence:

- Native agent health monitor exists.
- It checks bootstrap integrity, adapter environment regressions, stale heartbeat behavior, queue starvation, and review-queue overload/SLA breaches.
- Open corrective issues use `originKind='agent_health_alert'`.
- Migration adds uniqueness protection for open health alerts.
- Tests cover alert creation and auto-resolution.

References:

- [server/src/services/agent-health-monitor.ts](/Users/nincius/paperclip/server/src/services/agent-health-monitor.ts)
- [server/src/__tests__/agent-health-monitor.test.ts](/Users/nincius/paperclip/server/src/__tests__/agent-health-monitor.test.ts)
- [packages/db/src/migrations/0046_agent_health_alerts.sql](/Users/nincius/paperclip/packages/db/src/migrations/0046_agent_health_alerts.sql)
- [packages/db/src/schema/issues.ts](/Users/nincius/paperclip/packages/db/src/schema/issues.ts)

Assessment:

- This materially closes the old “discover breakage only after bad runs” problem.

### 8. Observability

Status: Partial

Evidence:

- Heartbeat runs now have operational-effect semantics with meaningful signals and summaries.
- UI helper exists for `Effect` vs `No effect`.
- `currentOwner` is exposed to the UI.
- Status/colors and board docs were updated.

References:

- [server/src/services/heartbeat-run-effect.ts](/Users/nincius/paperclip/server/src/services/heartbeat-run-effect.ts)
- [server/src/__tests__/heartbeat-run-effect.test.ts](/Users/nincius/paperclip/server/src/__tests__/heartbeat-run-effect.test.ts)
- [ui/src/lib/run-operational-effect.ts](/Users/nincius/paperclip/ui/src/lib/run-operational-effect.ts)
- [ui/src/components/IssueCurrentOwnerBadge.tsx](/Users/nincius/paperclip/ui/src/components/IssueCurrentOwnerBadge.tsx)

Assessment:

- “Run completed” vs “run produced effect” is implemented.
- Full observability as originally proposed, including a dedicated operational dashboard for queue age, backlog by actor, and adapter failures, appears only partially realized from the inspected files.

### 9. WIP and SLA

Status: Implemented in health policy, partially verified in operator UX

Evidence:

- Review queue policies define WIP and SLA thresholds for `technical_review`, `changes_requested`, and `human_review`.
- Health monitor turns those breaches into managed alert issues.

References:

- [server/src/services/agent-health-monitor.ts](/Users/nincius/paperclip/server/src/services/agent-health-monitor.ts)
- [server/src/__tests__/agent-health-monitor.test.ts](/Users/nincius/paperclip/server/src/__tests__/agent-health-monitor.test.ts)

Assessment:

- The enforcement exists as monitoring and alerting, not as a hard blocker in normal workflow.
- That is a valid implementation choice, but it is weaker than a true hard WIP guard.

### 10. Rotinas

Status: Partial

Evidence:

- Runtime docs now clearly position routines as recurring operational work, not substitutes for issue transitions.
- Native dispatcher reduces the need for one major compensation routine.

References:

- [docs/guides/board-operator/runtime-runbook.md](/Users/nincius/paperclip/docs/guides/board-operator/runtime-runbook.md)
- [server/src/services/review-dispatch.ts](/Users/nincius/paperclip/server/src/services/review-dispatch.ts)

Assessment:

- The redesign intent is reflected in docs and dispatcher behavior.
- I did not find evidence in the inspected code that routine delegation constraints were redesigned. The board-operator runbook still states that agents can only manage routines assigned to themselves.

### 11. Regression Workflow

Status: Not fully verified

Evidence:

- The codebase now has the pieces required for the intended workflow.
- The docs explicitly describe the runtime path and troubleshooting model.

References:

- [docs/api/issues.md](/Users/nincius/paperclip/docs/api/issues.md)
- [docs/guides/board-operator/runtime-runbook.md](/Users/nincius/paperclip/docs/guides/board-operator/runtime-runbook.md)

Assessment:

- I did not execute a full live cycle `todo -> checkout -> handoff_ready -> technical_review -> changes_requested -> human_review -> done`.
- This remains the most important missing validation before calling the redesign fully closed.

### 12. Documentation

Status: Implemented

Evidence:

- API docs updated for lifecycle.
- Runtime runbook created.
- Core spec updated to treat the new issue workflow as part of the implementation contract.

References:

- [docs/api/issues.md](/Users/nincius/paperclip/docs/api/issues.md)
- [docs/guides/board-operator/runtime-runbook.md](/Users/nincius/paperclip/docs/guides/board-operator/runtime-runbook.md)
- [doc/SPEC-implementation.md](/Users/nincius/paperclip/doc/SPEC-implementation.md)

Assessment:

- Documentation now reflects the redesigned model much more accurately than before.

## Overall Assessment

Current status: mostly implemented, not yet fully proven.

What looks genuinely complete:

- workflow states
- ownership model
- review dispatch
- bootstrap validation
- agent health alerts
- run operational-effect summaries
- operator-facing documentation

What still blocks a full closure decision:

- runtime proof of the complete end-to-end workflow in a runnable environment
- stronger proof that worktree isolation is enforced on every intended implementation path, not only when `git_worktree` policy is active
- confirmation via executed focused tests in this branch

## Recommended Next Step

Before merging or declaring the redesign done:

1. install repo dependencies in a clean shell
2. run the focused test set for:
   - `review-dispatch`
   - `agent-health-monitor`
   - `heartbeat-run-effect`
   - `issues-service`
   - `agent-skills-routes`
3. run one manual or scripted end-to-end workflow across the new states
4. confirm worktree-policy behavior with one project configured for `git_worktree`

If those pass, the redesign can be treated as operationally ready rather than only structurally implemented.
