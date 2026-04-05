-- Rebuild partial unique indexes so their `status IN (...)` matches the shared `OPEN_ISSUE_STATUSES` list
-- (no semantic change while the list is unchanged). Uses CONCURRENTLY to avoid long write locks.

create unique index concurrently if not exists "tmp_issues_open_routine_execution_uq_0048"
  on "issues" ("company_id", "origin_kind", "origin_id")
  where "origin_kind" = 'routine_execution'
    and "origin_id" is not null
    and "hidden_at" is null
    and "execution_run_id" is not null
    and "status" in (
      'backlog',
      'todo',
      'claimed',
      'in_progress',
      'handoff_ready',
      'technical_review',
      'changes_requested',
      'human_review',
      'blocked'
    );
--> statement-breakpoint

drop index concurrently if exists "issues_open_routine_execution_uq";
--> statement-breakpoint

alter index "tmp_issues_open_routine_execution_uq_0048" rename to "issues_open_routine_execution_uq";
--> statement-breakpoint

create unique index concurrently if not exists "tmp_issues_open_agent_health_alert_uq_0048"
  on "issues" ("company_id", "origin_id")
  where
    "origin_kind" = 'agent_health_alert'
    and "origin_id" is not null
    and "hidden_at" is null
    and "status" in (
      'backlog',
      'todo',
      'claimed',
      'in_progress',
      'handoff_ready',
      'technical_review',
      'changes_requested',
      'human_review',
      'blocked'
    );
--> statement-breakpoint

drop index concurrently if exists "issues_open_agent_health_alert_uq";
--> statement-breakpoint

alter index "tmp_issues_open_agent_health_alert_uq_0048" rename to "issues_open_agent_health_alert_uq";
