import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- ORDERS ---');
  const { data: orders, error: oErr } = await supabase.from('orders').select('*').limit(1);
  if (oErr) console.log('Orders error:', oErr);
  else if (orders && orders[0]) console.log('Orders columns:', Object.keys(orders[0]));
  else console.log('Orders empty or no columns');

  console.log('--- CONVERSION JOBS ---');
  const { data: jobs, error: jErr } = await supabase.from('conversion_jobs').select('*').limit(1);
  if (jErr) console.log('Jobs error:', jErr);
  else if (jobs && jobs[0]) console.log('Jobs columns:', Object.keys(jobs[0]));
  else console.log('Jobs empty or no columns');

  console.log('--- PROFILES ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  if (pErr) console.log('Profiles error:', pErr);
  else if (profiles && profiles[0]) console.log('Profiles columns:', Object.keys(profiles[0]));
  else console.log('Profiles empty or no columns');
}

main();
