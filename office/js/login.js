/**
 * Office Login Logic
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    /* ── Prevent back-cache login issue ── */
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            checkExistingSession();
        }
    });

    /* ── Check if already logged in ── */
    async function checkExistingSession() {
        try {
            var session = await getSession();
            if (session) {
                window.location.replace('index.html');
            }
        } catch (e) {
            /* No session, stay on login */
        }
    }

    /* Wait for supabase then check session */
    waitForSupabase().then(function () {
        checkExistingSession();
    }).catch(function () { });

    /* ── Show/Hide Password ── */
    var pwdToggle = document.getElementById('pwd-toggle');
    if (pwdToggle) {
        pwdToggle.addEventListener('click', function () {
            var pwdInput = document.getElementById('password');
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                pwdToggle.textContent = '🙈';
            } else {
                pwdInput.type = 'password';
                pwdToggle.textContent = '👁';
            }
        });
    }

    /* ── Login Form Submit ── */
    var loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            var errEl = document.getElementById('login-error');
            errEl.style.display = 'none';
            errEl.textContent = '';

            var email = document.getElementById('email').value.trim();
            var password = document.getElementById('password').value;
            var remember = document.getElementById('remember').checked;

            /* Validate */
            if (!email) {
                showError('Please enter your email.');
                return;
            }
            if (!isValidEmail(email)) {
                showError('Please enter a valid email address.');
                return;
            }
            if (!password) {
                showError('Please enter your password.');
                return;
            }

            var btn = document.getElementById('login-btn');
            btnLoading(btn, true);

            try {
                var data = await signIn(email, password);

                /* Remember login preference */
                if (remember) {
                    lsSet('erp_remember', true);
                } else {
                    lsRemove('erp_remember');
                }

                showToast('Login successful!', 'success');

                /* Redirect to dashboard */
                setTimeout(function () {
                    window.location.replace('index.html');
                }, 500);

            } catch (err) {
                var msg = err.message || 'Login failed.';
                if (msg.includes('Invalid login')) {
                    msg = 'Invalid email or password.';
                }
                showError(msg);
                btnLoading(btn, false, 'Sign In');
            }
        });
    }

    function showError(msg) {
        var errEl = document.getElementById('login-error');
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }

})();
