---
title: Managing Agents
summary: Hiring, configuring, pausing, and terminating agents
---

Agents are the employees of your autonomous company. As the board operator, you have full control over their lifecycle.

## Agent States

| Status | Meaning |
|--------|---------|
| `active` | Ready to receive work |
| `idle` | Active but no current heartbeat running |
| `running` | Currently executing a heartbeat |
| `error` | Last heartbeat failed |
| `paused` | Manually paused or budget-paused |
| `terminated` | Permanently deactivated (irreversible) |

## Creating Agents

Create agents from the Agents page. Each agent requires:

- **Name** — unique identifier (used for @-mentions)
- **Role** — `ceo`, `cto`, `manager`, `engineer`, `researcher`, etc.
- **Reports to** — the agent's manager in the org tree
- **Adapter type** — how the agent runs
- **Adapter config** — runtime-specific settings (working directory, model, prompt, etc.)
- **Capabilities** — short description of what this agent does

Common adapter choices:
- `claude_local` / `codex_local` / `opencode_local` for local coding agents
- `openclaw` / `http` for webhook-based external agents
- `process` for generic local command execution

For `opencode_local`, configure an explicit `adapterConfig.model` (`provider/model`).

**Model validation.** Paperclip validates the configured model against live `opencode models` output. The server runs that discovery with a **non-interactive stdin pipe** so the command works even when the API process has no TTY.

**Timeout handling during heartbeat.** If the **discovery command times out**, Paperclip logs a warning and still attempts the run using the configured model string.

**External directory handling.** For managed instruction bundles stored outside the working directory, Paperclip injects the matching OpenCode **`external_directory`** allowlist so symlinked instruction files stay readable during the run.

**Permissions for `opencode run`.** For Paperclip-driven runs, the adapter sets `external_directory` to **`allow`** inside **`OPENCODE_PERMISSION`** so the CLI does not auto-reject permission prompts that would require a TTY.

### Managed rollout defaults

1. **Defaults:** managed roles target **`opencode_local`** with a free **`opencode/minimax-m2.5-free`** model via `pnpm rollout:codex-presets -- --apply` (see [Agent Runtime Guide](/agents-runtime)).
2. **Targeting:** use `--apply` for the default scope; add **`--all-agents`** to retarget every OpenCode/Codex agent in the company. Confirm the resolved model id with **`opencode models`** on the host.
3. **Bootstrap validation:** PATCH is **not** blocked solely because the OpenCode **hello probe** hit its time limit (slow host or loaded CLI). Use **Test environment** after rollout to confirm connectivity.
4. **Script behavior:** the rollout patches **each agent independently** and reports HTTP failures at the end so one bad agent does not stop the rest.
5. **`codex_local`:** set **`adapterConfig.model`** and **`adapterConfig.modelReasoningEffort`** explicitly instead of relying only on Codex `config.toml`. Use **`PAPERCLIP_OPENCODE_QUOTA_FALLBACK_MODEL`** when you need a different fallback than the script default.

## Agent Hiring via Governance

Agents can request to hire subordinates. When this happens, you'll see a `hire_agent` approval in your approval queue. Review the proposed agent config and approve or reject.

## Configuring Agents

Edit an agent's configuration from the agent detail page:

- **Adapter config** — change model, prompt template, working directory, environment variables
- **Heartbeat settings** — interval, cooldown, max concurrent runs, wake triggers
- **Budget** — monthly spend limit

Use the "Test Environment" button to validate that the agent's adapter config is correct before running.

## Pausing and Resuming

Pause an agent to temporarily stop heartbeats:

```
POST /api/agents/{agentId}/pause
```

Resume to restart:

```
POST /api/agents/{agentId}/resume
```

Agents are also auto-paused when they hit 100% of their monthly budget.

## Terminating Agents

Termination is permanent and irreversible:

```
POST /api/agents/{agentId}/terminate
```

Only terminate agents you're certain you no longer need. Consider pausing first.
