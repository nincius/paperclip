-- Hide duplicate open agent_health_alert issues per (company_id, origin_id) so the partial unique index can be created.
update "issues" i
set
  "hidden_at" = now(),
  "updated_at" = now()
from (
  select "id"
  from (
    select
      "id",
      row_number() over (
        partition by "company_id", "origin_id"
        order by "updated_at" desc nulls last, "created_at" desc
      ) as rn
    from "issues"
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
      )
  ) ranked
  where ranked.rn > 1
) dupes
where i."id" = dupes."id";
--> statement-breakpoint

create unique index concurrently if not exists "issues_open_agent_health_alert_uq"
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
