# Cool Test MCP

<p align="center">
  <a href="README.md">🇬🇧 English</a> · 简体中文
</p>

一个自动化测试 **MCP（Model Context Protocol）服务器**。在项目中配置好该服务器并提供测试用例后，即可触发完整流程：**转换 → 逐条测试 → 本地可视化报告**。

## 功能特性

- **转换** — 将任意格式的测试用例转换为固定 JSON 模板（`.cooltest/`）
- **逐条测试** — 通过 MCP 工具逐条读取 / 测试 / 回写用例，避免直接读写 JSON 文件浪费 token
- **评审流程** — 无法测试或无法判断的用例自动置为 `review`，留给人工评审
- **可视化报告** — 本地网页展示全部用例结果，并支持编辑状态与备注

## 安装

```bash
npm install
npm run build
```

## 配置

在你的智能体 MCP 配置中添加（例如 Claude、Cursor）：

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "npx",
      "args": ["-y", "cool-test-mcp"],
      "cwd": "<你的项目根目录>"
    }
  }
}
```

> `cwd` 指向你的项目根目录；`.cooltest/` 会创建在该目录下。

### 本地开发

如果是从仓库克隆而非安装 npm 包，可直接指向构建产物：

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "node",
      "args": ["<项目绝对路径>/dist/index.js"],
      "cwd": "<你的项目根目录>"
    }
  }
}
```

## 使用

### 触发完整测试流程

```
Use Cool Test for <测试用例地址>
```

LLM 将：检查你的智能体是否具备浏览器自动化能力（Playwright MCP 等）→ 转换用例 → 逐条测试 → 打开报告。

### 查看报告

```
Use Cool Test to view <地址>
```

## MCP 工具

| 工具 | 用途 |
|------|------|
| `cooltest_init_suite` | 生成 `.cooltest` JSON（默认不覆盖；`overwrite:true` 重建） |
| `cooltest_list_suites` | 列出已有套件 |
| `cooltest_list_cases` | 用例摘要列表（id/标题/状态/优先级） |
| `cooltest_get_case` | 读取单个用例完整内容 |
| `cooltest_update_case` | 更新用例的状态/备注/证据/lastRunAt；无 id 时追加新用例 |
| `cooltest_get_stats` | 套件状态统计 |
| `cooltest_open_report` | 启动本地报告服务器并打开页面 |

## 报告页面

`cooltest_open_report` 在 `127.0.0.1` 的随机空闲端口启动一个零依赖的 Node 单脚本服务器，并打开可视化报告：

- 顶部汇总条（通过 / 失败 / 评审 / 待办）
- 单个表格展示全部用例 + 状态筛选
- `review` 用例高亮显示原因
- “编辑”按钮打开对话框修改状态与备注，保存后写回 JSON

## `.cooltest` JSON 结构

```jsonc
{
  "schema": "cooltest/v1",
  "suite": { "name": "...", "source": "...", "createdAt": "...", "updatedAt": "..." },
  "cases": [{
    "id": "case-001",
    "title": "...", "description": "...",
    "steps": ["..."], "expected": "...",
    "status": "pending",   // pending | passed | failed | review
    "priority": "P1", "tags": [],
    "notes": "", "lastRunAt": null, "evidence": []
  }]
}
```

## 开发

```bash
npm run build   # 编译 TS + 复制报告脚本到 dist
node test-e2e.mjs <临时目录>   # 端到端校验（通过 MCP 客户端跑完整工具流）
```

## 许可证

[MIT](LICENSE)
