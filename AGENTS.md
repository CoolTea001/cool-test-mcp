# AGENTS

## Commit Rules

- Never run `git commit` or `git push` unless the user explicitly asks for it.
- Before committing, check for secrets and debug code; exclude large files (>1MB).
- Write commits in English, recording only significant changes.
- Format: `<type>(<module>): <description>`, where `type` is one of `feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert`, and the description is no more than 50 characters.
- For multiple changes, list them on separate lines with `- <type>: <description>`.

## Tag Rules

- When tagging (`git tag`), add a version log. It usually covers these three categories: feature additions/changes, bug fixes, and documentation updates.

## Documentation & Test Sync

- After completing any coding task, synchronously update the README (`README.md` / `README.cn.md`) and the e2e test (`test-e2e.mjs`) to reflect the changes.