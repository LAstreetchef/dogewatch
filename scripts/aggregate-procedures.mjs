/**
 * Aggregate procedure data per provider from parquet
 * Stores: top codes, concentration ratio, diversity score
 */

import { DuckDBInstance } from '@duckdb/node-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PARQUET_PATH = resolve(__dirname, '../data/medicaid-provider-spending.parquet');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('📊 Procedure Aggregation');
  console.log('');
  
  const db = await DuckDBInstance.create(':memory:');
  const conn = await db.connect();
  
  // Get procedure stats per provider
  console.log('🦆 Querying procedure patterns (this takes a while)...');
  
  const query = `
    WITH provider_codes AS (
      SELECT 
        BILLING_PROVIDER_NPI_NUM as npi,
        HCPCS_CODE as code,
        SUM(TOTAL_PAID) as code_paid,
        SUM(TOTAL_CLAIMS) as code_claims
      FROM '${PARQUET_PATH}'
      GROUP BY BILLING_PROVIDER_NPI_NUM, HCPCS_CODE
    ),
    provider_totals AS (
      SELECT
        npi,
        SUM(code_paid) as total_paid,
        COUNT(DISTINCT code) as unique_codes
      FROM provider_codes
      GROUP BY npi
    ),
    provider_top_code AS (
      SELECT 
        npi,
        code as top_code,
        code_paid as top_code_paid,
        ROW_NUMBER() OVER (PARTITION BY npi ORDER BY code_paid DESC) as rn
      FROM provider_codes
    )
    SELECT 
      t.npi,
      t.total_paid,
      t.unique_codes,
      tc.top_code,
      tc.top_code_paid,
      ROUND(tc.top_code_paid / NULLIF(t.total_paid, 0) * 100, 2) as top_code_pct
    FROM provider_totals t
    LEFT JOIN provider_top_code tc ON t.npi = tc.npi AND tc.rn = 1
    WHERE t.total_paid >= 1000000
    ORDER BY t.total_paid DESC
  `;
  
  const result = await conn.run(query);
  const rows = await result.getRows();
  
  console.log(`📈 Got ${rows.length} providers with procedure data`);
  
  // Update providers with procedure stats
  console.log('📤 Updating Supabase...');
  
  let updated = 0;
  let errors = 0;
  const BATCH = 100;
  
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    
    for (const row of batch) {
      const [npi, totalPaid, uniqueCodes, topCode, topCodePaid, topCodePct] = row;
      
      // Convert BigInt to Number
      const numUniqueCodes = Number(uniqueCodes);
      const numTopCodePct = Number(topCodePct);
      
      // Calculate diversity score (more codes = lower concentration = healthier)
      // Score 0-1 where 1 = diverse, 0 = concentrated
      const diversityScore = Math.min(1, numUniqueCodes / 50); // 50+ codes = max diversity
      const concentrationRisk = numTopCodePct > 50 ? 1 : numTopCodePct / 50; // High % in one code = risky
      
      const { error } = await supabase
        .from('providers')
        .update({
          procedure_diversity: diversityScore,
          top_procedure_code: topCode,
          top_procedure_pct: numTopCodePct,
        })
        .eq('npi', npi);
      
      if (error) errors++;
      else updated++;
    }
    
    if ((i + BATCH) % 1000 === 0) {
      console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length} updated...`);
    }
  }
  
  console.log('');
  console.log(`✅ Done! Updated: ${updated}, Errors: ${errors}`);
}

main().catch(console.error);
