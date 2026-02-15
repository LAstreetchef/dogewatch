/**
 * DogeWatch Parquet Import Script
 * 
 * Imports the HHS Medicaid Provider Spending parquet file into Supabase.
 * Uses DuckDB for fast parquet processing.
 * 
 * Usage: npx tsx scripts/import-parquet.ts [--limit=N] [--min-paid=N]
 */

import { DuckDBInstance } from '@duckdb/node-api';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PARQUET_PATH = resolve(__dirname, '../data/medicaid-provider-spending.parquet');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface AggregatedProvider {
  npi: string;
  total_paid: number;
  total_claims: number;
  total_beneficiaries: number;
  procedure_count: number;
  month_count: number;
  avg_per_claim: number;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const minPaidArg = args.find(a => a.startsWith('--min-paid='));
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const minPaid = minPaidArg ? parseInt(minPaidArg.split('=')[1]) : 10000; // Default: $10k minimum
  
  console.log('🐕 DogeWatch Parquet Importer');
  console.log('━'.repeat(50));
  console.log(`📁 File: ${PARQUET_PATH}`);
  console.log(`💰 Min total paid: $${minPaid.toLocaleString()}`);
  if (limit) console.log(`📊 Limit: ${limit.toLocaleString()} providers`);
  console.log('');
  
  // Initialize DuckDB
  console.log('🦆 Initializing DuckDB...');
  const db = await DuckDBInstance.create(':memory:');
  const conn = await db.connect();
  
  // Step 1: Aggregate providers
  console.log('📊 Aggregating provider data (this may take a few minutes)...');
  const startTime = Date.now();
  
  const aggregateQuery = `
    SELECT 
      BILLING_PROVIDER_NPI_NUM as npi,
      SUM(TOTAL_PAID) as total_paid,
      SUM(TOTAL_CLAIMS) as total_claims,
      SUM(TOTAL_UNIQUE_BENEFICIARIES) as total_beneficiaries,
      COUNT(DISTINCT HCPCS_CODE) as procedure_count,
      COUNT(DISTINCT CLAIM_FROM_MONTH) as month_count
    FROM '${PARQUET_PATH}'
    GROUP BY BILLING_PROVIDER_NPI_NUM
    HAVING SUM(TOTAL_PAID) >= ${minPaid}
    ORDER BY total_paid DESC
    ${limit ? `LIMIT ${limit}` : ''}
  `;
  
  const result = await conn.run(aggregateQuery);
  const rows = await result.getRows();
  
  const providers: AggregatedProvider[] = rows.map((row: any) => ({
    npi: row[0],
    total_paid: Number(row[1]),
    total_claims: Number(row[2]),
    total_beneficiaries: Number(row[3]),
    procedure_count: Number(row[4]),
    month_count: Number(row[5]),
    avg_per_claim: Number(row[2]) > 0 ? Number(row[1]) / Number(row[2]) : 0,
  }));
  
  const aggregateTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Aggregated ${providers.length.toLocaleString()} providers in ${aggregateTime}s`);
  
  // Step 2: Calculate peer statistics for anomaly scoring
  console.log('🔍 Calculating anomaly scores...');
  
  // Calculate overall statistics
  const totalPaidValues = providers.map(p => p.total_paid);
  const avgPerClaimValues = providers.map(p => p.avg_per_claim);
  
  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  
  const percentile = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[idx];
  };
  
  const medianPaid = median(totalPaidValues);
  const p90Paid = percentile(totalPaidValues, 0.90);
  const p99Paid = percentile(totalPaidValues, 0.99);
  const medianPerClaim = median(avgPerClaimValues);
  const p90PerClaim = percentile(avgPerClaimValues, 0.90);
  
  console.log(`   Median total paid: $${medianPaid.toLocaleString()}`);
  console.log(`   90th percentile: $${p90Paid.toLocaleString()}`);
  console.log(`   99th percentile: $${p99Paid.toLocaleString()}`);
  
  // Calculate anomaly scores
  const scoredProviders = providers.map(p => {
    let score = 0;
    
    // Factor 1: Total paid vs median (0-0.4)
    if (p.total_paid > p99Paid) score += 0.4;
    else if (p.total_paid > p90Paid) score += 0.25;
    else if (p.total_paid > medianPaid * 5) score += 0.15;
    else if (p.total_paid > medianPaid * 2) score += 0.05;
    
    // Factor 2: Average per claim vs median (0-0.3)
    if (p.avg_per_claim > p90PerClaim * 3) score += 0.3;
    else if (p.avg_per_claim > p90PerClaim * 2) score += 0.2;
    else if (p.avg_per_claim > p90PerClaim) score += 0.1;
    
    // Factor 3: High concentration in few procedures (0-0.3)
    // If billing huge amounts with very few procedure codes, suspicious
    const avgPerProcedure = p.total_paid / Math.max(p.procedure_count, 1);
    if (avgPerProcedure > p99Paid / 5 && p.procedure_count < 10) score += 0.3;
    else if (avgPerProcedure > p90Paid / 5 && p.procedure_count < 20) score += 0.15;
    
    return {
      ...p,
      anomaly_score: Math.min(score, 1),
      is_flagged: score >= 0.7,
    };
  });
  
  const flaggedCount = scoredProviders.filter(p => p.is_flagged).length;
  const moderateCount = scoredProviders.filter(p => p.anomaly_score >= 0.4 && p.anomaly_score < 0.7).length;
  
  console.log(`   🚨 High risk (≥0.7): ${flaggedCount.toLocaleString()}`);
  console.log(`   ⚠️  Moderate (0.4-0.7): ${moderateCount.toLocaleString()}`);
  
  // Step 3: Insert into Supabase
  console.log('');
  console.log('💾 Inserting into Supabase...');
  
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < scoredProviders.length; i += BATCH_SIZE) {
    const batch = scoredProviders.slice(i, i + BATCH_SIZE);
    
    const upsertData = batch.map(p => ({
      npi: p.npi,
      name: `Provider ${p.npi}`, // Placeholder - will enrich with NPI registry later
      state: 'XX', // Placeholder
      specialty: null,
      anomaly_score: p.anomaly_score,
      is_flagged: p.is_flagged,
      total_billed: p.total_paid,
      total_claims: p.total_claims,
      avg_monthly: p.total_paid / Math.max(p.month_count, 1),
      data_updated_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
      .from('providers')
      .upsert(upsertData, { onConflict: 'npi' });
    
    if (error) {
      console.error(`\n❌ Batch error at ${i}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
    
    process.stdout.write(`\r   Processed ${Math.min(i + BATCH_SIZE, scoredProviders.length).toLocaleString()}/${scoredProviders.length.toLocaleString()} providers...`);
  }
  
  console.log('');
  console.log('');
  console.log('━'.repeat(50));
  console.log('✅ Import complete!');
  console.log(`   📥 ${inserted.toLocaleString()} providers imported`);
  console.log(`   ❌ ${errors.toLocaleString()} errors`);
  console.log(`   🚨 ${flaggedCount.toLocaleString()} flagged for review`);
  console.log('');
  console.log('🐕 The Sniffer is ready to hunt!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
