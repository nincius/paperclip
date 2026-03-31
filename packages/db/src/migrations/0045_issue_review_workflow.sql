update "issues"
set "status" = 'handoff_ready',
    "updated_at" = now()
where "status" = 'in_review';
--> statement-breakpoint

drop index if exists "issues_open_routine_execution_uq";
--> statement-breakpoint

create unique index "issues_open_routine_execution_uq"
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
