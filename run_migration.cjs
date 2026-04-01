const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.VITE_SUPABASE_URL ? process.env.SUPABASE_DB_URL : process.env.SUPABASE_DB_URL,
});

async function run() {
  await client.connect();
  const file = process.argv[2];
  if (!file) throw new Error("No file provided");
  const sql = fs.readFileSync(file, 'utf8');
  await client.query(sql);
  console.log('Migration applied: ' + file);
  await client.end();
}
run().catch(console.error);
