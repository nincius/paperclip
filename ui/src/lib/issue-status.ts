import { ISSUE_ACTIVE_STATUSES, ISSUE_STATUS_LABELS, ISSUE_STATUSES, type IssueStatus } from "@paperclipai/shared";

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
  { label: "Backlog", statuses: ["backlog"] },
  { label: "Done", statuses: ["done", "cancelled"] },
] as const;

export const inboxIssueStatuses = [
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
] as const satisfies readonly IssueStatus[];

export const issueCreateStatuses: IssueStatus[] = [...ISSUE_STATUSES];

export function issueStatusLabel(status: string): string {
  return ISSUE_STATUS_LABELS[status as IssueStatus] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
