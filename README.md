# TanStack Start + Amplify Skill Package

A reusable bootstrap package for new web apps of this shape:

- **TanStack Start** + Nitro SSR
- **Mantine v9** + **mantine-datatable**
- **Tailwind v4** (co-existing with Mantine via CSS layers)
- **Vertical-slice feature folders** with tactical DDD layering (modules, not full bounded contexts — see `docs/architecture.md`)
- **AWS Amplify** deployment (with the SSR env var propagation issue already solved)

## How to use

### Option A (recommended): install as a personal Claude Code skill

This is a bootstrap skill — it creates new projects, so it should live outside any one project.

```bash
mkdir -p ~/.claude/skills
cp -r /path/to/this/folder ~/.claude/skills/bootstrap-tanstack-amplify
```

Then in any Claude Code session:

1. `mkdir new-app && cd new-app && git init`
2. Open Claude Code, run `/bootstrap-tanstack-amplify` or ask Claude to "bootstrap a new TanStack Start + Amplify project following the skill".

The skill is then available everywhere on your machine, not tied to any specific repo.

### Option B: commit it inside a repo (team-shared)

Use this when a team wants the skill versioned alongside a particular codebase — e.g., a monorepo that hosts multiple Amplify apps and wants every contributor to have the same scaffolding flow available.

1. Move this folder to `.claude/skills/bootstrap-tanstack-amplify/` inside the repo and commit it.
2. Anyone with Claude Code in that repo gets `/bootstrap-tanstack-amplify` automatically.

Not ideal for the *initial* bootstrap of a brand-new project (the repo doesn't exist yet), but useful afterwards for standing up new sub-apps in the same shape.

### Option C: use the docs + templates manually (no Claude Code)

1. Read `docs/bootstrap-checklist.md` top to bottom.
2. Copy files from `templates/` into the new project, adjusting env var names.
3. Follow `docs/amplify-deployment.md` to wire up hosting.

## What's inside

```
project-skill/
├── SKILL.md                         # Claude Code skill definition
├── README.md                        # This file
├── docs/
│   ├── architecture.md              # DDD folder layout and layer rules
│   ├── amplify-deployment.md        # Full Amplify setup, ordered by gotcha
│   ├── cloudformation-setup.md      # IaC path: App + IAM roles via CFN
│   ├── bootstrap-checklist.md       # Fresh-project steps
│   └── gotchas.md                   # Lessons learned, one-liners
└── templates/
    ├── amplify.yml                  # Amplify build spec
    ├── vite.config.ts               # Vite + Nitro (aws-amplify preset)
    ├── postcss.config.cjs           # Mantine breakpoints + tailwind
    ├── CLAUDE.md                    # Project guidance for Claude Code
    ├── cloudformation/
    │   ├── amplify.yaml             # Amplify App + Branch + service role + SSR compute role
    │   ├── deploy.sh                # `aws cloudformation deploy` wrapper
    │   └── parameters.example.json  # Copy to parameters.json and fill in
    ├── scripts/
    │   └── inject-amplify-env.mjs   # Bakes env vars into SSR Lambda
    └── src/
        ├── styles.css               # Tailwind entry
        ├── styles/
        │   └── layers.css           # CSS layer order
        ├── routes/
        │   └── __root.tsx           # Root route: Mantine layer CSS + MantineProvider
        └── server/
            └── env.ts               # Runtime env validation
```

## Per-project customization points

When adopting this package into a new app, these are the things you'll edit:

1. **`templates/src/server/env.ts`** — replace `REQUIRED_ENV_KEYS` with the env vars your app actually needs.
2. **`templates/scripts/inject-amplify-env.mjs`** — the `FORWARDED` array at the top. Match the same env var names.
3. **`templates/CLAUDE.md`** — app-specific context.
4. **Feature folders** — create `src/features/<your-feature>/{domain,application,infrastructure,ui}/` per `docs/architecture.md`.

Everything else in `templates/` is framework-level and should work unchanged.
