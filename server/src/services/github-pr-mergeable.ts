import { ghFetch, gitHubApiBase } from "./github-fetch.js";
import { conflict, unprocessable } from "../errors.js";

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/i;

export type GithubPrCoordinates = {
  hostname: string;
  owner: string;
  repo: string;
  number: number;
};

/** Parse https://host/owner/repo/pull/123 from a PR URL. */
export function parseGitHubPullRequestUrl(rawUrl: string | null | undefined): GithubPrCoordinates | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const m = u.pathname.match(PR_PATH);
    if (!m) return null;
    const num = Number.parseInt(m[3]!, 10);
    if (!Number.isFinite(num) || num < 1) return null;
    return { hostname: u.hostname, owner: m[1]!, repo: m[2]!.replace(/\.git$/i, ""), number: num };
  } catch {
    return null;
  }
}

/** Parse https://host/owner/repo or https://host/owner/repo.git */
export function parseGitHubRepoUrl(rawUrl: string | null | undefined): Omit<GithubPrCoordinates, "number"> | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/i, "");
    return { hostname: u.hostname, owner, repo };
  } catch {
    return null;
  }
}

function githubToken(): string | null {
  const t = process.env.PAPERCLIP_GITHUB_PR_LOOKUP_TOKEN ?? process.env.GITHUB_TOKEN;
  if (t && t.trim().length > 0) return t.trim();
  return null;
}

export type PullMergeSnapshot = {
  mergeable: boolean | null;
  mergeableState: string | null;
};

export async function fetchPullRequestMergeSnapshot(coords: GithubPrCoordinates): Promise<PullMergeSnapshot> {
  const apiBase = gitHubApiBase(coords.hostname);
  const url = `${apiBase}/repos/${encodeURIComponent(coords.owner)}/${encodeURIComponent(coords.repo)}/pulls/${coords.number}`;
  const token = githubToken();
  const res = await ghFetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw unprocessable(
      `GitHub não retornou a PR #${coords.number} em ${coords.owner}/${coords.repo} (${res.status}). ${body.slice(0, 200)}`.trim(),
    );
  }
  const json = (await res.json()) as { mergeable?: boolean | null; mergeable_state?: string | null };
  return {
    mergeable: json.mergeable ?? null,
    mergeableState: typeof json.mergeable_state === "string" ? json.mergeable_state : null,
  };
}

function hasMergeConflict(snapshot: PullMergeSnapshot): boolean {
  if (snapshot.mergeable === false) return true;
  const st = (snapshot.mergeableState ?? "").toLowerCase();
  return st === "dirty";
}

/**
 * Garante que a PR GitHub primária da issue está mergeável antes de avançar o status.
 * Retorna dados para sincronizar health/metadata do work product, ou null se não houver PR GitHub.
 */
export async function assertPrimaryGithubPrMergeableForIssue(input: {
  issueId: string;
  projectId: string | null;
  projectWorkspaceId: string | null;
  pullUrl: string | null;
  externalId: string | null;
  fetchRepoUrl: () => Promise<string | null>;
}): Promise<{ healthStatus: "healthy" | "unhealthy" | "unknown"; github: Record<string, unknown> }> {
  let coords = parseGitHubPullRequestUrl(input.pullUrl);
  if (!coords && input.externalId && /^\d+$/.test(input.externalId.trim())) {
    const repoUrl = await input.fetchRepoUrl();
    const repo = parseGitHubRepoUrl(repoUrl);
    if (repo) {
      coords = { ...repo, number: Number.parseInt(input.externalId.trim(), 10) };
    }
  }
  if (!coords) {
    throw unprocessable(
      "O work product de pull request (GitHub) precisa de uma URL de PR no formato https://github.com/org/repo/pull/N ou de externalId numérico junto com repo_url no workspace do projeto.",
    );
  }

  const snapshot = await fetchPullRequestMergeSnapshot(coords);
  if (snapshot.mergeable === null) {
    throw conflict(
      "GitHub ainda está calculando se a PR é mergeável; aguarde alguns segundos e tente novamente.",
    );
  }
  if (hasMergeConflict(snapshot)) {
    throw conflict(
      "A pull request tem conflitos com a branch base (não está mergeável). Resolva os conflitos antes de avançar para revisão humana.",
    );
  }

  return {
    healthStatus: "healthy",
    github: {
      mergeable: snapshot.mergeable,
      mergeableState: snapshot.mergeableState,
      checkedAt: new Date().toISOString(),
    },
  };
}
