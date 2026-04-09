# Gate leve DoR → revisão técnica (Fase C)

**Refs:** plano [TCN-1218](/TCN/issues/TCN-1218#document-plan); playbook [PLAYBOOK_HANDOFF_REVISAO_FASE_B.md](./PLAYBOOK_HANDOFF_REVISAO_FASE_B.md) §3; política [DEVELOPMENT_WORKTREE_POLICY.md](../DEVELOPMENT_WORKTREE_POLICY.md).

## O que este gate cobre (GitHub)

Automação **leve** no repositório:

- **Workflow:** [`.github/workflows/paperclip-pr-dor-gate.yml`](../../.github/workflows/paperclip-pr-dor-gate.yml) roda em PRs **não draft** (`opened`, `edited`, `synchronize`, `reopened`, `ready_for_review`).
- **Regra:** o corpo do PR deve conter títulos Markdown com os quatro blocos do handoff (**Resumo**, **Validação**, **Riscos**, **Decisão** — aceita variações com acentos e títulos como *Decisão solicitada ao revisor*), cada um com **pelo menos uma linha de conteúdo** sob o título.
- **Implementação:** script [`scripts/paperclip-pr-dor-validate.mjs`](../../scripts/paperclip-pr-dor-validate.mjs) (lógica em `scripts/lib/paperclipPrDorBody.mjs`). No workflow, corpo e labels são lidos de `GITHUB_EVENT_PATH` (`pull_request.body` e `pull_request.labels`), gravados em `pr-body.md` e `pr-labels.json` via Python e validados com `--file` e `--labels-file` (evita passar JSON grande ou multilinha por variável de ambiente, que pode truncar ou quebrar o parsing no runner).

Isso **não** substitui o handoff completo na **issue Paperclip** (mesmos quatro blocos + ligações PR/worktree/branch): o GitHub não tem acesso ao comentário do board. O executor continua obrigado a publicar o template na issue antes de `in_review`, conforme o playbook.

## Validação local

```bash
PR_BODY="$(gh pr view 123 --json body -q .body)" node scripts/paperclip-pr-dor-validate.mjs
# ou
npm run paperclip:dor-validate-pr -- --file /tmp/corpo-pr.md
```

(`npm run paperclip:dor-validate-pr` exige `PR_BODY` ou `--file` ou stdin `-`; ver uso no script.)

## Bypass (exceções)

Quem pode contornar o check no GitHub: **Coordenador** ou membro do **board** com permissão para aplicar labels no repositório.

1. Aplicar a label **`dor-bypass`** no PR.
2. Registrar em **comentário no PR** (e, quando aplicável, na issue Paperclip): motivo objetivo, data e aprovação explícita do bypass (referência ao Coordenador/board).

Sem o comentário, o bypass é considerado **procedimento incompleto** para auditoria operacional.

## Evidência de execução (exemplo)

Quando o workflow roda com sucesso, o job **“DoR mínimo no corpo do PR”** termina com o step *Validar corpo do PR* imprimindo:

`DoR (corpo do PR): ok — quatro blocos presentes com conteúdo.`

Em falha, o job falha com mensagens apontando o bloco ausente ou vazio (ver log do job no GitHub Actions).

## Billing / runners

Se a run aparecer como falha em poucos segundos **sem log de steps**, verifique em **GitHub → Organization/Account → Billing** se há pagamento em atraso ou limite de spending para **GitHub Actions**. Nesse caso o runner nem inicia (mensagem do GitHub no painel da run).

## Changelog deste documento

- **2026-04-09** — Ajuste operacional: materialização do corpo/labels a partir de `GITHUB_EVENT_PATH` no workflow (revisão PR, job `validate-pr-body-dor`).
- **2026-04-09** — Criação (TCN-1223 / Fase C).
