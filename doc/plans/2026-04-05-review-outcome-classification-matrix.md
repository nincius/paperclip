# Technical review outcome classification matrix

Date: 2026-04-05  
Related: [`classifyTechnicalReviewOutcome`](../../server/src/services/technical-review-outcome.ts) (used by `issueRoutes`)

## Purpose

Document how free-text review comments are classified into `approved` vs `blocking` for parent issue reconciliation, and capture **gaps** for future structured metadata (JSON block, labels).

## Rules (summary)

1. **Blocking phrase:** body matches `retornar` … `` `in_progress` `` **or** `retornar` … `in_progress` as a word (after normalization; see below).
2. **Approved phrases (PT):** `pode seguir para revisao humana`, `pronto para revisao humana`, `aprovado/a para revisao humana` (normalized: NFD + strip **combining marks** `\p{M}` + lowercase — backticks are **not** stripped).
3. **Approved phrases (EN):** `ready for human review`, `approved for human review`, `ok to proceed to human review`, `lgtm for human review`, `no blocking findings`, `non-blocking review`, `ship to human review`.
4. **Section-based:** `### Findings bloqueantes` / `blocking findings` / `blocking` — if section body collapses to empty or matches `nenhum|none|n/a|sem findings bloqueantes`, **approved**; else **blocking**.
5. **Ambiguity:** conflicting signals (e.g. approved phrase + non-empty blocking section; or return-to-`in_progress` + empty blocking section) → **`null`** (fail closed; parent not auto-moved).
6. **No match:** returns `null` → automated reconciliation may not run until wording matches or structured signal is added; server logs warn and records **`issue.review_outcome_unparsed`** on the review child.

## Matrix (examples)

| # | Sample text (abbrev.) | Expected | Notes |
|---|------------------------|----------|-------|
| 1 | `### Findings bloqueantes\n\nNenhum.` | approved | Section rule |
| 2 | `### Blocking findings\n\nNone.` | approved | EN section |
| 3 | `Pode seguir para revisao humana.` | approved | PT phrase |
| 4 | `PR ready for human review.` | approved | EN phrase |
| 5 | `LGTM — approved for human review.` | approved | EN phrase |
| 6 | `No blocking findings; OK to merge after board.` | approved | EN phrase |
| 7 | `### Blocking findings\n\nRace in cache invalidation.` | blocking | Non-empty section |
| 8 | `Retornar para \`in_progress\` para corrigir testes.` | blocking | Return pattern |
| 9 | `Looks good!` | null | Too vague — use §3 or DoD template |
| 10 | `LGTM` only | null | No approved phrase unless section says none |
| 11 | `### Findings bloqueantes` + bug + `Pode seguir…` in same body | null | Ambiguous — fail closed |
| 12 | `### Findings bloqueantes` + `Nenhum` + `Retornar … \`in_progress\`` | null | Mixed return + empty findings |

## UI / operator guidance

- Revisor agents should use the **Definition of Done** block in the dispatched child description (see `buildReviewDescription` in `review-dispatch.ts`) and include either an explicit **approved-for-human-review** line or a **blocking findings** section.
- For English-only teams, prefer `### Blocking findings` + `None.` or one of the EN approved phrases above.

## UI observability gap

- Board **dashboard** aggregates some `issue.review_dispatch_*` activity events (see `ui/src/lib/dashboard-observability.ts`); **issue detail** does not yet highlight last `issue.review_dispatch_noop` or `issue.merge_delegate_wakeup_failed`. Operators should filter `activity_log` by `entity_id` / action until UI catches up (P2).
