/**
 * Admin Settings & White-Label Management
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var admin = null;
    var settings = null;
    var settingsId = null;
    var logoDataUrl = '';

    function getAdminSession() {
        var s = localStorage.getItem(ADMIN_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(ADMIN_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function clearAdminSession() {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }

    window.handleLogout = async function () {
        try { await signOut(); } catch (e) { }
        clearAdminSession();
        window.location.replace('login.html');
    };

    async function init() {
        admin = getAdminSession();
        if (!admin || !admin.id || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading settings...');

        try {
            await waitForSupabase();
            await loadSettings();
            setupNavigation();
            setupForms();
            await loadPermissions();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadSettings() {
        try {
            var data = await dbSelect('institute_settings', { limit: 1, single: true });
            if (data) {
                settings = data;
                settingsId = data.id;
                populateForms();
            }
        } catch (err) {
            settings = {};
        }
    }

    function populateForms() {
        /* General */
        document.getElementById('institute_name').value = settings.institute_name || '';
        document.getElementById('tagline').value = settings.tagline || '';
        document.getElementById('address').value = settings.address || '';
        document.getElementById('city').value = settings.city || '';
        document.getElementById('state').value = settings.state || '';
        document.getElementById('pincode').value = settings.pincode || '';
        document.getElementById('phone').value = settings.phone || '';
        document.getElementById('email').value = settings.email || '';
        document.getElementById('website').value = settings.website || '';
        document.getElementById('country_code').value = settings.country_code || '91';
        document.getElementById('currency_symbol').value = settings.currency_symbol || '₹';
        document.getElementById('academic_year').value = settings.academic_year || '2025-26';

        /* Branding */
        document.getElementById('primary_color').value = settings.primary_color || '#1a3a5c';
        document.getElementById('secondary_color').value = settings.secondary_color || '#2d5f8a';
        document.getElementById('accent_color').value = settings.accent_color || '#4a90d9';
        document.getElementById('primary-value').textContent = settings.primary_color || '#1a3a5c';
        document.getElementById('secondary-value').textContent = settings.secondary_color || '#2d5f8a';
        document.getElementById('accent-value').textContent = settings.accent_color || '#4a90d9';
        document.getElementById('theme_mode').checked = settings.theme_mode === 'dark';

        if (settings.logo_url) {
            document.getElementById('logo-preview').innerHTML = '<img src="' + settings.logo_url + '" alt="Logo">';
            logoDataUrl = settings.logo_url;
        }

        updatePreview();

        /* Receipt */
        document.getElementById('receipt_prefix').value = settings.receipt_prefix || 'RCP';
        document.getElementById('student_code_prefix').value = settings.student_code_prefix || 'GTA';
        document.getElementById('receipt_header').value = settings.receipt_header || '';
        document.getElementById('receipt_footer').value = settings.receipt_footer || 'Thank you for your payment';
        document.getElementById('certificate_header').value = settings.certificate_header || '';

        /* Security */
        document.getElementById('session_timeout').value = settings.session_timeout || 30;
        document.getElementById('max_login_attempts').value = settings.max_login_attempts || 5;

        /* Notifications */
        document.getElementById('enable_notifications').checked = settings.enable_notifications !== false;
        document.getElementById('enable_email').checked = settings.enable_email !== false;
        document.getElementById('enable_sms').checked = settings.enable_sms === true;
    }

    function updatePreview() {
        var name = document.getElementById('institute_name').value || 'Institute Name';
        var tagline = document.getElementById('tagline').value || 'Tagline';
        var primary = document.getElementById('primary_color').value;

        document.getElementById('preview-name').textContent = name;
        document.getElementById('preview-name').style.color = primary;
        document.getElementById('preview-tagline').textContent = tagline;
        document.getElementById('preview-logo').style.background = primary;

        if (logoDataUrl) {
            document.getElementById('preview-logo').innerHTML = '<img src="' + logoDataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">';
        } else {
            document.getElementById('preview-logo').textContent = name.charAt(0).toUpperCase();
        }
    }

    function setupNavigation() {
        document.querySelectorAll('.settings-nav-item').forEach(function (item) {
            item.addEventListener('click', function () {
                document.querySelectorAll('.settings-nav-item').forEach(function (i) { i.classList.remove('active'); });
                this.classList.add('active');

                document.querySelectorAll('.settings-section').forEach(function (s) { s.style.display = 'none'; });
                var section = document.getElementById('section-' + this.dataset.section);
                if (section) section.style.display = 'block';
            });
        });
    }

    function setupForms() {
        /* Color pickers */
        ['primary_color', 'secondary_color', 'accent_color'].forEach(function (id) {
            document.getElementById(id).addEventListener('input', function () {
                document.getElementById(id.replace('_color', '-value')).textContent = this.value;
                updatePreview();
            });
        });

        /* Logo upload */
        document.getElementById('logo-input').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                showToast('Logo must be less than 2MB', 'warning');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                logoDataUrl = ev.target.result;
                document.getElementById('logo-preview').innerHTML = '<img src="' + logoDataUrl + '" alt="Logo">';
                updatePreview();
            };
            reader.readAsDataURL(file);
        });

        /* Name change */
        document.getElementById('institute_name').addEventListener('input', updatePreview);
        document.getElementById('tagline').addEventListener('input', updatePreview);

        /* General form */
        document.getElementById('general-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveSettings({
                institute_name: document.getElementById('institute_name').value,
                tagline: document.getElementById('tagline').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                pincode: document.getElementById('pincode').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                website: document.getElementById('website').value,
                country_code: document.getElementById('country_code').value,
                currency_symbol: document.getElementById('currency_symbol').value,
                academic_year: document.getElementById('academic_year').value
            });
        });

        /* Branding form */
        document.getElementById('branding-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveSettings({
                primary_color: document.getElementById('primary_color').value,
                secondary_color: document.getElementById('secondary_color').value,
                accent_color: document.getElementById('accent_color').value,
                theme_mode: document.getElementById('theme_mode').checked ? 'dark' : 'light',
                logo_url: logoDataUrl
            });
        });

        /* Receipt form */
        document.getElementById('receipt-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveSettings({
                receipt_prefix: document.getElementById('receipt_prefix').value,
                student_code_prefix: document.getElementById('student_code_prefix').value,
                receipt_header: document.getElementById('receipt_header').value,
                receipt_footer: document.getElementById('receipt_footer').value,
                certificate_header: document.getElementById('certificate_header').value
            });
        });

        /* Security form */
        document.getElementById('security-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveSettings({
                session_timeout: parseInt(document.getElementById('session_timeout').value),
                max_login_attempts: parseInt(document.getElementById('max_login_attempts').value)
            });
        });

        /* Notification form */
        document.getElementById('notif-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveSettings({
                enable_notifications: document.getElementById('enable_notifications').checked,
                enable_email: document.getElementById('enable_email').checked,
                enable_sms: document.getElementById('enable_sms').checked
            });
        });
    }

    async function saveSettings(data) {
        showLoader('Saving...');
        try {
            if (settingsId) {
                await dbUpdate('institute_settings', settingsId, data);
            } else {
                var result = await dbInsert('institute_settings', data);
                settingsId = result.id;
            }

            /* Log activity */
            await dbInsert('activity_logs', {
                user_id: admin.id,
                user_role: admin.role,
                user_name: admin.name,
                action: 'Updated settings',
                module: 'settings'
            });

            showToast('Settings saved successfully!', 'success');
            await loadSettings();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadPermissions() {
        try {
            var perms = await dbSelect('role_permissions', { order: { column: 'module', ascending: true } });
            var modules = ['students', 'teachers', 'courses', 'modules', 'fees', 'attendance', 'reports', 'settings', 'notifications', 'backup'];

            var permMap = {};
            perms.forEach(function (p) {
                if (!permMap[p.module]) permMap[p.module] = {};
                permMap[p.module][p.role] = p;
            });

            var html = '';
            modules.forEach(function (mod) {
                html += '<tr>';
                html += '<td>' + titleCase(mod) + '</td>';
                ['admin', 'office', 'teacher'].forEach(function (role) {
                    var p = permMap[mod] && permMap[mod][role];
                    var checked = p ? p.can_view : (role === 'admin');
                    html += '<td><input type="checkbox" class="permission-check" data-module="' + mod + '" data-role="' + role + '" ' + (checked ? 'checked' : '') + ' ' + (role === 'admin' ? 'disabled' : '') + '></td>';
                });
                html += '</tr>';
            });

            document.getElementById('permissions-tbody').innerHTML = html;
        } catch (err) { }
    }

    window.savePermissions = async function () {
        showLoader('Saving permissions...');
        try {
            var checks = document.querySelectorAll('.permission-check:not(:disabled)');
            for (var i = 0; i < checks.length; i++) {
                var check = checks[i];
                var mod = check.dataset.module;
                var role = check.dataset.role;

                var existing = await dbSelect('role_permissions', { eq: { role: role, module: mod } });
                if (existing && existing.length > 0) {
                    await dbUpdate('role_permissions', existing[0].id, {
                        can_view: check.checked,
                        can_create: check.checked,
                        can_edit: check.checked
                    });
                } else {
                    await dbInsert('role_permissions', {
                        role: role,
                        module: mod,
                        can_view: check.checked,
                        can_create: check.checked,
                        can_edit: check.checked,
                        can_delete: false
                    });
                }
            }

            showToast('Permissions saved!', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    /* Dark mode */
    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
