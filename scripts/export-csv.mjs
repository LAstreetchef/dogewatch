/**
 * Export filtered providers to CSV using DuckDB
 * Then we can import the CSV to Supabase
 */

import { DuckDBInstance } from '@duckdb/node-api';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PARQUET_PATH = resolve(__dirname, '../data/medicaid-provider-spending.parquet');
const CSV_PATH = resolve(__dirname, '../data/providers-filtered.csv');

const MIN_PAID = parseInt(process.argv[2]) || 500000;

async function main() {
  console.log('🦆 DuckDB CSV Export');
  console.log(`💰 Min paid: $${MIN_PAID.toLocaleString()}`);
  console.log(`📁 Output: ${CSV_PATH}`);
  console.log('');
  
  const db = await DuckDBInstance.create(':memory:');
  const conn = await db.connect();
  
  // Export directly to CSV - DuckDB handles memory efficiently
  const query = `
    COPY (
      SELECT 
        BILLING_PROVIDER_NPI_NUM as npi,
        SUM(TOTAL_PAID) as total_billed,
        SUM(TOTAL_CLAIMS) as total_claims,
        SUM(TOTAL_UNIQUE_BENEFICIARIES) as beneficiaries
      FROM '${PARQUET_PATH}'
      GROUP BY BILLING_PROVIDER_NPI_NUM
      HAVING SUM(TOTAL_PAID) >= ${MIN_PAID}
      ORDER BY total_billed DESC
    ) TO '${CSV_PATH}' (HEADER, DELIMITER ',');
  `;
  
  console.log('📊 Querying and exporting...');
  await conn.run(query);
  
  console.log('✅ Done! CSV exported.');
  
  // Count rows
  const countResult = await conn.run(`SELECT COUNT(*) FROM '${CSV_PATH}'`);
  const rows = await countResult.getRows();
  console.log(`📈 Exported ${rows[0][0]} providers`);
  
  await conn.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
