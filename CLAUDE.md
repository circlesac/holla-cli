# holla-cli

## Release

Releases are handled via GitHub Actions. Do NOT manually bump versions or publish.

```bash
# 1. ALWAYS run tests before committing
bunx vitest run

# 2. Commit and push changes to main
git push origin main

# 3. Trigger the release workflow
gh workflow run release.yml

# 3. MUST monitor until completion — do not return to user until done
RUN_ID=$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status

# 4. If failed, check logs, fix, and re-release
gh run view "$RUN_ID" --log-failed

# 5. After success, update local binary
brew update && brew upgrade circlesac/tap/holla
```

**IMPORTANT**:
- ALWAYS run `bunx vitest run` before committing. Do NOT skip this step.
- When the user asks to release, you MUST monitor the workflow until it completes successfully. Do NOT just trigger the workflow and report back — wait for it to finish, and if it fails, fix the issue and re-trigger.

The workflow automatically:
- Runs tests
- Bumps the version (using @circlesac/oneup)
- Builds multi-platform binaries (darwin-x64, darwin-arm64, linux-x64, linux-arm64)
- Creates a GitHub release with tarballs
- Publishes to npm (`@circlesac/holla`)
- Updates the Homebrew formula (`circlesac/tap/holla`)
- Pushes the version tag

## Development

```bash
bun install          # install dependencies
bun run build        # compile binary to dist/holla
bunx vitest run      # run tests (use vitest, not bun test)
```

## Testing

Use `bunx vitest run` — NOT `bun test`. The test files use vitest globals (`afterEach`, `describe`) which are not available in bun's native test runner.
