import type { Db } from "@paperclipai/db";
import type { IssueWorkProduct } from "@paperclipai/shared";
import { agentService } from "./agents.js";
import { issueService } from "./issues.js";
import { workProductService } from "./work-products.js";

const REVIEW_DISPATCH_ORIGIN_KIND = "technical_review_dispatch";
const REVIEWER_REFERENCE = "revisor-pr";
const TERMINAL_ISSUE_STATUSES = new Set(["done", "cancelled"]);

type IssueSummary = Awaited<ReturnType<ReturnType<typeof issueService>["getById"]>>;
type IssueListItem = Awaited<ReturnType<ReturnType<typeof issueService>["list"]>>[number];
type IssueCreateResult = Awaited<ReturnType<ReturnType<typeof issueService>["create"]>>;
type IssueComment = Awaited<ReturnType<ReturnType<typeof issueService>["getComment"]>>;
type AgentSummary = Awaited<ReturnType<ReturnType<typeof agentService>["resolveByReference"]>>["agent"];
type ReviewIssueRecord = NonNullable<IssueCreateResult> | IssueListItem;

type ResolvedPullRequestRef = {
  owner: string;
  repo: string;
  repoFullName: string;
  prNumber: number;
  url: string;
};

type ResolvedReviewArtifact = {
  source: "work_product" | "comment" | "description";
  sourceId: string;
  sourceCreatedAt: Date | null;
  sourceLink: string | null;
  title: string;
  bodyContext: string;
  pullRequest: ResolvedPullRequestRef;
  diffIdentity: string;
};

type PreviousReviewReference = {
  issue: ReviewIssueRecord;
  pullRequest: ResolvedPullRequestRef | null;
};

export type ReviewDispatchResult =
  | { kind: "noop"; reason: string }
  | {
    kind: "created" | "reused" | "already_reviewed";
    artifact: ResolvedReviewArtifact;
    reviewIssue: ReviewIssueRecord;
    reviewer: AgentSummary;
  };

type ReviewDispatchDeps = {
  agents?: ReturnType<typeof agentService>;
  issues?: ReturnType<typeof issueService>;
  workProducts?: ReturnType<typeof workProductService>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asPositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return null;
}

function pullRequestRefFromUrl(rawUrl: string | null | undefined): ResolvedPullRequestRef | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname !== "github.com") return null;
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/.*)?$/);
    if (!match) return null;
    const owner = match[1] ?? "";
    const repo = match[2] ?? "";
    const prNumber = Number.parseInt(match[3] ?? "", 10);
    if (!owner || !repo || !Number.isFinite(prNumber)) return null;
    return {
      owner,
      repo,
      repoFullName: `${owner}/${repo}`,
      prNumber,
      url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
    };
  } catch {
    return null;
  }
}

function extractPullRequestRefFromText(text: string | null | undefined) {
  if (!text) return null;
  const match = text.match(/https?:\/\/github\.com\/[^/\s)]+\/[^/\s)]+\/pull\/\d+(?:[^\s)]*)?/i);
  return match ? pullRequestRefFromUrl(match[0]) : null;
}

function requireIssueIdentifier(issue: { id: string; identifier: string | null }) {
  if (!issue.identifier) {
    throw new Error(`Issue ${issue.id} is missing identifier`);
  }
  return issue.identifier;
}

function buildIssueLink(issue: { id: string; identifier: string | null }) {
  const identifier = requireIssueIdentifier(issue);
  const prefix = identifier.split("-")[0] ?? identifier;
  return `/${prefix}/issues/${identifier}`;
}

function buildIssueCommentLink(issue: { id: string; identifier: string | null }, commentId: string) {
  return `${buildIssueLink(issue)}#comment-${commentId}`;
}

function extractHeadSha(metadata: Record<string, unknown> | null) {
  if (!metadata) return null;
  return (
    asNonEmptyString(metadata.headSha)
    ?? asNonEmptyString(metadata.headCommitSha)
    ?? asNonEmptyString(metadata.headRefSha)
    ?? asNonEmptyString(metadata.commitSha)
    ?? asNonEmptyString(metadata.sha)
    ?? null
  );
}

function resolvedPullRequestRefFromWorkProduct(product: IssueWorkProduct): ResolvedPullRequestRef | null {
  const fromUrl = pullRequestRefFromUrl(product.url);
  if (fromUrl) return fromUrl;

  const metadata = isRecord(product.metadata) ? product.metadata : null;
  const repoFullName =
    asNonEmptyString(metadata?.repoFullName)
    ?? asNonEmptyString(metadata?.repositoryFullName)
    ?? asNonEmptyString(metadata?.repo)
    ?? null;
  const prNumber = asPositiveInteger(metadata?.prNumber) ?? asPositiveInteger(product.externalId);
  if (!repoFullName || !prNumber) return null;
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) return null;
  return {
    owner,
    repo,
    repoFullName,
    prNumber,
    url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
  };
}

function parseReviewTicketPullRequest(issue: Pick<IssueListItem, "title" | "description">) {
  return extractPullRequestRefFromText(issue.description) ?? extractPullRequestRefFromText(issue.title);
}

function normalizeFreeformText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .toLowerCase();
}

function commentDeclaresNoNewDiff(commentBody: string | null | undefined) {
  if (!commentBody) return false;
  const normalized = normalizeFreeformText(commentBody);
  return [
    "sem alterar codigo, commit, push ou pr",
    "sem alterar codigo, commit ou pr",
    "sem alterar codigo, commit",
    "sem novo diff",
    "sem novas mudancas de codigo",
    "sem novas mudancas de codigo nesta rodada",
    "sem novas alteracoes de codigo",
    "sem novas alteracoes",
    "mesmo change set",
    "mesmo diff ja entregue",
    "mantive o mesmo change set",
  ].some((pattern) => normalized.includes(pattern));
}

function buildArtifactTitle(ref: ResolvedPullRequestRef, rawTitle: string | null | undefined) {
  const normalized = asNonEmptyString(rawTitle);
  if (!normalized) return `PR #${ref.prNumber}`;
  return normalized;
}

function buildReviewDescription(input: {
  sourceIssue: NonNullable<IssueSummary>;
  artifact: ResolvedReviewArtifact;
  previousReview: PreviousReviewReference | null;
}) {
  const { sourceIssue, artifact, previousReview } = input;
  const sourceIssueLink = `[${sourceIssue.identifier}](${buildIssueLink(sourceIssue)})`;
  const lines = [
    "## Contexto",
    "",
    `${sourceIssueLink} entrou em \`handoff_ready\` e precisa de revisão técnica para o diff atual.`,
  ];

  if (artifact.source === "comment" && artifact.sourceLink) {
    lines.push(`- Handoff atual: [comentario mais recente](${artifact.sourceLink})`);
  } else if (artifact.bodyContext) {
    lines.push(`- Origem do PR: ${artifact.bodyContext}`);
  }

  if (previousReview?.issue) {
    const previousLink = `[${previousReview.issue.identifier}](${buildIssueLink(previousReview.issue)})`;
    const previousPrLabel = previousReview.pullRequest ? `PR #${previousReview.pullRequest.prNumber}` : "diff anterior";
    lines.push(`- Revisão anterior relacionada: ${previousLink} (${previousPrLabel})`);
  }

  lines.push(
    "",
    "## Objetivo",
    "",
    `Revisar tecnicamente o PR #${artifact.pullRequest.prNumber} com foco em bugs, regressões, riscos de segurança, aderência aos padrões do repositório e suficiência dos testes.`,
    "",
    "## Definition of Done",
    "",
    `- Revisão publicada no GitHub em ${artifact.pullRequest.url}`,
    "- Resumo objetivo postado nesta issue com findings ordenados por severidade",
    `- Se houver ajustes: indicar retorno de ${sourceIssueLink} para \`in_progress\``,
    `- Se não houver findings bloqueantes: registrar que ${sourceIssueLink} pode seguir para revisão humana final/merge`,
    "",
    "## Links",
    "",
    `- Issue fonte: ${sourceIssueLink}`,
    `- PR atual: ${artifact.pullRequest.url}`,
  );

  if (previousReview?.issue) {
    lines.push(`- Revisão anterior: [${previousReview.issue.identifier}](${buildIssueLink(previousReview.issue)})`);
  }

  return lines.join("\n");
}

function buildCommentArtifact(sourceIssue: NonNullable<IssueSummary>, comment: NonNullable<IssueComment>) {
  const pullRequest = extractPullRequestRefFromText(comment.body);
  if (!pullRequest) return null;
  const noNewDiff = commentDeclaresNoNewDiff(comment.body);
  return {
    source: "comment" as const,
    sourceId: comment.id,
    sourceCreatedAt: comment.createdAt,
    sourceLink: buildIssueCommentLink(sourceIssue, comment.id),
    title: buildArtifactTitle(pullRequest, null),
    bodyContext: "comentario de handoff com link de PR",
    pullRequest,
    diffIdentity: noNewDiff
      ? `github:${pullRequest.repoFullName}:pr:${pullRequest.prNumber}:no-new-diff`
      : `github:${pullRequest.repoFullName}:pr:${pullRequest.prNumber}:comment:${comment.id}`,
  };
}

function buildDescriptionArtifact(sourceIssue: NonNullable<IssueSummary>) {
  const pullRequest = extractPullRequestRefFromText(sourceIssue.description);
  if (!pullRequest) return null;
  return {
    source: "description" as const,
    sourceId: `${sourceIssue.id}:description`,
    sourceCreatedAt: null,
    sourceLink: buildIssueLink(sourceIssue),
    title: buildArtifactTitle(pullRequest, null),
    bodyContext: "descricao da issue fonte",
    pullRequest,
    diffIdentity: `github:${pullRequest.repoFullName}:pr:${pullRequest.prNumber}:description`,
  };
}

function buildWorkProductArtifact(product: IssueWorkProduct) {
  const pullRequest = resolvedPullRequestRefFromWorkProduct(product);
  if (!pullRequest) return null;
  const metadata = isRecord(product.metadata) ? product.metadata : null;
  const headSha = extractHeadSha(metadata);
  return {
    source: "work_product" as const,
    sourceId: product.id,
    sourceCreatedAt: product.updatedAt,
    sourceLink: product.url ?? null,
    title: buildArtifactTitle(pullRequest, product.title),
    bodyContext: "work product de PR anexado na issue",
    pullRequest,
    diffIdentity: headSha
      ? `github:${pullRequest.repoFullName}:pr:${pullRequest.prNumber}:head:${headSha}`
      : `github:${pullRequest.repoFullName}:pr:${pullRequest.prNumber}:work-product:${product.id}:${product.updatedAt.toISOString()}`,
  };
}

export function reviewDispatchService(db: Db, deps: ReviewDispatchDeps = {}) {
  const agents = deps.agents ?? agentService(db);
  const issues = deps.issues ?? issueService(db);
  const workProducts = deps.workProducts ?? workProductService(db);

  async function resolveReviewer(companyId: string) {
    const resolved = await agents.resolveByReference(companyId, REVIEWER_REFERENCE);
    if (resolved.ambiguous) return null;
    return resolved.agent;
  }

  async function resolveArtifact(sourceIssue: NonNullable<IssueSummary>, comment: IssueComment | null | undefined) {
    const products = await workProducts.listForIssue(sourceIssue.id);
    for (const product of products) {
      if (product.type !== "pull_request") continue;
      const artifact = buildWorkProductArtifact(product);
      if (artifact) return artifact;
    }

    if (comment) {
      const fromCurrentComment = buildCommentArtifact(sourceIssue, comment);
      if (fromCurrentComment) return fromCurrentComment;
    }

    const latestComments = await issues.listComments(sourceIssue.id, { order: "desc", limit: 20 });
    for (const entry of latestComments) {
      const artifact = buildCommentArtifact(sourceIssue, entry);
      if (artifact) return artifact;
    }

    return buildDescriptionArtifact(sourceIssue);
  }

  function findPreviousReview(
    childIssues: ReviewIssueRecord[],
    artifact: ResolvedReviewArtifact,
    excludedIssueId?: string,
  ): PreviousReviewReference | null {
    const candidate = childIssues
      .filter((child) => child.id !== excludedIssueId)
      .map((child) => ({ issue: child, pullRequest: parseReviewTicketPullRequest(child) }))
      .sort((left, right) => new Date(right.issue.createdAt).getTime() - new Date(left.issue.createdAt).getTime())
      .find(({ issue, pullRequest }) =>
        issue.originKind === REVIEW_DISPATCH_ORIGIN_KIND
          || (pullRequest?.repoFullName === artifact.pullRequest.repoFullName),
      );

    return candidate ?? null;
  }

  function matchExistingReview(
    childIssues: ReviewIssueRecord[],
    artifact: ResolvedReviewArtifact,
  ): ReviewIssueRecord | null {
    const byOrigin = childIssues.find((child) =>
      child.originKind === REVIEW_DISPATCH_ORIGIN_KIND
      && child.originId === artifact.diffIdentity,
    );
    if (byOrigin) return byOrigin;

    if (artifact.source === "comment" && artifact.sourceCreatedAt) {
      const fallback = childIssues
        .filter((child) => parseReviewTicketPullRequest(child)?.url === artifact.pullRequest.url)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .find((child) => new Date(child.createdAt).getTime() >= artifact.sourceCreatedAt!.getTime());
      if (fallback) return fallback;
    }

    if (artifact.source !== "comment") {
      const fallback = childIssues.find((child) => parseReviewTicketPullRequest(child)?.url === artifact.pullRequest.url);
      if (fallback) return fallback;
    }

    if (artifact.diffIdentity.endsWith(":no-new-diff")) {
      const samePullRequest = childIssues
        .filter((child) => parseReviewTicketPullRequest(child)?.url === artifact.pullRequest.url)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
      if (samePullRequest) return samePullRequest;
    }

    return null;
  }

  async function dispatchForIssue(input: {
    issueId: string;
    commentId?: string | null;
  }): Promise<ReviewDispatchResult> {
    const sourceIssue = await issues.getById(input.issueId);
    if (!sourceIssue) return { kind: "noop", reason: "issue_not_found" };
    if (sourceIssue.status !== "handoff_ready") return { kind: "noop", reason: "status_not_handoff_ready" };

    const reviewer = await resolveReviewer(sourceIssue.companyId);
    if (!reviewer) return { kind: "noop", reason: "reviewer_not_found" };

    const comment = input.commentId ? await issues.getComment(input.commentId) : null;
    const artifact = await resolveArtifact(sourceIssue, comment);
    if (!artifact) return { kind: "noop", reason: "pull_request_not_found" };

    const childIssues = await issues.list(sourceIssue.companyId, { parentId: sourceIssue.id });
    const reviewerChildren = childIssues.filter((child) => child.assigneeAgentId === reviewer.id);
    const existingReview = matchExistingReview(reviewerChildren, artifact);
    if (existingReview) {
      return {
        kind: TERMINAL_ISSUE_STATUSES.has(existingReview.status) ? "already_reviewed" : "reused",
        artifact,
        reviewIssue: existingReview,
        reviewer,
      };
    }

    const previousReview = findPreviousReview(reviewerChildren, artifact);
    const created = await issues.create(sourceIssue.companyId, {
      title: `Revisar PR #${artifact.pullRequest.prNumber} de ${sourceIssue.identifier}`,
      description: buildReviewDescription({
        sourceIssue,
        artifact,
        previousReview,
      }),
      status: "todo",
      priority: sourceIssue.priority,
      assigneeAgentId: reviewer.id,
      projectId: sourceIssue.projectId,
      projectWorkspaceId: sourceIssue.projectWorkspaceId,
      goalId: sourceIssue.goalId,
      parentId: sourceIssue.id,
      billingCode: sourceIssue.billingCode,
      executionWorkspaceId: sourceIssue.executionWorkspaceId,
      originKind: REVIEW_DISPATCH_ORIGIN_KIND,
      originId: artifact.diffIdentity,
    });

    return {
      kind: "created",
      artifact,
      reviewIssue: created,
      reviewer,
    };
  }

  return {
    dispatchForIssue,
  };
}

export { REVIEW_DISPATCH_ORIGIN_KIND };
