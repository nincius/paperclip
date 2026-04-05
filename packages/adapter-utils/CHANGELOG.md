# @paperclipai/adapter-utils

## Unreleased

### Patch Changes

- Raise `DEFAULT_HEARTBEAT_CHILD_TIMEOUT_SEC` from **3600** to **7200** (2 hours) when `adapterConfig.timeoutSec` is 0 or missing — reduces spurious 1h timeouts on long local CLI heartbeats.

- Add `expandShellStyleAgentHome()` so local adapters can substitute `$AGENT_HOME` in stdin/system prompts with the absolute Paperclip agent workspace path (avoids models resolving bogus paths like `repo/$AGENT_HOME/HEARTBEAT.md` relative to the git cwd).
- `expandShellStyleAgentHome()` trims `agentHome` once (no redundant `trim()` calls) and strips trailing slashes from the resolved root (preserving `/` alone) so `$AGENT_HOME/…` does not produce doubled `/` when `agentHome` already ends with `/`.

## 0.3.1

### Patch Changes

- Stable release preparation for 0.3.1

## 0.3.0

### Minor Changes

- Stable release preparation for 0.3.0

## 0.2.7

### Patch Changes

- Version bump (patch)

## 0.2.6

### Patch Changes

- Version bump (patch)

## 0.2.5

### Patch Changes

- Version bump (patch)

## 0.2.4

### Patch Changes

- Version bump (patch)

## 0.2.3

### Patch Changes

- Version bump (patch)

## 0.2.2

### Patch Changes

- Version bump (patch)

## 0.2.1

### Patch Changes

- Version bump (patch)
