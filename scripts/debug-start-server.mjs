import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const href = pathToFileURL(path.join(root, "server/src/index.ts")).href;
console.error("import", href);
const m = await import(href);
console.error("startServer", typeof m.startServer);
await m.startServer();
console.error("returned from startServer");
