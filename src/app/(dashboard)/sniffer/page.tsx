'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Panel, Button, Badge, RiskBadge } from '@/components/ui';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  MapPin, 
  Briefcase,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Dog,
  X
} from 'lucide-react';
import { US_STATES } from '@/lib/constants';

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
}

function SnifferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Search params
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
  const [minScore, setMinScore] = useState(searchParams.get('minScore') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'anomaly_score');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  
  const limit = 20;
  
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (state) params.set('state', state);
    if (specialty) params.set('specialty', specialty);
    if (minScore) params.set('minScore', minScore);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('limit', limit.toString());
    params.set('offset', ((page - 1) * limit).toString());
    
    try {
      const res = await fetch(`/api/providers/search?${params}`);
      const data = await res.json();
      
      setProviders(data.providers || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [query, state, specialty, minScore, sortBy, sortOrder, page]);
  
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);
  
  // Update URL on search
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (state) params.set('state', state);
    if (specialty) params.set('specialty', specialty);
    if (minScore) params.set('minScore', minScore);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('page', '1');
    
    router.push(`/sniffer?${params}`);
    setPage(1);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };
  
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };
  
  const clearFilters = () => {
    setQuery('');
    setState('');
    setSpecialty('');
    setMinScore('');
    setSortBy('anomaly_score');
    setSortOrder('desc');
    setPage(1);
    router.push('/sniffer');
  };
  
  const totalPages = Math.ceil(total / limit);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const getAnomalyColor = (score: number) => {
    if (score >= 0.7) return 'text-risk-high';
    if (score >= 0.4) return 'text-risk-moderate';
    return 'text-risk-safe';
  };
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-doge-gold/20 rounded-xl">
          <Dog className="w-8 h-8 text-doge-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-doge font-bold text-doge-gold">The Sniffer</h1>
          <p className="text-doge-muted">Search Medicare provider billing data for anomalies</p>
        </div>
      </div>
      
      {/* Search Bar */}
      <Panel variant="elevated" padding="md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-doge-muted" />
            <input
              type="text"
              placeholder="Search by provider name or NPI..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-3 bg-doge-bg border border-doge-border rounded-lg text-doge-text placeholder-doge-muted focus:outline-none focus:border-doge-gold transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
              Filters
              {(state || specialty || minScore) && (
                <span className="ml-1 px-1.5 py-0.5 bg-doge-gold/30 text-doge-gold text-xs rounded">
                  {[state, specialty, minScore].filter(Boolean).length}
                </span>
              )}
            </Button>
            <Button onClick={handleSearch}>
              <Search size={18} />
              Search
            </Button>
          </div>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-doge-border grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-doge-muted mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 bg-doge-bg border border-doge-border rounded-lg text-doge-text focus:outline-none focus:border-doge-gold"
              >
                <option value="">All States</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-doge-muted mb-1">Specialty</label>
              <input
                type="text"
                placeholder="e.g. Cardiology"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 bg-doge-bg border border-doge-border rounded-lg text-doge-text placeholder-doge-muted focus:outline-none focus:border-doge-gold"
              />
            </div>
            <div>
              <label className="block text-sm text-doge-muted mb-1">Min Anomaly Score</label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full px-3 py-2 bg-doge-bg border border-doge-border rounded-lg text-doge-text focus:outline-none focus:border-doge-gold"
              >
                <option value="">Any</option>
                <option value="0.7">High Risk (≥70%)</option>
                <option value="0.4">Moderate+ (≥40%)</option>
                <option value="0.2">Low+ (≥20%)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                <X size={18} />
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Panel>
      
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-doge-muted">
          {loading ? 'Searching...' : `${total.toLocaleString()} providers found`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => toggleSort('anomaly_score')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sortBy === 'anomaly_score' ? 'bg-doge-gold/20 text-doge-gold' : 'text-doge-muted hover:text-doge-text'
            }`}
          >
            <AlertTriangle size={14} />
            Risk
            {sortBy === 'anomaly_score' && (sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
          </button>
          <button
            onClick={() => toggleSort('total_billed')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sortBy === 'total_billed' ? 'bg-doge-gold/20 text-doge-gold' : 'text-doge-muted hover:text-doge-text'
            }`}
          >
            <DollarSign size={14} />
            Billed
            {sortBy === 'total_billed' && (sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
          </button>
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sortBy === 'name' ? 'bg-doge-gold/20 text-doge-gold' : 'text-doge-muted hover:text-doge-text'
            }`}
          >
            Name
            {sortBy === 'name' && (sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
          </button>
        </div>
      </div>
      
      {/* Results */}
      <div className="space-y-3">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Panel key={i} className="animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-doge-border rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-doge-border rounded w-1/3" />
                  <div className="h-4 bg-doge-border rounded w-1/4" />
                </div>
                <div className="h-8 bg-doge-border rounded w-20" />
              </div>
            </Panel>
          ))
        ) : providers.length === 0 ? (
          <Panel padding="lg" className="text-center">
            <Dog className="w-16 h-16 text-doge-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-doge-text mb-2">No providers found</h3>
            <p className="text-doge-muted mb-4">Try adjusting your search or filters</p>
            <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
          </Panel>
        ) : (
          providers.map((provider) => (
            <Link key={provider.id} href={`/sniffer/${provider.npi}`}>
              <Panel 
                className="hover:border-doge-gold/50 transition-colors cursor-pointer group"
                padding="md"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Risk indicator */}
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-mono font-bold text-lg ${
                    provider.anomaly_score >= 0.7 
                      ? 'bg-risk-high/20 text-risk-high' 
                      : provider.anomaly_score >= 0.4 
                        ? 'bg-risk-moderate/20 text-risk-moderate'
                        : 'bg-risk-safe/20 text-risk-safe'
                  }`}>
                    {Math.round(provider.anomaly_score * 100)}%
                  </div>
                  
                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-doge-text group-hover:text-doge-gold transition-colors truncate">
                        {provider.name}
                      </h3>
                      {provider.is_flagged && (
                        <Badge variant="danger">
                          <AlertTriangle size={12} className="mr-1" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-doge-muted">
                      <span className="font-mono">NPI: {provider.npi}</span>
                      {provider.state && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {provider.state}
                        </span>
                      )}
                      {provider.specialty && (
                        <span className="flex items-center gap-1">
                          <Briefcase size={12} />
                          {provider.specialty}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-lg font-semibold text-doge-text">
                        {formatCurrency(provider.total_billed)}
                      </div>
                      <div className="text-xs text-doge-muted">Total Billed</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-lg font-semibold text-doge-text">
                        {provider.total_claims.toLocaleString()}
                      </div>
                      <div className="text-xs text-doge-muted">Claims</div>
                    </div>
                  </div>
                </div>
              </Panel>
            </Link>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={18} />
            Prev
          </Button>
          <span className="px-4 py-2 text-doge-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight size={18} />
          </Button>
        </div>
      )}
      
      {/* Data Source Attribution */}
      <div className="text-center text-xs text-doge-muted pt-4 border-t border-doge-border">
        Data source: CMS Medicare Provider Utilization and Payment Data (2023)
        <br />
        <a 
          href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-physician-other-practitioners"
          target="_blank"
          rel="noopener noreferrer"
          className="text-doge-gold hover:underline"
        >
          data.cms.gov
        </a>
      </div>
    </div>
  );
}

export default function SnifferPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Dog className="w-12 h-12 text-doge-gold animate-sniff" />
      </div>
    }>
      <SnifferContent />
    </Suspense>
  );
}
