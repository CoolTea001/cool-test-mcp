# Issue #11 研究：Cool Test 内置 Playwright 浏览器引擎（A/B/C 三档选型）

> 分支：`research/11-playwright-engine`（throwaway，未提交 git）
> 结论先行：**选 A 档（内置紧凑快照提取器）**，视后续需要可选做「A+C 收口」。不推荐 B 档。理由见下。

---

## 0. 结论 / 推荐

- **选 A 档**：接入最少、直击瓶颈。瓶颈不是「没有动作执行能力」（外部 Playwright MCP 驱动动作已经够用），而是**每次动作后回传的全量 a11y 快照把上下文塞爆**。A 档只新增一个「紧凑快照」工具：用 `chromium.connectOverCDP` 连到 Playwright MCP 已开着的浏览器，`page.evaluate` 跑一段 JS 提取按钮/输入框/表头/行标签并把密集区块折叠成省略计数，回传 1–5KB 的骨架而非 196KB 的完整 a11y 树；动作仍由外部 Playwright MCP 执行。
- **C 档技术上成立但单独做无用**：实测 `@playwright/mcp@0.0.79` 导出正式 API `createConnection(config, contextGetter?)`，返回标准 `@modelcontextprotocol/sdk` 的 `Server`，可用内存传输接入（已写 smoke test 验证）。但它返回的是**固定 24 个工具**、行为与外部版完全相同——不解决快照 token 问题，且无法往那个 Server 里追加自定义工具。C 只有和 A 的紧凑提取器叠加（A+C relay，把 Playwright 工具收进 Cool Test 的 stdio 里转发）才有增量价值，属「锦上添花」。
- **不推荐 B 档**：等于重造 Playwright MCP（实测其 core 能力为约 24 个工具，加上多 tab、dialog/upload/网络态、超时重试、截图落盘，数千行）。改动最大、上线最慢、维护成本最高，却只解决了「动作由谁驱动」这个本来就不是痛点的问题。
- **先行零成本缓解**（任何选型前都值得做）：给 Playwright MCP 配置 `--isolated --mobile`（移动端页面更轻，README 原文即写「saves tokens」）；或 `--snapshot-mode none` 搭配动作工具的 `browser_snapshot.filename` 参数把快照写盘而非回传；README 里 Playwright 官方自己也在主推「CLI+SKILLS 比 MCP 更省 token」（战略信号，超出本 issue 范围，仅记录）。

---

## 1. 三档对比表

| 维度 | A 紧凑快照提取器 | B 完全内置驱动 | C 复用 @playwright/mcp 库 |
|---|---|---|---|
| 核心思路 | 外部 MCP 执行动作，内置只做"裁剪版 DOM 骨架" | 内置 navigate/click/fill/wait/screenshot 全套 | `createConnection()` 拿 SDK Server 收进本进程 |
| tech 概要 | 已实测可行性 | 重造轮子 | 已用 smoke test 验证 API |
| 新增依赖 | `playwright-core`（13MB，仅 CDP 连接，无需下载浏览器） | `playwright`（或 core + `npx playwright install`） | `@playwright/mcp@latest`（连带 alpha 版 playwright-core，~20MB+） |
| 新增规模 | 300–500 行（extractor evaluate 脚本 + connectOverCDP 连接管理器 + 1–2 个工具） | 2000–4000 行（约 24 个工具 + 生命周期/重试/证据落盘） | 100–400 行（relay 转发 + 快照改写），仍需 A 的 extractor |
| 工作量 | 0.5–2 人日 | 1–3 人周，长期维护负担重 | 1–3 人日（纯 relay）；A+C 合计 3–5 人日 |
| 快照 token | **下降 10–100×**（196KB→~1–5KB） | 可自定输出，同样能省 | 无（默认仍返回全量快照，除非叠 A） |
| 动作能力 | 不变（仍靠外部 MCP，成熟稳定） | 自建，须自己踩坑（dialog/upload/跨域/网络态） | 不变（同一套内置实现） |
| 主要风险 | 需要对端浏览器开放 CDP 端口；双客户端同时驱动同一 tab 的竞态 | 高（全功能自建的正确性 & 回归面） | 绑 alpha 版 playwright；工具 schema 不可扩展，须 relay 才能加自定义工具 |
| 配置摩擦 | 需约 1 行 Playwright MCP 配置（开放调试端口） | 零外部依赖 | 可消除"双 MCP server"配置 |

**推荐组合拳**：先上 A；若正式版想砍掉外部 Playwright MCP 配置，再升级为 A+C relay（C 提供动作工具、A 提供紧凑骨架，二合一进一个 stdio server）。

---

## 2. 已实测的关键事实（C 档）

在临时目录（非本仓库）安装 `@playwright/mcp@0.0.79` + `@modelcontextprotocol/sdk` 做了冒烟测试：

- `index.js` 只做一件事：`require('playwright-core/lib/coreBundle')` 并导出 `tools.createConnection`；类型声明为 `createConnection(config?: Config, contextGetter?: () => Promise<BrowserContext>): Promise<Server>`。
- 返回的是标准 SDK `Server`，用 `InMemoryTransport.createLinkedPair()` 与 SDK `Client` 对接成功，`listTools` 返回 **24 个 core 工具**（`browser_navigate/click/type/snapshot/…`）。
- **浏览器懒启动**：`createServer` 里 `backendPromise` 只在首次 `callTool` 时才初始化——`createConnection`+连接+列工具都不会拉起浏览器进程。
- `contextGetter` 钩子允许传入**自有 BrowserContext**（可与 A 档的 CDP 连接共用同一浏览器）。
- `Config` 支持 `snapshot.mode: 'full' | 'none'`（无 compact 档）、`capabilities`（可只开 core）、`browser.cdpEndpoint`、`browser.remoteEndpoint`（Playwright 服务端连接）。`browser_snapshot` 工具自带 `depth`（限深）与 `filename`（写盘不回流）参数。
- 退出清理：内置 watchdog 监听 stdin 关闭/SIGINT/SIGTERM，`gracefullyCloseAll()` 后 `process.exit(0)`（兜底 15s 强退）。

**局限**：工具集与快照格式都固化在 playwright-core 的 bundle 里（`coreBundle.js` 3.4MB），无法直接追加新工具、无法换快照序列化——这是 C 必须配 relay 或另行添加自带工具的原因。

---

## 3. opencode 注册自建 MCP 的边界

- opencode `opencode.json` 的 `mcp.<name>` 支持 `type:"local"` + `command[]` + `cwd`/`environment`/`enabled`，`timeout`（抓取工具列表超时，**默认 5 秒**）。本地 MCP 就是 opencode 拉起的一个长期运行的子进程，走 stdio；`cool-test` 现在正是这么注册的（`node dist/index.js`）。
- **进程内跑浏览器完全可行**：MCP server 本身就是常驻 Node 进程，内部 `chromium.launch()` / `connectOverCDP()` 与普通 Node 程序无差别——Playwright MCP 自己就是「MCP 进程里挂着浏览器」。浏览器生命周期要点：① **首用才启动**（懒初始化，避免拖慢 5s 的列工具超时）；② 进程退出时主动 `browser.close()`/context 关闭，注册 stdin close/SIGINT/SIGTERM 处理（参照上面 watchdog 模式）；③ 隔离 context + 默认 action/navigation 超时；④ 多 tab 时按 target url/标题路由，防串页；⑤ 内存防护：用完的页面 `page.close()`，浏览器空闲可 `browser.close()`。
- 注意 opencode 文档原话：**MCP 服务器会往上下文里加 token**（工具 schema + 返回内容）。所以内置引擎的工具 schema 要极简，且返回内容（骨架）控制在 KB 级，才划算。

---

## 4. Playwright 技术要点（A 档落地细节）

- **`playwright` vs `playwright-core`**：用 `playwright-core`。它不含浏览器安装逻辑与 test runner，体积 13MB（`playwright` 额外 +5MB 包装）；**CDP 连接已有浏览器不需要本地浏览器二进制**，正好匹配 A 档。`@playwright/test` 不需要（那是断言 runner，MCP 驱动用不上）。
- **连接已有浏览器**：`chromium.connectOverCDP(endpointURL|transport, options)`（类型已确认），端点接受 `http://localhost:9222` 或 `ws://…`；**仅 Chromium 系支持 CDP**。已开页面走 `browser.contexts()[0].pages()`，新开 tab 通过 `context.on('page')` 监听。
- **对端开端口**：Playwright MCP 默认不自带远程调试端口。两条路径：① 用户给 Playwright MCP 配 `--config` 文件，在 `browser.launchOptions.args` 加 `--remote-debugging-port=9222`；② 由 Cool Test 自己 `chromium.launch({ args: ['--remote-debugging-port=…'] })` 起浏览器，Playwright MCP 用 `--cdp-endpoint http://localhost:…` 挂上来（Playwright MCP 官方支持此参数）。风险：双连接共驾同一 tab 有竞态，动作后用骨架、骨架后动作的顺序建议串行。
- **`page.evaluate` 提取骨架**：确认可用、返回值需 JSON 可序列化（字符串/数字/数组足够）。一次 `evaluate` 内遍历 `document`：按钮（可见文本/contentid）、输入/下拉/文本域（type/name/placeholder/value）、表头列、行数与首行样例、标题/链接/URL/title，长列表截断为「n 项…」计数。单次往返、KB 级返回，足以驱动「下一步动作」决策。

---

## 5. 工作量与 token 节省预期

**依赖**：A 档新增 1 个 `playwright-core`（devDeps 不动，现有 dep 仍只有 SDK）；B 档需 `playwright`；C 档需 `@playwright/mcp` +（其连带）alpha 版 playwright-core，并与本仓 SDK 共存两份。

**工具规模**（A 档）：
- `src/browser/snapshot.ts`：extractor 脚本（~150–250 行）
- `src/browser/connection.ts`：connectOverCDP 管理（缓存/断线重连/页面发现，~50–100 行）
- `src/index.ts`：新增 `cooltest_compact_snapshot`（+可选的 `cooltest_browser_connect/close`）及工具 schema（~80–120 行）
- `instructions.md` 流程第 5 步改为「动作先调用外部 MCP 工具、结构读取调用 compact_snapshot」

**token 预期**（按实测观测估算）：重表格页单次快照 196KB、单流程 20+ 次、累计 1MB+ 进上下文；紧凑骨架压到 1–5KB/页即为 **10–100× 减量**，单流程从 ~1MB 级降到 ~50KB 级（对中文/结构字符按 ~2.5–4 字符/token 粗估，单流程可省数十万 token）。

**主要风险清单**：CDP 端口依赖用户配置（文档与安装指引需同步）；双客户端竞态（串行化 + 每次骨架前重取连接）；页面在等待动画/网络时骨架可能不稳（骨架读取前 `waitUntil`/小延迟）；`connectOverCDP` 仅 Chromium（Firefox/WebKit 用户无法用，需回退提示）。

---

## 附：事实来源

- 实测：`@playwright/mcp@0.0.79` 的 `index.js/index.d.ts/config.d.ts/cli.js`、`playwright-core/lib/coreBundle.js` 反读 + `smoke.mjs` 冒烟测试（列表 24 工具、内存传输连通）。
- 官方文档：playwright-mcp GitHub README（配置项/`--cdp-endpoint`/`--mobile`/CLI+SKILLS 立场）、npm 页（版 0.0.79）、opencode MCP servers 文档（local 配置/5s 超时/上下文告警）。
- 仓库现状：`package.json`（version 0.2.2、dep 仅 SDK）、`src/{index,store,types,report}.ts`、`.playwright-mcp/` 快照样例。