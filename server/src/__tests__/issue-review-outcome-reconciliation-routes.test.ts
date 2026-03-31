import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const childIssueId = "11111111-1111-4111-8111-111111111111";
const parentIssueId = "22222222-2222-4222-8222-222222222222";
const executorAgentId = "33333333-3333-4333-8333-333333333333";
const reviewerAgentId = "44444444-4444-4444-8444-444444444444";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
  update: vi.fn(),
  addComment: vi.fn(),
  listComments: vi.fn(),
  findMentionedAgents: vi.fn(),
  checkout: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(async () => undefined),
  reportRunActivity: vi.fn(async () => undefined),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn(async () => undefined));
const mockRoutineService = vi.hoisted(() => ({
  syncRunStatusForIssue: vi.fn(async () => undefined),
}));

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccessService,
  agentService: () => mockAgentService,
  documentService: () => ({}),
  executionWorkspaceService: () => ({}),
  goalService: () => ({}),
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  logActivity: mockLogActivity,
  projectService: () => ({}),
  routineService: () => mockRoutineService,
  workProductService: () => ({
    listForIssue: vi.fn(async () => []),
  }),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "local-board",
      companyIds: ["company-1"],
      source: "local_implicit",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

function makeReviewIssue(status: string) {
  return {
    id: childIssueId,
    companyId: "company-1",
    status,
    assigneeAgentId: reviewerAgentId,
    assigneeUserId: null,
    createdByUserId: null,
    identifier: "PAP-701",
    title: "Review issue",
    parentId: parentIssueId,
    originKind: "technical_review_dispatch",
  };
}

function makeManualReviewIssue(status: string) {
  return {
    ...makeReviewIssue(status),
    originKind: "manual",
    title: "Revisar PR #999 de PAP-700",
  };
}

function makeParentIssue(status: string) {
  return {
    id: parentIssueId,
    companyId: "company-1",
    status,
    assigneeAgentId: executorAgentId,
    assigneeUserId: null,
    createdByUserId: "local-board",
    identifier: "PAP-700",
    title: "Source issue",
    originKind: "manual",
    parentId: null,
  };
}

describe("issue review outcome reconciliation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getByIdentifier.mockResolvedValue(null);
    mockIssueService.listComments.mockResolvedValue([]);
    mockIssueService.findMentionedAgents.mockResolvedValue([]);
    mockIssueService.addComment.mockResolvedValue({
      id: "comment-1",
      issueId: childIssueId,
      companyId: "company-1",
      body: "review summary",
      createdAt: new Date(),
      updatedAt: new Date(),
      authorAgentId: reviewerAgentId,
      authorUserId: null,
    });
  });

  it("returns the parent issue to in_progress when the technical review has blocking findings", async () => {
    const existingChild = makeReviewIssue("technical_review");
    const updatedChild = makeReviewIssue("done");
    const parent = makeParentIssue("handoff_ready");

    mockIssueService.getById
      .mockResolvedValueOnce(existingChild)
      .mockResolvedValueOnce(parent);
    mockIssueService.update.mockResolvedValueOnce(updatedChild);
    mockHeartbeatService.wakeup.mockResolvedValue({ id: "run-parent-1" });
    mockIssueService.checkout.mockResolvedValue({
      ...parent,
      status: "in_progress",
      checkoutRunId: "run-parent-1",
      executionRunId: "run-parent-1",
    });

    const res = await request(createApp())
      .patch(`/api/issues/${childIssueId}`)
      .send({
        status: "done",
        comment: `## Revisao tecnica concluida

### Findings bloqueantes
1. Regressao importante no fluxo.

### Decisao operacional
- Retornar [PAP-700](/PAP/issues/PAP-700) para \`in_progress\` ate corrigir o finding bloqueante.`,
      });

    expect(res.status).toBe(200);
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      executorAgentId,
      expect.objectContaining({
        source: "assignment",
        triggerDetail: "system",
        reason: "issue_status_changed",
        payload: expect.objectContaining({
          issueId: parentIssueId,
          reviewIssueId: childIssueId,
          mutation: "review_blocking_findings",
        }),
      }),
    );
    expect(mockIssueService.checkout).toHaveBeenCalledWith(
      parentIssueId,
      executorAgentId,
      ["handoff_ready"],
      "run-parent-1",
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.review_outcome_reconciled",
        entityId: parentIssueId,
        details: expect.objectContaining({
          outcome: "blocking",
          reviewIssueId: childIssueId,
          resumedRunId: "run-parent-1",
        }),
      }),
    );
  });

  it("advances the parent issue to human_review when the technical review has no blocking findings", async () => {
    const existingChild = makeReviewIssue("technical_review");
    const updatedChild = makeReviewIssue("done");
    const parent = makeParentIssue("handoff_ready");

    mockIssueService.getById
      .mockResolvedValueOnce(existingChild)
      .mockResolvedValueOnce(parent);
    mockIssueService.update
      .mockResolvedValueOnce(updatedChild)
      .mockResolvedValueOnce({ ...parent, status: "technical_review" })
      .mockResolvedValueOnce({ ...parent, status: "human_review" });

    const res = await request(createApp())
      .patch(`/api/issues/${childIssueId}`)
      .send({
        status: "done",
        comment: `## Revisao tecnica concluida

### Findings bloqueantes
- Nenhum.

### Decisao operacional
- [PAP-700](/PAP/issues/PAP-700) pode seguir para revisao humana final/merge.`,
      });

    expect(res.status).toBe(200);
    expect(mockIssueService.update.mock.calls).toEqual([
      [childIssueId, { status: "done" }],
      [parentIssueId, { status: "technical_review" }],
      [parentIssueId, { status: "human_review" }],
    ]);
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.review_outcome_reconciled",
        entityId: parentIssueId,
        details: expect.objectContaining({
          outcome: "approved",
          reviewIssueId: childIssueId,
          transitions: [
            "handoff_ready->technical_review",
            "technical_review->human_review",
          ],
        }),
      }),
    );
  });

  it("reconciles from the latest review comment when the child is closed without an inline patch comment", async () => {
    const existingChild = makeReviewIssue("technical_review");
    const updatedChild = makeReviewIssue("done");
    const parent = makeParentIssue("handoff_ready");

    mockIssueService.getById
      .mockResolvedValueOnce(existingChild)
      .mockResolvedValueOnce(parent);
    mockIssueService.update
      .mockResolvedValueOnce(updatedChild)
      .mockResolvedValueOnce({ ...parent, status: "technical_review" })
      .mockResolvedValueOnce({ ...parent, status: "human_review" });
    mockIssueService.listComments.mockResolvedValue([
      {
        id: "review-comment-1",
        issueId: childIssueId,
        companyId: "company-1",
        body: `## Revisao tecnica concluida

### Findings bloqueantes
- Nenhum.

### Decisao operacional
- [PAP-700](/PAP/issues/PAP-700) pode seguir para revisao humana final/merge.`,
        createdAt: new Date(),
        updatedAt: new Date(),
        authorAgentId: reviewerAgentId,
        authorUserId: null,
      },
    ]);

    const res = await request(createApp())
      .patch(`/api/issues/${childIssueId}`)
      .send({
        status: "done",
      });

    expect(res.status).toBe(200);
    expect(mockIssueService.listComments).toHaveBeenCalledWith(childIssueId, {
      order: "desc",
      limit: 10,
    });
    expect(mockIssueService.update.mock.calls).toEqual([
      [childIssueId, { status: "done" }],
      [parentIssueId, { status: "technical_review" }],
      [parentIssueId, { status: "human_review" }],
    ]);
  });

  it("reconciles a manual review child when it clearly matches the review-ticket pattern", async () => {
    const existingChild = makeManualReviewIssue("technical_review");
    const updatedChild = makeManualReviewIssue("done");
    const parent = makeParentIssue("handoff_ready");

    mockIssueService.getById
      .mockResolvedValueOnce(existingChild)
      .mockResolvedValueOnce(parent);
    mockIssueService.update
      .mockResolvedValueOnce(updatedChild)
      .mockResolvedValueOnce({ ...parent, status: "technical_review" })
      .mockResolvedValueOnce({ ...parent, status: "human_review" });

    const res = await request(createApp())
      .patch(`/api/issues/${childIssueId}`)
      .send({
        status: "done",
        comment: `## Resumo de revisão técnica

- Blocking findings: nenhum
- Non-blocking findings: nenhum
- Decisão operacional: [PAP-700](/PAP/issues/PAP-700) pode seguir para revisão humana final (nenhum finding aberto).`,
      });

    expect(res.status).toBe(200);
    expect(mockIssueService.update.mock.calls).toEqual([
      [childIssueId, { status: "done" }],
      [parentIssueId, { status: "technical_review" }],
      [parentIssueId, { status: "human_review" }],
    ]);
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.review_outcome_reconciled",
        entityId: parentIssueId,
        details: expect.objectContaining({
          outcome: "approved",
          reviewIssueId: childIssueId,
        }),
      }),
    );
  });
});
