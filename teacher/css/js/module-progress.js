/**
 * Module Progress Management
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';
    var teacher = null;
    var students = [];
    var selectedStudent = null;
    var modules = [];
    var notes = [];

    function getTeacherSession() {
        var s = localStorage.getItem(TEACHER_SESSION_KEY);
        if (!s) s = sessionStorage.getItem(TEACHER_SESSION_KEY);
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    async function init() {
        var session = getTeacherSession();
        if (!session || !session.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading...');

        try {
            await waitForSupabase();
            teacher = { id: session.id };

            await loadStudents();

            /* Check for specific student in URL */
            var studentParam = getParam('student');
            if (studentParam) {
                document.getElementById('student-select').value = studentParam;
                await loadStudentProgress(studentParam);
            }

            setupListeners();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadStudents() {
        try {
            var assignments = await dbSelect('teacher_assignments', {
                select: 'student_id',
                eq: { teacher_id: teacher.id, is_active: true }
            });

            if (assignments.length === 0) return;

            var studentIds = assignments.map(function (a) { return a.student_id; });

            students = await dbSelect('students', {
                select: 'id, student_code, full_name',
                inFilter: { id: studentIds },
                order: { column: 'full_name', ascending: true }
            });

            /* Populate dropdown */
            var select = document.getElementById('student-select');
            students.forEach(function (s) {
                var opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.full_name + ' (' + s.student_code + ')';
                select.appendChild(opt);
            });

        } catch (err) { }
    }

    async function loadStudentProgress(studentId) {
        showLoader('Loading progress...');

        try {
            selectedStudent = await dbSelect('students', {
                select: '*, courses(id, course_name), modules:current_module_id(id, module_name, module_number)',
                eq: { id: studentId },
                single: true
            });

            if (!selectedStudent) {
                hideLoader();
                return;
            }

            /* Load modules for course */
            if (selectedStudent.courses) {
                modules = await dbSelect('modules', {
                    eq: { course_id: selectedStudent.courses.id },
                    order: { column: 'module_number', ascending: true }
                });
            }

            /* Load notes */
            notes = await dbSelect('student_notes', {
                eq: { student_id: studentId },
                order: { column: 'created_at', ascending: false }
            });

            renderStudentCard();
            renderTimeline();
            renderNotes();

            document.getElementById('student-card').style.display = 'block';
            document.getElementById('notes-section').style.display = 'block';

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    function renderStudentCard() {
        var photoEl = document.getElementById('student-photo');
        if (selectedStudent.photo_url) {
            photoEl.innerHTML = '<img src="' + selectedStudent.photo_url + '" alt="">';
        } else {
            var initials = selectedStudent.full_name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            photoEl.textContent = initials;
        }

        document.getElementById('student-name').textContent = selectedStudent.full_name;
        document.getElementById('student-details').textContent = selectedStudent.student_code + ' · ' + (selectedStudent.courses ? selectedStudent.courses.course_name : 'No course');
    }

    function renderTimeline() {
        var container = document.getElementById('module-timeline');
        var currentModuleNum = selectedStudent.modules ? selectedStudent.modules.module_number : 1;

        if (modules.length === 0) {
            container.innerHTML = '<p style="color:#888;font-size:14px;">No modules defined for this course</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < modules.length; i++) {
            var mod = modules[i];
            var statusClass = '';
            var btnHtml = '';

            if (mod.module_number < currentModuleNum) {
                statusClass = 'completed';
                btnHtml = '<span class="module-btn completed">✓ Completed</span>';
            } else if (mod.module_number === currentModuleNum) {
                statusClass = 'current';
                if (i < modules.length - 1) {
                    btnHtml = '<button class="module-btn set-current" onclick="advanceModule(\'' + modules[i + 1].id + '\', ' + modules[i + 1].module_number + ')">→ Next Module</button>';
                } else {
                    btnHtml = '<button class="module-btn set-current" style="background:#27ae60;" onclick="completeAllModules()">✓ Complete Course</button>';
                }
            } else {
                statusClass = 'pending';
                btnHtml = '<button class="module-btn" style="background:#f5f7fa;color:#888;" onclick="setCurrentModule(\'' + mod.id + '\', ' + mod.module_number + ')">Set as Current</button>';
            }

            html += '<div class="module-item ' + statusClass + '">';
            html += '<div class="module-content">';
            html += '<div class="module-info">';
            html += '<div class="module-num">MODULE ' + mod.module_number + '</div>';
            html += '<div class="module-name">' + mod.module_name + '</div>';
            html += '</div>';
            html += btnHtml;
            html += '</div></div>';
        }

        container.innerHTML = html;
    }

    window.setCurrentModule = async function (moduleId, moduleNum) {
        showLoader('Updating...');
        try {
            /* Save history */
            await dbInsert('module_history', {
                student_id: selectedStudent.id,
                module_id: moduleId,
                previous_module_id: selectedStudent.current_module_id,
                changed_by: teacher.id,
                change_type: 'progress'
            });

            /* Update student */
            await dbUpdate('students', selectedStudent.id, {
                current_module_id: moduleId
            });

            showToast('Module updated to Module ' + moduleNum, 'success');
            await loadStudentProgress(selectedStudent.id);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    window.advanceModule = function (moduleId, moduleNum) {
        setCurrentModule(moduleId, moduleNum);
    };

    window.completeAllModules = async function () {
        showConfirm('Mark all modules as completed? The office will be notified.', async function () {
            showLoader('Completing...');
            try {
                /* Save history */
                await dbInsert('module_history', {
                    student_id: selectedStudent.id,
                    module_id: selectedStudent.current_module_id,
                    changed_by: teacher.id,
                    change_type: 'completed',
                    remarks: 'All modules completed'
                });

                /* Create notification for office */
                await dbInsert('notifications', {
                    title: 'Module Completion',
                    message: selectedStudent.full_name + ' (' + selectedStudent.student_code + ') has completed all modules.',
                    type: 'success',
                    target_role: 'office'
                });

                showToast('Course completion notification sent to office!', 'success');
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            } finally {
                hideLoader();
            }
        });
    };

    function renderNotes() {
        var container = document.getElementById('notes-list');

        if (notes.length === 0) {
            container.innerHTML = '<p style="color:#888;font-size:14px;">No notes yet</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < notes.length; i++) {
            var n = notes[i];
            var text = '';
            if (n.academic_progress) text += '<strong>Academic:</strong> ' + n.academic_progress + '<br>';
            if (n.practical_skills) text += '<strong>Practical:</strong> ' + n.practical_skills + '<br>';
            if (n.behaviour) text += '<strong>Behaviour:</strong> ' + n.behaviour + '<br>';
            if (n.attendance_remarks) text += '<strong>Attendance:</strong> ' + n.attendance_remarks + '<br>';
            if (n.followup_notes) text += '<strong>Follow-up:</strong> ' + n.followup_notes;

            html += '<div class="note-item">';
            html += '<div class="note-date">' + formatDate(n.note_date) + '</div>';
            html += '<div class="note-text">' + text + '</div>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    function setupListeners() {
        document.getElementById('student-select').addEventListener('change', function () {
            if (this.value) {
                loadStudentProgress(this.value);
            } else {
                document.getElementById('student-card').style.display = 'none';
                document.getElementById('notes-section').style.display = 'none';
            }
        });

        document.getElementById('note-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            var text = document.getElementById('note-text').value.trim();
            if (!text || !selectedStudent) return;

            try {
                await dbInsert('student_notes', {
                    student_id: selectedStudent.id,
                    teacher_id: teacher.id,
                    followup_notes: text,
                    note_date: todayISO()
                });

                showToast('Note saved!', 'success');
                document.getElementById('note-text').value = '';
                
                notes = await dbSelect('student_notes', {
                    eq: { student_id: selectedStudent.id },
                    order: { column: 'created_at', ascending: false }
                });
                renderNotes();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        });
    }

    /* Dark mode */
    if (localStorage.getItem('erp_teacher_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
