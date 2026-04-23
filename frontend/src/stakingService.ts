import { ContractId } from '@daml/types';

// NOTE: This file assumes the existence of the following Daml templates and choices.
// The template IDs are hardcoded for simplicity but would typically come from a
// shared configuration or code generation.
//
// Template: Staking.StakePool
//   - Choice: Delegate (with { delegator: Party, tokenCid: ContractId Token.Token, amount: Decimal })
// Template: Staking.Delegation
//   - Choice: RequestUnbond (with { amountToUnbond: Decimal })
//   - Choice: ClaimReward
// Template: Unbonding.UnbondingRequest
//   - Choice: Claim
// Template: Token.Token (or similar fungible token contract)

const LEDGER_URL = process.env.REACT_APP_LEDGER_URL || 'http://localhost:7575';
const API_BASE = `${LEDGER_URL}/v1`;

const templateIds = {
  StakePool: 'Staking:StakePool',
  Delegation: 'Staking:Delegation',
  UnbondingRequest: 'Unbonding:UnbondingRequest',
  // Assuming a simple fungible token template for the stakeable asset
  FungibleToken: 'Token:Token',
};

// --- TYPE DEFINITIONS ---
// These interfaces represent the expected structure of the Daml contract payloads.

export interface ApiContract<T> {
  contractId: ContractId;
  templateId: string;
  payload: T;
}

export interface StakePool {
  operator: string;
  validator: string;
  stakedTokenSymbol: string;
  rewardTokenSymbol: string;
  totalStaked: string; // Decimal
  delegatorCount: string; // Int
  commissionRate: string; // Decimal
  lastRewardUpdate: string; // Time
}

export interface Delegation {
  delegator: string;
  validator: string;
  stakedAmount: string; // Decimal
  rewardDebt: string; // Decimal
}

export interface UnbondingRequest {
  delegator: string;
  validator: string;
  unbondingAmount: string; // Decimal
  availableAt: string; // Time
}

// --- PRIVATE HELPERS ---

/**
 * A helper function to wrap fetch calls to the JSON API, handling authorization
 * and error handling.
 * @param token The JWT token for authorization.
 * @param endpoint The API endpoint to call (e.g., '/query').
 * @param body The JSON body for the request.
 */
async function ledgerFetch(token: string, endpoint: string, body: object): Promise<any> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Ledger API request failed with status ${response.status}:`, errorBody);
    throw new Error(`Ledger API Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Performs a query against the ledger's active contract set.
 * @param token The JWT token for authorization.
 * @param templateId The template ID to query for.
 * @param query An optional query payload.
 */
async function queryLedger<T>(token: string, templateId: string, query: object = {}): Promise<ApiContract<T>[]> {
  const body = {
    templateIds: [templateId],
    query,
  };
  const result = await ledgerFetch(token, '/query', body);
  return result.result || [];
}

/**
 * Executes a choice on a given contract.
 * @param token The JWT token for authorization.
 * @param templateId The template ID of the contract.
 * @param contractId The ID of the contract to exercise the choice on.
 * @param choice The name of the choice to exercise.
 * @param argument The argument payload for the choice.
 */
async function exerciseChoice(token: string, templateId: string, contractId: ContractId, choice: string, argument: object): Promise<any> {
  const body = {
    templateId,
    contractId,
    choice,
    argument,
  };
  const result = await ledgerFetch(token, '/exercise', body);
  return result.result;
}


// --- PUBLIC SERVICE FUNCTIONS ---

/**
 * Fetches all available stake pools on the ledger.
 */
export const getStakePools = async (token: string): Promise<ApiContract<StakePool>[]> => {
  return queryLedger<StakePool>(token, templateIds.StakePool);
};

/**
 * Fetches all active delegations for a given party.
 */
export const getDelegationsByParty = async (token: string, party: string): Promise<ApiContract<Delegation>[]> => {
  return queryLedger<Delegation>(token, templateIds.Delegation, { delegator: party });
};

/**
 * Fetches all active unbonding requests for a given party.
 */
export const getUnbondingRequestsByParty = async (token: string, party: string): Promise<ApiContract<UnbondingRequest>[]> => {
  return queryLedger<UnbondingRequest>(token, templateIds.UnbondingRequest, { delegator: party });
};

/**
 * Stakes a given amount of a token into a validator's pool.
 * @param token The JWT token for authorization.
 * @param delegator The party who is staking.
 * @param validator The party of the validator's pool to stake into.
 * @param tokenCid The ContractId of the fungible token contract to be staked.
 * @param amount The decimal amount to stake.
 */
export const stakeTokens = async (token: string, delegator: string, validator: string, tokenCid: ContractId, amount: string): Promise<any> => {
  const pools = await queryLedger<StakePool>(token, templateIds.StakePool, { validator });
  if (pools.length === 0) {
    throw new Error(`No stake pool found for validator ${validator}`);
  }
  const pool = pools[0];

  return exerciseChoice(token, templateIds.StakePool, pool.contractId, 'Delegate', {
    delegator,
    tokenCid,
    amount,
  });
};

/**
 * Initiates the unbonding process for a portion of a delegation.
 * @param token The JWT token for authorization.
 * @param delegationCid The ContractId of the delegation to unbond from.
 * @param amountToUnbond The decimal amount to unbond.
 */
export const initiateUnbonding = async (token: string, delegationCid: ContractId, amountToUnbond: string): Promise<any> => {
  return exerciseChoice(token, templateIds.Delegation, delegationCid, 'RequestUnbond', {
    amountToUnbond,
  });
};

/**
 * Claims unbonded tokens that have passed their cooldown period.
 * @param token The JWT token for authorization.
 * @param unbondingRequestCid The ContractId of the completed UnbondingRequest.
 */
export const claimUnbondedTokens = async (token:string, unbondingRequestCid: ContractId): Promise<any> => {
  return exerciseChoice(token, templateIds.UnbondingRequest, unbondingRequestCid, 'Claim', {});
};

/**
 * Claims any accrued rewards from a delegation.
 * @param token The JWT token for authorization.
 * @param delegationCid The ContractId of the delegation to claim rewards from.
 */
export const claimRewards = async (token: string, delegationCid: ContractId): Promise<any> => {
  return exerciseChoice(token, templateIds.Delegation, delegationCid, 'ClaimReward', {});
};