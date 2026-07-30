/**
 * Admin Teacher Management
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var teachers = [];
    var assignments = {};

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

        showLoader('Loading teachers...');
        try {
            await waitForSupabase();
            await loadTeachers();
            setupListeners();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadTeachers() {
        try {
            teachers = await dbSelect('teachers', { order: { column: 'full_name', ascending: true } });

            /* Get assignment counts */
            var allAssignments = await dbSelect('teacher_assignments', { eq: { is_active: true } });
            allAssignments.forEach(function (a) {
                assignments[a.teacher_id] = (assignments[a.teacher_id] || 0) + 1;
            });

            renderTeachers();
        } catch (err) {
            teachers = [];
            renderTeachers();
        }
    }

    function renderTeachers() {
        var query = document.getElementById('search-input').value.trim().toLowerCase();
        var filtered = teachers.filter(function (t) {
            if (!query) return true;
            return (t.full_name && t.full_name.toLowerCase().includes(query)) ||
                (t.teacher_code && t.teacher_code.toLowerCase().includes(query)) ||
                (t.email && t.email.toLowerCase().includes(query));
        });

        var tbody = document.getElementById('teachers-tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#888;">No teachers found</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function (t) {
            var statusClass = t.is_active ? 'badge-success' : 'badge-secondary';
            html += '<tr>';
            html += '<td style="font-weight:600;color:#4a90d9;">' + t.teacher_code + '</td>';
            html += '<td>' + t.full_name + '</td>';
            html += '<td>' + (t.email || '—') + '</td>';
            html += '<td>' + (t.phone || '—') + '</td>';
            html += '<td>' + (t.specialization || '—') + '</td>';
            html += '<td>' + (assignments[t.id] || 0) + '</td>';
            html += '<td><span class="badge ' + statusClass + '">' + (t.is_active ? 'Active' : 'Inactive') + '</span></td>';
            html += '<td><div style="display:flex;gap:6px;">';
            html += '<button class="btn btn-sm btn-secondary" onclick="editTeacher(\'' + t.id + '\')">Edit</button>';
            html += '<button class="btn btn-sm btn-' + (t.is_active ? 'warning' : 'success') + '" onclick="toggleStatus(\'' + t.id + '\')">' + (t.is_active ? 'Deactivate' : 'Activate') + '</button>';
            html += '</div></td></tr>';
        });
        tbody.innerHTML = html;
    }

    function setupListeners() {
        document.getElementById('search-input').addEventListener('input', debounce(renderTeachers, 300));
    }

    window.showAddModal = function () {
        document.getElementById('teacher-form').reset();
        document.getElementById('add-modal').style.display = 'flex';
    };

    window.closeModal = function () {
        document.getElementById('add-modal').style.display = 'none';
    };

    window.saveTeacher = async function () {
        var name = document.getElementById('teacher-name').value.trim();
        var email = document.getElementById('teacher-email').value.trim();
        var phone = document.getElementById('teacher-phone').value.trim();
        var qual = document.getElementById('teacher-qual').value.trim();
        var spec = document.getElementById('teacher-spec').value.trim();

        if (!name) {
            showToast('Name is required', 'warning');
            return;
        }

        showLoader('Saving...');
        try {
            var code = await dbRpc('generate_teacher_code');
            var passwordHash = await dbRpc('hash_password', { pwd: code });

            await dbInsert('teachers', {
                teacher_code: code,
                full_name: name,
                email: email || null,
                phone: phone,
                qualification: qual,
                specialization: spec,
                password_hash: passwordHash
            });

            showToast('Teacher added! Code: ' + code + ', Password: ' + code, 'success');
            closeModal();
            await loadTeachers();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    window.toggleStatus = async function (id) {
        var teacher = teachers.find(function (t) { return t.id === id; });
        if (!teacher) return;

        showLoader('Updating...');
        try {
            await dbUpdate('teachers', id, { is_active: !teacher.is_active });
            showToast('Status updated', 'success');
            await loadTeachers();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    window.editTeacher = function (id) {
        showToast('Edit functionality - use the fields and save', 'info');
    };

    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
