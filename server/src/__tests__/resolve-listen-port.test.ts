import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("detect-port", () => ({
  default: vi.fn(),
}));

import detectPort from "detect-port";
import { resolveListenPort } from "../resolve-listen-port.js";

describe("resolveListenPort", () => {
  afterEach(() => {
    vi.mocked(detectPort).mockReset();
  });

  it("returns selected port when strict mode is off even if drifted", async () => {
    vi.mocked(detectPort).mockResolvedValue(3101);
    await expect(resolveListenPort(3100, false)).resolves.toBe(3101);
  });

  it("returns configured port when strict mode is on and port is free", async () => {
    vi.mocked(detectPort).mockResolvedValue(3100);
    await expect(resolveListenPort(3100, true)).resolves.toBe(3100);
  });

  it("throws when strict mode is on and port is not free", async () => {
    vi.mocked(detectPort).mockResolvedValue(3101);
    await expect(resolveListenPort(3100, true)).rejects.toThrow(/PAPERCLIP_STRICT_LISTEN_PORT/);
  });

  it("throws without calling detectPort when port is not an integer", async () => {
    await expect(resolveListenPort(3100.5, false)).rejects.toThrow(/Invalid HTTP listen port/);
    await expect(resolveListenPort(Number.NaN, false)).rejects.toThrow(/Invalid HTTP listen port/);
    expect(detectPort).not.toHaveBeenCalled();
  });

  it("throws without calling detectPort when port is out of TCP range", async () => {
    await expect(resolveListenPort(0, false)).rejects.toThrow(/Invalid HTTP listen port/);
    await expect(resolveListenPort(65536, false)).rejects.toThrow(/Invalid HTTP listen port/);
    expect(detectPort).not.toHaveBeenCalled();
  });
});
