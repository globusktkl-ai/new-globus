/**
 * Student Notifications Logic
 * Globus Technical Academy ERP v1.00 — Part 2
 */

(function () {
    'use strict';

    var STUDENT_SESSION_KEY = 'erp_student_session';
    var student = null;
    var notifications = [];
    var studentNotifs = [];

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

        showLoader('Loading notifications...');

        try {
            await waitForSupabase();

            student = await dbSelect('students', {
                eq: { id: session.id },
                single: true
            });

            if (!student) {
                window.location.replace('login.html');
                return;
            }

            await loadNotifications();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadNotifications() {
        try {
            /* Load all notifications for students */
            notifications = await dbSelect('notifications', {
                inFilter: { target_role: ['student', 'all'] },
                order: { column: 'created_at', ascending: false }
            });

            /* Load student-specific read status */
            studentNotifs = await dbSelect('student_notifications', {
                eq: { student_id: student.id }
            });

            renderNotifications();
        } catch (err) {
            notifications = [];
            renderNotifications();
        }
    }

    function renderNotifications() {
        var container = document.getElementById('notification-list');
        var unreadCount = 0;

        if (notifications.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><p>No notifications yet</p></div>';
            document.getElementById('notif-count').textContent = '0 notifications';
            return;
        }

        var html = '';

        for (var i = 0; i < notifications.length; i++) {
            var n = notifications[i];
            var studentNotif = studentNotifs.find(function (sn) { return sn.notification_id === n.id; });
            var isRead = studentNotif ? studentNotif.is_read : false;

            if (!isRead) unreadCount++;

            html += '<div class="notification-item ' + (isRead ? '' : 'unread') + '" data-id="' + n.id + '">' +
                '<span class="notif-type ' + n.type + '">' + n.type + '</span>' +
                '<div class="notif-header">' +
                '<div class="notif-title">' + n.title + '</div>' +
                '<div class="notif-date">' + formatDate(n.created_at) + '</div>' +
                '</div>' +
                '<div class="notif-message">' + (n.message || '') + '</div>' +
                (!isRead ? '<button class="mark-read-btn" onclick="markAsRead(\'' + n.id + '\')">Mark as read</button>' : '') +
                '</div>';
        }

        container.innerHTML = html;
        document.getElementById('notif-count').textContent = unreadCount > 0 ? unreadCount + ' unread' : notifications.length + ' notifications';
    }

    window.markAsRead = async function (notificationId) {
        try {
            var existing = studentNotifs.find(function (sn) { return sn.notification_id === notificationId; });

            if (existing) {
                await dbUpdate('student_notifications', existing.id, {
                    is_read: true,
                    read_at: new Date().toISOString()
                });
            } else {
                await dbInsert('student_notifications', {
                    notification_id: notificationId,
                    student_id: student.id,
                    is_read: true,
                    read_at: new Date().toISOString()
                });
            }

            showToast('Marked as read', 'success');
            await loadNotifications();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
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
