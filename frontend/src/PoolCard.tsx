import React from 'react';

// In a real project, these types would be generated from your Daml models.
// e.g., import { ValidatorPool } from '@daml.js/canton-staking-protocol-0.1.0/lib/Staking';
// This is a simplified representation for the component.
export interface ValidatorPoolView {
  operator: string;
  details: {
    name: string;
    logoUrl: string;
  };
  totalStaked: string; // Corresponds to Daml's 'Numeric 10' type, represented as a string in JSON
}

export interface PoolCardProps {
  /** The validator pool contract data fetched from the ledger. */
  pool: ValidatorPoolView;
  /** The calculated Annual Percentage Yield for this pool. */
  apy: number;
  /** Callback function when the user clicks the 'Stake' button. */
  onStake: (operator: string) => void;
}

/**
 * Formats a numeric string (from Daml) into a more readable format.
 * @param numStr The numeric string to format.
 * @param decimals The number of decimal places to show.
 * @returns A formatted string, e.g., "1,234.56".
 */
const formatStakedAmount = (numStr: string, decimals: number = 2): string => {
  try {
    const num = parseFloat(numStr);
    if (isNaN(num)) {
      return '0.00';
    }
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch (error) {
    console.error("Error formatting number:", error);
    return '0.00';
  }
};

/**
 * A UI component to display key information about a single validator staking pool.
 * It shows the pool's name, logo, APY, total staked amount, and provides a button to initiate staking.
 */
const PoolCard: React.FC<PoolCardProps> = ({ pool, apy, onStake }) => {
  return (
    <div style={styles.card}>
      <header style={styles.header}>
        <img src={pool.details.logoUrl} alt={`${pool.details.name} logo`} style={styles.logo} />
        <h2 style={styles.poolName}>{pool.details.name}</h2>
      </header>

      <section style={styles.metricsContainer}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>APY</span>
          <span style={styles.metricValue}>{apy.toFixed(2)}%</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Staked</span>
          <span style={styles.metricValue}>{formatStakedAmount(pool.totalStaked)}</span>
        </div>
      </section>

      <footer style={styles.footer}>
        <button style={styles.stakeButton} onClick={() => onStake(pool.operator)}>
          Stake
        </button>
      </footer>
    </div>
  );
};

// A simple CSS-in-JS approach for styling. In a larger application,
// this could be moved to CSS Modules or a dedicated styling library.
const styles: { [key: string]: React.CSSProperties } = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    maxWidth: '320px',
    minWidth: '280px',
    overflow: 'hidden',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  logo: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #eee',
  },
  poolName: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  metricsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '24px 20px',
  },
  metric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '0.8rem',
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  metricValue: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#0052cc',
  },
  footer: {
    padding: '0 20px 20px 20px',
    marginTop: 'auto',
  },
  stakeButton: {
    width: '100%',
    padding: '12px 0',
    backgroundColor: '#0052cc',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background-color 0.2s ease',
  },
};

export default PoolCard;