/**
 * Supabase Client Initialization
 * Globus Technical Academy ERP v1.00
 * 
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials.
 */

const SUPABASE_URL = 'https://kwrugdbrzrfbmibaccwr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pf_pB13Hv4ycYmNSiD75XQ_cT0b5eOM
';

/* Load Supabase JS client from CDN */
const _supabaseScript = document.createElement('script');
_supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
document.head.appendChild(_supabaseScript);

let supabase = null;

function getSupabase() {
    if (!supabase) {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    }
    return supabase;
}

/* Wait for supabase to load */
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        if (getSupabase()) {
            resolve(getSupabase());
            return;
        }
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (getSupabase()) {
                clearInterval(interval);
                resolve(getSupabase());
            } else if (attempts > 50) {
                clearInterval(interval);
                reject(new Error('Supabase failed to load'));
            }
        }, 100);
    });
}

/* ── Auth Helpers ── */

async function signUp(email, password) {
    const sb = await waitForSupabase();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
}

async function signIn(email, password) {
    const sb = await waitForSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    const sb = await waitForSupabase();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    /* Clear any cached session */
    sessionStorage.clear();
}

async function getSession() {
    const sb = await waitForSupabase();
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) throw error;
    return session;
}

async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
}

/* ── Auth Guard ── */
async function requireAuth(redirectTo) {
    const redir = redirectTo || '/office/login.html';
    try {
        const session = await getSession();
        if (!session) {
            window.location.replace(redir);
            return null;
        }
        return session;
    } catch (e) {
        window.location.replace(redir);
        return null;
    }
}

/* ── DB Helpers ── */

async function dbSelect(table, options = {}) {
    const sb = await waitForSupabase();
    let query = sb.from(table).select(options.select || '*');
    if (options.eq) {
        for (const [col, val] of Object.entries(options.eq)) {
            query = query.eq(col, val);
        }
    }
    if (options.neq) {
        for (const [col, val] of Object.entries(options.neq)) {
            query = query.neq(col, val);
        }
    }
    if (options.ilike) {
        for (const [col, val] of Object.entries(options.ilike)) {
            query = query.ilike(col, val);
        }
    }
    if (options.inFilter) {
        for (const [col, val] of Object.entries(options.inFilter)) {
            query = query.in(col, val);
        }
    }
    if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending !== false });
    }
    if (options.limit) query = query.limit(options.limit);
    if (options.single) query = query.single();

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function dbInsert(table, row) {
    const sb = await waitForSupabase();
    const { data, error } = await sb.from(table).insert(row).select().single();
    if (error) throw error;
    return data;
}

async function dbUpdate(table, id, updates) {
    const sb = await waitForSupabase();
    const { data, error } = await sb.from(table).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function dbDelete(table, id) {
    const sb = await waitForSupabase();
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
}

async function dbRpc(fnName, params = {}) {
    const sb = await waitForSupabase();
    const { data, error } = await sb.rpc(fnName, params);
    if (error) throw error;
    return data;
}

/* ── Institute Settings Cache ── */
let _instituteSettings = null;

async function getInstituteSettings() {
    if (_instituteSettings) return _instituteSettings;
    try {
        const data = await dbSelect('institute_settings', { limit: 1, single: true });
        _instituteSettings = data;
        return data;
    } catch (e) {
        /* Return defaults if table is empty or not configured */
        return {
            institute_name: 'Globus Technical Academy',
            tagline: 'Excellence in Technical Education',
            primary_color: '#1a3a5c',
            accent_color: '#4a90d9',
            currency_symbol: '₹',
            country_code: '91',
            phone: '',
            email: '',
            address: ''
        };
    }
}
