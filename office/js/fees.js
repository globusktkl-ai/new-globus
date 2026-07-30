/**
 * Fee Collection Logic (Office)
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    var student = null;
    var settings = null;
    var payments = [];

    async function init() {
        showLoader('Loading...');

        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            settings = await getInstituteSettings();

            /* Check for direct student ID in URL */
            var studentId = getParam('id');
            if (studentId) {
                await loadStudent(studentId);
            }

            setupListeners();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function setupListeners() {
        /* Search */
        document.getElementById('search-btn').addEventListener('click', searchStudent);
        document.getElementById('search-input').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchStudent();
            }
        });

        /* Payment form */
        document.getElementById('payment-form').addEventListener('submit', handlePayment);
    }

    async function searchStudent() {
        var query = document.getElementById('search-input').value.trim();
        if (!query) {
            showToast('Enter student code, name or phone', 'warning');
            return;
        }

        showLoader('Searching...');

        try {
            var results = await dbSelect('students', {
                select: 'id, student_code, full_name, phone, status'
            });

            /* Filter results */
            var filtered = results.filter(function (s) {
                var q = query.toLowerCase();
                return (s.student_code && s.student_code.toLowerCase().includes(q)) ||
                    (s.full_name && s.full_name.toLowerCase().includes(q)) ||
                    (s.phone && s.phone.includes(query));
            });

            renderSearchResults(filtered);

        } catch (err) {
            showToast('Search failed', 'error');
        } finally {
            hideLoader();
        }
    }

    function renderSearchResults(results) {
        var container = document.getElementById('search-results');

        if (results.length === 0) {
            container.innerHTML = '<p style="color:#888;text-align:center;padding:16px;">No students found</p>';
            return;
        }

        var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
        for (var i = 0; i < results.length; i++) {
            var s = results[i];
            html += '<div onclick="selectStudent(\'' + s.id + '\')" style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f8f9fb;border-radius:10px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background=\'#eaf2fb\'" onmouseout="this.style.background=\'#f8f9fb\'">';
            html += '<div><strong style="color:#1a3a5c;">' + s.full_name + '</strong><br><span style="font-size:13px;color:#888;">' + s.student_code + ' · ' + (s.phone || '') + '</span></div>';
            html += renderStatusBadge(s.status);
            html += '</div>';
        }
        html += '</div>';

        container.innerHTML = html;
    }

    window.selectStudent = async function (id) {
        await loadStudent(id);
    };

    async function loadStudent(id) {
        showLoader('Loading student...');

        try {
            student = await dbSelect('students', {
                select: '*, courses(course_name), modules:current_module_id(module_name, module_number)',
                eq: { id: id },
                single: true
            });

            if (!student) {
                showToast('Student not found', 'error');
                return;
            }

            /* Hide search, show student card */
            document.getElementById('search-card').style.display = 'none';
            document.getElementById('student-card').style.display = 'block';

            renderStudentInfo();
            await loadPayments();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderStudentInfo() {
        var sym = (settings && settings.currency_symbol) || '₹';
        var cc = (settings && settings.country_code) || '91';

        var courseName = student.courses ? student.courses.course_name : '—';
        var moduleName = student.modules ? ('Module ' + student.modules.module_number) : '—';

        /* Student info */
        var infoHtml = renderStudentPhoto(student.photo_url, student.full_name, 50);
        infoHtml += '<div class="fee-student-details">';
        infoHtml += '<h3>' + student.full_name + '</h3>';
        infoHtml += '<p>' + student.student_code + ' · ' + courseName + ' · ' + moduleName + '</p>';
        infoHtml += '</div>';
        infoHtml += renderStatusBadge(student.status);

        document.getElementById('student-info').innerHTML = infoHtml;

        /* Fee bars */
        var barsHtml = '<div class="fee-bar total"><div class="fee-bar-amount">' + formatCurrency(student.total_fee, sym) + '</div><div class="fee-bar-label">Total</div></div>';
        barsHtml += '<div class="fee-bar paid"><div class="fee-bar-amount">' + formatCurrency(student.total_paid, sym) + '</div><div class="fee-bar-label">Paid</div></div>';
        barsHtml += '<div class="fee-bar balance"><div class="fee-bar-amount">' + formatCurrency(student.balance, sym) + '</div><div class="fee-bar-label">Balance</div></div>';

        document.getElementById('fee-bars').innerHTML = barsHtml;
    }

    async function loadPayments() {
        try {
            payments = await dbSelect('fee_payments', {
                eq: { student_id: student.id },
                order: { column: 'payment_date', ascending: false }
            });
            renderPayments();
        } catch (err) {
            document.getElementById('payment-history').innerHTML = '<p style="color:#888;">Could not load payments</p>';
        }
    }

    function renderPayments() {
        var sym = (settings && settings.currency_symbol) || '₹';
        var container = document.getElementById('payment-history');

        if (payments.length === 0) {
            container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">No payments yet</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < payments.length; i++) {
            var p = payments[i];
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:#f8f9fb;border-radius:10px;margin-bottom:8px;">';
            html += '<div>';
            html += '<div style="font-weight:600;color:#1a3a5c;">' + p.receipt_number + '</div>';
            html += '<div style="font-size:13px;color:#888;">' + formatDate(p.payment_date) + ' · ' + p.payment_mode + '</div>';
            html += '</div>';
            html += '<div style="display:flex;align-items:center;gap:12px;">';
            html += '<span style="font-size:18px;font-weight:700;color:#27ae60;">' + formatCurrency(p.amount, sym) + '</span>';
            html += '<button onclick="printReceipt(\'' + p.id + '\')" style="background:#eaf2fb;border:none;padding:8px;border-radius:6px;cursor:pointer;" title="Print">🖨</button>';
            html += '</div></div>';
        }

        container.innerHTML = html;
    }

    async function handlePayment(e) {
        e.preventDefault();

        var amount = parseFloat(document.getElementById('payment-amount').value);
        var mode = document.getElementById('payment-mode').value;
        var remarks = document.getElementById('payment-remarks').value.trim();

        if (!amount || amount <= 0) {
            showToast('Enter valid amount', 'error');
            return;
        }

        if (amount > student.balance) {
            showConfirm('Amount exceeds balance (' + formatCurrency(student.balance, settings.currency_symbol) + '). Continue anyway?', function () {
                savePayment(amount, mode, remarks);
            });
            return;
        }

        await savePayment(amount, mode, remarks);
    }

    async function savePayment(amount, mode, remarks) {
        var btn = document.getElementById('submit-payment');
        btnLoading(btn, true);

        try {
            /* Generate receipt number */
            var receiptNo = await dbRpc('generate_receipt_number');

            /* Insert payment */
            var payment = await dbInsert('fee_payments', {
                receipt_number: receiptNo,
                student_id: student.id,
                amount: amount,
                payment_mode: mode,
                payment_date: todayISO(),
                remarks: remarks
            });

            /* Update student balance */
            var newPaid = (parseFloat(student.total_paid) || 0) + amount;
            var newBalance = (parseFloat(student.total_fee) || 0) - newPaid;

            await dbUpdate('students', student.id, {
                total_paid: newPaid,
                balance: newBalance
            });

            student.total_paid = newPaid;
            student.balance = newBalance;

            showToast('Payment saved! Receipt: ' + receiptNo, 'success');

            /* Reset form */
            document.getElementById('payment-amount').value = '';
            document.getElementById('payment-remarks').value = '';

            /* Refresh */
            renderStudentInfo();
            await loadPayments();

            /* Show receipt */
            showReceipt(payment);

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            btnLoading(btn, false, 'Save Payment');
        }
    }

    function showReceipt(payment) {
        var sym = (settings && settings.currency_symbol) || '₹';
        var instName = (settings && settings.institute_name) || 'Institute';

        var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;" onclick="closeReceipt(event)">';
        html += '<div class="receipt-preview" onclick="event.stopPropagation()" style="max-width:400px;width:100%;">';
        html += '<h3>' + instName + '</h3>';
        html += '<div class="receipt-number">Receipt: ' + payment.receipt_number + '</div>';
        html += '<div class="receipt-details">';
        html += '<div class="receipt-row"><span class="r-label">Student</span><span class="r-value">' + student.full_name + '</span></div>';
        html += '<div class="receipt-row"><span class="r-label">Code</span><span class="r-value">' + student.student_code + '</span></div>';
        html += '<div class="receipt-row"><span class="r-label">Date</span><span class="r-value">' + formatDate(payment.payment_date) + '</span></div>';
        html += '<div class="receipt-row"><span class="r-label">Mode</span><span class="r-value">' + payment.payment_mode + '</span></div>';
        html += '</div>';
        html += '<div class="receipt-amount">' + formatCurrency(payment.amount, sym) + '</div>';
        html += '<p style="font-size:13px;color:#888;">Thank you for your payment</p>';
        html += '<div style="margin-top:16px;display:flex;gap:10px;justify-content:center;">';
        html += '<button onclick="window.print()" class="btn btn-primary btn-sm">Print</button>';
        html += '<button onclick="closeReceipt()" class="btn btn-secondary btn-sm">Close</button>';
        html += '</div></div></div>';

        document.getElementById('receipt-modal').innerHTML = html;
    }

    window.closeReceipt = function (e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('receipt-modal').innerHTML = '';
    };

    window.printReceipt = async function (paymentId) {
        var payment = payments.find(function (p) { return p.id === paymentId; });
        if (payment) {
            showReceipt(payment);
            setTimeout(function () { window.print(); }, 300);
        }
    };

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
