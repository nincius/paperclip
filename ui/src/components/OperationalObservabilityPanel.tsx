import {
  AlertTriangle,
  BellOff,
  Gauge,
  GitPullRequest,
  SearchX,
  TimerReset,
  Unplug,
  Wrench,
} from "lucide-react";
import type { ActivityEvent, Agent, HeartbeatRun, Issue } from "@paperclipai/shared";
import { useMemo, type ComponentType } from "react";
import { Link } from "@/lib/router";
import { issueStatusLabel } from "../lib/issue-status";
import {
  dashboardObservabilityStatusOrder,
  deriveDashboardObservability,
} from "../lib/dashboard-observability";
import { issueUrl, agentUrl, cn } from "../lib/utils";
import { timeAgo } from "../lib/timeAgo";
import { StatusBadge } from "./StatusBadge";

function SummaryTile(props: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClassName =
    props.tone === "danger"
      ? "border-red-500/20 bg-red-500/[0.06]"
      : props.tone === "warning"
        ? "border-amber-500/20 bg-amber-500/[0.06]"
        : "border-border bg-card";
  const iconClassName =
    props.tone === "danger"
      ? "text-red-400"
      : props.tone === "warning"
        ? "text-amber-400"
        : "text-muted-foreground";
  const Icon = props.icon;

  return (
    <div className={cn("rounded-xl border p-4", toneClassName)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{props.value}</div>
          <div className="mt-1 text-sm font-medium text-foreground">{props.label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{props.description}</div>
        </div>
        <Icon className={cn("mt-1 h-4 w-4 shrink-0", iconClassName)} />
      </div>
    </div>
  );
}

export function OperationalObservabilityPanel(props: {
  activity: ActivityEvent[];
  agents: Agent[];
  issues: Issue[];
  runs: HeartbeatRun[];
}) {
  const agentById = useMemo(() => new Map(props.agents.map((agent) => [agent.id, agent])), [props.agents]);
  const data = useMemo(
    () =>
      deriveDashboardObservability({
        activity: props.activity,
        agents: props.agents,
        issues: props.issues,
        runs: props.runs,
      }),
    [props.activity, props.agents, props.issues, props.runs],
  );
  const visibleStatuses = data.visibleStatuses.length > 0
    ? data.visibleStatuses
    : dashboardObservabilityStatusOrder.slice(0, 4);

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Operational Observability
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Backlog by agent and state, stalled issues, technical queue pressure, and the last useful heartbeat signal.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <SummaryTile
          icon={Gauge}
          label="Open Queue"
          value={data.summary.openCount}
          description={`${data.summary.wipCount} currently in motion`}
        />
        <SummaryTile
          icon={Wrench}
          label="Technical Queue"
          value={data.summary.technicalQueueCount}
          description="Handoff, review, or requested changes pending"
          tone={data.summary.technicalQueueCount > 0 ? "warning" : "default"}
        />
        <SummaryTile
          icon={TimerReset}
          label="Stalled >24h"
          value={data.summary.staleOver24hCount}
          description="Open issues without a fresh update in the last day"
          tone={data.summary.staleOver24hCount > 0 ? "warning" : "default"}
        />
        <SummaryTile
          icon={AlertTriangle}
          label="Adapter Alerts"
          value={data.summary.adapterAlertCount}
          description="Active adapter or runtime health alerts"
          tone={data.summary.adapterAlertCount > 0 ? "danger" : "default"}
        />
        <SummaryTile
          icon={GitPullRequest}
          label="Review Dedup (24h)"
          value={data.summary.duplicateReviewPreventionCount24h}
          description="Repeated review dispatches prevented"
        />
        <SummaryTile
          icon={BellOff}
          label="Alert Suppressions (24h)"
          value={data.summary.healthAlertReopenSuppressedCount24h}
          description="Flapping health alerts kept closed"
        />
        <SummaryTile
          icon={SearchX}
          label="Review dispatch no-ops (24h)"
          value={data.summary.reviewDispatchNoopCount24h}
          description="Missing reviewer, ambiguous name, or no PR URL on handoff"
          tone={data.summary.reviewDispatchNoopCount24h > 0 ? "warning" : "default"}
        />
        <SummaryTile
          icon={Unplug}
          label="Merge wake failures (24h)"
          value={data.summary.mergeDelegateWakeupFailedCount24h}
          description="Executor wakeup failed after approved technical review"
          tone={data.summary.mergeDelegateWakeupFailedCount24h > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <h4 className="text-sm font-semibold text-foreground">Backlog by Agent</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Status mix, WIP, last useful heartbeat, and active adapter failure signals.
            </p>
          </div>
          {data.agentRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No agents or open work yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Agent</th>
                    <th className="px-4 py-3 text-left font-medium">Open</th>
                    <th className="px-4 py-3 text-left font-medium">WIP</th>
                    <th className="px-4 py-3 text-left font-medium">Last Useful Heartbeat</th>
                    <th className="px-4 py-3 text-left font-medium">Adapter Health</th>
                    <th className="px-4 py-3 text-left font-medium">Status Mix</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentRows.map((row) => (
                    <tr key={row.key} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <div className="flex min-w-[180px] flex-col gap-1">
                          {row.agentId ? (
                            <Link to={agentUrl({ id: row.agentId, name: row.agentName })} className="font-medium">
                              {row.agentName}
                            </Link>
                          ) : (
                            <span className="font-medium">{row.agentName}</span>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {row.adapterType ? `${row.adapterType} · ${row.status ?? "unknown"}` : "Queue"}
                          </div>
                          {row.lastHeartbeatAt ? (
                            <div className="text-xs text-muted-foreground">
                              Last heartbeat {timeAgo(row.lastHeartbeatAt)}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.totalOpen}</td>
                      <td className="px-4 py-3 tabular-nums">{row.wipCount}</td>
                      <td className="px-4 py-3">
                        {row.lastUsefulHeartbeatAt ? (
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(row.lastUsefulHeartbeatAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No useful run yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.adapterAlerts.length > 0 ? (
                          <div className="flex min-w-[220px] flex-col gap-1">
                            {row.adapterAlerts.slice(0, 2).map((issue) => (
                              <Link
                                key={issue.id}
                                to={issueUrl(issue)}
                                className="text-xs text-red-400 underline underline-offset-2"
                              >
                                {issue.identifier ?? issue.id.slice(0, 8)} · {issue.title}
                              </Link>
                            ))}
                          </div>
                        ) : row.latestFailureRun ? (
                          <div className="text-xs text-amber-400">
                            Failed run {timeAgo(row.latestFailureRun.createdAt)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Healthy</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[280px] flex-wrap gap-1.5">
                          {visibleStatuses.map((status) => {
                            const count = row.statusCounts[status] ?? 0;
                            if (count === 0) return null;
                            return (
                              <span
                                key={status}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-1 text-xs"
                              >
                                <span className="font-medium">{issueStatusLabel(status)}</span>
                                <span className="tabular-nums text-muted-foreground">{count}</span>
                              </span>
                            );
                          })}
                          {visibleStatuses.every((status) => (row.statusCounts[status] ?? 0) === 0) ? (
                            <span className="text-xs text-muted-foreground">No open work</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-3">
              <h4 className="text-sm font-semibold text-foreground">Technical Queue Pending</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Oldest items waiting on the technical review lane.
              </p>
            </div>
            <div className="divide-y divide-border">
              {data.technicalQueue.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No pending technical queue.</div>
              ) : (
                data.technicalQueue.slice(0, 8).map((issue) => (
                  <Link
                    key={issue.id}
                    to={issueUrl(issue)}
                    className="block px-4 py-3 no-underline transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-muted-foreground">
                          {issue.identifier ?? issue.id.slice(0, 8)}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm font-medium">{issue.title}</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {issue.assigneeAgentId
                            ? agentById.get(issue.assigneeAgentId)?.name ?? "Assigned"
                            : "Unassigned"}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge status={issue.status} />
                        <span className="text-xs text-muted-foreground">{timeAgo(issue.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-3">
              <h4 className="text-sm font-semibold text-foreground">Adapter Failures</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Active environment or runtime divergence alerts surfaced by the health monitor.
              </p>
            </div>
            <div className="divide-y divide-border">
              {data.adapterAlerts.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No active adapter alerts.</div>
              ) : (
                data.adapterAlerts.slice(0, 6).map((issue) => {
                  const affectedAgentId = issue.originId?.match(/^agent:([^:]+):health:/)?.[1] ?? null;
                  const affectedAgent = affectedAgentId ? agentById.get(affectedAgentId) : null;
                  return (
                    <Link
                      key={issue.id}
                      to={issueUrl(issue)}
                      className="block px-4 py-3 no-underline transition-colors hover:bg-accent/40"
                    >
                      <div className="text-xs font-mono text-muted-foreground">
                        {issue.identifier ?? issue.id.slice(0, 8)}
                      </div>
                      <div className="mt-1 text-sm font-medium">{issue.title}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{affectedAgent?.name ?? "Unknown agent"}</span>
                        <span>&middot;</span>
                        <span>{timeAgo(issue.updatedAt)}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">Open work (oldest update first)</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Open work ordered by oldest update first, so hidden queue age is visible without reading run logs.
          </p>
        </div>
        <div className="divide-y divide-border">
          {data.openIssuesByUpdateTime.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No open issues.</div>
          ) : (
            data.openIssuesByUpdateTime.slice(0, 10).map((issue) => (
              <Link
                key={issue.id}
                to={issueUrl(issue)}
                className="block px-4 py-3 no-underline transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-muted-foreground">
                      {issue.identifier ?? issue.id.slice(0, 8)}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm font-medium">{issue.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {issue.assigneeAgentId
                          ? agentById.get(issue.assigneeAgentId)?.name ?? "Assigned"
                          : "Unassigned"}
                      </span>
                      <span>&middot;</span>
                      <span>{timeAgo(issue.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={issue.status} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
