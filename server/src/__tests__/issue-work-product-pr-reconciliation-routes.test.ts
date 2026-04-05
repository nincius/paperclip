import express, { type Request } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { createIssueRoutesTestDeps } from "./helpers/issue-routes-test-deps.js";

type TestBoardActor = {
  type: "board";
  userId: string;
  companyIds: string[];
  source: string;
  isInstanceAdmin: boolean;
};

const testBoardActor: TestBoardActor = {
  type: "board",
  userId: "local-board",
  companyIds: ["company-1"],
  source: "local_implicit",
  isInstanceAdmin: false,
};

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
}));

const mockWorkProductService = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../services/index.js", () => ({
  accessService: () => ({
    canUser: vi.fn(),
    hasPermission: vi.fn(),
  }),
  agentService: () => ({
    getById: vi.fn(),
  }),
  documentService: () => ({}),
  executionWorkspaceService: () => ({}),
  goalService: () => ({}),
  heartbeatService: () => ({
    wakeup: vi.fn(async () => undefined),
    reportRunActivity: vi.fn(async () => undefined),
  }),
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  logActivity: mockLogActivity,
  projectService: () => ({}),
  routineService: () => ({
    syncRunStatusForIssue: vi.fn(async () => undefined),
  }),
  workProductService: () => mockWorkProductService,
}));

function createApp() {
  const { db, storage } = createIssueRoutesTestDeps();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as Request & { actor: TestBoardActor }).actor = testBoardActor;
    next();
  });
  app.use("/api", issueRoutes(db, storage));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err?.status ?? 500).json({
      error: err?.message ?? "Internal server error",
    });
  });
  return app;
}

describe("issue work product PR reconciliation routes", () => {
  /** Realistic UUID ids: `router.param("id")` treats non-UUID tokens like `wp-1` as issue identifiers. */
  const wpMerged = "a0000000-0000-4000-8000-000000000001";
  const wpClosed = "a0000000-0000-4000-8000-000000000002";
  const wpDraft = "a0000000-0000-4000-8000-000000000003";

  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getByIdentifier.mockResolvedValue(null);
  });

  it("auto-completes a source issue when a PR work product becomes merged", async () => {
    const sourceIssue = {
      id: "issue-1",
      companyId: "company-1",
      identifier: "PAP-700",
      title: "Implement feature",
      status: "handoff_ready",
      priority: "medium",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
    };
    const reviewChild = {
      id: "issue-review-1",
      companyId: "company-1",
      identifier: "PAP-701",
      title: "Review PR",
      status: "todo",
      priority: "medium",
      assigneeAgentId: "agent-reviewer",
      assigneeUserId: null,
      parentId: "issue-1",
      originKind: "technical_review_dispatch",
    };
    const product = {
      id: wpMerged,
      issueId: "issue-1",
      companyId: "company-1",
      projectId: null,
      executionWorkspaceId: null,
      runtimeServiceId: null,
      type: "pull_request",
      provider: "github",
      externalId: "218",
      title: "PR #218",
      url: "https://github.com/acme/app/pull/218",
      status: "merged",
      reviewState: "approved",
      isPrimary: true,
      healthStatus: "healthy",
      summary: null,
      metadata: { merged: true },
      createdByRunId: null,
      createdAt: new Date("2026-03-30T18:00:00.000Z"),
      updatedAt: new Date("2026-03-30T18:10:00.000Z"),
    };

    mockWorkProductService.getById.mockResolvedValue({
      ...product,
      status: "ready_for_review",
      metadata: { merged: false },
    });
    mockWorkProductService.update.mockResolvedValue(product);
    mockIssueService.getById.mockResolvedValue(sourceIssue);
    mockIssueService.list.mockResolvedValue([reviewChild]);
    mockIssueService.update
      .mockResolvedValueOnce({ ...sourceIssue, status: "technical_review" })
      .mockResolvedValueOnce({ ...sourceIssue, status: "human_review" })
      .mockResolvedValueOnce({ ...sourceIssue, status: "done" })
      .mockResolvedValueOnce({ ...reviewChild, status: "cancelled" });

    const res = await request(createApp())
      .patch(`/api/work-products/${wpMerged}`)
      .send({ status: "merged", reviewState: "approved", metadata: { merged: true } });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockIssueService.list).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ parentId: "issue-1" }),
    );
    expect(mockIssueService.update.mock.calls).toEqual([
      ["issue-1", { status: "technical_review" }],
      ["issue-1", { status: "human_review" }],
      ["issue-1", { status: "done" }],
      ["issue-review-1", { status: "cancelled" }],
    ]);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.updated",
        entityId: "issue-1",
        details: expect.objectContaining({
          autoCompletedFromPullRequest: true,
          workProductId: wpMerged,
          workProductStatus: "merged",
          cancelledChildIssueIds: ["issue-review-1"],
          transitions: [
            "handoff_ready->technical_review",
            "technical_review->human_review",
            "human_review->done",
          ],
        }),
      }),
    );
  });

  it("does not auto-complete when a PR is closed without merge evidence", async () => {
    const product = {
      id: wpClosed,
      issueId: "issue-2",
      companyId: "company-1",
      projectId: null,
      executionWorkspaceId: null,
      runtimeServiceId: null,
      type: "pull_request",
      provider: "github",
      externalId: "219",
      title: "PR #219",
      url: "https://github.com/acme/app/pull/219",
      status: "closed",
      reviewState: "approved",
      isPrimary: true,
      healthStatus: "healthy",
      summary: null,
      metadata: { merged: false },
      createdByRunId: null,
      createdAt: new Date("2026-03-30T18:00:00.000Z"),
      updatedAt: new Date("2026-03-30T18:10:00.000Z"),
    };

    mockWorkProductService.getById.mockResolvedValue(product);
    mockWorkProductService.update.mockResolvedValue(product);

    const res = await request(createApp())
      .patch(`/api/work-products/${wpClosed}`)
      .send({ status: "closed", metadata: { merged: false } });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockIssueService.getById).not.toHaveBeenCalled();
    expect(mockIssueService.update).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        details: expect.objectContaining({ autoCompletedFromPullRequest: true }),
      }),
    );
  });

  it("returns a human review issue to technical_review when the PR becomes draft again", async () => {
    const sourceIssue = {
      id: "issue-3",
      companyId: "company-1",
      identifier: "PAP-702",
      title: "Stale human review",
      status: "human_review",
      priority: "medium",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
    };
    const draftProduct = {
      id: wpDraft,
      issueId: "issue-3",
      companyId: "company-1",
      projectId: null,
      executionWorkspaceId: null,
      runtimeServiceId: null,
      type: "pull_request",
      provider: "github",
      externalId: "220",
      title: "PR #220",
      url: "https://github.com/acme/app/pull/220",
      status: "draft",
      reviewState: "changes_requested",
      isPrimary: true,
      healthStatus: "healthy",
      summary: null,
      metadata: { draft: true },
      createdByRunId: null,
      createdAt: new Date("2026-04-01T01:00:00.000Z"),
      updatedAt: new Date("2026-04-01T01:10:00.000Z"),
    };

    mockWorkProductService.getById.mockResolvedValue({
      ...draftProduct,
      status: "ready_for_review",
      metadata: { draft: false },
    });
    mockWorkProductService.update.mockResolvedValue(draftProduct);
    mockIssueService.getById.mockResolvedValueOnce(sourceIssue);
    mockIssueService.update.mockResolvedValueOnce({ ...sourceIssue, status: "technical_review" });

    const res = await request(createApp())
      .patch(`/api/work-products/${wpDraft}`)
      .send({ status: "draft", metadata: { draft: true } });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockIssueService.update.mock.calls).toEqual([
      ["issue-3", { status: "technical_review" }],
    ]);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.updated",
        entityId: "issue-3",
        details: expect.objectContaining({
          resolvedFromPullRequestDraft: true,
          workProductId: wpDraft,
          workProductStatus: "draft",
          statusTransitionPath: ["human_review->technical_review"],
        }),
      }),
    );
  });
});
