# @paperclipai/shared

## Unreleased

### Breaking Changes

- **`IssueCurrentOwner`** is now a discriminated union on `actorType`; `agent` and `user` variants require the corresponding `agentId` / `userId` field—update consuming code accordingly.

### Patch Changes

- `ISSUE_BACKLOG_STATUSES`: readonly `["backlog"]` tuple for backlog-only filters (UI aligns with `ISSUE_ACTIVE_STATUSES` / `ISSUE_TERMINAL_STATUSES`).
- **`DEFAULT_OPENCODE_QUOTA_FALLBACK_MODEL`:** canonical OpenCode quota-fallback model id, exported from package **`constants`** so UI and rollout tooling share one value.
- **Non-breaking:** export **`IssueOpenStatus`** (`Exclude<IssueStatus, IssueTerminalStatus>`), typed **`ISSUE_OPEN_STATUSES`**, and **`OPEN_ISSUE_STATUSES`** (runtime-frozen copy of the same members for DB partial-index clauses; not the same array reference as `ISSUE_OPEN_STATUSES`).
- `ISSUE_STATUS_TRANSITIONS`: **`changes_requested` → `in_progress`** and **`blocked` → `in_progress`** are listed again in the declarative graph so shared consumers match the review-resume / checkout reconciliation path; **`PATCH` / `svc.update` still require `POST /api/issues/:id/checkout`** for those moves (see `assertInProgressTransitionUsesCheckout` on the server). See `doc/SPEC-implementation.md` §8.2.
- **`updateCompanySchema`** adds optional **`technicalReviewerReference`**; the **`Company`** type now includes nullable **`technicalReviewerReference`** for per-company technical review dispatch targeting.

## 0.3.1

### Patch Changes

- Stable release preparation for 0.3.1

## 0.3.0

### Minor Changes

- 6077ae6: Add support for Pi local adapter in constants and onboarding UI.
- Stable release preparation for 0.3.0

## 0.2.7

### Patch Changes

- Version bump (patch)

## 0.2.6

### Patch Changes

- Version bump (patch)

## 0.2.5

### Patch Changes

- Version bump (patch)

## 0.2.4

### Patch Changes

- Version bump (patch)

## 0.2.3

### Patch Changes

- Version bump (patch)

## 0.2.2

### Patch Changes

- Version bump (patch)

## 0.2.1

### Patch Changes

- Version bump (patch)
