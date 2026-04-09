/**
 * Gate leve DoR (Fase C): corpo do PR alinhado ao §3 de PLAYBOOK_HANDOFF_REVISAO_FASE_B.md
 * — quatro blocos obrigatórios com conteúdo não vazio sob cada título.
 */

const DOR_BYPASS_LABEL = "dor-bypass";

const REQUIRED = [
  { id: "resumo", match: (h) => includesNorm(h, "resumo") },
  { id: "validacao", match: (h) => includesNorm(h, "validacao") },
  { id: "riscos", match: (h) => includesNorm(h, "riscos") },
  { id: "decisao", match: (h) => includesNorm(h, "decisao") },
];

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeHeading(text) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * @param {string} heading
 * @param {string} needle ascii lower no accents
 */
function includesNorm(heading, needle) {
  return normalizeHeading(heading).includes(needle);
}

/**
 * @param {string[]} lines
 * @returns {{ lineIdx: number, title: string }[]}
 */
function extractHeadings(lines) {
  const headings = [];
  const re = /^(#{1,6})\s+(.+?)\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) headings.push({ lineIdx: i, title: m[2] });
  }
  return headings;
}

/**
 * @param {string[]} lines
 * @param {number} headingLineIdx
 * @returns {string}
 */
function sectionBodyAfterHeading(lines, headingLineIdx) {
  const parts = [];
  for (let i = headingLineIdx + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) break;
    parts.push(lines[i]);
  }
  return parts.join("\n").trim();
}

/**
 * @param {unknown} labels
 * @returns {boolean}
 */
export function hasDorBypassLabel(labels) {
  if (!Array.isArray(labels)) return false;
  return labels.some((l) => {
    const name = typeof l === "string" ? l : l?.name;
    return typeof name === "string" && name.trim() === DOR_BYPASS_LABEL;
  });
}

/**
 * @param {string} body
 * @param {{ labels?: unknown }} [options]
 * @returns {{ ok: true } | { ok: false; errors: string[] }}
 */
export function validatePaperclipPrDorBody(body, options = {}) {
  const errors = [];

  if (hasDorBypassLabel(options.labels)) {
    return { ok: true };
  }

  if (typeof body !== "string" || !body.trim()) {
    errors.push('Corpo do PR vazio: inclua os quatro blocos (Resumo, Validação, Riscos, Decisão) conforme o playbook.');
    return { ok: false, errors };
  }

  const lines = body.split(/\r?\n/);
  const headings = extractHeadings(lines);

  for (const req of REQUIRED) {
    const hit = headings.find((h)   => req.match(h.title));
    if (!hit) {
      errors.push(
        `DoR: falta seção com título contendo "${req.id}" (ex.: ### Resumo, ### Validação, ### Riscos, ### Decisão / Decisão solicitada ao revisor). Ver docs/paperclip/PLAYBOOK_HANDOFF_REVISAO_FASE_B.md §3.`
      );
      continue;
    }
    const section = sectionBodyAfterHeading(lines, hit.lineIdx);
    if (!section) {
      errors.push(`DoR: a seção "${req.id}" está sem conteúdo sob o título — preencha pelo menos uma linha.`);
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
