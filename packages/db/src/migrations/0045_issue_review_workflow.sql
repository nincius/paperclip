update "issues"
set "status" = 'handoff_ready',
    "updated_at" = now()
where "status" = 'in_review';
--> statement-breakpoint

create unique index concurrently "tmp_issues_open_routine_execution_uq"
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

alter index "tmp_issues_open_routine_execution_uq" rename to "issues_open_routine_execution_uq";
