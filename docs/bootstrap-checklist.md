# Bootstrap checklist

Step-by-step for a fresh project.

## 0. Prerequisites

- Node 24 (`nvm install 24 && nvm use 24`), npm 11 bundled
- Git repo initialized and pushed to GitHub
- AWS account with Amplify access

## 1. Scaffold

```bash
# TanStack Start scaffold — confirm current CLI with user if unsure
npx create-tsrouter-app@latest <project-name> --template file-router --add-ons start,tailwind
cd <project-name>
```

## 2. Install stack dependencies

```bash
# runtime
npm install \
  @mantine/core @mantine/hooks @mantine/notifications \
  @tabler/icons-react \
  mantine-datatable \
  clsx

# dev
npm install -D \
  @tailwindcss/typography \
  postcss postcss-preset-mantine postcss-simple-vars
```

## 3. Copy templates

Copy these files from `../project-skill/templates/` into the new project root (preserving paths):

| From template | To project |
| --- | --- |
| `amplify.yml` | `amplify.yml` |
| `vite.config.ts` | `vite.config.ts` (merge with scaffolded one) |
| `postcss.config.cjs` | `postcss.config.cjs` |
| `CLAUDE.md` | `CLAUDE.md` |
| `scripts/inject-amplify-env.mjs` | `scripts/inject-amplify-env.mjs` |
| `src/server/env.ts` | `src/server/env.ts` |
| `src/styles.css` | `src/styles.css` |
| `src/styles/layers.css` | `src/styles/layers.css` |
| `src/routes/__root.tsx` | `src/routes/__root.tsx` (overwrite scaffolded) |

## 4. Edit per-project placeholders

- `src/server/env.ts` — replace the example `REQUIRED_ENV_KEYS` with your app's env var names.
- `scripts/inject-amplify-env.mjs` — replace the `FORWARDED` array with the same list.
- `CLAUDE.md` — update the description and any project-specific conventions.
- `postcss.config.cjs` — adjust breakpoint values if needed.

## 5. Wire up `src/routes/__root.tsx`

`templates/src/routes/__root.tsx` is the canonical setup — copy it over the scaffolded one. It already:

1. Imports Mantine's `.layer.css` variants (not plain CSS) so they land in named CSS layers.
2. Wraps children in `MantineProvider`.
3. Imports `../styles.css` (which in turn imports `./styles/layers.css`).

Update the `<title>` and any meta tags for your app.

## 6. Add a first feature (DDD)

```
src/features/<feature>/
├── domain/types.ts
├── application/get-items.ts
├── infrastructure/api-client.ts
├── ui/Feature.tsx
└── index.ts
```

Pattern per `docs/architecture.md`. Route calls `loadFeature()` from the feature's barrel, which composes server-function calls in parallel.

## 7. Local development

```bash
npm run dev           # http://localhost:3000
```

Create a local `.env` with your env var values. `.env` should be in `.gitignore`.

## 8. Deploy

Follow `docs/amplify-deployment.md`. Summary:

1. Create Amplify app from Git.
2. Enable SSR app logs at creation time.
3. Set env vars in Amplify Console → Hosting → Environment variables.
4. Push to trigger build.
5. Verify build log shows `Injected N env vars into .amplify-hosting/compute/default/server.js`.
6. Load the deployed site; watch CloudWatch for errors.

## 9. Useful scripts to set up

In `package.json`:

```json
{
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint",
    "format": "prettier --check .",
    "check": "prettier --write . && eslint --fix"
  }
}
```

Run `npm run check` before committing.
