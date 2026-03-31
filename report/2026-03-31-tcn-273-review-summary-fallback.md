# TCN-273: review child closure fallback to latest summary comment

## Problem

`TCN-273` exposed a reconciliation gap in the technical-review loop:

- the reviewer posted a clean review summary on the source issue and on the review child
- the review child was later closed in a separate `PATCH` without an inline `comment`
- parent reconciliation depended only on the `comment` field from that closing request
- the source issue stayed stale in `handoff_ready` even though the latest review outcome was already "approved"

## Change

- `server/src/routes/issues.ts` now falls back to the latest recent comments on the review child when the closing request itself does not include a summary comment
- only comments that classify as a technical-review outcome are used
- the parent issue can now move to `human_review` or back to `in_progress` even when comment and close happen in separate calls

## Validation

- added a route test covering "comment first, close later without comment"
- preserved the existing tests for inline blocking and approved review summaries

## Expected operator impact

- clean reviews no longer leave the source issue stuck in `handoff_ready` just because the final status update arrived without a duplicated summary body
- the runtime is more tolerant of how review agents structure their final two actions
