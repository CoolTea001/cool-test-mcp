import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CoolTestStore } from "./store.js";
import { CASE_STATUSES, CaseStatus, CaseItem, CoolTestSuite } from "./types.js";
import { startReportServer } from "./report.js";

const INSTRUCTIONS = `# Cool Test MCP

You are an automated testing assistant. Users trigger the full test flow with "Use Cool Test for [test case address]" and view the report with "Use Cool Test to view [address]".

## Flow (Use Cool Test for)

1. **Capability check** (before conversion): inspect your own MCP tool list. You have automated testing capability if any whitelist entry matches:
   - Tool/MCP names containing playwright, puppeteer, or a browser_ prefix
   - Action words: navigate/click/fill/type/screenshot/snapshot/wait_for/hover/select_option or other browser automation actions
   - If missing: tell the user they need to configure Playwright MCP (e.g. npx @playwright/mcp), provide a config example, and ask whether they still want to convert
2. **Convert**: call cooltest_init_suite (source=test case address, name optional). If it returns skipped, the suite exists — confirm whether to overwrite.
3. **Test case by case**: cooltest_list_cases for summaries → skip non-pending → cooltest_get_case for full content → execute steps with your browser tools → judge against expected:
   - Match → cooltest_update_case status=passed
   - No match → failed (fail once, no retry; save a screenshot into evidence)
   - Cannot test / cannot judge (execution interrupted / result uncertain / dependency missing / out of capability) → review, notes must state the reason
4. **Wrap up**: cooltest_get_stats → cooltest_open_report

## Read-only (Use Cool Test to view)

Open the report page: cooltest_open_report (suite optional). Use cooltest_get_case for a single case's details.

## Notes

- Always read/write cases through the tools; never edit the .cooltest JSON file directly.
- When appending test cases without an id, add them one by one with cooltest_update_case before running.
- If the flow creates a .cooltest directory in the user's project, make sure to add it to the project's .gitignore so it is never committed.`;

export class CoolTestMcpServer {
  private server: Server;
  private store: CoolTestStore;

  constructor(root?: string) {
    this.store = new CoolTestStore(root);
    this.server = new Server(
      {
        name: "cool-test-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
        instructions: INSTRUCTIONS,
      }
    );
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "cooltest_init_suite",
          description: "Generate a .cooltest JSON from a test case source (first step of the flow, used for \"Use Cool Test for\"). Does not overwrite an existing suite by default; returns skipped. Set overwrite=true to rebuild. Call this to create the suite, then append cases with cooltest_update_case.",
          inputSchema: {
            type: "object",
            properties: {
              source: { type: "string", description: "Test case source (URL or path), required" },
              name: { type: "string", description: "Suite name; defaults to the source name" },
              overwrite: { type: "boolean", description: "Whether to overwrite if it exists; default false" },
            },
            required: ["source"],
          },
        },
        {
          name: "cooltest_list_suites",
          description: "List existing suites under the project root .cooltest (name/filePath/caseCount/updatedAt). Call first to see which suites exist when working with multiple suites.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "cooltest_list_cases",
          description: "List case summaries for a suite (id/title/status/priority), without steps/evidence to save tokens. Call before testing to get an overview.",
          inputSchema: {
            type: "object",
            properties: {
              suite: { type: "string", description: "Suite name or filePath; defaults to the current suite" },
              status: { type: "string", enum: CASE_STATUSES, description: "Filter by status" },
            },
          },
        },
        {
          name: "cooltest_get_case",
          description: "Read a single case's full content (including steps/expected/evidence). Use by id when testing case by case.",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Case id, required" },
              suite: { type: "string", description: "Suite name or filePath; defaults to the current suite" },
            },
            required: ["id"],
          },
        },
        {
          name: "cooltest_update_case",
          description: "Update a case's status/notes/evidence/lastRunAt. Write back results after testing; set status to review with a required notes reason when a case cannot be tested or judged. Also used to append new cases after init (provide the full field set each time).",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Case id, required; for a new case (appended after init) any unused id works" },
              suite: { type: "string", description: "Suite name or filePath; defaults to the current suite" },
              status: { type: "string", enum: CASE_STATUSES, description: "New status" },
              notes: { type: "string", description: "Notes (overwrites)" },
              evidence: { type: "array", items: { type: "string" }, description: "Additional evidence relative paths" },
              lastRunAt: { type: "string", description: "Test timestamp, ISO string" },
              title: { type: "string", description: "Case title (when adding a new case)" },
              description: { type: "string", description: "Case description (when adding a new case)" },
              steps: { type: "array", items: { type: "string" }, description: "Test steps (when adding a new case)" },
              expected: { type: "string", description: "Expected result (when adding a new case)" },
              priority: { type: "string", description: "Priority (when adding a new case, e.g. P1)" },
              tags: { type: "array", items: { type: "string" }, description: "Tags (when adding a new case)" },
            },
          },
        },
        {
          name: "cooltest_get_stats",
          description: "Suite status statistics (total/passed/failed/review/pending). Use to report progress after testing.",
          inputSchema: {
            type: "object",
            properties: {
              suite: { type: "string", description: "Suite name or filePath; defaults to the current suite" },
            },
          },
        },
        {
          name: "cooltest_open_report",
          description: "Start the local report server (zero-dependency Node single script) and open the visual report page in a browser. Call after testing finishes. Returns the url and port.",
          inputSchema: {
            type: "object",
            properties: {
              suite: { type: "string", description: "Suite name or filePath; defaults to the current suite" },
              port: { type: "number", description: "Specific port; defaults to a random free port" },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        return await this.handleTool(name, (args ?? {}) as Record<string, unknown>);
      } catch (err) {
        return {
          content: [{ type: "text", text: `ERROR: ${(err as Error).message}` }],
          isError: true,
        };
      }
    });
  }

  private async handleTool(name: string, args: Record<string, unknown>) {
    const text = (v: unknown): string => (v === undefined ? "" : String(v));
    const bool = (v: unknown, d = false): boolean => (v === undefined ? d : Boolean(v));

    switch (name) {
      case "cooltest_init_suite": {
        const source = text(args.source);
        if (!source) throw new Error("source is required");
        const name = text(args.name) || pathBase(source);
        const overwrite = bool(args.overwrite);
        const result = await this.store.createSuite(name, source, overwrite);
        return this.ok({ ...result, hint: this.capabilityHint() });
      }
      case "cooltest_list_suites": {
        const suites = await this.store.listSuites();
        return this.ok({ suites });
      }
      case "cooltest_list_cases": {
        const suiteName = await this.store.resolveSuite(args.suite ? text(args.suite) : undefined);
        const status = args.status ? (text(args.status) as CaseStatus) : undefined;
        const cases = await this.store.listCases(suiteName, status);
        return this.ok({ cases });
      }
      case "cooltest_get_case": {
        const id = text(args.id);
        if (!id) throw new Error("id is required");
        const suiteName = await this.store.resolveSuite(args.suite ? text(args.suite) : undefined);
        const item = await this.store.getCase(suiteName, id);
        if (!item) throw new Error(`case ${id} not found`);
        return this.ok({ case: item });
      }
      case "cooltest_update_case": {
        const id = text(args.id);
        const suiteName = await this.store.resolveSuite(args.suite ? text(args.suite) : undefined);
        const existing = id ? await this.store.getCase(suiteName, id) : null;
        if (existing) {
          const patch: { status?: CaseStatus; notes?: string; evidence?: string[]; lastRunAt?: string } = {};
          if (args.status) patch.status = text(args.status) as CaseStatus;
          if (args.notes !== undefined) patch.notes = text(args.notes);
          if (Array.isArray(args.evidence)) patch.evidence = args.evidence.map(String);
          if (args.lastRunAt !== undefined) patch.lastRunAt = text(args.lastRunAt);
          const item = await this.store.updateCase(suiteName, id, patch);
          return this.ok({ id, status: item?.status, updated: true });
        }
        const item: Omit<CaseItem, "id"> = {
          title: text(args.title) || id,
          description: text(args.description),
          steps: Array.isArray(args.steps) ? args.steps.map(String) : [],
          expected: text(args.expected),
          status: (text(args.status) as CaseStatus) || "pending",
          priority: text(args.priority) || "P1",
          tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
          notes: text(args.notes),
          lastRunAt: args.lastRunAt !== undefined ? text(args.lastRunAt) : null,
          evidence: Array.isArray(args.evidence) ? args.evidence.map(String) : [],
        };
        const result = await this.store.appendCases(suiteName, [item]);
        return this.ok({ id: result.ids[0], status: item.status, updated: true, created: true, caseCount: result.caseCount });
      }
      case "cooltest_get_stats": {
        const suiteName = await this.store.resolveSuite(args.suite ? text(args.suite) : undefined);
        const stats = await this.store.getStats(suiteName);
        return this.ok(stats);
      }
      case "cooltest_open_report": {
        const suiteName = await this.store.resolveSuite(args.suite ? text(args.suite) : undefined);
        const absPath = await this.store.absoluteRawPath(suiteName);
        const port = args.port ? Number(args.port) : undefined;
        const { url } = await startReportServer(absPath, port);
        return this.ok({ url, opened: true });
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private capabilityHint(): string {
    return "After conversion, check whether your MCP tool list has browser automation capability (playwright/browser_* etc.). If not, prompt the user to configure Playwright MCP and ask whether to continue.";
  }

  private ok(data: object) {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

function pathBase(p: string): string {
  const cleaned = p.replace(/\/+$/, "");
  const segs = cleaned.split("/");
  return segs[segs.length - 1] || "suite";
}

async function main() {
  const server = new CoolTestMcpServer(process.env.COOLTEST_ROOT || process.cwd());
  await server.start();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
