# Cool Test MCP

<p align="center">
  <a href="README.md">English</a> · 简体中文
</p>

一个自动化测试 **MCP（Model Context Protocol）服务器**。它轻量、无额外运行时依赖、单入口即启即用，只需几行配置即可接入任意支持 MCP 的智能体（Claude Desktop、Cursor、opencode 等）。

## 功能介绍

- **轻量易接入** — 无需额外运行时依赖，通过 `npx` 即可运行，一行配置接入智能体工具
- **用例转换** — 将任意格式的测试用例转成固定 JSON 模板（`.cooltest/`）
- **逐条测试** — 通过 MCP 工具逐条读取、执行、回写用例，避免直接读写 JSON 文件带来的 token 开销
- **待人工评审** — 无法测试或难以判断的用例自动标记为 `review`，交由人工处理
- **可视化报告** — 本地网页集中展示全部用例结果，并支持编辑状态与备注

## 环境要求

- Node.js 18 或更高版本
- Claude Desktop、Cursor、opencode 或任意其他 MCP 客户端

## 快速开始

无需本地安装：服务器通过 `npx` 直接运行，在智能体的 MCP 配置中注册即可。

**标准配置**适用于大多数工具：

```js
{
  "mcpServers": {
    "cool-test": {
      "command": "npx",
      "args": [
        "-y",
        "cool-test-mcp@latest"
      ],
      "cwd": "/绝对路径/你的项目目录"
    }
  }
}
```

> `cwd` 指向项目根目录，`.cooltest/` 会创建在这里。对于不支持单独设置 `cwd` 的客户端，目录会落在 MCP 进程的工作目录下。

<details>
<summary>Codex</summary>

使用 Codex CLI 添加服务器：

```bash
codex mcp add cool-test npx "-y cool-test-mcp@latest"
```

或创建/编辑 `~/.codex/config.toml`：

```toml
[mcp_servers.cool-test]
command = "npx"
args = ["-y", "cool-test-mcp@latest"]
```

更多信息参见 [Codex MCP 文档](https://github.com/openai/codex/blob/main/codex-rs/config.md#mcp_servers)。

</details>

<details>
<summary>Claude Desktop</summary>

参考 MCP 安装[指南](https://modelcontextprotocol.io/quickstart/user)，添加到 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "npx",
      "args": [
        "-y",
        "cool-test-mcp@latest"
      ],
      "cwd": "/绝对路径/你的项目目录"
    }
  }
}
```

</details>

<details>
<summary>Cursor</summary>

进入 `Cursor Settings` -> `MCP` -> `Add new MCP Server`，自定义名称，`command` 类型填入命令 `npx -y cool-test-mcp@latest`。或者添加到 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "npx",
      "args": [
        "-y",
        "cool-test-mcp@latest"
      ]
    }
  }
}
```

</details>

<details>
<summary>Trae</summary>

在项目根目录创建 `.trae/mcp.json` 文件（与 Cursor 兼容的 `mcpServers` schema）：

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "npx",
      "args": ["-y", "cool-test-mcp@latest"]
    }
  }
}
```

更多信息参见 [Trae MCP 文档](https://docs.trae.ai/ide/add-mcp-servers)。

</details>

<details>
<summary>Zed</summary>

Zed 使用 `context_servers` 键（而非 `mcpServers`）。添加到 `~/.config/zed/settings.json`：

```json
{
  "context_servers": {
    "cool-test": {
      "command": "npx",
      "args": ["-y", "cool-test-mcp@latest"]
    }
  }
}
```

更多信息参见 [Zed MCP 文档](https://zed.dev/docs/ai/mcp)。

</details>

<details>
<summary>opencode</summary>

参考 [MCP 服务器文档](https://opencode.ai/docs/mcp-servers/)。例如写入 `~/.config/opencode/opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "cool-test": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "cool-test-mcp@latest"
      ],
      "enabled": true
    }
  }
}
```

</details>

> 以上各 Agent 工具的 MCP 配置未一一验证，如果存在问题或配置遗漏，欢迎通过 PR 补充。

## 环境变量

| 变量 | 说明 |
|------|------|
| `COOLTEST_ROOT` | 项目根目录的绝对路径，`.cooltest/` 会在该目录下创建和读取。未设置时，默认使用 MCP 进程的工作目录（`process.cwd()`）。当客户端不支持单独的 `cwd`（如 opencode），或你想显式固定根目录时，请设置此项。 |

```json
{
  "environment": {
    "COOLTEST_ROOT": "/绝对路径/你的项目目录"
  }
}
```

## 使用方式

### 触发完整测试流程

```
Use Cool Test for <测试用例地址>
```

LLM 会依次：检查智能体是否具备浏览器自动化能力（如 Playwright MCP）→ 转换用例 → 逐条测试 → 打开报告。

### 查看报告

```
Use Cool Test to view <地址>
```

### MCP 工具

| 工具 | 用途 |
|------|------|
| `cooltest_init_suite` | 生成 `.cooltest` JSON（默认不覆盖；`overwrite:true` 重建） |
| `cooltest_append_cases` | 一次性批量追加一条或多条新用例到套件 |
| `cooltest_list_suites` | 列出已有套件 |
| `cooltest_list_cases` | 用例摘要列表（id/标题/状态/优先级） |
| `cooltest_get_case` | 读取单个用例完整内容 |
| `cooltest_update_case` | 测试后更新已存在用例的状态/备注/证据/lastRunAt |
| `cooltest_get_stats` | 套件状态统计 |
| `cooltest_open_report` | 启动本地报告服务器并打开页面 |

## 参与贡献

欢迎贡献。本地开发环境搭建如下：

```bash
# 下载
git clone https://github.com/CoolTea001/cool-test-mcp.git
cd cool-test-mcp

# 安装
npm install

# 构建（编译 TS + 复制报告脚本到 dist）
npm run build

# 测试（端到端校验，通过 MCP 客户端跑完整工具流）
node test-e2e.mjs <临时目录>
```

### 把本地构建作为 MCP 服务器测试

想在真实的 MCP 客户端中验证尚未发布的改动，可以把服务器入口指向本地构建产物 `dist/index.js`，而不是 npm 包。先执行 `npm run build` 确保 `dist/` 为最新，再注册到客户端。

**通用 `mcpServers` 配置**（Claude Desktop、Cursor、Trae 等）：

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "node",
      "args": ["/绝对路径/cool-test-mcp/dist/index.js"],
      "cwd": "/绝对路径/你的项目"
    }
  }
}
```

**opencode**（`~/.config/opencode/opencode.json`）：

```json
{
  "mcp": {
    "cool-test": {
      "type": "local",
      "command": ["node", "/绝对路径/cool-test-mcp/dist/index.js"],
      "environment": {
        "COOLTEST_ROOT": "/绝对路径/你的项目"
      }
    }
  }
}
```

本地测试要点：

- 将工作目录（或 `COOLTEST_ROOT`）指向待测试的项目，`.cooltest/` 会生成在该目录下。
- 重新构建后，**重启 MCP 客户端 / 重新连接服务器**，新的 `dist/` 才会生效。
- 发布到 npm 的包通过 `npx -y cool-test-mcp@latest` 运行的也是这套代码，只是入口不同。

## 开源协议

[MIT](LICENSE)
