/**
 * Modules Management
 * Globus Technical Academy ERP v1.00
 */

(function () {
    'use strict';

    var courses = [];
    var modules = [];
    var selectedCourse = null;

    async function init() {
        showLoader('Loading...');

        try {
            var session = await requireAuth('login.html');
            if (!session) return;

            await loadCourses();
            setupListeners();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadCourses() {
        try {
            courses = await dbSelect('courses', {
                eq: { is_active: true },
                order: { column: 'course_name', ascending: true }
            });

            var select = document.getElementById('course-select');
            courses.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.course_name;
                select.appendChild(opt);
            });
        } catch (err) {
            showToast('Could not load courses', 'error');
        }
    }

    async function loadModules(courseId) {
        try {
            modules = await dbSelect('modules', {
                eq: { course_id: courseId },
                order: { column: 'module_number', ascending: true }
            });
            renderModules();
        } catch (err) {
            modules = [];
            renderModules();
        }
    }

    function renderModules() {
        var container = document.getElementById('modules-list');

        if (modules.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><p>No modules defined for this course yet.</p></div>';
            return;
        }

        var html = '';
        modules.forEach(function (m) {
            html += '<div class="module-card">';
            html += '<div class="module-num">' + m.module_number + '</div>';
            html += '<div class="module-info">';
            html += '<h3>' + m.module_name + '</h3>';
            html += '<p>' + (m.description || 'No description') + '</p>';
            html += '</div>';
            html += '<div class="module-actions">';
            html += '<button class="btn btn-sm btn-secondary" onclick="editModule(\'' + m.id + '\')">Edit</button>';
            html += '<button class="btn btn-sm btn-danger" onclick="deleteModule(\'' + m.id + '\')">Delete</button>';
            html += '</div></div>';
        });

        container.innerHTML = html;
    }

    function setupListeners() {
        document.getElementById('course-select').addEventListener('change', function () {
            selectedCourse = this.value;
            if (selectedCourse) {
                document.getElementById('add-form').style.display = 'block';
                loadModules(selectedCourse);
            } else {
                document.getElementById('add-form').style.display = 'none';
                document.getElementById('modules-list').innerHTML = '';
            }
        });

        document.getElementById('module-form').addEventListener('submit', async function (e) {
            e.preventDefault();

            var moduleNum = parseInt(document.getElementById('module-number').value);
            var moduleName = document.getElementById('module-name').value.trim();
            var moduleDesc = document.getElementById('module-desc').value.trim();

            if (!moduleNum || !moduleName) {
                showToast('Module number and name are required', 'warning');
                return;
            }

            try {
                await dbInsert('modules', {
                    course_id: selectedCourse,
                    module_number: moduleNum,
                    module_name: moduleName,
                    description: moduleDesc
                });

                showToast('Module added!', 'success');
                document.getElementById('module-form').reset();
                await loadModules(selectedCourse);
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        });
    }

    window.editModule = function (id) {
        var mod = modules.find(function (m) { return m.id === id; });
        if (!mod) return;

        var newName = prompt('Module Name:', mod.module_name);
        if (newName && newName.trim()) {
            dbUpdate('modules', id, { module_name: newName.trim() }).then(function () {
                showToast('Module updated!', 'success');
                loadModules(selectedCourse);
            }).catch(function (err) {
                showToast('Error: ' + err.message, 'error');
            });
        }
    };

    window.deleteModule = function (id) {
        showConfirm('Delete this module?', async function () {
            try {
                await dbDelete('modules', id);
                showToast('Module deleted!', 'success');
                await loadModules(selectedCourse);
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        });
    };

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
