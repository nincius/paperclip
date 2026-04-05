/**
 * Single source of truth for the OpenCode free-tier / quota-fallback model id used by rollout scripts
 * (`scripts/lib/agent-rollout-presets.mjs`) and re-exported from `constants.ts` for `@paperclipai/shared` consumers.
 * Override at runtime via `PAPERCLIP_OPENCODE_QUOTA_FALLBACK_MODEL` (see `resolveOpencodeQuotaFallbackModel` in scripts).
 */
export const DEFAULT_OPENCODE_QUOTA_FALLBACK_MODEL = "opencode/minimax-m2.5-free";
