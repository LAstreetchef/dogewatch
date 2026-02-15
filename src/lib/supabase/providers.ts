import { createClient, createServiceClient } from './server';
import { lookupNPI, needsEnrichment } from '@/lib/npi/lookup';

export interface Provider {
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
  created_at: string;
}

export interface ProviderBilling {
  id: string;
  provider_id: string;
  year: number;
  month: number;
  procedure_code: string | null;
  amount: number;
  claims: number;
  beneficiaries: number;
}

export interface ProviderSearchParams {
  query?: string;
  state?: string;
  specialty?: string;
  minAnomalyScore?: number;
  sortBy?: 'anomaly_score' | 'total_billed' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export async function searchProviders(params: ProviderSearchParams): Promise<{
  providers: Provider[];
  total: number;
}> {
  const supabase = await createClient();
  
  let query = supabase
    .from('providers')
    .select('*', { count: 'exact' });
  
  // Text search on name or NPI
  if (params.query) {
    const searchTerm = params.query.trim();
    // Check if it looks like an NPI (10 digits)
    if (/^\d{10}$/.test(searchTerm)) {
      query = query.eq('npi', searchTerm);
    } else {
      query = query.ilike('name', `%${searchTerm}%`);
    }
  }
  
  // State filter
  if (params.state) {
    query = query.eq('state', params.state.toUpperCase());
  }
  
  // Specialty filter
  if (params.specialty) {
    query = query.ilike('specialty', `%${params.specialty}%`);
  }
  
  // Minimum anomaly score
  if (params.minAnomalyScore !== undefined) {
    query = query.gte('anomaly_score', params.minAnomalyScore);
  }
  
  // Sorting
  const sortBy = params.sortBy || 'anomaly_score';
  const sortOrder = params.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  
  // Pagination
  const limit = params.limit || 20;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Provider search error:', error);
    throw error;
  }
  
  return {
    providers: data || [],
    total: count || 0,
  };
}

export async function getProviderByNPI(npi: string, autoEnrich = true): Promise<Provider | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('npi', npi)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  // Auto-enrich if needed
  if (data && autoEnrich && needsEnrichment(data)) {
    const enriched = await enrichProvider(data);
    return enriched || data;
  }
  
  return data;
}

/**
 * Enrich a provider with NPI Registry data and update the database
 */
export async function enrichProvider(provider: Provider): Promise<Provider | null> {
  try {
    const npiData = await lookupNPI(provider.npi);
    
    if (!npiData) {
      console.log(`No NPI data found for ${provider.npi}`);
      return null;
    }
    
    // Use service client for writes (bypasses RLS)
    const supabase = createServiceClient();
    
    const updates = {
      name: npiData.name,
      state: npiData.state,
      specialty: npiData.specialty,
      data_updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', provider.id)
      .select()
      .single();
    
    if (error) {
      console.error('Provider enrichment update error:', error);
      return null;
    }
    
    console.log(`✅ Enriched provider ${provider.npi}: ${npiData.name} (${npiData.state})`);
    return data;
  } catch (error) {
    console.error('Provider enrichment error:', error);
    return null;
  }
}

export async function getProviderById(id: string): Promise<Provider | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
}

export async function getProviderBilling(providerId: string): Promise<ProviderBilling[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('provider_billing')
    .select('*')
    .eq('provider_id', providerId)
    .order('amount', { ascending: false });
  
  if (error) {
    console.error('Provider billing error:', error);
    throw error;
  }
  
  return data || [];
}

export async function getTopFlaggedProviders(limit: number = 10): Promise<Provider[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('is_flagged', true)
    .order('anomaly_score', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw error;
  }
  
  return data || [];
}

export async function getProviderStats(): Promise<{
  totalProviders: number;
  flaggedCount: number;
  totalBilled: number;
  avgAnomalyScore: number;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('anomaly_score, is_flagged, total_billed');
  
  if (error) {
    throw error;
  }
  
  const providers = data || [];
  const flaggedCount = providers.filter(p => p.is_flagged).length;
  const totalBilled = providers.reduce((sum, p) => sum + (p.total_billed || 0), 0);
  const avgAnomalyScore = providers.length > 0
    ? providers.reduce((sum, p) => sum + (p.anomaly_score || 0), 0) / providers.length
    : 0;
  
  return {
    totalProviders: providers.length,
    flaggedCount,
    totalBilled,
    avgAnomalyScore,
  };
}

export async function getStateDistribution(): Promise<{ state: string; count: number }[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('state');
  
  if (error) {
    throw error;
  }
  
  // Aggregate by state
  const stateMap = new Map<string, number>();
  for (const row of data || []) {
    const state = row.state || 'XX';
    stateMap.set(state, (stateMap.get(state) || 0) + 1);
  }
  
  return Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getSpecialtyDistribution(): Promise<{ specialty: string; count: number; avgAnomaly: number }[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('specialty, anomaly_score');
  
  if (error) {
    throw error;
  }
  
  // Aggregate by specialty
  const specialtyMap = new Map<string, { count: number; totalAnomaly: number }>();
  for (const row of data || []) {
    const specialty = row.specialty || 'Unknown';
    const existing = specialtyMap.get(specialty) || { count: 0, totalAnomaly: 0 };
    existing.count += 1;
    existing.totalAnomaly += row.anomaly_score || 0;
    specialtyMap.set(specialty, existing);
  }
  
  return Array.from(specialtyMap.entries())
    .map(([specialty, stats]) => ({
      specialty,
      count: stats.count,
      avgAnomaly: stats.count > 0 ? stats.totalAnomaly / stats.count : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// Re-export US_STATES from constants for backward compatibility
export { US_STATES } from '@/lib/constants';
