# Adoption checklist

## 1. Org / Actions access (private platform)

Because [hervegerard-org/platform](https://github.com/hervegerard-org/platform) is **private**:

1. Open the platform repo → **Settings → Actions → General → Access**.
2. Choose **Accessible from repositories in the `hervegerard-org` organization** (or “public repositories” only if you later make platform public).
3. Caller repos must belong to **hervegerard-org** (or be granted access).

Without this, `uses: hervegerard-org/platform/.github/workflows/….yml@v1` fails.

## 2. Secrets on the caller

Align names with [secrets.md](secrets.md), or map in the wrapper YAML. Prefer GitHub **Environments** (e.g. `production`) for deploy jobs.

## 3. Thin wrapper pattern

Keep triggers (`on: push`, `pull_request`, `workflow_dispatch`, cron) in the **caller**. Only call platform with `jobs.*.uses`.

Example chain (raf-ferme style):

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  check:
    uses: hervegerard-org/platform/.github/workflows/node-ci.yml@v1
    with:
      run-lint: true
      run-test: true
      run-build: true
    secrets:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  db-push:
    needs: check
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    uses: hervegerard-org/platform/.github/workflows/supabase-db-push.yml@v1
    secrets:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
      SUPABASE_DB_HOST: ${{ secrets.SUPABASE_DB_HOST }}

  edge:
    needs: db-push
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    uses: hervegerard-org/platform/.github/workflows/supabase-edge-deploy.yml@v1
    with:
      functions: invite-admin
    secrets:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}

  build:
    needs: edge
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    uses: hervegerard-org/platform/.github/workflows/vite-build.yml@v1
    with:
      htaccess-src: public/.htaccess.ovh
    secrets:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  ftp:
    needs: build
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    uses: hervegerard-org/platform/.github/workflows/deploy-ovh-ftp.yml@v1
    with:
      local-dir: ./dist/
      server-dir: /www/stages/
      use-artifact: true
      artifact-name: vite-dist
      artifact-download-path: dist
    secrets:
      FTP_SERVER: ${{ secrets.FTP_SERVER }}
      FTP_USERNAME: ${{ secrets.FTP_USERNAME }}
      FTP_PASSWORD: ${{ secrets.FTP_PASSWORD }}
```

`vite-build` uploads artifact `vite-dist`; `deploy-ovh-ftp` downloads it (jobs are isolated). Keep the same `artifact-name` on both.

Note: reusable workflow jobs cannot attach `environment:` on the `uses:` job in all GitHub versions the same way as inline jobs. If you need Environment protection rules, wrap with an intermediate job or set environment approval on the caller side as supported by your plan.

## 4. Pin `@v1`

```yaml
uses: hervegerard-org/platform/.github/workflows/node-ci.yml@v1
```

Do not use `@main` in production callers.

## 5. Smoke test

1. Open a PR → `node-ci` only.
2. Merge / push `main` → db-push → edge → vite-build → ftp.
3. Confirm artifact dump (if adopted) via `workflow_dispatch`.

## Out of scope for platform v1

- SFTP / lftp / sshpass
- PHP API deploys
- atelier-int migra / multi-env promote
- Making this repo public (optional later for cross-org Desize)
