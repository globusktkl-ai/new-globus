/**
 * Teacher Dashboard Logic
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';
    var teacher = null;
    var settings = null;

    window.addEventListener('pageshow', function (e) {
        if (e.persisted) init();
    });

    function getTeacherSession() {
        var s = localStorage.getItem(TEACHER_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(TEACHER_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function clearTeacherSession() {
        localStorage.removeItem(TEACHER_SESSION_KEY);
        sessionStorage.removeItem(TEACHER_SESSION_KEY);
    }

    window.handleLogout = function () {
        clearTeacherSession();
        window.location.replace('login.html');
    };

    async function init() {
        var session = getTeacherSession();
        if (!session || !session.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading dashboard...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();

            teacher = await dbSelect('teachers', {
                eq: { id: session.id },
                single: true
            });

            if (!teacher) {
                clearTeacherSession();
                window.location.replace('login.html');
                return;
            }

            /* Date */
            document.getElementById('nav-date').textContent = new Date().toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });

            renderWelcome();
            await renderStats();
            renderMenu();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderWelcome() {
        var photoEl = document.getElementById('teacher-photo');
        if (teacher.photo_url) {
            photoEl.innerHTML = '<img src="' + teacher.photo_url + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
        } else {
            var initials = teacher.full_name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            photoEl.textContent = initials;
        }

        document.getElementById('teacher-name').textContent = 'Welcome, ' + teacher.full_name.split(' ')[0] + '!';
        document.getElementById('teacher-code').textContent = teacher.teacher_code + (teacher.specialization ? ' · ' + teacher.specialization : '');
    }

    async function renderStats() {
        var assignedStudents = 0;
        var todayAttendance = 0;
        var pendingAttendance = 0;
        var unreadNotifs = 0;

        try {
            /* Get assigned students */
            var assignments = await dbSelect('teacher_assignments', {
                select: 'student_id',
                eq: { teacher_id: teacher.id, is_active: true }
            });
            assignedStudents = assignments.length;

            /* Get today's attendance */
            var today = todayISO();
            var studentIds = assignments.map(function (a) { return a.student_id; });

            if (studentIds.length > 0) {
                var todayAtt = await dbSelect('attendance', {
                    select: 'id',
                    eq: { attendance_date: today },
                    inFilter: { student_id: studentIds }
                });
                todayAttendance = todayAtt.length;
                pendingAttendance = assignedStudents - todayAttendance;
            }

            /* Get unread notifications */
            var notifs = await dbSelect('notifications', {
                select: 'id',
                inFilter: { target_role: ['teacher', 'all'] }
            });
            var readNotifs = await dbSelect('teacher_notifications', {
                select: 'notification_id',
                eq: { teacher_id: teacher.id, is_read: true }
            });
            var readIds = readNotifs.map(function (n) { return n.notification_id; });
            unreadNotifs = notifs.filter(function (n) { return readIds.indexOf(n.id) === -1; }).length;

        } catch (e) { }

        var statsHTML = '';
        statsHTML += '<div class="stat-card"><div class="stat-icon" style="background:#eaf2fb;">👥</div><div><div class="stat-value">' + assignedStudents + '</div><div class="stat-label">Assigned Students</div></div></div>';
        statsHTML += '<div class="stat-card"><div class="stat-icon" style="background:#eafaf1;">✅</div><div><div class="stat-value" style="color:#27ae60;">' + todayAttendance + '</div><div class="stat-label">Today\'s Attendance</div></div></div>';
        statsHTML += '<div class="stat-card"><div class="stat-icon" style="background:#fef5e7;">⏳</div><div><div class="stat-value" style="color:#f39c12;">' + pendingAttendance + '</div><div class="stat-label">Pending Attendance</div></div></div>';
        statsHTML += '<div class="stat-card"><div class="stat-icon" style="background:#fdecea;">🔔</div><div><div class="stat-value" style="color:#e74c3c;">' + unreadNotifs + '</div><div class="stat-label">Notifications</div></div></div>';

        document.getElementById('stat-grid').innerHTML = statsHTML;
    }

    function renderMenu() {
        var menuHTML = '';
        menuHTML += '<a href="students.html" class="menu-item"><div class="menu-icon">👥</div><div class="menu-label">Students</div></a>';
        menuHTML += '<a href="attendance.html" class="menu-item"><div class="menu-icon">📋</div><div class="menu-label">Attendance</div></a>';
        menuHTML += '<a href="module-progress.html" class="menu-item"><div class="menu-icon">📦</div><div class="menu-label">Module Progress</div></a>';
        menuHTML += '<a href="reports.html" class="menu-item"><div class="menu-icon">📊</div><div class="menu-label">Reports</div></a>';
        menuHTML += '<a href="notifications.html" class="menu-item"><div class="menu-icon">🔔</div><div class="menu-label">Notifications</div></a>';
        menuHTML += '<a href="settings.html" class="menu-item"><div class="menu-icon">⚙️</div><div class="menu-label">Settings</div></a>';
        menuHTML += '<a href="#" onclick="handleLogout();return false;" class="menu-item logout"><div class="menu-icon">🚪</div><div class="menu-label">Logout</div></a>';

        document.getElementById('menu-grid').innerHTML = menuHTML;
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
