const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync('./supabase/migrations/20260319003000_finance_manual_income.sql', 'utf8');
  await client.query(sql);
  console.log('Finance Manual Income Migration applied!');
  await client.end();
}
run().catch(console.error);
