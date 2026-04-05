import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ensureDailyMemoryNoteUnderAgentHome } from "../services/ensure-agent-daily-memory.js";

describe("ensureDailyMemoryNoteUnderAgentHome", () => {
  it("creates memory/YYYY-MM-DD.md when absent", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "pc-agent-home-"));
    const fixed = new Date(Date.UTC(2026, 3, 2, 12, 0, 0)); // 2 Apr 2026 local depends on TZ — use noon UTC and read local ymd from impl
    await ensureDailyMemoryNoteUnderAgentHome(base, fixed);

    const y = fixed.getFullYear();
    const m = String(fixed.getMonth() + 1).padStart(2, "0");
    const d = String(fixed.getDate()).padStart(2, "0");
    const rel = path.join("memory", `${y}-${m}-${d}.md`);
    const content = await fs.readFile(path.join(base, rel), "utf8");
    expect(content).toContain(`# ${y}-${m}-${d}`);
    expect(content).toContain("## Today's Plan");
    expect(content).toContain("## Timeline");
  });

  it("does not overwrite an existing daily note", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "pc-agent-home-"));
    const fixed = new Date(2026, 2, 15, 10, 0, 0);
    await ensureDailyMemoryNoteUnderAgentHome(base, fixed);
    const ymd = `${fixed.getFullYear()}-${String(fixed.getMonth() + 1).padStart(2, "0")}-${String(fixed.getDate()).padStart(2, "0")}`;
    const filePath = path.join(base, "memory", `${ymd}.md`);
    await fs.writeFile(filePath, "keep me", "utf8");
    await ensureDailyMemoryNoteUnderAgentHome(base, fixed);
    expect(await fs.readFile(filePath, "utf8")).toBe("keep me");
  });

  it("replaces a daily note path that is a symlink without writing through the link", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "pc-agent-home-"));
    const fixed = new Date(2026, 5, 10, 10, 0, 0);
    const ymd = `${fixed.getFullYear()}-${String(fixed.getMonth() + 1).padStart(2, "0")}-${String(fixed.getDate()).padStart(2, "0")}`;
    await fs.mkdir(path.join(base, "memory"), { recursive: true });
    const victim = path.join(base, "victim.md");
    await fs.writeFile(victim, "do not clobber", "utf8");
    const filePath = path.join(base, "memory", `${ymd}.md`);
    await fs.symlink(victim, filePath);
    await ensureDailyMemoryNoteUnderAgentHome(base, fixed);
    expect(await fs.readFile(victim, "utf8")).toBe("do not clobber");
    const created = await fs.readFile(filePath, "utf8");
    expect(created).toContain(`# ${ymd}`);
    expect(await fs.lstat(filePath).then((s) => s.isFile() && !s.isSymbolicLink())).toBe(true);
  });
});
