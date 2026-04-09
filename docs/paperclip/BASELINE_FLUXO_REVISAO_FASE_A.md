# Baseline do fluxo de revisão (Fase A — TCN-1219)

**Escopo:** amostra objetiva e método replicável alinhados ao plano da issue **TCN-1218** no Paperclip (`#document-plan` na própria issue).  
**Data da coleta (UTC):** 2026-04-09.

## Limitações da API Paperclip (público/agente)

| Métrica desejada | Disponível via REST usado aqui | Observação |
|------------------|---------------------------------|------------|
| Comentários por issue | Sim | `GET /api/issues/{id}/comments` |
| Mix `originKind` (ex.: `technical_review_dispatch`) | Sim | Lista de issues |
| Painel agregado (tarefas abertas/concluídas) | Sim | `GET /api/companies/{companyId}/dashboard` |
| **Wakes por issue** | Não mapeado | Não há endpoint documentado de histórico de runs por issue neste contrato; exige telemetria do operador ou export com runs. |
| **`in_review` → `done` (latência)** | Não | Não há histórico de transições de status no payload de issue; `startedAt`/`completedAt` refletem **janela de execução** (ex.: checkout → conclusão), não permanência em `in_review`. |

Para a latência de fila de revisão e wakes exatos, usar base interna do Paperclip (SQL/ETL) ou export de company com runs, quando habilitado pela governança.

## Snapshot do dashboard (empresa)

Coleta: `GET /api/companies/{companyId}/dashboard`.

- Agentes: `active` 2, `running` 4, `paused` 1  
- Tarefas: `open` 31, `inProgress` 5, `blocked` 1, `done` 1026  
- Aprovações pendentes: 0  

## Amostra analisada

- **Projeto:** Sustentação (Bugs & Melhorias) — `projectId` fixo no script abaixo.  
- **Filtro:** `status=done`, `limit=50`, ordenação por `updatedAt` descendente após fetch; **top 25** issues.  
- **Unidade:** issues com interação real (comentários variam 0–24).

### Distribuição de comentários (n = 25)

| Estatística | Valor |
|-------------|-------|
| Média | 3,88 |
| Mediana | 2 |
| P90 | 7 |
| Máximo | 24 |

### Janela `startedAt` → `completedAt` (n = 22 com ambos)

Proxy de **tempo de ciclo da execução** registrada no board — **não** substitui `in_review` → `done`.

| Estatística | Valor (s) | Valor legível |
|-------------|-----------|----------------|
| Mediana | ~202 | ~3,4 min |
| P90 | ~32 986 | ~9,2 h |

A cauda longa (P90) sugere issues com execução pausada ou múltiplas visitas antes do fecho — útil como pressão de WIP, mas deve ser validada com histórico de estado.

### `originKind` na amostra

- `manual`: 20  
- `technical_review_dispatch`: 5  

Indica presença relevante de linha de despacho de revisão técnica nas conclusões recentes do projeto.

## Leitura executiva (hipóteses)

1. **Volume de coordenação:** mediana baixa de comentários (2) com média maior (3,88) e P90 = 7 — poucos tópicos concentram conversas longas; estes são candidatos a **revisão de formato de handoff** (TCN-1220).  
2. **Cauda de ciclo:** P90 elevado na janela `startedAt`–`completedAt` aponta **WIP antigo ou bloqueios implícitos**; sem log de `in_review`, o board deve priorizar instrumentação (Fase C/D) ou query interna.  
3. **Custo / wakes:** até termos contagem de runs por issue, o proxy conservador para “custo de interação” na Fase A é **comentários/issue** + **issues com `technical_review_dispatch`**, não número de heartbeats.

## Método replicável

Pré-requisitos: `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, `PAPERCLIP_COMPANY_ID`.

1. Dashboard:  
   `curl -sS -H "Authorization: Bearer $PAPERCLIP_API_KEY" "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/dashboard"`
2. Lista de issues concluídas do projeto:  
   `GET /api/companies/{companyId}/issues?status=done&projectId={projectId}&limit=50`
3. Para cada issue da amostra:  
   `GET /api/issues/{issueId}/comments` → contar itens da lista.
4. Calcular média, medianas e percentis no script preferido (exemplo abaixo em Python 3 apenas com stdlib).

```python
import json, os, urllib.request

def get(path):
    req = urllib.request.Request(
        os.environ["PAPERCLIP_API_URL"] + path,
        headers={"Authorization": "Bearer " + os.environ["PAPERCLIP_API_KEY"]},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

co, proj = os.environ["PAPERCLIP_COMPANY_ID"], "SEU_PROJECT_ID"
issues = get(f"/api/companies/{co}/issues?status=done&projectId={proj}&limit=50")
issues.sort(key=lambda x: x.get("updatedAt") or "", reverse=True)
for iss in issues[:25]:
    comments = get(f"/api/issues/{iss['id']}/comments")
    # ... agregue len(comments), timestamps, etc.
```

**Checkout e mutações:** incluir sempre `X-Paperclip-Run-Id` e usar `agentId` retornado por `GET /api/agents/me` se `PAPERCLIP_AGENT_ID` do ambiente estiver inconsistente com o JWT.

## Próximos passos (board)

- **TCN-1220** — playbook de handoff e menções.  
- **TCN-1221** — automação leve do gate `in_review`.  
- **TCN-1222** — dashboard operacional e cadência trimestral (depende de métricas mais ricas que esta API).  

---

*Documento produzido no contexto operacional Paperclip; métricas são snapshot pontual, não painel contínuo.*
