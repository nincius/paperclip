/**
 * Board route templates without the company prefix.
 * `Link` / `useNavigate` from `@/lib/router` apply the active company prefix.
 */
export const ROUTES = {
  AGENT_RUN: "/agents/:agentId/runs/:runId",
  APPROVAL_DETAIL: "/approvals/:approvalId",
  INBOX: "/inbox",
} as const;
