const SUPABASE_URL = 'https://kwrugdbrzrfbmibaccwr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pf_pB13Hv4ycYmNSiD75XQ_cT0b5eOM';

const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

script.onload = () => {
window.sb = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);
};

document.head.appendChild(script);
