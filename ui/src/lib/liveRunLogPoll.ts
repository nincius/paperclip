import type { HeartbeatRunStatus } from "@paperclipai/shared";

/** Heartbeat run outcomes after which log polling is unnecessary. */
export const TERMINAL_RUN_STATUSES = new Set<HeartbeatRunStatus>([
  "failed",
  "timed_out",
  "cancelled",
  "succeeded",
]);

/** Heartbeat run statuses after which log polling is unnecessary. */
export function isTerminalRunStatus(status: HeartbeatRunStatus): boolean {
  return TERMINAL_RUN_STATUSES.has(status);
}

export function filterRunsForLogPolling<T extends { status: HeartbeatRunStatus }>(runs: T[]): T[] {
  return runs.filter((run) => !isTerminalRunStatus(run.status));
}
