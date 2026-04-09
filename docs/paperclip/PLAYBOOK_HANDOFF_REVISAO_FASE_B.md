# Playbook de handoff e revisão (Fase B — TCN-1220)

**Relacionado:** plano da issue Paperclip **TCN-1218** (documento `plan` na própria issue); baseline quantitativa em [`BASELINE_FLUXO_REVISAO_FASE_A.md`](./BASELINE_FLUXO_REVISAO_FASE_A.md) (TCN-1219).

**Objetivo:** reduzir ping-pong entre Executor e Revisor com formato único de handoff, critérios explícitos de prontidão/conclusão da revisão técnica e uso disciplinado de menções que disparam wakes no Paperclip.

---

## 1. Template padrão — Executor → Revisor

Publicar na **issue do Paperclip** imediatamente antes de mover para `in_review`. Os quatro blocos são obrigatórios; use *não aplicável* apenas quando fizer sentido explícito.

```md
## Handoff para revisão técnica

### Resumo
- O que mudou (bullets objetivos; máx. 5)
- Fora de escopo / não feito neste PR (se houver ambiguidade possível)

### Validação
- Comandos executados e resultado (ex.: `npm run lint` — ok)
- Evidência de CI ou link para run, quando existir

### Riscos
- Riscos residuais, migrations, dados, segurança, feature flags
- Ou: *nenhum risco adicional relevante além do já descrito no PR*

### Decisão solicitada ao revisor
- O que precisamos que o revisor decida ou valide nesta rodada (uma frase)
- Critério de aceite em uma linha
- Próximo passo esperado após a revisão (ex.: *manter em `in_review` para humano* | *voltar `in_progress` se houver findings*)

### Ligações
- PR: `<url>`
- Worktree: `paperclip/<ticket>-<slug>`
- Branch: `<ticket>-<slug>`
- Rollback: `<como reverter / revert commit / feature flag>`
```

O template mínimo em [`DEVELOPMENT_WORKTREE_POLICY.md`](../DEVELOPMENT_WORKTREE_POLICY.md) permanece válido; este documento é a **versão canônica** com o bloco **Decisão** e ligações agrupadas.

---

## 2. Regra operacional — uso de @menções (Paperclip)

Menções (`@Agente` / usuário) **disparam wakes** e impactam orçamento operacional. Usar com intenção clara de **transferir responsabilidade** ou **exigir ação**.

| Situação | Usar @? | Motivo |
|----------|---------|--------|
| Handoff: “@Revisor PR pode assumir revisão desta rodada” | Sim | Dono da próxima ação claro |
| Bloqueio: apenas um agente/humano pode destravar | Sim | Reduz fila ambígua |
| Coordenação de escopo com dono da decisão | Sim | Evita implementação sem alinhamento |
| Atualização de progresso (“push feito”, “testes ok”) | Não | Não exige wake dedicado |
| Discussão aberta na mesma issue já atribuída | Não | Responda na thread sem novo acionador |
| “CC” informativo sem ação esperada do mencionado | Não | Custo de wake sem ganho |

**Princípio:** uma menção = uma **ação esperada** + **prazo ou prioridade** quando não for óbvio.

---

## 3. Definition of Ready (DoR) — revisão técnica pode começar

Antes de `in_review`, o Executor confirma:

- [ ] PR aberto (draft permitido) com contexto mínimo no corpo (escopo, riscos, rollback)
- [ ] Handoff na issue com os **quatro blocos** (Resumo, Validação, Riscos, Decisão)
- [ ] Diff estável — sem WIP não declarado misturado à entrega
- [ ] Validações do escopo **executadas** e listadas (não apenas planejadas)

**Automação (Fase C):** em PR **não draft**, o workflow **Paperclip — DoR (corpo PR)** valida que o **corpo do PR** contém os quatro blocos com conteúdo (espelho mínimo desta lista). Detalhes, bypass e o que continua manual no Paperclip: [`GATE_DOR_PR_FASE_C.md`](./GATE_DOR_PR_FASE_C.md).

Se o DoR não for atendido, o Coordenador **devolve** a issue para `in_progress` com comentário objetivo indicando o gap.

---

## 4. Definition of Done (DoD) — revisão técnica encerrada (rodada atual)

O Revisor PR confirma antes de considerar a rodada fechada:

- [ ] Findings registrados no GitHub **ou** declaração explícita de **ausência de findings relevantes**
- [ ] Resumo operacional na **issue Paperclip** com: link do PR, severidade/agrupamento dos findings (se houver), evidência curta de validação
- [ ] Recomendação de estado: **permanecer em `in_review`** (gate humano) **ou** **retorno a `in_progress`**
- [ ] Não declarar revisão concluída apenas no GitHub sem espelho no Paperclip quando a política da empresa exige rastreio no board

---

## 5. Plano curto de adoção (sugestão — 30 dias)

| Semana | Meta |
|--------|------|
| 1 | Coordenador referencia este playbook no onboarding interno; 1 issue piloto com check DoR em stand-up |
| 2–3 | Issues novas de sustentação: handoff obrigatório; Coordenador normaliza devolução se DoR incompleto |
| 4 | Amostra (ex.: 10 issues): auditoria DoR/DoD + contagem de menções “sem ação” — ajuste fino |

---

## Compliance (operacional)

- **DoR:** issue em `in_review` sem os quatro blocos → **reverter para `in_progress`** até completar handoff.
- **DoD:** rodada de revisão sem resumo na issue Paperclip → tratar como **revisão incompleta** perante o board.
- **Menções:** retrospectiva qualitativa; objetivo de **reduzir** pings que não mudam dono da tarefa.

---

## Changelog

- **2026-04-09** — Referência ao gate automatizado do corpo do PR ([TCN-1223](/TCN/issues/TCN-1223), Fase C) em §3.
- **2026-04-09** — Criação do documento (entrega TCN-1220 / Fase B).
