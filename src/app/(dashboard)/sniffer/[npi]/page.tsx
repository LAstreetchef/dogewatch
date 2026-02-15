'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Panel, Button, Badge } from '@/components/ui';
import { 
  ArrowLeft, 
  MapPin, 
  Briefcase, 
  AlertTriangle,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  ExternalLink,
  Share2,
  Eye,
  Plus,
  Dog
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';

interface Provider {
  id: string;
  npi: string;
  name: string;
  state: string;
  specialty: string | null;
  anomaly_score: number;
  is_flagged: boolean;
  total_billed: number;
  total_claims: number;
  avg_monthly: number;
  data_updated_at: string | null;
}

interface BillingRecord {
  id: string;
  procedure_code: string | null;
  amount: number;
  claims: number;
  beneficiaries: number;
  year: number;
}

export default function ProviderDetailPage({ 
  params 
}: { 
  params: Promise<{ npi: string }> 
}) {
  const { npi } = use(params);
  const router = useRouter();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchProvider() {
      try {
        const res = await fetch(`/api/providers/${npi}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Provider not found');
          } else {
            throw new Error('Failed to fetch provider');
          }
          return;
        }
        
        const data = await res.json();
        setProvider(data.provider);
        setBilling(data.billing || []);
      } catch (err) {
        setError('Failed to load provider data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProvider();
  }, [npi]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const getRiskLevel = (score: number): { label: string; color: string; bg: string } => {
    if (score >= 0.7) return { label: 'HIGH RISK', color: 'text-risk-high', bg: 'bg-risk-high/20' };
    if (score >= 0.4) return { label: 'MODERATE', color: 'text-risk-moderate', bg: 'bg-risk-moderate/20' };
    return { label: 'LOW RISK', color: 'text-risk-safe', bg: 'bg-risk-safe/20' };
  };
  
  const getBarColor = (amount: number, max: number) => {
    const ratio = amount / max;
    if (ratio > 0.8) return '#ff4444';
    if (ratio > 0.5) return '#ffaa00';
    return '#FFD700';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Dog className="w-12 h-12 text-doge-gold animate-sniff" />
      </div>
    );
  }
  
  if (error || !provider) {
    return (
      <div className="max-w-4xl mx-auto">
        <Panel padding="lg" className="text-center">
          <AlertTriangle className="w-16 h-16 text-risk-moderate mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-doge-text mb-2">{error || 'Provider not found'}</h2>
          <p className="text-doge-muted mb-4">The provider you&apos;re looking for doesn&apos;t exist in our database.</p>
          <Button onClick={() => router.push('/sniffer')}>
            <ArrowLeft size={18} />
            Back to Search
          </Button>
        </Panel>
      </div>
    );
  }
  
  const risk = getRiskLevel(provider.anomaly_score);
  const maxBilling = Math.max(...billing.map(b => b.amount), 1);
  
  // Prepare chart data
  const chartData = billing.slice(0, 10).map(b => ({
    code: b.procedure_code || 'N/A',
    amount: b.amount,
    claims: b.claims,
  }));
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push('/sniffer')}>
        <ArrowLeft size={18} />
        Back to Search
      </Button>
      
      {/* Provider Header */}
      <Panel variant="elevated" padding="lg">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Risk Score */}
          <div className={`${risk.bg} rounded-xl p-6 text-center lg:w-48 shrink-0`}>
            <div className={`text-5xl font-mono font-bold ${risk.color}`}>
              {Math.round(provider.anomaly_score * 100)}%
            </div>
            <div className={`text-sm font-semibold mt-2 ${risk.color}`}>
              {risk.label}
            </div>
            <div className="text-xs text-doge-muted mt-1">Anomaly Score</div>
          </div>
          
          {/* Provider Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3 mb-4">
              <h1 className="text-2xl font-doge font-bold text-doge-text">
                {provider.name}
              </h1>
              {provider.is_flagged && (
                <Badge variant="danger" size="md">
                  <AlertTriangle size={14} className="mr-1" />
                  Flagged
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-doge-muted">
                <FileText size={16} />
                <span>NPI: <span className="font-mono text-doge-text">{provider.npi}</span></span>
              </div>
              {provider.state && (
                <div className="flex items-center gap-2 text-doge-muted">
                  <MapPin size={16} />
                  <span>{provider.state}</span>
                </div>
              )}
              {provider.specialty && (
                <div className="flex items-center gap-2 text-doge-muted">
                  <Briefcase size={16} />
                  <span>{provider.specialty}</span>
                </div>
              )}
              {provider.data_updated_at && (
                <div className="flex items-center gap-2 text-doge-muted">
                  <TrendingUp size={16} />
                  <span>Data from {new Date(provider.data_updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="secondary" size="sm">
                <Eye size={16} />
                Add to Watchlist
              </Button>
              <Button variant="secondary" size="sm">
                <Plus size={16} />
                Open Case File
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const text = `🚨 HIGH RISK ALERT: ${provider.name} (${provider.state})\n\n` +
                    `Anomaly Score: ${Math.round(provider.anomaly_score * 100)}%\n` +
                    `Total Billed: ${formatCurrency(provider.total_billed)}\n` +
                    `Specialty: ${provider.specialty || 'Unknown'}\n\n` +
                    `Check it out on @DogeWatch 👇`;
                  const url = `https://dogewatch.vercel.app/sniffer/${provider.npi}`;
                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                  window.open(twitterUrl, '_blank', 'width=600,height=400');
                }}
              >
                <Share2 size={16} />
                Post to X
              </Button>
              <a 
                href={`https://npiregistry.cms.hhs.gov/provider-view/${provider.npi}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm">
                  <ExternalLink size={16} />
                  NPI Registry
                </Button>
              </a>
            </div>
          </div>
        </div>
      </Panel>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel padding="md" className="text-center">
          <DollarSign className="w-6 h-6 text-doge-gold mx-auto mb-2" />
          <div className="text-2xl font-bold text-doge-text">
            {formatCurrency(provider.total_billed)}
          </div>
          <div className="text-sm text-doge-muted">Total Medicare Payments</div>
        </Panel>
        <Panel padding="md" className="text-center">
          <FileText className="w-6 h-6 text-doge-gold mx-auto mb-2" />
          <div className="text-2xl font-bold text-doge-text">
            {provider.total_claims.toLocaleString()}
          </div>
          <div className="text-sm text-doge-muted">Total Claims</div>
        </Panel>
        <Panel padding="md" className="text-center">
          <TrendingUp className="w-6 h-6 text-doge-gold mx-auto mb-2" />
          <div className="text-2xl font-bold text-doge-text">
            {formatCurrency(provider.avg_monthly)}
          </div>
          <div className="text-sm text-doge-muted">Avg Monthly</div>
        </Panel>
        <Panel padding="md" className="text-center">
          <Users className="w-6 h-6 text-doge-gold mx-auto mb-2" />
          <div className="text-2xl font-bold text-doge-text">
            {formatCurrency(provider.total_claims > 0 ? provider.total_billed / provider.total_claims : 0)}
          </div>
          <div className="text-sm text-doge-muted">Avg Per Claim</div>
        </Panel>
      </div>
      
      {/* Billing Breakdown */}
      {billing.length > 0 && (
        <Panel padding="lg">
          <h2 className="text-lg font-semibold text-doge-gold mb-4">
            Top Procedure Codes by Payment Amount
          </h2>
          
          {/* Chart */}
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} stroke="#8a7a5a" />
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
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.amount, maxBilling)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-doge-border">
                  <th className="text-left py-3 px-4 text-doge-muted font-medium">Procedure Code</th>
                  <th className="text-right py-3 px-4 text-doge-muted font-medium">Amount</th>
                  <th className="text-right py-3 px-4 text-doge-muted font-medium">Claims</th>
                  <th className="text-right py-3 px-4 text-doge-muted font-medium">Beneficiaries</th>
                  <th className="text-right py-3 px-4 text-doge-muted font-medium">Avg/Claim</th>
                </tr>
              </thead>
              <tbody>
                {billing.map((record) => (
                  <tr key={record.id} className="border-b border-doge-border/50 hover:bg-doge-border/20">
                    <td className="py-3 px-4 font-mono text-doge-text">
                      {record.procedure_code || 'N/A'}
                    </td>
                    <td className="text-right py-3 px-4 text-doge-text font-semibold">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="text-right py-3 px-4 text-doge-muted">
                      {record.claims.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-doge-muted">
                      {record.beneficiaries.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-doge-muted">
                      {formatCurrency(record.claims > 0 ? record.amount / record.claims : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      
      {/* Anomaly Analysis */}
      <Panel padding="lg">
        <h2 className="text-lg font-semibold text-doge-gold mb-4">
          🔍 Anomaly Analysis
        </h2>
        <div className="space-y-4 text-doge-muted">
          {provider.anomaly_score >= 0.7 ? (
            <>
              <p>
                <span className="text-risk-high font-semibold">⚠️ High Risk:</span> This provider&apos;s billing patterns 
                show significant deviation from their peer group average.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Total Medicare payments are substantially above the specialty average</li>
                <li>Claims volume may indicate unusual billing patterns</li>
                <li>Recommend further investigation into procedure code distribution</li>
              </ul>
            </>
          ) : provider.anomaly_score >= 0.4 ? (
            <>
              <p>
                <span className="text-risk-moderate font-semibold">⚠️ Moderate Risk:</span> Some billing patterns 
                warrant attention.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Billing above peer average but within explainable ranges</li>
                <li>Consider monitoring for trend changes</li>
              </ul>
            </>
          ) : (
            <>
              <p>
                <span className="text-risk-safe font-semibold">✅ Low Risk:</span> Billing patterns appear 
                consistent with peer group norms.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Medicare payments within expected range for specialty</li>
                <li>Claims volume consistent with peers</li>
              </ul>
            </>
          )}
        </div>
      </Panel>
      
      {/* Data Attribution */}
      <div className="text-center text-xs text-doge-muted pt-4 border-t border-doge-border">
        Data source: CMS Medicare Physician & Other Practitioners Public Use File (2023)
        <br />
        Anomaly scores calculated based on deviation from specialty peer averages.
      </div>
    </div>
  );
}
