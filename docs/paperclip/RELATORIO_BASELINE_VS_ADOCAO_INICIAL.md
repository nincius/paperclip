# Relatório inicial: baseline vs adoção (TCN-1222)

**Propósito:** comparar o **baseline** objetivo (Fase A) com medicões **após** adoção estável do playbook (Fase B) e do gate operacional (Fase C).  
**Uso:** preencher na **primeira** revisão trimestral em que o gate [TCN-1221](/TCN/issues/TCN-1221) estiver em uso rotineiro; antes disso, tratar esta seção como **pré-adoção** e repetir números do baseline apenas como referência.

## Referência — baseline (Fase A, 2026-04-09)

Fonte: [BASELINE_FLUXO_REVISAO_FASE_A.md](./BASELINE_FLUXO_REVISAO_FASE_A.md).

| Métrica (amostra n=25 `done`, projeto Sustentação) | Valor baseline |
|----------------------------------------------------|----------------|
| Média comentários/issue | 3,88 |
| Mediana comentários/issue | 2 |
| P90 comentários/issue | 7 |
| Dashboard: tarefas `open` / `inProgress` / `blocked` / `done` | 31 / 5 / 1 / 1026 (snapshot único) |
| `technical_review_dispatch` na amostra | 5 de 25 |

## Pós-adoção — a preencher

_Data da coleta (UTC): _______________

| Métrica | Valor | Delta vs baseline | Notas |
|---------|-------|-------------------|-------|
| Média comentários/issue | | | |
| Mediana comentários/issue | | | |
| P90 comentários/issue | | | |
| Issues `blocked` por semana (média) | | | |
| Tempo médio PR em `in_review` (se disponível via GitHub) | | | |

## Recomendações de próximos incrementos (custo / qualidade)

1. **Custo:** (ex.: reduzir heartbeats desnecessários — menções só com DoR claro; consolidar comentários de estado.)
2. **Qualidade:** (ex.: amostragem maior; instrumentação `in_review`→`done` via operador.)
3. **Riscos:** (ex.: dependência de API limits; rotação de agentes.)

## Links

- Plano mestre: [TCN-1218](/TCN/issues/TCN-1218#document-plan)
- Playbook handoff: [PLAYBOOK_HANDOFF_REVISAO_FASE_B.md](./PLAYBOOK_HANDOFF_REVISAO_FASE_B.md)
- Dashboard operacional: [DASHBOARD_OPERACIONAL_REVISAO_FASE_D.md](./DASHBOARD_OPERACIONAL_REVISAO_FASE_D.md)
