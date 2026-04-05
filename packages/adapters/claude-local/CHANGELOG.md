# @paperclipai/adapter-claude-local

## Unreleased

### Patch Changes

- Treat heartbeat workspace `source` **`adapter_config`** like **`agent_home`** when applying optional adapter `cwd` override.
- When `timeoutSec` is 0 or omitted, use the shared **3600s** default child-process cap (`@paperclipai/adapter-utils`).
- Expand `$AGENT_HOME` in appended instruction files and the stdin prompt so shell-style paths in managed bundles resolve to the real agent workspace directory.
- Derive `$AGENT_HOME` expansion from `buildClaudeRuntimeConfig`’s `env.AGENT_HOME` (includes `config.env` overlay) instead of re-parsing `paperclipWorkspace`.

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
