# Politica Oficial de Desenvolvimento com Worktree, Branch, PR e Revisao Tecnica

> Esta politica vale para qualquer mudanca de codigo, documentacao ou configuracao no repositorio `sistematecnica-v1`.

## Objetivo

Padronizar como agentes e humanos executam mudancas no repositorio com isolamento local, rastreabilidade operacional no Paperclip, revisao tecnica dedicada e gate real de aprovacao humana no GitHub.

## Principio Operacional

- Paperclip coordena a tarefa, o contexto, a atribuicao e o handoff.
- Claudio executa a mudanca no worktree oficial da issue.
- Revisor PR faz a revisao tecnica do PR com foco em risco real.
- GitHub continua sendo a camada de controle de mudanca e aprovacao humana final.
- Cada issue de desenvolvimento usa exatamente 1 branch de trabalho e 1 worktree dedicado.
- O diretorio principal do repositorio nao e area de implementacao.

## Escopo

Esta politica e obrigatoria para:

- features
- bugfixes
- refactors
- alteracoes de configuracao
- alteracoes de documentacao que precisem versionamento e revisao

## Modelo Operacional

### Coordenador

Responsavel por:

- transformar objetivos em issues executaveis
- garantir escopo, contexto tecnico, criterios de aceite e dono claro
- atribuir implementacao ao Claudio
- acionar o Revisor PR quando a issue entrar em `in_review`
- devolver o ciclo para revisao humana final quando a revisao tecnica estiver concluida
- manter o estado correto das issues no Paperclip

Nao faz por padrao:

- implementacao de produto no lugar do executor
- aprovacao final do PR
- merge

### Claudio

Responsavel por:

- fazer checkout da issue
- criar ou reutilizar branch `<ticket>-<slug>`
- criar ou reutilizar worktree `paperclip/<ticket>-<slug>`
- implementar e validar a mudanca dentro do worktree
- fazer commit, push e abrir PR em draft
- publicar handoff completo na issue antes de mover para `in_review`

Nao faz:

- merge
- autoaprovacao do proprio PR
- trabalho fora de worktree dedicado

### Revisor PR

Responsavel por:

- revisar o PR com foco em bugs, regressao, seguranca, arquitetura e testes
- comentar findings no GitHub de forma objetiva e acionavel
- registrar um resumo operacional no ticket Paperclip
- recomendar retorno para `in_progress` quando houver problemas relevantes
- sinalizar quando a revisao tecnica terminou sem findings relevantes

Nao faz:

- implementar a feature por padrao
- redefinir escopo da tarefa sem alinhamento com o Coordenador
- merge
- substituir a aprovacao humana final

### Revisor humano final

Responsavel por:

- validar a mudanca no GitHub
- aprovar ou pedir ajustes
- decidir o merge final

## Regras Obrigatorias

1. Todo trabalho deve acontecer em um worktree Git dentro de `paperclip/`.
2. Toda issue de codigo deve usar uma branch propria no padrao `<ticket>-<slug>`.
3. Todo worktree deve usar o mesmo identificador da branch no padrao `paperclip/<ticket>-<slug>`.
4. Toda entrega deve terminar em Pull Request, inicialmente em draft enquanto o agente ainda estiver em execucao ou aguardando revisao.
5. Nenhuma mudanca vai para `main` sem revisao humana no GitHub.
6. Nao abrir um novo worktree para a mesma issue apenas porque houve rodada de review; manter a mesma branch e o mesmo worktree ate o encerramento.
7. Nao editar, commitar ou corrigir produto diretamente no diretorio principal do repositorio.
8. Revisao tecnica por agente nao substitui approval humano no GitHub.
9. Mudancas sensiveis podem exigir reviewer humano especifico ou 2 approvals.

Mudancas sensiveis incluem:

- auth
- seguranca
- migrations
- deploy
- RLS
- permissoes

## O que pode no diretorio principal

- ler arquivos
- revisar documentacao
- consultar status Git
- executar comandos de diagnostico
- preparar ou inspecionar worktrees

## O que nao pode no diretorio principal

- editar codigo do produto
- editar configuracoes versionadas da entrega
- criar commits
- abrir hotfix local fora de worktree

## Papel do Paperclip

Use o Paperclip como camada de coordenacao operacional:

- `todo`: issue pronta para iniciar; branch/worktree ainda nao confirmados pelo executor
- `in_progress`: issue em execucao ativa; Claudio implementando no worktree oficial
- `blocked`: existe impedimento objetivo; o comentario deve dizer o bloqueio, a acao esperada e quem precisa agir
- `in_review`: PR aberto e revisao tecnica ou humana em andamento
- `done`: PR aprovado, mergeado e ciclo local encerrado

## Papel do GitHub

Use o GitHub como camada de controle de mudanca:

- branch protection em `main`
- merge apenas por Pull Request
- approval humano obrigatorio
- status checks de GitHub Actions opcionais (nao bloqueantes por custo de runners)
- checks locais obrigatorios antes do merge (`lint`, `typecheck`, `test`, `test:ef`, e `test:deno` quando aplicavel)
- PR draft por padrao enquanto o agente ainda estiver executando ou aguardando revisao
- **DoR (Fase C):** em PR **nao draft**, o workflow **Paperclip — DoR (corpo PR)** exige os quatro blocos (Resumo, Validacao, Riscos, Decisao) no corpo do PR; ver `docs/paperclip/GATE_DOR_PR_FASE_C.md` (bypass, validacao local). Isso complementa — nao substitui — o handoff na issue Paperclip.
- conversa resolvida antes do merge

## Convencao Oficial

### Branch

```text
<ticket>-<slug>
```

Exemplos:

- `tcn-31-fix-auth-timeout`
- `tcn-30-claudio-reviewer-flow`

### Worktree

```text
paperclip/<ticket>-<slug>
```

Exemplos:

- `paperclip/tcn-31-fix-auth-timeout`
- `paperclip/tcn-30-claudio-reviewer-flow`

## Fluxo Operacional Oficial

### Fase 1. Planejamento e atribuicao

1. O Coordenador recebe ou cria a issue.
2. O Coordenador garante escopo claro, criterios de aceite e contexto tecnico.
3. O Coordenador atribui a issue ao Claudio.

### Fase 2. Execucao pelo Claudio

1. Claudio faz checkout da issue.
2. Claudio cria ou confirma a branch `<ticket>-<slug>`.
3. Claudio cria ou confirma o worktree `paperclip/<ticket>-<slug>`.
4. Toda implementacao e validacao acontecem dentro do worktree.
5. Claudio faz commit e push da mesma branch.
6. Claudio abre PR em draft.
7. Claudio comenta na issue com worktree, branch, resumo, validacoes, riscos, rollback e link do PR.
8. Claudio move a issue para `in_review`.

### Fase 3. Revisao tecnica pelo Revisor PR

1. Coordenador ou automacao aciona o Revisor PR quando a issue entrar em `in_review`.
2. O Revisor PR le a issue, o contexto do PR e o diff.
3. O Revisor PR comenta no GitHub com findings priorizados por severidade.
4. O Revisor PR publica um resumo operacional na issue Paperclip.

Se houver problemas relevantes:

- a issue volta para `in_progress`
- a issue e reatribuida ao Claudio para ajustes
- Claudio continua na mesma branch e no mesmo worktree

Se nao houver findings relevantes:

- a issue permanece em `in_review`
- o comentario explicita que a revisao tecnica terminou
- o proximo gate continua sendo a aprovacao humana final

### Fase 4. Aprovacao humana e encerramento

1. Humano revisa o PR no GitHub.
2. Se aprovar, humano faz merge.
3. A issue vai para `done`.
4. O worktree local e removido.
5. O executor roda `git worktree prune`.
6. O encerramento e registrado no ticket.

## Regras de Status

### Quando usar `blocked`

Use `blocked` quando existir um impedimento objetivo, por exemplo:

- dependencia externa indisponivel
- permissao ausente
- conflito de escopo ou prioridade sem decisao
- falha de ambiente sem contorno seguro

Nao use `blocked` para:

- feedback normal de review
- trabalho ainda em andamento
- espera por merge de PR ja aberto

### Quando usar `in_review`

Use `in_review` quando:

- o PR ja foi aberto
- o handoff do Claudio foi publicado
- a implementacao principal terminou
- o proximo passo depende de revisao tecnica e/ou aprovacao humana

Se o Revisor PR ou o humano pedirem ajustes, volte a issue para `in_progress`.

### Quando usar `done`

Use `done` somente quando:

- o PR foi aprovado e mergeado
- nao ha mais trabalho pendente naquela issue
- o comentario final registra o encerramento
- o cleanup local do worktree foi concluido ou delegado explicitamente

## Checklist Minimo de Saida do Claudio

Antes de mover a issue para `in_review`, confirme:

- branch oficial criada ou reutilizada
- worktree oficial criado ou reutilizado
- mudanca implementada inteiramente dentro do worktree
- validacoes executadas e registradas
- riscos conhecidos descritos
- rollback descrito
- PR aberto em draft, salvo excecao deliberada
- comentario de handoff publicado na issue do Paperclip

## Checklist Minimo de Revisao do Revisor PR

Antes de encerrar sua revisao, confirme:

- objetivo da issue entendido
- diff do PR lido com foco em comportamento e risco
- findings priorizados por severidade
- cobertura de testes e validacoes avaliadas
- comentario publicado no GitHub
- resumo operacional publicado no Paperclip com PR, resultado da rodada, findings ou ausencia deles e evidencia curta de validacao
- recomendacao de proximo estado registrada: `in_progress` ou permanencia em `in_review`
- aprovacao humana final explicitamente preservada

## Template de Comentario do Claudio na Issue

Copie e preencha este template ao abrir ou atualizar o PR:

```md
## Handoff para revisao

- Worktree: `paperclip/<ticket>-<slug>`
- Branch: `<ticket>-<slug>`
- Resumo do que mudou:
  - `<mudanca 1>`
  - `<mudanca 2>`
- Validacoes executadas:
  - `<comando 1>`
  - `<comando 2>`
- Riscos conhecidos:
  - `<risco ou "nenhum risco adicional relevante">`
- Rollback:
  - `<como reverter>`
- PR:
  - `<url do PR>`
```

## Template de Comentario do Revisor PR no GitHub

```md
## Review Summary

- Status: `<changes requested | comments | sem findings relevantes>`
- Findings principais:
  - `<finding 1>`
  - `<finding 2>`
- Testes / validacoes observados:
  - `<observacao>`
- Recomendacao:
  - `<voltar para implementacao | seguir para aprovacao humana final>`
```

## Template de Comentario do Revisor PR na Issue

```md
## Revisao tecnica

- PR: `<url do PR>`
- Status da revisao: `<com findings | sem findings relevantes>`
- Findings principais:
  - `<finding ou "nenhum finding bloqueante">`
- Findings nao bloqueantes:
  - `<finding ou "nenhum finding nao bloqueante">`
- Validacao observada:
  - `<comando, check ou evidencia curta usada nesta rodada>`
- Recomendacao operacional:
  - `<retornar para in_progress com Claudio | manter in_review para aprovacao humana final>`
```

## Comandos Base

### Criar worktree para branch nova

```bash
mkdir -p paperclip
git fetch origin
git worktree add -b tcn-30-claudio-reviewer-flow paperclip/tcn-30-claudio-reviewer-flow origin/main
```

### Reusar branch existente

```bash
mkdir -p paperclip
git fetch origin
git worktree add paperclip/tcn-30-claudio-reviewer-flow tcn-30-claudio-reviewer-flow
```

### Listar worktrees

```bash
git worktree list
```

### Encerrar worktree depois do merge

```bash
git worktree remove paperclip/tcn-30-claudio-reviewer-flow
git worktree prune
```

## Resolucao de Conflitos em PRs

Quando uma PR mostra conflitos (status `DIRTY` ou `CONFLICTING`):

### Procedimento Padrao

1. **Identificar a PR com conflitos**
   ```bash
   gh pr list --state open
   # ou verificar status de uma PR especifica
   gh pr view <numero> --json mergeStateStatus
   ```

2. **Acessar o worktree da branch da PR**
   ```bash
   cd paperclip/<ticket>-<slug>
   ```

3. **Buscar e fazer merge da main**
   ```bash
   git fetch origin main
   git merge origin/main
   ```

4. **Resolver conflitos**
   - Editar os arquivos com conflito
   - Remover marcadores `<<<<<<<`, `=======`, `>>>>>>>`
   - Manter ambas as funcionalidades quando aplicável (ou decidir qual prevalece)

5. **Commitar e fazer push**
   ```bash
   git add -A
   git commit -m "Resolve merge conflict: <descricao>"
   git push origin paperclip/<ticket>-<slug>
   ```

6. **Verificar se a PR ficou mergeavel**
   ```bash
   gh pr view <numero> --json mergeStateStatus,mergeable
   ```

### Regras de Resolucao

- **Manter ambas as funcionalidades** quando o conflito for entre funcionalidades compatíveis (ex.: novo parametro + paginação)
- **Preferir código da main** quando houver duplicação de lógica
- **Documentar no commit** o que foi decidido e por quê
- Se houver dúvida sobre qual código prevalecer, **perguntar ao Coordenador** antes de decidir

### Quando Escalar

- Conflito envolve lógica crítica (auth, RLS, financeiro)
- Não é claro qual código deve prevalecer
- Conflito requer mudança de arquitetura

## Template Minimo de PR

O template oficial do repositorio fica em `.github/pull_request_template.md` e deve cobrir:

- contexto
- escopo
- origem da mudanca
- worktree e branch
- testes e validacoes
- riscos conhecidos
- rollback
- confirmacao de revisao humana obrigatoria

## Enforcement Tecnico Recomendado no GitHub

Configuracao minima recomendada para `main`:

- exigir Pull Request antes de merge
- bloquear push direto
- exigir pelo menos 1 approval humano
- descartar approvals obsoletos quando o branch receber novos commits
- exigir resolucao de todas as conversas
- exigir checks obrigatorios:
  - `PR Checks / Lint, Type Check, Test & Build`
  - `CI Tests / Run Tests`
  - `Security Scans / SAST (Static Analysis)`

Configuracao adicional recomendada para mudancas sensiveis:

- `CODEOWNERS` para caminhos de seguranca, auth, migrations, RLS, deploy e automacoes
- 2 approvals para areas sensiveis
- environments protegidos para jobs com secrets e deploy

## Adocao Incremental

1. Tornar esta politica a referencia oficial no onboarding e no `AGENTS.md`.
2. Exigir o template de PR em toda entrega nova.
3. Exigir o template de handoff do Claudio ao mover para `in_review`.
4. Exigir o template de resumo do Revisor PR quando houver revisao tecnica dedicada.
5. Exigir evidencia minima no fechamento do Revisor PR: PR, resultado da rodada, findings ou ausencia deles e validacao curta.
6. Manter o merge final como responsabilidade humana.

## Observacoes

- No Paperclip, fluxos com handoff automatico para revisao tecnica exigem que o board configure `technicalReviewerReference` (UUID do agente Revisor PR na company). Sem isso, issues podem permanecer no implementador apos handoff. Ver tambem `docs/DEVELOPER_ONBOARDING.md` (Fluxo oficial com agentes).
- `paperclip/` esta no `.gitignore` para evitar ruido local de worktrees no repositorio principal.
- `git worktree` reutiliza o mesmo `.git` do repositorio principal; nao e um clone separado.
- Revisao tecnica por agente existe para reduzir risco e acelerar feedback, nao para substituir decisao humana final.
