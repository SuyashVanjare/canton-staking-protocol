import { ContractId, Party, Decimal, Time } from '@daml/types';

// =========================================================================================
// Constants and Configuration
// =========================================================================================

const JSON_API_URL = process.env.REACT_APP_JSON_API_URL || 'http://localhost:7575';
const TEMPLATE_IDS = {
    ValidatorPool: 'Staking:ValidatorPool',
    Delegation: 'Staking:Delegation',
    UnbondingRequest: 'Staking:UnbondingRequest',
    AccruedReward: 'Reward:AccruedReward',
};

// =========================================================================================
// Type Definitions (mirroring Daml templates)
// =========================================================================================

export interface DamlContract<T> {
    contractId: ContractId<T>;
    templateId: string;
    payload: T;
}

export interface ValidatorPool {
    validator: Party;
    operator: Party;
    poolId: string;
    tokenSymbol: string;
    totalStaked: Decimal;
    commissionRate: Decimal;
    maxCommissionRate: Decimal;
    lastCommissionUpdateTime: Time;
}

export interface Delegation {
    delegator: Party;
    validator: Party;
    poolId: string;
    stakedAmount: Decimal;
    initialStakeTime: Time;
}

export interface UnbondingRequest {
    delegator: Party;
    validator: Party;
    poolId: string;
    amount: Decimal;
    unlockTime: Time;
}

export interface AccruedReward {
    delegator: Party;
    validator: Party;
    poolId: string;
    rewardAmount: Decimal;
}

// =========================================================================================
// Generic API Fetcher
// =========================================================================================

/**
 * A generic fetch wrapper for the Daml JSON API.
 * @param endpoint The API endpoint (e.g., '/v1/query').
 * @param token The JWT for authentication.
 * @param body The request body.
 * @returns The JSON response from the API.
 */
async function apiFetch(endpoint: string, token: string, body: object): Promise<any> {
    const response = await fetch(`${JSON_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Daml API Error:', errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    return response.json();
}

// =========================================================================================
// Query Functions
// =========================================================================================

/**
 * Fetches all active ValidatorPool contracts.
 * @param token The JWT for authentication.
 */
export const fetchValidatorPools = async (token: string): Promise<DamlContract<ValidatorPool>[]> => {
    const body = { templateIds: [TEMPLATE_IDS.ValidatorPool] };
    const response = await apiFetch('/v1/query', token, body);
    return response.result;
};

/**
 * Fetches all Delegation contracts for a specific delegator.
 * @param delegator The party whose delegations to fetch.
 * @param token The JWT for authentication.
 */
export const fetchDelegations = async (delegator: Party, token:string): Promise<DamlContract<Delegation>[]> => {
    const body = {
        templateIds: [TEMPLATE_IDS.Delegation],
        query: { delegator },
    };
    const response = await apiFetch('/v1/query', token, body);
    return response.result;
};

/**
 * Fetches all active UnbondingRequest contracts for a specific delegator.
 * @param delegator The party whose unbonding requests to fetch.
 * @param token The JWT for authentication.
 */
export const fetchUnbondingRequests = async (delegator: Party, token: string): Promise<DamlContract<UnbondingRequest>[]> => {
    const body = {
        templateIds: [TEMPLATE_IDS.UnbondingRequest],
        query: { delegator },
    };
    const response = await apiFetch('/v1/query', token, body);
    return response.result;
};

/**
 * Fetches all claimable AccruedReward contracts for a specific delegator.
 * @param delegator The party whose rewards to fetch.
 * @param token The JWT for authentication.
 */
export const fetchRewards = async (delegator: Party, token: string): Promise<DamlContract<AccruedReward>[]> => {
    const body = {
        templateIds: [TEMPLATE_IDS.AccruedReward],
        query: { delegator },
    };
    const response = await apiFetch('/v1/query', token, body);
    return response.result;
};

// =========================================================================================
// Command (Exercise) Functions
// =========================================================================================

/**
 * Delegates (stakes) a certain amount of tokens to a validator pool.
 * @param poolCid The contract ID of the ValidatorPool to delegate to.
 * @param delegator The party performing the delegation.
 * @param amount The amount to stake.
 * @param token The JWT for authentication.
 */
export const delegateToPool = async (
    poolCid: ContractId<ValidatorPool>,
    delegator: Party,
    amount: Decimal,
    token: string
): Promise<any> => {
    const body = {
        templateId: TEMPLATE_IDS.ValidatorPool,
        contractId: poolCid,
        choice: 'Delegate',
        argument: {
            delegator,
            amount,
        },
    };
    return apiFetch('/v1/exercise', token, body);
};

/**
 * Initiates the unbonding process for a staked amount.
 * @param delegationCid The contract ID of the Delegation to unbond from.
 * @param amountToUnbond The amount to unbond.
 * @param token The JWT for authentication.
 */
export const requestUnbond = async (
    delegationCid: ContractId<Delegation>,
    amountToUnbond: Decimal,
    token: string
): Promise<any> => {
    const body = {
        templateId: TEMPLATE_IDS.Delegation,
        contractId: delegationCid,
        choice: 'RequestUnbond',
        argument: { amountToUnbond },
    };
    return apiFetch('/v1/exercise', token, body);
};

/**
 * Withdraws unbonded tokens after the cooldown period has passed.
 * @param unbondingRequestCid The contract ID of the UnbondingRequest to withdraw.
 * @param token The JWT for authentication.
 */
export const withdrawUnbondedTokens = async (
    unbondingRequestCid: ContractId<UnbondingRequest>,
    token: string
): Promise<any> => {
    const body = {
        templateId: TEMPLATE_IDS.UnbondingRequest,
        contractId: unbondingRequestCid,
        choice: 'Withdraw',
        argument: {},
    };
    return apiFetch('/v1/exercise', token, body);
};

/**
 * Claims accrued rewards from a validator.
 * @param rewardCid The contract ID of the AccruedReward to claim.
 * @param token The JWT for authentication.
 */
export const claimRewards = async (
    rewardCid: ContractId<AccruedReward>,
    token: string
): Promise<any> => {
    const body = {
        templateId: TEMPLATE_IDS.AccruedReward,
        contractId: rewardCid,
        choice: 'ClaimReward',
        argument: {},
    };
    return apiFetch('/v1/exercise', token, body);
};