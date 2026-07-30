/**
 * New Admission Logic
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    var settings = null;
    var photoDataUrl = '';

    /* ── Init ── */
    async function init() {
        showLoader('Loading...');
        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            settings = await getInstituteSettings();
            document.getElementById('nav-title').textContent = 'New Admission';

            /* Set today's date */
            document.getElementById('admission-date').value = todayISO();

            /* Generate student code */
            await generateCode();

            /* Load courses */
            await loadCourses();

            /* Setup listeners */
            setupListeners();

        } catch (err) {
            showToast('Init error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    /* ── Generate Student Code ── */
    async function generateCode() {
        try {
            var code = await dbRpc('generate_student_code');
            document.getElementById('student-code').value = code;
        } catch (err) {
            /* Fallback: timestamp-based */
            document.getElementById('student-code').value = 'GTA' + Date.now().toString().slice(-4);
        }
    }

    /* ── Load Courses ── */
    async function loadCourses() {
        try {
            var courses = await dbSelect('courses', { eq: { is_active: true }, order: { column: 'course_name' } });
            var select = document.getElementById('course-select');
            for (var i = 0; i < courses.length; i++) {
                var opt = document.createElement('option');
                opt.value = courses[i].id;
                opt.textContent = courses[i].course_name;
                opt.dataset.fee = courses[i].total_fee || 0;
                select.appendChild(opt);
            }
        } catch (err) {
            showToast('Could not load courses.', 'warning');
        }
    }

    /* ── Setup Listeners ── */
    function setupListeners() {
        /* Photo upload */
        var photoUpload = document.getElementById('photo-upload');
        var photoInput = document.getElementById('photo-input');

        photoUpload.addEventListener('click', function () {
            photoInput.click();
        });

        photoInput.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                showToast('Photo must be less than 2MB.', 'warning');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                photoDataUrl = ev.target.result;
                var preview = document.getElementById('photo-preview');
                preview.src = photoDataUrl;
                preview.style.display = 'block';
                document.getElementById('photo-placeholder').style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        /* Course change → auto fee */
        document.getElementById('course-select').addEventListener('change', function () {
            var opt = this.options[this.selectedIndex];
            if (opt && opt.dataset.fee) {
                document.getElementById('total-fee').value = opt.dataset.fee;
                updateFeeSummary();
            }
        });

        /* Fee calculation */
        document.getElementById('total-fee').addEventListener('input', updateFeeSummary);
        document.getElementById('admission-fee').addEventListener('input', updateFeeSummary);

        /* Phone duplicate check (debounced) */
        document.getElementById('student-phone').addEventListener('input', debounce(checkDuplicatePhone, 500));

        /* Form submit */
        document.getElementById('admission-form').addEventListener('submit', handleSubmit);
    }

    /* ── Update Fee Summary ── */
    function updateFeeSummary() {
        var sym = (settings && settings.currency_symbol) || '₹';
        var total = parseFloat(document.getElementById('total-fee').value) || 0;
        var paid = parseFloat(document.getElementById('admission-fee').value) || 0;
        var balance = total - paid;

        document.getElementById('summary-total').textContent = formatCurrency(total, sym);
        document.getElementById('summary-paid').textContent = formatCurrency(paid, sym);
        document.getElementById('summary-balance').textContent = formatCurrency(balance, sym);
    }

    /* ── Check Duplicate Phone ── */
    async function checkDuplicatePhone() {
        var phone = cleanPhone(document.getElementById('student-phone').value);
        var errEl = document.getElementById('phone-error');
        errEl.style.display = 'none';

        if (phone.length < 10) return;

        try {
            var existing = await dbSelect('students', { eq: { phone: phone } });
            if (existing && existing.length > 0) {
                errEl.textContent = 'This phone number is already registered to ' + existing[0].full_name + ' (' + existing[0].student_code + ')';
                errEl.style.display = 'block';
            }
        } catch (e) {
            /* Ignore */
        }
    }

    /* ── Handle Submit ── */
    async function handleSubmit(e) {
        e.preventDefault();

        var name = document.getElementById('student-name').value.trim();
        var phone = cleanPhone(document.getElementById('student-phone').value);
        var courseId = document.getElementById('course-select').value;
        var qualification = document.getElementById('student-qualification').value.trim();
        var address = document.getElementById('student-address').value.trim();
        var admDate = document.getElementById('admission-date').value;
        var code = document.getElementById('student-code').value;
        var totalFee = parseFloat(document.getElementById('total-fee').value) || 0;
        var admFee = parseFloat(document.getElementById('admission-fee').value) || 0;
        var payMode = document.getElementById('payment-mode').value;

        /* Validate */
        if (!name) { showToast('Student name is required.', 'error'); return; }
        if (!phone || phone.length < 10) { showToast('Enter a valid 10-digit phone number.', 'error'); return; }
        if (!courseId) { showToast('Please select a course.', 'error'); return; }
        if (!admDate) { showToast('Admission date is required.', 'error'); return; }
        if (totalFee <= 0) { showToast('Total fee must be greater than 0.', 'error'); return; }
        if (admFee < 0) { showToast('Admission fee cannot be negative.', 'error'); return; }
        if (admFee > totalFee) { showToast('Admission fee cannot exceed total fee.', 'error'); return; }

        /* Check duplicate */
        var phoneErr = document.getElementById('phone-error');
        if (phoneErr.style.display !== 'none') {
            showToast('Duplicate phone number detected.', 'error');
            return;
        }

        var btn = document.getElementById('submit-btn');
        btnLoading(btn, true);

        try {
            var balance = totalFee - admFee;

            /* Get first module (if available) */
            var firstModule = null;
            try {
                var mods = await dbSelect('modules', {
                    eq: { course_id: courseId },
                    order: { column: 'module_number', ascending: true },
                    limit: 1
                });
                if (mods && mods.length > 0) firstModule = mods[0].id;
            } catch (e) { /* No modules yet */ }

            /* Insert student */
            var student = await dbInsert('students', {
                student_code: code,
                full_name: titleCase(name),
                phone: phone,
                qualification: qualification,
                address: address,
                photo_url: photoDataUrl || '',
                course_id: courseId,
                current_module_id: firstModule,
                admission_date: admDate,
                total_fee: totalFee,
                total_paid: admFee,
                balance: balance,
                status: 'Active'
            });

            /* Insert admission fee payment */
            if (admFee > 0) {
                var receiptNo = await dbRpc('generate_receipt_number');
                await dbInsert('fee_payments', {
                    receipt_number: receiptNo,
                    student_id: student.id,
                    amount: admFee,
                    payment_mode: payMode,
                    payment_date: admDate,
                    is_admission_fee: true,
                    remarks: 'Admission fee'
                });
            }

            showToast('Admission saved successfully! Code: ' + code, 'success');

            /* Reset form */
            resetForm();

            /* Generate new code */
            await generateCode();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            btnLoading(btn, false, 'Save Admission');
        }
    }

    /* ── Reset Form ── */
    function resetForm() {
        document.getElementById('admission-form').reset();
        document.getElementById('admission-date').value = todayISO();
        document.getElementById('photo-preview').style.display = 'none';
        document.getElementById('photo-placeholder').style.display = 'block';
        document.getElementById('phone-error').style.display = 'none';
        photoDataUrl = '';
        updateFeeSummary();
    }

    /* ── Boot ── */
    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
