import React from 'react';
import styled from 'styled-components';

// ==============================================================================
// Helper Functions
// ==============================================================================

/**
 * Extracts the display name from a Daml Party ID string.
 * e.g., "ValidatorA::1220..." -> "ValidatorA"
 */
const getPartyDisplayName = (partyId: string): string => {
  return partyId.split('::')[0];
};

/**
 * Formats a Daml Decimal string into a human-readable number string.
 * e.g., "1234567.8900000000" -> "1,234,567.89"
 */
const formatDecimal = (decimalStr: string): string => {
  const num = parseFloat(decimalStr);
  if (isNaN(num)) {
    return '0.00';
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formats a Daml Decimal string representing a rate into a percentage string.
 * e.g., "0.0525000000" -> "5.25%"
 */
const formatApy = (apyStr: string): string => {
  const num = parseFloat(apyStr) * 100;
  if (isNaN(num)) {
    return '0.00%';
  }
  return `${num.toFixed(2)}%`;
};

// ==============================================================================
// Type Definitions
// ==============================================================================

/**
 * Represents the data structure of a Pool contract fetched from the ledger.
 * This should align with the structure provided by @c7/react's query hooks.
 */
export interface PoolData {
  contractId: string;
  payload: {
    operator: string;
    tokenSymbol: string;
    totalStaked: string; // Daml Decimal as a string
    apy: string;         // Daml Decimal as a string
    // other fields from the Daml template can be added here
  };
}

interface PoolCardProps {
  pool: PoolData;
  onStake: (pool: PoolData) => void;
}

// ==============================================================================
// Styled Components
// ==============================================================================

const CardContainer = styled.div`
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
`;

const CardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ValidatorName = styled.h3`
  font-size: 1.375rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #edf2f7;
  padding-top: 1.25rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  &:last-child {
    align-items: flex-end;
  }
`;

const StatLabel = styled.span`
  font-size: 0.875rem;
  color: #718096;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.05em;
`;

const StatValue = styled.span`
  font-size: 1.625rem;
  font-weight: 700;
  color: #2d3748;
  margin-top: 4px;
  font-family: 'Roboto Mono', monospace;
`;

const ApyValue = styled(StatValue)`
  color: #38a169;
`;

const StakeButton = styled.button`
  background-color: #3182ce;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;

  &:hover {
    background-color: #2b6cb0;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }
`;

// ==============================================================================
// Main Component
// ==============================================================================

const PoolCard: React.FC<PoolCardProps> = ({ pool, onStake }) => {
  const { operator, totalStaked, apy, tokenSymbol } = pool.payload;

  return (
    <CardContainer>
      <CardHeader>
        <ValidatorName>{getPartyDisplayName(operator)}</ValidatorName>
      </CardHeader>
      
      <StatsContainer>
        <StatItem>
          <StatLabel>Staking APY</StatLabel>
          <ApyValue>{formatApy(apy)}</ApyValue>
        </StatItem>
        <StatItem>
          <StatLabel>Total Staked</StatLabel>
          <StatValue>{`${formatDecimal(totalStaked)} ${tokenSymbol}`}</StatValue>
        </StatItem>
      </StatsContainer>
      
      <StakeButton onClick={() => onStake(pool)}>
        Stake Now
      </StakeButton>
    </CardContainer>
  );
};

export default PoolCard;