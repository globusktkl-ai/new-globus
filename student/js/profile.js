/**
 * Student Profile Logic
 * Globus Technical Academy ERP v1.00 — Part 2
 */

(function () {
    'use strict';

    var STUDENT_SESSION_KEY = 'erp_student_session';
    var student = null;
    var settings = null;
    var allModules = [];

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

        showLoader('Loading profile...');

        try {
            await waitForSupabase();
            settings = await getInstituteSettings();

            student = await dbSelect('students', {
                select: '*, courses(course_name, course_code, id), modules:current_module_id(module_name, module_number, id)',
                eq: { id: session.id },
                single: true
            });

            if (!student) {
                window.location.replace('login.html');
                return;
            }

            /* Show completion banner if finished */
            if (student.status === 'Course Finished') {
                document.getElementById('completion-banner').style.display = 'block';
            }

            renderHeader();
            renderPersonalInfo();
            renderCourseInfo();
            await renderModuleProgress();
            renderFeeInfo();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderHeader() {
        var photoEl = document.getElementById('profile-photo');
        if (student.photo_url) {
            photoEl.innerHTML = '<img src="' + student.photo_url + '" alt="Photo">';
        } else {
            var initials = student.full_name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            photoEl.textContent = initials;
        }

        document.getElementById('profile-name').textContent = student.full_name;
        document.getElementById('profile-code').textContent = student.student_code;

        var statusBadge = '<span class="status-badge ';
        if (student.status === 'Active') statusBadge += 'active';
        else if (student.status === 'Course Finished') statusBadge += 'finished';
        else statusBadge += 'discontinued';
        statusBadge += '">' + student.status + '</span>';
        document.getElementById('profile-status').innerHTML = statusBadge;
    }

    function renderPersonalInfo() {
        var cc = (settings && settings.country_code) || '91';

        var html = '';
        html += '<div class="info-row"><span class="info-label">Phone</span><span class="info-value">' + (student.phone || '—') + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Qualification</span><span class="info-value">' + (student.qualification || '—') + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Address</span><span class="info-value">' + (student.address || '—') + '</span></div>';

        document.getElementById('personal-info').innerHTML = html;

        /* Phone actions */
        if (student.phone) {
            var phoneHtml = '';
            phoneHtml += '<a href="' + phoneCallLink(student.phone, cc) + '" class="contact-btn call"><span>📞</span>Call</a>';
            phoneHtml += '<a href="' + phoneWhatsAppLink(student.phone, cc) + '" target="_blank" class="contact-btn whatsapp"><span>💬</span>WhatsApp</a>';
            phoneHtml += '<a href="' + phoneSMSLink(student.phone, cc) + '" class="contact-btn sms"><span>✉️</span>SMS</a>';
            document.getElementById('phone-actions').innerHTML = phoneHtml;
        }
    }

    function renderCourseInfo() {
        var courseName = student.courses ? student.courses.course_name : '—';
        var currentModule = student.modules ? ('Module ' + student.modules.module_number + ': ' + student.modules.module_name) : '—';

        var html = '';
        html += '<div class="info-row"><span class="info-label">Course</span><span class="info-value">' + courseName + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Admission Date</span><span class="info-value">' + formatDate(student.admission_date) + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Current Module</span><span class="info-value">' + currentModule + '</span></div>';

        document.getElementById('course-info').innerHTML = html;
    }

    async function renderModuleProgress() {
        if (!student.courses || !student.courses.id) {
            document.getElementById('module-timeline').innerHTML = '<p style="color:#888;font-size:14px;">No course assigned</p>';
            return;
        }

        try {
            allModules = await dbSelect('modules', {
                eq: { course_id: student.courses.id },
                order: { column: 'module_number', ascending: true }
            });

            if (allModules.length === 0) {
                document.getElementById('module-timeline').innerHTML = '<p style="color:#888;font-size:14px;">No modules defined</p>';
                return;
            }

            var currentModuleNum = student.modules ? student.modules.module_number : 1;
            var html = '';

            for (var i = 0; i < allModules.length; i++) {
                var mod = allModules[i];
                var statusClass = '';
                var statusText = '';

                if (mod.module_number < currentModuleNum || student.status === 'Course Finished') {
                    statusClass = 'completed';
                    statusText = '✓ Completed';
                } else if (mod.module_number === currentModuleNum && student.status !== 'Course Finished') {
                    statusClass = 'current';
                    statusText = '● In Progress';
                } else {
                    statusClass = 'pending';
                    statusText = '○ Pending';
                }

                html += '<div class="module-item ' + statusClass + '">' +
                    '<div class="module-content">' +
                    '<div class="module-number">Module ' + mod.module_number + '</div>' +
                    '<div class="module-name">' + mod.module_name + '</div>' +
                    '<div class="module-status ' + statusClass + '">' + statusText + '</div>' +
                    '</div></div>';
            }

            document.getElementById('module-timeline').innerHTML = html;

        } catch (err) {
            document.getElementById('module-timeline').innerHTML = '<p style="color:#888;font-size:14px;">Could not load modules</p>';
        }
    }

    function renderFeeInfo() {
        var sym = (settings && settings.currency_symbol) || '₹';

        var html = '';
        html += '<div class="info-row"><span class="info-label">Total Fee</span><span class="info-value">' + formatCurrency(student.total_fee, sym) + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Total Paid</span><span class="info-value" style="color:#27ae60;">' + formatCurrency(student.total_paid, sym) + '</span></div>';
        html += '<div class="info-row"><span class="info-label">Balance</span><span class="info-value" style="color:' + (student.balance > 0 ? '#e74c3c' : '#27ae60') + ';font-weight:700;">' + formatCurrency(student.balance, sym) + '</span></div>';

        document.getElementById('fee-info').innerHTML = html;
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
