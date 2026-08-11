# Cool Test MCP

An automated testing MCP server. After configuring this server in your project and providing test cases, you can trigger the full flow: "convert → test case by case → local visual report".

## Features

- **Conversion**: turn test cases in any format into a fixed JSON template (`.cooltest/`)
- **Case-by-case testing**: read/test/write cases one by one through MCP tools, avoiding direct JSON file I/O that wastes tokens
- **Review flow**: cases that cannot be tested or judged are automatically set to `review`, left for human review
- **Visual report**: a local web page shows all case results and supports editing status and notes

## Install

```bash
npm install
npm run build
```

## Configuration

Add this to your agent's MCP configuration (e.g. Claude, Cursor):

```json
{
  "mcpServers": {
    "cool-test": {
      "command": "node",
      "args": ["<absolute path to project>/dist/index.js"],
      "cwd": "<your project root>"
    }
  }
}
```

> `cwd` points to your project root; `.cooltest/` will be created there.

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

## MCP Tools

| Tool | Purpose |
|------|---------|
| `cooltest_init_suite` | Generate a `.cooltest` JSON (does not overwrite by default; `overwrite:true` rebuilds) |
| `cooltest_list_suites` | List existing suites |
| `cooltest_list_cases` | Case summary list (id/title/status/priority) |
| `cooltest_get_case` | Read a single case's full content |
| `cooltest_update_case` | Update a case's status/notes/evidence/lastRunAt; appends a new case when no id is given |
| `cooltest_get_stats` | Suite status statistics |
| `cooltest_open_report` | Start the local report server and open the page |

## Report Page

`cooltest_open_report` starts a zero-dependency Node single-script server on a random free port at `127.0.0.1` and opens the visual report:

- Summary bar at the top (Passed / Failed / Review / Pending)
- Single table with all cases + status filter
- `review` cases highlight the reason
- An "Edit" button opens a dialog to modify status and notes; saving writes back to the JSON

## `.cooltest` JSON Structure

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

## Development

```bash
npm run build   # compile TS + copy the report script to dist
node test-e2e.mjs <temp dir>   # end-to-end check (full tool flow via MCP client)
```
