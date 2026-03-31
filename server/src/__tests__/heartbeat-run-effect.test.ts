import { describe, expect, it } from "vitest";
import { summarizeHeartbeatRunOperationalEffect } from "../services/heartbeat-run-effect.js";

describe("summarizeHeartbeatRunOperationalEffect", () => {
  it("returns an empty effect summary when no impactful activity exists", () => {
    expect(summarizeHeartbeatRunOperationalEffect([])).toEqual({
      producedEffect: false,
      activityCount: 0,
      actions: [],
      signals: [],
      summary: null,
      counts: {
        comments: 0,
        statusChanges: 0,
        handoffs: 0,
        assignmentChanges: 0,
        checkouts: 0,
        documents: 0,
        workProducts: 0,
        approvals: 0,
        attachments: 0,
        issueCreations: 0,
        releases: 0,
        otherMutations: 0,
      },
    });
  });

  it("detects comments, status transitions, and handoffs", () => {
    const effect = summarizeHeartbeatRunOperationalEffect([
      {
        runId: "run-1",
        action: "issue.comment_added",
        details: { commentId: "c1" },
      },
      {
        runId: "run-1",
        action: "issue.updated",
        details: {
          status: "technical_review",
          _previous: { status: "in_progress" },
        },
      },
    ]);

    expect(effect.producedEffect).toBe(true);
    expect(effect.activityCount).toBe(2);
    expect(effect.actions).toEqual(["issue.comment_added", "issue.updated"]);
    expect(effect.signals).toEqual(["handoffs", "comments", "statusChanges"]);
    expect(effect.counts.comments).toBe(1);
    expect(effect.counts.statusChanges).toBe(1);
    expect(effect.counts.handoffs).toBe(1);
    expect(effect.summary).toBe("1 handoff, 1 comment, 1 status change");
  });

  it("counts assignment and generic mutations from issue updates", () => {
    const effect = summarizeHeartbeatRunOperationalEffect([
      {
        runId: "run-2",
        action: "issue.updated",
        details: {
          assigneeAgentId: "agent-2",
          title: "New title",
          _previous: {
            assigneeAgentId: "agent-1",
            title: "Old title",
          },
        },
      },
    ]);

    expect(effect.producedEffect).toBe(true);
    expect(effect.activityCount).toBe(1);
    expect(effect.counts.assignmentChanges).toBe(1);
    expect(effect.counts.otherMutations).toBe(0);
  });

  it("treats non-noise non-issue actions as other mutations", () => {
    const effect = summarizeHeartbeatRunOperationalEffect([
      {
        runId: "run-3",
        action: "agent.created",
        details: null,
      },
      {
        runId: "run-3",
        action: "heartbeat.invoked",
        details: null,
      },
    ]);

    expect(effect.producedEffect).toBe(true);
    expect(effect.activityCount).toBe(1);
    expect(effect.counts.otherMutations).toBe(1);
    expect(effect.actions).toEqual(["agent.created"]);
  });
});
