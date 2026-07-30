/**
 * Student Dashboard Logic
 * Globus Technical Academy ERP v1.00 — Part 2
 */

(function () {
    'use strict';

    var STUDENT_SESSION_KEY = 'erp_student_session';
    var student = null;
    var settings = null;

    /* Prevent back cache */
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) init();
    });

    function getStudentSession() {
        var s = localStorage.getItem(STUDENT_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(STUDENT_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function clearStudentSession() {
        localStorage.removeItem(STUDENT_SESSION_KEY);
        sessionStorage.removeItem(STUDENT_SESSION_KEY);
    }

    /* Logout */
    window.handleLogout = function () {
        clearStudentSession();
        window.location.replace('login.html');
    };

    /* Init */
    async function init() {
        var session = getStudentSession();
        if (!session || !session.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();

            /* Fetch fresh student data */
            student = await dbSelect('students', {
                select: '*, courses(course_name), modules:current_module_id(module_name, module_number)',
                eq: { id: session.id },
                single: true
            });

            if (!student) {
                clearStudentSession();
                window.location.replace('login.html');
                return;
            }

            /* Check status */
            if (student.status === 'Discontinued') {
                showBlockedState('discontinued');
                return;
            }

            /* Set date */
            document.getElementById('nav-date').textContent = new Date().toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short'
            });

            renderWelcome();
            await renderStats();
            renderMenu();
            renderOfficeContact();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    /* Render Welcome Card */
    function renderWelcome() {
        var photoEl = document.getElementById('welcome-photo');
        if (student.photo_url) {
            photoEl.innerHTML = '<img src="' + student.photo_url + '" alt="Photo">';
        } else {
            var initials = student.full_name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            photoEl.textContent = initials;
        }

        document.getElementById('welcome-name').textContent = 'Hi, ' + student.full_name.split(' ')[0] + '!';
        document.getElementById('welcome-course').textContent = student.courses ? student.courses.course_name : 'No course assigned';
    }

    /* Render Stats */
    async function renderStats() {
        var sym = (settings && settings.currency_symbol) || '₹';
        var currentModule = student.modules ? ('Module ' + student.modules.module_number) : '—';

        /* Calculate attendance */
        var attendancePercent = 0;
        try {
            var attendance = await dbSelect('attendance', {
                select: 'status',
                eq: { student_id: student.id }
            });
            if (attendance && attendance.length > 0) {
                var present = attendance.filter(function (a) { return a.status === 'Present' || a.status === 'Half Day'; }).length;
                attendancePercent = Math.round((present / attendance.length) * 100);
            }
        } catch (e) { }

        var statsHTML = '';
        statsHTML += '<div class="stat-card"><div class="stat-icon">📦</div><div class="stat-value">' + currentModule + '</div><div class="stat-label">Current Module</div></div>';
        statsHTML += '<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">' + attendancePercent + '%</div><div class="stat-label">Attendance</div></div>';
        statsHTML += '<div class="stat-card success"><div class="stat-icon">✅</div><div class="stat-value">' + formatCurrency(student.total_paid, sym) + '</div><div class="stat-label">Paid</div></div>';
        statsHTML += '<div class="stat-card ' + (student.balance > 0 ? 'danger' : '') + '"><div class="stat-icon">💰</div><div class="stat-value">' + formatCurrency(student.balance, sym) + '</div><div class="stat-label">Balance</div></div>';

        document.getElementById('stat-row').innerHTML = statsHTML;
    }

    /* Render Menu */
    function renderMenu() {
        var menuHTML = '';
        menuHTML += '<a href="profile.html" class="menu-item"><div class="menu-icon">👤</div><div class="menu-label">My Profile</div></a>';
        menuHTML += '<a href="fees.html" class="menu-item"><div class="menu-icon">💰</div><div class="menu-label">Fee Details</div></a>';
        menuHTML += '<a href="attendance.html" class="menu-item"><div class="menu-icon">📅</div><div class="menu-label">Attendance</div></a>';
        menuHTML += '<a href="notifications.html" class="menu-item"><div class="menu-icon">🔔</div><div class="menu-label">Notifications</div></a>';
        menuHTML += '<a href="settings.html" class="menu-item"><div class="menu-icon">⚙️</div><div class="menu-label">Settings</div></a>';
        menuHTML += '<a href="#" class="menu-item logout" onclick="handleLogout();return false;"><div class="menu-icon">🚪</div><div class="menu-label">Logout</div></a>';

        document.getElementById('menu-grid').innerHTML = menuHTML;
    }

    /* Render Office Contact */
    function renderOfficeContact() {
        var phone = (settings && settings.phone) || '';
        var email = (settings && settings.email) || '';
        var cc = (settings && settings.country_code) || '91';

        var html = '';
        if (phone) {
            html += '<a href="' + phoneCallLink(phone, cc) + '" class="contact-btn call"><span>📞</span>Call</a>';
            html += '<a href="' + phoneWhatsAppLink(phone, cc) + '" target="_blank" class="contact-btn whatsapp"><span>💬</span>WhatsApp</a>';
        }
        if (email) {
            html += '<a href="mailto:' + email + '" class="contact-btn email"><span>✉️</span>Email</a>';
        }

        if (!html) {
            html = '<p style="color:#888;font-size:14px;">Contact info not available</p>';
        }

        document.getElementById('office-contact').innerHTML = html;
    }

    /* Blocked State */
    function showBlockedState(type) {
        hideLoader();
        document.getElementById('main-content').style.display = 'none';
        var overlay = document.getElementById('blocked-overlay');
        overlay.style.display = 'flex';

        if (type === 'discontinued') {
            overlay.innerHTML = '<div class="blocked-card">' +
                '<div class="blocked-icon">⚠️</div>' +
                '<h2>Account Discontinued</h2>' +
                '<p>Your student account has been discontinued. Please contact the office for assistance.</p>' +
                '<a href="#" onclick="handleLogout();return false;" class="btn btn-primary btn-block">Logout</a>' +
                '</div>';
        }
    }

    /* Apply dark mode */
    function checkDarkMode() {
        var darkMode = localStorage.getItem('erp_dark_mode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    /* Boot */
    checkDarkMode();
    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
