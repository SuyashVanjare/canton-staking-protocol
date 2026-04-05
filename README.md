# Canton Staking Protocol

[![CI](https://github.com/your-org/canton-staking-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/canton-staking-protocol/actions/workflows/ci.yml)

A decentralized token staking and rewards distribution protocol built with Daml smart contracts for the Canton Network. This project provides the on-ledger infrastructure for validators to create staking pools, for delegators to stake tokens, and for the automated distribution of rewards.

The protocol is designed to be secure, transparent, and auditable, leveraging Canton's privacy and interoperability features.

For a detailed explanation of the economic model, please see [docs/STAKING_MODEL.md](./docs/STAKING_MODEL.md).

## Core Concepts

*   **Validator Pool:** A contract managed by a validator operator. Delegators stake their tokens to a specific pool.
*   **Delegation:** A contract representing a delegator's staked amount in a specific validator pool. It accrues rewards over time.
*   **Rewards:** Calculated and distributed based on the validator's performance and the total amount staked in the pool.
*   **Unbonding:** The process of initiating a withdrawal of staked tokens. This involves a time-locked cooldown period to ensure network stability.
*   **Slashing:** An automated penalty mechanism that reduces a validator's (and their delegators') stake in case of misbehavior, such as significant downtime or double-signing.

---

## Quickstart for Validators

This guide will walk you through setting up a local development environment, starting a Canton ledger, and creating your own validator pool.

### Prerequisites

*   Daml SDK v3.1.0 ([Installation Guide](https://docs.daml.com/getting-started/installation.html))
*   Java 11 or higher
*   Node.js v18.x or higher

### 1. Clone and Build

First, clone the repository and build the Daml contracts into a `.dar` file.

```bash
git clone https://github.com/your-org/canton-staking-protocol.git
cd canton-staking-protocol
daml build
```

This command compiles your Daml code and packages it into `.daml/dist/canton-staking-protocol-0.1.0.dar`.

### 2. Start a Local Ledger

Run a local Canton ledger instance. This will also start the JSON API server, which the frontend uses to interact with the contracts.

```bash
daml start
```

Keep this terminal window open. The ledger will be running on `localhost:6865` and the JSON API on `localhost:7575`.

### 3. Initialize the Protocol (On-Ledger)

We'll use a Daml Script to bootstrap the ledger with the necessary parties and initial contracts. Open a **new terminal window** in the project root.

The following script will:
1.  Allocate parties for a `Validator`, a `Delegator`, and a `Treasury`.
2.  Create a `ValidatorPool.Setup` contract, which allows the `Validator` to configure and launch their pool.

```bash
daml script \
  --dar .daml/dist/canton-staking-protocol-0.1.0.dar \
  --script-name Staking.Setup:initializeParties \
  --ledger-host localhost \
  --ledger-port 6865 \
  --party Validator \
  --party Delegator1 \
  --party Treasury
```

### 4. Create Your Validator Pool

Now, as the `Validator`, you can exercise the `CreatePool` choice on the `ValidatorPool.Setup` contract to launch your pool.

```bash
# This script finds the setup contract and creates the pool
daml script \
  --dar .daml/dist/canton-staking-protocol-0.1.0.dar \
  --script-name Staking.Setup:runValidatorSetup \
  --ledger-host localhost \
  --ledger-port 6865 \
  --party Validator
```

Your validator pool is now active on the ledger and ready to accept delegations.

### 5. Run the Frontend

The project includes a React-based frontend for a user-friendly way to interact with the protocol.

```bash
cd frontend
npm install
npm start
```

Navigate to `http://localhost:3000` in your browser. You can use the UI to view validator pools, delegate tokens (as `Delegator1`), and claim rewards.

## Project Structure

```
.
├── daml/                     # Daml smart contract source code
│   ├── Staking/
│   │   ├── Delegation.daml   # Delegation and Unbonding logic
│   │   ├── Reward.daml       # Reward calculation and claims
│   │   └── Validator.daml    # Validator Pool and Slashing logic
│   └── Staking/Setup.daml    # Daml Scripts for initialization
├── frontend/                 # React frontend application
├── docs/                     # Project documentation
├── .github/                  # GitHub Actions CI workflow
├── daml.yaml                 # Daml project configuration
└── README.md                 # This file
```

## Contributing

Contributions are welcome! Please follow the standard GitHub flow:
1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/my-new-feature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin feature/my-new-feature`).
5.  Create a new Pull Request.

## License

This project is licensed under the Apache 2.0 License. See the LICENSE file for details.