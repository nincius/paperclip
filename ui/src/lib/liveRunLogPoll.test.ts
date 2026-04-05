import type { HeartbeatRunStatus } from "@paperclipai/shared";
import { describe, expect, it } from "vitest";
import { filterRunsForLogPolling, isTerminalRunStatus } from "./liveRunLogPoll";

type RunRow = { id: string; status: HeartbeatRunStatus };

describe("isTerminalRunStatus", () => {
  it("treats finished outcomes as terminal", () => {
    expect(isTerminalRunStatus("succeeded")).toBe(true);
    expect(isTerminalRunStatus("failed")).toBe(true);
    expect(isTerminalRunStatus("cancelled")).toBe(true);
    expect(isTerminalRunStatus("timed_out")).toBe(true);
  });

  it("treats in-flight statuses as non-terminal", () => {
    expect(isTerminalRunStatus("running")).toBe(false);
    expect(isTerminalRunStatus("queued")).toBe(false);
  });
});

describe("filterRunsForLogPolling", () => {
  it("returns an empty array when given no runs", () => {
    expect(filterRunsForLogPolling([])).toEqual([]);
  });

  it("returns an empty array when every run is terminal", () => {
    const runs: RunRow[] = [
      { id: "a", status: "succeeded" },
      { id: "b", status: "failed" },
      { id: "c", status: "cancelled" },
      { id: "d", status: "timed_out" },
    ];
    expect(filterRunsForLogPolling(runs).map((r) => r.id)).toEqual([]);
  });

  it("returns every run id when no run is terminal", () => {
    const runs: RunRow[] = [
      { id: "a", status: "running" },
      { id: "b", status: "queued" },
    ];
    expect(filterRunsForLogPolling(runs).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("keeps only non-terminal runs when statuses are mixed", () => {
    const runs: RunRow[] = [
      { id: "q", status: "queued" },
      { id: "x", status: "cancelled" },
      { id: "t", status: "timed_out" },
      { id: "r", status: "running" },
    ];
    expect(filterRunsForLogPolling(runs).map((r) => r.id)).toEqual(["q", "r"]);
  });

  it("drops terminal runs", () => {
    const runs: RunRow[] = [
      { id: "a", status: "running" },
      { id: "b", status: "succeeded" },
      { id: "c", status: "failed" },
    ];
    expect(filterRunsForLogPolling(runs).map((r) => r.id)).toEqual(["a"]);
  });
});
