---
title: Environment Variables
summary: Full environment variable reference
---

All environment variables that Paperclip uses for server configuration.

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Server port |
| `HOST` | `127.0.0.1` | Server host binding |
| `DATABASE_URL` | (embedded) | PostgreSQL connection string |
| `PAPERCLIP_HOME` | `~/.paperclip` | Base directory for all Paperclip data |
| `PAPERCLIP_INSTANCE_ID` | `default` | Instance identifier (for multiple local instances) |
| `PAPERCLIP_DEPLOYMENT_MODE` | `local_trusted` | Runtime mode override |

## Secrets

| Variable | Default | Description |
|----------|---------|-------------|
| `PAPERCLIP_SECRETS_MASTER_KEY` | (from file) | 32-byte encryption key (base64/hex/raw) |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | `~/.paperclip/.../secrets/master.key` | Path to key file |
| `PAPERCLIP_SECRETS_STRICT_MODE` | `false` | Require secret refs for sensitive env vars |

## Agent Runtime (Injected into agent processes)

These are set automatically by the server when invoking agents:

| Variable | Description |
|----------|-------------|
| `PAPERCLIP_AGENT_ID` | Agent's unique ID |
| `PAPERCLIP_COMPANY_ID` | Company ID |
| `PAPERCLIP_API_URL` | Paperclip API base URL (e.g. `http://127.0.0.1:3100`; **no** trailing `/api`) |

**Manual shells:** this is normally set only for processes spawned by Paperclip. For ad-hoc `curl` or scripts in your terminal, `export PAPERCLIP_API_URL=...` yourself. If `curl "$PAPERCLIP_API_URL/api/health"` fails with “No host part in the URL”, the variable is empty or invalid.
| `PAPERCLIP_API_KEY` | Short-lived JWT for API auth |
| `PAPERCLIP_RUN_ID` | Current heartbeat run ID |
| `PAPERCLIP_TASK_ID` | Issue that triggered this wake |
| `PAPERCLIP_WAKE_REASON` | Wake trigger reason |
| `PAPERCLIP_WAKE_COMMENT_ID` | Comment that triggered this wake |
| `PAPERCLIP_APPROVAL_ID` | Resolved approval ID |
| `PAPERCLIP_APPROVAL_STATUS` | Approval decision |
| `PAPERCLIP_LINKED_ISSUE_IDS` | Comma-separated linked issue IDs |

### Agent `adapterConfig.env`

Não cole exports completos de `paperclipai agent local-cli` em `adapterConfig.env`: o servidor injeta identidade e contexto da run e **ignora** chaves `PAPERCLIP_*` vindas dessa configuração, exceto allowlist (`PAPERCLIP_API_KEY` quando você quer forçar um JWT explícito, e `PAPERCLIP_TEST_CAPTURE_PATH` apenas em testes). Assim `PAPERCLIP_AGENT_ID` permanece alinhado ao agente da run e ao token.

## LLM Provider Keys (for adapters)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude Local adapter) |
| `OPENAI_API_KEY` | OpenAI API key (for Codex Local adapter) |
