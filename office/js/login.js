/**

* NEW GLOBUS ERP v1.01
* Office Login
  */

(function () {
'use strict';

```
// If already logged in
if (localStorage.getItem('office_logged_in') === 'true') {
    window.location.replace('index.html');
    return;
}

// Password toggle
const toggle = document.getElementById('pwd-toggle');
const passwordInput = document.getElementById('password');

if (toggle && passwordInput) {
    toggle.addEventListener('click', function () {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggle.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggle.textContent = '👁';
        }
    });
}

// Login form
const form = document.getElementById('login-form');

if (form) {
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        const errorBox = document.getElementById('login-error');
        errorBox.style.display = 'none';

        if (!email || !password) {
            showError('Please enter email and password');
            return;
        }

        const btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.textContent = 'Signing In...';

        try {
            // Wait until Supabase client is ready
            let attempts = 0;
            while (!window.supabaseClient && attempts < 50) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.supabaseClient) {
    showError('Supabase not loaded');
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
}
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                showError('Invalid email or password');
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            // Save session
            localStorage.setItem('office_logged_in', 'true');
            localStorage.setItem('office_user_id', data.id);
            localStorage.setItem('office_user_name', data.full_name);
            localStorage.setItem('office_user_role', data.role);

            // Remember login
            if (remember) {
                localStorage.setItem('office_remember', 'true');
            } else {
                localStorage.removeItem('office_remember');
            }

            window.location.replace('index.html');

        } catch (err) {
            console.error(err);
            showError(err.message || 'Unable to connect to server');
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    });
}

function showError(msg) {
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
}
```

})();
