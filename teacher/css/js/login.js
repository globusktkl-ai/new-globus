/**
 * Teacher Login Logic
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';

    /* Check existing session */
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) checkSession();
    });

    function checkSession() {
        var session = getTeacherSession();
        if (session && session.id) {
            window.location.replace('dashboard.html');
        }
    }

    function getTeacherSession() {
        try {
            var s = localStorage.getItem(TEACHER_SESSION_KEY);
            if (!s) s = sessionStorage.getItem(TEACHER_SESSION_KEY);
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    }

    function setTeacherSession(data, remember) {
        var json = JSON.stringify(data);
        if (remember) {
            localStorage.setItem(TEACHER_SESSION_KEY, json);
        } else {
            sessionStorage.setItem(TEACHER_SESSION_KEY, json);
        }
    }

    /* Init */
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

        var teacherId = document.getElementById('teacher-id').value.trim();
        var password = document.getElementById('password').value;
        var remember = document.getElementById('remember').checked;

        if (!teacherId) {
            showError('Please enter your Teacher ID or Email.');
            return;
        }
        if (!password) {
            showError('Please enter your password.');
            return;
        }

        var btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        try {
            await waitForSupabase();

            /* Verify login */
            var result = await dbRpc('verify_teacher_login', {
                p_code: teacherId,
                p_password: password
            });

            if (!result || result.length === 0) {
                showError('Invalid Teacher ID or password.');
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            var teacher = result[0];

            if (!teacher.is_active) {
                showError('Your account is inactive. Please contact admin.');
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            /* Fetch full teacher data */
            var fullTeacher = await dbSelect('teachers', {
                eq: { id: teacher.teacher_id },
                single: true
            });

            /* Create session */
            var sessionData = {
                id: fullTeacher.id,
                code: fullTeacher.teacher_code,
                name: fullTeacher.full_name,
                email: fullTeacher.email,
                photo: fullTeacher.photo_url,
                loginAt: new Date().toISOString()
            };

            setTeacherSession(sessionData, remember);

            showToast('Login successful!', 'success');

            setTimeout(function () {
                window.location.replace('dashboard.html');
            }, 500);

        } catch (err) {
            console.error(err);
            showError(err.message || 'Login failed. Please try again.');
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
