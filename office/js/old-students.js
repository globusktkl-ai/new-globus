/**
 * Old Students Logic
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    var allStudents = [];
    var settings = null;
    var activeTab = 0; /* 0 = Finished, 1 = Discontinued */

    async function init() {
        showLoader('Loading...');
        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            settings = await getInstituteSettings();

            /* Render tabs */
            document.getElementById('tab-bar').innerHTML = renderTabBar(['Finished Students', 'Discontinued Students'], 0);
            setupTabs();

            await loadOldStudents();
            setupListeners();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadOldStudents() {
        try {
            allStudents = await dbSelect('students', {
                select: '*, courses(course_name)',
                inFilter: { status: ['Course Finished', 'Discontinued'] },
                order: { column: 'updated_at', ascending: false }
            });
            renderList();
        } catch (err) {
            allStudents = [];
            renderList();
        }
    }

    function renderList() {
        var query = (document.getElementById('search-input').value || '').trim().toLowerCase();
        var statusFilter = activeTab === 0 ? 'Course Finished' : 'Discontinued';
        var cc = (settings && settings.country_code) || '91';

        var filtered = allStudents.filter(function (s) {
            if (s.status !== statusFilter) return false;
            if (!query) return true;
            return (s.full_name || '').toLowerCase().includes(query) ||
                (s.student_code || '').toLowerCase().includes(query) ||
                (s.phone || '').includes(query);
        });

        document.getElementById('students-count').textContent = filtered.length + ' student' + (filtered.length !== 1 ? 's' : '');

        var tbody = document.getElementById('students-tbody');
        var mobileContainer = document.getElementById('mobile-cards-container');

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No ' + statusFilter.toLowerCase() + ' students</td></tr>';
            mobileContainer.innerHTML = renderEmptyState('No ' + statusFilter.toLowerCase() + ' students', '📋');
            return;
        }

        var tableHTML = '';
        var cardHTML = '';

        for (var i = 0; i < filtered.length; i++) {
            var s = filtered[i];
            var dateCol = s.status === 'Course Finished' ? formatDate(s.finished_date) : formatDate(s.discontinued_date);

            tableHTML += '<tr>' +
                '<td>' + renderStudentPhoto(s.photo_url, s.full_name, 38) + '</td>' +
                '<td style="font-weight:600;color:#4a90d9;">' + s.student_code + '</td>' +
                '<td>' + s.full_name + '</td>' +
                '<td>' + renderPhoneActions(s.phone, cc) + '</td>' +
                '<td>' + renderStatusBadge(s.status) + '</td>' +
                '<td>' + dateCol + '</td>' +
                '<td><div class="td-actions">' +
                '<a href="student-profile.html?id=' + s.id + '" class="action-btn view" title="View">👁</a>' +
                '<button class="action-btn" style="background:#eaf2fb;color:#4a90d9;" title="Restore" onclick="restoreStudent(\'' + s.id + '\')">♻️</button>' +
                '<button class="action-btn" style="background:#f5f7fa;color:#333;" title="Print" onclick="window.print()">🖨</button>' +
                '</div></td></tr>';

            cardHTML += '<div class="student-card-mobile">' +
                '<div class="card-header">' +
                renderStudentPhoto(s.photo_url, s.full_name, 48) +
                '<div class="card-info">' +
                '<div class="card-name">' + s.full_name + '</div>' +
                '<div class="card-sub">' + s.student_code + '</div>' +
                '</div>' +
                renderStatusBadge(s.status) +
                '</div>' +
                '<div class="card-details">' +
                '<div class="card-detail-item"><span class="label">Date: </span><span class="value">' + dateCol + '</span></div>' +
                '<div class="card-detail-item"><span class="label">Phone: </span><span class="value">' + (s.phone || '—') + '</span></div>' +
                '</div>' +
                '<div class="card-actions">' +
                '<a href="student-profile.html?id=' + s.id + '" class="btn btn-sm btn-primary">View</a>' +
                '<button class="btn btn-sm btn-secondary" onclick="restoreStudent(\'' + s.id + '\')">Restore</button>' +
                renderPhoneActions(s.phone, cc) +
                '</div></div>';
        }

        tbody.innerHTML = tableHTML;
        mobileContainer.innerHTML = cardHTML;
    }

    /* ── Restore Student ── */
    window.restoreStudent = function (id) {
        showConfirm('Restore this student to Active status?', async function () {
            showLoader('Restoring...');
            try {
                await dbUpdate('students', id, {
                    status: 'Active',
                    finished_date: null,
                    discontinued_date: null
                });
                showToast('Student restored to Active.', 'success');
                await loadOldStudents();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            } finally {
                hideLoader();
            }
        });
    };

    /* ── Tabs ── */
    function setupTabs() {
        document.getElementById('tab-bar').addEventListener('click', function (e) {
            var btn = e.target.closest('.tab-btn');
            if (!btn) return;
            activeTab = parseInt(btn.dataset.tab);
            document.getElementById('tab-bar').innerHTML = renderTabBar(['Finished Students', 'Discontinued Students'], activeTab);
            renderList();
        });
    }

    function setupListeners() {
        document.getElementById('search-input').addEventListener('input', debounce(renderList, 300));
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
