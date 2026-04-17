# holla-cli

## Release

Releases go through GitHub Actions. Do NOT manually bump versions or publish.

```bash
# 1. Run tests
bun run test

# 2. Push changes to main
git push origin main

# 3. Trigger release workflow
gh workflow run release.yml

# 4. Monitor until completion — do NOT return to user until done
RUN_ID=$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status

# 5. If failed, check logs, fix, and re-release
gh run view "$RUN_ID" --log-failed

# 6. After success, update local binary
brew update && brew upgrade circlesac/tap/holla
```

The workflow bumps CalVer via `@circlesac/oneup`, builds multi-platform binaries (darwin/linux, x64+arm64), creates a GitHub release, publishes to npm, and updates the Homebrew tap.

## Development

```bash
bun install          # install dependencies
bun run build        # compile binary to dist/holla
bunx vitest run      # run tests (use vitest, not bun test)
```

## Testing

Use `bunx vitest run` — NOT `bun test`. The test files use vitest globals (`afterEach`, `describe`) which are not available in bun's native test runner.

## Conventions

- Commands use `citty` `defineCommand` with `commonArgs` from `src/lib/args.ts`
- Use `getToken(args.workspace)` for auth — always requires user token (xoxp-)
- Use `handleError(error)` in catch blocks
- Use `printOutput` / `getOutputFormat` for `--json` / `--plain` support
- Channel/user resolution: `resolveChannel(client, input, workspace)`, `resolveUser(client, input, workspace)`
- Text input: use `normalizeSlackText()` and `markdownToBlocks()` from `@circlesac/mack`
- Stdin support: check `!process.stdin.isTTY` then `await Bun.stdin.text()`
- Timestamp args: use `--ts` as primary, `--thread` as alias
