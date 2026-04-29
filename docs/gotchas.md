# Gotchas

One-liners for things that bit us. Skim before starting a new project.

## Amplify deployment

- **Zip upload ≠ deployment.** Amplify zip-upload mode serves static only and does **not** run `amplify.yml`. Git connection is required to run the build.
- **Node 20 doesn't satisfy `@tanstack/react-start` (>=22.12).** Use Node 24 in `amplify.yml`. Node 24 also ships with npm 11, matching lockfiles generated locally.
- **Do not `npm install -g npm@11` in the build.** It self-upgrades and often fails with `MODULE_NOT_FOUND: promise-retry`. Use a Node version that already includes the right npm.
- **Nitro preset must be explicit.** `nitro({ preset: 'aws-amplify' })`. Nothing else works — `config: { preset }` is a type error; `tanstackStart({ target })` isn't a valid option.
- **Env vars set in the Amplify Console only reach the build shell.** They do not automatically propagate to the SSR Lambda. Use the inject script to prepend `process.env.X = "..."` to `.amplify-hosting/compute/default/server.js`.
- **SSR app logs are off by default.** Without them, CloudWatch is empty and you can't diagnose runtime errors. Enable at app creation or later via App settings → Monitoring.
- **CloudWatch log groups are lazy.** They appear on first Lambda invocation, in the app's region. If you can't find one after a deploy, load the site first and check the region selector.
- **`Failed to set up process.env.secrets` is usually fine.** It only matters if you're using Amplify Secrets (encrypted SSM). Regular Environment variables are separate.

## TanStack Start + Nitro

- **File-based routes compile to `src/routeTree.gen.ts`.** Do not edit by hand — it regenerates on every dev/build.
- **Plugin order in `vite.config.ts` matters.** The working order is `devtools → nitro → tailwindcss → tanstackStart → viteReact`. Changing it can break type generation or SSR.
- **Env reads inside server functions, never at module top level.** `appEnv()` called at import time would fire during build/SSR imports and throw before the request even arrives.

## Mantine + Tailwind v4

- **Mantine CSS goes into named layers via `.layer.css` imports.** Without this, Mantine's global styles leak and fight Tailwind utilities.
- **Breakpoints live in `postcss.config.cjs`, not JS.** They must be PostCSS simple-vars because responsive utilities are parsed at CSS build time.
- **Mantine datatable needs its own layer above Mantine core.** Declare `@layer mantine, mantine-datatable;` in `src/styles/layers.css`.
- **Tooltip on a full-width Mantine component positions weird.** `<Stack>` default `align-items: stretch` makes children fill column width, so `Tooltip position="right"` ends up outside the element. Either use `position="top-start"` or put the Tooltip on an inline child that isn't stretched.

## TypeScript

- **`verbatimModuleSyntax` means type-only imports must use `import type`.** Plain `import { Foo }` for a type triggers a build error.
- **Feature barrels re-export types with `export type { ... }`** — same reason.

## Lockfile discipline

- **Generate lockfiles with the same npm major the build uses.** Cross-major (npm 10 ↔ 11) can produce lockfile formats the other version rejects as "out of sync." Using Node 24 locally and on Amplify keeps them aligned.
- **Avoid pinning deps to `"latest"` if you want reproducible builds.** Dist-tag drift can surface as `npm ci` sync errors on some npm versions. Pin to exact versions once a project stabilizes.

## Git

- **`.env` must be in `.gitignore`.** Not `.env.local`, not `.env.production` — the bare `.env` file too, because TanStack Start and Nitro read it in dev.
- **Don't commit `package-lock.json` to `.prettierignore` as a side effect of the lockfile being in `.gitignore`.** They should be tracked in git and ignored by Prettier (which we do) but not untracked.
