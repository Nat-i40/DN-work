import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log('Attempting to create admin user...');
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@dngigs.com',
    password: 'BBU2/DF@,ssmc[541c.78ed845ed',
  });
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success:', data.user?.email);
    console.log('User created successfully.');
  }
}
createAdmin();
