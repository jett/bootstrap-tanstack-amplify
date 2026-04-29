# AWS Amplify Deployment

This doc is ordered so each gotcha is resolved before it fires. Follow it top-to-bottom on a fresh Amplify app.

## Prerequisites

- Git repository pushed to GitHub (or GitLab / CodeCommit / Bitbucket). **Amplify zip-upload mode does not run `amplify.yml`** — it only serves pre-built static assets. You need a Git connection for the build to run.
- Nitro's `aws-amplify` preset configured in `vite.config.ts` (see `templates/vite.config.ts`).
- `amplify.yml` at repo root (see `templates/amplify.yml`).
- `scripts/inject-amplify-env.mjs` in place (see `templates/scripts/inject-amplify-env.mjs`).

## Step 1 — Create the Amplify app

1. Amplify Console → Create new app → Host web app → connect Git provider.
2. Select the repo and the branch you want to deploy (typically `main`).
3. **Enable "SSR app logs"** at creation time (the checkbox says something like "Allow Amplify to access CloudWatch"). If you forgot, you can enable it later: App settings → Monitoring → Hosting compute logs. Without this, the SSR Lambda still runs but its logs never reach CloudWatch — you will have zero visibility into runtime errors.
4. Amplify auto-detects `amplify.yml` at the repo root. Confirm in the "Build settings" preview.

## Step 2 — Set environment variables

Your app needs runtime env vars (API URLs, tokens, etc). These are set in the Amplify Console but need to be **propagated to the SSR Lambda** (see Step 4).

1. App settings → **Hosting → Environment variables → Manage variables**.
2. Add each var (key + value). Match the names used in `src/server/env.ts` and listed in `scripts/inject-amplify-env.mjs`.
3. Branch scope: leave as "All branches" unless you have per-branch overrides.
4. For secrets (API tokens), the console has a "mark as secret" toggle — use it for anything sensitive so values don't print in build logs.

## Step 3 — Deploy and verify the build produces a Lambda bundle

1. Commit and push to trigger the first build.
2. In the build log, after `npm run build`, you should see:
   - `.amplify-hosting/compute/default/server.js` written (Lambda entry)
   - `.amplify-hosting/deploy-manifest.json` written (tells Amplify to provision a Lambda)
3. Next the inject script runs: `Injected N env vars into .amplify-hosting/compute/default/server.js`. If this line is missing, check `amplify.yml` — the step must be in the `build.commands` list.
4. If the log says "No computeResources" or ".amplify-hosting does not exist", the Nitro preset didn't kick in. Check `vite.config.ts` — it must be `nitro({ preset: 'aws-amplify' })` as a plugin at the correct position.

## Step 4 — Verify env vars reach the Lambda

After the first page request:

1. AWS Console → CloudWatch → Log groups (in the **same region** as the Amplify app).
2. Find `/aws/amplify/<app-id>/<branch>/...`. Log groups appear on first Lambda invocation and can take up to ~2 minutes.
3. If you see the error `Missing required env var: FOO`:
   - Check the build log: did the inject script report the right count?
   - Pull `.amplify-hosting/compute/default/server.js` from a local build (`npm run build`) and verify the `process.env` preamble is prepended correctly.
   - Confirm the env var name in the Amplify Console exactly matches `FORWARDED` in the inject script.

## Gotchas we hit, in order

1. **Zip upload doesn't deploy server functions.** Amplify's zip-upload mode is static-only and ignores `amplify.yml`. Use Git-connected builds.
2. **Default Node version is too old.** `@tanstack/react-start` requires Node >= 22.12. Amplify's default `nvm install 20` triggers `EBADENGINE` warnings and can fail in subtle ways. `amplify.yml` must pin `nvm install 24` (Node 24 also ships with npm 11, matching lockfiles generated on modern local dev).
3. **npm version mismatch.** If you generate a lockfile on npm 11 locally and Amplify runs npm 10, you can hit `npm ci` "out of sync" errors. Using Node 24 avoids this — it bundles npm 11.
4. **Do not run `npm install -g npm@11`** in the build. It self-upgrades npm mid-install and often breaks with `MODULE_NOT_FOUND: promise-retry`. Just use Node 24.
5. **Nitro preset must be explicit.** Without `preset: 'aws-amplify'`, Nitro's default `node` preset outputs to `.output/` and Amplify has nothing to deploy as compute. The plugin call is:
   ```ts
   nitro({ preset: 'aws-amplify' })
   ```
   **Not** `nitro({ config: { preset: ... } })` (wrong shape) and **not** `tanstackStart({ target: 'aws-amplify' })` (not a valid option).
6. **Env vars don't auto-propagate to the SSR Lambda.** Vars set in the Amplify Console reach the build shell via SSM, but Nitro's `aws-amplify` preset emits a `deploy-manifest.json` with no `env` field on `computeResources` — Amplify's schema doesn't support it. The Lambda boots with nothing in `process.env` beyond AWS infra vars.
7. **Bridge env vars into the Lambda entry file.** The inject script prepends `process.env.X = "..."` assignments to `.amplify-hosting/compute/default/server.js`. Those execute before `import("./index.mjs")`, so the Nitro handler and any server functions see the vars. Values are embedded as plaintext in the bundle — acceptable because only the app's IAM role can read the bundle anyway.
8. **SSR app logs are off by default.** Without enabling them, CloudWatch stays empty even when the Lambda is invoked and throwing. You'll see errors in the browser but nothing server-side to diagnose with.
9. **Log groups are lazy.** They appear on first Lambda invocation, not at deploy time. And in the **region of the app**, not always `us-east-1`. If you can't find the group, double-check the region selector.
10. **`Failed to set up process.env.secrets`** in the build log is usually benign — it means no Amplify Secrets are configured (different from Environment variables). Ignore unless you're actually using Amplify Secrets.

## Quick diagnostic: is the Lambda getting env vars?

Temporarily add to `src/server/env.ts` (or your equivalent env validator):

```ts
function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    const appKeys = Object.keys(process.env).filter((k) => k.startsWith('MY_APP_PREFIX_'))
    console.log('[env] expected keys present:', appKeys)
    console.log('[env] total env key count:', Object.keys(process.env).length)
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}
```

In CloudWatch, this prints names only (not values), so it's safe. If the filtered keys list is empty, the inject script didn't run or wrote to the wrong file. If the keys are present but values are missing, the bridge is broken.

Remove the diagnostic once things work.
