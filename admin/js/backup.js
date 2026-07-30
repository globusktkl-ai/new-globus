/**
 * Admin Backup System
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var admin = null;

    function getAdminSession() {
        var s = localStorage.getItem(ADMIN_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(ADMIN_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    window.handleLogout = async function () {
        try { await signOut(); } catch (e) { }
        localStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.replace('login.html');
    };

    async function init() {
        admin = getAdminSession();
        if (!admin || !admin.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading...');
        try {
            await waitForSupabase();
            await loadBackupHistory();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadBackupHistory() {
        try {
            var history = await dbSelect('backup_history', { order: { column: 'created_at', ascending: false }, limit: 10 });
            var container = document.getElementById('backup-history');

            if (history.length === 0) {
                container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">No backup history yet</p>';
                return;
            }

            var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
            history.forEach(function (b) {
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:#f5f7fa;border-radius:10px;">';
                html += '<div><strong>' + b.backup_type + '</strong> • ' + formatDate(b.created_at) + '</div>';
                html += '<span class="badge ' + (b.status === 'completed' ? 'badge-success' : 'badge-warning') + '">' + b.status + '</span>';
                html += '</div>';
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (err) {
            document.getElementById('backup-history').innerHTML = '<p style="color:#888;">Could not load history</p>';
        }
    }

    function downloadCSV(data, filename) {
        if (!data || data.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }
        var csv = Object.keys(data[0]).join(',') + '\n';
        data.forEach(function (row) {
            csv += Object.values(row).map(function (v) {
                if (v === null || v === undefined) return '';
                if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
                return '"' + String(v).replace(/"/g, '""') + '"';
            }).join(',') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename + '_' + todayISO() + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    window.exportStudents = async function () {
        showLoader('Exporting students...');
        try {
            var data = await dbSelect('students', { order: { column: 'created_at', ascending: false } });
            downloadCSV(data, 'students_backup');
            await logBackup('students');
            showToast('Students exported!', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    window.exportPayments = async function () {
        showLoader('Exporting payments...');
        try {
            var data = await dbSelect('fee_payments', { order: { column: 'created_at', ascending: false } });
            downloadCSV(data, 'payments_backup');
            await logBackup('fees');
            showToast('Payments exported!', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    window.exportAttendance = async function () {
        showLoader('Exporting attendance...');
        try {
            var data = await dbSelect('attendance', { order: { column: 'attendance_date', ascending: false } });
            downloadCSV(data, 'attendance_backup');
            await logBackup('attendance');
            showToast('Attendance exported!', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    window.exportSettings = async function () {
        showLoader('Exporting settings...');
        try {
            var data = await dbSelect('institute_settings', { limit: 1, single: true });
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'settings_backup_' + todayISO() + '.json';
            a.click();
            URL.revokeObjectURL(url);
            await logBackup('settings');
            showToast('Settings exported!', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    async function logBackup(type) {
        try {
            await dbInsert('backup_history', {
                backup_type: type,
                status: 'completed',
                created_by: admin.id
            });
            await loadBackupHistory();
        } catch (err) { }
    }

    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
