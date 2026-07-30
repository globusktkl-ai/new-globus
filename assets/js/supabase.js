/**

* NEW GLOBUS ERP v1.00
* Supabase Client
  */

const SUPABASE_URL = 'https://kwrugdbrzrfbmibaccwr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pf_pB13Hv4ycYmNSiD75XQ_cT0b5eOM';

let supabaseClient = null;

function waitForSupabase() {
return new Promise((resolve, reject) => {

```
    if (window.supabase && window.supabase.createClient) {
        if (!supabaseClient) {
            supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );
        }
        resolve(supabaseClient);
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

    script.onload = () => {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );
        resolve(supabaseClient);
    };

    script.onerror = () => {
        reject(new Error('Supabase failed to load'));
    };

    document.head.appendChild(script);

});
```

}
