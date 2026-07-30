/**
 * Student List Logic
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    var allStudents = [];
    var settings = null;

    async function init() {
        showLoader('Loading students...');
        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            settings = await getInstituteSettings();
            await loadStudents();
            setupListeners();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    /* ── Load Students ── */
    async function loadStudents() {
        try {
            allStudents = await dbSelect('students', {
                select: '*, courses(course_name), modules:current_module_id(module_name,module_number)',
                eq: { status: 'Active' },
                order: { column: 'created_at', ascending: false }
            });
            renderStudents(allStudents);
        } catch (err) {
            showToast('Could not load students.', 'error');
            allStudents = [];
            renderStudents([]);
        }
    }

    /* ── Render Students ── */
    function renderStudents(list) {
        var sym = (settings && settings.currency_symbol) || '₹';
        var cc = (settings && settings.country_code) || '91';

        document.getElementById('students-count').textContent = list.length + ' student' + (list.length !== 1 ? 's' : '') + ' found';

        /* Table */
        var tbody = document.getElementById('students-tbody');
        var mobileContainer = document.getElementById('mobile-cards-container');

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#999;">No active students found</td></tr>';
            mobileContainer.innerHTML = renderEmptyState('No active students found', '👥');
            return;
        }

        var tableHTML = '';
        var cardHTML = '';

        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            var courseName = s.courses ? s.courses.course_name : '—';
            var moduleName = s.modules ? ('M' + s.modules.module_number + ': ' + s.modules.module_name) : '—';

            /* Table row */
            tableHTML += '<tr>' +
                '<td>' + renderStudentPhoto(s.photo_url, s.full_name, 38) + '</td>' +
                '<td style="font-weight:600;color:#4a90d9;">' + s.student_code + '</td>' +
                '<td style="font-weight:500;">' + s.full_name + '</td>' +
                '<td>' + renderPhoneActions(s.phone, cc) + '</td>' +
                '<td>' + (s.qualification || '—') + '</td>' +
                '<td>' + moduleName + '</td>' +
                '<td style="font-weight:600;color:' + (s.balance > 0 ? '#e74c3c' : '#27ae60') + ';">' + formatCurrency(s.balance, sym) + '</td>' +
                '<td>' + renderStatusBadge(s.status) + '</td>' +
                '<td><div class="td-actions">' +
                '<a href="student-profile.html?id=' + s.id + '" class="action-btn view" title="View">👁</a>' +
                '<a href="edit-student.html?id=' + s.id + '" class="action-btn edit" title="Edit">✏️</a>' +
                '<a href="fees.html?id=' + s.id + '" class="action-btn fee" title="Fee">💰</a>' +
                '</div></td></tr>';

            /* Mobile card */
            cardHTML += '<div class="student-card-mobile">' +
                '<div class="card-header">' +
                renderStudentPhoto(s.photo_url, s.full_name, 48) +
                '<div class="card-info">' +
                '<div class="card-name">' + s.full_name + '</div>' +
                '<div class="card-sub">' + s.student_code + ' · ' + courseName + '</div>' +
                '</div>' +
                renderStatusBadge(s.status) +
                '</div>' +
                '<div class="card-details">' +
                '<div class="card-detail-item"><span class="label">Module: </span><span class="value">' + moduleName + '</span></div>' +
                '<div class="card-detail-item"><span class="label">Balance: </span><span class="value" style="color:' + (s.balance > 0 ? '#e74c3c' : '#27ae60') + ';font-weight:600;">' + formatCurrency(s.balance, sym) + '</span></div>' +
                '<div class="card-detail-item"><span class="label">Phone: </span><span class="value">' + (s.phone || '—') + '</span></div>' +
                '<div class="card-detail-item"><span class="label">Qual: </span><span class="value">' + (s.qualification || '—') + '</span></div>' +
                '</div>' +
                '<div class="card-actions">' +
                '<a href="student-profile.html?id=' + s.id + '" class="btn btn-sm btn-primary" style="font-size:13px;">View</a>' +
                '<a href="edit-student.html?id=' + s.id + '" class="btn btn-sm btn-secondary" style="font-size:13px;">Edit</a>' +
                '<a href="fees.html?id=' + s.id + '" class="btn btn-sm btn-success" style="font-size:13px;">Fee</a>' +
                renderPhoneActions(s.phone, cc) +
                '</div></div>';
        }

        tbody.innerHTML = tableHTML;
        mobileContainer.innerHTML = cardHTML;
    }

    /* ── Search & Sort ── */
    function setupListeners() {
        document.getElementById('search-input').addEventListener('input', debounce(filterStudents, 300));
        document.getElementById('sort-select').addEventListener('change', filterStudents);
    }

    function filterStudents() {
        var query = document.getElementById('search-input').value.trim().toLowerCase();
        var sort = document.getElementById('sort-select').value;

        var filtered = allStudents.filter(function (s) {
            if (!query) return true;
            return (s.full_name && s.full_name.toLowerCase().includes(query)) ||
                (s.student_code && s.student_code.toLowerCase().includes(query)) ||
                (s.phone && s.phone.includes(query));
        });

        /* Sort */
        filtered.sort(function (a, b) {
            switch (sort) {
                case 'newest': return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
                case 'az': return (a.full_name || '').localeCompare(b.full_name || '');
                case 'za': return (b.full_name || '').localeCompare(a.full_name || '');
                case 'module':
                    var ma = a.modules ? a.modules.module_number : 999;
                    var mb = b.modules ? b.modules.module_number : 999;
                    return ma - mb;
                case 'qualification': return (a.qualification || '').localeCompare(b.qualification || '');
                case 'course':
                    var ca = a.courses ? a.courses.course_name : '';
                    var cb = b.courses ? b.courses.course_name : '';
                    return ca.localeCompare(cb);
                case 'balance-high': return (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0);
                case 'balance-low': return (parseFloat(a.balance) || 0) - (parseFloat(b.balance) || 0);
                case 'status': return (a.status || '').localeCompare(b.status || '');
                default: return 0;
            }
        });

        renderStudents(filtered);
    }

    /* ── Boot ── */
    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
