# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server on port 3000
- `npm run build` — production build (Vite + Nitro aws-amplify preset → `.amplify-hosting/`)
- `npm run preview` — preview the production build (note: with the Amplify preset, preview is limited; switch preset to `node` for full local preview)
- `npm run test` — run Vitest once (non-watch)
- `npm run lint` — ESLint (TanStack config)
- `npm run format` — Prettier check
- `npm run check` — Prettier write + ESLint --fix (run this before committing)

## Architecture

TanStack Start SSR app. The stack wires together several plugins in `vite.config.ts` and **the order matters**: `devtools → nitro → tailwindcss → tanstackStart → viteReact`. Nitro is the server runtime; the `aws-amplify` preset is required for Amplify deployment.

**Routing is file-based.** Routes live in `src/routes/` and are compiled into `src/routeTree.gen.ts` by `@tanstack/router-plugin` (triggered by the `tanstackStart()` Vite plugin). Never hand-edit `routeTree.gen.ts` — it regenerates on dev/build.

**UI is Mantine + Tailwind v4 together:**
- Mantine stylesheets are imported as `.layer.css` variants in `__root.tsx` so they land in named CSS layers.
- `src/styles/layers.css` declares the layer order: `@layer mantine, mantine-datatable;`.
- Tailwind v4 is loaded via `@tailwindcss/vite` and imported from `src/styles.css`.
- Mantine breakpoints are defined as PostCSS simple-vars in `postcss.config.cjs` — change them there, not in JS.

**Path aliases.** `#/*` resolves to `./src/*` (set in both `tsconfig.json` paths and `package.json` imports). Prefer `#/*` — it's also a valid Node subpath import for server code.

## Source layout

Feature-folder DDD:

```
src/features/<feature>/
  domain/         — pure types and business rules
  application/    — server functions (createServerFn), loaders, orchestration
  infrastructure/ — external adapters, API clients, config
  ui/             — React components
  index.ts        — public barrel
```

Dependency rule: `ui → application → domain`, infrastructure called from application. Domain imports nothing else.

## Server functions

- `createServerFn` handlers live in `application/`.
- Env access only **inside** the handler (never at module top level — causes build-time throw on missing vars).
- Loaders (exposed from feature `index.ts`) compose server functions in parallel for the route loader.

## Deployment

AWS Amplify with the Nitro `aws-amplify` preset.

- `amplify.yml` installs Node 24 (required for `@tanstack/react-start`'s engine and lockfile parity), runs `npm ci`, builds, and post-processes with `scripts/inject-amplify-env.mjs`.
- The inject script bakes env vars from the build shell into the SSR Lambda's entry file. **Do not remove this step** — Amplify Console env vars don't automatically reach the Lambda runtime for this stack.
- Enable "SSR app logs" in the Amplify Console to get CloudWatch visibility into Lambda errors.

## Conventions

- Prettier: no semicolons, single quotes, trailing commas (`all`). `npm run check` normalizes.
- TypeScript strict with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` — type-only imports must use `import type`.
- ESLint extends `@tanstack/eslint-config`.
