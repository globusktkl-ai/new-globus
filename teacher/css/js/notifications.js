/**
 * Teacher Notifications
 * Globus Technical Academy ERP v1.00 — Part 3
 */

(function () {
    'use strict';

    var TEACHER_SESSION_KEY = 'erp_teacher_session';
    var teacher = null;
    var notifications = [];
    var teacherNotifs = [];

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

        showLoader('Loading notifications...');

        try {
            await waitForSupabase();
            teacher = { id: session.id };

            await loadNotifications();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    }

    async function loadNotifications() {
        try {
            /* Load all notifications for teachers */
            notifications = await dbSelect('notifications', {
                inFilter: { target_role: ['teacher', 'all'] },
                order: { column: 'created_at', ascending: false }
            });

            /* Load teacher-specific read status */
            teacherNotifs = await dbSelect('teacher_notifications', {
                eq: { teacher_id: teacher.id }
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
            var teacherNotif = teacherNotifs.find(function (tn) { return tn.notification_id === n.id; });
            var isRead = teacherNotif ? teacherNotif.is_read : false;

            if (!isRead) unreadCount++;

            html += '<div class="notification-item ' + (isRead ? '' : 'unread') + '" data-id="' + n.id + '">';
            html += '<span class="notif-type ' + n.type + '">' + n.type + '</span>';
            html += '<div class="notif-header">';
            html += '<div class="notif-title">' + n.title + '</div>';
            html += '<div class="notif-date">' + formatDate(n.created_at) + '</div>';
            html += '</div>';
            html += '<div class="notif-message">' + (n.message || '') + '</div>';
            if (!isRead) {
                html += '<button class="mark-read-btn" onclick="markAsRead(\'' + n.id + '\')">Mark as read</button>';
            }
            html += '</div>';
        }

        container.innerHTML = html;
        document.getElementById('notif-count').textContent = unreadCount > 0 ? unreadCount + ' unread' : notifications.length + ' notifications';
    }

    window.markAsRead = async function (notificationId) {
        try {
            var existing = teacherNotifs.find(function (tn) { return tn.notification_id === notificationId; });

            if (existing) {
                await dbUpdate('teacher_notifications', existing.id, {
                    is_read: true,
                    read_at: new Date().toISOString()
                });
            } else {
                await dbInsert('teacher_notifications', {
                    notification_id: notificationId,
                    teacher_id: teacher.id,
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
    if (localStorage.getItem('erp_teacher_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    waitForSupabase().then(init).catch(function () {
        hideLoader();
        showToast('Connection error.', 'error');
    });

})();
