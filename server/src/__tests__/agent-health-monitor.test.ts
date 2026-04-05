import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agents,
  applyPendingMigrations,
  companies,
  companyMemberships,
  createDb,
  ensurePostgresDatabase,
  heartbeatRuns,
  issueComments,
  issues,
} from "@paperclipai/db";
import { agentHealthMonitorService } from "../services/agent-health-monitor.ts";

type EmbeddedPostgresInstance = {
  initialise(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
};

type EmbeddedPostgresCtor = new (opts: {
  databaseDir: string;
  user: string;
  password: string;
  port: number;
  persistent: boolean;
  initdbFlags?: string[];
  onLog?: (message: unknown) => void;
  onError?: (message: unknown) => void;
}) => EmbeddedPostgresInstance;

async function getEmbeddedPostgresCtor(): Promise<EmbeddedPostgresCtor> {
  const mod = await import("embedded-postgres");
  return mod.default as EmbeddedPostgresCtor;
}

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate test port")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function startTempDatabase() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-agent-health-monitor-"));
  const port = await getAvailablePort();
  const EmbeddedPostgres = await getEmbeddedPostgresCtor();
  const instance = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "paperclip",
    password: "paperclip",
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C", "--lc-messages=C"],
    onLog: () => {},
    onError: () => {},
  });
  await instance.initialise();
  await instance.start();

  const adminConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/postgres`;
  await ensurePostgresDatabase(adminConnectionString, "paperclip");
  const connectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
  await applyPendingMigrations(connectionString);
  return { connectionString, dataDir, instance };
}

describe("agent health monitor", () => {
  let db!: ReturnType<typeof createDb>;
  let instance: EmbeddedPostgresInstance | null = null;
  let dataDir = "";

  beforeAll(async () => {
    const started = await startTempDatabase();
    db = createDb(started.connectionString);
    instance = started.instance;
    dataDir = started.dataDir;
  }, 20_000);

  afterEach(async () => {
    await db.delete(issueComments);
    await db.delete(activityLog);
    await db.delete(heartbeatRuns);
    await db.delete(issues);
    await db.delete(companyMemberships);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    try {
      await instance?.stop();
    } finally {
      if (dataDir) {
        await fs.promises.rm(dataDir, { recursive: true, force: true });
      }
    }
  });

  async function seedCompany() {
    const companyId = randomUUID();
    const ceoId = randomUUID();
    const workerId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: "TCN",
      requireBoardApprovalForNewAgents: false,
    });

    await db.insert(agents).values([
      {
        id: ceoId,
        companyId,
        name: "CEO",
        role: "ceo",
        status: "active",
        adapterType: "process",
        adapterConfig: { command: process.execPath },
        runtimeConfig: {},
        permissions: {},
      },
      {
        id: workerId,
        companyId,
        name: "Worker",
        role: "engineer",
        reportsTo: ceoId,
        status: "active",
        adapterType: "process",
        adapterConfig: { command: process.execPath },
        runtimeConfig: {
          heartbeat: {
            enabled: true,
            intervalSec: 900,
          },
        },
        permissions: {},
      },
    ]);

    await db.insert(companyMemberships).values([
      {
        companyId,
        principalType: "agent",
        principalId: ceoId,
        status: "active",
      },
      {
        companyId,
        principalType: "agent",
        principalId: workerId,
        status: "active",
      },
    ]);

    return { companyId, ceoId, workerId };
  }

  it("creates and resolves a queued-work health alert", async () => {
    const { companyId, workerId, ceoId } = await seedCompany();
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      queueStarvationMs: 60_000,
    });

    await db.insert(heartbeatRuns).values({
      id: randomUUID(),
      companyId,
      agentId: workerId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "queued",
      createdAt: new Date("2026-03-29T20:00:00.000Z"),
      updatedAt: new Date("2026-03-29T20:00:00.000Z"),
      contextSnapshot: {},
    });

    const firstTick = await monitor.tick(new Date("2026-03-29T20:05:00.000Z"));
    expect(firstTick.created).toBe(1);
    expect(firstTick.findings).toBe(1);

    const openAlerts = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(openAlerts).toHaveLength(1);
    expect(openAlerts[0]?.assigneeAgentId).toBe(ceoId);
    expect(openAlerts[0]?.title).toContain("queued work without a consumer");

    const secondTick = await monitor.tick(new Date("2026-03-29T20:06:00.000Z"));
    expect(secondTick.created).toBe(0);
    expect(secondTick.updated).toBe(0);

    await db.delete(heartbeatRuns).where(eq(heartbeatRuns.agentId, workerId));

    const resolvedTick = await monitor.tick(new Date("2026-03-29T20:07:00.000Z"));
    expect(resolvedTick.resolved).toBe(1);

    const [resolvedIssue] = await db.select().from(issues).where(eq(issues.originKind, "agent_health_alert"));
    expect(resolvedIssue?.status).toBe("cancelled");

    const comments = await db.select().from(issueComments).where(eq(issueComments.issueId, resolvedIssue!.id));
    expect(comments).toHaveLength(1);
    expect(comments[0]?.body).toContain("Closing the alert automatically.");
  });

  it("does not flag heartbeat_stalled while a heartbeat run is still running", async () => {
    const { companyId, workerId } = await seedCompany();
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      heartbeatStaleMinMs: 30_000,
      heartbeatStaleMultiplier: 1,
      queueStarvationMs: 24 * 60 * 60 * 1000,
    });

    await db
      .update(agents)
      .set({
        lastHeartbeatAt: new Date("2026-03-29T18:00:00.000Z"),
        runtimeConfig: { heartbeat: { enabled: true, intervalSec: 60 } },
      })
      .where(eq(agents.id, workerId));

    await db.insert(heartbeatRuns).values({
      id: randomUUID(),
      companyId,
      agentId: workerId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "running",
      startedAt: new Date("2026-03-29T18:02:00.000Z"),
      createdAt: new Date("2026-03-29T18:01:00.000Z"),
      updatedAt: new Date("2026-03-29T18:02:00.000Z"),
      contextSnapshot: {},
    });

    await monitor.tick(new Date("2026-03-29T18:05:00.000Z"));

    const alerts = await db.select().from(issues).where(eq(issues.originKind, "agent_health_alert"));
    const stalled = alerts.filter((a) => a.title.includes("missed expected heartbeats"));
    expect(stalled).toHaveLength(0);
  });

  it("flags heartbeat_stalled when idle beyond threshold with no running run", async () => {
    const { companyId, workerId, ceoId } = await seedCompany();
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      heartbeatStaleMinMs: 30_000,
      heartbeatStaleMultiplier: 1,
      queueStarvationMs: 24 * 60 * 60 * 1000,
    });

    await db
      .update(agents)
      .set({
        lastHeartbeatAt: new Date("2026-03-29T18:00:00.000Z"),
        runtimeConfig: { heartbeat: { enabled: true, intervalSec: 60 } },
      })
      .where(eq(agents.id, workerId));

    await monitor.tick(new Date("2026-03-29T18:05:00.000Z"));

    const alerts = await db.select().from(issues).where(eq(issues.originKind, "agent_health_alert"));
    const stalled = alerts.filter((a) => a.title.includes("missed expected heartbeats"));
    expect(stalled).toHaveLength(1);
    expect(stalled[0]?.assigneeAgentId).toBe(ceoId);
  });

  it("suppresses rapid reopen of the same agent health alert after transient recovery", async () => {
    const { companyId, workerId } = await seedCompany();
    const base = new Date();
    const firstQueuedAt = new Date(base.getTime() - 10 * 60 * 1000);
    const firstTickAt = new Date(base.getTime() - 5 * 60 * 1000);
    const resolvedAt = new Date(base.getTime() - 4 * 60 * 1000);
    const secondQueuedAt = new Date(base.getTime() - 3 * 60 * 1000);
    const suppressedAt = new Date(base.getTime() - 2 * 60 * 1000);
    const reopenedAt = new Date(base.getTime() + 31 * 60 * 1000);
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      queueStarvationMs: 60_000,
      alertReopenCooldownMs: 30 * 60 * 1000,
    });

    await db.insert(heartbeatRuns).values({
      id: randomUUID(),
      companyId,
      agentId: workerId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "queued",
      createdAt: firstQueuedAt,
      updatedAt: firstQueuedAt,
      contextSnapshot: {},
    });

    const firstTick = await monitor.tick(firstTickAt);
    expect(firstTick.created).toBe(1);

    await db.delete(heartbeatRuns).where(eq(heartbeatRuns.agentId, workerId));
    const resolvedTick = await monitor.tick(resolvedAt);
    expect(resolvedTick.resolved).toBe(1);

    await db.insert(heartbeatRuns).values({
      id: randomUUID(),
      companyId,
      agentId: workerId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "queued",
      createdAt: secondQueuedAt,
      updatedAt: secondQueuedAt,
      contextSnapshot: {},
    });

    const suppressedTick = await monitor.tick(suppressedAt);
    expect(suppressedTick.created).toBe(0);
    expect(suppressedTick.updated).toBe(0);

    const [stillCancelled] = await db.select().from(issues).where(eq(issues.originKind, "agent_health_alert"));
    expect(stillCancelled?.status).toBe("cancelled");

    const suppressionEvents = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "issue.health_alert_reopen_suppressed"));
    expect(suppressionEvents).toHaveLength(1);
    expect(suppressionEvents[0]?.entityId).toBe(stillCancelled?.id);
    expect(suppressionEvents[0]?.details).toMatchObject({
      originId: `agent:${workerId}:health:queued_without_consumer`,
      reason: "recent_auto_resolve_cooldown",
    });

    const reopenedTick = await monitor.tick(reopenedAt);
    expect(reopenedTick.created).toBe(0);
    expect(reopenedTick.updated).toBe(1);

    const [reopenedIssue] = await db.select().from(issues).where(eq(issues.originKind, "agent_health_alert"));
    expect(reopenedIssue?.status).toBe("todo");
  });

  it("creates and resolves a technical-review WIP alert", async () => {
    const { companyId, workerId, ceoId } = await seedCompany();
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      reviewQueuePolicies: {
        technical_review: {
          wipLimit: 2,
          slaMs: Number.MAX_SAFE_INTEGER,
        },
      },
    });

    await db.insert(issues).values([
      {
        id: randomUUID(),
        companyId,
        title: "Review A",
        identifier: "TCN-101",
        status: "technical_review",
        priority: "medium",
        assigneeAgentId: workerId,
      },
      {
        id: randomUUID(),
        companyId,
        title: "Review B",
        identifier: "TCN-102",
        status: "technical_review",
        priority: "medium",
        assigneeAgentId: workerId,
      },
      {
        id: randomUUID(),
        companyId,
        title: "Review C",
        identifier: "TCN-103",
        status: "technical_review",
        priority: "medium",
        assigneeAgentId: workerId,
      },
    ]);

    const firstTick = await monitor.tick(new Date("2026-03-29T22:00:00.000Z"));
    expect(firstTick.created).toBe(1);

    const alerts = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.assigneeAgentId).toBe(ceoId);
    expect(alerts[0]?.title).toContain("Technical review WIP limit exceeded");
    expect(alerts[0]?.description ?? "").toContain("above the limit of 2");

    await db
      .update(issues)
      .set({ status: "done" })
      .where(eq(issues.identifier, "TCN-103"));

    const resolvedTick = await monitor.tick(new Date("2026-03-29T22:05:00.000Z"));
    expect(resolvedTick.resolved).toBe(1);

    const [resolvedIssue] = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(resolvedIssue?.status).toBe("cancelled");
  });

  it("uses status-transition time for changes-requested SLA alerts", async () => {
    const { companyId, workerId, ceoId } = await seedCompany();
    const issueId = randomUUID();
    const enteredAt = new Date("2026-03-29T18:00:00.000Z");
    const touchedAt = new Date("2026-03-29T21:45:00.000Z");
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      reviewQueuePolicies: {
        changes_requested: {
          wipLimit: 99,
          slaMs: 2 * 60 * 60 * 1000,
        },
      },
    });

    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Apply reviewer fixes",
      identifier: "TCN-201",
      status: "changes_requested",
      priority: "medium",
      assigneeAgentId: workerId,
      createdAt: new Date("2026-03-29T17:00:00.000Z"),
      updatedAt: touchedAt,
    });

    await db.insert(activityLog).values([
      {
        companyId,
        actorType: "agent",
        actorId: workerId,
        agentId: workerId,
        action: "issue.updated",
        entityType: "issue",
        entityId: issueId,
        details: {
          status: "changes_requested",
          _previous: { status: "technical_review" },
        },
        createdAt: enteredAt,
      },
      {
        companyId,
        actorType: "agent",
        actorId: workerId,
        agentId: workerId,
        action: "issue.updated",
        entityType: "issue",
        entityId: issueId,
        details: {
          priority: "high",
          _previous: { priority: "medium" },
        },
        createdAt: touchedAt,
      },
    ]);

    const result = await monitor.tick(new Date("2026-03-29T22:30:00.000Z"));
    expect(result.created).toBe(1);

    const alerts = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.assigneeAgentId).toBe(ceoId);
    expect(alerts[0]?.title).toContain("Changes requested exceeded SLA");
    expect(alerts[0]?.description ?? "").toContain(enteredAt.toISOString());
    expect(alerts[0]?.description ?? "").not.toContain(touchedAt.toISOString());
  });

  it("creates board-owned human-review SLA alerts", async () => {
    const { companyId, ceoId } = await seedCompany();
    const issueId = randomUUID();
    const enteredAt = new Date("2026-03-29T10:00:00.000Z");
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      reviewQueuePolicies: {
        human_review: {
          wipLimit: 99,
          slaMs: 4 * 60 * 60 * 1000,
        },
      },
    });

    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Board final approval",
      identifier: "TCN-301",
      status: "human_review",
      priority: "medium",
      createdAt: enteredAt,
      updatedAt: new Date("2026-03-29T10:00:00.000Z"),
    });

    await db.insert(activityLog).values({
      companyId,
      actorType: "agent",
      actorId: ceoId,
      agentId: ceoId,
      action: "issue.updated",
      entityType: "issue",
      entityId: issueId,
      details: {
        status: "human_review",
        _previous: { status: "technical_review" },
      },
      createdAt: enteredAt,
    });

    const result = await monitor.tick(new Date("2026-03-29T16:30:00.000Z"));
    expect(result.created).toBe(1);

    const alerts = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.assigneeAgentId).toBe(ceoId);
    expect(alerts[0]?.title).toContain("Human review exceeded SLA");
    expect(alerts[0]?.description ?? "").toContain("Scope: Board");
  });

  it("reopens the same review-queue alert when the condition returns", async () => {
    const { companyId, workerId, ceoId } = await seedCompany();
    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: Number.MAX_SAFE_INTEGER,
      reviewQueuePolicies: {
        human_review: {
          wipLimit: 3,
          slaMs: Number.MAX_SAFE_INTEGER,
        },
      },
    });

    const humanReviewIssueIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await db.insert(issues).values(
      humanReviewIssueIds.map((id, index) => ({
        id,
        companyId,
        title: `Human review ${index + 1}`,
        identifier: `TCN-4${index + 1}`,
        status: "human_review" as const,
        priority: "medium" as const,
        assigneeAgentId: workerId,
      })),
    );

    const firstTick = await monitor.tick(new Date("2026-03-29T22:00:00.000Z"));
    expect(firstTick.created).toBe(1);

    const [initialAlert] = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(initialAlert).toBeTruthy();
    expect(initialAlert?.assigneeAgentId).toBe(ceoId);

    await db
      .update(issues)
      .set({ status: "done" })
      .where(eq(issues.id, humanReviewIssueIds[3]!));

    const resolvedTick = await monitor.tick(new Date("2026-03-29T22:05:00.000Z"));
    expect(resolvedTick.resolved).toBe(1);

    await db.insert(issues).values({
      id: randomUUID(),
      companyId,
      title: "Human review 5",
      identifier: "TCN-45",
      status: "human_review",
      priority: "medium",
      assigneeAgentId: workerId,
    });

    const reopenedTick = await monitor.tick(new Date("2026-03-29T22:10:00.000Z"));
    expect(reopenedTick.created).toBe(0);
    expect(reopenedTick.updated).toBe(1);

    const alerts = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.id).toBe(initialAlert?.id);
    expect(alerts[0]?.status).toBe("todo");

    const comments = await db
      .select()
      .from(issueComments)
      .where(eq(issueComments.issueId, initialAlert!.id));
    expect(comments).toHaveLength(2);
    expect(comments[1]?.body).toContain("Reopening the existing alert instead of creating a new issue.");
  });

  it("creates an adapter-regression alert on the slow path", async () => {
    const { companyId, workerId } = await seedCompany();
    await db
      .update(agents)
      .set({ adapterType: "missing_adapter" })
      .where(eq(agents.id, workerId));

    const monitor = agentHealthMonitorService(db, {
      adapterEnvironmentIntervalMs: 0,
    });

    const result = await monitor.tick(new Date("2026-03-29T21:00:00.000Z"));
    expect(result.created).toBe(1);

    const alerts = await db
      .select()
      .from(issues)
      .where(eq(issues.originKind, "agent_health_alert"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.title).toContain("unknown adapter");
    expect(alerts[0]?.description ?? "").toContain("missing_adapter");
    expect(alerts[0]?.companyId).toBe(companyId);
  });
});
