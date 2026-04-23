#!/bin/bash

# ==============================================================================
# Creates a new validator staking pool on the ledger.
#
# This script exercises the `CreateValidatorPool` choice on the central
# `Staking.Factory:Factory` contract. It can either take the factory contract
# ID directly or query for it if the factory owner's party ID is provided.
#
# Usage:
#   ./scripts/create-pool.sh \
#     --factory-cid <FACTORY_CONTRACT_ID> \
#     --operator <VALIDATOR_PARTY_ID> \
#     --operator-name "My Validator" \
#     --commission 0.05 \
#     --min-delegation 10000.0 \
#     --stake-token-tid "pkgid:Module:Entity"
#
# Alternate usage (auto-discover factory contract):
#   ./scripts/create-pool.sh \
#     --factory-owner <FACTORY_OWNER_PARTY_ID> \
#     --operator <VALIDATOR_PARTY_ID> \
#     --operator-name "My Validator" \
#     # ... other args
#
# Arguments:
#   --factory-cid      (Optional) The contract ID of the Staking.Factory:Factory contract.
#   --factory-owner    (Optional) The party ID of the factory owner. Used to find the factory if --factory-cid is not given.
#   --operator         (Required) The party ID of the validator operator.
#   --operator-name    (Required) The human-readable name of the pool.
#   --commission       (Required) The commission rate on rewards (e.g., 0.05 for 5%).
#   --min-delegation   (Required) The minimum required self-delegation amount.
#   --stake-token-tid  (Required) The full template ID of the stakeable token, in format 'package_id:ModuleName:EntityName'.
#   --host             (Optional) The ledger host. Default: localhost.
#   --port             (Optional) The JSON API port. Default: 7575.
#   --token-file       (Optional) Path to a JSON file mapping party IDs to JWTs. Default: build/user-tokens.json.
# ==============================================================================

set -euo pipefail

# --- Defaults ---
LEDGER_HOST="localhost"
LEDGER_PORT="7575"
TOKEN_FILE_PATH="build/user-tokens.json"
FACTORY_CID=""
FACTORY_OWNER=""

# --- Argument Parsing ---
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --factory-cid)
      FACTORY_CID="$2"
      shift 2
      ;;
    --factory-owner)
      FACTORY_OWNER="$2"
      shift 2
      ;;
    --operator)
      OPERATOR_PARTY_ID="$2"
      shift 2
      ;;
    --operator-name)
      OPERATOR_NAME="$2"
      shift 2
      ;;
    --commission)
      COMMISSION_RATE="$2"
      shift 2
      ;;
    --min-delegation)
      MIN_DELEGATION="$2"
      shift 2
      ;;
    --stake-token-tid)
      STAKE_TOKEN_TID="$2"
      shift 2
      ;;
    --host)
      LEDGER_HOST="$2"
      shift 2
      ;;
    --port)
      LEDGER_PORT="$2"
      shift 2
      ;;
    --token-file)
      TOKEN_FILE_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# --- Validation ---
if [ -z "${OPERATOR_PARTY_ID-}" ] || \
   [ -z "${OPERATOR_NAME-}" ] || \
   [ -z "${COMMISSION_RATE-}" ] || \
   [ -z "${MIN_DELEGATION-}" ] || \
   [ -z "${STAKE_TOKEN_TID-}" ]; then
  echo "Error: Missing required arguments: --operator, --operator-name, --commission, --min-delegation, --stake-token-tid"
  exit 1
fi

if [ -z "$FACTORY_CID" ] && [ -z "$FACTORY_OWNER" ]; then
  echo "Error: Must provide either --factory-cid or --factory-owner to locate the factory contract."
  exit 1
fi

# --- Helper Functions ---
function get_party_token() {
  local party_id="$1"

  if [ ! -f "$TOKEN_FILE_PATH" ]; then
    echo "Error: Token file not found at '$TOKEN_FILE_PATH'."
    echo "Please specify a valid path with --token-file or create the default file."
    exit 1
  fi

  # Extracts the JWT for the given party ID from a file with format: {"partyId": "jwt", ...}
  local token=$(jq -r --arg party "$party_id" '.[$party]' "$TOKEN_FILE_PATH")

  if [ -z "$token" ] || [ "$token" == "null" ]; then
    echo "Error: Could not find a token for party '$party_id' in '$TOKEN_FILE_PATH'."
    exit 1
  fi

  echo "$token"
}

# --- Main Logic ---

# 1. Get Authentication Token for the operator (the controller of the choice)
echo "Getting JWT for operator '$OPERATOR_PARTY_ID'..."
OPERATOR_TOKEN=$(get_party_token "$OPERATOR_PARTY_ID")
echo "Successfully obtained JWT for operator."

# 2. Find the main package ID from the project's DAR file
echo "Locating project DAR file..."
DAR_FILE=$(find .daml/dist -name "canton-staking-protocol-*.dar" | head -n 1)
if [ -z "$DAR_FILE" ]; then
    echo "Error: Could not find project DAR file in .daml/dist/. Please run 'dpm build' first."
    exit 1
fi
echo "Using DAR file: $DAR_FILE"
MAIN_PKG_ID=$(dpm damlc inspect-dar --json "$DAR_FILE" | jq -r .main_package_id)
echo "Project main package ID: $MAIN_PKG_ID"

# 3. Find Factory Contract ID if not provided
if [ -z "$FACTORY_CID" ]; then
  echo "Factory CID not provided. Querying for factory contract owned by '$FACTORY_OWNER'..."
  FACTORY_OWNER_TOKEN=$(get_party_token "$FACTORY_OWNER")

  QUERY_PAYLOAD=$(printf '{ "templateIds": ["%s:Staking.Factory:Factory"] }' "$MAIN_PKG_ID")

  API_URL="http://${LEDGER_HOST}:${LEDGER_PORT}/v1/query"
  QUERY_RESPONSE=$(curl --silent --show-error -X POST "$API_URL" \
    -H "Authorization: Bearer $FACTORY_OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$QUERY_PAYLOAD")

  # Assuming there's only one factory contract for this owner
  FACTORY_CID=$(echo "$QUERY_RESPONSE" | jq -r '.result[0].contractId')

  if [ -z "$FACTORY_CID" ] || [ "$FACTORY_CID" == "null" ]; then
    echo "Error: Could not find an active Staking.Factory:Factory contract for owner '$FACTORY_OWNER'."
    echo "Response from query: $QUERY_RESPONSE"
    exit 1
  fi
  echo "Found factory contract with CID: $FACTORY_CID"
fi

# 4. Construct JSON Payload
IFS=':' read -r TOKEN_PKG_ID TOKEN_MODULE TOKEN_ENTITY <<< "$STAKE_TOKEN_TID"
if [ -z "$TOKEN_PKG_ID" ] || [ -z "$TOKEN_MODULE" ] || [ -z "$TOKEN_ENTITY" ]; then
  echo "Error: --stake-token-tid must be in the format 'package_id:ModuleName:EntityName'."
  exit 1
fi

JSON_PAYLOAD=$(cat <<EOF
{
  "templateId": {
    "packageId": "$MAIN_PKG_ID",
    "moduleName": "Staking.Factory",
    "entityName": "Factory"
  },
  "contractId": "$FACTORY_CID",
  "choice": "CreateValidatorPool",
  "argument": {
    "operator": "$OPERATOR_PARTY_ID",
    "operatorName": "$OPERATOR_NAME",
    "stakeToken": {
      "packageId": "$TOKEN_PKG_ID",
      "moduleName": "$TOKEN_MODULE",
      "entityName": "$TOKEN_ENTITY"
    },
    "commissionRate": "$COMMISSION_RATE",
    "minSelfDelegation": "$MIN_DELEGATION"
  }
}
EOF
)

# 5. Send Request to JSON API
API_URL="http://${LEDGER_HOST}:${LEDGER_PORT}/v1/exercise"
echo "Submitting command to create validator pool..."
echo "URL: $API_URL"
echo "Payload:"
echo "$JSON_PAYLOAD" | jq .

HTTP_RESPONSE=$(curl --silent --show-error --location --request POST "$API_URL" \
--header "Authorization: Bearer $OPERATOR_TOKEN" \
--header 'Content-Type: application/json' \
--data-raw "$JSON_PAYLOAD" \
--write-out "HTTP_STATUS:%{http_code}")

# 6. Process Response
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -e 's/HTTP_STATUS:.*//g')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "Successfully created validator pool!"
  echo "Response:"
  echo "$HTTP_BODY" | jq .
  exit 0
else
  echo "Error: Failed to create validator pool. HTTP Status: $HTTP_STATUS"
  echo "Response:"
  echo "$HTTP_BODY" | jq .
  exit 1
fi