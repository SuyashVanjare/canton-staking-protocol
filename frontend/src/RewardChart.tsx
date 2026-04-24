import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps
} from 'recharts';
import { motion } from 'framer-motion';

// Define the shape of our chart data points
interface ChartData {
  day: string;
  dayNumber: number;
  principal: number;
  rewards: number;
  total: number;
}

// Define the props for our RewardChart component
export interface RewardChartProps {
  /** The initial amount of tokens staked. */
  stakedAmount: number;
  /** The Annual Percentage Yield, e.g., 0.08 for 8%. */
  apy: number;
  /** The duration in days to project rewards for. */
  durationDays?: number;
  /** The symbol of the staked token, e.g., "CST". */
  tokenSymbol?: string;
}

/**
 * A utility function to format numbers as currency or token amounts.
 * @param value The number to format.
 * @param symbol The token symbol or currency sign.
 * @returns A formatted string.
 */
const formatTokenAmount = (value: number, symbol: string): string => {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
};

/**
 * Custom Tooltip component for a richer hover experience on the chart.
 */
const CustomTooltip = ({
  active,
  payload,
  label,
  tokenSymbol = 'Tokens'
}: TooltipProps<number, string> & { tokenSymbol?: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartData;
    return (
      <div className="rounded-lg border bg-background p-2 text-sm shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-bold text-foreground">
              {formatTokenAmount(data.total, tokenSymbol)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Rewards</span>
              <span className="ml-auto font-medium">
                {formatTokenAmount(data.rewards, tokenSymbol)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Principal</span>
              <span className="ml-auto font-medium">
                {formatTokenAmount(data.principal, tokenSymbol)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * An animated chart that visualizes projected staking rewards over time.
 * It shows the growth of the principal amount with the accrued rewards.
 */
export const RewardChart: React.FC<RewardChartProps> = ({
  stakedAmount,
  apy,
  durationDays = 365,
  tokenSymbol = 'CST',
}) => {
  // Memoize the data calculation to avoid re-computing on every render
  const chartData = useMemo<ChartData[]>(() => {
    if (stakedAmount <= 0 || apy <= 0) {
      return [];
    }

    const data: ChartData[] = [];
    const dailyRate = apy / 365;

    for (let i = 0; i <= durationDays; i++) {
      const rewardsEarned = stakedAmount * dailyRate * i;
      const totalValue = stakedAmount + rewardsEarned;
      data.push({
        day: `Day ${i}`,
        dayNumber: i,
        principal: stakedAmount,
        rewards: rewardsEarned,
        total: totalValue,
      });
    }
    return data;
  }, [stakedAmount, apy, durationDays]);

  const yAxisDomain: [number, number] = useMemo(() => {
    const min = stakedAmount > 0 ? stakedAmount * 0.99 : 0;
    const max = chartData.length > 0 ? chartData[chartData.length - 1].total * 1.01 : 100;
    return [min, max];
  }, [stakedAmount, chartData]);

  return (
    <motion.div
      className="h-80 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {chartData.length > 0 ? (
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="dayNumber"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `Day ${value}`}
              interval={Math.floor(durationDays / 6)} // Show ~6 ticks
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Number(value).toLocaleString()}`}
              domain={yAxisDomain}
              width={80}
            />
            <Tooltip
                content={<CustomTooltip tokenSymbol={tokenSymbol} />}
                cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stackId="1"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorRewards)"
              name="Rewards"
            />
            <Area
              type="monotone"
              dataKey="principal"
              stackId="1"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorPrincipal)"
              name="Principal"
            />
          </AreaChart>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            Enter a staked amount and APY to see reward projections.
          </div>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
};