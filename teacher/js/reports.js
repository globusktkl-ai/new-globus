/**
 * Reports Generation
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';
    var teacher = null;
    var students = [];
    var reportType = 'daily';

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

            /* Set default dates */
            document.getElementById('filter-date').value = todayISO();
            var now = new Date();
            document.getElementById('filter-month').value = now.toISOString().slice(0, 7);

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
            var assignments = await dbSelect('teacher_assignments', {
                select: 'student_id',
                eq: { teacher_id: teacher.id, is_active: true }
            });

            if (assignments.length === 0) return;

            var studentIds = assignments.map(function (a) { return a.student_id; });

            students = await dbSelect('students', {
                select: 'id, student_code, full_name, status',
                inFilter: { id: studentIds },
                order: { column: 'full_name', ascending: true }
            });

            /* Populate student filter */
            var select = document.getElementById('filter-student');
            students.forEach(function (s) {
                var opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.full_name + ' (' + s.student_code + ')';
                select.appendChild(opt);
            });

        } catch (err) { }
    }

    function setupListeners() {
        /* Report type selection */
        document.querySelectorAll('.report-type-card').forEach(function (card) {
            card.addEventListener('click', function () {
                document.querySelectorAll('.report-type-card').forEach(function (c) { c.classList.remove('active'); });
                this.classList.add('active');
                reportType = this.dataset.type;
                updateFilterVisibility();
            });
        });
    }

    function updateFilterVisibility() {
        var dateGroup = document.getElementById('filter-date').parentElement;
        var monthGroup = document.getElementById('filter-month').parentElement;
        var studentGroup = document.getElementById('student-filter-group');

        dateGroup.style.display = reportType === 'daily' ? 'block' : 'none';
        monthGroup.style.display = (reportType === 'monthly' || reportType === 'student') ? 'block' : 'none';
        studentGroup.style.display = reportType === 'student' ? 'block' : 'none';
    }

    window.generateReport = async function () {
        showLoader('Generating report...');

        try {
            switch (reportType) {
                case 'daily':
                    await generateDailyReport();
                    break;
                case 'monthly':
                    await generateMonthlyReport();
                    break;
                case 'student':
                    await generateStudentReport();
                    break;
                case 'low-attendance':
                    await generateLowAttendanceReport();
                    break;
            }

            document.getElementById('report-output').style.display = 'block';
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    async function generateDailyReport() {
        var date = document.getElementById('filter-date').value;
        var studentIds = students.map(function (s) { return s.id; });

        var attendance = await dbSelect('attendance', {
            eq: { attendance_date: date },
            inFilter: { student_id: studentIds }
        });

        var attMap = {};
        attendance.forEach(function (a) { attMap[a.student_id] = a.status; });

        var present = 0, absent = 0, leave = 0, unmarked = 0;
        students.forEach(function (s) {
            var status = attMap[s.id];
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Leave') leave++;
            else unmarked++;
        });

        document.getElementById('report-title').textContent = 'Daily Attendance — ' + formatDate(date);

        var statsHTML = '';
        statsHTML += '<div class="report-stat-item"><div class="stat-value">' + students.length + '</div><div class="stat-label">Total</div></div>';
        statsHTML += '<div class="report-stat-item success"><div class="stat-value">' + present + '</div><div class="stat-label">Present</div></div>';
        statsHTML += '<div class="report-stat-item danger"><div class="stat-value">' + absent + '</div><div class="stat-label">Absent</div></div>';
        statsHTML += '<div class="report-stat-item warning"><div class="stat-value">' + leave + '</div><div class="stat-label">Leave</div></div>';
        document.getElementById('report-stats').innerHTML = statsHTML;

        document.getElementById('report-thead').innerHTML = '<tr><th>#</th><th>Code</th><th>Name</th><th>Status</th></tr>';

        var tbody = '';
        for (var i = 0; i < students.length; i++) {
            var s = students[i];
            var status = attMap[s.id] || 'Not Marked';
            var badgeClass = status === 'Present' ? 'present' : (status === 'Absent' ? 'absent' : (status === 'Leave' ? 'leave' : ''));
            tbody += '<tr><td>' + (i + 1) + '</td><td>' + s.student_code + '</td><td>' + s.full_name + '</td><td><span class="status-badge ' + badgeClass + '">' + status + '</span></td></tr>';
        }
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    async function generateMonthlyReport() {
        var month = document.getElementById('filter-month').value;
        var studentIds = students.map(function (s) { return s.id; });

        /* Get all attendance for month */
        var startDate = month + '-01';
        var endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        var endDateStr = endDate.toISOString().split('T')[0];

        var attendance = await dbSelect('attendance', {
            inFilter: { student_id: studentIds }
        });

        /* Filter by month */
        attendance = attendance.filter(function (a) {
            return a.attendance_date >= startDate && a.attendance_date <= endDateStr;
        });

        /* Calculate per student */
        var data = students.map(function (s) {
            var studentAtt = attendance.filter(function (a) { return a.student_id === s.id; });
            var present = studentAtt.filter(function (a) { return a.status === 'Present'; }).length;
            var absent = studentAtt.filter(function (a) { return a.status === 'Absent'; }).length;
            var leave = studentAtt.filter(function (a) { return a.status === 'Leave'; }).length;
            var total = studentAtt.length;
            var percent = total > 0 ? Math.round((present / total) * 100) : 0;
            return { student: s, present: present, absent: absent, leave: leave, total: total, percent: percent };
        });

        document.getElementById('report-title').textContent = 'Monthly Report — ' + month;

        var totalPresent = data.reduce(function (sum, d) { return sum + d.present; }, 0);
        var totalAbsent = data.reduce(function (sum, d) { return sum + d.absent; }, 0);
        var avgPercent = Math.round(data.reduce(function (sum, d) { return sum + d.percent; }, 0) / data.length);

        var statsHTML = '';
        statsHTML += '<div class="report-stat-item"><div class="stat-value">' + students.length + '</div><div class="stat-label">Students</div></div>';
        statsHTML += '<div class="report-stat-item success"><div class="stat-value">' + totalPresent + '</div><div class="stat-label">Total Present</div></div>';
        statsHTML += '<div class="report-stat-item danger"><div class="stat-value">' + totalAbsent + '</div><div class="stat-label">Total Absent</div></div>';
        statsHTML += '<div class="report-stat-item"><div class="stat-value">' + avgPercent + '%</div><div class="stat-label">Avg Attendance</div></div>';
        document.getElementById('report-stats').innerHTML = statsHTML;

        document.getElementById('report-thead').innerHTML = '<tr><th>#</th><th>Code</th><th>Name</th><th>Present</th><th>Absent</th><th>Leave</th><th>%</th></tr>';

        var tbody = '';
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            var pClass = d.percent >= 75 ? 'good' : (d.percent >= 50 ? 'medium' : 'low');
            tbody += '<tr><td>' + (i + 1) + '</td><td>' + d.student.student_code + '</td><td>' + d.student.full_name + '</td>';
            tbody += '<td style="color:#27ae60;">' + d.present + '</td><td style="color:#e74c3c;">' + d.absent + '</td><td style="color:#f39c12;">' + d.leave + '</td>';
            tbody += '<td><div style="display:flex;align-items:center;gap:8px;"><span style="font-weight:600;">' + d.percent + '%</span><div class="percentage-bar" style="width:60px;"><div class="percentage-fill ' + pClass + '" style="width:' + d.percent + '%;"></div></div></div></td></tr>';
        }
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    async function generateStudentReport() {
        var month = document.getElementById('filter-month').value;
        var studentId = document.getElementById('filter-student').value;

        if (!studentId) {
            showToast('Please select a student', 'warning');
            return;
        }

        var student = students.find(function (s) { return s.id === studentId; });

        var startDate = month + '-01';
        var endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        var endDateStr = endDate.toISOString().split('T')[0];

        var attendance = await dbSelect('attendance', {
            eq: { student_id: studentId }
        });

        attendance = attendance.filter(function (a) {
            return a.attendance_date >= startDate && a.attendance_date <= endDateStr;
        }).sort(function (a, b) { return a.attendance_date.localeCompare(b.attendance_date); });

        var present = attendance.filter(function (a) { return a.status === 'Present'; }).length;
        var absent = attendance.filter(function (a) { return a.status === 'Absent'; }).length;
        var leave = attendance.filter(function (a) { return a.status === 'Leave'; }).length;
        var percent = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

        document.getElementById('report-title').textContent = 'Student Report — ' + student.full_name;

        var statsHTML = '';
        statsHTML += '<div class="report-stat-item"><div class="stat-value">' + attendance.length + '</div><div class="stat-label">Days</div></div>';
        statsHTML += '<div class="report-stat-item success"><div class="stat-value">' + present + '</div><div class="stat-label">Present</div></div>';
        statsHTML += '<div class="report-stat-item danger"><div class="stat-value">' + absent + '</div><div class="stat-label">Absent</div></div>';
        statsHTML += '<div class="report-stat-item"><div class="stat-value">' + percent + '%</div><div class="stat-label">Attendance</div></div>';
        document.getElementById('report-stats').innerHTML = statsHTML;

        document.getElementById('report-thead').innerHTML = '<tr><th>#</th><th>Date</th><th>Day</th><th>Status</th></tr>';

        var tbody = '';
        for (var i = 0; i < attendance.length; i++) {
            var a = attendance[i];
            var d = new Date(a.attendance_date);
            var dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            var badgeClass = a.status === 'Present' ? 'present' : (a.status === 'Absent' ? 'absent' : 'leave');
            tbody += '<tr><td>' + (i + 1) + '</td><td>' + formatDate(a.attendance_date) + '</td><td>' + dayName + '</td><td><span class="status-badge ' + badgeClass + '">' + a.status + '</span></td></tr>';
        }
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    async function generateLowAttendanceReport() {
        var studentIds = students.map(function (s) { return s.id; });

        var attendance = await dbSelect('attendance', {
            inFilter: { student_id: studentIds }
        });

        var data = students.map(function (s) {
            var studentAtt = attendance.filter(function (a) { return a.student_id === s.id; });
            var present = studentAtt.filter(function (a) { return a.status === 'Present'; }).length;
            var total = studentAtt.length;
            var percent = total > 0 ? Math.round((present / total) * 100) : 0;
            return { student: s, percent: percent, total: total };
        }).filter(function (d) { return d.percent < 75; }).sort(function (a, b) { return a.percent - b.percent; });

        document.getElementById('report-title').textContent = 'Low Attendance Report (<75%)';

        var statsHTML = '<div class="report-stat-item danger"><div class="stat-value">' + data.length + '</div><div class="stat-label">Students Below 75%</div></div>';
        document.getElementById('report-stats').innerHTML = statsHTML;

        if (data.length === 0) {
            document.getElementById('report-thead').innerHTML = '';
            document.getElementById('report-tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#27ae60;">✅ All students have 75% or higher attendance!</td></tr>';
            return;
        }

        document.getElementById('report-thead').innerHTML = '<tr><th>#</th><th>Code</th><th>Name</th><th>Attendance %</th></tr>';

        var tbody = '';
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            var pClass = d.percent >= 50 ? 'medium' : 'low';
            tbody += '<tr><td>' + (i + 1) + '</td><td>' + d.student.student_code + '</td><td>' + d.student.full_name + '</td>';
            tbody += '<td><div style="display:flex;align-items:center;gap:8px;"><span style="font-weight:600;color:#e74c3c;">' + d.percent + '%</span><div class="percentage-bar" style="width:80px;"><div class="percentage-fill ' + pClass + '" style="width:' + d.percent + '%;"></div></div></div></td></tr>';
        }
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    window.resetFilters = function () {
        document.getElementById('filter-date').value = todayISO();
        var now = new Date();
        document.getElementById('filter-month').value = now.toISOString().slice(0, 7);
        document.getElementById('filter-student').value = '';
        document.getElementById('report-output').style.display = 'none';
    };

    /* Dark mode */
    if (localStorage.getItem('erp_teacher_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
