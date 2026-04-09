# Dashboard operacional do fluxo de revisão (Fase D — TCN-1222)

**Escopo:** visibilidade contínua alinhada ao plano [TCN-1218](/TCN/issues/TCN-1218#document-plan) e ao baseline [Fase A](./BASELINE_FLUXO_REVISAO_FASE_A.md).  
**Pré-requisito operacional:** gate leve DoR → `in_review` ([TCN-1221](/TCN/issues/TCN-1221) / [TCN-1223](/TCN/issues/TCN-1223)) estabiliza o sinal de fila; até lá, trate as métricas abaixo como **leading indicators**, não como SLAs fechados.

## Objetivo

Uma **fonte única de verdade** periódica (dashboard API ou export estático) que responda, sem caça manual:

1. **Saúde da fila:** tarefas abertas, em progresso, bloqueadas; aprovações pendentes (se existirem).
2. **Pressão de WIP:** idade relativa das issues `in_progress` / `in_review` (proxy: `updatedAt` + contagem de comentários até operador expor histórico de estado).
3. **Riqueza de handoff:** distribuição de comentários por issue na amostra de `done` recente (replicar método da Fase A).
4. **Linha de despacho:** participação de `technical_review_dispatch` e issues derivadas de rotinas ([TCN-1215](/TCN/issues/TCN-1215) e similares).

## Painel mínimo (API Paperclip)

| Indicador | Fonte | Frequência sugerida |
|-----------|--------|----------------------|
| Snapshot agregado | `GET /api/companies/{companyId}/dashboard` | Semanal (fixa dia/hora UTC) |
| Throughput do projeto | `GET .../issues?projectId=&status=done&limit=50` + amostra | Semanal |
| Comentários/issue (amostra) | `GET /api/issues/{id}/comments` por item da amostra | Mensal ou a cada export trimestral |
| Inbox do coordenador | `GET /api/agents/me/inbox-lite` | Opcional em heartbeats de gestão |

## Export recorrente (sem UI nova)

1. Guardar JSON do dashboard e da lista `done` (top N) com **timestamp UTC** no artefato de relatório (repositório `docs/paperclip/exports/` local protegido por `.gitignore`, ou armazenamento interno da empresa — **não** commitar dumps com PII).
2. Repetir o **método replicável** da Fase A para média/mediana/P90 de comentários e, quando aplicável, proxy `startedAt` → `completedAt`.
3. Registrar no comentário trimestral (Fase E) os **deltas** vs revisão anterior, não só números absolutos.

## Lacunas conhecidas (até instrumentação interna)

Documentadas na Fase A: sem histórico público de wakes por issue nem transição explícita `in_review` → `done`. O dashboard operacional **não** substitui telemetria do operador; quando disponível, substituir proxies por métricas definitivas.

## Critério de “pronto” para a Fase D (operacional)

- Rotina documentada (checklist + endpoints) e **executada pelo menos uma vez** por um agente humano ou agente com credencial de leitura.
- Dono da cadência trimestral nomeado (ver [cadência Fase E](./CADENCIA_AJUSTE_TRIMESTRAL_FASE_E.md)).
