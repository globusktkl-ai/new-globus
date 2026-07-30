/**
 * Activity Logs
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var logs = [];

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
        var admin = getAdminSession();
        if (!admin || !admin.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading logs...');
        try {
            await waitForSupabase();
            await loadLogs();
            setupListeners();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadLogs() {
        try {
            logs = await dbSelect('activity_logs', { order: { column: 'created_at', ascending: false }, limit: 200 });
            renderLogs();
        } catch (err) {
            logs = [];
            renderLogs();
        }
    }

    function renderLogs() {
        var query = document.getElementById('search-input').value.trim().toLowerCase();
        var moduleFilter = document.getElementById('filter-module').value;

        var filtered = logs.filter(function (l) {
            if (moduleFilter && l.module !== moduleFilter) return false;
            if (query) {
                return (l.action && l.action.toLowerCase().includes(query)) ||
                    (l.user_name && l.user_name.toLowerCase().includes(query)) ||
                    (l.module && l.module.toLowerCase().includes(query));
            }
            return true;
        });

        var tbody = document.getElementById('logs-tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#888;">No logs found</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function (l) {
            var date = new Date(l.created_at);
            var dateStr = date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            var roleClass = l.user_role === 'admin' ? 'badge-danger' : (l.user_role === 'office' ? 'badge-primary' : 'badge-secondary');

            html += '<tr>';
            html += '<td style="font-size:13px;color:#666;">' + dateStr + '</td>';
            html += '<td>' + (l.user_name || 'System') + '</td>';
            html += '<td><span class="badge ' + roleClass + '">' + (l.user_role || '—') + '</span></td>';
            html += '<td>' + l.action + '</td>';
            html += '<td>' + (l.module || '—') + '</td>';
            html += '</tr>';
        });
        tbody.innerHTML = html;
    }

    function setupListeners() {
        document.getElementById('search-input').addEventListener('input', debounce(renderLogs, 300));
        document.getElementById('filter-module').addEventListener('change', renderLogs);
    }

    window.exportLogs = function () {
        if (logs.length === 0) {
            showToast('No logs to export', 'warning');
            return;
        }
        var csv = 'Date,User,Role,Action,Module\n';
        logs.forEach(function (l) {
            csv += '"' + l.created_at + '","' + (l.user_name || '') + '","' + (l.user_role || '') + '","' + l.action + '","' + (l.module || '') + '"\n';
        });
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'activity_logs_' + todayISO() + '.csv';
        a.click();
        showToast('Logs exported!', 'success');
    };

    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
