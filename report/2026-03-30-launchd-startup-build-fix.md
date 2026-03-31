# Launchd Startup Build Fix

The macOS `launchd` service for the local Paperclip instance failed after passing `paperclipai doctor`.

Observed runtime symptom:

- `launchctl` kept the job in `spawn scheduled`
- the process exited with code `1`
- stderr showed:
  - `Cannot find module '/Users/nincius/paperclip/server/node_modules/@paperclipai/plugin-sdk/dist/index.js'`

Root cause:

- the repo had not been built fully for service mode
- attempting `npx pnpm build` exposed a TypeScript export regression in `@paperclipai/shared`
- `packages/shared/src/index.ts` re-exported the following types, but `packages/shared/src/types/index.ts` did not:
  - `IssueCurrentOwner`
  - `IssueCurrentOwnerActorType`
  - `IssueCurrentOwnerRole`
  - `HeartbeatRunOperationalEffect`
  - `HeartbeatRunOperationalEffectCounts`

Implemented fix:

- restored the missing type re-exports in:
  - `packages/shared/src/types/index.ts`
- normalized agent bootstrap adapter config before environment validation:
  - `server/src/routes/agents.ts`
- made heartbeat run lookups return the enriched run shape with `operationalEffect`:
  - `server/src/services/heartbeat.ts`
- hardened review-dispatch issue link helpers so nullable identifiers fail explicitly instead of breaking typecheck:
  - `server/src/services/review-dispatch.ts`

Expected outcome:

- `@paperclipai/shared` builds cleanly again
- repo build can proceed to generate downstream artifacts such as `@paperclipai/plugin-sdk/dist/index.js`
- the local `launchd` job can start the Paperclip server successfully after rebuild

Recommended verification:

- `npx pnpm build`
- `launchctl kickstart -k gui/$(id -u)/io.paperclip.local`
- `curl http://127.0.0.1:3100/api/health`
