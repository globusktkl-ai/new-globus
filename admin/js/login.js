/**
 * Admin Login Logic
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';

    window.addEventListener('pageshow', function (e) {
        if (e.persisted) checkSession();
    });

    function checkSession() {
        var session = getAdminSession();
        if (session && session.id && session.role === 'admin') {
            window.location.replace('dashboard.html');
        }
    }

    function getAdminSession() {
        try {
            var s = localStorage.getItem(ADMIN_SESSION_KEY);
            if (!s) s = sessionStorage.getItem(ADMIN_SESSION_KEY);
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    }

    function setAdminSession(data, remember) {
        var json = JSON.stringify(data);
        if (remember) {
            localStorage.setItem(ADMIN_SESSION_KEY, json);
        } else {
            sessionStorage.setItem(ADMIN_SESSION_KEY, json);
        }
    }

    waitForSupabase().then(function () {
        checkSession();
    }).catch(function () { });

    /* Password Toggle */
    document.getElementById('pwd-toggle').addEventListener('click', function () {
        var pwdInput = document.getElementById('password');
        if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            this.textContent = '🙈';
        } else {
            pwdInput.type = 'password';
            this.textContent = '👁';
        }
    });

    /* Login Form */
    document.getElementById('login-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        var errEl = document.getElementById('login-error');
        errEl.style.display = 'none';

        var email = document.getElementById('email').value.trim();
        var password = document.getElementById('password').value;
        var remember = document.getElementById('remember').checked;

        if (!email || !password) {
            showError('Please enter email and password.');
            return;
        }

        var btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        try {
            await waitForSupabase();

            /* Sign in with Supabase Auth */
            var data = await signIn(email, password);

            if (!data || !data.user) {
                showError('Invalid email or password.');
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            /* Check if user is admin */
            var officeUser = await dbSelect('office_users', {
                eq: { id: data.user.id },
                single: true
            });

            if (!officeUser || (officeUser.role !== 'admin' && officeUser.role !== 'superadmin')) {
                showError('Access denied. Admin privileges required.');
                await signOut();
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            if (!officeUser.is_active) {
                showError('Account is inactive. Contact support.');
                await signOut();
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            /* Log activity */
            try {
                await dbInsert('login_history', {
                    user_id: data.user.id,
                    user_type: 'admin',
                    user_name: officeUser.full_name || email,
                    status: 'success'
                });
            } catch (logErr) { }

            /* Create session */
            var sessionData = {
                id: data.user.id,
                email: email,
                name: officeUser.full_name || 'Admin',
                role: officeUser.role,
                loginAt: new Date().toISOString()
            };

            setAdminSession(sessionData, remember);

            showToast('Login successful!', 'success');

            setTimeout(function () {
                window.location.replace('dashboard.html');
            }, 500);

        } catch (err) {
            console.error(err);

            /* Log failed attempt */
            try {
                await dbInsert('login_history', {
                    user_type: 'admin',
                    user_name: email,
                    status: 'failed',
                    failure_reason: err.message
                });
            } catch (logErr) { }

            var msg = err.message || 'Login failed.';
            if (msg.includes('Invalid login')) msg = 'Invalid email or password.';
            showError(msg);
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    });

    function showError(msg) {
        var errEl = document.getElementById('login-error');
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }

})();
