import React, { useState, useMemo } from 'react';
import { DamlLedger, useParty, useLedger, useStreamQueries, ContractId } from '@c7/react';
import { Pool } from '../daml.js/canton-staking-protocol-0.1.0/lib/Staking/Pool';
import { Position } from '../daml.js/canton-staking-protocol-0.1.0/lib/Staking/Position';
import { Unbonding } from '../daml.js/canton-staking-protocol-0.1.0/lib/Staking/Unbonding';

// --- Configuration ---
const LEDGER_URL = 'http://localhost:7575'; // JSON API endpoint
const WEBSOCKET_URL = 'ws://localhost:7575'; // For streaming queries

// --- Main App Component ---
const App: React.FC = () => {
  const [credentials, setCredentials] = useState<{ party: string; token: string } | undefined>();

  const handleLogin = (party: string, token: string) => {
    setCredentials({ party, token });
  };

  if (!credentials) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <DamlLedger
      party={credentials.party}
      token={credentials.token}
      httpBaseUrl={LEDGER_URL}
      wsBaseUrl={WEBSOCKET_URL}
    >
      <MainView />
    </DamlLedger>
  );
};

// --- Login Screen ---
const LoginScreen: React.FC<{ onLogin: (party: string, token: string) => void }> = ({ onLogin }) => {
  // In a real app, this would involve a proper authentication flow.
  // For this example, we'll use a hardcoded party and a JWT.
  // Generate a JWT for a party (e.g., 'Delegator') from https://jwt.io or your auth provider.
  // The payload should be like: {"https://daml.com/ledger-api": {"ledgerId": "sandbox", "applicationId": "foobar", "actAs": ["Delegator"]}}
  const [party, setParty] = useState('Delegator');
  const [token, setToken] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (party && token) {
      onLogin(party, token);
    } else {
      alert('Please provide both Party ID and JWT.');
    }
  };

  return (
    <div style={styles.loginContainer}>
      <form style={styles.loginForm} onSubmit={submit}>
        <h2>Canton Staking Login</h2>
        <input
          type="text"
          placeholder="Party ID"
          value={party}
          onChange={(e) => setParty(e.target.value)}
          style={styles.input}
        />
        <textarea
          placeholder="Paste your JWT here"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ ...styles.input, height: '100px', fontFamily: 'monospace' }}
        />
        <button type="submit" style={styles.button}>
          Connect
        </button>
      </form>
    </div>
  );
};


// --- Main Dashboard View ---
const MainView: React.FC = () => {
  const party = useParty();
  const ledger = useLedger();
  const [stakeModalPool, setStakeModalPool] = useState<Pool.CreateEvent | null>(null);

  const pools = useStreamQueries(Pool.Pool);
  const positions = useStreamQueries(Position.Position);
  const unbondings = useStreamQueries(Unbonding.Unbonding);

  const myPositions = useMemo(() => positions.contracts.filter(p => p.payload.delegator === party), [positions, party]);
  const myUnbondings = useMemo(() => unbondings.contracts.filter(u => u.payload.delegator === party), [unbondings, party]);

  const handleStake = async (poolCid: ContractId<Pool.Pool>, amount: string) => {
    await ledger.exercise(Pool.Pool.Stake, poolCid, { amount });
    setStakeModalPool(null);
  };

  const handleUnbond = async (positionCid: ContractId<Position.Position>, amount: string) => {
    if (window.confirm(`Are you sure you want to unbond ${amount} tokens?`)) {
      await ledger.exercise(Position.Position.Unbond, positionCid, { amountToUnbond: amount });
    }
  };

  const handleClaim = async (positionCid: ContractId<Position.Position>) => {
    await ledger.exercise(Position.Position.ClaimReward, positionCid, {});
  };

  const handleWithdraw = async (unbondingCid: ContractId<Unbonding.Unbonding>) => {
    await ledger.exercise(Unbonding.Unbonding.Withdraw, unbondingCid, {});
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Canton Staking Protocol</h1>
        <p>Connected as: <strong>{party}</strong></p>
      </header>

      {stakeModalPool && (
        <StakeModal
          pool={stakeModalPool.payload}
          onStake={(amount) => handleStake(stakeModalPool.contractId, amount)}
          onClose={() => setStakeModalPool(null)}
        />
      )}

      <main style={styles.main}>
        <section style={styles.section}>
          <h2>My Staking Positions ({myPositions.length})</h2>
          {myPositions.length === 0 ? (
            <p>You have no active stakes. Stake in a pool below to get started.</p>
          ) : (
            myPositions.map(pos => (
              <div key={pos.contractId} style={styles.card}>
                <p><strong>Validator:</strong> {pos.payload.validator}</p>
                <p><strong>Staked:</strong> {pos.payload.stakedAmount} TKN</p>
                <p><strong>Accrued Rewards:</strong> {pos.payload.rewardsAccrued} TKN</p>
                <div style={styles.cardActions}>
                  <button onClick={() => handleClaim(pos.contractId)} style={styles.button}>Claim Rewards</button>
                  <button
                    onClick={() => {
                      const amount = prompt("Enter amount to unbond:", pos.payload.stakedAmount);
                      if (amount) handleUnbond(pos.contractId, amount);
                    }}
                    style={{...styles.button, backgroundColor: '#d9534f'}}
                  >
                    Unbond
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section style={styles.section}>
          <h2>My Unbonding Positions ({myUnbondings.length})</h2>
          {myUnbondings.length > 0 && myUnbondings.map(unb => {
             const releaseTime = new Date(unb.payload.releaseTime);
             const canWithdraw = new Date() >= releaseTime;
             return (
               <div key={unb.contractId} style={styles.card}>
                 <p><strong>Amount:</strong> {unb.payload.amount} TKN</p>
                 <p><strong>Releases:</strong> {releaseTime.toLocaleString()}</p>
                 <div style={styles.cardActions}>
                   <button
                     onClick={() => handleWithdraw(unb.contractId)}
                     disabled={!canWithdraw}
                     style={canWithdraw ? styles.button : styles.disabledButton}
                   >
                     {canWithdraw ? 'Withdraw' : 'Cooldown Active'}
                   </button>
                 </div>
               </div>
             )
          })}
        </section>

        <section style={styles.section}>
          <h2>Available Staking Pools ({pools.contracts.length})</h2>
          {pools.contracts.map(pool => (
            <div key={pool.contractId} style={styles.card}>
              <h3>Validator: {pool.payload.validator}</h3>
              <p><strong>Operator:</strong> {pool.payload.operator}</p>
              <p><strong>Total Staked:</strong> {pool.payload.totalStaked} TKN</p>
              <p><strong>Commission:</strong> {(parseFloat(pool.payload.commissionRate) * 100).toFixed(2)}%</p>
              <div style={styles.cardActions}>
                <button onClick={() => setStakeModalPool(pool)} style={styles.button}>Stake</button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};


// --- Stake Modal Component ---
interface StakeModalProps {
  pool: Pool.Pool;
  onStake: (amount: string) => void;
  onClose: () => void;
}

const StakeModal: React.FC<StakeModalProps> = ({ pool, onStake, onClose }) => {
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
      onStake(amount);
    } else {
      alert("Please enter a valid positive number for the amount.");
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2>Stake with {pool.validator}</h2>
        <form onSubmit={handleSubmit}>
          <p>Enter the amount of TKN you wish to stake.</p>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.input}
            placeholder="e.g., 100.0"
            autoFocus
          />
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={{...styles.button, backgroundColor: '#6c757d'}}>Cancel</button>
            <button type="submit" style={styles.button}>Confirm Stake</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Basic Styling ---
const styles: { [key: string]: React.CSSProperties } = {
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f0f2f5',
  },
  loginForm: {
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    width: '400px',
  },
  container: {
    fontFamily: 'sans-serif',
    color: '#333',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
  },
  header: {
    padding: '1rem 0',
    borderBottom: '1px solid #eee',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  main: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '2rem',
  },
  section: {
    backgroundColor: '#f9f9f9',
    padding: '1rem',
    borderRadius: '8px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '1rem',
  },
  cardActions: {
    marginTop: '1rem',
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    width: 'calc(100% - 20px)',
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '0.6rem 1rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  disabledButton: {
    padding: '0.6rem 1rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#ccc',
    color: '#666',
    cursor: 'not-allowed',
    fontSize: '0.9rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '400px',
  },
  modalActions: {
    marginTop: '1.5rem',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
  },
};

export default App;