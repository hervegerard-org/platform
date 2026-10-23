# Scaffold — nouveau projet famille

Prompt wizard pour créer une app Vite/React alignée sur la stack **hervegerard-org** (Node 24 · React 19 · Vite 8 · TypeScript 6 · Tailwind 4 · React Router 7 · Vitest · callers `platform@v1`).

## Comment l’utiliser

1. Ouvrir le **workspace cible** (souvent vide) dans Cursor — pas ce repo `platform`.
2. Coller le bloc ci-dessous dans un Agent, **ou** dire « scaffold » / « nouveau projet » (skill perso `scaffold-hervegerard`).
3. Répondre aux questions ; l’agent n’écrit rien avant.

Tenir ce fichier en sync avec `~/.cursor/skills/scaffold-hervegerard/SKILL.md`.

## Prompt à coller

```
Scaffold une nouvelle app dans ce workspace, base famille hervegerard-org. Suis le wizard. N’écris aucun fichier tant que les questions applicables n’ont pas de réponse.

Si ce repo est hervegerard-org/platform (hub Actions, pas d’app Vite), STOP. Dis d’ouvrir le workspace du nouveau projet et de coller ce prompt là.

## Cible fixe (ne pas demander)

- Node 24 : `.nvmrc` = `24.22.1` · `"engines": { "node": ">=24.22.1 <25" }` (plancher CVE-2026-111497 ; pas de pin `24` nu)
- React 19 · Vite 8 · TypeScript 6 · Tailwind 4 · React Router 7 · Vitest
- Pin **majors** seulement pour les deps npm (dernier matching) ; Node garde un plancher patché
- Org GitHub : hervegerard-org
- CI : `hervegerard-org/platform/.github/workflows/<file>.yml@v1` — `jobs.*.uses` au niveau job, pin `@v1`, jamais `@main`
- Pas de secrets dans les fichiers · commits seulement si demandé
- Hors scope : Desize / atelier-int / PHP (artiTemps)

Références : raf-ferme = SPA plat + Supabase + CI. Ebrius = forms `register()` + `z.email()`.

## Wizard

AskQuestion si dispo, sinon questions conversationnelles. Skip question 5 si pas de Supabase. Proposer `apps/web` seulement si le profil inclut Supabase.

### 1. Identité

Nom (kebab-case), purpose (une phrase), chemin local si ce n’est pas déjà ce workspace.

### 2. Profil

- **React simple** — pages + Router + Tailwind. Pas de RHF, pas de zod, pas de TanStack Query. Pas de `form.tsx` mort.
- **React app** — + TanStack Query 5 + RHF + zod 4 (`zodResolver`, API Zod 4 `z.email()` / `z.uuid()`). UI Radix/shadcn-style. Pattern Ebrius : `register()` + Label/Input. **Pas** shadcn Form.
- **React + Supabase** — comme React app + `@supabase/supabase-js`, dossier `supabase/` (une migration minimale), `types:gen`, client typé.
- **React + Supabase + Edge** — précédent + une Edge Function stub `health`.

Inférences : simple → Tailwind seul, pas de Query. React app / Supabase → Query + forms Ebrius. Pas de Supabase → pas de jobs `supabase-*`.

### 3. Packaging

- SPA plat à la racine (défaut, raf-ferme)
- `apps/web` + `supabase/` (style Ebrius) — seulement si profil Supabase / Edge

### 4. CI / hébergement

- **node-ci seul** (PR + push)
- **Chaîne FTP** : `node-ci` → (`db-push` / `edge` si Supabase / Edge) → `vite-build` → `deploy-ovh-ftp`. Demander `server-dir` (ex. `/www/<app>/`). `use-artifact: true`, `artifact-name: vite-dist`. Triggers (`on:`) restent dans le caller.

### 5. Auth (Supabase seulement)

- Pas encore
- Email/password stub (login + session)

### 6. GitHub

- Créer maintenant : `gh repo create hervegerard-org/<name> --private --source=.`
- Plus tard : documenter cette commande dans le README

### 7. Extras (multi, défauts off)

- PWA (`vite-plugin-pwa`)
- `.htaccess` SPA : `public/.htaccess.ovh` + `htaccess-src` sur `vite-build`
- i18n (i18next)

## Safety

- STOP si une vraie app existe déjà (`package.json` react/vite, ou `src/` avec routes) sauf overlay explicite.
- Jamais écrire tokens FTP, clés service Supabase, mots de passe DB, ou anon keys live. `.env.example` = noms seulement.
- Ne pas `gh repo transfer`. Créer les repos **dans** hervegerard-org.
- Ne pas patcher les workflows de platform depuis un scaffold.

## Générer ensuite

1. Vite React-TS dans le layout choisi.
2. `.nvmrc`, `engines`, ESLint, Vitest smoke (un test qui monte l’app).
3. Scripts : `dev` / `build` / `lint` / `test` ; `types:gen` si Supabase.
4. React Router 7, route home (et login si auth stub).
5. Selon profil :
   - React app / Supabase : Query client ; au moins un form branché (ou login) avec `zodResolver`.
   - Supabase : client typé, `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), `supabase init` + première migration, script `types:gen`.
   - Edge : `supabase/functions/health/index.ts` qui répond 200.
6. Si extra htaccess : rewrite SPA Apache dans `public/.htaccess.ovh`.
7. Wrapper CI mince `.github/workflows/ci.yml` (modèles ci-dessous). Adapter `working-directory` / `cache-dependency-path` si `apps/web`.
8. README : comment lancer ; noms des secrets GitHub ; `gh repo create` si reporté.

### Contrainte vite-build platform

`vite-build.yml@v1` **exige** `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` même sans Supabase. Si profil React simple/app **et** FTP : créer ces secrets GitHub en placeholder (`https://placeholder.supabase.co`, `placeholder-anon-key`) et les passer dans le caller. `node-ci` substitue déjà des placeholders si vides. Ne pas patcher platform.

### CI — node-ci seul

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

### CI — chaîne complète (Supabase + FTP)

Triggers dans le caller. Jobs deploy seulement sur push `main`/`master`.

Ordre : `check` (node-ci) → `db-push` (supabase-db-push.yml@v1) si Supabase → `edge` (supabase-edge-deploy.yml@v1, `functions: health`) si Edge → `build` (vite-build.yml@v1, `htaccess-src: public/.htaccess.ovh` si extra) → `ftp` (deploy-ovh-ftp.yml@v1).

ftp :
    needs: build
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    uses: hervegerard-org/platform/.github/workflows/deploy-ovh-ftp.yml@v1
    with:
      local-dir: ./dist/
      server-dir: /www/<app>/
      use-artifact: true
      artifact-name: vite-dist
      artifact-download-path: dist
    secrets:
      FTP_SERVER: ${{ secrets.FTP_SERVER }}
      FTP_USERNAME: ${{ secrets.FTP_USERNAME }}
      FTP_PASSWORD: ${{ secrets.FTP_PASSWORD }}

`vite-build` upload l’artifact `vite-dist` ; `deploy-ovh-ftp` le télécharge. Même `artifact-name`. Si `apps/web` : `working-directory: apps/web` sur node-ci et vite-build.

Secrets à **nommer** dans le README (ne pas inventer les valeurs) :

- FTP : FTP_SERVER, FTP_USERNAME, FTP_PASSWORD
- vite-build : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (placeholders si pas de Supabase)
- Supabase : SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD, SUPABASE_DB_HOST

### Forms (React app / Supabase)

- Métier : React Hook Form + zod 4 + @hookform/resolvers (zodResolver)
- API Zod 4 : z.email() / z.uuid() (pas z.string().email())
- Mini-forms 1 champ : useState + HTML required OK
- Interdit : laisser zod, react-hook-form, @hookform/resolvers ou components/ui/form.tsx morts — brancher ou ne pas installer
- Apps nouvelles : pattern Ebrius (register() + Label/Input), pas shadcn Form

## Fin

- `npm run build` et `npm test` verts sous Node 24
- Pas de deps forms mortes
- README liste les secrets et `gh repo create` si reporté
- Résumer le profil choisi + fichiers créés. Ne pas committer sauf demande.
```
