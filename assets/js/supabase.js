/**

* NEW GLOBUS ERP v1.01
* Supabase Client
  */

const SUPABASE_URL = 'https://kwrugdbrzrfbmibaccwr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pf_pB13Hv4ycYmNSiD75XQ_cT0b5eOM';

// Load UMD version (browser compatible)
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

script.onload = function () {
window.supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);
};

script.onerror = function () {
console.error('Supabase failed to load');
};

document.head.appendChild(script);
