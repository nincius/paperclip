# @paperclipai/adapter-codex-local

## Unreleased

### Patch Changes

- When JSONL ends with `turn.completed`, there is no parsed error, and stderr is empty, treat a **non-zero process exit** as adapter success (keep real `exitCode`; set `resultJson.paperclip.ignoredNonZeroExitCode` for operators). Aligns environment hello-probe with the same rule via `codexStdoutIndicatesIgnorableNonZeroExit`.
- Treat heartbeat workspace `source` **`adapter_config`** like **`agent_home`** when applying optional adapter `cwd` override.
- When `timeoutSec` is 0 or omitted, use the shared **3600s** default child-process cap (`@paperclipai/adapter-utils`).
- Emit stable `errorCode` values on failure (`timeout`, `codex_auth_required`, `codex_exit_nonzero`) for heartbeat aggregation and operator triage.
- Expand `$AGENT_HOME` in the composed stdin prompt to the absolute Paperclip agent home path (managed `AGENTS.md` / `HEARTBEAT.md` prose).
- Static model list: add `gpt-5.4-mini`; drop `gpt-5.3-codex-spark` (frequently rejected by current Codex backends).
- Tighten auth-error detection in stderr parsing (case-sensitive match on lowercased blob; drop redundant `invalid_api_key` alternative). Refactor unknown-session detection regex into named pattern list in `parse.ts`.

## 0.3.1

### Patch Changes

- Stable release preparation for 0.3.1
- Updated dependencies
  - @paperclipai/adapter-utils@0.3.1

## 0.3.0

### Minor Changes

- Stable release preparation for 0.3.0

### Patch Changes

- Updated dependencies
  - @paperclipai/adapter-utils@0.3.0

## 0.2.7

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/adapter-utils@0.2.7

## 0.2.6

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/adapter-utils@0.2.6

## 0.2.5

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/adapter-utils@0.2.5

## 0.2.4

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/adapter-utils@0.2.4

## 0.2.3

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/adapter-utils@0.2.3

## 0.2.2

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/adapter-utils@0.2.2

## 0.2.1

### Patch Changes

- Version bump (patch)
- Updated dependencies
  - @paperclipai/adapter-utils@0.2.1
