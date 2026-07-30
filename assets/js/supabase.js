const SUPABASE_URL = 'https://kwrugdbrzrfbmibaccwr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pf_pB13Hv4ycYmNSiD75XQ_cT0b5eOM';

// Create client immediately
window.supabaseClient = supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);
