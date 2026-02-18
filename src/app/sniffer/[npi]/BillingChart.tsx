'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BillingRecord {
  procedure_code: string | null;
  amount: number;
  claims: number;
}

interface BillingChartProps {
  billing: BillingRecord[];
}

export default function BillingChart({ billing }: BillingChartProps) {
  const chartData = billing.map(b => ({
    code: b.procedure_code || 'N/A',
    amount: b.amount,
    claims: b.claims,
  }));

  const maxBilling = Math.max(...billing.map(b => b.amount), 1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBarColor = (amount: number) => {
    const ratio = amount / maxBilling;
    if (ratio > 0.8) return '#ef4444';
    if (ratio > 0.5) return '#eab308';
    return '#FFD700';
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
          <XAxis 
            type="number" 
            tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} 
            stroke="#8a7a5a" 
          />
          <YAxis 
            type="category" 
            dataKey="code" 
            stroke="#8a7a5a" 
            tick={{ fontSize: 12, fill: '#e8dcc8' }}
          />
          <Tooltip 
            formatter={(value) => [formatCurrency(value as number), 'Amount']}
            contentStyle={{ 
              backgroundColor: '#1a1207', 
              border: '1px solid #2a2215',
              borderRadius: '8px',
              color: '#e8dcc8'
            }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.amount)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
