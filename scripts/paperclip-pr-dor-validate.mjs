#!/usr/bin/env node
/**
 * Valida corpo de PR para DoR mínimo (GitHub). Uso:
 *   PR_BODY="$(cat corpo.md)" node scripts/paperclip-pr-dor-validate.mjs
 *   node scripts/paperclip-pr-dor-validate.mjs --file corpo.md [--labels-file labels.json]
 *   printf '%s' "$BODY" | node scripts/paperclip-pr-dor-validate.mjs -
 * Env:
 *   PR_BODY — markdown do PR (local)
 *   PR_BODY_JSON — corpo como JSON string (uma linha)
 *   PR_LABELS_JSON — JSON array de labels (opcional)
 */

import fs from "node:fs";
import { validatePaperclipPrDorBody } from "./lib/paperclipPrDorBody.mjs";

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

function parseLabelsJson(raw) {
  if (raw == null || raw === "") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function bodyFromEnv() {
  const json = process.env.PR_BODY_JSON;
  if (json != null && json !== "") {
    try {
      const v = JSON.parse(json);
      if (typeof v === "string") return v;
    } catch {
      /* usar PR_BODY */
    }
  }
  return process.env.PR_BODY ?? "";
}

function parseArgs(argv) {
  let filePath = null;
  let labelsFile = null;
  let useStdin = false;
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--file") {
      if (!argv[i + 1]) return { error: true };
      filePath = argv[i + 1];
      i += 2;
      continue;
    }
    if (a === "--labels-file") {
      if (!argv[i + 1]) return { error: true };
      labelsFile = argv[i + 1];
      i += 2;
      continue;
    }
    if (a === "-") {
      useStdin = true;
      i += 1;
      continue;
    }
    return { error: true };
  }
  return { filePath, labelsFile, useStdin };
}

async function main() {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);

  let body = bodyFromEnv();
  let labels = parseLabelsJson(process.env.PR_LABELS_JSON);

  if (parsed.error) {
    console.error("Uso: PR_BODY='...' node scripts/paperclip-pr-dor-validate.mjs");
    console.error("     node scripts/paperclip-pr-dor-validate.mjs [--file corpo.md] [--labels-file labels.json]");
    console.error("     ... | node scripts/paperclip-pr-dor-validate.mjs -");
    process.exit(2);
  }

  if (parsed.labelsFile) {
    labels = JSON.parse(fs.readFileSync(parsed.labelsFile, "utf8"));
  }
  if (parsed.filePath) {
    body = fs.readFileSync(parsed.filePath, "utf8");
  } else if (parsed.useStdin) {
    body = await readStdin();
  }

  const result = validatePaperclipPrDorBody(body, { labels });
  if (!result.ok) {
    for (const e of result.errors) console.error(e);
    process.exit(1);
  }
  console.log("DoR (corpo do PR): ok — quatro blocos presentes com conteúdo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
