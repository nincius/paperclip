import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentRoutes } from "../routes/agents.js";
import { errorHandler } from "../middleware/index.js";

const mockAgent = {
  id: "agent-1",
  companyId: "company-1",
  name: "Test Agent",
  role: "engineer",
  title: "",
  status: "active",
  adapterType: "codex_local",
  adapterConfig: {
    cwd: "/tmp",
    env: {
      OPENAI_API_KEY: "sk-foo",
      DB: { type: "plain", value: "postgres://user:pass@host/db" },
      REF: { type: "secret_ref", secretId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
    },
    apiKey: "plain-secret",
  },
  runtimeConfig: null,
  permissions: {},
};

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(async () => mockAgent),
  getChainOfCommand: vi.fn(async () => []),
  list: vi.fn(async (_companyId: string) => [mockAgent]),
}));

vi.mock("../services/index.js", () => ({
  accessService: () => ({
    canUser: vi.fn(async () => true),
    hasPermission: vi.fn(async () => false),
    getMembership: vi.fn(async () => null),
    listPrincipalGrants: vi.fn(async () => []),
    ensureMembership: vi.fn(async () => undefined),
    setPrincipalPermission: vi.fn(async () => undefined),
  }),
  agentService: () => mockAgentService,
  agentInstructionsService: () => ({
    getBundle: vi.fn(async () => ({ mode: "external", rootPath: "/tmp", entryFile: "AGENTS.md" })),
    materializeManagedBundle: vi.fn(async (a: any) => ({ adapterConfig: a.adapterConfig, bundle: { mode: "external" } })),
    writeFile: vi.fn(async () => ({})),
  }),
  approvalService: () => ({}),
  budgetService: () => ({}),
  companySkillService: () => ({}),
  heartbeatService: () => ({
    wakeup: vi.fn(async () => undefined),
    getRun: vi.fn(async () => null),
  }),
  issueApprovalService: () => ({}),
  issueService: () => ({ list: vi.fn(async () => []) }),
  logActivity: vi.fn(async () => undefined),
  secretService: () => ({ resolveAdapterConfigForRuntime: vi.fn(async (_c:any, cfg:any)=>({ config: cfg })) }),
  workspaceOperationService: () => ({}),
  instanceSettingsService: () => ({ getGeneral: vi.fn(async () => ({ censorUsernameInLogs: false })) }),
}));

function createApp(actor: any) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", agentRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("agents routes redaction", () => {
  beforeEach(() => {
    mockAgentService.getById.mockResolvedValue(mockAgent);
    mockAgentService.getChainOfCommand.mockResolvedValue([]);
    mockAgentService.list.mockResolvedValue([mockAgent]);
  });

  it("GET /api/agents/me não expõe valores de env (apenas metadados)", async () => {
    const app = createApp({ type: "agent", agentId: "agent-1", companyId: "company-1", source: "local_implicit" });
    const res = await request(app).get("/api/agents/me");
    expect(res.status).toBe(200);
    const env = res.body.adapterConfig.env;
    expect(env.OPENAI_API_KEY).toEqual({ type: "plain", hasValue: true });
    expect(env.DB).toEqual({ type: "plain", hasValue: true });
    expect(env.REF).toEqual({ type: "secret_ref", hasValue: true });
    // apiKey must be redacted by key-based sanitizer
    expect(res.body.adapterConfig.apiKey).toBe("***REDACTED***");
  });

  it("GET /api/companies/:companyId/agents redige env na listagem", async () => {
    const app = createApp({ type: "board", userId: "local-board", companyIds: ["company-1"], source: "local_implicit", isInstanceAdmin: false });
    const res = await request(app).get("/api/companies/company-1/agents");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const env = res.body[0].adapterConfig.env;
    expect(env.OPENAI_API_KEY).toEqual({ type: "plain", hasValue: true });
  });
});
