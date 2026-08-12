# Cool Test MCP

<p align="center">
  <a href="README.md">English</a> · 简体中文
</p>

一个自动化测试 **MCP（Model Context Protocol）服务器**。它非常轻量——无额外运行时依赖、单入口、即启即用，只需几行配置即可轻松适配到任意支持 MCP 的智能体工具（Claude Desktop、Cursor、opencode 等）。

## 功能介绍

- **轻量易适配** — 无额外运行时依赖，可通过 `npx` 直接运行，一行配置即可接入你的智能体工具
- **转换** — 将任意格式的测试用例转换为固定 JSON 模板（`.cooltest/`）
- **逐条测试** — 通过 MCP 工具逐条读取 / 测试 / 回写用例，避免直接读写 JSON 文件浪费 token
- **评审流程** — 无法测试或无法判断的用例自动置为 `review`，留给人工评审
- **可视化报告** — 本地网页展示全部用例结果，并支持编辑状态与备注

## 环境要求

- Node.js 18 或更高版本
- Claude Desktop、Cursor、opencode 或任意其他 MCP 客户端

## 快速开始

无需本地安装——服务器通过 `npx` 直接运行，然后在你的智能体 MCP 配置中注册即可。

**标准配置** 适用于大多数工具：

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

> `cwd` 指向你的项目根目录；`.cooltest/` 会创建在该目录下。对于不支持单服务器 `cwd` 的客户端，该目录会创建在 MCP 进程的工作目录中。

<details>
<summary>Codex</summary>

使用 Codex CLI 添加服务器：

```bash
codex mcp add cool-test npx "-y cool-test-mcp@latest"
```

或创建 / 编辑 `~/.codex/config.toml`：

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

进入 `Cursor Settings` -> `MCP` -> `Add new MCP Server`，自定义名称，`command` 类型填入命令 `npx -y cool-test-mcp@latest`。或添加到 `.cursor/mcp.json`：

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

参考 MCP 服务器[文档](https://opencode.ai/docs/mcp-servers/)。例如 `~/.config/opencode/opencode.json`：

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

## 使用方式

### 触发完整测试流程

```
Use Cool Test for <测试用例地址>
```

LLM 将：检查你的智能体是否具备浏览器自动化能力（Playwright MCP 等）→ 转换用例 → 逐条测试 → 打开报告。

### 查看报告

```
Use Cool Test to view <地址>
```

### MCP 工具

| 工具 | 用途 |
|------|------|
| `cooltest_init_suite` | 生成 `.cooltest` JSON（默认不覆盖；`overwrite:true` 重建） |
| `cooltest_list_suites` | 列出已有套件 |
| `cooltest_list_cases` | 用例摘要列表（id/标题/状态/优先级） |
| `cooltest_get_case` | 读取单个用例完整内容 |
| `cooltest_update_case` | 更新用例的状态/备注/证据/lastRunAt；无 id 时追加新用例 |
| `cooltest_get_stats` | 套件状态统计 |
| `cooltest_open_report` | 启动本地报告服务器并打开页面 |

## 参与贡献

欢迎贡献。本地环境搭建方式：

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

## 开源协议

[MIT](LICENSE)
