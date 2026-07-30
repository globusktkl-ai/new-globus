/**
 * Teacher Students List
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';
    var teacher = null;
    var settings = null;
    var allStudents = [];
    var attendanceData = {};

    function getTeacherSession() {
        var s = localStorage.getItem(TEACHER_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(TEACHER_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    async function init() {
        var session = getTeacherSession();
        if (!session || !session.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading students...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();
            teacher = { id: session.id };

            await loadStudents();
            setupListeners();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadStudents() {
        try {
            /* Get assigned student IDs */
            var assignments = await dbSelect('teacher_assignments', {
                select: 'student_id',
                eq: { teacher_id: teacher.id, is_active: true }
            });

            if (assignments.length === 0) {
                allStudents = [];
                renderStudents([]);
                return;
            }

            var studentIds = assignments.map(function (a) { return a.student_id; });

            /* Get students */
            allStudents = await dbSelect('students', {
                select: '*, courses(course_name), modules:current_module_id(module_name, module_number)',
                inFilter: { id: studentIds },
                order: { column: 'full_name', ascending: true }
            });

            /* Get attendance data for percentage */
            for (var i = 0; i < allStudents.length; i++) {
                var att = await dbSelect('attendance', {
                    select: 'status',
                    eq: { student_id: allStudents[i].id }
                });
                var total = att.length;
                var present = att.filter(function (a) { return a.status === 'Present' || a.status === 'Half Day'; }).length;
                attendanceData[allStudents[i].id] = total > 0 ? Math.round((present / total) * 100) : 0;
            }

            /* Populate module filter */
            populateModuleFilter();
            renderStudents(allStudents);

        } catch (err) {
            showToast('Could not load students', 'error');
            allStudents = [];
            renderStudents([]);
        }
    }

    function populateModuleFilter() {
        var moduleSet = {};
        for (var i = 0; i < allStudents.length; i++) {
            if (allStudents[i].modules) {
                moduleSet[allStudents[i].modules.module_number] = allStudents[i].modules.module_name;
            }
        }

        var select = document.getElementById('filter-module');
        Object.keys(moduleSet).sort().forEach(function (num) {
            var opt = document.createElement('option');
            opt.value = num;
            opt.textContent = 'Module ' + num;
            select.appendChild(opt);
        });
    }

    function renderStudents(list) {
        var cc = (settings && settings.country_code) || '91';
        document.getElementById('student-count').textContent = list.length + ' student' + (list.length !== 1 ? 's' : '');

        var tbody = document.getElementById('students-tbody');
        var mobileContainer = document.getElementById('mobile-cards');

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#888;">No students assigned</td></tr>';
            mobileContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No students assigned to you</p></div>';
            return;
        }

        var tableHTML = '';
        var cardHTML = '';

        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            var moduleName = s.modules ? ('M' + s.modules.module_number) : '—';
            var attPercent = attendanceData[s.id] || 0;
            var attColor = attPercent >= 75 ? '#27ae60' : (attPercent >= 50 ? '#f39c12' : '#e74c3c');

            /* Table row */
            tableHTML += '<tr>' +
                '<td>' + renderStudentPhoto(s.photo_url, s.full_name, 36) + '</td>' +
                '<td style="font-weight:600;color:#4a90d9;">' + s.student_code + '</td>' +
                '<td>' + s.full_name + '</td>' +
                '<td>' + renderPhoneActions(s.phone, cc) + '</td>' +
                '<td>' + moduleName + '</td>' +
                '<td style="color:' + attColor + ';font-weight:600;">' + attPercent + '%</td>' +
                '<td>' + renderStatusBadge(s.status) + '</td>' +
                '<td><div style="display:flex;gap:6px;">' +
                '<a href="attendance.html?student=' + s.id + '" class="btn btn-sm btn-primary" style="padding:6px 10px;font-size:12px;">📋</a>' +
                '<a href="module-progress.html?student=' + s.id + '" class="btn btn-sm btn-secondary" style="padding:6px 10px;font-size:12px;">📦</a>' +
                '</div></td></tr>';

            /* Mobile card */
            cardHTML += '<div class="student-card-mobile">' +
                '<div class="card-header">' +
                renderStudentPhoto(s.photo_url, s.full_name, 44) +
                '<div class="card-info">' +
                '<div class="card-name">' + s.full_name + '</div>' +
                '<div class="card-sub">' + s.student_code + ' · ' + moduleName + '</div>' +
                '</div>' +
                renderStatusBadge(s.status) +
                '</div>' +
                '<div class="card-details">' +
                '<div><span style="color:#888;">Attendance:</span> <span style="color:' + attColor + ';font-weight:600;">' + attPercent + '%</span></div>' +
                '<div><span style="color:#888;">Phone:</span> ' + (s.phone || '—') + '</div>' +
                '</div>' +
                '<div class="card-actions">' +
                '<a href="attendance.html?student=' + s.id + '" class="btn btn-sm btn-primary">Mark Attendance</a>' +
                '<a href="module-progress.html?student=' + s.id + '" class="btn btn-sm btn-secondary">Progress</a>' +
                renderPhoneActions(s.phone, cc) +
                '</div></div>';
        }

        tbody.innerHTML = tableHTML;
        mobileContainer.innerHTML = cardHTML;
    }

    function setupListeners() {
        document.getElementById('search-input').addEventListener('input', debounce(filterStudents, 300));
        document.getElementById('filter-module').addEventListener('change', filterStudents);
    }

    function filterStudents() {
        var query = document.getElementById('search-input').value.trim().toLowerCase();
        var moduleFilter = document.getElementById('filter-module').value;

        var filtered = allStudents.filter(function (s) {
            var matchQuery = !query || 
                (s.full_name && s.full_name.toLowerCase().includes(query)) ||
                (s.student_code && s.student_code.toLowerCase().includes(query)) ||
                (s.phone && s.phone.includes(query));

            var matchModule = !moduleFilter || 
                (s.modules && s.modules.module_number.toString() === moduleFilter);

            return matchQuery && matchModule;
        });

        renderStudents(filtered);
    }

    /* Dark mode */
    if (localStorage.getItem('erp_teacher_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
