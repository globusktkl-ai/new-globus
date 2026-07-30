/**
 * Student Settings Logic
 * Globus Technical Academy ERP v1.00 — Part 2
 */

(function () {
    'use strict';

    var STUDENT_SESSION_KEY = 'erp_student_session';
    var student = null;

    function getStudentSession() {
        var s = localStorage.getItem(STUDENT_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(STUDENT_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function clearStudentSession() {
        localStorage.removeItem(STUDENT_SESSION_KEY);
        sessionStorage.removeItem(STUDENT_SESSION_KEY);
    }

    window.handleLogout = function () {
        clearStudentSession();
        window.location.replace('login.html');
    };

    async function init() {
        var session = getStudentSession();
        if (!session || !session.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading settings...');

        try {
            await waitForSupabase();

            student = await dbSelect('students', {
                eq: { id: session.id },
                single: true
            });

            if (!student) {
                window.location.replace('login.html');
                return;
            }

            renderPhoto();
            loadSettings();
            setupListeners();

            document.getElementById('account-code').textContent = student.student_code;
            document.getElementById('account-email').textContent = student.email || 'No email set';

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderPhoto() {
        var photoEl = document.getElementById('current-photo');
        if (student.photo_url) {
            photoEl.innerHTML = '<img src="' + student.photo_url + '" alt="Photo">';
        } else {
            var initials = student.full_name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            photoEl.textContent = initials;
        }
    }

    function loadSettings() {
        /* Dark mode */
        var darkMode = localStorage.getItem('erp_dark_mode') === 'true';
        document.getElementById('dark-mode-toggle').checked = darkMode;
        if (darkMode) document.body.classList.add('dark-mode');

        /* Notifications */
        var notifEnabled = localStorage.getItem('erp_notifications') !== 'false';
        document.getElementById('notif-toggle').checked = notifEnabled;
    }

    function setupListeners() {
        /* Dark mode toggle */
        document.getElementById('dark-mode-toggle').addEventListener('change', function () {
            var enabled = this.checked;
            localStorage.setItem('erp_dark_mode', enabled);
            if (enabled) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            showToast(enabled ? 'Dark mode enabled' : 'Dark mode disabled', 'info');
        });

        /* Notifications toggle */
        document.getElementById('notif-toggle').addEventListener('change', function () {
            var enabled = this.checked;
            localStorage.setItem('erp_notifications', enabled);
            showToast(enabled ? 'Notifications enabled' : 'Notifications disabled', 'info');
        });

        /* Photo upload */
        document.getElementById('photo-input').addEventListener('change', async function (e) {
            var file = e.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                showToast('Photo must be less than 2MB', 'warning');
                return;
            }

            showLoader('Uploading photo...');

            var reader = new FileReader();
            reader.onload = async function (ev) {
                try {
                    await dbUpdate('students', student.id, {
                        photo_url: ev.target.result
                    });
                    student.photo_url = ev.target.result;
                    renderPhoto();
                    showToast('Photo updated!', 'success');
                } catch (err) {
                    showToast('Error updating photo', 'error');
                } finally {
                    hideLoader();
                }
            };
            reader.readAsDataURL(file);
        });

        /* Password change */
        document.getElementById('change-pwd-btn').addEventListener('click', function () {
            document.getElementById('password-form').style.display = 'block';
            this.style.display = 'none';
        });

        document.getElementById('cancel-pwd-btn').addEventListener('click', function () {
            document.getElementById('password-form').style.display = 'none';
            document.getElementById('change-pwd-btn').style.display = 'block';
            clearPasswordForm();
        });

        document.getElementById('save-pwd-btn').addEventListener('click', changePassword);
    }

    async function changePassword() {
        var currentPwd = document.getElementById('current-password').value;
        var newPwd = document.getElementById('new-password').value;
        var confirmPwd = document.getElementById('confirm-password').value;

        if (!currentPwd || !newPwd || !confirmPwd) {
            showToast('Please fill all fields', 'warning');
            return;
        }

        if (newPwd.length < 6) {
            showToast('New password must be at least 6 characters', 'warning');
            return;
        }

        if (newPwd !== confirmPwd) {
            showToast('New passwords do not match', 'warning');
            return;
        }

        showLoader('Changing password...');

        try {
            /* Verify current password */
            var result = await dbRpc('verify_student_login', {
                p_code: student.student_code,
                p_password: currentPwd
            });

            if (!result || result.length === 0) {
                showToast('Current password is incorrect', 'error');
                hideLoader();
                return;
            }

            /* Update password (hash it) */
            var sb = await waitForSupabase();
            var { error } = await sb.rpc('hash_password', { pwd: newPwd });

            /* Update using raw SQL approach */
            await sb.from('students').update({
                password_hash: await hashPassword(newPwd)
            }).eq('id', student.id);

            showToast('Password changed successfully!', 'success');
            document.getElementById('password-form').style.display = 'none';
            document.getElementById('change-pwd-btn').style.display = 'block';
            clearPasswordForm();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function hashPassword(pwd) {
        try {
            var hash = await dbRpc('hash_password', { pwd: pwd });
            return hash;
        } catch (e) {
            /* Fallback: simple client-side hash (not secure, demo only) */
            var encoder = new TextEncoder();
            var data = encoder.encode(pwd);
            var hashBuffer = await crypto.subtle.digest('SHA-256', data);
            var hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        }
    }

    function clearPasswordForm() {
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
