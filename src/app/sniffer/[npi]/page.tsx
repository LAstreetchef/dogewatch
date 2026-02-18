'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import for chart to avoid SSR issues
const BillingChart = dynamic(() => import('./BillingChart'), { 
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center text-doge-muted">Loading chart...</div>
});

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
}

export default function ProviderDetailPage() {
  const params = useParams();
  const npi = params?.npi as string;
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!npi) return;
    
    fetch(`/api/providers/${npi}`)
      .then(res => res.json())
      .then(data => {
        if (data.provider) {
          setProvider(data.provider);
          setBilling(data.billing || []);
        } else {
          setError('Provider not found');
        }
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [npi]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskLevel = (score: number) => {
    if (score >= 0.7) return { label: 'HIGH RISK', color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50' };
    if (score >= 0.4) return { label: 'MODERATE', color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' };
    return { label: 'LOW RISK', color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/50' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <img src="/logo/doge-v2-64.png" alt="Loading" className="w-12 h-12 animate-pulse" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-doge-panel border border-doge-border rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-doge-text mb-2">{error || 'Provider not found'}</h2>
          <p className="text-doge-muted mb-4">The provider you're looking for doesn't exist in our database.</p>
          <Link href="/sniffer" className="inline-block px-4 py-2 bg-doge-gold text-doge-bg rounded-lg hover:bg-doge-gold/90 transition-colors">
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const risk = getRiskLevel(provider.anomaly_score);
  const riskPct = Math.round(provider.anomaly_score * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/sniffer" className="inline-flex items-center gap-2 text-doge-muted hover:text-doge-gold transition-colors">
        ← Back to Search
      </Link>

      {/* Provider Header */}
      <div className="bg-doge-panel border border-doge-border rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Risk Score */}
          <div className={`${risk.bg} ${risk.border} border rounded-xl p-6 text-center lg:w-48 shrink-0`}>
            <div className={`text-5xl font-mono font-bold ${risk.color}`}>
              {riskPct}%
            </div>
            <div className={`text-sm font-semibold mt-2 ${risk.color}`}>
              {risk.label}
            </div>
            <div className="text-xs text-doge-muted mt-1">Anomaly Score</div>
          </div>
          
          {/* Provider Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3 mb-4">
              <h1 className="text-2xl font-bold text-doge-text">
                {provider.name}
              </h1>
              {provider.is_flagged && (
                <span className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-500 border border-red-500/50 rounded">
                  ⚠️ Flagged
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="text-doge-muted">
                📋 NPI: <span className="font-mono text-doge-text">{provider.npi}</span>
              </div>
              {provider.state && (
                <div className="text-doge-muted">
                  📍 {provider.city ? `${provider.city}, ` : ''}{provider.state}
                </div>
              )}
              {provider.specialty && (
                <div className="text-doge-muted">
                  🏥 {provider.specialty}
                </div>
              )}
              <div className="text-doge-muted">
                💰 Avg Monthly: <span className="text-doge-gold">{formatCurrency(provider.avg_monthly)}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button 
                onClick={() => {
                  const text = `🚨 ${risk.label}: ${provider.name} (${provider.state})\n\n` +
                    `Anomaly Score: ${riskPct}%\n` +
                    `Total Billed: ${formatCurrency(provider.total_billed)}\n` +
                    `Specialty: ${provider.specialty || 'Unknown'}\n\n` +
                    `Check it out on DogeWatch 👇`;
                  const url = `https://dogedoctor.com/sniffer/${provider.npi}`;
                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                  window.open(twitterUrl, '_blank', 'width=600,height=400');
                }}
                className="px-3 py-1.5 text-sm bg-doge-border/50 hover:bg-doge-border text-doge-muted hover:text-doge-text rounded-lg transition-colors"
              >
                🐦 Share on X
              </button>
              <a 
                href={`https://npiregistry.cms.hhs.gov/provider-view/${provider.npi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm bg-doge-border/50 hover:bg-doge-border text-doge-muted hover:text-doge-text rounded-lg transition-colors"
              >
                🔗 NPI Registry
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-doge-panel border border-doge-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-doge-gold">
            {formatCurrency(provider.total_billed)}
          </div>
          <div className="text-sm text-doge-muted">Total Medicare Payments</div>
        </div>
        <div className="bg-doge-panel border border-doge-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-doge-text">
            {provider.total_claims.toLocaleString()}
          </div>
          <div className="text-sm text-doge-muted">Total Claims</div>
        </div>
        <div className="bg-doge-panel border border-doge-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-doge-text">
            {formatCurrency(provider.avg_monthly)}
          </div>
          <div className="text-sm text-doge-muted">Avg Monthly</div>
        </div>
        <div className="bg-doge-panel border border-doge-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-doge-text">
            {formatCurrency(provider.total_claims > 0 ? provider.total_billed / provider.total_claims : 0)}
          </div>
          <div className="text-sm text-doge-muted">Avg Per Claim</div>
        </div>
      </div>

      {/* Procedure Analysis */}
      {(provider.procedure_diversity != null || provider.top_procedure_code) && (
        <div className="bg-doge-panel border border-doge-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-doge-gold mb-4">🔬 Procedure Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {provider.procedure_diversity != null && (
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="text-sm text-doge-muted mb-1">Procedure Diversity</div>
                <div className={`text-2xl font-bold ${
                  provider.procedure_diversity < 0.3 ? 'text-red-500' :
                  provider.procedure_diversity < 0.6 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {(provider.procedure_diversity * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-doge-muted mt-1">
                  {provider.procedure_diversity < 0.3 ? '🚩 Low diversity' :
                   provider.procedure_diversity < 0.6 ? '⚠️ Moderate' : '✅ Healthy'}
                </div>
              </div>
            )}
            {provider.top_procedure_code && (
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="text-sm text-doge-muted mb-1">Top Procedure</div>
                <div className="text-xl font-bold font-mono text-doge-gold">
                  {provider.top_procedure_code}
                </div>
              </div>
            )}
            {provider.top_procedure_pct != null && (
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="text-sm text-doge-muted mb-1">Revenue Concentration</div>
                <div className={`text-2xl font-bold ${
                  provider.top_procedure_pct > 80 ? 'text-red-500' :
                  provider.top_procedure_pct > 50 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {provider.top_procedure_pct.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing Chart */}
      {billing.length > 0 && (
        <div className="bg-doge-panel border border-doge-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-doge-gold mb-4">
            📊 Top Procedures by Payment
          </h2>
          <BillingChart billing={billing.slice(0, 10)} />
        </div>
      )}

      {/* Billing Table */}
      {billing.length > 0 && (
        <div className="bg-doge-panel border border-doge-border rounded-xl p-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-doge-gold mb-4">
            📋 Billing Breakdown
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-doge-border">
                <th className="text-left py-3 px-2 text-doge-muted font-medium">Code</th>
                <th className="text-right py-3 px-2 text-doge-muted font-medium">Amount</th>
                <th className="text-right py-3 px-2 text-doge-muted font-medium">Claims</th>
                <th className="text-right py-3 px-2 text-doge-muted font-medium">Patients</th>
                <th className="text-right py-3 px-2 text-doge-muted font-medium">Avg/Claim</th>
              </tr>
            </thead>
            <tbody>
              {billing.map((record) => (
                <tr key={record.id} className="border-b border-doge-border/50 hover:bg-doge-border/20">
                  <td className="py-3 px-2 font-mono text-doge-text">
                    {record.procedure_code || 'N/A'}
                  </td>
                  <td className="text-right py-3 px-2 text-doge-gold font-semibold">
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="text-right py-3 px-2 text-doge-muted">
                    {record.claims.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2 text-doge-muted">
                    {record.beneficiaries.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2 text-doge-muted">
                    {formatCurrency(record.claims > 0 ? record.amount / record.claims : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Risk Analysis */}
      <div className="bg-doge-panel border border-doge-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-doge-gold mb-4">🔍 Anomaly Analysis</h2>
        <div className="space-y-3 text-doge-muted">
          {riskPct >= 70 ? (
            <>
              <p><span className="text-red-500 font-semibold">⚠️ High Risk:</span> This provider's billing patterns show significant deviation from their peer group average.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Total Medicare payments are substantially above the specialty average</li>
                <li>Claims volume may indicate unusual billing patterns</li>
                <li>Recommend further investigation into procedure code distribution</li>
              </ul>
            </>
          ) : riskPct >= 40 ? (
            <>
              <p><span className="text-yellow-500 font-semibold">⚠️ Moderate Risk:</span> Some billing patterns warrant attention.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Billing above peer average but within explainable ranges</li>
                <li>Consider monitoring for trend changes</li>
              </ul>
            </>
          ) : (
            <>
              <p><span className="text-green-500 font-semibold">✅ Low Risk:</span> Billing patterns appear consistent with peer group norms.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Medicare payments within expected range for specialty</li>
                <li>Claims volume consistent with peers</li>
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Data Attribution */}
      <div className="text-center text-xs text-doge-muted pt-4 border-t border-doge-border">
        Data source: CMS Medicare Physician & Other Practitioners Public Use File (2023)
        <br />
        Anomaly scores calculated based on deviation from specialty peer averages.
      </div>
    </div>
  );
}
