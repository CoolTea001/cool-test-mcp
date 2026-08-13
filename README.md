# Cool Test MCP

<p align="center">
  English · <a href="README.cn.md">简体中文</a>
</p>

An automated testing **MCP (Model Context Protocol) server**. It is lightweight — no extra runtime dependencies, single entry point, instant to start — and plugs into any MCP-capable agent (Claude Desktop, Cursor, opencode, etc.) with a few lines of config.

## Features

- **Lightweight & easy to adapt** — no extra runtime deps, runnable via `npx`, one-line config to connect to your agent tools
- **Conversion** — turn test cases in any format into a fixed JSON template (`.cooltest/`)
- **Case-by-case testing** — read / test / write cases one by one through MCP tools, avoiding direct JSON file I/O that wastes tokens
- **Review flow** — cases that cannot be tested or judged are automatically set to `review`, left for human review
- **Visual report** — a local web page shows all case results and supports editing status and notes

## Requirements

- Node.js 18 or newer
- Claude Desktop, Cursor, opencode, or any other MCP client

## Getting started

No local install needed — the server runs directly via `npx`. Register it in your agent's MCP configuration.

**Standard config** works in most of the tools:

```js
{
  "mcpServers": {
    "cool-test": {
      "command": "npx",
      "args": [
        "-y",
        "cool-test-mcp@latest"
      ],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

> `cwd` points to your project root; `.cooltest/` will be created there. For clients without a per-server `cwd`, the folder is created in the MCP process's working directory.

<details>
<summary>Cursor</summary>

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name it to your liking, use `command` type with the command `npx -y cool-test-mcp@latest`. Alternatively, add to `.cursor/mcp.json`:

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

Create a `.trae/mcp.json` file in your project root (Cursor-compatible `mcpServers` schema):

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

For more information, see the [Trae MCP documentation](https://docs.trae.ai/ide/add-mcp-servers).

</details>

<details>
<summary>Zed</summary>

Zed uses the `context_servers` key (not `mcpServers`). Add to `~/.config/zed/settings.json`:

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

For more information, see the [Zed MCP documentation](https://zed.dev/docs/ai/mcp).

</details>

<details>
<summary>opencode</summary>

Follow the MCP Servers [documentation](https://opencode.ai/docs/mcp-servers/). For example in `~/.config/opencode/opencode.json`:

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

> The MCP configs for each agent tool above have not all been individually verified. If you find any issues or missing configs, we welcome PRs to add or fix them.

## Usage

### Trigger the full test flow

```
Use Cool Test for <test case address>
```

The LLM will: check whether your agent has browser automation capability (Playwright MCP etc.) → convert the cases → test case by case → open the report.

### View the report

```
Use Cool Test to view <address>
```

### MCP Tools

| Tool | Purpose |
|------|---------|
| `cooltest_init_suite` | Generate a `.cooltest` JSON (does not overwrite by default; `overwrite:true` rebuilds) |
| `cooltest_append_cases` | Append one or more new cases to a suite in a single batch |
| `cooltest_list_suites` | List existing suites |
| `cooltest_list_cases` | Case summary list (id/title/status/priority) |
| `cooltest_get_case` | Read a single case's full content |
| `cooltest_update_case` | Update an existing case's status/notes/evidence/lastRunAt; lastRunAt is auto-recorded when set to passed/failed |
| `cooltest_get_stats` | Suite status statistics |
| `cooltest_open_report` | Start the local report server and open the page |

## Contributing

Contributions are welcome. To set up a local environment:

```bash
# Clone
git clone https://github.com/CoolTea001/cool-test-mcp.git
cd cool-test-mcp

# Install
npm install

# Build (compile TS + copy the report script to dist)
npm run build

# Test (end-to-end check, full tool flow via MCP client)
node test-e2e.mjs <temp dir>
```

### Test the local build as an MCP server

To try your un-published changes in an actual MCP client, point the server at the local `dist/index.js` instead of the npm package. Rebuild first (`npm run build`) so `dist/` is up to date, then register it.

**Generic `mcpServers` config** (Claude Desktop, Cursor, Trae, etc.):

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "node",
      "args": ["/absolute/path/to/cool-test-mcp/dist/index.js"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

**opencode** (`~/.config/opencode/opencode.json`):

```json
{
  "mcp": {
    "cool-test": {
      "type": "local",
      "command": ["node", "/absolute/path/to/cool-test-mcp/dist/index.js"]
    }
  }
}
```

Notes for local testing:

- Set the working directory to the project you want to test against — `.cooltest/` is created in the MCP process's current working directory.
- After rebuilding, **restart the MCP client / reconnect the server** for the new `dist/` to take effect.
- The published package runs the same code via `npx -y cool-test-mcp@latest`; only the entry point differs.

## License

[MIT](LICENSE)
