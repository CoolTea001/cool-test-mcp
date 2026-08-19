# Issue #13 研究：批量用例读取 API（`list_cases_detail`）是否值得做

> 分支：`research/13-bulk-cases`（throwaway，未提交 git）
> 结论先行：**做，但默认限定 `pending` 子集，并保留可选全量**。理由见下。

---

## 0. 结论 / 推荐

- **推荐做**，形态为 `cooltest_list_cases_detail`：一次返回一整个 suite 的用例详情（title / steps / expected / priority / tags / status / id）。
- **默认行为建议**：无 `status` 参数时**只返回 `pending` 用例**（即待执行集合），因为执行流程里真正要读详情的只有 pending 的用例；已 passed/failed/review 的用例无需重读。
- 提供**可选 `status` 参数**（沿用现有 `list_cases` 的枚举过滤），支持 `all` 或具体状态，以便需要时拿全量。
- 与 `list_cases` **不冲突**：`list_cases` 保持极简 summary（省 token 的「概览」），新接口是「批量详情」。语义分工：`list_cases` 做目录，`list_cases_detail` 做执行前的批量加载。
- 配套建议：`instructions.md` 第 5 步的执行引导可改为「先 `list_cases_detail(status=pending)` 一次取回待执行详情，再逐个 `update_case`」，把 27 次往返降到 1 次读取 + N 次写回。

---

## 1. 真实 suite 体积数据

**未找到真实 suite 样例。** 在以下位置均未发现 `.cooltest` 目录或样例 suite JSON：

- 当前工作区 `/Users/cooltea/Desktop/cool-test-mcp`：根目录无 `.cooltest`。
- 全仓库 `find`（排除 node_modules/.git）：无任何 `*.json` 匹配 `CASE-` 用例结构，src/ 下无 JSON。
- git 历史 / 所有分支（`git log --all --name-only`）：无 `*.cooltest` 相关文件被追踪。
- 唯一「接近样例」的是 `test-e2e.mjs` 里构造的最小用例（3 步，一次写 1 条），与真实 suite 体量相差很大，不足以代表真实数据。

因此以下为**基于 `types.ts` 的 `CaseItem` schema 的估算**（用 node 实测序列化字节数，`JSON.stringify(..., null, 2)` 与 `index.ts` 的 `ok()` 一致）：

### 估算输入
- 真实流程为 24 个用例（N=24）。构造两类用例代表典型形态：
  - **真实形态用例**：中文标题 + description + 5 步 steps + expected + P1 + 3 个 tags（贴近真实测试用例的丰满度）。
  - **最小形态用例**：英文短标题 + 3 步 steps + expected（e2e 样例风格，偏乐观下界）。

### 实测结果（N=24）

| 项 | summary（list_cases） | 全量详情（新接口） |
|---|---|---|
| 真实形态 | 2.92 KB（2992 B） | **13.09 KB**（13408 B） |
| 最小形态 | 2.92 KB | 7.89 KB（8080 B） |
| 单用例详情平均 | — | 真实形态 ~559 B / 用例，最小形态 ~337 B / 用例 |
| 全 suite 文件（含 meta） | — | ~14.4 KB |
| 全量 / summary 体积比 | — | **~4.5x** |

**关键数字**：24 个真实形态用例，全量详情一次性序列化约 **13 KB**（假设步骤偏简单；若步骤更多、含长断言文案，20~30 KB 也属正常区间）。这个量级对 MCP 文本返回完全可接受。

---

## 2. 往返 vs 体积权衡

### 现状（N 次 get_case + get_stats）
真实流程：24 个用例逐个读 → `24 × get_case` + 若干 `get_stats` ≈ **27 次往返**。
- 每次调用：1 次 JSON-RPC 请求 + 1 次响应。
- 请求封装（`tools/call` 信封）实测约 **130 B/次**，27 次约 3.5 KB —— 字节上不占主导。
- **真正的开销在 LLM 上下文而非原始字节**：27 次调用会在对话上下文里产生 27 组「工具调用 + 结果」条目，agent 需为每个用例记录 id、维护执行状态，上下文条目数、延迟（27 次串行 RTT）、以及 agent 的编排负担都随 N 线性放大。这才是「几十次 JSON 往返」痛感的来源。

### 批量方案（1 次返回全量）
- 24 用例全量详情 ≈ **13 KB，单次往返**。
- 字节对比：27 次调用 payload(13.4 KB) + 信封(3.5 KB) ≈ **17 KB**；单次批量 ≈ **13 KB**。字节层面两者相当，批量略省。
- **真正节省的是调用次数（27 → 1）**：单条上下文条目、单次 RTT、无逐用例编排开销。在 N 更大（几十上百用例）时收益更明显。

### 全量 vs 仅 pending 的形态选择
- 执行流程里 `get_case` 只读 **pending** 的用例；passed/failed/review 无需重读详情。
- 若 suite 已跑过一半，`pending` 子集可能远小于全量（例：24 个里只剩 6 个 pending，批量仅返回 6 个 ≈ 3.3 KB）。
- **推荐默认 `pending`**：既覆盖主要场景，又避免「一次全量太大得不偿失」的反向风险（如几百用例、含长 steps 的 suite 全量可能上百 KB，单条响应过载）。
- 保留 `status` 参数以按需取全量或其它状态，兼顾灵活。

---

## 3. 与现有接口的关系 & 避免破坏

- `list_cases`（summary：id/title/status/priority）：保持原样，作为轻量「目录」。**不破坏现有调用方**——不加字段、不改返回结构。
- `get_case`（单条完整详情）：保留，用于按需单读（审计、查看指定用例）。批量接口不替代它。
- `cooltest_list_cases_detail` 建议签名：
  - 参数：`suite`（可选，默认当前 suite）、`status`（可选，`pending | passed | failed | review | all`，默认 `pending`）。
  - 返回：`{ suite, total, cases: CaseDetail[] }`，其中 `CaseDetail` = `{ id, title, steps, expected, priority, tags, status, description }`。
  - `steps`/`expected` 是「详情」的核心价值；`tags`/`priority` 便于执行时排序。**不建议**把 `notes`/`evidence` 也塞进批量（会显著膨胀体积，且这两字段在读取阶段无用），需要时仍走 `get_case`。
- 避免破坏的手段：新接口为**新增工具**，不与任何现有工具同名或改签名；`list_cases` 保持极简不回填详情。向后兼容无风险。

### 反向风险（为什么可能「得不偿失」）
- 若 suite 极大（数百用例、每用例多步骤），`all` 全量单条响应可能数十~上百 KB，超出单次合理载荷，此时批量反而不如按需 `get_case`。
- **对策**：默认 `pending`（通常远小于全量）+ 可选 `status`，把「一次取太多」的风险交还调用方权衡；同时 `get_case` 兜底单读。这样兼顾了 24 用例这类常见规模的收益，又不牺牲超大 suite 的可控性。

---

## 4. 风险清单

1. **体积失控**：极端大 suite + `status=all` 可能单响应过大 → 已用「默认 pending」缓解。
2. **与 list_cases 职责重叠**：混淆「概览」与「批量详情」 → 语义明确分工，docs 里写清。
3. **破坏现有流程**：新增工具不改旧签名，无破坏；但需同步 `instructions.md` 与 `test-e2e.mjs`（AGENTS.md 要求），确认新接口纳入 e2e 覆盖。
4. **新增维护面**：每加一个读接口都是测试与文档成本 → 该接口收益明确（27→1 次往返），值得。
5. **未找到真实样例**：以上体积为 schema 估算，真实 suite 可能更大；实现后建议用一份真实 `.cooltest` 复测，确认默认 `pending` 体积符合预期。

---

### 附：数字来源
- 体积估算：本机 node 脚本按 `types.ts` schema 构造 24 用例实测 `JSON.stringify(..., null, 2)` 字节数。
- 信封大小：按 `@modelcontextprotocol/sdk` 的 `tools/call` 请求 JSON 实测 ~130 B。
- 现状往返次数（27）来自 issue 背景「实测流程 24 用例被逐个读取，agent 调了几十次 get_case / get_stats」。
