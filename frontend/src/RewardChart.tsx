import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Define the structure for each data point in our chart
interface ChartDataPoint {
  day: number;
  totalValue: number;
  rewardsEarned: number;
}

// Define the props for our RewardChart component
interface RewardChartProps {
  initialStake: number;
  apr: number; // Annual Percentage Rate, passed as a decimal (e.g., 0.05 for 5%)
  durationDays?: number; // Duration of the projection in days
}

/**
 * A custom tooltip component for a richer display of data on hover.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const totalValue = payload[0].value;
    const rewardsEarned = payload[1].value;
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #ccc',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{`Day ${label}`}</p>
        <p style={{ margin: '8px 0 0', color: payload[0].stroke }}>
          {`Total Value: ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
        <p style={{ margin: '5px 0 0', color: payload[1].stroke }}>
          {`Rewards Earned: ${rewardsEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * RewardChart component displays a projection of staking rewards over time.
 * It uses an animated area chart to visualize the growth of the initial stake
 * and the accrued rewards from daily compounding.
 */
const RewardChart: React.FC<RewardChartProps> = ({
  initialStake,
  apr,
  durationDays = 365,
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // A function to calculate the compounding rewards and generate chart data
    const generateProjectionData = () => {
      // Handle cases with no stake or APR by showing a flat line
      if (initialStake <= 0 || apr <= 0) {
        const flatData = Array.from({ length: durationDays + 1 }, (_, i) => ({
          day: i,
          totalValue: initialStake,
          rewardsEarned: 0,
        }));
        setChartData(flatData);
        return;
      }

      const data: ChartDataPoint[] = [];
      let currentBalance = initialStake;
      const dailyRate = apr / 365;

      // Start with day 0 to show the initial stake
      data.push({
        day: 0,
        totalValue: initialStake,
        rewardsEarned: 0,
      });

      // Calculate the data for each day in the projection period
      for (let day = 1; day <= durationDays; day++) {
        const dailyReward = currentBalance * dailyRate;
        currentBalance += dailyReward;
        const totalRewards = currentBalance - initialStake;

        data.push({
          day: day,
          totalValue: parseFloat(currentBalance.toFixed(4)),
          rewardsEarned: parseFloat(totalRewards.toFixed(4)),
        });
      }

      setChartData(data);
    };

    generateProjectionData();
  }, [initialStake, apr, durationDays]); // Recalculate when props change

  if (chartData.length === 0 && initialStake > 0) {
    return <div style={{height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Calculating reward projection...</div>;
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <AreaChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4c51bf" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#4c51bf" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#48bb78" stopOpacity={0.7}/>
              <stop offset="95%" stopColor="#48bb78" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="day"
            label={{ value: 'Days', position: 'insideBottom', offset: -15, fill: '#4a5568' }}
            stroke="#a0aec0"
            tick={{ fontSize: 12, fill: '#4a5568' }}
          />
          <YAxis
            stroke="#a0aec0"
            tick={{ fontSize: 12, fill: '#4a5568' }}
            tickFormatter={(value) => `${Number(value).toLocaleString()}`}
            label={{ value: 'Tokens', angle: -90, position: 'insideLeft', fill: '#4a5568', dx: -10 }}
            domain={['dataMin', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={40} wrapperStyle={{color: '#4a5568'}} />
          <Area
            type="monotone"
            dataKey="totalValue"
            name="Total Value"
            stroke="#4c51bf"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="rewardsEarned"
            name="Rewards Earned"
            stroke="#48bb78"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRewards)"
            isAnimationActive={true}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RewardChart;