/**
 * Import CSV to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CSV_PATH = resolve(__dirname, '../data/providers-filtered.csv');
const BATCH_SIZE = 500;

async function main() {
  console.log('📤 Importing CSV to Supabase...');
  
  const records = [];
  
  // Parse CSV
  const parser = createReadStream(CSV_PATH).pipe(
    parse({ columns: true, skip_empty_lines: true })
  );
  
  for await (const record of parser) {
    const totalBilled = parseFloat(record.total_billed) || 0;
    records.push({
      npi: record.npi,
      name: `Provider ${record.npi}`,
      state: 'XX',
      specialty: null,
      total_billed: totalBilled,
      total_claims: parseInt(record.total_claims) || 0,
      anomaly_score: Math.min(1, totalBilled / 50000000),
      is_flagged: totalBilled > 100000000,
    });
  }
  
  console.log(`📊 Parsed ${records.length} records`);
  
  // Sort by total_billed desc
  records.sort((a, b) => b.total_billed - a.total_billed);
  
  // Insert in batches
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('providers')
      .upsert(batch, { onConflict: 'npi' });
    
    if (error) {
      console.error(`Batch ${i} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
    
    if (i % 5000 === 0) {
      console.log(`  ${inserted}/${records.length} inserted...`);
    }
  }
  
  console.log(`\n✅ Done! Inserted: ${inserted}, Errors: ${errors}`);
}

main().catch(console.error);
