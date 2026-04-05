import { describe, expect, it } from "vitest";
import {
  classifyTechnicalReviewOutcome,
  extractMarkdownSection,
  normalizeReviewText,
} from "../services/technical-review-outcome.js";

const BLOCKING_HEADING =
  /^###\s+(?:findings?\s+bloqueantes?|blocking\s+findings?|blocking)(?:\s+\(\d+\))?\s*$/im;

describe("normalizeReviewText", () => {
  it.each([
    ["READY", "ready"],
    ["Ação", "acao"],
    ["Não há", "nao ha"],
    ["`in_progress`", "`in_progress`"],
  ])("normalizes %j → %j", (input, expected) => {
    expect(normalizeReviewText(input)).toBe(expected);
  });

  it("strips combining marks but keeps ASCII backticks for status tokens", () => {
    expect(normalizeReviewText("Retornar para `in_progress`")).toContain("`in_progress`");
  });
});

describe("extractMarkdownSection", () => {
  it("returns null when the heading is missing", () => {
    expect(extractMarkdownSection("no headings", BLOCKING_HEADING)).toBe(null);
  });

  it("returns trimmed content up to the next same-level heading", () => {
    expect(
      extractMarkdownSection(
        "### Blocking findings\n\nNone.\n\n### Decision\nok",
        BLOCKING_HEADING,
      ),
    ).toBe("None.");
  });

  it("detects the next ### heading immediately after the matched heading (no blank line)", () => {
    expect(
      extractMarkdownSection("### Blocking findings\n### Decision\nx", BLOCKING_HEADING),
    ).toBe("");
  });

  it("detects adjacent ### without a newline between headings (custom heading match)", () => {
    expect(extractMarkdownSection("### A### B\nbody", /###\s+A\s*/)).toBe("");
    expect(extractMarkdownSection("### A### B\nbody", /###\s+A\s*/)).not.toContain("body");
  });

  it("handles optional indentation before the next heading", () => {
    expect(
      extractMarkdownSection("### Blocking findings\n  ### Other\nz", BLOCKING_HEADING),
    ).toBe("");
  });

  it("returns the tail when there is no following ### section", () => {
    expect(extractMarkdownSection("### Blocking findings\n\nOnly this.", BLOCKING_HEADING)).toBe(
      "Only this.",
    );
  });

});

describe("classifyTechnicalReviewOutcome — blocking section negations", () => {
  it.each([
    ["None."],
    ["N/A."],
    ["No issues."],
    ["No issues found."],
    ["No blockers."],
    ["Zero blockers."],
    ["Nothing blocking."],
    ["Nothing to report."],
    ["All clear."],
    ["No problems."],
    ["Not blocking."],
    ["Non-blocking."],
    ["No major issues."],
    ["Nenhum."],
    ["Sem problemas."],
    ["Tudo certo."],
    ["Sem findings bloqueantes."],
    ["Mixed: no issues encontrados; ship later."],
  ])("treats blocking section %j as approved when it is the only signal", (sectionBody) => {
    expect(
      classifyTechnicalReviewOutcome(`### Blocking findings\n\n${sectionBody}`),
    ).toBe("approved");
  });

  it("still classifies substantive blocking text", () => {
    expect(
      classifyTechnicalReviewOutcome(
        "### Blocking findings\n\nRace condition; not safe to merge.",
      ),
    ).toBe("blocking");
  });

  it("returns null when the blocking section is empty (only headings)", () => {
    expect(
      classifyTechnicalReviewOutcome("### Blocking findings\n### Decision\nNenhum."),
    ).toBe(null);
  });
});

describe("classifyTechnicalReviewOutcome", () => {
  it("detects English approved phrases", () => {
    expect(classifyTechnicalReviewOutcome("Ready for human review.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("Approved for human review after CI.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("No blocking findings.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("This is a non-blocking review.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("OK to proceed to human review.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("LGTM for human review.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("Ship to human review.")).toBe("approved");
  });

  it("still detects Portuguese approved phrases", () => {
    expect(classifyTechnicalReviewOutcome("Pode seguir para revisao humana.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("Pronto para revisao humana.")).toBe("approved");
    expect(classifyTechnicalReviewOutcome("Aprovado para revisao humana.")).toBe("approved");
  });

  it("classifies blocking findings section", () => {
    expect(
      classifyTechnicalReviewOutcome("### Blocking findings\n\nNone."),
    ).toBe("approved");
    expect(
      classifyTechnicalReviewOutcome("### Findings bloqueantes\n\nNenhum."),
    ).toBe("approved");
    expect(
      classifyTechnicalReviewOutcome("### Blocking findings\n\nRace condition in cache."),
    ).toBe("blocking");
  });

  it.each([
    ["", null],
    [null, null],
    [undefined, null],
    ["Looks good!", null],
    ["LGTM", null],
    ["   \t\n  ", null],
    ["  Ready for human review.  ", "approved"],
    ["READY FOR HUMAN REVIEW.", "approved"],
  ] as const)("edge / ambiguous free text: %j → %j", (input, expected) => {
    expect(classifyTechnicalReviewOutcome(input)).toBe(expected);
  });

  it("returns null for long non-matching bodies", () => {
    const longNoise = `x${"a".repeat(50_000)} discussion only; no approval tokens`;
    expect(classifyTechnicalReviewOutcome(longNoise)).toBe(null);
  });

  it("returns null when approved phrases conflict with a non-empty blocking section", () => {
    expect(
      classifyTechnicalReviewOutcome(`### Findings bloqueantes
Race condition.

Pode seguir para revisao humana.`),
    ).toBe(null);
    expect(
      classifyTechnicalReviewOutcome(`### Blocking findings
Bug in auth.

No blocking findings elsewhere in the doc.`),
    ).toBe(null);
  });

  it("returns null when return-to-in_progress wording conflicts with an empty blocking section", () => {
    expect(
      classifyTechnicalReviewOutcome(`### Findings bloqueantes
Nenhum.

### Decisao operacional
Retornar PAP-700 para \`in_progress\`.`),
    ).toBe(null);
  });

  it("classifies a minimal non-negation blocking section as blocking", () => {
    expect(classifyTechnicalReviewOutcome("### Blocking findings\n\nOK.")).toBe("blocking");
  });

  it("returns null when the approval phrase sits in a non-empty blocking section (ambiguous)", () => {
    expect(
      classifyTechnicalReviewOutcome(`### Blocking findings
Pode seguir para revisao humana.`),
    ).toBe(null);
  });
});
