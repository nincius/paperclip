import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentRoutes } from "../routes/agents.js";
import { errorHandler } from "../middleware/index.js";

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  resolveByReference: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
  getMembership: vi.fn(),
  listPrincipalGrants: vi.fn(),
  ensureMembership: vi.fn(),
  setPrincipalPermission: vi.fn(),
}));

const mockApprovalService = vi.hoisted(() => ({
  create: vi.fn(),
}));
const mockBudgetService = vi.hoisted(() => ({}));
const mockHeartbeatService = vi.hoisted(() => ({}));
const mockIssueApprovalService = vi.hoisted(() => ({
  linkManyForApproval: vi.fn(),
}));
const mockWorkspaceOperationService = vi.hoisted(() => ({}));
const mockAgentInstructionsService = vi.hoisted(() => ({
  getBundle: vi.fn(),
  readFile: vi.fn(),
  updateBundle: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  exportFiles: vi.fn(),
  ensureManagedBundle: vi.fn(),
  materializeManagedBundle: vi.fn(),
}));

const mockCompanySkillService = vi.hoisted(() => ({
  listRuntimeSkillEntries: vi.fn(),
  resolveRequestedSkillKeys: vi.fn(),
}));

const mockSecretService = vi.hoisted(() => ({
  resolveAdapterConfigForRuntime: vi.fn(),
  normalizeAdapterConfigForPersistence: vi.fn(async (_companyId: string, config: Record<string, unknown>) => config),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

const mockAdapter = vi.hoisted(() => ({
  listSkills: vi.fn(),
  syncSkills: vi.fn(),
  testEnvironment: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  agentService: () => mockAgentService,
  agentInstructionsService: () => mockAgentInstructionsService,
  accessService: () => mockAccessService,
  approvalService: () => mockApprovalService,
  companySkillService: () => mockCompanySkillService,
  budgetService: () => mockBudgetService,
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => mockIssueApprovalService,
  issueService: () => ({}),
  logActivity: mockLogActivity,
  secretService: () => mockSecretService,
  syncInstructionsBundleConfigFromFilePath: vi.fn((_agent, config) => config),
  workspaceOperationService: () => mockWorkspaceOperationService,
}));

vi.mock("../adapters/index.js", () => ({
  findServerAdapter: vi.fn(() => mockAdapter),
  listAdapterModels: vi.fn(),
}));

function createDb(requireBoardApprovalForNewAgents = false) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: "company-1",
            requireBoardApprovalForNewAgents,
          },
        ]),
      })),
    })),
  };
}

function createApp(db: Record<string, unknown> = createDb()) {
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
  app.use("/api", agentRoutes(db as any));
  app.use(errorHandler);
  return app;
}

function makeAgent(adapterType: string) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    companyId: "company-1",
    name: "Agent",
    role: "engineer",
    title: "Engineer",
    status: "active",
    reportsTo: null,
    capabilities: null,
    adapterType,
    adapterConfig: {},
    runtimeConfig: {},
    permissions: null,
    updatedAt: new Date(),
  };
}

let testPaperclipHome: string;

async function listBundleFiles(rootPath: string, relativeDir = ""): Promise<string[]> {
  const currentPath = relativeDir ? path.join(rootPath, relativeDir) : rootPath;
  const entries = await fs.readdir(currentPath, { withFileTypes: true }).catch(() => []);
  const output: string[] = [];
  for (const entry of entries) {
    const relativePath = relativeDir ? path.posix.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      output.push(...await listBundleFiles(rootPath, relativePath));
      continue;
    }
    if (entry.isFile()) {
      output.push(relativePath.replaceAll("\\", "/"));
    }
  }
  return output.sort((left, right) => left.localeCompare(right));
}

async function buildBundle(rootPath: string, entryFile = "AGENTS.md") {
  const files = await listBundleFiles(rootPath);
  return {
    agentId: "11111111-1111-4111-8111-111111111111",
    companyId: "company-1",
    mode: "managed",
    rootPath,
    managedRootPath: rootPath,
    entryFile,
    resolvedEntryPath: path.join(rootPath, entryFile),
    editable: true,
    warnings: [],
    legacyPromptTemplateActive: false,
    legacyBootstrapPromptTemplateActive: false,
    files: await Promise.all(files.map(async (relativePath) => {
      const absolutePath = path.join(rootPath, relativePath);
      const stat = await fs.stat(absolutePath);
      return {
        path: relativePath,
        size: stat.size,
        language: "markdown",
        markdown: relativePath.endsWith(".md"),
        isEntryFile: relativePath === entryFile,
        editable: true,
        deprecated: false,
        virtual: false,
      };
    })),
  };
}

describe("agent skill routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testPaperclipHome = path.join(
      os.tmpdir(),
      `paperclip-agent-routes-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    process.env.PAPERCLIP_HOME = testPaperclipHome;
    process.env.PAPERCLIP_INSTANCE_ID = "test";
    mockAgentService.resolveByReference.mockResolvedValue({
      ambiguous: false,
      agent: makeAgent("claude_local"),
    });
    mockSecretService.resolveAdapterConfigForRuntime.mockResolvedValue({ config: { env: {} } });
    mockCompanySkillService.listRuntimeSkillEntries.mockResolvedValue([
      {
        key: "paperclipai/paperclip/paperclip",
        runtimeName: "paperclip",
        source: "/tmp/paperclip",
        required: true,
        requiredReason: "required",
      },
    ]);
    mockCompanySkillService.resolveRequestedSkillKeys.mockImplementation(
      async (_companyId: string, requested: string[]) =>
        requested.map((value) =>
          value === "paperclip"
            ? "paperclipai/paperclip/paperclip"
            : value,
        ),
    );
    mockAdapter.listSkills.mockResolvedValue({
      adapterType: "claude_local",
      supported: true,
      mode: "ephemeral",
      desiredSkills: ["paperclipai/paperclip/paperclip"],
      entries: [],
      warnings: [],
    });
    mockAdapter.syncSkills.mockResolvedValue({
      adapterType: "claude_local",
      supported: true,
      mode: "ephemeral",
      desiredSkills: ["paperclipai/paperclip/paperclip"],
      entries: [],
      warnings: [],
    });
    mockAdapter.testEnvironment.mockResolvedValue({
      adapterType: "claude_local",
      status: "pass",
      checks: [],
      testedAt: new Date().toISOString(),
    });
    mockAgentService.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
      ...makeAgent("claude_local"),
      adapterConfig: patch.adapterConfig ?? {},
    }));
    mockAgentService.create.mockImplementation(async (_companyId: string, input: Record<string, unknown>) => ({
      ...makeAgent(String(input.adapterType ?? "claude_local")),
      ...input,
      adapterConfig: input.adapterConfig ?? {},
      runtimeConfig: input.runtimeConfig ?? {},
      budgetMonthlyCents: Number(input.budgetMonthlyCents ?? 0),
      permissions: null,
    }));
    mockApprovalService.create.mockImplementation(async (_companyId: string, input: Record<string, unknown>) => ({
      id: "approval-1",
      companyId: "company-1",
      type: "hire_agent",
      status: "pending",
      payload: input.payload ?? {},
    }));
    mockAgentInstructionsService.getBundle.mockImplementation(async (agent: Record<string, unknown>) => {
      const adapterConfig = (agent.adapterConfig as Record<string, unknown> | undefined) ?? {};
      const rootPath = adapterConfig.instructionsRootPath;
      const entryFile = String(adapterConfig.instructionsEntryFile ?? "AGENTS.md");
      if (typeof rootPath !== "string") {
        return {
          agentId: String(agent.id),
          companyId: String(agent.companyId),
          mode: null,
          rootPath: null,
          managedRootPath: path.join(testPaperclipHome, "managed"),
          entryFile,
          resolvedEntryPath: null,
          editable: false,
          warnings: [],
          legacyPromptTemplateActive: false,
          legacyBootstrapPromptTemplateActive: false,
          files: [],
        };
      }
      return buildBundle(rootPath, entryFile);
    });
    mockAgentInstructionsService.materializeManagedBundle.mockImplementation(
      async (agent: Record<string, unknown>, files: Record<string, string>) => {
        const rootPath = path.join(testPaperclipHome, String(agent.id), "instructions");
        await fs.mkdir(rootPath, { recursive: true });
        for (const [relativePath, content] of Object.entries(files)) {
          const absolutePath = path.join(rootPath, relativePath);
          await fs.mkdir(path.dirname(absolutePath), { recursive: true });
          await fs.writeFile(absolutePath, content, "utf8");
        }
        const adapterConfig = {
          ...((agent.adapterConfig as Record<string, unknown> | undefined) ?? {}),
          instructionsBundleMode: "managed",
          instructionsRootPath: rootPath,
          instructionsEntryFile: "AGENTS.md",
          instructionsFilePath: path.join(rootPath, "AGENTS.md"),
          promptTemplate: files["AGENTS.md"] ?? "",
        };
        return {
          bundle: await buildBundle(rootPath),
          adapterConfig,
        };
      },
    );
    mockAgentInstructionsService.writeFile.mockImplementation(
      async (agent: Record<string, unknown>, relativePath: string, content: string) => {
        const adapterConfig = (agent.adapterConfig as Record<string, unknown> | undefined) ?? {};
        const rootPath = String(adapterConfig.instructionsRootPath);
        const absolutePath = path.join(rootPath, relativePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, content, "utf8");
        const nextAdapterConfig = {
          ...adapterConfig,
          instructionsBundleMode: "managed",
          instructionsRootPath: rootPath,
          instructionsEntryFile: String(adapterConfig.instructionsEntryFile ?? "AGENTS.md"),
          instructionsFilePath: path.join(rootPath, String(adapterConfig.instructionsEntryFile ?? "AGENTS.md")),
        };
        return {
          bundle: await buildBundle(rootPath, String(nextAdapterConfig.instructionsEntryFile)),
          file: {
            path: relativePath,
            size: Buffer.byteLength(content),
            language: "markdown",
            markdown: relativePath.endsWith(".md"),
            isEntryFile: relativePath === nextAdapterConfig.instructionsEntryFile,
            editable: true,
            deprecated: false,
            virtual: false,
            content,
          },
          adapterConfig: nextAdapterConfig,
        };
      },
    );
    mockLogActivity.mockResolvedValue(undefined);
    mockAccessService.canUser.mockResolvedValue(true);
    mockAccessService.hasPermission.mockResolvedValue(true);
    mockAccessService.getMembership.mockResolvedValue(null);
    mockAccessService.listPrincipalGrants.mockResolvedValue([]);
    mockAccessService.ensureMembership.mockResolvedValue(undefined);
    mockAccessService.setPrincipalPermission.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await fs.rm(testPaperclipHome, { recursive: true, force: true });
    delete process.env.PAPERCLIP_HOME;
    delete process.env.PAPERCLIP_INSTANCE_ID;
  });

  it("skips runtime materialization when listing Claude skills", async () => {
    mockAgentService.getById.mockResolvedValue(makeAgent("claude_local"));

    const res = await request(createApp())
      .get("/api/agents/11111111-1111-4111-8111-111111111111/skills?companyId=company-1");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockCompanySkillService.listRuntimeSkillEntries).toHaveBeenCalledWith("company-1", {
      materializeMissing: false,
    });
    expect(mockAdapter.listSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterType: "claude_local",
        config: expect.objectContaining({
          paperclipRuntimeSkills: expect.any(Array),
        }),
      }),
    );
  });

  it("keeps runtime materialization for persistent skill adapters", async () => {
    mockAgentService.getById.mockResolvedValue(makeAgent("codex_local"));
    mockAdapter.listSkills.mockResolvedValue({
      adapterType: "codex_local",
      supported: true,
      mode: "persistent",
      desiredSkills: ["paperclipai/paperclip/paperclip"],
      entries: [],
      warnings: [],
    });

    const res = await request(createApp())
      .get("/api/agents/11111111-1111-4111-8111-111111111111/skills?companyId=company-1");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockCompanySkillService.listRuntimeSkillEntries).toHaveBeenCalledWith("company-1", {
      materializeMissing: true,
    });
  });

  it("skips runtime materialization when syncing Claude skills", async () => {
    mockAgentService.getById.mockResolvedValue(makeAgent("claude_local"));

    const res = await request(createApp())
      .post("/api/agents/11111111-1111-4111-8111-111111111111/skills/sync?companyId=company-1")
      .send({ desiredSkills: ["paperclipai/paperclip/paperclip"] });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockCompanySkillService.listRuntimeSkillEntries).toHaveBeenCalledWith("company-1", {
      materializeMissing: false,
    });
    expect(mockAdapter.syncSkills).toHaveBeenCalled();
  });

  it("canonicalizes desired skill references before syncing", async () => {
    mockAgentService.getById.mockResolvedValue(makeAgent("claude_local"));

    const res = await request(createApp())
      .post("/api/agents/11111111-1111-4111-8111-111111111111/skills/sync?companyId=company-1")
      .send({ desiredSkills: ["paperclip"] });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockCompanySkillService.resolveRequestedSkillKeys).toHaveBeenCalledWith("company-1", ["paperclip"]);
    expect(mockAgentService.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        adapterConfig: expect.objectContaining({
          paperclipSkillSync: expect.objectContaining({
            desiredSkills: ["paperclipai/paperclip/paperclip"],
          }),
        }),
      }),
      expect.any(Object),
    );
  });

  it("persists canonical desired skills when creating an agent directly", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/agents")
      .send({
        name: "QA Agent",
        role: "engineer",
        adapterType: "claude_local",
        desiredSkills: ["paperclip"],
        adapterConfig: {},
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(mockCompanySkillService.resolveRequestedSkillKeys).toHaveBeenCalledWith("company-1", ["paperclip"]);
    expect(mockAgentService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        adapterConfig: expect.objectContaining({
          paperclipSkillSync: expect.objectContaining({
            desiredSkills: ["paperclipai/paperclip/paperclip"],
          }),
        }),
      }),
    );
  });

  it("materializes a managed AGENTS.md for directly created local agents", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/agents")
      .send({
        name: "QA Agent",
        role: "engineer",
        adapterType: "claude_local",
        adapterConfig: {
          promptTemplate: "You are QA.",
        },
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(mockAgentInstructionsService.materializeManagedBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        adapterType: "claude_local",
      }),
      expect.objectContaining({
        "AGENTS.md": "You are QA.",
        "HEARTBEAT.md": expect.stringContaining("Agent Heartbeat Checklist"),
        "SOUL.md": expect.stringContaining("Agent Persona"),
        "TOOLS.md": expect.stringContaining("# TOOLS.md"),
      }),
      { entryFile: "AGENTS.md", replaceExisting: false },
    );
    expect(mockAgentService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        id: expect.any(String),
        adapterConfig: expect.objectContaining({
          instructionsBundleMode: "managed",
          instructionsEntryFile: "AGENTS.md",
          instructionsFilePath: expect.stringMatching(/instructions\/AGENTS\.md$/),
        }),
      }),
    );
    expect(mockAgentService.create.mock.calls.at(-1)?.[1]).not.toMatchObject({
      adapterConfig: expect.objectContaining({
        promptTemplate: expect.anything(),
      }),
    });
  });

  it("materializes the bundled CEO instruction set for default CEO agents", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/agents")
      .send({
        name: "CEO",
        role: "ceo",
        adapterType: "claude_local",
        adapterConfig: {},
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(mockAgentInstructionsService.materializeManagedBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        role: "ceo",
        adapterType: "claude_local",
      }),
      expect.objectContaining({
        "AGENTS.md": expect.stringContaining("You are the CEO."),
        "HEARTBEAT.md": expect.stringContaining("CEO Heartbeat Checklist"),
        "SOUL.md": expect.stringContaining("CEO Persona"),
        "TOOLS.md": expect.stringContaining("# Tools"),
      }),
      { entryFile: "AGENTS.md", replaceExisting: false },
    );
  });

  it("materializes the bundled default instruction set for non-CEO agents with no prompt template", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/agents")
      .send({
        name: "Engineer",
        role: "engineer",
        adapterType: "claude_local",
        adapterConfig: {},
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(mockAgentInstructionsService.materializeManagedBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        role: "engineer",
        adapterType: "claude_local",
      }),
      expect.objectContaining({
        "AGENTS.md": expect.stringContaining("Keep the work moving until it's done."),
        "HEARTBEAT.md": expect.stringContaining("Agent Heartbeat Checklist"),
        "SOUL.md": expect.stringContaining("Agent Persona"),
        "TOOLS.md": expect.stringContaining("# TOOLS.md"),
      }),
      { entryFile: "AGENTS.md", replaceExisting: false },
    );
  });

  it("creates agent-home bootstrap links for validated local agents", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/agents")
      .send({
        name: "Engineer",
        role: "engineer",
        adapterType: "claude_local",
        adapterConfig: {},
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const agentId = String(res.body.id);
    const workspaceRoot = path.join(
      testPaperclipHome,
      "instances",
      "test",
      "workspaces",
      agentId,
    );
    for (const fileName of ["AGENTS.md", "HEARTBEAT.md", "SOUL.md", "TOOLS.md"]) {
      const targetPath = path.join(workspaceRoot, fileName);
      const stat = await fs.lstat(targetPath);
      expect(stat.isSymbolicLink()).toBe(true);
    }
  });

  it("fails direct agent creation when bootstrap environment checks block execution", async () => {
    mockAdapter.testEnvironment.mockResolvedValueOnce({
      adapterType: "claude_local",
      status: "warn",
      testedAt: new Date().toISOString(),
      checks: [
        {
          code: "claude_hello_probe_failed",
          level: "warn",
          message: "Claude probe failed.",
        },
      ],
    });

    const res = await request(createApp())
      .post("/api/companies/company-1/agents")
      .send({
        name: "Blocked Agent",
        role: "engineer",
        adapterType: "claude_local",
        adapterConfig: {},
      });

    expect(res.status, JSON.stringify(res.body)).toBe(422);
    expect(String(res.body.error ?? "")).toContain("claude_hello_probe_failed");
    expect(mockAgentService.create).not.toHaveBeenCalled();
  });

  it("includes canonical desired skills in hire approvals", async () => {
    const db = createDb(true);

    const res = await request(createApp(db))
      .post("/api/companies/company-1/agent-hires")
      .send({
        name: "QA Agent",
        role: "engineer",
        adapterType: "claude_local",
        desiredSkills: ["paperclip"],
        adapterConfig: {},
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(mockCompanySkillService.resolveRequestedSkillKeys).toHaveBeenCalledWith("company-1", ["paperclip"]);
    expect(mockApprovalService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        payload: expect.objectContaining({
          desiredSkills: ["paperclipai/paperclip/paperclip"],
          requestedConfigurationSnapshot: expect.objectContaining({
            desiredSkills: ["paperclipai/paperclip/paperclip"],
          }),
        }),
      }),
    );
  });

  it("uses managed AGENTS config in hire approval payloads", async () => {
    const res = await request(createApp(createDb(true)))
      .post("/api/companies/company-1/agent-hires")
      .send({
        name: "QA Agent",
        role: "engineer",
        adapterType: "claude_local",
        adapterConfig: {
          promptTemplate: "You are QA.",
        },
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(mockApprovalService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        payload: expect.objectContaining({
          adapterConfig: expect.objectContaining({
            instructionsBundleMode: "managed",
            instructionsEntryFile: "AGENTS.md",
            instructionsFilePath: expect.stringMatching(/instructions\/AGENTS\.md$/),
          }),
        }),
      }),
    );
    const approvalInput = mockApprovalService.create.mock.calls.at(-1)?.[1] as
      | { payload?: { adapterConfig?: Record<string, unknown> } }
      | undefined;
    expect(approvalInput?.payload?.adapterConfig?.promptTemplate).toBeUndefined();
  });
});
