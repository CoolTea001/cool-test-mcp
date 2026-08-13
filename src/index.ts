#!/usr/bin/env node
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CoolTestStore } from "./store.js";
import { CASE_STATUSES, CaseStatus, CaseItem } from "./types.js";
import { startReportServer } from "./report.js";

export class CoolTestMcpServer {
  private server: Server;
  private store: CoolTestStore;

  constructor(root: string | undefined, instructions: string) {
    this.store = new CoolTestStore(root);
    this.server = new Server(
      {
        name: "cool-test-mcp",
        version: "0.2.0",
      },
      {
        capabilities: {
          tools: {},
        },
        instructions,
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
          name: "cooltest_append_cases",
          description: "Append one or more new cases to a suite in a single batch (second step of the flow, used for \"Use Cool Test for\"). Pass the full field set for every case. Each case is a separate logical scenario with its own expected result; never merge independent checks into one case.",
          inputSchema: {
            type: "object",
            properties: {
              suite: { type: "string", description: "Suite name or filePath; defaults to the current suite" },
              cases: {
                type: "array",
                description: "Cases to append",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Case title, required" },
                    description: { type: "string", description: "Case description" },
                    steps: { type: "array", items: { type: "string" }, description: "Ordered atomic UI steps to reach the expected result" },
                    expected: { type: "string", description: "Expected result, required" },
                    priority: { type: "string", description: "Priority, e.g. P1" },
                    tags: { type: "array", items: { type: "string" }, description: "Tags" },
                    notes: { type: "string", description: "Notes" },
                  },
                  required: ["title", "expected"],
                },
              },
            },
            required: ["cases"],
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
          description: "Update an existing case's status/notes/evidence/lastRunAt after testing. When status is set to passed or failed, lastRunAt is auto-recorded to now unless you pass it explicitly. Set status to review with a required notes reason when a case cannot be tested or judged. To add new cases use cooltest_append_cases instead.",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Case id, required" },
              suite: { type: "string", description: "Suite name or filePath; defaults to the current suite" },
              status: { type: "string", enum: CASE_STATUSES, description: "New status" },
              notes: { type: "string", description: "Notes (overwrites)" },
              evidence: { type: "array", items: { type: "string" }, description: "Additional evidence relative paths" },
              lastRunAt: { type: "string", description: "Test timestamp, ISO string" },
            },
            required: ["id"],
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
        if (!id) throw new Error("id is required");
        const suiteName = await this.store.resolveSuite(args.suite ? text(args.suite) : undefined);
        const existing = await this.store.getCase(suiteName, id);
        if (!existing) throw new Error(`case ${id} not found; use cooltest_append_cases to add new cases`);
        const patch: { status?: CaseStatus; notes?: string; evidence?: string[]; lastRunAt?: string } = {};
        if (args.status) patch.status = text(args.status) as CaseStatus;
        if (args.notes !== undefined) patch.notes = text(args.notes);
        if (Array.isArray(args.evidence)) patch.evidence = args.evidence.map(String);
        if (args.lastRunAt !== undefined) {
          patch.lastRunAt = text(args.lastRunAt);
        } else if (patch.status === "passed" || patch.status === "failed") {
          patch.lastRunAt = new Date().toISOString();
        }
        const item = await this.store.updateCase(suiteName, id, patch);
        return this.ok({ id, status: item?.status, updated: true });
      }
      case "cooltest_append_cases": {
        const suiteName = await this.store.resolveSuite(args.suite ? text(args.suite) : undefined);
        if (!Array.isArray(args.cases) || args.cases.length === 0) throw new Error("cases is required and must be a non-empty array");
        const items: Omit<CaseItem, "id">[] = args.cases.map((raw) => {
          const c = raw as Record<string, unknown>;
          const title = text(c.title);
          if (!title) throw new Error("each case requires a title");
          const expected = text(c.expected);
          if (!expected) throw new Error(`case "${title}" requires an expected result`);
          return {
            title,
            description: text(c.description),
            steps: Array.isArray(c.steps) ? c.steps.map(String) : [],
            expected,
            status: "pending",
            priority: text(c.priority) || "P1",
            tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
            notes: text(c.notes),
            lastRunAt: null,
            evidence: [],
          };
        });
        const result = await this.store.appendCases(suiteName, items);
        return this.ok({ ids: result.ids, caseCount: result.caseCount, appended: items.length });
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
  const instructionsFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "instructions.md");
  const instructions = await fs.readFile(instructionsFile, "utf-8");
  const server = new CoolTestMcpServer(process.cwd(), instructions);
  await server.start();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
