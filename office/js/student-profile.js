/**
 * Student Profile View (Office)
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    var student = null;
    var settings = null;
    var payments = [];

    async function init() {
        var studentId = getParam('id');
        if (!studentId) {
            showToast('Student ID not provided', 'error');
            setTimeout(function () { window.location.href = 'students.html'; }, 1000);
            return;
        }

        showLoader('Loading profile...');

        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            settings = await getInstituteSettings();

            student = await dbSelect('students', {
                select: '*, courses(course_name, course_code), modules:current_module_id(module_name, module_number)',
                eq: { id: studentId },
                single: true
            });

            if (!student) {
                showToast('Student not found', 'error');
                setTimeout(function () { window.location.href = 'students.html'; }, 1000);
                return;
            }

            document.getElementById('nav-sub').textContent = student.student_code;
            renderHeader();
            renderPersonal();
            renderCourse();
            renderFee();
            await loadPayments();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderHeader() {
        var cc = (settings && settings.country_code) || '91';

        var html = '<div class="profile-photo">' + renderStudentPhoto(student.photo_url, student.full_name, 90) + '</div>';
        html += '<div class="profile-name">' + student.full_name + '</div>';
        html += '<div class="profile-code">' + student.student_code + '</div>';
        html += '<div style="margin-bottom:16px;">' + renderStatusBadge(student.status) + '</div>';
        html += '<div class="profile-actions">';
        html += '<a href="edit-student.html?id=' + student.id + '" class="btn btn-primary btn-sm">✏️ Edit</a>';
        html += '<a href="fees.html?id=' + student.id + '" class="btn btn-success btn-sm">💰 Collect Fee</a>';
        html += '<button class="btn btn-secondary btn-sm" onclick="window.print()">🖨 Print</button>';
        html += '</div>';

        /* Phone actions */
        if (student.phone) {
            html += '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">';
            html += '<a href="' + phoneCallLink(student.phone, cc) + '" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#27ae60;color:#fff;font-size:18px;text-decoration:none;" title="Call">📞</a>';
            html += '<a href="' + phoneWhatsAppLink(student.phone, cc) + '" target="_blank" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#25d366;color:#fff;font-size:18px;text-decoration:none;" title="WhatsApp">💬</a>';
            html += '<a href="' + phoneSMSLink(student.phone, cc) + '" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#4a90d9;color:#fff;font-size:18px;text-decoration:none;" title="SMS">✉</a>';
            html += '</div>';
        }

        document.getElementById('profile-header').innerHTML = html;
    }

    function renderPersonal() {
        var html = '<h2>Personal Details</h2><div class="profile-info-grid">';
        html += renderInfoRow('Phone', student.phone || '—');
        html += renderInfoRow('Qualification', student.qualification || '—');
        html += renderInfoRow('Address', student.address || '—');
        html += '</div>';
        document.getElementById('personal-section').innerHTML = html;
    }

    function renderCourse() {
        var courseName = student.courses ? student.courses.course_name : '—';
        var moduleName = student.modules ? ('Module ' + student.modules.module_number + ': ' + student.modules.module_name) : '—';

        var html = '<h2>Course Details</h2><div class="profile-info-grid">';
        html += renderInfoRow('Course', courseName);
        html += renderInfoRow('Current Module', moduleName);
        html += renderInfoRow('Admission Date', formatDate(student.admission_date));
        html += renderInfoRow('Status', student.status);
        if (student.finished_date) html += renderInfoRow('Completion Date', formatDate(student.finished_date));
        if (student.discontinued_date) html += renderInfoRow('Discontinued Date', formatDate(student.discontinued_date));
        html += '</div>';
        document.getElementById('course-section').innerHTML = html;
    }

    function renderFee() {
        var sym = (settings && settings.currency_symbol) || '₹';

        var html = '<h2>Fee Summary</h2>';
        html += '<div class="fee-summary-card">';
        html += '<div class="fee-summary-item"><div class="amount">' + formatCurrency(student.total_fee, sym) + '</div><div class="label">Total Fee</div></div>';
        html += '<div class="fee-summary-item paid"><div class="amount">' + formatCurrency(student.total_paid, sym) + '</div><div class="label">Paid</div></div>';
        html += '<div class="fee-summary-item balance"><div class="amount">' + formatCurrency(student.balance, sym) + '</div><div class="label">Balance</div></div>';
        html += '</div>';

        document.getElementById('fee-section').innerHTML = html;
    }

    async function loadPayments() {
        try {
            payments = await dbSelect('fee_payments', {
                eq: { student_id: student.id },
                order: { column: 'payment_date', ascending: false }
            });

            renderPayments();
        } catch (err) {
            document.getElementById('payments-section').innerHTML = '<h2>Payment History</h2><p style="color:#888;">Could not load payments</p>';
        }
    }

    function renderPayments() {
        var sym = (settings && settings.currency_symbol) || '₹';

        var html = '<h2>Payment History</h2>';

        if (payments.length === 0) {
            html += '<p style="color:#888;font-size:14px;">No payments recorded yet</p>';
        } else {
            html += '<div class="payment-history">';
            for (var i = 0; i < payments.length; i++) {
                var p = payments[i];
                html += '<div class="payment-item">';
                html += '<div class="payment-left">';
                html += '<div class="payment-receipt">' + p.receipt_number + '</div>';
                html += '<div class="payment-date">' + formatDate(p.payment_date) + '</div>';
                html += '<div class="payment-mode">' + p.payment_mode + (p.remarks ? ' · ' + p.remarks : '') + '</div>';
                html += '</div>';
                html += '<div class="payment-amount">' + formatCurrency(p.amount, sym) + '</div>';
                html += '</div>';
            }
            html += '</div>';
        }

        document.getElementById('payments-section').innerHTML = html;
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
