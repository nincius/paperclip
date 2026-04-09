import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  hasDorBypassLabel,
  normalizeHeading,
  validatePaperclipPrDorBody,
} from "./lib/paperclipPrDorBody.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, "paperclip-pr-dor-validate.mjs");

describe("paperclipPrDorBody", () => {
  it("normaliza acentos em títulos", () => {
    expect(normalizeHeading("Validação")).toBe("validacao");
    expect(normalizeHeading("Decisão solicitada ao revisor")).toBe("decisao solicitada ao revisor");
  });

  it("aceita bypass por label dor-bypass", () => {
    expect(validatePaperclipPrDorBody("", { labels: [{ name: "dor-bypass" }] }).ok).toBe(true);
    expect(hasDorBypassLabel([{ name: "dor-bypass" }])).toBe(true);
    expect(hasDorBypassLabel([{ name: "bug" }])).toBe(false);
  });

  it("rejeita corpo vazio sem bypass", () => {
    const r = validatePaperclipPrDorBody("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("aceita playbook-like com quatro blocos preenchidos", () => {
    const body = `
## Handoff

### Resumo
- Mudança X

### Validação
- npm run lint — ok

### Riscos
- Nenhum adicional

### Decisão solicitada ao revisor
Validar escopo.
`;
    expect(validatePaperclipPrDorBody(body).ok).toBe(true);
  });

  it("rejeita seção sem conteúdo", () => {
    const body = `
### Resumo
x

### Validação
y

### Riscos
z

### Decisão

`;
    const r = validatePaperclipPrDorBody(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("decisao"))).toBe(true);
  });

  it("CLI aceita PR_BODY_JSON (compatível com GitHub Actions toJSON)", () => {
    const markdown = `### Resumo\n-\n### Validação\n-\n### Riscos\n-\n### Decisão\n-\n`;
    const out = execFileSync(process.execPath, [cliPath], {
      encoding: "utf8",
      env: { ...process.env, PR_BODY_JSON: JSON.stringify(markdown) },
    });
    expect(out).toContain("ok");
  });

  it("CLI --file + --labels-file aceita dor-bypass com corpo inválido", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dor-"));
    const md = path.join(dir, "b.md");
    const lbl = path.join(dir, "l.json");
    fs.writeFileSync(md, "sem seções", "utf8");
    fs.writeFileSync(lbl, JSON.stringify([{ name: "dor-bypass" }]), "utf8");
    const out = execFileSync(process.execPath, [cliPath, "--file", md, "--labels-file", lbl], {
      encoding: "utf8",
    });
    expect(out).toContain("ok");
  });
});
