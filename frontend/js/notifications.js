/**
 * FinPocket Notifications
 */

let notifications = [];


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    if (!requireAuth()) return;

    initSidebarUser();
    initSidebarToggle();
    initLogout();

    loadNotifications();
    loadUnreadCount();

    const markAllBtn =
        document.getElementById('mark-all-read-btn');

    if (markAllBtn) {
        markAllBtn.addEventListener(
            'click',
            markAllAsRead
        );
    }

});


/* ============================================================
   LOAD ALL NOTIFICATIONS
   ============================================================ */

async function loadNotifications() {

    const list =
        document.getElementById('notification-list');

    try {

        const response =
            await apiGet('/notifications');

        if (Array.isArray(response)) {
            notifications = response;
        } else if (
            response &&
            Array.isArray(response.data)
        ) {
            notifications = response.data;
        } else {
            notifications = [];
        }

        renderNotifications(notifications);

        updateUnreadCount();

    } catch (error) {

        console.error(
            'Failed to load notifications:',
            error
        );

        if (list) {
            list.innerHTML = `
                <div class="empty-notifications">
                    <div class="empty-icon">⚠️</div>
                    <h3>Unable to load notifications</h3>
                    <p>Please refresh the page and try again.</p>
                </div>
            `;
        }
    }
}


/* ============================================================
   LOAD UNREAD COUNT
   ============================================================ */

async function loadUnreadCount() {

    try {

        const response =
            await apiGet('/notifications/unread-count');

        let count = 0;

        if (
            response &&
            typeof response.count === 'number'
        ) {
            count = response.count;
        } else if (
            response &&
            response.data &&
            typeof response.data.count === 'number'
        ) {
            count = response.data.count;
        }

        updateUnreadUI(count);

    } catch (error) {

        console.error(
            'Failed to load unread notification count:',
            error
        );
    }
}


/* ============================================================
   RENDER
   ============================================================ */

function renderNotifications(items) {

    const list =
        document.getElementById('notification-list');

    if (!list) return;

    if (!items || items.length === 0) {

        list.innerHTML = `
            <div class="empty-notifications">
                <div class="empty-icon">🔔</div>
                <h3>No notifications</h3>
                <p>
                    You're all caught up. New financial
                    alerts will appear here.
                </p>
            </div>
        `;

        return;
    }

    list.innerHTML = items.map(notification => {

        const id =
            notification.id ||
            notification._id;

        const type =
            String(notification.type || '')
                .toUpperCase();

        const icon =
            getNotificationIcon(type);

        const time =
            formatNotificationDate(
                notification.createdAt
            );

        const unreadClass =
            notification.read
                ? ''
                : 'unread';

        const readButton =
            notification.read
                ? ''
                : `
                    <button
                        class="notification-action"
                        onclick="markAsRead('${escapeAttr(id)}')">
                        ✓ Read
                    </button>
                `;

        return `
            <div
                class="notification-card ${unreadClass}"
                data-id="${escapeAttr(id)}">

                <div class="notification-icon">
                    ${icon}
                </div>

                <div class="notification-content">

                    <div class="notification-title">
                        ${escapeHtml(
                            notification.title ||
                            'Notification'
                        )}
                    </div>

                    <div class="notification-message">
                        ${escapeHtml(
                            notification.message ||
                            ''
                        )}
                    </div>

                    <div class="notification-time">
                        ${time}
                    </div>

                </div>

                <div class="notification-actions">

                    ${readButton}

                    <button
                        class="notification-action delete"
                        onclick="deleteNotification('${escapeAttr(id)}')">
                        🗑 Delete
                    </button>

                </div>

            </div>
        `;

    }).join('');
}


/* ============================================================
   NOTIFICATION ICON
   ============================================================ */

function getNotificationIcon(type) {

    switch (type) {

        case 'BUDGET_WARNING':
        case 'BUDGET':
            return '⚠️';

        case 'BUDGET_ALMOST':
            return '🔔';

        case 'BUDGET_EXCEEDED':
            return '🚨';

        case 'GOAL_ACHIEVED':
        case 'SAVING_GOAL':
            return '🎯';

        case 'REMINDER':
            return '⏰';

        case 'TRANSACTION':
            return '💳';

        default:
            return '🔔';
    }
}


/* ============================================================
   MARK ONE AS READ
   ============================================================ */

async function markAsRead(id) {

    if (!id) return;

    try {

        await apiPut(
            `/notifications/${encodeURIComponent(id)}/read`,
            {}
        );

        const notification =
            notifications.find(
                item =>
                    String(
                        item.id ||
                        item._id
                    ) === String(id)
            );

        if (notification) {
            notification.read = true;
        }

        renderNotifications(notifications);
        updateUnreadCount();

    } catch (error) {

        console.error(
            'Failed to mark notification as read:',
            error
        );

        showNotificationAlert(
            'Unable to mark notification as read.'
        );
    }
}


/* ============================================================
   MARK ALL AS READ
   ============================================================ */

async function markAllAsRead() {

    try {

        await apiPut(
            '/notifications/read-all',
            {}
        );

        notifications.forEach(
            notification => {
                notification.read = true;
            }
        );

        renderNotifications(notifications);
        updateUnreadUI(0);

        showNotificationAlert(
            'All notifications marked as read.',
            'success'
        );

    } catch (error) {

        console.error(
            'Failed to mark all notifications as read:',
            error
        );

        showNotificationAlert(
            'Unable to mark all notifications as read.'
        );
    }
}


/* ============================================================
   DELETE
   ============================================================ */

async function deleteNotification(id) {

    if (!id) return;

    try {

        await apiDelete(
            `/notifications/${encodeURIComponent(id)}`
        );

        notifications =
            notifications.filter(
                notification =>
                    String(
                        notification.id ||
                        notification._id
                    ) !== String(id)
            );

        renderNotifications(notifications);
        updateUnreadCount();

    } catch (error) {

        console.error(
            'Failed to delete notification:',
            error
        );

        showNotificationAlert(
            'Unable to delete notification.'
        );
    }
}


/* ============================================================
   UPDATE UNREAD COUNT
   ============================================================ */

function updateUnreadCount() {

    const count =
        notifications.filter(
            notification =>
                !notification.read
        ).length;

    updateUnreadUI(count);
}


function updateUnreadUI(count) {

    const countElement =
        document.getElementById(
            'notification-count'
        );

    if (countElement) {
        countElement.textContent = count;
    }

    const sidebarBadge =
        document.getElementById(
            'sidebar-unread-badge'
        );

    if (sidebarBadge) {

        if (count > 0) {
            sidebarBadge.textContent =
                count > 99 ? '99+' : count;

            sidebarBadge.style.display =
                'inline-flex';
        } else {
            sidebarBadge.style.display =
                'none';
        }
    }
}


/* ============================================================
   DATE FORMAT
   ============================================================ */

function formatNotificationDate(value) {

    if (!value) {
        return 'Just now';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleString(
        'en-IN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    );
}


/* ============================================================
   ALERT
   ============================================================ */

function showNotificationAlert(
    message,
    type = 'error'
) {

    const alert =
        document.getElementById(
            'notification-alert'
        );

    if (!alert) {
        console.log(message);
        return;
    }

    alert.textContent = message;

    alert.className =
        type === 'success'
            ? 'alert alert-success'
            : 'alert alert-error';

    setTimeout(() => {
        alert.textContent = '';
        alert.className = '';
    }, 3500);
}


/* ============================================================
   HTML ESCAPING
   ============================================================ */

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function escapeAttr(value) {

    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}