/**
 * Admin Dashboard Logic
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var admin = null;
    var settings = null;

    window.addEventListener('pageshow', function (e) {
        if (e.persisted) init();
    });

    window.toggleMenu = function () {
        document.getElementById('nav-menu').classList.toggle('open');
    };

    function getAdminSession() {
        var s = localStorage.getItem(ADMIN_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(ADMIN_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function clearAdminSession() {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }

    window.handleLogout = async function () {
        try {
            await signOut();
        } catch (e) { }
        clearAdminSession();
        window.location.replace('login.html');
    };

    async function init() {
        admin = getAdminSession();
        if (!admin || !admin.id || admin.role !== 'admin' && admin.role !== 'superadmin') {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading dashboard...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();

            document.getElementById('nav-title').textContent = settings.institute_name || 'Admin Portal';
            document.getElementById('institute-name').textContent = settings.institute_name || 'Institute';
            document.getElementById('welcome-text').textContent = 'Welcome, ' + (admin.name || 'Admin');
            document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });

            await loadStats();
            renderQuickActions();
            await loadCharts();
            await loadActivity();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadStats() {
        var sym = (settings && settings.currency_symbol) || '₹';

        try {
            var students = await dbSelect('students', { select: 'id, status, balance' });
            var teachers = await dbSelect('teachers', { select: 'id', eq: { is_active: true } });
            var officeUsers = await dbSelect('office_users', { select: 'id' });

            var active = students.filter(function (s) { return s.status === 'Active'; }).length;
            var finished = students.filter(function (s) { return s.status === 'Course Finished'; }).length;
            var discontinued = students.filter(function (s) { return s.status === 'Discontinued'; }).length;
            var pendingFees = students.filter(function (s) { return s.status === 'Active'; }).reduce(function (sum, s) { return sum + (parseFloat(s.balance) || 0); }, 0);

            var today = todayISO();
            var todayPayments = await dbSelect('fee_payments', { select: 'amount', eq: { payment_date: today } });
            var todayCollection = todayPayments.reduce(function (sum, p) { return sum + (parseFloat(p.amount) || 0); }, 0);

            var monthStart = new Date();
            monthStart.setDate(1);
            var monthPayments = await dbSelect('fee_payments', { select: 'amount' });
            var monthCollection = monthPayments.filter(function (p) { return p.payment_date >= monthStart.toISOString().split('T')[0]; }).reduce(function (sum, p) { return sum + (parseFloat(p.amount) || 0); }, 0);

            var statsHTML = '';
            statsHTML += renderStatCard('Active Students', active, '🎓', '#4a90d9');
            statsHTML += renderStatCard('Finished', finished, '✅', '#27ae60');
            statsHTML += renderStatCard('Discontinued', discontinued, '⛔', '#e74c3c');
            statsHTML += renderStatCard('Teachers', teachers.length, '👨‍🏫', '#9b59b6');
            statsHTML += renderStatCard('Office Users', officeUsers.length, '🏢', '#f39c12');
            statsHTML += renderStatCard("Today's Collection", formatCurrency(todayCollection, sym), '💰', '#27ae60');
            statsHTML += renderStatCard('Monthly Collection', formatCurrency(monthCollection, sym), '📊', '#4a90d9');
            statsHTML += renderStatCard('Pending Fees', formatCurrency(pendingFees, sym), '⏳', '#e74c3c');

            document.getElementById('stats-grid').innerHTML = statsHTML;

        } catch (err) {
            document.getElementById('stats-grid').innerHTML = '<p style="color:#888;">Could not load stats</p>';
        }
    }

    function renderStatCard(label, value, icon, color) {
        return '<div class="stat-card"><div class="stat-icon" style="background:' + color + '15;">' + icon + '</div><div class="stat-content"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div></div>';
    }

    function renderQuickActions() {
        var actions = [
            { label: 'Students', icon: '👥', href: 'students.html' },
            { label: 'Teachers', icon: '👨‍🏫', href: 'teachers.html' },
            { label: 'Office Users', icon: '🏢', href: 'office-users.html' },
            { label: 'Courses', icon: '📚', href: 'courses.html' },
            { label: 'Modules', icon: '📦', href: 'modules.html' },
            { label: 'Reports', icon: '📊', href: 'reports.html' },
            { label: 'Notifications', icon: '🔔', href: 'notifications.html' },
            { label: 'Settings', icon: '⚙️', href: 'settings.html' },
            { label: 'Backup', icon: '💾', href: 'backup.html' },
            { label: 'Activity Logs', icon: '🕐', href: 'activity-logs.html' }
        ];

        var html = '';
        actions.forEach(function (a) {
            html += '<a href="' + a.href + '" class="action-card"><div class="action-icon">' + a.icon + '</div><div class="action-label">' + a.label + '</div></a>';
        });
        html += '<a href="#" onclick="handleLogout();return false;" class="action-card logout"><div class="action-icon">🚪</div><div class="action-label">Logout</div></a>';

        document.getElementById('quick-actions').innerHTML = html;
    }

    async function loadCharts() {
        try {
            var students = await dbSelect('students', { select: 'admission_date' });
            var payments = await dbSelect('fee_payments', { select: 'amount, payment_date' });

            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var currentMonth = new Date().getMonth();
            var admissionData = {};
            var revenueData = {};

            for (var i = 5; i >= 0; i--) {
                var m = (currentMonth - i + 12) % 12;
                admissionData[m] = 0;
                revenueData[m] = 0;
            }

            students.forEach(function (s) {
                if (s.admission_date) {
                    var m = new Date(s.admission_date).getMonth();
                    if (admissionData[m] !== undefined) admissionData[m]++;
                }
            });

            payments.forEach(function (p) {
                if (p.payment_date) {
                    var m = new Date(p.payment_date).getMonth();
                    if (revenueData[m] !== undefined) revenueData[m] += parseFloat(p.amount) || 0;
                }
            });

            var admMaxVal = Math.max.apply(null, Object.values(admissionData)) || 1;
            var revMaxVal = Math.max.apply(null, Object.values(revenueData)) || 1;

            var admHTML = '';
            var revHTML = '';

            for (var i = 5; i >= 0; i--) {
                var m = (currentMonth - i + 12) % 12;
                var admHeight = (admissionData[m] / admMaxVal) * 160;
                var revHeight = (revenueData[m] / revMaxVal) * 160;

                admHTML += '<div class="bar-item"><div class="bar-fill" style="height:' + admHeight + 'px;"></div><div class="bar-value">' + admissionData[m] + '</div><div class="bar-label">' + months[m] + '</div></div>';
                revHTML += '<div class="bar-item"><div class="bar-fill" style="height:' + revHeight + 'px;background:linear-gradient(180deg,#27ae60 0%,#1e8449 100%);"></div><div class="bar-value">' + formatCurrency(revenueData[m], settings.currency_symbol || '₹') + '</div><div class="bar-label">' + months[m] + '</div></div>';
            }

            document.getElementById('admissions-chart').innerHTML = admHTML;
            document.getElementById('revenue-chart').innerHTML = revHTML;

        } catch (err) { }
    }

    async function loadActivity() {
        try {
            var logs = await dbSelect('activity_logs', {
                order: { column: 'created_at', ascending: false },
                limit: 8
            });

            if (logs.length === 0) {
                document.getElementById('activity-list').innerHTML = '<p style="color:#888;text-align:center;padding:20px;">No recent activity</p>';
                return;
            }

            var html = '';
            logs.forEach(function (log) {
                var iconBg = '#eaf2fb';
                var icon = '📝';
                if (log.action.includes('create') || log.action.includes('add')) { icon = '➕'; iconBg = '#eafaf1'; }
                if (log.action.includes('update') || log.action.includes('edit')) { icon = '✏️'; iconBg = '#fef5e7'; }
                if (log.action.includes('delete')) { icon = '🗑️'; iconBg = '#fdecea'; }
                if (log.action.includes('login')) { icon = '🔑'; iconBg = '#eaf2fb'; }

                html += '<div class="activity-item"><div class="activity-icon" style="background:' + iconBg + ';">' + icon + '</div><div class="activity-content"><div class="activity-title">' + log.action + '</div><div class="activity-meta">' + (log.user_name || 'System') + ' • ' + formatDate(log.created_at) + '</div></div></div>';
            });

            document.getElementById('activity-list').innerHTML = html;

        } catch (err) {
            document.getElementById('activity-list').innerHTML = '<p style="color:#888;">Could not load activity</p>';
        }
    }

    /* Dark mode */
    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
