import type { HeartbeatRun, HeartbeatRunOperationalEffect } from "@paperclipai/shared";

type RunEffectLike = Pick<HeartbeatRun, "status" | "error" | "resultJson" | "operationalEffect">;

export type RunOperationalEffectBadge = {
  label: string;
  tone: "positive" | "warning";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getRunOperationalEffect(run: RunEffectLike): HeartbeatRunOperationalEffect | null {
  return run.operationalEffect ?? null;
}

export function getRunOperationalEffectBadge(run: RunEffectLike): RunOperationalEffectBadge | null {
  if (run.status === "running" || run.status === "queued") return null;
  const effect = getRunOperationalEffect(run);
  if (!effect) return null;
  return effect.producedEffect
    ? { label: "Effect", tone: "positive" }
    : { label: "No effect", tone: "warning" };
}

export function runTextSummary(run: RunEffectLike): string | null {
  const result = asRecord(run.resultJson);
  return (
    asNonEmptyString(result?.summary) ??
    asNonEmptyString(result?.result) ??
    asNonEmptyString(result?.message) ??
    asNonEmptyString(getRunOperationalEffect(run)?.summary) ??
    asNonEmptyString(run.error)
  );
}
