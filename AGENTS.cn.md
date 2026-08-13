# AGENTS

## 提交规则

- 用户没有明确要求提交代码时，禁止主动执行 `git commit` 或 `git push`。
- 执行 commit 前检查敏感信息和调试代码；大文件（>1MB）需排除。
- Commit 使用英文，只记录重要改动。
- 格式：`<type>(<module>): <description>`，`type` 取 `feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert` 之一，描述不超过 50 字。
- 多项改动用 `- <type>: <description>` 分行列出。

## Release 与 Tag 规则

采用 **Releases + Tags** 模式：

- **Tag 只负责发布包**：创建**轻量** tag（`git tag <版本号>`，不带注解/消息），推送后触发 CI 发布。
- **Releases 记录版本日志**：创建 GitHub Release，正文用 markdown 渲染且**使用英文编写**，通常包含功能新增/调整、BUG 修复、文档更新这三类。
- Release 的 tag 必须与 `package.json` 版本一致（CI 会校验 `v*` tag 与包版本一致）。
- 示例：推送 `vX.Y.Z` 轻量 tag 后，执行 `gh release create vX.Y.Z --notes "<版本日志>"`。

## 文档与测试同步

- 完成任何编码任务后，需要同步更新 README（`README.md` / `README.cn.md`）和 e2e 测试（`test-e2e.mjs`）以反映改动。
