/**
 * Office Dashboard Logic
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    /* Prevent back navigation to login */
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) { initDashboard(); }
    });

    /* ── Init ── */
    async function initDashboard() {
        showLoader('Loading dashboard...');

        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            var settings = await getInstituteSettings();

            /* Update nav */
            document.getElementById('nav-title').textContent = settings.institute_name || 'Office Dashboard';
            document.getElementById('nav-subtitle').textContent = 'Office Portal';
            document.title = (settings.institute_name || 'ERP') + ' — Office Dashboard';

            /* Date */
            document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });

            /* Load stats */
            await loadStats(settings);

            /* Build menu */
            buildMenu();

        } catch (err) {
            showToast('Failed to load dashboard: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    /* ── Load Stats ── */
    async function loadStats(settings) {
        var sym = settings.currency_symbol || '₹';

        try {
            /* Count students by status */
            var allStudents = await dbSelect('students', { select: 'id,status,balance,total_paid' });
            var active = 0, finished = 0, discontinued = 0, archived = 0;
            var totalBalance = 0;

            for (var i = 0; i < allStudents.length; i++) {
                var s = allStudents[i];
                switch (s.status) {
                    case 'Active': active++; break;
                    case 'Course Finished': finished++; break;
                    case 'Discontinued': discontinued++; break;
                    case 'Archived': archived++; break;
                }
                if (s.status === 'Active') {
                    totalBalance += parseFloat(s.balance) || 0;
                }
            }

            /* Today's collection */
            var today = todayISO();
            var todayPayments = await dbSelect('fee_payments', {
                select: 'amount',
                eq: { payment_date: today }
            });
            var todayTotal = 0;
            for (var j = 0; j < todayPayments.length; j++) {
                todayTotal += parseFloat(todayPayments[j].amount) || 0;
            }

            /* Module count */
            var modules = await dbSelect('modules', { select: 'id' });
            var moduleCount = modules ? modules.length : 0;

            /* Render */
            var grid = document.getElementById('stat-grid');
            grid.innerHTML =
                renderStatCard('Active Students', active, '🎓', '#4a90d9') +
                renderStatCard('Old Students', finished + discontinued, '📋', '#f39c12') +
                renderStatCard('Finished', finished, '✅', '#27ae60') +
                renderStatCard('Discontinued', discontinued, '⛔', '#e74c3c') +
                renderStatCard("Today's Collection", formatCurrency(todayTotal, sym), '💰', '#27ae60') +
                renderStatCard('Pending Fees', formatCurrency(totalBalance, sym), '📊', '#e74c3c') +
                renderStatCard('Total Modules', moduleCount, '📦', '#9b59b6');

        } catch (err) {
            showToast('Error loading stats: ' + err.message, 'error');
        }
    }

    /* ── Build Menu ── */
    function buildMenu() {
        var grid = document.getElementById('menu-grid');
        grid.innerHTML =
            renderMenuButton('New Admission', '📝', 'new-admission.html', '#4a90d9') +
            renderMenuButton('Student List', '👥', 'students.html', '#2d5f8a') +
            renderMenuButton('Old Students', '📋', 'old-students.html', '#f39c12') +
            renderMenuButton('Fee Collection', '💰', 'fees.html', '#27ae60') +
            renderMenuButton('Modules', '📦', 'modules.html', '#9b59b6') +
            renderMenuButton('Reports', '📊', '#', '#e67e22') +
            renderMenuButton('Notifications', '🔔', '#', '#3498db') +
            renderMenuButton('Settings', '⚙️', '#', '#7f8c8d') +
            '<a href="#" class="menu-btn" onclick="handleLogout();return false;" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 12px;background:#fff;border-radius:14px;text-decoration:none;box-shadow:0 2px 12px rgba(0,0,0,0.06);cursor:pointer;">' +
            '<div style="width:48px;height:48px;border-radius:12px;background:#e74c3c15;display:flex;align-items:center;justify-content:center;font-size:22px;">🚪</div>' +
            '<span style="font-size:13px;font-weight:600;color:#e74c3c;text-align:center;">Logout</span></a>';
    }

    /* ── Logout ── */
    window.handleLogout = async function () {
        try {
            await signOut();
            window.location.replace('login.html');
        } catch (err) {
            showToast('Logout failed: ' + err.message, 'error');
        }
    };

    /* ── Boot ── */
    waitForSupabase().then(function () {
        initDashboard();
    }).catch(function (err) {
        hideLoader();
        showToast('Failed to connect to server.', 'error');
    });

})();
