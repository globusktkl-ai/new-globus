/**

* Office Login Logic
* NEW GLOBUS ERP v1.00
  */

(function () {
'use strict';

```
// If already logged in
if (localStorage.getItem('office_logged_in') === 'true') {
    window.location.replace('index.html');
    return;
}

// Password show/hide
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
            const sb = await waitForSupabase();

            const { data, error } = await sb
                .from('office_users')
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

            localStorage.setItem('office_logged_in', 'true');
            localStorage.setItem('office_user_id', data.id);
            localStorage.setItem('office_user_name', data.full_name);
            localStorage.setItem('office_user_role', data.role);

            if (remember) {
                localStorage.setItem('office_remember', 'true');
            } else {
                localStorage.removeItem('office_remember');
            }

            btn.textContent = 'Success';
            window.location.replace('index.html');

        } catch (err) {
            console.error(err);
            showError(err.message || 'Login failed. Please try again.');
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
