# Heartbeat runs: sampling, fragilities, triage by severity

Date: 2026-04-03  
Status: operational playbook (fill quantitative tables after running audits on your instance).

## 1. Sampling

### 1.1 Script (API)

From repo root with the board API reachable and a company id:

```sh
export PAPERCLIP_COMPANY_ID='<uuid>'
# optional: export PAPERCLIP_TOKEN='<board bearer>' if your instance requires auth
pnpm audit:heartbeat-runs
pnpm audit:heartbeat-runs -- --json   # machine-readable
```

Environment knobs are documented in [`scripts/audit-heartbeat-runs.mjs`](../../scripts/audit-heartbeat-runs.mjs) (`AUDIT_RUNS_LIMIT`, `AGENT_SAMPLE_LIMIT`, `AUDIT_DAYS`, `STUCK_RUNNING_MS`). `AUDIT_DAYS=0` and `STUCK_RUNNING_MS=0` are respected (not coerced to defaults). Per-agent API samples are fetched in parallel batches with per-request timeouts.

Companion model audit: `pnpm audit:agent-models` (company agents + heartbeat-runs list calls use a 10s fetch timeout).

### 1.2 SQL (Postgres / PGlite)

Run against your `DATABASE_URL` or embedded DB. Adjust the time window.

**Counts by agent, status, and `error_code` (last 7 days):**

```sql
SELECT
  a.name AS agent_name,
  a.adapter_type,
  r.status,
  COALESCE(r.error_code, '(none)') AS error_code,
  COUNT(*) AS n
FROM heartbeat_runs r
JOIN agents a ON a.id = r.agent_id
WHERE r.company_id = $1
  AND r.created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3, 4
ORDER BY n DESC;
```

**Failed / timed out rate by adapter type:**

```sql
SELECT
  a.adapter_type,
  COUNT(*) FILTER (WHERE r.status IN ('failed', 'timed_out')) AS fails,
  COUNT(*) AS total
FROM heartbeat_runs r
JOIN agents a ON a.id = r.agent_id
WHERE r.company_id = $1
  AND r.created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY fails DESC;
```

**Long-running `running` rows (possible stuck / awaiting reaper):**

```sql
SELECT r.id, a.name, a.adapter_type, r.started_at, r.updated_at
FROM heartbeat_runs r
JOIN agents a ON a.id = r.agent_id
WHERE r.company_id = $1
  AND r.status = 'running'
  AND r.started_at IS NOT NULL
  AND r.started_at < NOW() - INTERVAL '2 hours'
ORDER BY r.started_at ASC;
```

### 1.3 API contract note

`GET /api/companies/:companyId/heartbeat-runs` applies a **default limit of 200** when `limit` is omitted, so listing the full history requires explicit pagination or higher `limit` (max 1000). See [`docs/api/agents.md`](../../docs/api/agents.md).

---

## 2. P0 — Critical triage (orchestration / stuck work)

Validate with your aggregates first.

| Theme | `error_code` / signal | Code / tests | Operator actions |
|-------|------------------------|--------------|------------------|
| Process loss / restart | `process_lost`, `process_detached` | [`server/src/services/heartbeat.ts`](../../server/src/services/heartbeat.ts), [`server/src/__tests__/heartbeat-process-recovery.test.ts`](../../server/src/__tests__/heartbeat-process-recovery.test.ts) | Resume/cancel runs; check `active-run` / issue execution binding; see [`docs/api/issues.md`](../../docs/api/issues.md) |
| Workspace policy | `execution_workspace_policy_violation` | Same recovery tests | Fix workspace policy or provision command; re-run |
| Stuck `running` | status `running`, old `started_at` | Reaper + local PID tracking | Inspect `live-runs`, events, log; restart server only after understanding child PIDs |

**Quantitative template (fill after audit):**

| Agent | Adapter | P0 events (7d) | Top code | Notes |
|-------|---------|----------------|----------|-------|
| | | | | |

---

## 3. P1 — High triage (auth / remote gateway)

| Theme | `error_code` patterns | Mitigation |
|-------|----------------------|------------|
| Local CLI auth | `claude_auth_required`, `gemini_auth_required`, `cursor_auth_required`, `codex_auth_required`, `opencode_auth_required`, `pi_auth_required` | Login / API keys in agent env; use board helpers where exposed (e.g. Claude login in UI) |
| OpenClaw | `openclaw_gateway_*` | URL, TLS, gateway health, timeout tuning — [`packages/adapters/openclaw-gateway`](../../packages/adapters/openclaw-gateway) |

**Quantitative template:**

| code | count (7d) | agents affected |
|------|------------|-----------------|
| | | |

---

## 4. P2 — Observability (adapter exit taxonomy)

Local adapters now emit stable codes where heuristic auth detection applies, for example:

- **Cursor:** `timeout`, `cursor_auth_required`, `cursor_exit_nonzero`
- **Codex:** `timeout`, `codex_auth_required`, `codex_exit_nonzero`
- **OpenCode:** `timeout`, `opencode_permission_auto_reject`, `opencode_auth_required`, `opencode_stale_workspace_file`, `opencode_exit_nonzero`
- **Pi:** `timeout`, `pi_auth_required`, `pi_exit_nonzero`

Use these in SQL/dashboards alongside legacy orchestration codes (`adapter_failed`, etc.).

---

## 5. P3 — Continuous

- Log truncation / excerpt quality when many rows are generic `adapter_failed` — see [`doc/spec/agent-runs.md`](../spec/agent-runs.md).
- Dashboard counters for review dedupe and health-alert suppressions — [`ui/src/lib/dashboard-observability.ts`](../../ui/src/lib/dashboard-observability.ts), [`report/2026-03-31-flow-hardening-followups.md`](../../report/2026-03-31-flow-hardening-followups.md).

---

## 6. Definition of done (for your run of this plan)

- [ ] One pass of `pnpm audit:heartbeat-runs` (or SQL) saved with date.
- [ ] P0/P1 tables above filled with real counts.
- [ ] Short list (5–10) of incident classes with example `run_id` and links to events/log.
