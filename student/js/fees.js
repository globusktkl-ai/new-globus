/**
 * Student Fees Logic
 * Globus Technical Academy ERP v1.00 — Part 2
 */

(function () {
    'use strict';

    var STUDENT_SESSION_KEY = 'erp_student_session';
    var student = null;
    var settings = null;
    var payments = [];

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

        showLoader('Loading fee details...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();

            student = await dbSelect('students', {
                eq: { id: session.id },
                single: true
            });

            if (!student) {
                window.location.replace('login.html');
                return;
            }

            renderOverview();
            await loadPayments();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderOverview() {
        var sym = (settings && settings.currency_symbol) || '₹';
        document.getElementById('total-fee').textContent = formatCurrency(student.total_fee, sym);
        document.getElementById('total-paid').textContent = formatCurrency(student.total_paid, sym);
        document.getElementById('balance').textContent = formatCurrency(student.balance, sym);
    }

    async function loadPayments() {
        try {
            payments = await dbSelect('fee_payments', {
                eq: { student_id: student.id },
                order: { column: 'payment_date', ascending: false }
            });

            renderPayments();
        } catch (err) {
            document.getElementById('payment-list').innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Could not load payments</p></div>';
        }
    }

    function renderPayments() {
        var sym = (settings && settings.currency_symbol) || '₹';
        var container = document.getElementById('payment-list');

        if (payments.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No payments recorded yet</p></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < payments.length; i++) {
            var p = payments[i];
            html += '<div class="payment-item">' +
                '<div class="payment-left">' +
                '<div class="payment-receipt">' + p.receipt_number + '</div>' +
                '<div class="payment-meta">' + formatDate(p.payment_date) + ' · ' + p.payment_mode + '</div>' +
                (p.remarks ? '<div class="payment-meta" style="color:#666;">' + p.remarks + '</div>' : '') +
                '<div class="payment-actions">' +
                '<a href="#" class="payment-action-btn" onclick="viewReceipt(\'' + p.id + '\');return false;">View Receipt</a>' +
                '<a href="#" class="payment-action-btn" onclick="printReceipt(\'' + p.id + '\');return false;">🖨 Print</a>' +
                '</div></div>' +
                '<div class="payment-amount">' + formatCurrency(p.amount, sym) + '</div>' +
                '</div>';
        }

        container.innerHTML = html;
    }

    /* View Receipt */
    window.viewReceipt = function (paymentId) {
        var payment = payments.find(function (p) { return p.id === paymentId; });
        if (!payment) return;

        var sym = (settings && settings.currency_symbol) || '₹';
        var instName = (settings && settings.institute_name) || 'Institute';

        var modalHTML = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;" onclick="closeReceiptModal(event)">' +
            '<div class="receipt-modal" onclick="event.stopPropagation()">' +
            '<div class="receipt-header">' +
            '<div class="institute-name">' + instName + '</div>' +
            '<div class="receipt-title">Fee Receipt</div>' +
            '<div class="receipt-number">' + payment.receipt_number + '</div>' +
            '</div>' +
            '<div class="receipt-body">' +
            '<div class="receipt-row"><span class="r-label">Student</span><span class="r-value">' + student.full_name + '</span></div>' +
            '<div class="receipt-row"><span class="r-label">Code</span><span class="r-value">' + student.student_code + '</span></div>' +
            '<div class="receipt-row"><span class="r-label">Date</span><span class="r-value">' + formatDate(payment.payment_date) + '</span></div>' +
            '<div class="receipt-row"><span class="r-label">Payment Mode</span><span class="r-value">' + payment.payment_mode + '</span></div>' +
            (payment.remarks ? '<div class="receipt-row"><span class="r-label">Remarks</span><span class="r-value">' + payment.remarks + '</span></div>' : '') +
            '</div>' +
            '<div class="receipt-amount-box">' +
            '<div class="amount-label">Amount Paid</div>' +
            '<div class="amount-value">' + formatCurrency(payment.amount, sym) + '</div>' +
            '</div>' +
            '<div class="receipt-footer">' +
            '<p>Thank you for your payment</p>' +
            '</div>' +
            '<div style="text-align:center;margin-top:16px;">' +
            '<button onclick="closeReceiptModal()" class="btn btn-secondary btn-sm">Close</button>' +
            '</div></div></div>';

        document.getElementById('receipt-modal-container').innerHTML = modalHTML;
    };

    window.closeReceiptModal = function (e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('receipt-modal-container').innerHTML = '';
    };

    window.printReceipt = function (paymentId) {
        viewReceipt(paymentId);
        setTimeout(function () {
            window.print();
        }, 300);
    };

    /* Dark mode */
    if (localStorage.getItem('erp_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
