#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Create Validator Stake Pool Script
# ==============================================================================
#
# Description:
#   This script registers a new validator stake pool on the Canton network by
#   sending a `create` command for the `StakePool` template to the JSON API.
#
# Prerequisites:
#   - `curl`: To send HTTP requests.
#   - `jq`: To parse and pretty-print JSON responses.
#   - A running Canton network with the JSON API enabled.
#   - The canton-staking-protocol.dar must be uploaded to the participant node.
#
# Usage:
#   1. Configure the variables in the "Configuration" section below.
#   2. Make the script executable: `chmod +x scripts/create-pool.sh`
#   3. Run the script: `./scripts/create-pool.sh`
#
# ==============================================================================

# --- Configuration ---
# Adjust these variables to match your Canton environment and desired pool settings.

# The URL of the Canton JSON API endpoint.
JSON_API_URL="http://localhost:7575"

# The Ledger Party ID of the validator creating the pool.
# This party must be hosted on the participant node connected to the JSON API.
VALIDATOR="validator::1220a514400a0684d56126b8b0e897e9c5f61d56f5a3a7c669f9250f162095c10526"

# The Ledger Party ID of the pool operator. This can be the same as the validator.
OPERATOR="$VALIDATOR"

# A unique text identifier for the new staking pool.
POOL_ID="ValiantValidatorPool-01"

# The identifier for the asset/token being staked (e.g., a contract ID or a unique name).
STAKE_TOKEN_ASSET="CantonCoin"

# The commission rate the validator charges on rewards (e.g., "0.05" for 5%).
COMMISSION_RATE="0.05"

# The minimum amount of the stake token the validator must delegate to their own pool.
MIN_SELF_DELEGATION="1000.0"

# --- Authentication ---
# For local testing, we generate a simple, unsigned JWT.
# In a production environment, use a secure, signed token from your identity provider.
# The payload identifies the ledger and the party making the request (`actAs`).
LEDGER_ID="my-ledger" # Should match your ledger's ID
APPLICATION_ID="canton-staking-protocol" # Can be any identifier
PAYLOAD="{\"https://daml.com/ledger-api\": {\"ledgerId\": \"$LEDGER_ID\", \"applicationId\": \"$APPLICATION_ID\", \"actAs\": [\"$VALIDATOR\"]}}"

# Base64-encode the payload to create the token.
# Use -w0 on Linux, or `tr -d '\n'` on macOS for a single line output.
if [[ "$(uname)" == "Darwin" ]]; then
  JWT_TOKEN=$(echo -n "$PAYLOAD" | base64 | tr -d '\n')
else
  JWT_TOKEN=$(echo -n "$PAYLOAD" | base64 -w0)
fi


# --- Script Logic ---
echo "▶️  Preparing to create StakePool for Validator: $VALIDATOR"
echo "    - Pool ID:          $POOL_ID"
echo "    - Operator:         $OPERATOR"
echo "    - Commission:       $COMMISSION_RATE"
echo "    - Min Self-Stake:   $MIN_SELF_DELEGATION"
echo ""

# Get the current time in ISO 8601 format for the `lastRewardTime` field.
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# The templateId is specified as `Module:Template`. The JSON API resolves the package ID.
# Based on the project structure, the module is `StakePool`.
TEMPLATE_ID="StakePool:StakePool"

# Construct the JSON payload for the create command.
# The `delegators` field is a DA.Map, represented as a JSON object. We start with an empty map.
# `totalStaked` and `slashed` are initialized to their default starting values.
CREATE_PAYLOAD=$(cat <<EOF
{
  "templateId": "$TEMPLATE_ID",
  "payload": {
    "validator": "$VALIDATOR",
    "operator": "$OPERATOR",
    "poolId": "$POOL_ID",
    "stakeToken": "$STAKE_TOKEN_ASSET",
    "commissionRate": "$COMMISSION_RATE",
    "minSelfDelegation": "$MIN_SELF_DELEGATION",
    "totalStaked": "0.0",
    "delegators": {},
    "slashed": false,
    "lastRewardTime": "$CURRENT_TIME"
  }
}
EOF
)

echo "▶️  Sending create command to JSON API..."
# Use curl to send the POST request to the /v1/create endpoint.
# The -s flag silences progress output.
# The response is piped to jq for pretty-printing.
HTTP_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$JSON_API_URL/v1/create" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD")

# Extract the body and the status code
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n1)


echo "◀️  Received response (HTTP Status: $HTTP_STATUS):"
if [[ $HTTP_STATUS -ge 200 && $HTTP_STATUS -lt 300 ]]; then
  echo "$HTTP_BODY" | jq .
  echo ""
  echo "✅  StakePool creation command submitted successfully."
else
  echo "❌  Error: Failed to create StakePool."
  echo "$HTTP_BODY" | jq .
  exit 1
fi