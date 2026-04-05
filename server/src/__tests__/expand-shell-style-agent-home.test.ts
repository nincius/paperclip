import { describe, expect, it } from "vitest";
import { expandShellStyleAgentHome } from "@paperclipai/adapter-utils/server-utils";

describe("expandShellStyleAgentHome", () => {
  it("replaces $AGENT_HOME with the given directory", () => {
    expect(expandShellStyleAgentHome("Read $AGENT_HOME/HEARTBEAT.md", "/tmp/agent")).toBe(
      "Read /tmp/agent/HEARTBEAT.md",
    );
  });

  it("replaces every $AGENT_HOME occurrence and handles path edges", () => {
    expect(
      expandShellStyleAgentHome("$AGENT_HOME/a and $AGENT_HOME/b", "/tmp/agent"),
    ).toBe("/tmp/agent/a and /tmp/agent/b");
    expect(expandShellStyleAgentHome("$AGENT_HOME/file", "/tmp/agent")).toBe("/tmp/agent/file");
    expect(expandShellStyleAgentHome("$AGENT_HOME", "/tmp/agent")).toBe("/tmp/agent");
    expect(expandShellStyleAgentHome("$AGENT_HOME/file", "/tmp/agent/")).toBe("/tmp/agent/file");
  });

  it("is a no-op without agent home", () => {
    const s = "See $AGENT_HOME/x";
    expect(expandShellStyleAgentHome(s, null)).toBe(s);
    expect(expandShellStyleAgentHome(s, "")).toBe(s);
    expect(expandShellStyleAgentHome(s, "   ")).toBe(s);
    expect(expandShellStyleAgentHome("", null)).toBe("");
    expect(expandShellStyleAgentHome("", "   ")).toBe("");
  });
});
