# Tool Usage Guidelines

This file is a **user-expandable onboarding checklist** for task coordination and durable memory. Add environment-specific notes as you learn how tools behave in this deployment.

- **Paperclip API** — Operator and agent HTTP API under `/api`. In the Paperclip source tree, see `docs/api/agents.md` and `docs/api/issues.md` (or your operator’s published docs mirror). Heartbeat runs inject **`PAPERCLIP_API_URL`** and **`PAPERCLIP_API_KEY`**. One-line example: `curl -sS -H "Authorization: Bearer $PAPERCLIP_API_KEY" "$PAPERCLIP_API_URL/api/agents/me"`.
- **PARA-style memory under `$AGENT_HOME`** — Typical layout: `$AGENT_HOME/memory/YYYY-MM-DD.md` (daily timeline), `$AGENT_HOME/life/` (durable YAML facts, e.g. `$AGENT_HOME/life/paperclip-workflow.yaml`), and `$AGENT_HOME/MEMORY.md` (stable working patterns). Create or extend files as needed; do not delete operator-owned content without instruction.
- **Verify agent home** — Confirm the environment: `echo "${AGENT_HOME:-<unset>}"` (or your runtime’s equivalent) points at the agent workspace. Sanity-check memory: `test -d "$AGENT_HOME/memory" && test -f "$AGENT_HOME/memory/$(date +%Y-%m-%d).md"` (adjust date if your shell timezone differs from the board).
