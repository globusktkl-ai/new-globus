/**
 * Edit Student Logic
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    var student = null;
    var settings = null;
    var photoDataUrl = '';
    var courses = [];
    var modules = [];

    async function init() {
        var studentId = getParam('id');
        if (!studentId) {
            showToast('Student ID not provided', 'error');
            setTimeout(function () { window.location.href = 'students.html'; }, 1000);
            return;
        }

        showLoader('Loading...');

        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            settings = await getInstituteSettings();

            student = await dbSelect('students', {
                select: '*, courses(id, course_name)',
                eq: { id: studentId },
                single: true
            });

            if (!student) {
                showToast('Student not found', 'error');
                setTimeout(function () { window.location.href = 'students.html'; }, 1000);
                return;
            }

            document.getElementById('nav-sub').textContent = student.student_code;
            document.getElementById('back-btn').href = 'student-profile.html?id=' + student.id;

            await loadCourses();
            await loadModules(student.course_id);
            populateForm();
            setupListeners();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadCourses() {
        try {
            courses = await dbSelect('courses', { eq: { is_active: true }, order: { column: 'course_name' } });
            var select = document.getElementById('course-select');
            for (var i = 0; i < courses.length; i++) {
                var opt = document.createElement('option');
                opt.value = courses[i].id;
                opt.textContent = courses[i].course_name;
                select.appendChild(opt);
            }
        } catch (err) { }
    }

    async function loadModules(courseId) {
        var select = document.getElementById('module-select');
        select.innerHTML = '<option value="">Select Module</option>';

        if (!courseId) return;

        try {
            modules = await dbSelect('modules', {
                eq: { course_id: courseId },
                order: { column: 'module_number', ascending: true }
            });
            for (var i = 0; i < modules.length; i++) {
                var opt = document.createElement('option');
                opt.value = modules[i].id;
                opt.textContent = 'Module ' + modules[i].module_number + ': ' + modules[i].module_name;
                select.appendChild(opt);
            }
        } catch (err) { }
    }

    function populateForm() {
        document.getElementById('student-name').value = student.full_name || '';
        document.getElementById('student-phone').value = student.phone || '';
        document.getElementById('student-qualification').value = student.qualification || '';
        document.getElementById('student-address').value = student.address || '';
        document.getElementById('course-select').value = student.course_id || '';
        document.getElementById('module-select').value = student.current_module_id || '';
        document.getElementById('status-select').value = student.status || 'Active';

        /* Photo */
        if (student.photo_url) {
            photoDataUrl = student.photo_url;
            document.getElementById('photo-preview').src = student.photo_url;
            document.getElementById('photo-preview').style.display = 'block';
            document.getElementById('photo-placeholder').style.display = 'none';
        }

        /* Show finish button if active */
        if (student.status === 'Active') {
            document.getElementById('finish-btn').style.display = 'block';
        }
    }

    function setupListeners() {
        /* Photo upload */
        document.getElementById('photo-upload').addEventListener('click', function () {
            document.getElementById('photo-input').click();
        });

        document.getElementById('photo-input').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                showToast('Photo must be less than 2MB', 'warning');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                photoDataUrl = ev.target.result;
                document.getElementById('photo-preview').src = photoDataUrl;
                document.getElementById('photo-preview').style.display = 'block';
                document.getElementById('photo-placeholder').style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        /* Course change → load modules */
        document.getElementById('course-select').addEventListener('change', function () {
            loadModules(this.value);
        });

        /* Form submit */
        document.getElementById('edit-form').addEventListener('submit', handleSave);

        /* Finish button */
        document.getElementById('finish-btn').addEventListener('click', function () {
            showConfirm('Mark this student as Course Finished? They will be moved to Old Students.', function () {
                markAsFinished();
            });
        });
    }

    async function handleSave(e) {
        e.preventDefault();

        var name = document.getElementById('student-name').value.trim();
        var phone = cleanPhone(document.getElementById('student-phone').value);
        var qualification = document.getElementById('student-qualification').value.trim();
        var address = document.getElementById('student-address').value.trim();
        var courseId = document.getElementById('course-select').value || null;
        var moduleId = document.getElementById('module-select').value || null;
        var status = document.getElementById('status-select').value;

        if (!name) {
            showToast('Name is required', 'error');
            return;
        }
        if (!phone || phone.length < 10) {
            showToast('Valid phone is required', 'error');
            return;
        }

        var btn = document.getElementById('save-btn');
        btnLoading(btn, true);

        try {
            var updates = {
                full_name: titleCase(name),
                phone: phone,
                qualification: qualification,
                address: address,
                course_id: courseId,
                current_module_id: moduleId,
                photo_url: photoDataUrl || student.photo_url || '',
                status: status
            };

            /* Set dates based on status */
            if (status === 'Course Finished' && student.status !== 'Course Finished') {
                updates.finished_date = todayISO();
            }
            if (status === 'Discontinued' && student.status !== 'Discontinued') {
                updates.discontinued_date = todayISO();
            }
            if (status === 'Active') {
                updates.finished_date = null;
                updates.discontinued_date = null;
            }

            await dbUpdate('students', student.id, updates);
            showToast('Student updated!', 'success');

            setTimeout(function () {
                window.location.href = 'student-profile.html?id=' + student.id;
            }, 1000);

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            btnLoading(btn, false, 'Save Changes');
        }
    }

    async function markAsFinished() {
        showLoader('Updating...');
        try {
            await dbUpdate('students', student.id, {
                status: 'Course Finished',
                finished_date: todayISO()
            });
            showToast('Student marked as Course Finished!', 'success');
            setTimeout(function () {
                window.location.href = 'old-students.html';
            }, 1000);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
