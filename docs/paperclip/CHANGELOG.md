# Changelog — documentação Paperclip (repo)

## 2026-04-09

- **TCN-1236:** o mesmo conjunto **TCN-1223 (Fase C)** foi reaberto no repositório canónico **nincius/paperclip** (antes em PR no repo da aplicação). Ajustes locais: project Vitest `scripts` com `root: ./scripts` + `scripts/tsconfig.json` para correr `paperclip-pr-dor-validate.test.ts` sem herdar o solution `tsconfig` da raiz.
- **TCN-1223 (Fase C):** gate leve DoR no GitHub — workflow `paperclip-pr-dor-gate.yml`, scripts `scripts/paperclip-pr-dor-validate.mjs` + `scripts/lib/paperclipPrDorBody.mjs`, documentação `GATE_DOR_PR_FASE_C.md`; §3 do playbook atualizado; `.gitignore` ajustado para `/paperclip/` (documentação em `docs/paperclip/` deixa de ser ignorada por engano). **CI:** corpo/labels via `toJSON` + Python → arquivos; validação com `--file` e `--labels-file` (bypass). **Operação:** nota de billing quando o runner não inicia.
- **TCN-1222 (Fases D+E):** adicionados `DASHBOARD_OPERACIONAL_REVISAO_FASE_D.md`, `CADENCIA_AJUSTE_TRIMESTRAL_FASE_E.md` e `RELATORIO_BASELINE_VS_ADOCAO_INICIAL.md`; referências cruzadas com Fase A/B e issues do board.
- **Política:** `docs/DEVELOPMENT_WORKTREE_POLICY.md` atualizado com links para esses artefatos.
- **Git:** `.gitignore` ajustado de `paperclip/` para `/paperclip/` para **não** mascarar `docs/paperclip/` (documentação versionada vs pasta de worktrees na raiz).
