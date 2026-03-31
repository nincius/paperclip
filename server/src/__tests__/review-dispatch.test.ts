import { describe, expect, it, vi } from "vitest";
import { reviewDispatchService, REVIEW_DISPATCH_ORIGIN_KIND } from "../services/review-dispatch.ts";

function makeIssue(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "issue-1",
    companyId: "company-1",
    projectId: "project-1",
    projectWorkspaceId: "workspace-1",
    goalId: "goal-1",
    parentId: null,
    title: "Source issue",
    description: "Source issue description",
    status: "handoff_ready",
    priority: "high",
    assigneeAgentId: "agent-1",
    assigneeUserId: null,
    billingCode: null,
    executionWorkspaceId: "exec-1",
    identifier: "TCN-15",
    originKind: "manual",
    originId: null,
    createdAt: new Date("2026-03-29T21:25:00.000Z"),
    updatedAt: new Date("2026-03-29T21:25:00.000Z"),
    ...overrides,
  };
}

function makeComment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "comment-1",
    issueId: "issue-1",
    companyId: "company-1",
    body: "## Handoff\n\nPR: https://github.com/acme/app/pull/212",
    createdAt: new Date("2026-03-29T21:25:15.000Z"),
    updatedAt: new Date("2026-03-29T21:25:15.000Z"),
    authorAgentId: "agent-1",
    authorUserId: null,
    ...overrides,
  };
}

function makeReviewIssue(overrides: Partial<Record<string, unknown>> = {}) {
  return makeIssue({
    id: "review-1",
    identifier: "TCN-59",
    title: "Revisar PR #212 de TCN-15",
    description: "## Links\n\n- PR atual: https://github.com/acme/app/pull/212",
    assigneeAgentId: "reviewer-1",
    parentId: "issue-1",
    status: "todo",
    createdAt: new Date("2026-03-29T21:47:05.000Z"),
    ...overrides,
  });
}

describe("reviewDispatchService", () => {
  it("creates a technical review subtask from the latest handoff comment", async () => {
    const createdReviewIssue = makeReviewIssue({
      originKind: REVIEW_DISPATCH_ORIGIN_KIND,
      originId: "github:acme/app:pr:212:comment:comment-1",
    });

    const agents = {
      resolveByReference: vi.fn(async () => ({
        agent: { id: "reviewer-1", companyId: "company-1", name: "Revisor PR", status: "idle" },
        ambiguous: false,
      })),
    };
    const issues = {
      getById: vi.fn(async () => makeIssue()),
      getComment: vi.fn(async () => makeComment()),
      listComments: vi.fn(async () => []),
      list: vi.fn(async () => []),
      create: vi.fn(async () => createdReviewIssue),
    };
    const workProducts = {
      listForIssue: vi.fn(async () => []),
    };

    const svc = reviewDispatchService({} as any, { agents: agents as any, issues: issues as any, workProducts: workProducts as any });
    const result = await svc.dispatchForIssue({ issueId: "issue-1", commentId: "comment-1" });

    expect(result.kind).toBe("created");
    expect(issues.create).toHaveBeenCalledWith("company-1", expect.objectContaining({
      title: "Revisar PR #212 de TCN-15",
      assigneeAgentId: "reviewer-1",
      parentId: "issue-1",
      originKind: REVIEW_DISPATCH_ORIGIN_KIND,
      originId: "github:acme/app:pr:212:comment:comment-1",
    }));
    expect(issues.create).toHaveBeenCalledWith("company-1", expect.objectContaining({
      description: expect.stringContaining("[TCN-15](/TCN/issues/TCN-15)"),
    }));
    expect(issues.create).toHaveBeenCalledWith("company-1", expect.objectContaining({
      description: expect.stringContaining("/TCN/issues/TCN-15#comment-comment-1"),
    }));
  });

  it("reuses an existing historical review ticket seeded after the same handoff comment", async () => {
    const currentComment = makeComment();
    const existingReviewIssue = makeReviewIssue({
      originKind: "manual",
      originId: null,
      createdAt: new Date("2026-03-29T21:47:05.000Z"),
    });

    const agents = {
      resolveByReference: vi.fn(async () => ({
        agent: { id: "reviewer-1", companyId: "company-1", name: "Revisor PR", status: "idle" },
        ambiguous: false,
      })),
    };
    const issues = {
      getById: vi.fn(async () => makeIssue()),
      getComment: vi.fn(async () => currentComment),
      listComments: vi.fn(async () => []),
      list: vi.fn(async () => [existingReviewIssue]),
      create: vi.fn(),
    };
    const workProducts = {
      listForIssue: vi.fn(async () => []),
    };

    const svc = reviewDispatchService({} as any, { agents: agents as any, issues: issues as any, workProducts: workProducts as any });
    const result = await svc.dispatchForIssue({ issueId: "issue-1", commentId: "comment-1" });

    expect(result.kind).toBe("reused");
    expect(result.reviewIssue.id).toBe("review-1");
    expect(issues.create).not.toHaveBeenCalled();
  });

  it("recognizes an already-reviewed diff by origin identity", async () => {
    const existingReviewIssue = makeReviewIssue({
      status: "done",
      originKind: REVIEW_DISPATCH_ORIGIN_KIND,
      originId: "github:acme/app:pr:212:comment:comment-1",
    });

    const agents = {
      resolveByReference: vi.fn(async () => ({
        agent: { id: "reviewer-1", companyId: "company-1", name: "Revisor PR", status: "idle" },
        ambiguous: false,
      })),
    };
    const issues = {
      getById: vi.fn(async () => makeIssue()),
      getComment: vi.fn(async () => makeComment()),
      listComments: vi.fn(async () => []),
      list: vi.fn(async () => [existingReviewIssue]),
      create: vi.fn(),
    };
    const workProducts = {
      listForIssue: vi.fn(async () => []),
    };

    const svc = reviewDispatchService({} as any, { agents: agents as any, issues: issues as any, workProducts: workProducts as any });
    const result = await svc.dispatchForIssue({ issueId: "issue-1", commentId: "comment-1" });

    expect(result.kind).toBe("already_reviewed");
    expect(result.reviewIssue.id).toBe("review-1");
    expect(issues.create).not.toHaveBeenCalled();
  });

  it("does not create a new review ticket when the handoff comment explicitly says there is no new diff", async () => {
    const existingReviewIssue = makeReviewIssue({
      status: "done",
      originKind: REVIEW_DISPATCH_ORIGIN_KIND,
      originId: "github:acme/app:pr:212:comment:comment-previous",
      createdAt: new Date("2026-03-29T21:47:05.000Z"),
    });
    const restoredComment = makeComment({
      id: "comment-restore",
      body: `## Handoff restaurado

- resumo: mantive o mesmo change set e restaurei o estado de handoff sem alterar codigo, commit, push ou PR.
- PR: https://github.com/acme/app/pull/212`,
      createdAt: new Date("2026-03-29T22:05:00.000Z"),
    });

    const agents = {
      resolveByReference: vi.fn(async () => ({
        agent: { id: "reviewer-1", companyId: "company-1", name: "Revisor PR", status: "idle" },
        ambiguous: false,
      })),
    };
    const issues = {
      getById: vi.fn(async () => makeIssue()),
      getComment: vi.fn(async () => restoredComment),
      listComments: vi.fn(async () => []),
      list: vi.fn(async () => [existingReviewIssue]),
      create: vi.fn(),
    };
    const workProducts = {
      listForIssue: vi.fn(async () => []),
    };

    const svc = reviewDispatchService({} as any, { agents: agents as any, issues: issues as any, workProducts: workProducts as any });
    const result = await svc.dispatchForIssue({ issueId: "issue-1", commentId: "comment-restore" });

    expect(result.kind).toBe("already_reviewed");
    expect(result.reviewIssue.id).toBe("review-1");
    expect(issues.create).not.toHaveBeenCalled();
  });

  it("treats 'sem novas mudancas de codigo nesta rodada' as no new diff wording", async () => {
    const existingReviewIssue = makeReviewIssue({
      status: "done",
      originKind: REVIEW_DISPATCH_ORIGIN_KIND,
      originId: "github:acme/app:pr:212:comment:comment-previous",
      createdAt: new Date("2026-03-29T21:47:05.000Z"),
    });
    const restoredComment = makeComment({
      id: "comment-restore-pt",
      body: `## Handoff

- resumo: revisao tecnica automatizada 2 concluiu sem findings; PR segue pronto para revisao humana final, sem novas mudancas de codigo nesta rodada.
- PR: https://github.com/acme/app/pull/212`,
      createdAt: new Date("2026-03-29T22:10:00.000Z"),
    });

    const agents = {
      resolveByReference: vi.fn(async () => ({
        agent: { id: "reviewer-1", companyId: "company-1", name: "Revisor PR", status: "idle" },
        ambiguous: false,
      })),
    };
    const issues = {
      getById: vi.fn(async () => makeIssue()),
      getComment: vi.fn(async () => restoredComment),
      listComments: vi.fn(async () => []),
      list: vi.fn(async () => [existingReviewIssue]),
      create: vi.fn(),
    };
    const workProducts = {
      listForIssue: vi.fn(async () => []),
    };

    const svc = reviewDispatchService({} as any, { agents: agents as any, issues: issues as any, workProducts: workProducts as any });
    const result = await svc.dispatchForIssue({ issueId: "issue-1", commentId: "comment-restore-pt" });

    expect(result.kind).toBe("already_reviewed");
    expect(result.reviewIssue.id).toBe("review-1");
    expect(issues.create).not.toHaveBeenCalled();
  });
});
