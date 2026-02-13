# holla-cli

## Release

Releases are handled via GitHub Actions. Do NOT manually bump versions or publish.

```bash
# 1. Commit and push changes to main
git push origin main

# 2. Trigger the release workflow
gh workflow run release.yml

# 3. Watch the workflow
gh run watch
```

The workflow automatically:
- Runs tests
- Bumps the version (using @circlesac/oneup)
- Builds multi-platform binaries (darwin-x64, darwin-arm64, linux-x64, linux-arm64)
- Creates a GitHub release with tarballs
- Publishes to npm (`@circlesac/holla`)
- Updates the Homebrew formula (`circlesac/tap/holla`)
- Pushes the version tag

After release, update the local binary:
```bash
brew update && brew upgrade circlesac/tap/holla
```

## Development

```bash
bun install          # install dependencies
bun run build        # compile binary to dist/holla
bunx vitest run      # run tests (use vitest, not bun test)
```

## Testing

Use `bunx vitest run` — NOT `bun test`. The test files use vitest globals (`afterEach`, `describe`) which are not available in bun's native test runner.
