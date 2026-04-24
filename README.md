# Canton Staking Protocol

[![CI](https://github.com/your-org/canton-staking-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/canton-staking-protocol/actions/workflows/ci.yml)

This project provides a reference implementation for a token staking and rewards distribution protocol on Canton Network. It allows token holders (Delegators) to delegate their tokens to Validators, who operate infrastructure for the network. In return, Delegators earn rewards. The protocol includes mechanisms for unbonding (withdrawing stake) and slashing (penalizing misbehavior) to ensure network security and liveness.

This implementation is written in Daml, the smart contract language for Canton, and is designed to be secure, private, and composable.

## Core Concepts

The protocol is built around several key concepts and roles:

*   **Validators:** Entities responsible for running network nodes. They create `StakingPool` contracts to attract stake from Delegators. Their performance is subject to slashing conditions.
*   **Delegators:** Token holders who stake their assets to one or more Validator pools to earn a share of the network rewards.
*   **Staking Pool:** A central contract for each Validator, which aggregates all delegated stake, tracks reward rates, and manages distributions.
*   **Delegation:** A contract representing a specific Delegator's stake in a specific Validator's pool. This contract accrues rewards over time.
*   **Rewards:** Rewards are calculated based on the amount staked and the duration. The precise reward logic can be configured. See `docs/STAKING_MODEL.md` for a detailed breakdown of the APY calculations.
*   **Unbonding:** When a Delegator wishes to withdraw their stake, they initiate an unbonding process. The stake is locked for a pre-defined cooldown period before it can be fully withdrawn, preventing abrupt shocks to the network's economic security. This is managed by the `Unbonding.daml` module.
*   **Slashing:** Validators can be penalized for misbehavior, such as significant downtime or malicious actions. A portion of their (and their delegators') stake is forfeited. This mechanism incentivizes reliable validator operations.

## Project Structure

```
.
├── daml/                      # Main Daml source code
│   ├── StakingPool.daml       # Core validator pool template
│   ├── Delegation.daml        # Delegator's stake position
│   ├── Unbonding.daml         # Manages the unstaking cooldown period
│   ├── Slashing.daml          # Defines slashing conditions and logic
│   └── test/                  # Daml Script tests
│       ├── StakingTest.daml
│       └── SlashingTest.daml
├── frontend/                  # Example TypeScript UI application
│   └── src/
│       ├── App.tsx
│       └── RewardChart.tsx    # Component for visualizing rewards
├── docs/
│   └── STAKING_MODEL.md       # Detailed documentation on the economic model
├── daml.yaml                  # Daml project configuration
└── README.md                  # This file
```

## Prerequisites

To build and run this project, you will need:

*   **DPM (Digital Asset Package Manager):** The official package manager and build tool for Canton/Daml. Install it by running:
    ```sh
    curl https://get.digitalasset.com/install/install.sh | sh
    ```
*   **Node.js and npm:** For running the frontend application (optional).

## Quickstart Guide

Follow these steps to get the protocol running on a local Canton ledger.

### 1. Clone the Repository

```sh
git clone https://github.com/your-org/canton-staking-protocol.git
cd canton-staking-protocol
```

### 2. Build the Daml Contracts

Compile the Daml code into a DAR (Daml Archive) file. DPM will automatically fetch all necessary dependencies.

```sh
dpm build
```

The output will be located at `.daml/dist/canton-staking-protocol-0.1.0.dar`.

### 3. Run the Tests

Execute the Daml Script tests to verify the contract logic is correct.

```sh
dpm test
```

### 4. Start a Local Canton Ledger

Run a local Canton sandbox environment. This command starts a ledger with both a gRPC API on port `6866` and a JSON API on port `7575`.

```sh
dpm sandbox
```

The ledger will run in the foreground. Keep this terminal open.

### 5. Interact with the Contracts (via Daml Script)

In a new terminal, you can use Daml Script to upload the DAR and run setup scripts. For example, to run the setup in `daml/test/StakingTest.daml`:

```sh
dpm test --files daml/test/StakingTest.daml -- --script-name stakingWorkflow
```

This script will:
1.  Allocate parties for a Validator and a Delegator.
2.  Create a `StakingPool`.
3.  Simulate a Delegator staking tokens.
4.  Simulate reward accrual and claiming.
5.  Initiate an unbonding request.

## Key Operations

Here's a high-level overview of the primary interactions with the protocol.

#### As a Validator

1.  **Initialize a Pool:** The Validator creates a `StakingPool` contract, defining parameters like the commission rate.
2.  **Manage Pool:** The Validator is responsible for maintaining the node's uptime to avoid being slashed. They can also update metadata about their pool.

#### As a Delegator

1.  **Discover Pools:** The Delegator queries the ledger for active `StakingPool` contracts.
2.  **Delegate (Stake):** The Delegator chooses a pool and exercises the `Delegate` choice, locking their tokens and creating a `Delegation` contract.
3.  **Claim Rewards:** The Delegator can periodically exercise the `ClaimRewards` choice on their `Delegation` contract to transfer accrued rewards to their account.
4.  **Unbond (Unstake):** The Delegator initiates the unbonding process by exercising the `RequestUnbonding` choice. This archives the `Delegation` contract and creates an `UnbondingDelegation` contract, starting the cooldown timer.
5.  **Withdraw:** After the cooldown period has passed, the Delegator can exercise the `Withdraw` choice to reclaim their original stake.

## Contributing

Contributions are welcome! Please follow the standard GitHub flow:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b my-new-feature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin my-new-feature`).
5.  Create a new Pull Request.

Please open an issue first to discuss any significant changes.

## License

This project is licensed under the Apache License 2.0. See the `LICENSE` file for details.