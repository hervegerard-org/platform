---
name: project-status
description: >-
  Scans stack versions (package.json, .nvmrc) and GitHub Actions CI
  (platform@v1 callers vs inline jobs) for the hervegerard-org app family,
  then updates the stack-comparison canvas. Use when the user asks for an
  update, status des projets, rescan stack, mise à jour canvas, inventory
  refresh, or whether projects adopted platform@v1.
---

# Project status

Scan real disk state, then patch the canvas. Do not guess versions from chat history.

## Run

From the Platform repo root:

```bash
python3 .cursor/skills/project-status/scripts/scan.py
```

Execute this script. Do not rewrite it. Stdlib only; JSON on stdout.

Hub project (`platform`) has `stack: null` — only CI reusable definitions + git origin.

If `exists` is false, skip that project and report the missing path.

## Map JSON → canvas `PROJECTS`

For each app, `stack.canvas.*` is the value to write into the matching canvas fields:

| JSON | Canvas field |
|------|----------------|
| `stack.canvas.react` | `react` |
| `stack.canvas.vite` | `vite` |
| `stack.canvas.typescript` | `typescript` |
| `stack.canvas.tailwind` | `tailwind` |
| `stack.canvas.router` | `router` |
| `stack.canvas.query` | `query` |
| `stack.canvas.node` | `node` (append CI node from `ci.ci_node` if useful, e.g. `CI 22`) |

Do **not** overwrite `forms`, `zodWired`, or `formsPattern` from `stack.canvas.forms` — those are usage réel (imports / zodResolver), not package.json presence.

CI fields (compose short prose, same style as existing entries):

- `ci` — workflow file names + `platform@v1` if `ci.platform_adopted`, else « à migrer platform »
- `ciActions` — if adopted: `platform@v1 — org <git.org>` ; else list distinct `ci.inline_actions` pins
- `deploy` — `deploy-ovh-ftp` in `platform_callers` → OVH FTP platform ; `wlixcc/SFTP` or sshpass in inline → SFTP local

Also note `git.org`: `hervegerard-org` = transferred ; `hervedesizebe` = Desize, do not transfer ; anything else = still to transfer.

Leave `purpose`, `path`, `cluster`, `packaging`, `upgradePrompt` body intact unless the **État actuel** line is factually wrong.

Do not rewrite `SCAFFOLD_PROMPT` (wizard nouveau projet).

## Patch both canvases

Apply the same edits to:

1. [canvases/stack-comparison.canvas.tsx](canvases/stack-comparison.canvas.tsx)
2. `/Users/Herve/.cursor/projects/Users-Herve-Development-Local-Platform/canvases/stack-comparison.canvas.tsx`

If an `upgradePrompt` « État actuel » line changes, copy that line into [home.html](home.html) as well.

Do not rewrite full adoption prompts. Do not commit.

## Reply

List only deltas: `project → field: old → new`. If a project is fully aligned (`vs_target` all `aligned` and `platform_adopted`), say so in one line.

Skip Perchance, Belfius, and any repo not in the script config.
