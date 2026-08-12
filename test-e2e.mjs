import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "node:path";
import * as fs from "node:fs";

const workdir = process.argv[2];
if (!workdir) {
  console.error("usage: node test-e2e.mjs <workdir>");
  process.exit(1);
}
fs.mkdirSync(workdir, { recursive: true });
fs.rmSync(path.join(workdir, ".cooltest"), { recursive: true, force: true });

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.resolve(new URL(".", import.meta.url).pathname, "dist/index.js")],
  cwd: workdir,
  env: { ...process.env, IN_COOLTEST_E2E: "1" },
});
const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(transport);

async function call(name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  const txt = r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  return JSON.parse(txt);
}
function log(label, v) {
  console.log(`[${label}]`, JSON.stringify(v));
}

// 1. init
const init = await call("cooltest_init_suite", { source: "https://example.com/cases/login", name: "login" });
log("init", { status: init.status, filePath: init.filePath });

// 2. append a case (id unknown)
const created = await call("cooltest_update_case", {
  title: "Valid credentials can log in",
  steps: ["Open the login page", "Enter the account", "Click log in"],
  expected: "Enter the dashboard",
  priority: "P1",
  status: "pending",
});
log("append", created);

// 3. list cases
const listed = await call("cooltest_list_cases", { suite: "login" });
log("list", listed);

const cid = listed.cases[0].id;

// 4. get case
const got = await call("cooltest_get_case", { suite: "login", id: cid });
log("get", { id: got.case.id, title: got.case.title, steps: got.case.steps.length });

// 5. update status -> passed with evidence
const upd = await call("cooltest_update_case", { suite: "login", id: cid, status: "passed", notes: "ok", evidence: ["/artifacts/x.png"], lastRunAt: new Date().toISOString() });
log("update", upd);

// 6. stats
const stats = await call("cooltest_get_stats", { suite: "login" });
log("stats", stats);

// 7. list suites
const suites = await call("cooltest_list_suites", {});
log("suites", suites);

// 8. init again without overwrite -> skipped
const again = await call("cooltest_init_suite", { source: "x", name: "login" });
log("init-again", { status: again.status });

// 9. open report
const rep = await call("cooltest_open_report", { suite: "login", port: 8977 });
log("report", rep);

await client.close();
console.log("E2E_DONE");
