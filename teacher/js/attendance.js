/**
 * Attendance Management
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';
    var teacher = null;
    var students = [];
    var attendanceMap = {}; /* student_id -> status */
    var existingAttendance = {}; /* student_id -> record id */
    var selectedDate = todayISO();

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

        showLoader('Loading...');

        try {
            await waitForSupabase();
            teacher = { id: session.id };

            /* Check for specific student in URL */
            var studentParam = getParam('student');

            /* Set date input */
            document.getElementById('attendance-date').value = selectedDate;

            await loadStudents(studentParam);
            setupListeners();
            await loadAttendance();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadStudents(specificStudent) {
        try {
            if (specificStudent) {
                /* Load specific student */
                var student = await dbSelect('students', {
                    select: '*, modules:current_module_id(module_name, module_number)',
                    eq: { id: specificStudent },
                    single: true
                });
                students = student ? [student] : [];
                document.getElementById('nav-subtitle').textContent = student ? student.full_name : 'Student';
            } else {
                /* Load all assigned students */
                var assignments = await dbSelect('teacher_assignments', {
                    select: 'student_id',
                    eq: { teacher_id: teacher.id, is_active: true }
                });

                if (assignments.length === 0) {
                    students = [];
                    renderAttendanceList();
                    return;
                }

                var studentIds = assignments.map(function (a) { return a.student_id; });

                students = await dbSelect('students', {
                    select: '*, modules:current_module_id(module_name, module_number)',
                    inFilter: { id: studentIds },
                    eq: { status: 'Active' },
                    order: { column: 'full_name', ascending: true }
                });
            }

            renderAttendanceList();
        } catch (err) {
            students = [];
            renderAttendanceList();
        }
    }

    async function loadAttendance() {
        attendanceMap = {};
        existingAttendance = {};

        try {
            var studentIds = students.map(function (s) { return s.id; });
            if (studentIds.length === 0) return;

            var records = await dbSelect('attendance', {
                eq: { attendance_date: selectedDate },
                inFilter: { student_id: studentIds }
            });

            for (var i = 0; i < records.length; i++) {
                var r = records[i];
                attendanceMap[r.student_id] = r.status;
                existingAttendance[r.student_id] = r.id;
            }

            updateUI();
        } catch (err) { }
    }

    function renderAttendanceList() {
        var container = document.getElementById('attendance-rows');

        if (students.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No active students to mark attendance</p></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < students.length; i++) {
            var s = students[i];
            var currentStatus = attendanceMap[s.id] || '';

            html += '<div class="attendance-row" data-student="' + s.id + '">';
            html += '<div class="student-info">';
            html += '<div class="student-photo">';
            if (s.photo_url) {
                html += '<img src="' + s.photo_url + '" alt="">';
            } else {
                var initials = s.full_name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
                html += initials;
            }
            html += '</div>';
            html += '<div class="student-details">';
            html += '<div class="student-name">' + s.full_name + '</div>';
            html += '<div class="student-code">' + s.student_code + (s.modules ? ' · M' + s.modules.module_number : '') + '</div>';
            html += '</div></div>';
            html += '<div class="status-buttons">';
            html += '<button class="status-btn present ' + (currentStatus === 'Present' ? 'active' : '') + '" data-status="Present" onclick="setStatus(\'' + s.id + '\', \'Present\')">✓</button>';
            html += '<button class="status-btn absent ' + (currentStatus === 'Absent' ? 'active' : '') + '" data-status="Absent" onclick="setStatus(\'' + s.id + '\', \'Absent\')">✕</button>';
            html += '<button class="status-btn leave ' + (currentStatus === 'Leave' ? 'active' : '') + '" data-status="Leave" onclick="setStatus(\'' + s.id + '\', \'Leave\')">L</button>';
            html += '</div></div>';
        }

        container.innerHTML = html;
        updateSummary();
    }

    window.setStatus = function (studentId, status) {
        attendanceMap[studentId] = status;
        updateUI();
    };

    window.markAll = function (status) {
        for (var i = 0; i < students.length; i++) {
            attendanceMap[students[i].id] = status;
        }
        updateUI();
    };

    window.resetAttendance = function () {
        attendanceMap = {};
        for (var key in existingAttendance) {
            /* Keep existing values */
        }
        loadAttendance();
    };

    function updateUI() {
        for (var i = 0; i < students.length; i++) {
            var s = students[i];
            var row = document.querySelector('.attendance-row[data-student="' + s.id + '"]');
            if (!row) continue;

            var status = attendanceMap[s.id] || '';
            var buttons = row.querySelectorAll('.status-btn');
            buttons.forEach(function (btn) {
                btn.classList.remove('active');
                if (btn.dataset.status === status) {
                    btn.classList.add('active');
                }
            });
        }
        updateSummary();
    }

    function updateSummary() {
        var present = 0, absent = 0, leave = 0, unmarked = 0;

        for (var i = 0; i < students.length; i++) {
            var status = attendanceMap[students[i].id];
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Leave') leave++;
            else unmarked++;
        }

        var html = '';
        html += '<div class="summary-item"><div class="count">' + students.length + '</div><div class="label">Total</div></div>';
        html += '<div class="summary-item present"><div class="count">' + present + '</div><div class="label">Present</div></div>';
        html += '<div class="summary-item absent"><div class="count">' + absent + '</div><div class="label">Absent</div></div>';
        html += '<div class="summary-item leave"><div class="count">' + leave + '</div><div class="label">Leave</div></div>';

        document.getElementById('summary-bar').innerHTML = html;
        document.getElementById('list-title').textContent = students.length + ' Students · ' + unmarked + ' unmarked';
    }

    window.saveAttendance = async function () {
        var btn = document.getElementById('save-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            var promises = [];

            for (var studentId in attendanceMap) {
                var status = attendanceMap[studentId];
                if (!status) continue;

                if (existingAttendance[studentId]) {
                    /* Update existing */
                    promises.push(dbUpdate('attendance', existingAttendance[studentId], {
                        status: status
                    }));
                } else {
                    /* Insert new */
                    promises.push(dbInsert('attendance', {
                        student_id: studentId,
                        attendance_date: selectedDate,
                        status: status,
                        marked_by: teacher.id
                    }));
                }
            }

            await Promise.all(promises);
            showToast('Attendance saved successfully!', 'success');
            await loadAttendance();

        } catch (err) {
            showToast('Error saving: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Save Attendance';
        }
    };

    function setupListeners() {
        document.getElementById('attendance-date').addEventListener('change', function () {
            selectedDate = this.value;
            loadAttendance();
        });

        document.getElementById('prev-date').addEventListener('click', function () {
            var d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            selectedDate = d.toISOString().split('T')[0];
            document.getElementById('attendance-date').value = selectedDate;
            loadAttendance();
        });

        document.getElementById('next-date').addEventListener('click', function () {
            var d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            selectedDate = d.toISOString().split('T')[0];
            document.getElementById('attendance-date').value = selectedDate;
            loadAttendance();
        });

        document.getElementById('today-btn').addEventListener('click', function () {
            selectedDate = todayISO();
            document.getElementById('attendance-date').value = selectedDate;
            loadAttendance();
        });
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
