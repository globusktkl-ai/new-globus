/**

* NEW GLOBUS ERP v1.00
* Supabase Client
  */

const SUPABASE_URL = 'https://kwrugdbrzrfbmibaccwr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pf_pB13Hv4ycYmNSiD75XQ_cT0b5eOM';

// Load Supabase library
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
document.head.appendChild(script);

let supabaseClient = null;

function waitForSupabase() {
return new Promise((resolve, reject) => {
let attempts = 0;

```
    const check = setInterval(() => {
        attempts++;

        if (window.supabase && window.supabase.createClient) {
            clearInterval(check);

            if (!supabaseClient) {
                supabaseClient = window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_ANON_KEY
                );

                // Make client globally available
                window.supabaseClient = supabaseClient;
            }

            resolve(supabaseClient);
        }

        if (attempts > 50) {
            clearInterval(check);
            reject(new Error('Supabase failed to load'));
        }
    }, 100);
});
```

}
