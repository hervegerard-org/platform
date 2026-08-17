# platform

Reusable GitHub Actions workflows for the **hervegerard-org** app family (Vite/React/Supabase → OVH FTP).

This repo holds **no secrets**. Callers pass secrets and project-specific inputs.

## Requirements

- Repo is **private**: callers must live in `hervegerard-org` (or have access), and Actions access must allow reusable workflows from this repository (see [docs/adoption.md](docs/adoption.md)).
- Callers should pin **`@v1`** (moving major tag), not `@main`.

## Workflows

| Workflow | Purpose |
|----------|---------|
| [`node-ci.yml`](.github/workflows/node-ci.yml) | `npm ci` + optional lint / test / build |
| [`vite-build.yml`](.github/workflows/vite-build.yml) | Production Vite build + optional `.htaccess` copy |
| [`deploy-ovh-ftp.yml`](.github/workflows/deploy-ovh-ftp.yml) | Upload via SamKirkland FTP-Deploy `@v4.4.0` |
| [`supabase-db-push.yml`](.github/workflows/supabase-db-push.yml) | `supabase db push --db-url` |
| [`supabase-edge-deploy.yml`](.github/workflows/supabase-edge-deploy.yml) | Deploy one or more Edge Functions |
| [`supabase-db-dump.yml`](.github/workflows/supabase-db-dump.yml) | `pg_dump` artifact |

Pins (v1): `actions/checkout@v5`, `actions/setup-node@v5`, `supabase/setup-cli@v3`, `SamKirkland/FTP-Deploy-Action@v4.4.0`, `actions/upload-artifact@v4`.

## Example caller

```yaml
jobs:
  check:
    uses: hervegerard-org/platform/.github/workflows/node-ci.yml@v1
    with:
      working-directory: "."
      node-version-file: ".nvmrc"
      run-lint: true
      run-test: true
      run-build: true
    secrets:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  deploy-ftp:
    needs: check
    uses: hervegerard-org/platform/.github/workflows/deploy-ovh-ftp.yml@v1
    with:
      local-dir: ./dist/
      server-dir: /www/stages/
    secrets:
      FTP_SERVER: ${{ secrets.FTP_SERVER }}
      FTP_USERNAME: ${{ secrets.FTP_USERNAME }}
      FTP_PASSWORD: ${{ secrets.FTP_PASSWORD }}
```

## Docs

- [Secret contract](docs/secrets.md)
- [Adoption checklist](docs/adoption.md)

## Versioning

- `v1.0.0` — immutable release
- `v1` — major tag moved on compatible releases; prefer this in callers
