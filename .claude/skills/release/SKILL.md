---
name: release
description: Release a new version of holla-cli
disable-model-invocation: true
---

Release a new version of holla-cli. NEVER manually bump versions.

## Steps

1. Run tests:
   ```bash
   bunx vitest run
   ```

2. Push all changes:
   ```bash
   git push origin main
   ```

3. Trigger the release workflow:
   ```bash
   gh workflow run release.yml
   ```

4. Wait for completion — do NOT return until done:
   ```bash
   sleep 5
   RUN_ID=$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')
   gh run watch "$RUN_ID" --exit-status
   ```

5. If failed, check logs:
   ```bash
   gh run view "$RUN_ID" --log-failed
   ```

6. On success, update local binary:
   ```bash
   brew update && brew upgrade circlesac/tap/holla
   ```

7. Pull version bump:
   ```bash
   git pull --rebase origin main
   ```
