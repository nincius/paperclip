create index concurrently if not exists "issues_agent_health_alert_historical_lookup_idx"
  on "issues" ("updated_at")
  where
    "origin_kind" = 'agent_health_alert'
    and "hidden_at" is null;
