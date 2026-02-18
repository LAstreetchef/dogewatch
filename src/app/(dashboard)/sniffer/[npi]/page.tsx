'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
  Dog,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import dynamic from 'next/dynamic';

// Dynamic import for Recharts to avoid SSR issues
const RechartsComponents = dynamic(
  () => import('recharts').then((mod) => ({
    default: ({ data, maxBilling, formatCurrency, getBarColor }: any) => {
      const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } = mod;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 60, right: 20 }}>
            <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} stroke="#8a7a5a" />
            <YAxis 
              type="category" 
              dataKey="code" 
              stroke="#8a7a5a" 
              tick={{ fontSize: 12, fill: '#e8dcc8' }}
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              contentStyle={{ 
                backgroundColor: '#1a1207', 
                border: '1px solid #2a2215',
                borderRadius: '8px',
                color: '#e8dcc8'
              }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.amount, maxBilling)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
  })),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-doge-muted">Loading chart...</div> }
);

interface Provider {
  id: string;
  npi: string;
  name: string;
  state: string;
  city?: string;
  specialty: string | null;
  anomaly_score: number;
  is_flagged: boolean;
  total_billed: number;
  total_claims: number;
  avg_monthly: number;
  data_updated_at: string | null;
  procedure_diversity?: number;
  top_procedure_code?: string;
  top_procedure_pct?: number;
}

interface BillingRecord {
  id: string;
  procedure_code: string | null;
  amount: number;
  claims: number;
  beneficiaries: number;
  year: number;
}

export default function ProviderDetailPage() {
  const params = useParams();
  const npi = params?.npi as string;
  const router = useRouter();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  
  useEffect(() => {
    if (!npi) return;
    
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
              <Button variant="secondary" size="sm" onClick={() => setShowCaseModal(true)}>
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

      {/* Procedure Analysis Panel */}
      {(provider.procedure_diversity !== undefined || provider.top_procedure_code) && (
        <Panel padding="lg">
          <h2 className="text-lg font-semibold text-doge-gold mb-4">
            🔬 Procedure Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Diversity Score */}
            <div className="p-4 bg-doge-bg rounded-lg border border-doge-border">
              <div className="text-sm text-doge-muted mb-1">Procedure Diversity</div>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${
                  (provider.procedure_diversity || 0) < 0.3 ? 'text-risk-high' :
                  (provider.procedure_diversity || 0) < 0.6 ? 'text-risk-moderate' :
                  'text-risk-low'
                }`}>
                  {((provider.procedure_diversity || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-doge-muted">
                  {(provider.procedure_diversity || 0) < 0.3 ? '🚩 Low' :
                   (provider.procedure_diversity || 0) < 0.6 ? '⚠️ Moderate' :
                   '✅ Healthy'}
                </div>
              </div>
              <div className="text-xs text-doge-muted mt-1">
                More diverse = bills for many different services
              </div>
            </div>

            {/* Top Procedure */}
            {provider.top_procedure_code && (
              <div className="p-4 bg-doge-bg rounded-lg border border-doge-border">
                <div className="text-sm text-doge-muted mb-1">Top Procedure Code</div>
                <div className="text-xl font-bold font-mono text-doge-gold">
                  {provider.top_procedure_code}
                </div>
                <div className="text-xs text-doge-muted mt-1">
                  Highest revenue service
                </div>
              </div>
            )}

            {/* Concentration */}
            {provider.top_procedure_pct !== undefined && (
              <div className="p-4 bg-doge-bg rounded-lg border border-doge-border">
                <div className="text-sm text-doge-muted mb-1">Revenue Concentration</div>
                <div className={`text-2xl font-bold ${
                  provider.top_procedure_pct > 80 ? 'text-risk-high' :
                  provider.top_procedure_pct > 50 ? 'text-risk-moderate' :
                  'text-risk-low'
                }`}>
                  {provider.top_procedure_pct.toFixed(1)}%
                </div>
                <div className="text-xs text-doge-muted mt-1">
                  {provider.top_procedure_pct > 80 ? '🚩 Very concentrated' :
                   provider.top_procedure_pct > 50 ? '⚠️ Moderately concentrated' :
                   '✅ Well distributed'}
                </div>
              </div>
            )}
          </div>
          
          {/* Risk explanation */}
          {(provider.procedure_diversity !== undefined && provider.procedure_diversity < 0.3) || 
           (provider.top_procedure_pct !== undefined && provider.top_procedure_pct > 80) ? (
            <div className="mt-4 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
              <p className="text-sm text-risk-high">
                <strong>⚠️ Concentration Warning:</strong> This provider bills heavily for a single procedure type. 
                While this could indicate specialization, extremely concentrated billing is a common fraud pattern 
                and warrants closer review.
              </p>
            </div>
          ) : null}
        </Panel>
      )}
      
      {/* Billing Breakdown */}
      {billing.length > 0 && (
        <Panel padding="lg">
          <h2 className="text-lg font-semibold text-doge-gold mb-4">
            Top Procedure Codes by Payment Amount
          </h2>
          
          {/* Chart */}
          <div className="h-64 mb-6">
            <RechartsComponents 
              data={chartData} 
              maxBilling={maxBilling} 
              formatCurrency={formatCurrency}
              getBarColor={getBarColor}
            />
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

      {/* Open Case Modal */}
      {showCaseModal && (
        <OpenCaseModal 
          provider={provider}
          onClose={() => setShowCaseModal(false)}
        />
      )}
    </div>
  );
}

function OpenCaseModal({ 
  provider, 
  onClose 
}: { 
  provider: Provider; 
  onClose: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState(`${provider.name} - Investigation`);
  const [summary, setSummary] = useState('');
  const [evidence, setEvidence] = useState(`Provider: ${provider.name}
NPI: ${provider.npi}
State: ${provider.state}
Specialty: ${provider.specialty || 'Unknown'}
Anomaly Score: ${Math.round(provider.anomaly_score * 100)}%
Total Billed: $${provider.total_billed.toLocaleString()}
Total Claims: ${provider.total_claims.toLocaleString()}`);
  const [bounty, setBounty] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || !summary) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterId: user.id,
          title,
          summary,
          evidence,
          providerNpi: provider.npi,
          providerName: provider.name,
          bountyAmount: parseFloat(bounty) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      router.push('/cases');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <Panel className="relative w-full max-w-md p-6 z-10 text-center">
          <p className="text-doge-muted mb-4">Sign in to open a case file</p>
          <Button variant="primary" onClick={() => router.push('/login')}>
            Sign In
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <Panel className="relative w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-doge-gold mb-4">Open Case File</h2>
        
        <div className="p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg mb-4">
          <p className="text-sm font-semibold text-doge-text">{provider.name}</p>
          <p className="text-xs text-doge-muted">
            NPI: {provider.npi} · {provider.state} · {Math.round(provider.anomaly_score * 100)}% Risk
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-doge-muted mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text"
            />
          </div>

          <div>
            <label className="block text-sm text-doge-muted mb-1">Summary *</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text resize-none"
              placeholder="Describe what you found suspicious..."
            />
          </div>

          <div>
            <label className="block text-sm text-doge-muted mb-1">Evidence (auto-filled)</label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={4}
              className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text resize-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-sm text-doge-muted mb-1">Bounty (optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={bounty}
                onChange={(e) => setBounty(e.target.value)}
                className="w-32 bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text font-mono"
              />
              <span className="text-doge-muted">DOGE</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-risk-high/10 border border-risk-high rounded-lg text-risk-high text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              disabled={loading || !summary}
              className="flex-1"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Case'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-doge-muted text-center mt-4">
          Case will be open for 72 hours of community verification.
        </p>
      </Panel>
    </div>
  );
}
