import {
  BarChart,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  CollapsibleSection,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Link,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  UsageBar,
  useCanvasAction,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type Cluster = "modern" | "complex" | "debt" | "outlier";

/** Cible d’alignement partagée (cluster moderne) — Node 24 = Active LTS (août 2026). */
const TARGET_STACK =
  "Node 24 Active LTS · React 19 · Vite 8 · TypeScript 6 · Tailwind 4 · React Router 7 · TanStack Query 5 · RHF + zod 4 · Vitest";

const NODE_TARGET =
  '`.nvmrc` = `24.22.1` · `"engines": { "node": ">=24.22.1 <25" }` · CI via platform node-version-file `.nvmrc`';

const PLATFORM_REPO = "hervegerard-org/platform";
const PLATFORM_PIN = "@v1";

/** Reusable workflows — ne plus bumper les actions dans le repo appelant. */
const PLATFORM_WORKFLOWS = `Workflows ${PLATFORM_REPO}${PLATFORM_PIN} (private, callers = org hervegerard-org) :
- node-ci.yml — npm ci + lint?/test?/build (placeholders Vite OK)
- vite-build.yml — build prod + htaccess-src optionnel + artifact vite-dist
- deploy-ovh-ftp.yml — SamKirkland FTP@v4.4.0 ; use-artifact true ; artifact-name vite-dist
- supabase-db-push.yml — db push --db-url (SUPABASE_DB_HOST + password URL-encode)
- supabase-edge-deploy.yml — functions CSV
- supabase-db-dump.yml — pg_dump artifact
Secrets platform : FTP_SERVER / FTP_USERNAME / FTP_PASSWORD ; VITE_* ; SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD, SUPABASE_DB_HOST.
Mapper dans le caller si le repo a d’autres noms (OVH_FTP_*, FTP_HOST, SUPABASE_PROJECT_ID).
Dotfiles : upload-artifact doit inclure .htaccess (include-hidden-files). Si le FTP sync supprime .htaccess, c’est un bug platform — ne pas recoller le copy dans le caller.
jobs.*.uses au niveau job (pas comme step). Pin ${PLATFORM_PIN}, jamais @main.`;

const TRANSFER_ORG = `Transfert GitHub vers hervegerard-org (requis : platform privée).
\`gh repo transfer\` n’existe pas. Utiliser :
  gh api -X POST repos/<owner>/<repo>/transfer -f new_owner=hervegerard-org
Puis : git remote set-url origin https://github.com/hervegerard-org/<repo>.git
Ne pas recréer le repo ; secrets + environments suivent. Si le transfer échoue, STOP.`;

/** Usage réel (imports / zodResolver). Ne pas dériver `forms` du scan package.json. */
const FORMS_STANDARD = `Standard forms (famille) :
- Formulaires métier (login, CRUD, settings) : React Hook Form + zod 4 + @hookform/resolvers (zodResolver).
- API Zod 4 : z.email() / z.uuid() (pas z.string().email()).
- Mini-forms 1 champ : useState + HTML required OK.
- Interdit : laisser zod, react-hook-form, @hookform/resolvers ou components/ui/form.tsx morts — brancher ou retirer.
- shadcn Form : seulement si déjà vivant (raf-ferme). Sinon pattern Ebrius : register() + Label/Input.
- Ne pas migrer en masse les gros useState (atelier ComponentForm / ProjectForm, caisse artiTemps) dans le même chantier que le bump stack.
Référence : raf-ferme (schémas centralisés) ou Ebrius (léger). Pas Lovable form.tsx mort.`;

/** Prompt wizard — coller dans un Agent du workspace *cible* (pas Platform). Sync : docs/scaffold.md + ~/.cursor/skills/scaffold-hervegerard/SKILL.md */
const SCAFFOLD_PROMPT = `Scaffold une nouvelle app dans ce workspace, base famille hervegerard-org. Suis le wizard. N’écris aucun fichier tant que les questions applicables n’ont pas de réponse.

Si ce repo est hervegerard-org/platform (hub Actions, pas d’app Vite), STOP. Dis d’ouvrir le workspace du nouveau projet et de coller ce prompt là.

## Cible fixe (ne pas demander)

- Node 24 : \`.nvmrc\` = \`24.22.1\` · \`"engines": { "node": ">=24.22.1 <25" }\`
- React 19 · Vite 8 · TypeScript 6 · Tailwind 4 · React Router 7 · Vitest
- Pin **majors** seulement (dernier matching), pas de patches figés
- Org GitHub : hervegerard-org
- CI : \`hervegerard-org/platform/.github/workflows/<file>.yml@v1\` — \`jobs.*.uses\` au niveau job, pin \`@v1\`, jamais \`@main\`
- Pas de secrets dans les fichiers · commits seulement si demandé
- Hors scope : Desize / atelier-int / PHP (artiTemps)

Références : raf-ferme = SPA plat + Supabase + CI. Ebrius = forms \`register()\` + \`z.email()\`.

## Wizard

AskQuestion si dispo, sinon questions conversationnelles. Skip question 5 si pas de Supabase. Proposer \`apps/web\` seulement si le profil inclut Supabase.

### 1. Identité

Nom (kebab-case), purpose (une phrase), chemin local si ce n’est pas déjà ce workspace.

### 2. Profil

- **React simple** — pages + Router + Tailwind. Pas de RHF, pas de zod, pas de TanStack Query. Pas de \`form.tsx\` mort.
- **React app** — + TanStack Query 5 + RHF + zod 4 (\`zodResolver\`, API Zod 4 \`z.email()\` / \`z.uuid()\`). UI Radix/shadcn-style. Pattern Ebrius : \`register()\` + Label/Input. **Pas** shadcn Form.
- **React + Supabase** — comme React app + \`@supabase/supabase-js\`, dossier \`supabase/\` (une migration minimale), \`types:gen\`, client typé.
- **React + Supabase + Edge** — précédent + une Edge Function stub \`health\`.

Inférences : simple → Tailwind seul, pas de Query. React app / Supabase → Query + forms Ebrius. Pas de Supabase → pas de jobs \`supabase-*\`.

### 3. Packaging

- SPA plat à la racine (défaut, raf-ferme)
- \`apps/web\` + \`supabase/\` (style Ebrius) — seulement si profil Supabase / Edge

### 4. CI / hébergement

- **node-ci seul** (PR + push)
- **Chaîne FTP** : \`node-ci\` → (\`db-push\` / \`edge\` si Supabase / Edge) → \`vite-build\` → \`deploy-ovh-ftp\`. Demander \`server-dir\` (ex. \`/www/<app>/\`). \`use-artifact: true\`, \`artifact-name: vite-dist\`. Triggers (\`on:\`) restent dans le caller.

### 5. Auth (Supabase seulement)

- Pas encore
- Email/password stub (login + session)

### 6. GitHub

- Créer maintenant : \`gh repo create hervegerard-org/<name> --private --source=.\`
- Plus tard : documenter cette commande dans le README

### 7. Extras (multi, défauts off)

- PWA (\`vite-plugin-pwa\`)
- \`.htaccess\` SPA : \`public/.htaccess.ovh\` + \`htaccess-src\` sur \`vite-build\`
- i18n (i18next)

## Safety

- STOP si une vraie app existe déjà (\`package.json\` react/vite, ou \`src/\` avec routes) sauf overlay explicite.
- Jamais écrire tokens FTP, clés service Supabase, mots de passe DB, ou anon keys live. \`.env.example\` = noms seulement.
- Ne pas \`gh repo transfer\`. Créer les repos **dans** hervegerard-org.
- Ne pas patcher les workflows de platform depuis un scaffold.

## Générer ensuite

1. Vite React-TS dans le layout choisi.
2. \`.nvmrc\`, \`engines\`, ESLint, Vitest smoke (un test qui monte l’app).
3. Scripts : \`dev\` / \`build\` / \`lint\` / \`test\` ; \`types:gen\` si Supabase.
4. React Router 7, route home (et login si auth stub).
5. Selon profil :
   - React app / Supabase : Query client ; au moins un form branché (ou login) avec \`zodResolver\`.
   - Supabase : client typé, \`.env.example\` (\`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`), \`supabase init\` + première migration, script \`types:gen\`.
   - Edge : \`supabase/functions/health/index.ts\` qui répond 200.
6. Si extra htaccess : rewrite SPA Apache dans \`public/.htaccess.ovh\`.
7. Wrapper CI mince \`.github/workflows/ci.yml\` (modèles ci-dessous). Adapter \`working-directory\` / \`cache-dependency-path\` si \`apps/web\`.
8. README : comment lancer ; noms des secrets GitHub ; \`gh repo create\` si reporté.

### Contrainte vite-build platform

\`vite-build.yml@v1\` **exige** VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY même sans Supabase. Si profil React simple/app **et** FTP : créer ces secrets GitHub en placeholder (\`https://placeholder.supabase.co\`, \`placeholder-anon-key\`) et les passer dans le caller. \`node-ci\` substitue déjà des placeholders si vides. Ne pas patcher platform.

### CI — node-ci seul

name: CI
on: push/PR vers main|master
jobs.check uses hervegerard-org/platform/.github/workflows/node-ci.yml@v1
  with: run-lint/test/build true
  secrets: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

### CI — chaîne complète (Supabase + FTP)

Triggers dans le caller. Jobs deploy seulement sur push main/master.
Ordre : check (node-ci) → db-push (supabase-db-push.yml@v1) si Supabase → edge (supabase-edge-deploy.yml@v1, functions: health) si Edge → build (vite-build.yml@v1, htaccess-src: public/.htaccess.ovh si extra) → ftp (deploy-ovh-ftp.yml@v1).
ftp : local-dir ./dist/ ; server-dir /www/<app>/ ; use-artifact true ; artifact-name vite-dist ; artifact-download-path dist
Secrets FTP_SERVER / FTP_USERNAME / FTP_PASSWORD.
vite-build upload l’artifact vite-dist ; deploy-ovh-ftp le télécharge. Si apps/web : working-directory apps/web sur node-ci et vite-build.

Secrets à nommer dans le README (ne pas inventer les valeurs) :
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

- npm run build et npm test verts sous Node 24
- Pas de deps forms mortes
- README liste les secrets et gh repo create si reporté
- Résumer le profil choisi + fichiers créés. Ne pas committer sauf demande.`;

const HOME_HTML =
  "file:///Users/Herve/Development_Local/Platform/home.html";

function cursorOpenHref(absPath: string): string {
  return `cursor://file${encodeURI(absPath)}?windowId=_blank`;
}

const LAUNCHER: { name: string; path: string }[] = [
  {
    name: "Platform",
    path: "/Users/Herve/Development_Local/Platform",
  },
];

type Project = {
  id: string;
  name: string;
  purpose: string;
  path: string;
  cluster: Cluster;
  packaging: string;
  react: string;
  vite: string;
  typescript: string;
  tailwind: string;
  ui: string;
  router: string;
  query: string;
  /** Usage réel RHF/zod — ne pas écraser avec le scan package.json. */
  forms: string;
  zodWired: string;
  formsPattern: string;
  data: string;
  migrations: string;
  edgeFns: string;
  extras: string;
  pwa: string;
  i18n: string;
  maps: string;
  pdf: string;
  charts: string;
  lint: string;
  test: string;
  ci: string;
  /** Pins GitHub Actions (checkout / setup-node / FTP / supabase-cli). */
  ciActions: string;
  deploy: string;
  node: string;
  notes: string;
  /** Prompt Agent : bump stack + transfer org + callers platform@v1. */
  upgradePrompt: string;
};

const PROJECTS: Project[] = [
  {
    id: "raf-ferme",
    name: "raf-ferme",
    purpose:
      "Gestion de stages : participants, inscriptions, paiements, présences.",
    path: "/Users/Herve/Library/Mobile Documents/com~apple~CloudDocs/Development/raf-ferme",
    cluster: "modern",
    packaging: "SPA flat (root)",
    react: "19.2",
    vite: "8",
    typescript: "6",
    tailwind: "4",
    ui: "shadcn + Radix",
    router: "react-router 7",
    query: "TanStack Query 5",
    forms: "RHF + zod 4 · 7/7 wired",
    zodWired: "7 resolvers",
    formsPattern: "shadcn Form + validators.ts",
    data: "Supabase",
    migrations: "11",
    edgeFns: "1",
    extras: "—",
    pwa: "vite-plugin-pwa",
    i18n: "non",
    maps: "non",
    pdf: "pdf-lib",
    charts: "recharts 3",
    lint: "ESLint 10 + Prettier",
    test: "Vitest + Testing Library",
    ci: "platform@v1 (ci + dump)",
    ciActions: "platform@v1 — org hervegerard-org",
    deploy: "OVH FTP platform",
    node: "24.22.1 (.nvmrc + engines + CI)",
    notes:
      "Référence : stack + platform@v1 (août 2026). FTP sync a pu supprimer .htaccess si l’artifact ignore les dotfiles.",
    upgradePrompt: `Tu travailles sur raf-ferme (SPA React + Vite + Supabase).

État actuel : React 19.2, Vite 8, TS 6, TW 4, RR 7, Query 5, RHF+zod 4, Vitest. Node 24 ALIGNÉ.
GitHub : déjà hervegerard-org/raf-ferme.
CI : déjà caller ${PLATFORM_REPO}${PLATFORM_PIN} (node-ci → db-push → edge invite-admin → vite-build htaccess-src=public/.htaccess.ovh → deploy-ovh-ftp /www/stages/). Dump → supabase-db-dump.

Objectif : maintenance stack « ${TARGET_STACK} » + rester sur platform (ne pas réécrire les jobs en inline).

À faire :
1. Bumps patch/minor front ; garder React 19 / Vite 8 / TW 4 / zod 4 / Node 24.
2. \`npm run build\` + \`npm test\` + \`types:gen\`.
3. Ne pas bumper checkout/setup-node/FTP ici — ça vit dans platform.
4. Si le FTP a supprimé .htaccess : corriger platform vite-build.yml (upload-artifact include-hidden-files: true), retagger v1, re-deploy. En attendant restorer public/.htaccess.ovh → /www/stages/.htaccess.

Forms :
${FORMS_STANDARD}
Déjà aligné : 7/7 forms zodResolver + shadcn Form, schémas dans src/lib/validators.ts.
Optionnel : API Zod 4 (z.email() à la place de z.string().email()) ; retirer aliases dépréciés dans validators.ts.
Ne pas changer le pattern shadcn Form.

Contraintes : pas de secrets ; commits seulement si demandé.`,
  },
  {
    id: "ebrius",
    name: "Ebrius",
    purpose: "SPA staffing / planning.",
    path: "/Users/Herve/Development_Local/Ebrius/ebrius",
    cluster: "modern",
    packaging: "apps/web + supabase/",
    react: "19.2",
    vite: "8",
    typescript: "6",
    tailwind: "4",
    ui: "Radix (shadcn-style)",
    router: "react-router-dom 7",
    query: "TanStack Query 5",
    forms: "RHF + zod 4 · 5 wired",
    zodWired: "5 resolvers · 3 native",
    formsPattern: "register() inline · z.email()",
    data: "Supabase",
    migrations: "6",
    edgeFns: "2",
    extras: "—",
    pwa: "vite-plugin-pwa",
    i18n: "non",
    maps: "non",
    pdf: "non",
    charts: "non",
    lint: "oxlint",
    test: "Vitest",
    ci: "deploy.yml — platform@v1",
    ciActions: "platform@v1 — org hervegerard-org",
    deploy: "OVH FTP platform",
    node: "24.22.1 · .nvmrc · engines >=24.22.1 <25",
    notes: "Node 24 + caller platform@v1 (août 2026). Org hervegerard-org.",
    upgradePrompt: `Tu travailles sur Ebrius (\`apps/web\` + \`supabase/\`).

État actuel : React 19.2, Vite 8, TS 6, TW 4, RR 7, Query 5, RHF+zod 4, oxlint, PWA. Node 24 ALIGNÉ. GitHub : hervegerard-org/ebrius. CI : deploy.yml caller platform@v1.
CI : deploy.yml inline (jobs supabase ∥ web). Pins checkout/setup-node@v5, supabase@v3, FTP@v4.4.0 déjà OK.
Node : pin CI / .nvmrc 22.23.4 (CVE-2026-111497). Secrets : OVH_FTP_* , SUPABASE_PROJECT_ID, VITE_*.
Remote actuel : probablement hors hervegerard-org.

Deux cibles : stack « ${TARGET_STACK} » + caller ${PLATFORM_REPO}${PLATFORM_PIN}.

${TRANSFER_ORG}

${PLATFORM_WORKFLOWS}

À faire (ordre) :
1. Transférer le repo vers hervegerard-org, mettre à jour origin.
2. Node 22 → 24 : ${NODE_TARGET} (fichier .nvmrc à la racine ou apps/web — cohérent avec cache-dependency-path).
3. Remplacer deploy.yml par des jobs uses (triggers push main + workflow_dispatch inchangés) :
   - node-ci : working-directory apps/web, cache-dependency-path apps/web/package-lock.json, run-lint false (oxlint), run-test false tant que pas de Vitest, run-build true
   - supabase-db-push (mapper SUPABASE_PROJECT_ID → SUPABASE_PROJECT_REF ; fournir SUPABASE_DB_HOST si besoin --db-url, sinon STOP et documenter l’écart vs link)
   - supabase-edge-deploy functions: invite-user,delete-user ; working-directory à la racine supabase/
   - vite-build : working-directory apps/web, dist-dir dist
   - deploy-ovh-ftp : local-dir apps/web/dist/ (ou dist/ si artifact extraite à dist), server-dir www/ebrius/, use-artifact true
   Mapper OVH_FTP_HOST/USER/PASSWORD → FTP_SERVER/USERNAME/PASSWORD.
4. Ajouter Vitest smoke sur apps/web si simple.
5. \`npm run build\` + \`db:types\` sous Node 24.
6. Ne plus bumper les actions dans ce repo.

Forms :
${FORMS_STANDARD}
Déjà aligné : 5 forms métier zodResolver + register() + z.email(). Laisser les 3 mini-forms natifs. Ne pas introduire shadcn Form.

Contraintes : garder oxlint ; pas de secrets en clair ; commits seulement si demandé.`,
  },
  {
    id: "emulatio",
    name: "Emulatio",
    purpose: "Repérage de décors multi-tenant.",
    path: "/Users/Herve/Development_Local/Emulatio/emulatio",
    cluster: "complex",
    packaging: "apps/web + services/ + supabase/",
    react: "19.2",
    vite: "8",
    typescript: "6",
    tailwind: "4",
    ui: "Radix (shadcn-style)",
    router: "react-router-dom 7",
    query: "TanStack Query 5",
    forms: "deps morts · useState",
    zodWired: "0 import (zod 4 en deps)",
    formsPattern: "useState + required",
    data: "Supabase + Python embed-api",
    migrations: "41",
    edgeFns: "10",
    extras: "FastAPI / Gemini embeddings",
    pwa: "non",
    i18n: "i18next",
    maps: "Google Maps",
    pdf: "@react-pdf/renderer",
    charts: "non",
    lint: "oxlint",
    test: "Vitest + pyright",
    ci: "ci.yml · deploy-ovh.yml · deploy-supabase.yml — platform@v1",
    ciActions: "platform@v1 — org Emulatio",
    deploy: "OVH FTP platform",
    node: "24.22.1 · .nvmrc · engines >=24.22.1 <25 · Python 3.11+",
    notes: "Stack alignée + callers platform@v1 ; remote encore Emulatio (pas org)",
    upgradePrompt: `Tu travailles sur Emulatio (\`apps/web\` + \`supabase/\` + \`services/embed-api\`).

État actuel : React 19.2 / Vite 8 / TW 4 / RR 7 / Query 5, RHF+zod 4 en deps, 0 import (useState), Vitest. Node 24 ALIGNÉ. CI : callers platform@v1. Remote : Emulatio (pas org).
CI : deploy-ovh.yml (SFTP wlixcc@v1.2.5, path guard, checkout/setup @v4) + deploy-supabase.yml (dispatch, setup-cli@v1).
Secrets : OVH_SFTP_* , VITE_* + Google Maps. Platform v1 = FTP SamKirkland seulement (pas SFTP).

Deux cibles : stack « ${TARGET_STACK} » + caller ${PLATFORM_REPO}${PLATFORM_PIN}.

${TRANSFER_ORG}

${PLATFORM_WORKFLOWS}

À faire (ordre) :
1. Transférer vers hervegerard-org + remote origin.
2. Node 24 : ${NODE_TARGET} ; Python 3.11+ inchangé (jobs embed-api restent locaux).
3. Remplacer deploy-ovh.yml par vite-build (apps/web, env VITE_GOOGLE_MAPS_* en plus si le reusable ne les a pas : garder un job build local SEULEMENT pour ces extra env, sinon proposer un input platform) + deploy-ovh-ftp.
   server-dir = dossier emulatio (ex. www/emulatio/). Mapper OVH_SFTP_HOST/USER/PASSWORD → FTP_* si le compte OVH accepte FTP. Conserver un job local de validation de chemin (path guard) AVANT le uses ftp si besoin.
   Si FTP impossible : garder SFTP en job local et n’appeler platform que pour node-ci / supabase — documenter la dérogation.
4. Remplacer deploy-supabase.yml par supabase-db-push + supabase-edge-deploy (functions = toutes ; CSV). Mapper SUPABASE_PROJECT_ID → SUPABASE_PROJECT_REF.
5. Optionnel : Vitest smoke. Pas de PWA sauf demandé.
6. Ne plus bumper checkout@v4 / setup-cli@v1 dans ce repo.

Forms :
${FORMS_STANDARD}
Brancher Login + DemandeAcces + DecorCreate/Edit + Proposer (zodResolver + z.email(), style Ebrius). Interdit de laisser zod / RHF / @hookform/resolvers morts. Zod 4 est déjà en deps — ne pas « migrer 3 → 4 ».

Contraintes : ne pas casser i18n / Maps / PDF / embed-api ; pas de secrets ; commits seulement si demandé.`,
  },
  {
    id: "atelier-int",
    name: "atelier-int",
    purpose: "Desize — projets d’aménagement intérieur (CRM / atelier).",
    path: "/Users/Herve/Library/Mobile Documents/com~apple~CloudDocs/Development/Github/atelier-int.code-workspace",
    cluster: "complex",
    packaging: "SPA flat + supabase/ + SketchUp",
    react: "19.2",
    vite: "8 (SWC)",
    typescript: "6",
    tailwind: "4",
    ui: "shadcn large + TipTap + R3F",
    router: "react-router-dom 7",
    query: "TanStack Query 5",
    forms: "RHF îlots · pas de zod",
    zodWired: "absent · resolvers morts",
    formsPattern: "useState dominant · form.tsx mort",
    data: "Supabase (Edge heavy)",
    migrations: "194",
    edgeFns: "67",
    extras: "Azure AD, OneDrive, AI/RAG, SketchUp",
    pwa: "SW custom",
    i18n: "non",
    maps: "Google Maps",
    pdf: "react-pdf + pdfjs",
    charts: "recharts + force-graph",
    lint: "ESLint + knip + jscpd",
    test: "Vitest + eval CRM",
    ci: "16 workflows — pas de platform (Desize)",
    ciActions: "checkout/setup-node@v6 · supabase-cli@v2 · org hervedesizebe",
    deploy: "SFTP promote (rester local)",
    node: "CI / .nvmrc 22.23.4 (ex SketchUp 20)",
    notes:
      "Desize (hervedesizebe) : ne PAS transférer vers hervegerard-org. Platform privée inappelable. Stack Node 24 seulement ; promote/migra restent C.",
    upgradePrompt: `Tu travailles sur atelier-int (Desize) — gros monolithe Vite + Supabase.

État actuel : React 19.2 / Vite 8 / TW 4 / RR 7 / Query 5 / RHF sans zod. Node CI / .nvmrc 22.23.4.
CI : 16 workflows (promote lftp, migra, SketchUp, dump multi-env…). checkout/setup @v6 OK ; supabase/setup-cli @v2 → v3.
Compte / org : hervedezisebe / Desize — 2 devs. NE PAS transférer vers hervegerard-org.

Cible stack : « ${TARGET_STACK} ».
Platform : ${PLATFORM_REPO} est PRIVATE → inappelable hors org. Ne PAS ajouter uses: ${PLATFORM_REPO}/... tant que platform n’est pas publique. Pas de duplication des YAML platform dans ce repo.

À faire :
1. Node déjà à 22.23.4 (CVE-2026-111497) ; migration optionnelle vers 24.22.1 : ${NODE_TARGET} via \`.nvmrc\`.
2. Remplacer supabase/setup-cli@v2 → @v3 là où utilisé. Ne pas downgrader checkout/setup @v6.
3. Bumps patch/minor front ; \`npm run build\` + \`test:unit\` sous Node 24.
4. Garder promote.yml / migra / buckets / auth / CRM eval / SketchUp en local (classe C).
5. dump : rester local (multi-env) ; plus tard wrapper si platform devient publique.
6. Ne pas remplacer le SW custom sans plan dédié.

Forms :
${FORMS_STANDARD}
Ajouter zod 4. Brancher ProjectLinkModal + DocumentModal via zodResolver. Soit importer components/ui/form.tsx, soit le supprimer (et @hookform/resolvers s’il reste idle). Pas de migration ComponentForm / ProjectForm dans ce prompt.

Contraintes : surface large → changements minimaux ; pas de secrets ; commits seulement si demandé.`,
  },
  {
    id: "grange-dauphin",
    name: "grange-dauphin-planner",
    purpose: "Planner / activités Grange Dauphin (origine Lovable).",
    path: "/Users/Herve/Library/Mobile Documents/com~apple~CloudDocs/Development/Github/grange-dauphin-planner",
    cluster: "debt",
    packaging: "SPA flat + printful-proxy",
    react: "19.2",
    vite: "8",
    typescript: "6",
    tailwind: "4",
    ui: "shadcn + Radix full",
    router: "react-router-dom 7",
    query: "TanStack Query 5",
    forms: "deps morts · useState",
    zodWired: "0 import (zod 4 en deps)",
    formsPattern: "useState · form.tsx mort",
    data: "Supabase + Express proxy",
    migrations: "30",
    edgeFns: "~3",
    extras: "Printful, Express local",
    pwa: "manifest manuel",
    i18n: "non",
    maps: "non",
    pdf: "non",
    charts: "recharts 2",
    lint: "ESLint 9",
    test: "Vitest 4",
    ci: "build.yml — à migrer platform",
    ciActions: "checkout/setup-node@v4 · à migrer platform",
    deploy: "à migrer FTP platform",
    node: "24.22.1 · .nvmrc · engines >=24.22.1 <25",
    notes: "Stack alignée ; CI build.yml encore inline ; remote hervegerard (pas org)",
    upgradePrompt: `Tu travailles sur grange-dauphin-planner (origine Lovable) — PRIORITÉ HAUTE.

État actuel : React 19.2, Vite 8, TS 6, TW 4, RR 7, Query 5, RHF+zod 4 en deps, 0 import. Node 24 ALIGNÉ. CI : build.yml inline (pas platform). Remote : hervegerard.
CI : build.yml checkout/setup @v4 + sshpass SFTP vers /home/herveger/www/grange (main=dev même remote). Secrets FTP_* (misnommés pour SFTP).

Deux cibles : stack « ${TARGET_STACK} » + caller ${PLATFORM_REPO}${PLATFORM_PIN}.

${TRANSFER_ORG}

${PLATFORM_WORKFLOWS}

Plan (étapes) :
1. Transférer vers hervegerard-org + origin.
2. Node 22 → 24 : retirer engines \`<23\` — ${NODE_TARGET}.
3. Vite 5 → 8 ; React 18 → 19 ; RR 6 → 7 ; TW 3 → 4 ; TS → 6 ; brancher Zod 4 déjà présent ; Vitest → 4.
4. Remplacer build.yml sshpass par :
   - node-ci (lint/test/build selon scripts existants)
   - vite-build (htaccess si _htaccess / .htaccess présent)
   - deploy-ovh-ftp server-dir correspondant à www/grange (confirmer le chemin OVH). use-artifact true.
   Passer de SFTP sshpass à FTP SamKirkland (même compte OVH). Printful proxy inchangé.
5. \`npm run build\` + \`npm test\` verts.
6. Ne plus installer sshpass dans la CI.

Forms :
${FORMS_STANDARD}
Premier pas : Login + ReservationForm.tsx (zodResolver). Sinon retirer zod / resolvers / form.tsx mort. Interdit de rester à mi-chemin.

Contraintes : ne pas casser Lovable/hébergement ; pas de secrets ; commits seulement si demandé.`,
  },
  {
    id: "artitemps",
    name: "artiTemps",
    purpose: "Réparations, caisse, facturation, SMS (atelier / boutique).",
    path: "/Users/Herve/Development_Local/artiTemps.cursor",
    cluster: "outlier",
    packaging: "frontend/ + api/ + sql/",
    react: "19.1",
    vite: "7",
    typescript: "5.8",
    tailwind: "3",
    ui: "MUI + Radix (dual)",
    router: "react-router-dom 7",
    query: "non",
    forms: "RHF îlots · pas de zod",
    zodWired: "absent",
    formsPattern: "useState + 3 RHF · form.tsx mort",
    data: "PHP 8.1+ API + MySQL",
    migrations: "sql/ ~185 + api/migrations",
    edgeFns: "—",
    extras: "mPDF, OVH SMS, Google APIs, web-push",
    pwa: "SW custom",
    i18n: "partiel (pays)",
    maps: "non",
    pdf: "mPDF (serveur)",
    charts: "recharts 3",
    lint: "ESLint 9",
    test: "Vitest + PHPUnit",
    ci: "deploy.yml · deploy-full.yml · deploy-api-only.yml — à migrer platform",
    ciActions: "checkout/setup-node@v4 · FTP@v4.3.4/v4.3.5 · API PHP locale",
    deploy: "OVH FTP (FE + API locaux)",
    node: "CI 19 · pas de .nvmrc · PHP 8.1+",
    notes:
      "Outlier PHP : Node 19 EOL + transfer org (hervegerard). FE pas encore platform ; composer/API restent C.",
    upgradePrompt: `Tu travailles sur artiTemps (\`frontend/\` + \`api/\` PHP). NE PAS migrer vers Supabase.

État actuel : React 19.1, Vite 7, TS 5.8, TW 3 ; CI Node 19 EOL.
CI : deploy-full / deploy / deploy-api-only. FTP SamKirkland @v4.3.x → /www/v2/ + /www/api/. Secrets FTP_HOST (≠ FTP_SERVER). Change-detect frontend/api.

Deux cibles : stack front « ${TARGET_STACK} » + FE sur ${PLATFORM_REPO}${PLATFORM_PIN}. API PHP reste locale.

${TRANSFER_ORG}

${PLATFORM_WORKFLOWS}

À faire :
1. Transférer vers hervegerard-org + origin (prépare le partage collab plus tard).
2. Node 19 → 24 : ${NODE_TARGET} (frontend). PHP 8.1+ inchangé.
3. frontend : Vite 7 → 8, TS → 6, TW 3 → 4. Optionnel TanStack Query.
4. Remplacer la partie FRONT des workflows par :
   - node-ci working-directory frontend/
   - vite-build working-directory frontend/ (SW custom : ne pas casser)
   - deploy-ovh-ftp server-dir /www/v2/ ; mapper FTP_HOST → FTP_SERVER
5. Garder deploy-api-only (Composer, excludes vendor, FTP /www/api/) EN LOCAL — pas dans platform v1.
6. Simplifier deploy-full : jobs uses FE + job local API. Conserver change-detect si utile (job local).
7. API PHP : bumps Composer patch/minor ; PHPUnit vert.

Forms :
${FORMS_STANDARD}
Ajouter zod 4 + @hookform/resolvers. Brancher les 3 RHF existants (ReparationEditModal, NwlCreateModal, Clients). form.tsx : utiliser ou supprimer. Caisse / login / facture : 2e passe, hors ce prompt.

Contraintes : architecture PHP/MySQL/OVH inchangée ; pas de secrets ; commits seulement si demandé.`,
  },
];

const CLUSTER_META: Record<
  Cluster,
  { label: string; color: "green" | "blue" | "yellow" | "red" }
> = {
  modern: { label: "Stack moderne", color: "green" },
  complex: { label: "Moderne + complexité", color: "blue" },
  debt: { label: "Dette relative", color: "yellow" },
  outlier: { label: "Outlier", color: "red" },
};

/** Inventaire CI (août 2026) — 25 workflows projet (hors vendor). */
type RefactorClass = "A" | "B" | "C";

type WorkflowCap = {
  project: string;
  files: string;
  count: number;
  node: string;
  checkout: string;
  setupNode: string;
  supabaseCli: string;
  upload: string;
  secrets: string;
  caps: string;
  refactor: string;
};

const WORKFLOW_BY_PROJECT: WorkflowCap[] = [
  {
    project: "raf-ferme",
    files: "ci.yml · dump (wrappers platform@v1)",
    count: 2,
    node: ".nvmrc (24.22.1)",
    checkout: "via platform@v1",
    setupNode: "via platform@v1",
    supabaseCli: "via platform@v1",
    upload: "deploy-ovh-ftp → /www/stages/",
    secrets: "FTP_* · SUPABASE_* · VITE_*",
    caps: "caller platform (check→push→edge→build→ftp + dump)",
    refactor: "A — déjà adopté",
  },
  {
    project: "Ebrius",
    files: "deploy.yml",
    count: 1,
    node: 'pin "22"',
    checkout: "v5",
    setupNode: "v5",
    supabaseCli: "v3 OK",
    upload: "FTP SamKirkland@v4.4.0 → www/ebrius/",
    secrets: "OVH_FTP_* · SUPABASE_PROJECT_ID · VITE_*",
    caps: "build · db push · edge×2 · FTP (pas lint/test)",
    refactor: "A — split jobs → platform",
  },
  {
    project: "Emulatio",
    files: "deploy-ovh.yml · deploy-supabase.yml",
    count: 2,
    node: 'pin "22"',
    checkout: "v4 → bump",
    setupNode: "v4 → bump",
    supabaseCli: "v1 → bump",
    upload: "SFTP wlixcc@v1.2.5 (path guard)",
    secrets: "OVH_SFTP_* · VITE_* + Maps",
    caps: "build+SFTP · db/edge (dispatch only)",
    refactor: "A/B — unifier transport + pins",
  },
  {
    project: "atelier-int",
    files: "16 workflows (promote, build, tests, migra, dump…)",
    count: 16,
    node: "pin 22.23.4 (CVE floor)",
    checkout: "v6 OK",
    setupNode: "v6 OK",
    supabaseCli: "v2 → v3",
    upload: "sshpass / lftp SFTP multi-env",
    secrets: "FTP_* / _PRD · SUPABASE_* multi-env",
    caps: "promote · migra · edge sync · dump · SketchUp · CRM eval",
    refactor: "B/C — core A, promote/migra C",
  },
  {
    project: "grange-dauphin",
    files: "build.yml",
    count: 1,
    node: ".nvmrc (22.23.4)",
    checkout: "v4 → bump",
    setupNode: "v4 → bump",
    supabaseCli: "—",
    upload: "sshpass SFTP → …/www/grange",
    secrets: "FTP_* (misnommé SFTP)",
    caps: "build + SFTP (main=dev même remote)",
    refactor: "A — normaliser SFTP",
  },
  {
    project: "artiTemps",
    files: "deploy-full · deploy · deploy-api-only",
    count: 3,
    node: "pin 19 EOL",
    checkout: "v4 → bump",
    setupNode: "v4 → bump",
    supabaseCli: "—",
    upload: "FTP @v4.3.4/4.3.5 → /www/v2/ + /www/api/",
    secrets: "FTP_HOST (≠ SERVER) · FTP_USERNAME · FTP_PASSWORD",
    caps: "FE build+FTP · PHP API+Composer · change-detect",
    refactor: "B FE A · API PHP C",
  },
];

const WORKFLOW_CAPABILITY_ROWS: string[][] = [
  [
    "node-ci (lint/test/build)",
    "full",
    "build only",
    "build only",
    "rich (+Deno/Py)",
    "build only",
    "FE build only",
  ],
  [
    "deploy-static-ovh",
    "FTP SamKirkland",
    "FTP SamKirkland",
    "SFTP wlixcc",
    "SFTP sshpass/lftp",
    "SFTP sshpass",
    "FTP SamKirkland",
  ],
  [
    "supabase db push",
    "Y (--db-url)",
    "Y (link)",
    "Y (manual)",
    "migra (pas db push)",
    "—",
    "—",
  ],
  [
    "supabase edge deploy",
    "Y (1 fn)",
    "Y (2 fns)",
    "Y (all, dispatch)",
    "Y (sync/heavy)",
    "—",
    "—",
  ],
  [
    "dump / export schema",
    "dump",
    "—",
    "—",
    "dump + export + migra",
    "—",
    "—",
  ],
  ["PHP API deploy", "—", "—", "—", "—", "—", "Y"],
  ["multi-env promote", "—", "—", "—", "Y", "branch tag", "change-detect"],
];

type PlatformCandidate = {
  name: string;
  klass: RefactorClass;
  shape: string;
  callers: string;
  keepLocal: string;
};

const PLATFORM_CANDIDATES: PlatformCandidate[] = [
  {
    name: "node-ci",
    klass: "A",
    shape: "checkout + setup-node (.nvmrc) + npm ci + lint?/test?/build + Vite placeholders",
    callers: "raf-ferme check · builds Ebrius/Emulatio/grange/artiTemps FE",
    keepLocal: "atelier knip/jscpd/Deno/Python/SketchUp BDD",
  },
  {
    name: "deploy-static-ovh",
    klass: "A",
    shape: "inputs protocol=ftp|sftp, local-dir, server-dir ; une action FTP ou SFTP",
    callers: "raf-ferme · Ebrius · Emulatio · grange · artiTemps FE · atelier deploy",
    keepLocal: "atelier lftp --only-newer multi-env ; excludes API artiTemps",
  },
  {
    name: "supabase-db-push",
    klass: "A",
    shape: "setup-cli@v3 + link | --db-url + db push",
    callers: "raf-ferme · Ebrius · Emulatio",
    keepLocal: "atelier migra (pas db push)",
  },
  {
    name: "supabase-edge-deploy",
    klass: "B",
    shape: "setup-cli + deploy list|all + optional npm ci per fn",
    callers: "raf-ferme · Ebrius · Emulatio · atelier sync/heavy",
    keepLocal: "noms de fns · SketchUp debug · promote closure",
  },
  {
    name: "supabase-db-dump",
    klass: "A",
    shape: "pg_dump docker + artifact (+ commit optionnel)",
    callers: "raf-ferme dump ≈ atelier dump",
    keepLocal: "atelier multi-env + commit DEV ; export-schema",
  },
  {
    name: "autre (migra, SketchUp, CRM, PHP…)",
    klass: "C",
    shape: "—",
    callers: "—",
    keepLocal: "atelier promote/migra/buckets/auth/eval · artiTemps API",
  },
];

const SECRET_CHAOS_ROWS: string[][] = [
  ["FTP_SERVER / USERNAME / PASSWORD", "raf-ferme · grange · atelier"],
  ["FTP_SERVER_PRD / _USERNAME_PRD / _PASSWORD_PRD", "atelier PRD"],
  ["FTP_HOST / USERNAME / PASSWORD", "artiTemps"],
  ["OVH_FTP_HOST / USER / PASSWORD", "Ebrius"],
  ["OVH_SFTP_HOST / USER / PASSWORD / REMOTE_PATH", "Emulatio"],
  ["SUPABASE_PROJECT_REF", "raf-ferme"],
  ["SUPABASE_PROJECT_ID", "Ebrius · Emulatio · atelier SketchUp"],
  ["SUPABASE_* multi-env (DEV/TST/PRD)", "atelier"],
];

type AxisKey =
  | "overview"
  | "runtime"
  | "ui"
  | "data"
  | "features"
  | "quality"
  | "ops"
  | "workflows";

const AXES: { id: AxisKey; label: string }[] = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "runtime", label: "Runtime front" },
  { id: "ui", label: "UI & forms" },
  { id: "data", label: "Data layer" },
  { id: "features", label: "Capacités" },
  { id: "quality", label: "Lint / tests / CI" },
  { id: "ops", label: "Packaging & deploy" },
  { id: "workflows", label: "Workflows CI" },
];

function matrixForAxis(axis: AxisKey, projects: Project[]) {
  const headers = ["Axe", ...projects.map((p) => p.name)];
  const row = (label: string, pick: (p: Project) => string) => [
    label,
    ...projects.map(pick),
  ];

  switch (axis) {
    case "runtime":
      return {
        headers,
        rows: [
          row("React", (p) => p.react),
          row("Vite", (p) => p.vite),
          row("TypeScript", (p) => p.typescript),
          row("Router", (p) => p.router),
          row("Node", (p) => p.node),
        ],
      };
    case "ui":
      return {
        headers,
        rows: [
          row("Tailwind", (p) => p.tailwind),
          row("UI libs", (p) => p.ui),
          row("TanStack Query", (p) => p.query),
          row("Forms", (p) => p.forms),
          row("Zod wired", (p) => p.zodWired),
          row("Pattern forms", (p) => p.formsPattern),
        ],
      };
    case "data":
      return {
        headers,
        rows: [
          row("Backend / data", (p) => p.data),
          row("Migrations", (p) => p.migrations),
          row("Edge / API extras", (p) =>
            p.edgeFns === "—" ? p.extras : `${p.edgeFns} edge · ${p.extras}`,
          ),
        ],
      };
    case "features":
      return {
        headers,
        rows: [
          row("PWA", (p) => p.pwa),
          row("i18n", (p) => p.i18n),
          row("Maps", (p) => p.maps),
          row("PDF", (p) => p.pdf),
          row("Charts", (p) => p.charts),
        ],
      };
    case "quality":
      return {
        headers,
        rows: [
          row("Lint", (p) => p.lint),
          row("Tests", (p) => p.test),
          row("CI workflows", (p) => p.ci),
          row("CI Actions", (p) => p.ciActions),
        ],
      };
    case "ops":
      return {
        headers,
        rows: [
          row("Packaging", (p) => p.packaging),
          row("Node", (p) => p.node),
          row("CI Actions", (p) => p.ciActions),
          row("Deploy", (p) => p.deploy),
          row("Notes", (p) => p.notes),
        ],
      };
    case "workflows": {
      const byId: Record<string, string> = {
        "raf-ferme": "raf-ferme",
        ebrius: "Ebrius",
        emulatio: "Emulatio",
        "atelier-int": "atelier-int",
        "grange-dauphin": "grange-dauphin",
        artitemps: "artiTemps",
      };
      const pick =
        (field: keyof WorkflowCap) =>
        (p: Project): string => {
          const row = WORKFLOW_BY_PROJECT.find(
            (w) => w.project === byId[p.id],
          );
          return row ? String(row[field]) : "—";
        };
      return {
        headers,
        rows: [
          row("# workflows", pick("count")),
          row("Node CI", pick("node")),
          row("checkout / setup-node", (p) =>
            `${pick("checkout")(p)} / ${pick("setupNode")(p)}`,
          ),
          row("supabase-cli", pick("supabaseCli")),
          row("Upload", pick("upload")),
          row("Refactor", pick("refactor")),
        ],
      };
    }
    default:
      return {
        headers,
        rows: [
          row("Cluster", (p) => CLUSTER_META[p.cluster].label),
          row("React / Vite / TW / Node", (p) =>
            `R${p.react} · V${p.vite} · TW${p.tailwind} · N${p.node}`,
          ),
          row("Data", (p) => p.data),
          row("Deploy", (p) => p.deploy),
        ],
      };
  }
}

function clusterTone(
  cluster: Cluster,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (cluster === "modern") return "success";
  if (cluster === "debt") return "warning";
  if (cluster === "outlier") return "danger";
  if (cluster === "complex") return "info";
  return "neutral";
}

function PromptBlock({ text }: { text: string }) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 6,
        background: theme.fill.tertiary,
        border: `1px solid ${theme.stroke.tertiary}`,
        whiteSpace: "pre-wrap",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.45,
        color: theme.text.primary,
        maxHeight: 280,
        overflow: "auto",
        userSelect: "text",
      }}
    >
      {text}
    </div>
  );
}

function OpenAgentButton({ prompt }: { prompt: string }) {
  const dispatch = useCanvasAction();
  return (
    <Button
      variant="primary"
      onClick={() =>
        dispatch({ type: "newComposerChat", userPrompt: prompt })
      }
    >
      Ouvrir dans Agent
    </Button>
  );
}

export default function StackComparisonCanvas() {
  const theme = useHostTheme();
  const [axis, setAxis] = useCanvasState<AxisKey>("axis", "overview");
  const [clusterFilter, setClusterFilter] = useCanvasState<string>(
    "clusterFilter",
    "all",
  );
  const [selectedId, setSelectedId] = useCanvasState<string>(
    "selectedId",
    "raf-ferme",
  );

  const filtered =
    clusterFilter === "all"
      ? PROJECTS
      : PROJECTS.filter((p) => p.cluster === clusterFilter);

  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? PROJECTS[0];

  const matrix = matrixForAxis(axis, filtered);

  const modernCount = PROJECTS.filter((p) => p.cluster === "modern").length;
  const complexCount = PROJECTS.filter((p) => p.cluster === "complex").length;
  const debtCount = PROJECTS.filter((p) => p.cluster === "debt").length;
  const outlierCount = PROJECTS.filter((p) => p.cluster === "outlier").length;

  const barData = [
    { label: "raf-ferme", Modernité: 100, Complexité: 25 },
    { label: "Ebrius", Modernité: 88, Complexité: 30 },
    { label: "Emulatio", Modernité: 85, Complexité: 70 },
    { label: "atelier-int", Modernité: 82, Complexité: 95 },
    { label: "grange-dauphin", Modernité: 55, Complexité: 45 },
    { label: "artiTemps", Modernité: 40, Complexité: 75 },
  ];

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 1200 }}>
      <Stack gap={8}>
        <H1>Comparaison des stacks — 6 projets</H1>
        <Text tone="secondary">
          Inventaire réévalué (18 août 2026) · hors secrets · sources :
          package.json, CI, {PLATFORM_REPO}
          {PLATFORM_PIN}
        </Text>
      </Stack>

      <Stack gap={8}>
        <H2>Ouvrir dans Cursor</H2>
        <Text tone="secondary" size="small">
          Nouvelle fenêtre via cursor:// · page complète :
          <Link href={HOME_HTML}>home.html</Link>
        </Text>
        <Row gap={12} wrap>
          {[...LAUNCHER, ...PROJECTS.map((p) => ({ name: p.name, path: p.path }))].map(
            (item) => (
              <span key={item.path}>
                <Link href={cursorOpenHref(item.path)}>{item.name}</Link>
              </span>
            ),
          )}
        </Row>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value={String(modernCount)} label="Stack moderne" tone="success" />
        <Stat value={String(complexCount)} label="Moderne + complexité" tone="info" />
        <Stat value={String(debtCount)} label="Dette relative" tone="warning" />
        <Stat value={String(outlierCount)} label="Outlier PHP" tone="danger" />
      </Grid>

      <UsageBar
        total={PROJECTS.length}
        topLeftLabel="Répartition des 6 projets par cluster"
        topRightLabel={`${modernCount} moderne · ${complexCount} complexe · ${debtCount} dette · ${outlierCount} outlier`}
        segments={[
          { id: "modern", value: modernCount, color: "green" },
          { id: "complex", value: complexCount, color: "blue" },
          { id: "debt", value: debtCount, color: "yellow" },
          { id: "outlier", value: outlierCount, color: "red" },
        ]}
      />

      <Callout tone="info" title="Verdict rapide">
        raf-ferme = référence (Node 24 + déjà caller {PLATFORM_REPO}
        {PLATFORM_PIN}, org hervegerard-org). Ebrius / Emulatio / grange /
        artiTemps : transfert org + wrappers platform + bumps stack. atelier-int
        reste Desize (pas de uses platform privé). artiTemps CI Node 19 = EOL.
      </Callout>

      <Callout tone="success" title="Cible stack + platform">
        App : {TARGET_STACK}. CI : wrappers uses {PLATFORM_REPO}
        {PLATFORM_PIN} (pas de pins d’actions dans le caller). Repo appelant dans
        hervegerard-org. FTP = SamKirkland via deploy-ovh-ftp. atelier-int hors
        périmètre reusable (org distincte).
      </Callout>

      <Card>
        <CardHeader trailing={<Pill active>Wizard</Pill>}>
          Nouveau projet
        </CardHeader>
        <CardBody>
          <Stack gap={10}>
            <Text>
              Prompt à coller dans un Agent du workspace cible (souvent vide).
              Ne pas lancer ici : Platform n’est pas une app Vite.
            </Text>
            <Text size="small" tone="secondary">
              L’agent pose 7 questions (profil React simple / React app / React
              + Supabase / + Edge, packaging, CI, auth, GitHub, extras) puis
              scaffold sur {TARGET_STACK}. Skill perso : scaffold-hervegerard.
              Source : docs/scaffold.md.
            </Text>
            <Row gap={8} align="center">
              <OpenAgentButton prompt={SCAFFOLD_PROMPT} />
            </Row>
            <PromptBlock text={SCAFFOLD_PROMPT} />
          </Stack>
        </CardBody>
      </Card>

      <Row gap={12} wrap>
        <Select
          value={axis}
          onChange={(v) => setAxis(v as AxisKey)}
          options={AXES.map((a) => ({ value: a.id, label: a.label }))}
          placeholder="Axe matrice"
        />
        <Select
          value={clusterFilter}
          onChange={setClusterFilter}
          options={[
            { value: "all", label: "Tous les clusters" },
            { value: "modern", label: "Stack moderne" },
            { value: "complex", label: "Moderne + complexité" },
            { value: "debt", label: "Dette relative" },
            { value: "outlier", label: "Outlier" },
          ]}
          placeholder="Cluster"
        />
      </Row>

      <Stack gap={8}>
        <H2>Fiches projet</H2>
        <Row gap={8} wrap>
          {filtered.map((p) => (
            <span key={p.id}>
              <Pill
                active={selected.id === p.id}
                onClick={() => setSelectedId(p.id)}
                leadingContent={<Swatch color={CLUSTER_META[p.cluster].color} />}
              >
                {p.name}
              </Pill>
            </span>
          ))}
        </Row>
        <Card>
          <CardHeader
            trailing={
              <Pill active>{CLUSTER_META[selected.cluster].label}</Pill>
            }
          >
            {selected.name}
          </CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text>{selected.purpose}</Text>
              <Text size="small" tone="secondary">
                {selected.path}
              </Text>
              <Row gap={6} wrap>
                <Pill size="sm">{`React ${selected.react}`}</Pill>
                <Pill size="sm">{`Vite ${selected.vite}`}</Pill>
                <Pill size="sm">{`TW ${selected.tailwind}`}</Pill>
                <Pill size="sm">{`Node ${selected.node}`}</Pill>
                <Pill size="sm">{selected.ciActions}</Pill>
                <Pill size="sm">{selected.data}</Pill>
                <Pill size="sm">{selected.deploy}</Pill>
              </Row>
              <Divider />
              <Grid columns={2} gap={12}>
                <Stack gap={4}>
                  <H3>Front</H3>
                  <Text size="small">
                    {selected.ui} · {selected.router} · {selected.query} ·{" "}
                    {selected.forms} · {selected.zodWired} ·{" "}
                    {selected.formsPattern}
                  </Text>
                </Stack>
                <Stack gap={4}>
                  <H3>Qualité & ops</H3>
                  <Text size="small">
                    {selected.lint} · {selected.test} · {selected.ci}
                    {" · "}
                    {selected.ciActions} · {selected.packaging}
                  </Text>
                </Stack>
              </Grid>
              <Text size="small" tone="secondary">
                {selected.notes}
              </Text>
              <Divider />
              <Stack gap={6}>
                <Row gap={8} align="center">
                  <H3>Prompt stack + platform</H3>
                  <OpenAgentButton prompt={selected.upgradePrompt} />
                </Row>
                <Text size="small" tone="secondary">
                  Ouvre un Agent Cursor avec ce prompt, ou copie le bloc
                  ci-dessous. Cible stack : {TARGET_STACK}. Cible CI :{" "}
                  {PLATFORM_REPO}
                  {PLATFORM_PIN} (sauf atelier-int).
                </Text>
                <PromptBlock text={selected.upgradePrompt} />
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Stack gap={8}>
        <H2>Matrice — {AXES.find((a) => a.id === axis)?.label}</H2>
        <Table
          headers={matrix.headers}
          rows={matrix.rows}
          stickyHeader
          striped
        />
        {axis === "ui" ? (
          <Callout tone="warning" title="Zod en package.json ≠ usage">
            Emulatio et grange-dauphin : zod 4 + RHF + resolvers en deps, 0
            import. atelier-int et artiTemps : RHF sans zod. Seuls raf-ferme et
            Ebrius ont zodResolver branché.
          </Callout>
        ) : null}
      </Stack>

      <Stack gap={8}>
        <H2>Modernité vs complexité — score relatif (0–100)</H2>
        <Text size="small" tone="secondary">
          Axe Y : projet · Axe X : score relatif 0–100 · Source : inventaire
          local 18 août 2026 (jugement d’alignement, pas une métrique runtime)
        </Text>
        <BarChart
          horizontal
          beginAtZero
          yMax={100}
          showValues
          categories={barData.map((d) => d.label)}
          series={[
            {
              name: "Modernité stack",
              data: barData.map((d) => d.Modernité),
              tone: "success",
            },
            {
              name: "Complexité surface",
              data: barData.map((d) => d.Complexité),
              tone: "warning",
            },
          ]}
          height={280}
        />
      </Stack>

      <Stack gap={8}>
        <H2>Écarts & alignement recommandé</H2>
        <Grid columns={2} gap={12}>
          <Card>
            <CardHeader>Priorité haute</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text size="small">
                  <Text weight="semibold" as="span">
                    artiTemps
                  </Text>
                  {" — "}
                  Node 19 EOL → 24 + transfer org + FE platform@v1 (API PHP locale).
                </Text>
                <Text size="small">
                  <Text weight="semibold" as="span">
                    grange-dauphin
                  </Text>
                  {" — "}
                  sshpass @v4 + engines {"<"}23 + stack R18/V5/TW3 + FTP platform.
                </Text>
                <Text size="small">
                  <Text weight="semibold" as="span">
                    Emulatio
                  </Text>
                  {" — "}
                  SFTP→FTP platform + Node 24 + brancher Zod 4 (deps mortes) +
                  transfer org.
                </Text>
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Fait / partiel</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text size="small">
                  <Text weight="semibold" as="span">
                    raf-ferme
                  </Text>
                  {" — "}
                  Node 24 + déjà {PLATFORM_REPO}
                  {PLATFORM_PIN} (hervegerard-org).
                </Text>
                <Text size="small">
                  <Text weight="semibold" as="span">
                    Ebrius
                  </Text>
                  {" — "}
                  actions OK ; reste Node 22→24 + transfer org + caller platform.
                </Text>
                <Text size="small">
                  <Text weight="semibold" as="span">
                    atelier-int
                  </Text>
                  {" — "}
                  @v6 OK ; Node 24 + cli v3 ; PAS de platform (org Desize).
                </Text>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
        <Callout tone="warning" title="Hors alignement forcé">
          artiTemps reste outlier PHP/MySQL : seul le front + FTP FE passent
          sur platform. atelier-int reste Desize (hervedezisebe) : platform
          privée inappelable. Promote / migra / SketchUp restent locaux.
        </Callout>
      </Stack>

      <Stack gap={8}>
        <H2>Workflows CI — inventaire & refactorabilité</H2>
        <Text size="small" tone="secondary">
          25 workflows projet (hors vendor) · platform live : {PLATFORM_REPO}
          {PLATFORM_PIN} · pins dans platform, pas dans les callers · Node via
          .nvmrc
        </Text>
        <Grid columns={3} gap={12}>
          <Stat value="25" label="Workflows analysés" />
          <Stat value="5" label="Candidats platform (A/B)" tone="success" />
          <Stat value="~40–50%" label="Lignes CI consolidables" tone="info" />
        </Grid>
        <Callout tone="info" title="Classes A / B / C">
          A = reusable workflow platform presque tel quel · B = core partagé +
          steps locaux · C = rester dans le repo produit (migra, SketchUp, PHP
          API, promote multi-env).
        </Callout>

        <H3>Par projet</H3>
        <Table
          headers={[
            "Projet",
            "#",
            "Fichiers",
            "Node",
            "checkout / setup-node",
            "supabase-cli",
            "Upload",
            "Secrets",
            "Refactor",
          ]}
          rows={WORKFLOW_BY_PROJECT.map((w) => [
            w.project,
            String(w.count),
            w.files,
            w.node,
            `${w.checkout} / ${w.setupNode}`,
            w.supabaseCli,
            w.upload,
            w.secrets,
            w.refactor,
          ])}
          rowTone={WORKFLOW_BY_PROJECT.map((w) => {
            if (w.refactor.startsWith("A")) return "success";
            if (w.refactor.startsWith("B")) return "info";
            return "warning";
          })}
          stickyHeader
          striped
        />

        <H3>Matrice de capacités</H3>
        <Table
          headers={[
            "Capacité",
            "raf-ferme",
            "Ebrius",
            "Emulatio",
            "atelier",
            "grange",
            "artiTemps",
          ]}
          rows={WORKFLOW_CAPABILITY_ROWS}
          stickyHeader
          striped
        />

        <H3>Candidats repo platform</H3>
        <Table
          headers={[
            "Classe",
            "Workflow réutilisable",
            "Forme",
            "Callers fins",
            "Garder local",
          ]}
          rows={PLATFORM_CANDIDATES.map((c) => [
            c.klass,
            c.name,
            c.shape,
            c.callers,
            c.keepLocal,
          ])}
          rowTone={PLATFORM_CANDIDATES.map((c) => {
            if (c.klass === "A") return "success";
            if (c.klass === "B") return "info";
            return "warning";
          })}
          stickyHeader
          striped
        />

        <H3>Chaos des noms de secrets (à normaliser)</H3>
        <Table
          headers={["Pattern actuel", "Projets"]}
          rows={SECRET_CHAOS_ROWS}
          stickyHeader
          striped
        />
        <Callout tone="warning" title="Contrat secrets proposé">
          OVH_FTP_HOST / USER / PASSWORD / REMOTE_DIR (ou OVH_SFTP_*) +
          SUPABASE_PROJECT_REF (+ SUPABASE_DB_URL pour dump). Mapping explicite
          dans les wrappers tant que les repos ne sont pas renommés.
        </Callout>

        <H3>Ordre de migration ROI</H3>
        <Card>
          <CardBody>
            <Stack gap={6}>
              <Text size="small">
                1. Normaliser pins d’actions + contrat secrets (sans changer le
                comportement métier).
              </Text>
              <Text size="small">
                2. deploy-static-ovh ← raf-ferme, Ebrius, Emulatio, grange,
                artiTemps FE.
              </Text>
              <Text size="small">
                3. supabase-db-push + supabase-edge-deploy ← raf-ferme / Ebrius /
                Emulatio.
              </Text>
              <Text size="small">
                4. node-ci ← raf-ferme (+ optionnel les builds-only).
              </Text>
              <Text size="small">
                5. supabase-db-dump ← raf-ferme + wrapper multi-env atelier.
              </Text>
              <Text size="small">
                6. Laisser atelier promote/migra et artiTemps PHP en local.
              </Text>
            </Stack>
          </CardBody>
        </Card>

        <CollapsibleSection title="Détail atelier-int (16 workflows)" defaultOpen={false}>
          <Table
            headers={["Fichier", "Classe", "Rôle"]}
            rows={[
              ["promote.yml", "C", "Pipeline multi-env (build+migra+edge+lftp)"],
              ["build.yml", "B", "Build + sshpass SFTP + artifact"],
              ["tests.yml", "C", "Front + Deno edge + Python + SketchUp BDD"],
              ["dump-supabase-database.yml", "A/B", "Dump multi-env (+ commit DEV)"],
              ["export-supabase-schema.yml", "B", "schema-only → db-schema/"],
              ["sync-supabase-edge-functions.yml", "B", "Sync repo↔env --use-api"],
              ["deploy-heavy-edge-functions.yml", "B", "Edge lourdes + debug artifact"],
              ["deploy-sketchup-project-upload-3d.yml", "C", "SketchUp debug (Node 22.23.4)"],
              ["generate-migra-patch.yml", "C", "Migra public/sketchup/crm_chat"],
              ["apply-migra-patch.yml", "C", "Apply migra + sanitizers"],
              ["sync-supabase-buckets.yml", "C", "Buckets S3 structure-only"],
              ["sync-supabase-auth-config.yml", "C", "Auth config Management API"],
              ["init-admin.yml", "C", "create-admin.js"],
              ["crm-chat-eval.yml", "C", "Eval produit CRM"],
              ["changelog.yml", "C", "Append CHANGELOG"],
              ["create-pr.yml", "C", "auto-pull-request"],
            ]}
            stickyHeader
            striped
          />
        </CollapsibleSection>
      </Stack>

      <Stack gap={8}>
        <H2>Prompts stack + platform (par projet)</H2>
        <Text size="small" tone="secondary">
          Un prompt par projet — coller dans un Agent (workspace = ce repo).
          Cible stack : {TARGET_STACK}. Cible CI : transfer hervegerard-org +{" "}
          {PLATFORM_REPO}
          {PLATFORM_PIN} (atelier-int : stack only).
        </Text>
        {PROJECTS.map((p) => (
          <span key={p.id}>
            <CollapsibleSection
              title={p.name}
              leading={<Swatch color={CLUSTER_META[p.cluster].color} />}
              trailing={
                <Text size="small" tone="tertiary">
                  {CLUSTER_META[p.cluster].label}
                </Text>
              }
              defaultOpen={p.id === "ebrius"}
            >
              <Stack gap={8}>
                <Text size="small" tone="secondary">
                  {p.purpose}
                </Text>
                <OpenAgentButton prompt={p.upgradePrompt} />
                <PromptBlock text={p.upgradePrompt} />
              </Stack>
            </CollapsibleSection>
          </span>
        ))}
      </Stack>

      <Stack gap={6}>
        <H3>Clusters</H3>
        <Row gap={8} wrap>
          {(Object.keys(CLUSTER_META) as Cluster[]).map((c) => (
            <span key={c}>
              <Pill
                active={clusterFilter === c}
                onClick={() =>
                  setClusterFilter(clusterFilter === c ? "all" : c)
                }
                leadingContent={<Swatch color={CLUSTER_META[c].color} />}
              >
                {CLUSTER_META[c].label} (
                {PROJECTS.filter((p) => p.cluster === c).length})
              </Pill>
            </span>
          ))}
        </Row>
        <Table
          headers={["Projet", "Cluster", "Stack", "Node", "CI Actions"]}
          rows={PROJECTS.map((p) => [
            p.name,
            CLUSTER_META[p.cluster].label,
            `R${p.react} · V${p.vite} · TW${p.tailwind}`,
            p.node,
            p.ciActions,
          ])}
          rowTone={PROJECTS.map((p) => clusterTone(p.cluster))}
          stickyHeader
        />
      </Stack>

      <Text
        size="small"
        tone="tertiary"
        style={{ borderTop: `1px solid ${theme.stroke.tertiary}`, paddingTop: 12 }}
      >
        Source : manifests + workflows locaux + {PLATFORM_REPO}
        {PLATFORM_PIN} · Node app ≠ runtime des actions GitHub · prompts = stack
        + transfer org + callers reusable · classes A/B/C = refactor CI
      </Text>
    </Stack>
  );
}
