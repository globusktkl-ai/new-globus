/**

* NEW GLOBUS ERP v1.01
* Supabase Client
* Shared across Office / Student / Teacher / Admin
  */

const SUPABASE_URL = 'https://kwrugdbrzrfbmibaccwr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pf_pB13Hv4ycYmNSiD75XQ_cT0b5eOM';

// Create Supabase client immediately
const supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

// Make available globally
window.supabaseClient = supabaseClient;
