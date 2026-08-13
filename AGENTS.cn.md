# AGENTS

## 提交规则

- 用户没有明确要求提交代码时，禁止主动执行 `git commit` 或 `git push`。
- 执行 commit 前检查敏感信息和调试代码；大文件（>1MB）需排除。
- Commit 使用英文，只记录重要改动。
- 格式：`<type>(<module>): <description>`，`type` 取 `feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert` 之一，描述不超过 50 字。
- 多项改动用 `- <type>: <description>` 分行列出。

## 打 Tag 规则

- 打 Tag（`git tag`）时，需要添加版本日志，通常包含功能新增/调整、BUG修复、文档更新这三类即可。

## 文档与测试同步

- 完成任何编码任务后，需要同步更新 README（`README.md` / `README.cn.md`）和 e2e 测试（`test-e2e.mjs`）以反映改动。
