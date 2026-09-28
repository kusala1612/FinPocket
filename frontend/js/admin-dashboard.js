/**
 * FinPocket Admin Dashboard Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Require ADMIN role
    if (!requireRole('ADMIN')) return;

    // Initialize common dashboard components
    initSidebarUser();
    initSidebarToggle();
    initLogout();

    // Load admin dashboard data
    loadAdminDashboard();
});

async function loadAdminDashboard() {
    try {
        const data = await apiGet('/admin/dashboard');

        updateAdminStats(data);
        updateRecentUsers(data.recentUsers);
        updateSystemInfo(data);
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
        showAdminError('Unable to load admin dashboard. Please refresh the page.');
    }
}

function updateAdminStats(data) {
    const totalUsersEl = document.getElementById('total-users');
    const totalAdminsEl = document.getElementById('total-admins');
    const regularUsersEl = document.getElementById('regular-users');
    const systemStatusEl = document.getElementById('system-status');

    if (totalUsersEl) totalUsersEl.textContent = data.totalUsers || 0;
    if (totalAdminsEl) totalAdminsEl.textContent = data.totalAdmins || 0;
    if (regularUsersEl) regularUsersEl.textContent = data.regularUsers || 0;
    if (systemStatusEl) systemStatusEl.textContent = data.status || 'Unknown';
}

function updateRecentUsers(users) {
    const tableBody = document.getElementById('recent-users-table');
    if (!tableBody) return;

    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted" style="padding: 32px;">
                    No users registered yet.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar" style="width:32px;height:32px;font-size:0.75rem;">
                        ${getInitials(user.fullName)}
                    </div>
                    ${escapeHtml(user.fullName)}
                </div>
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
        </tr>
    `).join('');
}

function updateSystemInfo(data) {
    const serverTimeEl = document.getElementById('server-time');
    if (serverTimeEl) serverTimeEl.textContent = data.serverTime || 'N/A';
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showAdminError(message) {
    const alertContainer = document.getElementById('dashboard-alert');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-error">
                <span>⚠️</span>
                <span>${message}</span>
            </div>
        `;
    }
}
