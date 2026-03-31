create unique index if not exists "issues_open_agent_health_alert_uq"
  on "issues" ("company_id", "origin_kind", "origin_id")
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
