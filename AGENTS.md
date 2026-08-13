# AGENTS

## Commit Rules

- Never run `git commit` or `git push` unless the user explicitly asks for it.
- Before committing, check for secrets and debug code; exclude large files (>1MB).
- Write commits in English, recording only significant changes.
- Format: `<type>(<module>): <description>`, where `type` is one of `feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert`, and the description is no more than 50 characters.
- For multiple changes, list them on separate lines with `- <type>: <description>`.

## Release & Tag Rules

Use a **Releases + Tags** model:

- **Tags** only publish the package: create a **lightweight** tag (`git tag <version>`, no annotation/message), then push it to trigger CI publish.
- **Releases** record the version log: create a GitHub Release with the body rendered in markdown. Cover these categories: feature additions/changes, bug fixes, and documentation updates.
- The Release's tag must match `package.json` version (the CI enforces `v*` tag == package version).
- Example: push the `vX.Y.Z` lightweight tag, then `gh release create vX.Y.Z --notes "<version log>"`.

## Documentation & Test Sync

- After completing any coding task, synchronously update the README (`README.md` / `README.cn.md`) and the e2e test (`test-e2e.mjs`) to reflect the changes.