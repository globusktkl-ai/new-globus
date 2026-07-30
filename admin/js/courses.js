/**
 * Admin Course Management
 * Globus Technical Academy ERP v1.00 — Part 4
 */

(function () {
    'use strict';

    var ADMIN_SESSION_KEY = 'erp_admin_session';
    var courses = [];
    var editingId = null;

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
        var admin = getAdminSession();
        if (!admin || !admin.id) {
            window.location.replace('login.html');
            return;
        }

        showLoader('Loading...');
        try {
            await waitForSupabase();
            await loadCourses();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadCourses() {
        try {
            courses = await dbSelect('courses', { order: { column: 'course_name', ascending: true } });
            renderCourses();
        } catch (err) {
            courses = [];
            renderCourses();
        }
    }

    function renderCourses() {
        var container = document.getElementById('courses-list');
        if (courses.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;color:#888;">No courses found. Add your first course!</div>';
            return;
        }

        var html = '';
        courses.forEach(function (c) {
            html += '<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">';
            html += '<div style="display:flex;align-items:center;gap:16px;">';
            html += '<div style="width:50px;height:50px;border-radius:12px;background:#eaf2fb;display:flex;align-items:center;justify-content:center;font-size:24px;">📚</div>';
            html += '<div><h3 style="font-size:16px;color:#1a1a2e;margin-bottom:2px;">' + c.course_name + '</h3>';
            html += '<p style="font-size:13px;color:#888;">' + c.course_code + ' • ' + (c.duration || 'No duration') + ' • ₹' + (c.total_fee || 0) + '</p></div></div>';
            html += '<div style="display:flex;gap:8px;">';
            html += '<span class="badge ' + (c.is_active ? 'badge-success' : 'badge-secondary') + '">' + (c.is_active ? 'Active' : 'Inactive') + '</span>';
            html += '<button class="btn btn-sm btn-secondary" onclick="editCourse(\'' + c.id + '\')">Edit</button>';
            html += '<button class="btn btn-sm btn-' + (c.is_active ? 'warning' : 'success') + '" onclick="toggleCourse(\'' + c.id + '\')">' + (c.is_active ? 'Deactivate' : 'Activate') + '</button>';
            html += '</div></div>';
        });
        container.innerHTML = html;
    }

    window.showAddModal = function () {
        editingId = null;
        document.getElementById('modal-title').textContent = 'Add Course';
        document.getElementById('course-form').reset();
        document.getElementById('add-modal').style.display = 'flex';
    };

    window.closeModal = function () {
        document.getElementById('add-modal').style.display = 'none';
    };

    window.editCourse = function (id) {
        var course = courses.find(function (c) { return c.id === id; });
        if (!course) return;

        editingId = id;
        document.getElementById('modal-title').textContent = 'Edit Course';
        document.getElementById('course-id').value = id;
        document.getElementById('course-name').value = course.course_name;
        document.getElementById('course-code').value = course.course_code;
        document.getElementById('course-duration').value = course.duration || '';
        document.getElementById('course-fee').value = course.total_fee || '';
        document.getElementById('add-modal').style.display = 'flex';
    };

    window.saveCourse = async function () {
        var name = document.getElementById('course-name').value.trim();
        var code = document.getElementById('course-code').value.trim();
        var duration = document.getElementById('course-duration').value.trim();
        var fee = parseFloat(document.getElementById('course-fee').value) || 0;

        if (!name || !code) {
            showToast('Name and code are required', 'warning');
            return;
        }

        showLoader('Saving...');
        try {
            var data = { course_name: name, course_code: code, duration: duration, total_fee: fee };
            if (editingId) {
                await dbUpdate('courses', editingId, data);
                showToast('Course updated!', 'success');
            } else {
                await dbInsert('courses', data);
                showToast('Course added!', 'success');
            }
            closeModal();
            await loadCourses();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    window.toggleCourse = async function (id) {
        var course = courses.find(function (c) { return c.id === id; });
        if (!course) return;

        showLoader('Updating...');
        try {
            await dbUpdate('courses', id, { is_active: !course.is_active });
            await loadCourses();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };

    if (localStorage.getItem('erp_admin_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
