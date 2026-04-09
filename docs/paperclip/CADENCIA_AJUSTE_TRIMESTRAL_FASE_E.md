# Cadência de ajuste trimestral — revisão de fluxo (Fase E — TCN-1222)

**Escopo:** loop de melhoria contínua após [Fase D](./DASHBOARD_OPERACIONAL_REVISAO_FASE_D.md), usando baseline [Fase A](./BASELINE_FLUXO_REVISAO_FASE_A.md) e playbook [Fase B](./PLAYBOOK_HANDOFF_REVISAO_FASE_B.md).

## Cadência

| Evento | Quando | Dono sugerido |
|--------|--------|----------------|
| Revisão trimestral | Última semana de Mar/Jun/Set/Dez (UTC) | Coordenador de processos / PMO técnico |
| Micro-ajuste | Após incidente de fila (ex.: >3 issues `blocked` críticas) | Coordenador |

## Ordem do dia (60–90 min)

1. **Ler** o último export do dashboard (Fase D) e o template de relatório [baseline vs adoção](./RELATORIO_BASELINE_VS_ADOCAO_INICIAL.md).
2. **Comparar** com trimestre anterior: throughput, bloqueios, cauda de comentários, mix `originKind`.
3. **Inspecionar** 3–5 issues “cauda longa” (muitos comentários ou ciclo longo): falha de DoR, revisão oscilante ou bloqueio externo?
4. **Decidir** ajustes em playbook, política de worktree ou automação ([TCN-1223](/TCN/issues/TCN-1223)); registrar decisão no board (issue mãe ou filha).
5. **Atualizar** recomendações de custo/qualidade (seção no relatório comparativo).

## Critérios de gatilho para alterar processo

| Sinal | Ação típica |
|-------|-------------|
| Mediana de comentários/issue sobe dois trimestres seguidos | Revisar template de handoff (Fase B); treino ou lint de comentário |
| P90 de proxy de ciclo sobe sem aumento de complexidade | Reduzir WIP; auditar `blocked` sem owner |
| Aumento de retrabalho pós-`in_review` | Rever DoD / checklist de merge local |
| Novo tipo de trabalho (ex.: rotina agendada) | Issue filha + atualização explícita em `docs/DEVELOPMENT_WORKTREE_POLICY.md` |

## Evidência no epic

Após cada revisão, deixar **um comentário objetivo** na issue épica do fluxo ([TCN-1217](/TCN/issues/TCN-1217)) com: trimestre, link para export/resumo, 1–3 decisões e próxima data.
