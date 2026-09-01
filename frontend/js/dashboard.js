/**
 * FinPocket User Dashboard Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Require authentication
    if (!requireAuth()) return;

    // Initialize common dashboard components
    initSidebarUser();
    initSidebarToggle();
    initLogout();

    // Load dashboard data
    loadDashboard();
});

async function loadDashboard() {
    try {
        const data = await apiGet('/user/dashboard');

        if (data.success) {
            updateDashboardCards(data);
            updateWelcomeMessage(data);
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showDashboardError('Unable to load dashboard data. Please refresh the page.');
    }
}

function updateDashboardCards(data) {
    // Update stat cards with real data from API
    const balanceEl = document.getElementById('total-balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expenses');
    const budgetEl = document.getElementById('current-budget');

    if (balanceEl) balanceEl.textContent = formatCurrency(data.totalBalance);
    if (incomeEl) incomeEl.textContent = formatCurrency(data.totalIncome);
    if (expenseEl) expenseEl.textContent = formatCurrency(data.totalExpenses);
    if (budgetEl) budgetEl.textContent = formatCurrency(data.currentBudget);
}

function updateWelcomeMessage(data) {
    const welcomeEl = document.getElementById('welcome-name');
    if (welcomeEl) {
        welcomeEl.textContent = data.fullName || 'User';
    }

    const greetingEl = document.getElementById('greeting-text');
    if (greetingEl) {
        const hour = new Date().getHours();
        let greeting = 'Good evening';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        greetingEl.textContent = `${greeting}, ${data.fullName || 'User'}!`;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount || 0);
}

function showDashboardError(message) {
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
