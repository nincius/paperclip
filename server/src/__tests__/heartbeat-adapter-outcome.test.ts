import { describe, expect, it } from "vitest";
import type { AdapterExecutionResult } from "../adapters/index.js";
import { adapterSignalsIgnorableNonZeroExit } from "../services/heartbeat-adapter-outcome.js";

function baseResult(overrides: Partial<AdapterExecutionResult> = {}): AdapterExecutionResult {
  return {
    exitCode: 1,
    signal: null,
    timedOut: false,
    errorMessage: null,
    ...overrides,
  };
}

describe("adapterSignalsIgnorableNonZeroExit", () => {
  it("is true when paperclip.ignoredNonZeroExitCode is set", () => {
    expect(
      adapterSignalsIgnorableNonZeroExit(
        baseResult({
          resultJson: { paperclip: { ignoredNonZeroExitCode: 1, reason: "codex_last_event_turn_completed" } },
        }),
      ),
    ).toBe(true);
  });

  it("is false when resultJson is missing", () => {
    expect(adapterSignalsIgnorableNonZeroExit(baseResult())).toBe(false);
  });

  it("is false when paperclip block is missing", () => {
    expect(adapterSignalsIgnorableNonZeroExit(baseResult({ resultJson: { stdout: "x" } }))).toBe(false);
  });

  it("is false when ignoredNonZeroExitCode is null", () => {
    expect(
      adapterSignalsIgnorableNonZeroExit(baseResult({ resultJson: { paperclip: { ignoredNonZeroExitCode: null } } })),
    ).toBe(false);
  });

  it("is true when ignoredNonZeroExitCode is 0 (property present; loose ignorable signal)", () => {
    expect(
      adapterSignalsIgnorableNonZeroExit(
        baseResult({ resultJson: { paperclip: { ignoredNonZeroExitCode: 0 } } }),
      ),
    ).toBe(true);
  });

  it("is false when ignoredNonZeroExitCode is undefined", () => {
    expect(
      adapterSignalsIgnorableNonZeroExit(
        baseResult({ resultJson: { paperclip: { ignoredNonZeroExitCode: undefined } } }),
      ),
    ).toBe(false);
  });

  it("is false when paperclip is null", () => {
    expect(adapterSignalsIgnorableNonZeroExit(baseResult({ resultJson: { paperclip: null } }))).toBe(false);
  });
});
