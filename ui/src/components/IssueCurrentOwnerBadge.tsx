import type { Issue } from "@paperclipai/shared";
import { formatAssigneeUserLabel } from "../lib/assignees";
import { cn } from "../lib/utils";

function fallbackAgentLabel(agentId: string | null | undefined) {
  if (!agentId) return "Agent";
  return agentId.slice(0, 8);
}

function rolePrefix(issue: Issue) {
  const role = issue.currentOwner?.role;
  if (role === "technical_reviewer") return "Review";
  if (role === "human_reviewer") return "Human";
  if (role === "queue") return "Queue";
  return "Now";
}

function ownerLabel(
  issue: Issue,
  agentName: ((agentId: string) => string | null | undefined) | undefined,
  currentUserId: string | null | undefined,
) {
  const owner = issue.currentOwner;
  if (!owner) return null;
  if (owner.actorType === "agent") {
    return agentName?.(owner.agentId ?? "") ?? fallbackAgentLabel(owner.agentId);
  }
  if (owner.actorType === "user") {
    return formatAssigneeUserLabel(owner.userId, currentUserId) ?? owner.label;
  }
  return owner.label;
}

interface IssueCurrentOwnerBadgeProps {
  issue: Issue;
  agentName?: (agentId: string) => string | null | undefined;
  currentUserId?: string | null;
  className?: string;
  showRole?: boolean;
}

export function IssueCurrentOwnerBadge({
  issue,
  agentName,
  currentUserId,
  className,
  showRole = true,
}: IssueCurrentOwnerBadgeProps) {
  const label = ownerLabel(issue, agentName, currentUserId);
  if (!issue.currentOwner || !label) return null;

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {showRole ? (
        <span className="shrink-0 uppercase tracking-wide text-[9px] text-muted-foreground/80">
          {rolePrefix(issue)}
        </span>
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
