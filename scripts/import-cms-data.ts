/**
 * CMS Medicare Provider Data Import Script
 * 
 * Fetches Medicare Physician & Other Practitioners data from data.cms.gov
 * and imports into Supabase providers/provider_billing tables.
 * 
 * Usage: npx tsx scripts/import-cms-data.ts [--limit=N] [--state=XX]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CMS API endpoint for Medicare Physician & Other Practitioners - By Provider and Service
// Dataset ID: 92396110-2aed-4d63-a6a2-5d6207d46a29 (2023 data)
const CMS_API_BASE = 'https://data.cms.gov/data-api/v1/dataset/92396110-2aed-4d63-a6a2-5d6207d46a29/data';

interface CMSRecord {
  Rndrng_NPI: string;
  Rndrng_Prvdr_Last_Org_Name: string;
  Rndrng_Prvdr_First_Name: string;
  Rndrng_Prvdr_MI: string;
  Rndrng_Prvdr_Crdntls: string;
  Rndrng_Prvdr_State_Abrvtn: string;
  Rndrng_Prvdr_City: string;
  Rndrng_Prvdr_Zip5: string;
  Rndrng_Prvdr_Type: string;
  HCPCS_Cd: string;
  HCPCS_Desc: string;
  Tot_Benes: string;
  Tot_Srvcs: string;
  Avg_Sbmtd_Chrg: string;
  Avg_Mdcr_Pymt_Amt: string;
  Avg_Mdcr_Alowd_Amt: string;
}

interface ProviderAggregate {
  npi: string;
  name: string;
  state: string;
  city: string;
  zip: string;
  specialty: string;
  credentials: string;
  totalBilled: number;
  totalClaims: number;
  totalBeneficiaries: number;
  procedures: Map<string, { code: string; billed: number; claims: number; beneficiaries: number }>;
}

async function fetchCMSData(offset: number, size: number, stateFilter?: string): Promise<CMSRecord[]> {
  let url = `${CMS_API_BASE}?offset=${offset}&size=${size}`;
  
  if (stateFilter) {
    url += `&filter[Rndrng_Prvdr_State_Abrvtn]=${stateFilter}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CMS API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

function formatProviderName(record: CMSRecord): string {
  const firstName = record.Rndrng_Prvdr_First_Name || '';
  const lastName = record.Rndrng_Prvdr_Last_Org_Name || '';
  const mi = record.Rndrng_Prvdr_MI ? ` ${record.Rndrng_Prvdr_MI}` : '';
  const creds = record.Rndrng_Prvdr_Crdntls ? `, ${record.Rndrng_Prvdr_Crdntls}` : '';
  
  if (firstName) {
    return `${firstName}${mi} ${lastName}${creds}`;
  }
  return `${lastName}${creds}`;
}

function calculateAnomalyScore(
  totalBilled: number,
  totalClaims: number,
  avgBilledPerClaim: number,
  peerAvgBilled: number,
  peerAvgClaims: number
): number {
  // Simple anomaly scoring based on deviation from peer averages
  // Returns 0-1 where higher = more anomalous
  
  let score = 0;
  
  // Factor 1: Total billed vs peer average (weighted 40%)
  if (peerAvgBilled > 0) {
    const billedRatio = totalBilled / peerAvgBilled;
    if (billedRatio > 3) score += 0.4;
    else if (billedRatio > 2) score += 0.3;
    else if (billedRatio > 1.5) score += 0.2;
    else if (billedRatio > 1.2) score += 0.1;
  }
  
  // Factor 2: Claims volume vs peer average (weighted 30%)
  if (peerAvgClaims > 0) {
    const claimsRatio = totalClaims / peerAvgClaims;
    if (claimsRatio > 3) score += 0.3;
    else if (claimsRatio > 2) score += 0.2;
    else if (claimsRatio > 1.5) score += 0.1;
  }
  
  // Factor 3: Average per claim vs peer (weighted 30%)
  // High avg per claim could indicate upcoding
  const peerAvgPerClaim = peerAvgBilled / Math.max(peerAvgClaims, 1);
  if (peerAvgPerClaim > 0) {
    const perClaimRatio = avgBilledPerClaim / peerAvgPerClaim;
    if (perClaimRatio > 2) score += 0.3;
    else if (perClaimRatio > 1.5) score += 0.2;
    else if (perClaimRatio > 1.2) score += 0.1;
  }
  
  return Math.min(score, 1);
}

async function main() {
  const args = process.argv.slice(2);
  let limitArg = args.find(a => a.startsWith('--limit='));
  let stateArg = args.find(a => a.startsWith('--state='));
  
  const maxRecords = limitArg ? parseInt(limitArg.split('=')[1]) : 50000;
  const stateFilter = stateArg ? stateArg.split('=')[1].toUpperCase() : undefined;
  
  console.log('🐕 DogeWatch CMS Data Importer');
  console.log(`📊 Fetching up to ${maxRecords} records${stateFilter ? ` for state: ${stateFilter}` : ''}`);
  console.log('');
  
  const providers = new Map<string, ProviderAggregate>();
  const specialtyStats = new Map<string, { totalBilled: number; totalClaims: number; count: number }>();
  
  let offset = 0;
  const batchSize = 1000;
  let totalFetched = 0;
  
  // Fetch and aggregate data
  while (totalFetched < maxRecords) {
    const remaining = maxRecords - totalFetched;
    const fetchSize = Math.min(batchSize, remaining);
    
    process.stdout.write(`\r⏳ Fetching records ${offset} - ${offset + fetchSize}...`);
    
    try {
      const records = await fetchCMSData(offset, fetchSize, stateFilter);
      
      if (records.length === 0) {
        console.log('\n✅ No more records');
        break;
      }
      
      for (const record of records) {
        const npi = record.Rndrng_NPI;
        if (!npi) continue;
        
        const totalBilled = parseFloat(record.Avg_Mdcr_Pymt_Amt || '0') * parseInt(record.Tot_Srvcs || '0');
        const claims = parseInt(record.Tot_Srvcs || '0');
        const beneficiaries = parseInt(record.Tot_Benes || '0');
        
        // Aggregate by provider
        let provider = providers.get(npi);
        if (!provider) {
          provider = {
            npi,
            name: formatProviderName(record),
            state: record.Rndrng_Prvdr_State_Abrvtn || 'XX',
            city: record.Rndrng_Prvdr_City || '',
            zip: record.Rndrng_Prvdr_Zip5 || '',
            specialty: record.Rndrng_Prvdr_Type || 'Unknown',
            credentials: record.Rndrng_Prvdr_Crdntls || '',
            totalBilled: 0,
            totalClaims: 0,
            totalBeneficiaries: 0,
            procedures: new Map(),
          };
          providers.set(npi, provider);
        }
        
        provider.totalBilled += totalBilled;
        provider.totalClaims += claims;
        provider.totalBeneficiaries += beneficiaries;
        
        // Track procedure codes
        const hcpcs = record.HCPCS_Cd;
        if (hcpcs) {
          const existing = provider.procedures.get(hcpcs) || { code: hcpcs, billed: 0, claims: 0, beneficiaries: 0 };
          existing.billed += totalBilled;
          existing.claims += claims;
          existing.beneficiaries += beneficiaries;
          provider.procedures.set(hcpcs, existing);
        }
        
        // Track specialty stats for peer comparison
        const specialty = provider.specialty;
        const stats = specialtyStats.get(specialty) || { totalBilled: 0, totalClaims: 0, count: 0 };
        stats.totalBilled += totalBilled;
        stats.totalClaims += claims;
        stats.count += 1;
        specialtyStats.set(specialty, stats);
      }
      
      totalFetched += records.length;
      offset += fetchSize;
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 100));
      
    } catch (error) {
      console.error(`\n❌ Error fetching batch: ${error}`);
      break;
    }
  }
  
  console.log(`\n\n📊 Aggregated ${providers.size} unique providers from ${totalFetched} records`);
  
  // Calculate anomaly scores
  console.log('🔍 Calculating anomaly scores...');
  
  for (const provider of providers.values()) {
    const peerStats = specialtyStats.get(provider.specialty);
    if (peerStats && peerStats.count > 1) {
      const peerAvgBilled = peerStats.totalBilled / peerStats.count;
      const peerAvgClaims = peerStats.totalClaims / peerStats.count;
      const avgPerClaim = provider.totalClaims > 0 ? provider.totalBilled / provider.totalClaims : 0;
      
      (provider as any).anomalyScore = calculateAnomalyScore(
        provider.totalBilled,
        provider.totalClaims,
        avgPerClaim,
        peerAvgBilled,
        peerAvgClaims
      );
    } else {
      (provider as any).anomalyScore = 0;
    }
  }
  
  // Insert into Supabase
  console.log('💾 Inserting providers into Supabase...');
  
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  
  const providerArray = Array.from(providers.values());
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < providerArray.length; i += BATCH_SIZE) {
    const batch = providerArray.slice(i, i + BATCH_SIZE);
    
    const upsertData = batch.map(p => ({
      npi: p.npi,
      name: p.name,
      state: p.state,
      specialty: p.specialty,
      anomaly_score: (p as any).anomalyScore || 0,
      is_flagged: ((p as any).anomalyScore || 0) >= 0.7,
      total_billed: p.totalBilled,
      total_claims: p.totalClaims,
      avg_monthly: p.totalBilled / 12,
      data_updated_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
      .from('providers')
      .upsert(upsertData, { onConflict: 'npi' });
    
    if (error) {
      console.error(`\n❌ Batch insert error: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
    
    process.stdout.write(`\r💾 Processed ${Math.min(i + BATCH_SIZE, providerArray.length)}/${providerArray.length} providers...`);
  }
  
  console.log(`\n\n✅ Import complete!`);
  console.log(`   📥 ${inserted} providers inserted/updated`);
  console.log(`   ❌ ${errors} errors`);
  
  // Insert billing data for top anomalous providers
  console.log('\n📊 Inserting billing details for flagged providers...');
  
  const flaggedProviders = providerArray
    .filter(p => ((p as any).anomalyScore || 0) >= 0.5)
    .slice(0, 500);
  
  let billingInserted = 0;
  
  for (const provider of flaggedProviders) {
    // Get provider ID
    const { data: providerRow } = await supabase
      .from('providers')
      .select('id')
      .eq('npi', provider.npi)
      .single();
    
    if (!providerRow) continue;
    
    // Insert top procedure codes
    const procedures = Array.from(provider.procedures.values())
      .sort((a, b) => b.billed - a.billed)
      .slice(0, 10);
    
    for (const proc of procedures) {
      const { error } = await supabase
        .from('provider_billing')
        .upsert({
          provider_id: providerRow.id,
          year: 2023,
          month: 0, // Annual data
          procedure_code: proc.code,
          amount: proc.billed,
          claims: proc.claims,
          beneficiaries: proc.beneficiaries,
        }, { onConflict: 'provider_id,year,month,procedure_code' });
      
      if (!error) billingInserted++;
    }
  }
  
  console.log(`✅ Inserted ${billingInserted} billing records`);
  
  // Summary stats
  const flaggedCount = providerArray.filter(p => ((p as any).anomalyScore || 0) >= 0.7).length;
  const warningCount = providerArray.filter(p => {
    const score = (p as any).anomalyScore || 0;
    return score >= 0.4 && score < 0.7;
  }).length;
  
  console.log('\n📈 Summary:');
  console.log(`   🚨 ${flaggedCount} high-risk providers (score >= 0.7)`);
  console.log(`   ⚠️  ${warningCount} moderate-risk providers (0.4-0.7)`);
  console.log(`   ✅ ${providerArray.length - flaggedCount - warningCount} normal providers`);
}

main().catch(console.error);
