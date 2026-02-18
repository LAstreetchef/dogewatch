/**
 * Enrich providers with NPI Registry data
 * Free API: https://npiregistry.cms.hhs.gov/api/
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NPI_API = 'https://npiregistry.cms.hhs.gov/api/?version=2.1';
const BATCH_SIZE = 10; // API allows up to 200, but let's be gentle
const DELAY_MS = 100; // Rate limit protection

async function fetchNPI(npi) {
  try {
    const res = await fetch(`${NPI_API}&number=${npi}`);
    const data = await res.json();
    
    if (data.result_count === 0) return null;
    
    const result = data.results[0];
    const basic = result.basic || {};
    const address = result.addresses?.[0] || {};
    const taxonomy = result.taxonomies?.[0] || {};
    
    // Handle organization vs individual
    const name = basic.organization_name || 
      `${basic.first_name || ''} ${basic.last_name || ''}`.trim() ||
      `Provider ${npi}`;
    
    return {
      name: name.substring(0, 255),
      state: address.state || 'XX',
      specialty: taxonomy.desc?.substring(0, 255) || null,
      city: address.city || null,
    };
  } catch (err) {
    console.error(`  Error fetching NPI ${npi}:`, err.message);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🔍 NPI Registry Enrichment');
  console.log('');
  
  // Get providers needing enrichment (state = 'XX' or name starts with 'Provider')
  const { data: providers, error } = await supabase
    .from('providers')
    .select('npi')
    .or('state.eq.XX,name.like.Provider %')
    .order('total_billed', { ascending: false })
    .limit(10000); // Process top 10k first
  
  if (error) {
    console.error('Failed to fetch providers:', error.message);
    return;
  }
  
  console.log(`📊 Found ${providers.length} providers to enrich`);
  console.log('');
  
  let enriched = 0;
  let failed = 0;
  
  for (let i = 0; i < providers.length; i++) {
    const { npi } = providers[i];
    
    const info = await fetchNPI(npi);
    
    if (info) {
      const { error: updateError } = await supabase
        .from('providers')
        .update({
          name: info.name,
          state: info.state,
          specialty: info.specialty,
        })
        .eq('npi', npi);
      
      if (updateError) {
        failed++;
      } else {
        enriched++;
      }
    } else {
      failed++;
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${providers.length} processed (${enriched} enriched, ${failed} failed)`);
    }
    
    await sleep(DELAY_MS);
  }
  
  console.log('');
  console.log(`✅ Done! Enriched: ${enriched}, Failed: ${failed}`);
}

main().catch(console.error);
