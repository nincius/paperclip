import {
  ISSUE_ACTIVE_STATUSES,
  ISSUE_BACKLOG_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  ISSUE_TERMINAL_STATUSES,
  type IssueStatus,
} from "@paperclipai/shared";

export const issueStatusOrder: IssueStatus[] = [
  "in_progress",
  "claimed",
  "todo",
  "backlog",
  "handoff_ready",
  "technical_review",
  "changes_requested",
  "human_review",
  "blocked",
  "done",
  "cancelled",
];

export const issueBoardStatuses: IssueStatus[] = [
  "backlog",
  "todo",
  "claimed",
  "in_progress",
  "handoff_ready",
  "technical_review",
  "changes_requested",
  "human_review",
  "blocked",
  "done",
  "cancelled",
];

export const issueFilterGroups = [
  { label: "Active", statuses: [...ISSUE_ACTIVE_STATUSES] },
  { label: "Backlog", statuses: [...ISSUE_BACKLOG_STATUSES] },
  { label: "Done", statuses: [...ISSUE_TERMINAL_STATUSES] },
] as const;

export const inboxIssueStatuses: readonly Exclude<IssueStatus, "cancelled">[] = ISSUE_STATUSES.filter(
  (status): status is Exclude<IssueStatus, "cancelled"> => status !== "cancelled",
);

export const issueCreateStatuses: IssueStatus[] = [...ISSUE_STATUSES];

export function issueStatusLabel(status: string): string {
  return ISSUE_STATUS_LABELS[status as IssueStatus] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
