/**
 * Admin Student Management
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var admin = null;
    var settings = null;
    var allStudents = [];
    var currentStatus = 'Active';
    var selectedIds = [];

    function getAdminSession() {
        var s = localStorage.getItem(ADMIN_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(ADMIN_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    window.handleLogout = async function () {
        try { await signOut(); } catch (e) { }
        localStorage.removeItem(ADMIN_SESSION_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.replace('login.html');
    };

    async function init() {
        admin = getAdminSession();
        if (!admin || !admin.id || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading students...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();

            await loadCourses();
            await loadStudents();
            setupListeners();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadCourses() {
        try {
            var courses = await dbSelect('courses', { eq: { is_active: true } });
            var select = document.getElementById('filter-course');
            courses.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.course_name;
                select.appendChild(opt);
            });
        } catch (err) { }
    }

    async function loadStudents() {
        try {
            allStudents = await dbSelect('students', {
                select: '*, courses(course_name), modules:current_module_id(module_name, module_number)',
                order: { column: 'created_at', ascending: false }
            });
            renderStudents();
        } catch (err) {
            allStudents = [];
            renderStudents();
        }
    }

    function renderStudents() {
        var query = document.getElementById('search-input').value.trim().toLowerCase();
        var courseFilter = document.getElementById('filter-course').value;
        var sym = (settings && settings.currency_symbol) || '₹';

        var filtered = allStudents.filter(function (s) {
            if (currentStatus !== 'all' && s.status !== currentStatus) return false;
            if (courseFilter && s.course_id !== courseFilter) return false;
            if (query) {
                return (s.full_name && s.full_name.toLowerCase().includes(query)) ||
                    (s.student_code && s.student_code.toLowerCase().includes(query)) ||
                    (s.phone && s.phone.includes(query));
            }
            return true;
        });

        document.getElementById('student-count').textContent = filtered.length + ' students';

        var tbody = document.getElementById('students-tbody');

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#888;">No students found</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function (s) {
            var courseName = s.courses ? s.courses.course_name : '—';
            var moduleName = s.modules ? ('M' + s.modules.module_number) : '—';
            var statusClass = s.status === 'Active' ? 'badge-primary' : (s.status === 'Course Finished' ? 'badge-success' : (s.status === 'Discontinued' ? 'badge-danger' : 'badge-secondary'));

            html += '<tr>';
            html += '<td><input type="checkbox" class="row-check" data-id="' + s.id + '"></td>';
            html += '<td style="font-weight:600;color:#4a90d9;">' + s.student_code + '</td>';
            html += '<td>' + s.full_name + '</td>';
            html += '<td>' + (s.phone || '—') + '</td>';
            html += '<td>' + courseName + '</td>';
            html += '<td>' + moduleName + '</td>';
            html += '<td style="color:' + (s.balance > 0 ? '#e74c3c' : '#27ae60') + ';font-weight:600;">' + formatCurrency(s.balance, sym) + '</td>';
            html += '<td><span class="badge ' + statusClass + '">' + s.status + '</span></td>';
            html += '<td><div style="display:flex;gap:6px;">';
            html += '<a href="../office/student-profile.html?id=' + s.id + '" class="btn btn-sm btn-secondary" target="_blank">View</a>';
            html += '<button class="btn btn-sm btn-danger" onclick="deleteStudent(\'' + s.id + '\')">🗑</button>';
            html += '</div></td></tr>';
        });

        tbody.innerHTML = html;
    }

    function setupListeners() {
        /* Tabs */
        document.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                currentStatus = this.dataset.status;
                renderStudents();
            });
        });

        /* Search */
        document.getElementById('search-input').addEventListener('input', debounce(renderStudents, 300));
        document.getElementById('filter-course').addEventListener('change', renderStudents);

        /* Select all */
        document.getElementById('select-all').addEventListener('change', function () {
            var checks = document.querySelectorAll('.row-check');
            var checked = this.checked;
            checks.forEach(function (c) { c.checked = checked; });
        });
    }

    window.applyBulkAction = async function () {
        var action = document.getElementById('bulk-action').value;
        if (!action) return;

        var checks = document.querySelectorAll('.row-check:checked');
        if (checks.length === 0) {
            showToast('Select students first', 'warning');
            return;
        }

        var ids = [];
        checks.forEach(function (c) { ids.push(c.dataset.id); });

        var statusMap = {
            'activate': 'Active',
            'finish': 'Course Finished',
            'discontinue': 'Discontinued',
            'archive': 'Archived'
        };

        var newStatus = statusMap[action];
        if (!newStatus) return;

        showConfirm('Update ' + ids.length + ' students to "' + newStatus + '"?', async function () {
            showLoader('Updating...');
            try {
                for (var i = 0; i < ids.length; i++) {
                    var updates = { status: newStatus };
                    if (newStatus === 'Course Finished') updates.finished_date = todayISO();
                    if (newStatus === 'Discontinued') updates.discontinued_date = todayISO();
                    if (newStatus === 'Active') {
                        updates.finished_date = null;
                        updates.discontinued_date = null;
                    }
                    await dbUpdate('students', ids[i], updates);
                }
                showToast('Updated ' + ids.length + ' students', 'success');
                await loadStudents();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            } finally {
                hideLoader();
            }
        });
    };

    window.deleteStudent = function (id) {
        showConfirm('Permanently delete this student? This cannot be undone.', async function () {
            showLoader('Deleting...');
            try {
                await dbDelete('students', id);
                showToast('Student deleted', 'success');
                await loadStudents();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            } finally {
                hideLoader();
            }
        });
    };

    window.exportStudents = function () {
        var csv = 'Code,Name,Phone,Course,Module,Balance,Status,Admission Date\n';
        allStudents.forEach(function (s) {
            csv += '"' + s.student_code + '","' + s.full_name + '","' + (s.phone || '') + '","' + (s.courses ? s.courses.course_name : '') + '","' + (s.modules ? s.modules.module_name : '') + '","' + s.balance + '","' + s.status + '","' + s.admission_date + '"\n';
        });

        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'students_' + todayISO() + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Export downloaded', 'success');
    };

    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
