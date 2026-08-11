export const SCHEMA_VERSION = "cooltest/v1";

export type CaseStatus = "pending" | "passed" | "failed" | "review";

export const CASE_STATUSES: CaseStatus[] = ["pending", "passed", "failed", "review"];

export interface CaseItem {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expected: string;
  status: CaseStatus;
  priority: string;
  tags: string[];
  notes: string;
  lastRunAt: string | null;
  evidence: string[];
}

export interface SuiteMeta {
  name: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoolTestSuite {
  schema: string;
  suite: SuiteMeta;
  cases: CaseItem[];
}

export interface CaseSummary {
  id: string;
  title: string;
  status: CaseStatus;
  priority: string;
}

export interface SuiteStats {
  total: number;
  passed: number;
  failed: number;
  review: number;
  pending: number;
}

export function newEmptySuite(name: string, source: string): CoolTestSuite {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA_VERSION,
    suite: {
      name,
      source,
      createdAt: now,
      updatedAt: now,
    },
    cases: [],
  };
}
