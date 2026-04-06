import type { AdapterExecutionResult } from "../adapters/index.js";

/**
 * When local Codex exits non-zero after a successful `turn.completed` (no JSONL error, empty stderr),
 * codex-local clears `errorMessage` and sets `rawResult.paperclip.ignoredNonZeroExitCode` (protocol
 * `AdapterInvokeResult.rawResult`, same object as `adapterResult.resultJson` here; see
 * `doc/spec/agent-runs.md` §6 / §7.2). Heartbeat must treat that as a succeeded run, not `failed`.
 */
export function adapterSignalsIgnorableNonZeroExit(adapterResult: AdapterExecutionResult): boolean {
  const rj = adapterResult.resultJson;
  if (!rj || typeof rj !== "object") return false;
  const paperclip = (rj as Record<string, unknown>).paperclip;
  if (!paperclip || typeof paperclip !== "object") return false;
  const ignored = (paperclip as Record<string, unknown>).ignoredNonZeroExitCode;
  return ignored != null;
}
