import type { Db } from "@paperclipai/db";
import type { StorageService } from "../../storage/types.js";

/**
 * Minimal `Db` + `StorageService` for mounting `issueRoutes` in route tests where
 * `../services/index.js` is mocked and real database/storage I/O must not run.
 */
export function createIssueRoutesTestDeps(): { db: Db; storage: StorageService } {
  const db = {
    async transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn(db);
    },
  };
  const storage: StorageService = {
    provider: "local_disk",
    putFile: async () => {
      throw new Error("issueRoutes test: storage.putFile unexpectedly invoked");
    },
    getObject: async () => {
      throw new Error("issueRoutes test: storage.getObject unexpectedly invoked");
    },
    headObject: async () => ({ exists: false }),
    deleteObject: async () => {},
  };
  return { db: db as unknown as Db, storage };
}
