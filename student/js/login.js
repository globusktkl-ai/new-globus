/**
 * Student Login Logic
 * Globus Technical Academy ERP v1.00 — Part 2
 */

(function () {
    'use strict';

    var STUDENT_SESSION_KEY = 'erp_student_session';

    /* Check for existing session on page load */
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) checkSession();
    });

    function checkSession() {
        var session = getStudentSession();
        if (session && session.id) {
            window.location.replace('dashboard.html');
        }
    }

    function getStudentSession() {
        try {
            return JSON.parse(localStorage.getItem(STUDENT_SESSION_KEY));
        } catch (e) {
            return null;
        }
    }

    function setStudentSession(data, remember) {
        var storage = remember ? localStorage : sessionStorage;
        storage.setItem(STUDENT_SESSION_KEY, JSON.stringify(data));
        if (remember) {
            localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(data));
        }
    }

    /* Init */
    waitForSupabase().then(function () {
        checkSession();
    }).catch(function () { });

    /* Password Toggle */
    var pwdToggle = document.getElementById('pwd-toggle');
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

    /* Login Form */
    document.getElementById('login-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        var errEl = document.getElementById('login-error');
        errEl.style.display = 'none';

        var code = document.getElementById('student-code').value.trim().toUpperCase();
        var password = document.getElementById('password').value;
        var remember = document.getElementById('remember').checked;

        /* Validation */
        if (!code) {
            showError('Please enter your student code.');
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
            var sb = await waitForSupabase();

            /* Verify login using RPC function */
            var result = await dbRpc('verify_student_login', {
                p_code: code,
                p_password: password
            });

            if (!result || result.length === 0) {
                showError('Invalid student code or password.');
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            var student = result[0];

            /* Check student status */
            if (student.student_status === 'Discontinued') {
                showError('Your account has been discontinued. Please contact the office.');
                btn.disabled = false;
                btn.textContent = 'Sign In';
                return;
            }

            /* Fetch full student data */
            var fullStudent = await dbSelect('students', {
                select: '*, courses(course_name, course_code), modules:current_module_id(module_name, module_number)',
                eq: { id: student.student_id },
                single: true
            });

            /* Create session */
            var sessionData = {
                id: fullStudent.id,
                code: fullStudent.student_code,
                name: fullStudent.full_name,
                status: fullStudent.status,
                photo: fullStudent.photo_url,
                course: fullStudent.courses ? fullStudent.courses.course_name : '',
                loginAt: new Date().toISOString()
            };

            setStudentSession(sessionData, remember);

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
