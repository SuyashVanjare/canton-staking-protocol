# Canton Staking Protocol: Economic Model

This document outlines the core economic principles, formulas, and parameters governing the Canton Staking Protocol. The model is designed to secure the network by incentivizing token holders to stake their assets with reliable validators, while penalizing malicious or negligent behavior.

## Core Concepts

*   **Epoch:** A fixed period of time (e.g., 24 hours) used as a unit for calculating rewards and evaluating validator performance.
*   **Delegator:** A token holder who stakes their tokens with a validator to earn rewards.
*   **Validator:** A network participant responsible for validating transactions and creating new blocks. They run a full node and bond their own tokens as a security deposit.
*   **Validator Pool:** The total sum of a validator's self-bonded stake and all tokens delegated to them.
*   **Commission:** A percentage of the rewards earned by a validator's pool that is kept by the validator as a fee for their services.

## Key Parameters

| Parameter                   | Value              | Description                                                                 |
| --------------------------- | ------------------ | --------------------------------------------------------------------------- |
| Epoch Duration              | 24 hours           | The time interval for reward calculation and distribution.                    |
| Unbonding Period            | 21 days            | The cooldown period required before unstaked tokens become transferable.      |
| Max Validators              | 100                | The maximum number of active validators in the network.                       |
| Min Self-Delegation         | 1,000 TOKEN        | The minimum amount a validator must stake for themselves.                     |
| Downtime Window             | 10,000 blocks      | The number of recent blocks checked for validator liveness.                   |
| Min Signed Blocks Threshold | 50%                | A validator must have signed at least this percentage of blocks in the window.|
| Double-Signing Penalty      | 5.0%               | Penalty for Byzantine faults (e.g., signing two blocks at the same height).   |
| Downtime Penalty            | 0.5%               | Penalty for liveness faults (e.g., missing too many blocks).                  |

---

## Reward Distribution

Rewards are distributed at the end of each epoch to validators and their delegators. The total rewards available in an epoch are determined by a combination of network inflation and transaction fees.

### 1. Pool Reward Calculation

The total reward for a specific validator pool for an epoch is calculated based on its proportional stake in the network, adjusted for uptime.

**Formula:**

```
PoolEpochReward = TotalEpochProvision * (PoolTotalStake / NetworkTotalStaked)
```

Where:
*   `TotalEpochProvision`: The total amount of new tokens created for rewards in the current epoch.
*   `PoolTotalStake`: The total amount of tokens staked in the validator's pool (self-bonded + delegated).
*   `NetworkTotalStaked`: The total amount of tokens staked across all validator pools in the network.

*Note: This reward is only distributed if the validator has not been slashed for downtime in the epoch.*

### 2. Validator Commission

The validator takes a commission from the pool's total reward before it is distributed to delegators.

**Formula:**

```
ValidatorCommission = PoolEpochReward * ValidatorCommissionRate
```

### 3. Delegator Reward Calculation

The remaining rewards are distributed pro-rata among all delegators (including the validator's self-delegation).

**Formula:**

```
DelegatorShare = (PoolEpochReward - ValidatorCommission) * (DelegatorIndividualStake / PoolTotalStake)
```

---

## Unbonding and Redelegation

To maintain network stability and prevent long-range attacks, tokens that are unstaked must go through an **unbonding period**.

*   **Duration:** 21 days.
*   **Process:** When a delegator initiates an unbonding, their tokens are moved into an `Unbonding` state.
*   **Restrictions:** During this period, the tokens:
    *   Do not earn rewards.
    *   Are still subject to slashing if the validator they were bonded to commits a slashable offense during this period.
    *   Cannot be transferred or spent.
*   **Completion:** After 21 days, the tokens are released and become fully liquid in the delegator's account.

Delegators can choose to **redelegate** their stake from one validator to another. This action is immediate and does not trigger the 21-day unbonding period, allowing for seamless switching between validators. However, a redelegated stake cannot be redelegated again for 21 days.

---

## Slashing

Slashing is the mechanism by which validators and their delegators are punished for misbehavior. A portion of their staked tokens is permanently destroyed.

### Slashable Offenses

1.  **Byzantine Fault (Double-Signing)**
    *   **Condition:** A validator signs two different blocks at the same blockchain height. This is a severe security violation.
    *   **Penalty:** `5.0%` of the total stake in the validator's pool is destroyed.
    *   **Status:** The validator is permanently "tombstoned" and can never re-join the active validator set.

2.  **Liveness Fault (Downtime)**
    *   **Condition:** A validator fails to sign at least `50%` of the blocks within the last `10,000` block window. This indicates their node is offline or failing.
    *   **Penalty:** `0.5%` of the total stake in the validator's pool is destroyed.
    *   **Status:** The validator is "jailed" for a minimum of 24 hours. They will not be considered for block production and will not earn rewards during this time. They must submit an `unjail` transaction after the period expires to rejoin the active set.