# paperclipai

## Unreleased

### Patch Changes

- **`paperclip` HTTP client:** automatic bounded retries with jitter for **connection errors**, **request timeouts** (`requestTimeoutMs`, default 30s via `AbortController`), and HTTP **502/503/504/429** (respects `Retry-After` when numeric). Disable with `transientRetry: false` on `PaperclipApiClient`, or tune `maxAttempts` / `initialDelayMs` / `backoffMultiplier` (minimum 1) / `maxDelayMs`.
- **`paperclipai doctor` (static UI check):** resolve monorepo root by walking upward for `pnpm-workspace.yaml` instead of a fixed `../../..` depth from the CLI package.
- **LaunchAgent template:** `contrib/macos-launchagent/io.paperclip.local.plist` uses path placeholders (`/ABSOLUTE/PATH/TO/paperclip-repo`, `/Users/USERNAME`, …) instead of example user-specific paths.
- Rollout / audit: `pnpm rollout:codex-presets -- --apply --all-agents` and `pnpm audit:agent-models -- --apply-all` PATCH **every** `opencode_local` / `codex_local` agent to the quota fallback model (default **`opencode/minimax-m2.5-free`**; override with `PAPERCLIP_OPENCODE_QUOTA_FALLBACK_MODEL`). Confirm model ids with `opencode models` on the host.
- **`paperclipai run`:** when `PAPERCLIP_MANAGED_BY_LAUNCHD=1`/`true` and stdin is not a TTY, do not auto-enable Vite UI middleware in a monorepo checkout (aligns with LaunchAgent static UI); override with `PAPERCLIP_UI_DEV_MIDDLEWARE=true` if needed.
- **`paperclipai doctor`:** fails when `PAPERCLIP_UI_DEV_MIDDLEWARE=false`, `serveUi` is on, and the monorepo has no `ui/dist/index.html` or `server/ui-dist/index.html` (run `pnpm build`).

## 0.3.1

### Patch Changes

- Stable release preparation for 0.3.1
- Updated dependencies
  - @paperclipai/adapter-utils@0.3.1
  - @paperclipai/adapter-claude-local@0.3.1
  - @paperclipai/adapter-codex-local@0.3.1
  - @paperclipai/adapter-cursor-local@0.3.1
  - @paperclipai/adapter-gemini-local@0.3.1
  - @paperclipai/adapter-openclaw-gateway@0.3.1
  - @paperclipai/adapter-opencode-local@0.3.1
  - @paperclipai/adapter-pi-local@0.3.1
  - @paperclipai/db@0.3.1
  - @paperclipai/shared@0.3.1
  - @paperclipai/server@0.3.1

## 0.3.0

### Minor Changes

- Stable release preparation for 0.3.0

### Patch Changes

- Updated dependencies [6077ae6]
- Updated dependencies
  - @paperclipai/shared@0.3.0
  - @paperclipai/adapter-utils@0.3.0
  - @paperclipai/adapter-claude-local@0.3.0
  - @paperclipai/adapter-codex-local@0.3.0
  - @paperclipai/adapter-cursor-local@0.3.0
  - @paperclipai/adapter-openclaw-gateway@0.3.0
  - @paperclipai/adapter-opencode-local@0.3.0
  - @paperclipai/adapter-pi-local@0.3.0
  - @paperclipai/db@0.3.0
  - @paperclipai/server@0.3.0

## 0.2.7

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.7
  - @paperclipai/adapter-utils@0.2.7
  - @paperclipai/db@0.2.7
  - @paperclipai/adapter-claude-local@0.2.7
  - @paperclipai/adapter-codex-local@0.2.7
  - @paperclipai/adapter-openclaw@0.2.7
  - @paperclipai/server@0.2.7

## 0.2.6

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.6
  - @paperclipai/adapter-utils@0.2.6
  - @paperclipai/db@0.2.6
  - @paperclipai/adapter-claude-local@0.2.6
  - @paperclipai/adapter-codex-local@0.2.6
  - @paperclipai/adapter-openclaw@0.2.6
  - @paperclipai/server@0.2.6

## 0.2.5

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.5
  - @paperclipai/adapter-utils@0.2.5
  - @paperclipai/db@0.2.5
  - @paperclipai/adapter-claude-local@0.2.5
  - @paperclipai/adapter-codex-local@0.2.5
  - @paperclipai/adapter-openclaw@0.2.5
  - @paperclipai/server@0.2.5

## 0.2.4

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.4
  - @paperclipai/adapter-utils@0.2.4
  - @paperclipai/db@0.2.4
  - @paperclipai/adapter-claude-local@0.2.4
  - @paperclipai/adapter-codex-local@0.2.4
  - @paperclipai/adapter-openclaw@0.2.4
  - @paperclipai/server@0.2.4

## 0.2.3

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.3
  - @paperclipai/adapter-utils@0.2.3
  - @paperclipai/db@0.2.3
  - @paperclipai/adapter-claude-local@0.2.3
  - @paperclipai/adapter-codex-local@0.2.3
  - @paperclipai/adapter-openclaw@0.2.3
  - @paperclipai/server@0.2.3

## 0.2.2

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.2
  - @paperclipai/adapter-utils@0.2.2
  - @paperclipai/db@0.2.2
  - @paperclipai/adapter-claude-local@0.2.2
  - @paperclipai/adapter-codex-local@0.2.2
  - @paperclipai/adapter-openclaw@0.2.2
  - @paperclipai/server@0.2.2

## 0.2.1

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/shared@0.2.1
  - @paperclipai/adapter-utils@0.2.1
  - @paperclipai/db@0.2.1
  - @paperclipai/adapter-claude-local@0.2.1
  - @paperclipai/adapter-codex-local@0.2.1
  - @paperclipai/adapter-openclaw@0.2.1
  - @paperclipai/server@0.2.1
