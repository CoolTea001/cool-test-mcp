import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  CoolTestSuite,
  SuiteMeta,
  CaseItem,
  CaseSummary,
  SuiteStats,
  CaseStatus,
  newEmptySuite,
} from "./types.js";

export const COOLTEST_DIR = ".cooltest";

export class CoolTestStore {
  private root: string;
  private dir: string;

  constructor(root?: string) {
    this.root = root ?? process.cwd();
    this.dir = path.join(this.root, COOLTEST_DIR);
  }

  private fileFor(name: string): string {
    const noExt = name.replace(/\.[^./\\]+$/, "");
    const safe =
      noExt
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "suite";
    return path.join(this.dir, `${safe}.json`);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async listSuites(): Promise<{ name: string; filePath: string; caseCount: number; updatedAt: string }[]> {
    await this.init();
    let entries: string[];
    try {
      entries = await fs.readdir(this.dir);
    } catch {
      return [];
    }
    const out: { name: string; filePath: string; caseCount: number; updatedAt: string }[] = [];
    for (const f of entries) {
      if (!f.endsWith(".json")) continue;
      try {
        const suite = await this.readFile(path.join(this.dir, f));
        out.push({
          name: suite.suite.name,
          filePath: path.join(COOLTEST_DIR, f),
          caseCount: suite.cases.length,
          updatedAt: suite.suite.updatedAt,
        });
      } catch {
        // skip unreadable
      }
    }
    return out;
  }

  async createSuite(name: string, source: string, overwrite: boolean): Promise<{ suite: SuiteMeta; caseCount: number; filePath: string; status: "created" | "skipped" | "overwritten" }> {
    await this.init();
    const file = this.fileFor(name);
    const exists = await this.exists(file);
    if (exists && !overwrite) {
      const existing = await this.readFile(file);
      return {
        suite: existing.suite,
        caseCount: existing.cases.length,
        filePath: path.join(COOLTEST_DIR, path.basename(file)),
        status: "skipped",
      };
    }
    if (exists && overwrite) {
      const suite = newEmptySuite(name, source);
      await this.writeFile(file, suite);
      return {
        suite: suite.suite,
        caseCount: 0,
        filePath: path.join(COOLTEST_DIR, path.basename(file)),
        status: "overwritten",
      };
    }
    const suite = newEmptySuite(name, source);
    await this.writeFile(file, suite);
    return {
      suite: suite.suite,
      caseCount: 0,
      filePath: path.join(COOLTEST_DIR, path.basename(file)),
      status: "created",
    };
  }

  async appendCases(name: string, cases: Omit<CaseItem, "id">[]): Promise<{ suite: SuiteMeta; caseCount: number; filePath: string; ids: string[] }> {
    const file = this.fileFor(name);
    const suite = await this.readFile(file);
    const start = suite.cases.length + 1;
    const ids: string[] = [];
    for (let i = 0; i < cases.length; i++) {
      const item = cases[i];
      const id = `CASE-${String(start + i).padStart(3, "0")}`;
      ids.push(id);
      suite.cases.push({
        ...item,
        id,
      });
    }
    suite.suite.updatedAt = new Date().toISOString();
    await this.writeFile(file, suite);
    return {
      suite: suite.suite,
      caseCount: suite.cases.length,
      filePath: path.join(COOLTEST_DIR, path.basename(file)),
      ids,
    };
  }

  async listCases(name: string, status?: CaseStatus): Promise<CaseSummary[]> {
    const suite = await this.loadSuite(name);
    return suite.cases
      .filter((c) => !status || c.status === status)
      .map((c) => ({ id: c.id, title: c.title, status: c.status, priority: c.priority }));
  }

  async getCase(name: string, id: string): Promise<CaseItem | null> {
    const suite = await this.loadSuite(name);
    return suite.cases.find((c) => c.id === id) ?? null;
  }

  async updateCase(
    name: string,
    id: string,
    patch: { status?: CaseStatus; notes?: string; evidence?: string[]; lastRunAt?: string }
  ): Promise<CaseItem | null> {
    const file = this.fileFor(name);
    const suite = await this.readFile(file);
    const item = suite.cases.find((c) => c.id === id);
    if (!item) return null;
    if (patch.status !== undefined) item.status = patch.status;
    if (patch.notes !== undefined) item.notes = patch.notes;
    if (patch.evidence !== undefined) item.evidence = [...item.evidence, ...patch.evidence];
    if (patch.lastRunAt !== undefined) item.lastRunAt = patch.lastRunAt;
    suite.suite.updatedAt = new Date().toISOString();
    await this.writeFile(file, suite);
    return item;
  }

  async getStats(name: string): Promise<SuiteStats> {
    const suite = await this.loadSuite(name);
    const stats: SuiteStats = { total: suite.cases.length, passed: 0, failed: 0, review: 0, pending: 0 };
    for (const c of suite.cases) stats[c.status]++;
    return stats;
  }

  async resolveSuite(name?: string): Promise<string> {
    if (name) return name;
    const suites = await this.listSuites();
    if (suites.length === 0) throw new Error("No suite found in .cooltest directory. Run cooltest_init_suite first.");
    return suites[0].name;
  }

  async loadSuite(name: string): Promise<CoolTestSuite> {
    const file = this.fileFor(name);
    return this.readFile(file);
  }

  async readRaw(name: string): Promise<string> {
    const file = this.fileFor(name);
    return fs.readFile(file, "utf-8");
  }

  async absoluteRawPath(name: string): Promise<string> {
    return this.fileFor(name);
  }

  private async exists(file: string): Promise<boolean> {
    try {
      await fs.access(file);
      return true;
    } catch {
      return false;
    }
  }

  private async readFile(file: string): Promise<CoolTestSuite> {
    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw) as CoolTestSuite;
    if (!data.cases) data.cases = [];
    return data;
  }

  private async writeFile(file: string, suite: CoolTestSuite): Promise<void> {
    await this.init();
    await fs.writeFile(file, JSON.stringify(suite, null, 2), "utf-8");
  }
}
