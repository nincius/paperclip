# @paperclipai/adapter-cursor-local

## Unreleased

### Patch Changes

- Treat heartbeat workspace `source` **`adapter_config`** like **`agent_home`** when applying optional adapter `cwd` override.
- When `timeoutSec` is 0 or omitted, use the shared **3600s** default child-process cap (`@paperclipai/adapter-utils`).
- Emit stable `errorCode` values on failure (`timeout`, `cursor_auth_required`, `cursor_exit_nonzero`) for heartbeat aggregation and operator triage.
- Expand `$AGENT_HOME` in the composed stdin prompt to the absolute Paperclip agent home path.
- API-key auth error regex matches the lowercased stderr blob without a redundant `/i` flag.

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

- Added initial `cursor` adapter package for local Cursor CLI execution
