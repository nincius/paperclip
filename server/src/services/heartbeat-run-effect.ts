import { asc, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog } from "@paperclipai/db";
import type { HeartbeatRunOperationalEffect } from "@paperclipai/shared";

type RunActivityRow = {
  runId: string | null;
  action: string;
  details: Record<string, unknown> | null;
};

const NOISE_ACTIONS = new Set([
  "heartbeat.invoked",
  "heartbeat.cancelled",
  "issue.read_marked",
]);

const HANDOFF_STATUSES = new Set([
  "handoff_ready",
  "technical_review",
  "changes_requested",
  "human_review",
]);

const EFFECT_SIGNAL_ORDER: Array<keyof HeartbeatRunOperationalEffect["counts"]> = [
  "handoffs",
  "comments",
  "statusChanges",
  "assignmentChanges",
  "checkouts",
  "documents",
  "workProducts",
  "approvals",
  "attachments",
  "issueCreations",
  "releases",
  "otherMutations",
];

const EFFECT_SIGNAL_LABELS: Record<keyof HeartbeatRunOperationalEffect["counts"], string> = {
  comments: "comment",
  statusChanges: "status change",
  handoffs: "handoff",
  assignmentChanges: "assignment change",
  checkouts: "checkout",
  documents: "document update",
  workProducts: "work product update",
  approvals: "approval action",
  attachments: "attachment change",
  issueCreations: "issue creation",
  releases: "release",
  otherMutations: "other mutation",
};

function createEmptyEffect(): HeartbeatRunOperationalEffect {
  return {
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
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasOwn(details: Record<string, unknown> | null, key: string) {
  return Boolean(details) && Object.prototype.hasOwnProperty.call(details, key);
}

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function buildSummary(effect: HeartbeatRunOperationalEffect): string | null {
  const parts: string[] = [];
  for (const key of EFFECT_SIGNAL_ORDER) {
    const count = effect.counts[key];
    if (!count) continue;
    parts.push(pluralize(count, EFFECT_SIGNAL_LABELS[key]));
  }
  if (parts.length === 0) return null;
  if (parts.length <= 3) return parts.join(", ");
  return `${parts.slice(0, 3).join(", ")} +${parts.length - 3} more`;
}

function markSignal(
  effect: HeartbeatRunOperationalEffect,
  signal: keyof HeartbeatRunOperationalEffect["counts"],
) {
  effect.counts[signal] += 1;
}

function markAction(effect: HeartbeatRunOperationalEffect, action: string) {
  effect.activityCount += 1;
  if (!effect.actions.includes(action)) effect.actions.push(action);
}

export function summarizeHeartbeatRunOperationalEffect(rows: RunActivityRow[]): HeartbeatRunOperationalEffect {
  const effect = createEmptyEffect();

  for (const row of rows) {
    if (NOISE_ACTIONS.has(row.action)) continue;

    let impactful = false;
    const details = asRecord(row.details);

    switch (row.action) {
      case "issue.comment_added":
      case "approval.comment_added":
        markSignal(effect, "comments");
        impactful = true;
        break;

      case "issue.checked_out":
      case "issue.checkout_lock_adopted":
        markSignal(effect, "checkouts");
        impactful = true;
        break;

      case "issue.created":
        markSignal(effect, "issueCreations");
        impactful = true;
        break;

      case "issue.released":
        markSignal(effect, "releases");
        impactful = true;
        break;

      case "issue.document_created":
      case "issue.document_updated":
      case "issue.document_deleted":
        markSignal(effect, "documents");
        impactful = true;
        break;

      case "issue.work_product_created":
      case "issue.work_product_updated":
      case "issue.work_product_deleted":
        markSignal(effect, "workProducts");
        impactful = true;
        break;

      case "issue.approval_linked":
      case "issue.approval_unlinked":
      case "approval.created":
      case "approval.approved":
      case "approval.rejected":
      case "approval.revision_requested":
      case "approval.resubmitted":
        markSignal(effect, "approvals");
        impactful = true;
        break;

      case "issue.attachment_added":
      case "issue.attachment_removed":
        markSignal(effect, "attachments");
        impactful = true;
        break;

      case "issue.updated": {
        const previous = asRecord(details?._previous);
        const nextStatus = asNonEmptyString(details?.status);
        const previousStatus = asNonEmptyString(previous?.status);
        if (nextStatus && nextStatus !== previousStatus) {
          markSignal(effect, "statusChanges");
          impactful = true;
          if (HANDOFF_STATUSES.has(nextStatus)) {
            markSignal(effect, "handoffs");
          }
        }

        const assigneeTouched =
          hasOwn(details, "assigneeAgentId") ||
          hasOwn(details, "assigneeUserId");
        const previousAgent = previous?.assigneeAgentId ?? null;
        const nextAgent = details?.assigneeAgentId ?? null;
        const previousUser = previous?.assigneeUserId ?? null;
        const nextUser = details?.assigneeUserId ?? null;
        if (assigneeTouched && (previousAgent !== nextAgent || previousUser !== nextUser)) {
          markSignal(effect, "assignmentChanges");
          impactful = true;
        }

        const genericKeys = [
          "priority",
          "title",
          "description",
          "projectId",
          "goalId",
          "parentId",
          "billingCode",
        ];
        if (!impactful && genericKeys.some((key) => hasOwn(details, key))) {
          markSignal(effect, "otherMutations");
          impactful = true;
        }
        break;
      }

      default:
        markSignal(effect, "otherMutations");
        impactful = true;
        break;
    }

    if (impactful) {
      markAction(effect, row.action);
    }
  }

  effect.producedEffect = effect.activityCount > 0;
  effect.signals = EFFECT_SIGNAL_ORDER.filter((key) => effect.counts[key] > 0).map((key) => key);
  effect.summary = buildSummary(effect);
  return effect;
}

export async function loadHeartbeatRunOperationalEffects(
  db: Db,
  runIds: string[],
): Promise<Map<string, HeartbeatRunOperationalEffect>> {
  const uniqueRunIds = Array.from(new Set(runIds.filter((runId) => runId.trim().length > 0)));
  const effects = new Map<string, HeartbeatRunOperationalEffect>();
  for (const runId of uniqueRunIds) {
    effects.set(runId, createEmptyEffect());
  }
  if (uniqueRunIds.length === 0) return effects;

  const rows = await db
    .select({
      runId: activityLog.runId,
      action: activityLog.action,
      details: activityLog.details,
    })
    .from(activityLog)
    .where(inArray(activityLog.runId, uniqueRunIds))
    .orderBy(asc(activityLog.createdAt), asc(activityLog.id));

  const grouped = new Map<string, RunActivityRow[]>();
  for (const row of rows) {
    if (!row.runId) continue;
    const bucket = grouped.get(row.runId) ?? [];
    bucket.push(row);
    grouped.set(row.runId, bucket);
  }

  for (const runId of uniqueRunIds) {
    effects.set(runId, summarizeHeartbeatRunOperationalEffect(grouped.get(runId) ?? []));
  }

  return effects;
}
