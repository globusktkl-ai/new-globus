/**
 * Admin Reports & Analytics
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var admin = null;
    var settings = null;
    var reportType = 'collection';
    var reportData = [];

    function getAdminSession() {
        var s = localStorage.getItem(ADMIN_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(ADMIN_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    window.handleLogout = async function () {
        try { await signOut(); } catch (e) { }
        localStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.replace('login.html');
    };

    async function init() {
        admin = getAdminSession();
        if (!admin || !admin.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();

            /* Set default dates */
            var today = new Date();
            var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            document.getElementById('from-date').value = firstDay.toISOString().split('T')[0];
            document.getElementById('to-date').value = todayISO();

            await loadCourses();
            await loadFinancialOverview();
            setupListeners();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadCourses() {
        try {
            var courses = await dbSelect('courses', { eq: { is_active: true } });
            var select = document.getElementById('filter-course');
            courses.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.course_name;
                select.appendChild(opt);
            });
        } catch (err) { }
    }

    async function loadFinancialOverview() {
        var sym = (settings && settings.currency_symbol) || '₹';

        try {
            var payments = await dbSelect('fee_payments', { select: 'amount, payment_mode, payment_date' });
            var students = await dbSelect('students', { select: 'balance, status' });

            var today = todayISO();
            var monthStart = new Date();
            monthStart.setDate(1);
            var monthStartStr = monthStart.toISOString().split('T')[0];

            var todayCollection = payments.filter(function (p) { return p.payment_date === today; }).reduce(function (sum, p) { return sum + parseFloat(p.amount); }, 0);
            var monthCollection = payments.filter(function (p) { return p.payment_date >= monthStartStr; }).reduce(function (sum, p) { return sum + parseFloat(p.amount); }, 0);
            var totalCollection = payments.reduce(function (sum, p) { return sum + parseFloat(p.amount); }, 0);
            var pendingFees = students.filter(function (s) { return s.status === 'Active'; }).reduce(function (sum, s) { return sum + parseFloat(s.balance || 0); }, 0);

            var html = '';
            html += '<div class="financial-card"><div class="card-icon" style="background:#eafaf1;">💰</div><div class="card-value">' + formatCurrency(todayCollection, sym) + '</div><div class="card-label">Today\'s Collection</div></div>';
            html += '<div class="financial-card"><div class="card-icon" style="background:#eaf2fb;">📊</div><div class="card-value">' + formatCurrency(monthCollection, sym) + '</div><div class="card-label">This Month</div></div>';
            html += '<div class="financial-card"><div class="card-icon" style="background:#fef5e7;">📈</div><div class="card-value">' + formatCurrency(totalCollection, sym) + '</div><div class="card-label">Total Collection</div></div>';
            html += '<div class="financial-card"><div class="card-icon" style="background:#fdecea;">⏳</div><div class="card-value">' + formatCurrency(pendingFees, sym) + '</div><div class="card-label">Pending Fees</div></div>';

            document.getElementById('financial-cards').innerHTML = html;

        } catch (err) { }
    }

    function setupListeners() {
        document.querySelectorAll('.report-category').forEach(function (cat) {
            cat.addEventListener('click', function () {
                document.querySelectorAll('.report-category').forEach(function (c) { c.classList.remove('active'); });
                this.classList.add('active');
                reportType = this.dataset.type;
            });
        });
    }

    window.generateReport = async function () {
        showLoader('Generating report...');

        try {
            var fromDate = document.getElementById('from-date').value;
            var toDate = document.getElementById('to-date').value;
            var courseFilter = document.getElementById('filter-course').value;
            var modeFilter = document.getElementById('filter-mode').value;

            switch (reportType) {
                case 'collection': await generateCollectionReport(fromDate, toDate, modeFilter); break;
                case 'students': await generateStudentsReport(courseFilter); break;
                case 'attendance': await generateAttendanceReport(fromDate, toDate); break;
                case 'pending': await generatePendingReport(courseFilter); break;
            }

            document.getElementById('report-output').style.display = 'block';
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    async function generateCollectionReport(fromDate, toDate, modeFilter) {
        var sym = (settings && settings.currency_symbol) || '₹';

        var payments = await dbSelect('fee_payments', {
            select: '*, students(student_code, full_name)',
            order: { column: 'payment_date', ascending: false }
        });

        reportData = payments.filter(function (p) {
            if (fromDate && p.payment_date < fromDate) return false;
            if (toDate && p.payment_date > toDate) return false;
            if (modeFilter && p.payment_mode !== modeFilter) return false;
            return true;
        });

        var total = reportData.reduce(function (sum, p) { return sum + parseFloat(p.amount); }, 0);
        var cash = reportData.filter(function (p) { return p.payment_mode === 'Cash'; }).reduce(function (sum, p) { return sum + parseFloat(p.amount); }, 0);
        var upi = reportData.filter(function (p) { return p.payment_mode === 'UPI'; }).reduce(function (sum, p) { return sum + parseFloat(p.amount); }, 0);

        document.getElementById('report-title').textContent = 'Fee Collection Report';
        document.getElementById('report-stats').innerHTML =
            '<div class="report-stat-item primary"><div class="stat-value">' + formatCurrency(total, sym) + '</div><div class="stat-label">Total</div></div>' +
            '<div class="report-stat-item"><div class="stat-value">' + reportData.length + '</div><div class="stat-label">Transactions</div></div>' +
            '<div class="report-stat-item success"><div class="stat-value">' + formatCurrency(cash, sym) + '</div><div class="stat-label">Cash</div></div>' +
            '<div class="report-stat-item warning"><div class="stat-value">' + formatCurrency(upi, sym) + '</div><div class="stat-label">UPI</div></div>';

        document.getElementById('report-thead').innerHTML = '<tr><th>Receipt</th><th>Date</th><th>Student</th><th>Amount</th><th>Mode</th></tr>';

        var tbody = '';
        reportData.forEach(function (p) {
            tbody += '<tr><td>' + p.receipt_number + '</td><td>' + formatDate(p.payment_date) + '</td><td>' + (p.students ? p.students.full_name : '—') + '</td><td style="font-weight:600;color:#27ae60;">' + formatCurrency(p.amount, sym) + '</td><td>' + p.payment_mode + '</td></tr>';
        });
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    async function generateStudentsReport(courseFilter) {
        var students = await dbSelect('students', {
            select: '*, courses(course_name)',
            order: { column: 'admission_date', ascending: false }
        });

        reportData = students.filter(function (s) {
            if (courseFilter && s.course_id !== courseFilter) return false;
            return true;
        });

        var active = reportData.filter(function (s) { return s.status === 'Active'; }).length;
        var finished = reportData.filter(function (s) { return s.status === 'Course Finished'; }).length;
        var discontinued = reportData.filter(function (s) { return s.status === 'Discontinued'; }).length;

        document.getElementById('report-title').textContent = 'Students Report';
        document.getElementById('report-stats').innerHTML =
            '<div class="report-stat-item"><div class="stat-value">' + reportData.length + '</div><div class="stat-label">Total</div></div>' +
            '<div class="report-stat-item primary"><div class="stat-value">' + active + '</div><div class="stat-label">Active</div></div>' +
            '<div class="report-stat-item success"><div class="stat-value">' + finished + '</div><div class="stat-label">Finished</div></div>' +
            '<div class="report-stat-item danger"><div class="stat-value">' + discontinued + '</div><div class="stat-label">Discontinued</div></div>';

        document.getElementById('report-thead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Course</th><th>Admission</th><th>Status</th></tr>';

        var tbody = '';
        reportData.forEach(function (s) {
            var statusClass = s.status === 'Active' ? 'badge-primary' : (s.status === 'Course Finished' ? 'badge-success' : 'badge-danger');
            tbody += '<tr><td>' + s.student_code + '</td><td>' + s.full_name + '</td><td>' + (s.courses ? s.courses.course_name : '—') + '</td><td>' + formatDate(s.admission_date) + '</td><td><span class="badge ' + statusClass + '">' + s.status + '</span></td></tr>';
        });
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    async function generatePendingReport(courseFilter) {
        var sym = (settings && settings.currency_symbol) || '₹';

        var students = await dbSelect('students', {
            select: '*, courses(course_name)',
            eq: { status: 'Active' },
            order: { column: 'balance', ascending: false }
        });

        reportData = students.filter(function (s) {
            if (courseFilter && s.course_id !== courseFilter) return false;
            return s.balance > 0;
        });

        var totalPending = reportData.reduce(function (sum, s) { return sum + parseFloat(s.balance); }, 0);

        document.getElementById('report-title').textContent = 'Pending Fees Report';
        document.getElementById('report-stats').innerHTML =
            '<div class="report-stat-item danger"><div class="stat-value">' + formatCurrency(totalPending, sym) + '</div><div class="stat-label">Total Pending</div></div>' +
            '<div class="report-stat-item"><div class="stat-value">' + reportData.length + '</div><div class="stat-label">Students with Balance</div></div>';

        document.getElementById('report-thead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Phone</th><th>Course</th><th>Total Fee</th><th>Paid</th><th>Balance</th></tr>';

        var tbody = '';
        reportData.forEach(function (s) {
            tbody += '<tr><td>' + s.student_code + '</td><td>' + s.full_name + '</td><td>' + (s.phone || '—') + '</td><td>' + (s.courses ? s.courses.course_name : '—') + '</td><td>' + formatCurrency(s.total_fee, sym) + '</td><td style="color:#27ae60;">' + formatCurrency(s.total_paid, sym) + '</td><td style="color:#e74c3c;font-weight:600;">' + formatCurrency(s.balance, sym) + '</td></tr>';
        });
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    async function generateAttendanceReport(fromDate, toDate) {
        var attendance = await dbSelect('attendance', {
            select: '*, students(student_code, full_name)',
            order: { column: 'attendance_date', ascending: false }
        });

        reportData = attendance.filter(function (a) {
            if (fromDate && a.attendance_date < fromDate) return false;
            if (toDate && a.attendance_date > toDate) return false;
            return true;
        });

        var present = reportData.filter(function (a) { return a.status === 'Present'; }).length;
        var absent = reportData.filter(function (a) { return a.status === 'Absent'; }).length;
        var leave = reportData.filter(function (a) { return a.status === 'Leave'; }).length;

        document.getElementById('report-title').textContent = 'Attendance Report';
        document.getElementById('report-stats').innerHTML =
            '<div class="report-stat-item"><div class="stat-value">' + reportData.length + '</div><div class="stat-label">Total Records</div></div>' +
            '<div class="report-stat-item success"><div class="stat-value">' + present + '</div><div class="stat-label">Present</div></div>' +
            '<div class="report-stat-item danger"><div class="stat-value">' + absent + '</div><div class="stat-label">Absent</div></div>' +
            '<div class="report-stat-item warning"><div class="stat-value">' + leave + '</div><div class="stat-label">Leave</div></div>';

        document.getElementById('report-thead').innerHTML = '<tr><th>Date</th><th>Student</th><th>Status</th></tr>';

        var tbody = '';
        reportData.forEach(function (a) {
            var statusClass = a.status === 'Present' ? 'badge-success' : (a.status === 'Absent' ? 'badge-danger' : 'badge-warning');
            tbody += '<tr><td>' + formatDate(a.attendance_date) + '</td><td>' + (a.students ? a.students.full_name : '—') + '</td><td><span class="badge ' + statusClass + '">' + a.status + '</span></td></tr>';
        });
        document.getElementById('report-tbody').innerHTML = tbody;
    }

    window.resetFilters = function () {
        var today = new Date();
        var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('from-date').value = firstDay.toISOString().split('T')[0];
        document.getElementById('to-date').value = todayISO();
        document.getElementById('filter-course').value = '';
        document.getElementById('filter-mode').value = '';
        document.getElementById('report-output').style.display = 'none';
    };

    window.exportCSV = function () {
        if (reportData.length === 0) return;
        var csv = Object.keys(reportData[0]).join(',') + '\n';
        reportData.forEach(function (row) {
            csv += Object.values(row).map(function (v) { return '"' + (v || '') + '"'; }).join(',') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'report_' + todayISO() + '.csv';
        a.click();
    };

    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
