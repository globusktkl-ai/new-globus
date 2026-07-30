/**
 * Student Attendance Logic
 * Globus Technical Academy ERP v1.00 — Part 2
 */

(function () {
    'use strict';

    var STUDENT_SESSION_KEY = 'erp_student_session';
    var student = null;
    var allAttendance = [];
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    var currentMonth = currentDate.getMonth();

    function getStudentSession() {
        var s = localStorage.getItem(STUDENT_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(STUDENT_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    async function init() {
        var session = getStudentSession();
        if (!session || !session.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading attendance...');

        try {
            await waitForSupabase();

            student = await dbSelect('students', {
                eq: { id: session.id },
                single: true
            });

            if (!student) {
                window.location.replace('login.html');
                return;
            }

            await loadAllAttendance();
            setupListeners();
            renderAll();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadAllAttendance() {
        try {
            allAttendance = await dbSelect('attendance', {
                eq: { student_id: student.id },
                order: { column: 'attendance_date', ascending: false }
            });
        } catch (err) {
            allAttendance = [];
        }
    }

    function setupListeners() {
        document.getElementById('prev-month').addEventListener('click', function () {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderAll();
        });

        document.getElementById('next-month').addEventListener('click', function () {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderAll();
        });
    }

    function renderAll() {
        renderOverview();
        renderMonthLabel();
        renderCalendar();
        renderMonthlySummary();
    }

    function renderOverview() {
        var total = allAttendance.length;
        var present = allAttendance.filter(function (a) { return a.status === 'Present'; }).length;
        var halfDay = allAttendance.filter(function (a) { return a.status === 'Half Day'; }).length;
        var absent = allAttendance.filter(function (a) { return a.status === 'Absent'; }).length;
        var leave = allAttendance.filter(function (a) { return a.status === 'Leave'; }).length;

        var percent = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;

        document.getElementById('overall-percent').textContent = percent + '%';

        var statsHTML = '';
        statsHTML += '<div class="att-stat present"><div class="att-count">' + present + '</div><div class="att-label">Present</div></div>';
        statsHTML += '<div class="att-stat absent"><div class="att-count">' + absent + '</div><div class="att-label">Absent</div></div>';
        statsHTML += '<div class="att-stat leave"><div class="att-count">' + leave + '</div><div class="att-label">Leave</div></div>';

        document.getElementById('overall-stats').innerHTML = statsHTML;
    }

    function renderMonthLabel() {
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('month-label').textContent = months[currentMonth] + ' ' + currentYear;
        document.getElementById('summary-title').textContent = months[currentMonth] + ' Summary';
    }

    function renderCalendar() {
        var firstDay = new Date(currentYear, currentMonth, 1);
        var lastDay = new Date(currentYear, currentMonth + 1, 0);
        var startDayOfWeek = firstDay.getDay();
        var daysInMonth = lastDay.getDate();
        var today = new Date();

        /* Get attendance for this month */
        var monthAttendance = {};
        for (var i = 0; i < allAttendance.length; i++) {
            var a = allAttendance[i];
            var d = new Date(a.attendance_date);
            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                monthAttendance[d.getDate()] = a.status;
            }
        }

        var html = '';

        /* Empty cells before first day */
        for (var e = 0; e < startDayOfWeek; e++) {
            html += '<div class="calendar-day empty"></div>';
        }

        /* Days of month */
        for (var day = 1; day <= daysInMonth; day++) {
            var status = monthAttendance[day];
            var isToday = (today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day);

            var classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (status === 'Present') classes += ' present';
            else if (status === 'Absent') classes += ' absent';
            else if (status === 'Leave') classes += ' leave';
            else if (status === 'Half Day') classes += ' half-day';

            html += '<div class="' + classes + '">' + day + '</div>';
        }

        document.getElementById('calendar-grid').innerHTML = html;
    }

    function renderMonthlySummary() {
        /* Get attendance for this month */
        var monthData = allAttendance.filter(function (a) {
            var d = new Date(a.attendance_date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        var total = monthData.length;
        var present = monthData.filter(function (a) { return a.status === 'Present'; }).length;
        var absent = monthData.filter(function (a) { return a.status === 'Absent'; }).length;
        var leave = monthData.filter(function (a) { return a.status === 'Leave'; }).length;

        /* Progress bar */
        var presentWidth = total > 0 ? ((present / total) * 100) : 0;
        var absentWidth = total > 0 ? ((absent / total) * 100) : 0;
        var leaveWidth = total > 0 ? ((leave / total) * 100) : 0;

        var barHTML = '';
        if (presentWidth > 0) barHTML += '<div class="present-bar" style="width:' + presentWidth + '%"></div>';
        if (absentWidth > 0) barHTML += '<div class="absent-bar" style="width:' + absentWidth + '%"></div>';
        if (leaveWidth > 0) barHTML += '<div class="leave-bar" style="width:' + leaveWidth + '%"></div>';

        if (!barHTML) barHTML = '<div style="width:100%;background:#e0e7ef;"></div>';

        document.getElementById('summary-bar').innerHTML = barHTML;

        /* Details */
        var detailsHTML = '';
        detailsHTML += '<div class="summary-item present"><div class="count">' + present + '</div><div class="label">Present</div></div>';
        detailsHTML += '<div class="summary-item absent"><div class="count">' + absent + '</div><div class="label">Absent</div></div>';
        detailsHTML += '<div class="summary-item leave"><div class="count">' + leave + '</div><div class="label">Leave</div></div>';

        document.getElementById('summary-details').innerHTML = detailsHTML;
    }

    /* Dark mode */
    if (localStorage.getItem('erp_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
