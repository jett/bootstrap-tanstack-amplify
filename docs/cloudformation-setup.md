# CloudFormation setup

`templates/cloudformation/amplify.yaml` provisions the Amplify Hosting side of a TanStack Start project — App, Branch, service role for logs, and an SSR compute role — in one stack.

It deliberately does **not** create DDB tables, S3 buckets, or any app-level infra. The compute role starts with no permissions; you grant it what it needs as the app grows.

## What the stack creates

| Resource | Purpose |
| --- | --- |
| `AWS::IAM::Role` (service role) | Lets Amplify Hosting write build/SSR logs to CloudWatch. Solves the "SSR app logs are off by default" gotcha at deploy time instead of via the console. |
| `AWS::IAM::Role` (compute role) | The runtime IAM identity of the SSR Lambda. Empty by default — extend it when the app needs DDB, S3, SSM, etc. |
| `AWS::Amplify::App` | Platform `WEB_COMPUTE`, wired to the repo, with both roles attached. |
| `AWS::Amplify::Branch` | One branch (default `main`), `EnableAutoBuild: true`, also references the compute role so per-branch overrides work later. |

The build spec is **not** set in CFN — Amplify auto-detects `amplify.yml` from the repo root. Keeping it there avoids drift between the template and the file devs actually edit.

## Prerequisites

1. **Repo pushed to GitHub** (or GitLab / Bitbucket — the same template works, but the auth section below is GitHub-specific).
2. **AWS credentials** with permissions to create IAM roles and Amplify apps. The CLI must have `CAPABILITY_NAMED_IAM` available — `deploy.sh` passes this.
3. **One of the GitHub auth options below.**

### GitHub auth: pick one

**Option A — AWS Amplify GitHub App (recommended).** Authorize the AWS Amplify GitHub App for your AWS account once via the Amplify Console: open *Amplify Console → Create new app → GitHub → Authorize*, then cancel out of the wizard. After that, CFN-created Amplify apps in this account can attach to any repo the GitHub App is installed on without an access token. Leave `AccessToken` blank in `parameters.json`.

**Option B — Fine-grained PAT.** Create a GitHub fine-grained personal access token scoped to the repo with `Contents: Read` and `Metadata: Read`. Pass it as `AccessToken`. The parameter is `NoEcho`, so it never appears in stack events or describe output, but it is stored in your local `parameters.json` — keep that file out of git.

If both are configured, the explicit `AccessToken` wins.

## Deploy

```bash
cd templates/cloudformation
cp parameters.example.json parameters.json
# edit parameters.json — fill in AppName, RepositoryUrl, branch, optional access token

AWS_PROFILE=your-profile AWS_REGION=us-east-1 ./deploy.sh my-app-stack
```

The script runs `aws cloudformation deploy` with `--no-fail-on-empty-changeset`, then prints the outputs:

- `AppId` — the Amplify app ID
- `DefaultDomain` — `https://<branch>.<appid>.amplifyapp.com`
- `ComputeRoleArn` / `ComputeRoleName` — the role you'll extend below

After the stack is created, push a commit to the configured branch to trigger the first build. Amplify Hosting picks up `amplify.yml` from the repo root automatically.

## Adding permissions to the compute role

When the app starts needing AWS access, attach a managed policy or add an inline policy to the compute role. Two options:

### Inline policy (preferred for app-specific access)

```bash
aws iam put-role-policy \
  --role-name "$(aws cloudformation describe-stacks \
      --stack-name my-app-stack \
      --query 'Stacks[0].Outputs[?OutputKey==`ComputeRoleName`].OutputValue' \
      --output text)" \
  --policy-name AppDdbAccess \
  --policy-document file://compute-role-ddb-policy.json
```

A minimal `compute-role-ddb-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/my-app-*"
    }
  ]
}
```

This keeps the CFN template generic and lets each app declare its own access pattern. For full IaC, move the inline policy declaration into `amplify.yaml` under `ComputeRole.Properties.Policies`.

### Managed policies (quick, broad)

Pass them via the stack parameter:

```json
{
  "ParameterKey": "ComputeRoleManagedPolicyArns",
  "ParameterValue": "arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess,arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
```

Useful for prototyping; tighten before production.

## Env vars: still set them in the console

The template intentionally does not manage `EnvironmentVariables` on the App.

The reason: env vars in this stack get baked into the SSR Lambda bundle by `scripts/inject-amplify-env.mjs` at build time (see `docs/amplify-deployment.md`). Editing them in the Amplify Console triggers a rebuild, which is the intended workflow. Putting them in CFN as well would create drift the moment anyone edits a value in the console.

If you want full IaC for env vars too, add `EnvironmentVariables` to `AmplifyApp.Properties` and stop editing them in the console.

## Updating and tearing down

- **Update the stack:** edit `amplify.yaml` or `parameters.json` and re-run `./deploy.sh`. Most properties (`ComputeRoleArn`, `ManagedPolicyArns`, etc.) update with no interruption.
- **Destroy the stack:** `aws cloudformation delete-stack --stack-name my-app-stack`. This removes the Amplify App, both IAM roles, and all branches. **Built artifacts and CloudWatch log groups are not deleted** — clean those up separately if you want a fully clean slate.

## What's still manual after CFN

- Authorizing the AWS Amplify GitHub App on the AWS account (one time).
- Setting environment variables in *Hosting → Environment variables* (deliberate, see above).
- Adding custom domains (`AWS::Amplify::Domain` is a separate resource — add it to the template if you want it managed here).
- Adding extra branches beyond the one created here.
