# Secret contract

Secrets stay in each **caller** repository (or GitHub Environment). Platform workflows only declare which names they expect.

## FTP (OVH)

| Secret | Used by | Notes |
|--------|---------|-------|
| `FTP_SERVER` | `deploy-ovh-ftp` | Hostname |
| `FTP_USERNAME` | `deploy-ovh-ftp` | |
| `FTP_PASSWORD` | `deploy-ovh-ftp` | |

If a project still uses `OVH_FTP_*` or `FTP_HOST`, map them in the caller:

```yaml
secrets:
  FTP_SERVER: ${{ secrets.OVH_FTP_HOST }}
  FTP_USERNAME: ${{ secrets.OVH_FTP_USER }}
  FTP_PASSWORD: ${{ secrets.OVH_FTP_PASSWORD }}
```

## Vite

| Secret | Used by | Notes |
|--------|---------|-------|
| `VITE_SUPABASE_URL` | `node-ci`, `vite-build` | Optional on `node-ci` (placeholder if empty) |
| `VITE_SUPABASE_ANON_KEY` | `node-ci`, `vite-build` | Optional on `node-ci` (placeholder if empty) |

For production `vite-build`, pass real values (required for a correct prod bundle).

## Supabase

| Secret | Used by | Notes |
|--------|---------|-------|
| `SUPABASE_ACCESS_TOKEN` | `supabase-db-push`, `supabase-edge-deploy` | Personal access token / CI token |
| `SUPABASE_PROJECT_REF` | push, edge, dump | Project ref (not the display name) |
| `SUPABASE_DB_PASSWORD` | push, dump | DB password |
| `SUPABASE_DB_HOST` | push, dump | Pooler host, e.g. `aws-1-….pooler.supabase.com` |

Callers that only have `SUPABASE_PROJECT_ID` should map:

```yaml
secrets:
  SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_ID }}
```

## Do not put in this repo

- FTP credentials
- Supabase tokens / DB passwords
- Production Vite keys
- Hard-coded customer host paths (pass `server-dir` as an input instead)
