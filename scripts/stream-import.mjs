/**
 * Streaming Parquet Import - Low memory usage
 * Reads parquet in chunks, inserts to Supabase in batches
 */

import { createClient } from '@supabase/supabase-js';
import parquet from 'parquetjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PARQUET_PATH = resolve(__dirname, '../data/medicaid-provider-spending.parquet');

const MIN_PAID = parseInt(process.argv[2]) || 500000;
const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Aggregate providers as we stream
const providers = new Map();

async function main() {
  console.log('🐕 Streaming Parquet Import');
  console.log(`💰 Min paid: $${MIN_PAID.toLocaleString()}`);
  console.log('');

  const reader = await parquet.ParquetReader.openFile(PARQUET_PATH);
  const cursor = reader.getCursor();
  
  let rowCount = 0;
  let record;
  
  console.log('📖 Reading parquet (streaming)...');
  
  while (record = await cursor.next()) {
    rowCount++;
    
    if (rowCount % 100000 === 0) {
      console.log(`  Processed ${rowCount.toLocaleString()} rows, ${providers.size} providers...`);
    }
    
    const npi = record.Rndrng_NPI?.toString();
    if (!npi) continue;
    
    const paid = parseFloat(record.Tot_Mdcr_Pymt_Amt) || 0;
    
    // Aggregate by NPI
    if (!providers.has(npi)) {
      providers.set(npi, {
        npi,
        name: record.Rndrng_Prvdr_Last_Org_Name || 'Unknown',
        state: record.Rndrng_Prvdr_State_Abrvtn || 'XX',
        specialty: record.Rndrng_Prvdr_Type || null,
        total_billed: 0,
        total_claims: 0,
        beneficiaries: 0,
      });
    }
    
    const p = providers.get(npi);
    p.total_billed += paid;
    p.total_claims += parseInt(record.Tot_Srvcs) || 0;
    p.beneficiaries += parseInt(record.Tot_Benes) || 0;
  }
  
  await reader.close();
  
  console.log(`\n✅ Read ${rowCount.toLocaleString()} rows`);
  console.log(`👥 Found ${providers.size} unique providers`);
  
  // Filter by min paid
  const filtered = [...providers.values()].filter(p => p.total_billed >= MIN_PAID);
  console.log(`💰 ${filtered.length} providers with >= $${MIN_PAID.toLocaleString()}`);
  
  // Calculate anomaly scores (simple: ratio to median)
  const billings = filtered.map(p => p.total_billed).sort((a, b) => a - b);
  const median = billings[Math.floor(billings.length / 2)] || 1;
  
  const scored = filtered.map(p => ({
    ...p,
    anomaly_score: Math.min(1, p.total_billed / (median * 3)),
    is_flagged: p.total_billed > median * 5,
  }));
  
  // Insert in batches
  console.log(`\n📤 Inserting to Supabase...`);
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < scored.length; i += BATCH_SIZE) {
    const batch = scored.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('providers')
      .upsert(batch.map(p => ({
        npi: p.npi,
        name: p.name,
        state: p.state,
        specialty: p.specialty,
        total_billed: p.total_billed,
        total_claims: p.total_claims,
        beneficiaries: p.beneficiaries,
        anomaly_score: p.anomaly_score,
        is_flagged: p.is_flagged,
      })), { onConflict: 'npi' });
    
    if (error) {
      console.error(`  Batch error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
    
    if ((i + BATCH_SIZE) % 1000 === 0) {
      console.log(`  ${inserted} inserted...`);
    }
  }
  
  console.log(`\n✅ Done! Inserted: ${inserted}, Errors: ${errors}`);
}

main().catch(console.error);
