/**
 * Classifies free-text technical review summaries for automated parent-issue reconciliation.
 * @see docs/guides/board-operator/runtime-runbook.md — technical review dispatch
 * @see doc/plans/2026-04-05-review-outcome-classification-matrix.md
 *
 * **Ambiguity:** When a comment mixes incompatible signals (e.g. an approved phrase together with a
 * non-empty blocking section, or “return to `in_progress`” with an empty blocking section), this
 * returns `null` so the server does not auto-move the parent issue.
 */

/** Resolved label when {@link classifyTechnicalReviewOutcome} can parse the summary; otherwise `null`. */
export type ClassifiedTechnicalReviewOutcome = "approved" | "blocking" | null;

/**
 * Matches common “no blocking issues” phrasing in the collapsed blocking section (EN/PT).
 * Word-boundary safe; hyphens are already folded to spaces in `collapsed`.
 */
const BLOCKING_SECTION_NEGATION_RE =
  /\b(?:nenhum|nenhuma|nao ha|sem findings? bloqueantes?|sem bloqueios?|sem problemas|nada bloqueando|tudo certo|tudo ok|none|n\/a|no issues?(?: found)?|no blockers?|zero blockers|nothing blocking|nothing to report|all clear|no problems?|not[- ]blocking|non[- ]blocking|no major issues?)\b/;

export function normalizeReviewText(text: string): string {
  return text
    .normalize("NFD")
    // Strip combining marks only; `\p{Diacritic}` also matched U+0060 (backtick) and broke
    // `` `in_progress` `` detection in review summaries.
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

export function extractMarkdownSection(body: string, heading: RegExp): string | null {
  const match = body.match(heading);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextHeading = rest.search(/(?:^|\n)\s*###\s+/);
  return (nextHeading >= 0 ? rest.slice(0, nextHeading) : rest).trim();
}

function classifyFromBlockingSection(commentBody: string): "approved" | "blocking" | null {
  const blockingSection = extractMarkdownSection(
    commentBody,
    /^###\s+(?:findings?\s+bloqueantes?|blocking\s+findings?|blocking)(?:\s+\(\d+\))?\s*$/im,
  );
  if (blockingSection === null) return null;

  const collapsed = normalizeReviewText(blockingSection)
    .replace(/[`*_>#\-\d.[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!collapsed) return null;
  if (BLOCKING_SECTION_NEGATION_RE.test(collapsed)) {
    return "approved";
  }
  return "blocking";
}

function hasApprovedPhrase(normalized: string): boolean {
  return (
    /\bpode seguir para revisao humana\b/.test(normalized)
    || /\bpronto para revisao humana\b/.test(normalized)
    || /\baprovad[oa]\s+para\s+revisao humana\b/.test(normalized)
    || /\bready for human review\b/.test(normalized)
    || /\bapproved for human review\b/.test(normalized)
    || /\bok to proceed to human review\b/.test(normalized)
    || /\blgtm for human review\b/.test(normalized)
    || /\bno blocking findings\b/.test(normalized)
    || /\bnon-blocking review\b/.test(normalized)
    || /\bship to human review\b/.test(normalized)
  );
}

export function classifyTechnicalReviewOutcome(
  commentBody: string | null | undefined,
): ClassifiedTechnicalReviewOutcome {
  if (!commentBody) return null;

  const normalized = normalizeReviewText(commentBody);
  const returnToProgress =
    /\bretornar\b[\s\S]*`in_progress`/.test(normalized) || /\bretornar\b[\s\S]*\bin_progress\b/.test(normalized);
  const approvedPhrase = hasApprovedPhrase(normalized);
  const sectionOutcome = classifyFromBlockingSection(commentBody);

  if (returnToProgress && approvedPhrase) return null;
  if (returnToProgress && sectionOutcome === "approved") return null;
  if (approvedPhrase && sectionOutcome === "blocking") return null;

  if (returnToProgress) return "blocking";
  if (approvedPhrase) return "approved";
  if (sectionOutcome) return sectionOutcome;
  return null;
}
