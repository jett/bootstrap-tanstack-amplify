# Architecture

## Stack

- **TanStack Start** (SSR framework) — file-based routing, server functions, SSR out of the box.
- **Nitro** (server runtime) — underlies TanStack Start; picks the deployment preset (`aws-amplify` in our case).
- **Mantine v9** — component library, themeable, ships its own styles.
- **mantine-datatable** — table component that integrates with Mantine.
- **Tailwind v4** — utility CSS, co-exists with Mantine via CSS layers.
- **TypeScript strict** — `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.

## A note on "features"

The `src/features/<feature>/` folders are **vertical slices / modules**, not DDD bounded contexts in the strict sense.

- A **bounded context** in DDD is a strategic boundary: within it a single ubiquitous language and model apply, and across it you need an anti-corruption layer because the same term (e.g., "Customer") can mean different things on either side.
- In this codebase, features typically share the same underlying domain (e.g., multiple features all working against the same model of `Order`, `LineItem`, `Customer`). There's no model clash or translation at feature borders.
- What features *do* give you is module encapsulation (barrel, public surface), internal layering (domain/application/infrastructure/ui — tactical DDD applied within a module), and vertical slicing (a feature is a user-facing capability, not a technical layer).

Features can grow into real bounded contexts if the app expands — e.g., adding a "Billing" feature with its own notion of `Customer` that diverges from an existing model. At that point introduce an ACL between the contexts. Until then, think of features as modules.

## Source layout

```
src/
├── routes/                       # TanStack file-based routes
│   ├── __root.tsx                # HTML shell + MantineProvider + layer.css imports
│   ├── index.tsx                 # /
│   └── <feature>.tsx             # other routes, usually thin — delegate to features
│
├── features/<feature>/           # Vertical-slice module (see note above)
│   ├── domain/                   # Pure types + domain logic. No framework imports.
│   │   └── types.ts
│   ├── application/              # Server functions, loaders, orchestration
│   │   ├── get-xs.ts             # export createServerFn(...).handler(...)
│   │   └── ...
│   ├── infrastructure/           # External integrations, config, adapters
│   │   ├── <external>-client.ts  # e.g., API client
│   │   └── <something>-config.ts
│   ├── ui/                       # React components
│   │   ├── FeatureName.tsx       # main container
│   │   └── ...subcomponents
│   └── index.ts                  # public barrel — exports only what routes need
│
├── server/                       # Server-only utilities shared across features
│   └── env.ts                    # env validation (appEnv, etc.)
│
├── styles.css                    # Tailwind @import
├── styles/
│   └── layers.css                # @layer mantine, mantine-datatable;
│
├── router.tsx                    # getRouter() — defaultPreload: 'intent'
└── routeTree.gen.ts              # GENERATED — do not edit
```

## Layer responsibilities (DDD)

- **domain/** — pure types and business rules. No imports from `@tanstack/*`, `@mantine/*`, or infrastructure. Testable without a runtime.
- **application/** — use cases. Server functions (`createServerFn`) live here. May import domain and infrastructure.
- **infrastructure/** — everything that talks to the outside world: HTTP clients, file config, env parsers, third-party adapters. Read env via `src/server/env.ts`.
- **ui/** — React components. May import domain types. Data comes from loaders via `Route.useLoaderData()` — components should not call server functions directly.

## Dependency rule

Imports flow **inward**: `ui → application → domain`, and infrastructure is called from application. Domain never imports anything from the other layers.

## Routes

Routes are thin. A route typically looks like:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Feature, loadFeature } from '#/features/feature'

export const Route = createFileRoute('/')({
  loader: () => loadFeature(),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  return <Feature {...data} />
}
```

The feature's `index.ts` barrel exposes:

- The main component(s)
- The loader function (`loadFeature`) that orchestrates parallel server-function calls
- Public domain types

## Server functions pattern

```ts
// src/features/feature/application/get-items.ts
import { createServerFn } from '@tanstack/react-start'
import { appEnv } from '#/server/env'

export const getItems = createServerFn({ method: 'GET' }).handler(async () => {
  const env = appEnv()
  // call an external API, shape the response, return it
})
```

- `env` access lives **inside** the handler. Never at module top level — that would fire during prerender/SSR import and throw if the var is missing.
- Server functions return plain data that crosses the wire as JSON.
- The loader composes multiple server functions in parallel:

```ts
// src/features/feature/index.ts
export async function loadFeature() {
  const [a, b, c] = await Promise.all([getA(), getB(), getC()])
  return { a, b, c }
}
```

## Path aliases

Both `#/*` and `@/*` should resolve to `./src/*`. Prefer `#/*` — it also works as a Node subpath import (set in `package.json`), which matters for server code.

Set in `tsconfig.json`:
```json
{ "paths": { "#/*": ["./src/*"], "@/*": ["./src/*"] } }
```

And in `package.json`:
```json
{ "imports": { "#/*": "./src/*" } }
```

## Mantine + Tailwind coexistence

- Mantine stylesheets are imported as `.layer.css` variants in `src/routes/__root.tsx` so they land in named CSS layers (not global scope).
- `src/styles/layers.css` declares the layer order:
  ```css
  @layer mantine, mantine-datatable;
  ```
  Mantine styles first, then mantine-datatable overrides (if any).
- Tailwind v4 is loaded via `@tailwindcss/vite` and imported from `src/styles.css`:
  ```css
  @import 'tailwindcss';
  ```
  Tailwind classes always win over Mantine defaults because Tailwind's layer isn't declared above — meaning it's in the unnamed "top" layer with higher priority.
- Mantine breakpoints are defined as PostCSS simple-vars in `postcss.config.cjs`. Do not define them in JS/TS — they must be in PostCSS for responsive utilities to work at CSS-parse time.

## TypeScript conventions

- Strict mode on, including `noUnusedLocals`, `noUnusedParameters`.
- `verbatimModuleSyntax: true` — type-only imports must use `import type`.
- Feature barrels re-export types with `export type { ... }`.
