#!/usr/bin/env bash
set -euo pipefail

# Deploy the Amplify CloudFormation stack.
#
# Usage:
#   AWS_PROFILE=my-profile AWS_REGION=us-east-1 ./deploy.sh <stack-name> [parameters.json]
#
# Defaults:
#   - parameters file: parameters.json (next to this script)
#   - region: $AWS_REGION or $AWS_DEFAULT_REGION (must be set in env or via profile)
#
# The script uses --no-fail-on-empty-changeset so re-running with no diff is a no-op.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/amplify.yaml"

STACK_NAME="${1:-}"
PARAMS_FILE="${2:-${SCRIPT_DIR}/parameters.json}"

if [[ -z "${STACK_NAME}" ]]; then
  echo "Usage: $0 <stack-name> [parameters.json]" >&2
  exit 1
fi

if [[ ! -f "${PARAMS_FILE}" ]]; then
  echo "Parameters file not found: ${PARAMS_FILE}" >&2
  echo "Copy parameters.example.json to parameters.json and fill it in." >&2
  exit 1
fi

aws cloudformation deploy \
  --template-file "${TEMPLATE}" \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides "file://${PARAMS_FILE}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query 'Stacks[0].Outputs' \
  --output table
