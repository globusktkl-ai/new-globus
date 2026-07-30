/**
 * Teacher Settings
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';
    var teacher = null;

    function getTeacherSession() {
        var s = localStorage.getItem(TEACHER_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(TEACHER_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function clearTeacherSession() {
        localStorage.removeItem(TEACHER_SESSION_KEY);
        sessionStorage.removeItem(TEACHER_SESSION_KEY);
    }

    window.handleLogout = function () {
        clearTeacherSession();
        window.location.replace('login.html');
    };

    async function init() {
        var session = getTeacherSession();
        if (!session || !session.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading...');

        try {
            await waitForSupabase();

            teacher = await dbSelect('teachers', {
                eq: { id: session.id },
                single: true
            });

            if (!teacher) {
                window.location.replace('login.html');
                return;
            }

            renderPhoto();
            loadSettings();
            setupListeners();

            document.getElementById('account-code').textContent = teacher.teacher_code;
            document.getElementById('account-email').textContent = teacher.email || 'No email set';

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderPhoto() {
        var photoEl = document.getElementById('current-photo');
        if (teacher.photo_url) {
            photoEl.innerHTML = '<img src="' + teacher.photo_url + '" alt="">';
        } else {
            var initials = teacher.full_name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            photoEl.textContent = initials;
        }
    }

    function loadSettings() {
        var darkMode = localStorage.getItem('erp_teacher_dark_mode') === 'true';
        document.getElementById('dark-mode-toggle').checked = darkMode;
        if (darkMode) document.body.classList.add('dark-mode');

        var notifEnabled = localStorage.getItem('erp_teacher_notifications') !== 'false';
        document.getElementById('notif-toggle').checked = notifEnabled;

        var emailEnabled = localStorage.getItem('erp_teacher_email') !== 'false';
        document.getElementById('email-toggle').checked = emailEnabled;
    }

    function setupListeners() {
        /* Dark mode */
        document.getElementById('dark-mode-toggle').addEventListener('change', function () {
            var enabled = this.checked;
            localStorage.setItem('erp_teacher_dark_mode', enabled);
            if (enabled) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            showToast(enabled ? 'Dark mode enabled' : 'Dark mode disabled', 'info');
        });

        /* Notifications */
        document.getElementById('notif-toggle').addEventListener('change', function () {
            localStorage.setItem('erp_teacher_notifications', this.checked);
        });

        document.getElementById('email-toggle').addEventListener('change', function () {
            localStorage.setItem('erp_teacher_email', this.checked);
        });

        /* Photo upload */
        document.getElementById('photo-input').addEventListener('change', async function (e) {
            var file = e.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                showToast('Photo must be less than 2MB', 'warning');
                return;
            }

            showLoader('Uploading...');

            var reader = new FileReader();
            reader.onload = async function (ev) {
                try {
                    await dbUpdate('teachers', teacher.id, {
                        photo_url: ev.target.result
                    });
                    teacher.photo_url = ev.target.result;
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
            showToast('Password must be at least 6 characters', 'warning');
            return;
        }

        if (newPwd !== confirmPwd) {
            showToast('Passwords do not match', 'warning');
            return;
        }

        showLoader('Changing password...');

        try {
            /* Verify current password */
            var result = await dbRpc('verify_teacher_login', {
                p_code: teacher.teacher_code,
                p_password: currentPwd
            });

            if (!result || result.length === 0) {
                showToast('Current password is incorrect', 'error');
                hideLoader();
                return;
            }

            /* Update password */
            var newHash = await dbRpc('hash_password', { pwd: newPwd });
            await dbUpdate('teachers', teacher.id, {
                password_hash: newHash
            });

            showToast('Password changed!', 'success');
            document.getElementById('password-form').style.display = 'none';
            document.getElementById('change-pwd-btn').style.display = 'block';
            clearPasswordForm();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
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
