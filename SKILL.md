---
name: bootstrap-tanstack-amplify
description: Bootstrap a new TanStack Start + Nitro + Mantine v9 + Tailwind v4 + mantine-datatable project using DDD feature-folder structure, with AWS Amplify SSR deployment already solved (including env var propagation to the SSR Lambda).
---

# Bootstrap a new TanStack Start + Amplify project

Use this skill when the user asks to scaffold a new web app that needs SSR, a rich data-table UI, server functions, and AWS Amplify hosting. The stack this skill produces:

- **TanStack Start** (file-based routing, SSR via Nitro)
- **Mantine v9** + **mantine-datatable** (UI) layered with **Tailwind v4**
- **Vertical-slice feature folders** (`src/features/<feature>/{domain,application,infrastructure,ui}`) with tactical DDD layering applied per feature. These are modules, not full DDD bounded contexts — see `docs/architecture.md`.
- **AWS Amplify** deployment with env var injection into the SSR Lambda

## When to use

Trigger on phrases like: "bootstrap a new TanStack Start app", "scaffold a TanStack Start + Mantine + Amplify project", "new SSR app with a data table on Amplify".

Do **not** use this skill when modifying an existing app — just reference the templates directly.

## Steps

### 1. Scaffold the TanStack Start base

```bash
npx create-tsrouter-app@latest <project-name> --template file-router --add-ons start,tailwind
cd <project-name>
```

(Or equivalent — confirm current TanStack Start init command with the user if the CLI has changed.)

### 2. Install dependencies

```bash
npm install @mantine/core @mantine/hooks @mantine/notifications @tabler/icons-react mantine-datatable clsx
npm install -D @tailwindcss/typography postcss postcss-preset-mantine postcss-simple-vars
```

### 3. Copy the templates from `templates/`

Each file has a destination path noted at the top. The critical ones:

- `templates/amplify.yml` → `amplify.yml` — Amplify build spec (Node 24, npm ci, build, env-inject).
- `templates/vite.config.ts` → `vite.config.ts` — Nitro `aws-amplify` preset + TanStack Start + Tailwind + Mantine. Plugin order is load-bearing.
- `templates/postcss.config.cjs` → `postcss.config.cjs` — Mantine breakpoints live here, not in JS.
- `templates/src/styles/layers.css` → `src/styles/layers.css` — CSS layer order.
- `templates/src/styles.css` → `src/styles.css` — Tailwind + layers import.
- `templates/src/routes/__root.tsx` → `src/routes/__root.tsx` — root route with Mantine layer-CSS imports and `MantineProvider` (overwrite the scaffolded one).
- `templates/src/server/env.ts` → `src/server/env.ts` — runtime env validation helper. Edit `REQUIRED_ENV_KEYS` to list your app's env vars.
- `templates/scripts/inject-amplify-env.mjs` → `scripts/inject-amplify-env.mjs` — post-build step that bakes env vars into the SSR Lambda. Edit the `FORWARDED` array to match your env keys.
- `templates/CLAUDE.md` → `CLAUDE.md` — project guidance for future Claude Code sessions.

### 4. Set up DDD structure

Follow `docs/architecture.md`. For each feature:

```
src/features/<feature>/
  domain/         — pure types and domain logic, no framework imports
  application/    — server functions (createServerFn) + orchestration (loaders)
  infrastructure/ — external adapters, config files
  ui/             — React components (Mantine, mantine-datatable)
  index.ts        — public barrel export
```

### 5. Provision Amplify infrastructure (CloudFormation)

Use `templates/cloudformation/amplify.yaml` to create the Amplify App, the SSR compute role, and the service role for CloudWatch logs in one stack. This is the recommended path — it solves the "SSR app logs are off" gotcha at deploy time and gives the SSR Lambda an IAM identity ready to be extended when the app needs DDB / S3 / etc.

```bash
cd templates/cloudformation
cp parameters.example.json parameters.json
# edit parameters.json with AppName, RepositoryUrl, BranchName

AWS_PROFILE=... AWS_REGION=us-east-1 ./deploy.sh <app-name>-stack
```

See `docs/cloudformation-setup.md` for GitHub auth options, role-extension recipes, and what's still manual.

If the team prefers console-only setup, skip this step and follow `docs/amplify-deployment.md` instead — both paths land at the same end state.

### 6. Deploy and verify

Follow `docs/amplify-deployment.md` **in order**. This is the part with the most gotchas — skim all of it before starting. Key points:

- Use Node 24 (matches recent `@tanstack/react-start` engine requirement and lockfile parity with modern local dev)
- Nitro preset must be `aws-amplify` (explicit, typed as `preset: 'aws-amplify'` — not `config: { preset }` or `target`)
- Amplify Console env vars hit the build shell but **not** the SSR Lambda runtime — the inject script bridges them by prepending `process.env` assignments to `.amplify-hosting/compute/default/server.js`
- If you skipped the CFN stack, enable "SSR app logs" manually in the Amplify Console or you won't see Lambda errors in CloudWatch

## What's in this skill

- `SKILL.md` — this file
- `docs/architecture.md` — folder layout, layer rules, DDD conventions
- `docs/amplify-deployment.md` — Amplify setup guide, ordered so each gotcha is resolved before it fires
- `docs/cloudformation-setup.md` — IaC path: provision the Amplify App, service role, and SSR compute role via CFN
- `docs/gotchas.md` — hard-won lessons, one-liners for future reference
- `docs/bootstrap-checklist.md` — step-by-step for a fresh project
- `templates/` — copy-paste-ready files
- `templates/cloudformation/` — `amplify.yaml`, `deploy.sh`, `parameters.example.json`
