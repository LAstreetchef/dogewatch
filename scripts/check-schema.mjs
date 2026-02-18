import { DuckDBInstance } from '@duckdb/node-api';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PARQUET_PATH = resolve(__dirname, '../data/medicaid-provider-spending.parquet');

async function main() {
  const db = await DuckDBInstance.create(':memory:');
  const conn = await db.connect();
  
  const result = await conn.run(`DESCRIBE SELECT * FROM '${PARQUET_PATH}' LIMIT 1`);
  const rows = await result.getRows();
  
  console.log('Columns in parquet:');
  rows.forEach(r => console.log(`  - ${r[0]}: ${r[1]}`));
}

main().catch(console.error);
