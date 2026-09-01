/**
 * FinPocket Authentication Module
 * Handles login, registration, logout, token management, and route protection
 */

const AUTH_TOKEN_KEY = 'fp_token';
const AUTH_USER_KEY = 'fp_user';

/**
 * Register a new user
 */
async function registerUser(fullName, email, password, confirmPassword, phone) {
    const response = await apiPost('/auth/register', {
        fullName,
        email,
        password,
        confirmPassword,
        phone: phone || null,
    });
    return response;
}

/**
 * Login user and store authentication data
 */
async function loginUser(email, password) {
    const response = await apiPost('/auth/login', { email, password });

    if (response.success && response.token) {
        // Store token and user data
        localStorage.setItem(AUTH_TOKEN_KEY, response.token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
            userId: response.userId,
            fullName: response.fullName,
            email: response.email,
            role: response.role,
        }));
    }

    return response;
}

/**
 * Logout user - clear all auth data and redirect
 */
function logoutUser() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    window.location.href = '/login.html';
}

/**
 * Get stored JWT token
 */
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get current user data from local storage
 */
function getCurrentUser() {
    const userData = localStorage.getItem(AUTH_USER_KEY);
    if (!userData) return null;
    try {
        return JSON.parse(userData);
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const token = getAuthToken();
    const user = getCurrentUser();
    return !!(token && user);
}

/**
 * Get user's role
 */
function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

/**
 * Get user's initials for avatar
 */
function getUserInitials() {
    const user = getCurrentUser();
    if (!user || !user.fullName) return '?';
    const names = user.fullName.trim().split(' ');
    if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
}

/**
 * Require authentication - redirect to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Require specific role - redirect if unauthorized
 */
function requireRole(requiredRole) {
    if (!requireAuth()) return false;

    const userRole = getUserRole();
    if (userRole !== requiredRole) {
        if (userRole === 'USER') {
            window.location.href = '/user-dashboard.html';
        } else if (userRole === 'ADMIN') {
            window.location.href = '/admin-dashboard.html';
        } else {
            window.location.href = '/login.html';
        }
        return false;
    }
    return true;
}

/**
 * Redirect authenticated users away from public pages (login/register)
 */
function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        const role = getUserRole();
        if (role === 'ADMIN') {
            window.location.href = '/admin-dashboard.html';
        } else {
            window.location.href = '/user-dashboard.html';
        }
        return true;
    }
    return false;
}

/**
 * Initialize sidebar user info on dashboard pages
 */
function initSidebarUser() {
    const user = getCurrentUser();
    if (!user) return;

    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const topbarNameEl = document.getElementById('topbar-user-name');

    if (nameEl) nameEl.textContent = user.fullName;
    if (roleEl) roleEl.textContent = user.role === 'ADMIN' ? 'Administrator' : 'Member';
    if (avatarEl) avatarEl.textContent = getUserInitials();
    if (topbarNameEl) topbarNameEl.textContent = user.fullName;
}

/**
 * Initialize sidebar toggle for mobile
 */
function initSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

/**
 * Setup logout button handlers
 */
function initLogout() {
    const logoutBtns = document.querySelectorAll('.logout-btn, #logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    });
}

/**
 * Show alert message on page
 */
function showAlert(containerId, message, type = 'error') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-${type}">
            <span>${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;

    // Auto-hide after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}
