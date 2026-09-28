/**
 * ============================================================
 * FinPocket User Dashboard Handler
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    initSidebarUser();
    initSidebarToggle();
    initLogout();

    loadDashboard();
    loadNotificationCount();
});


/**
 * ============================================================
 * LOAD DASHBOARD DATA
 * ============================================================
 */
async function loadDashboard() {

    try {

        const response = await apiGet('/user/dashboard');

        console.log('Dashboard API response:', response);


        // -----------------------------------------------------
        // Handle both possible response formats
        // -----------------------------------------------------

        let data = response;

        if (response && response.data) {
            data = response.data;
        }


        if (!data) {
            throw new Error('Dashboard data is empty.');
        }


        // -----------------------------------------------------
        // Update dashboard cards
        // -----------------------------------------------------

        updateDashboardCards(data);


        // -----------------------------------------------------
        // Update welcome message
        // -----------------------------------------------------

        updateWelcomeMessage(data);


        // -----------------------------------------------------
        // Load recent transactions
        // -----------------------------------------------------

        await loadRecentTransactions();


    } catch (error) {

        console.error(
            'Failed to load dashboard:',
            error
        );

        showDashboardError(
            'Unable to load dashboard data. Please refresh the page.'
        );

    }

}


/**
 * ============================================================
 * UPDATE DASHBOARD CARDS
 * ============================================================
 */
function updateDashboardCards(data) {

    const balanceEl =
        document.getElementById('total-balance');

    const incomeEl =
        document.getElementById('total-income');

    const expenseEl =
        document.getElementById('total-expenses');

    const budgetEl =
        document.getElementById('current-budget');


    // ---------------------------------------------------------
    // Convert values safely to numbers
    // ---------------------------------------------------------

    const totalBalance =
        Number(data.totalBalance) || 0;

    const totalIncome =
        Number(data.totalIncome) || 0;

    const totalExpenses =
        Number(data.totalExpenses) || 0;

    const currentBudget =
        Number(data.currentBudget) || 0;


    // ---------------------------------------------------------
    // Display
    // ---------------------------------------------------------

    if (balanceEl) {
        balanceEl.textContent =
            formatCurrency(totalBalance);
    }

    if (incomeEl) {
        incomeEl.textContent =
            formatCurrency(totalIncome);
    }

    if (expenseEl) {
        expenseEl.textContent =
            formatCurrency(totalExpenses);
    }

    if (budgetEl) {
        budgetEl.textContent =
            formatCurrency(currentBudget);
    }

}


/**
 * ============================================================
 * UPDATE WELCOME MESSAGE
 * ============================================================
 */
function updateWelcomeMessage(data) {

    const greetingEl =
        document.getElementById('greeting-text');


    if (!greetingEl) {
        return;
    }


    const hour =
        new Date().getHours();


    let greeting =
        'Good evening';

    if (hour < 12) {
        greeting = 'Good morning';
    }
    else if (hour < 18) {
        greeting = 'Good afternoon';
    }


    const fullName =
        data.fullName ||
        data.name ||
        'User';


    greetingEl.textContent =
        `${greeting}, ${fullName}!`;

}


/**
 * ============================================================
 * LOAD RECENT TRANSACTIONS
 * ============================================================
 */
async function loadRecentTransactions() {

    try {

        const response =
            await apiGet('/transactions');


        let data = response;


        if (response && response.data) {
            data = response.data;
        }


        const transactions =
            Array.isArray(data)
                ? data
                : [];


        renderRecentTransactions(
            transactions.slice(0, 5)
        );


    } catch (error) {

        console.error(
            'Failed to load recent transactions:',
            error
        );

    }

}


/**
 * ============================================================
 * RENDER RECENT TRANSACTIONS
 * ============================================================
 */
function renderRecentTransactions(transactions) {

    const container =
        document.querySelector(
            '.transactions-list'
        );


    if (!container) {
        return;
    }


    if (
        !transactions ||
        transactions.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📋
                </div>

                <h3>
                    No Transactions Yet
                </h3>

                <p>
                    Start by adding your first income or expense.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        transactions.map(transaction => {

            const type =
                String(
                    transaction.type || ''
                ).toUpperCase();


            const amount =
                Number(
                    transaction.amount
                ) || 0;


            const category =
                transaction.category ||
                'Other';


            const description =
                transaction.description ||
                '';


            const date =
                formatDate(
                    transaction.date
                );


            const isIncome =
                type === 'INCOME';


            const sign =
                isIncome ? '+' : '-';


            const typeClass =
                isIncome
                    ? 'income'
                    : 'expense';


            return `
                <div class="transaction-item">

                    <div class="transaction-icon ${typeClass}">
                        ${isIncome ? '📈' : '📉'}
                    </div>

                    <div class="transaction-details">

                        <div class="transaction-category">
                            ${escapeHtml(category)}
                        </div>

                        <div class="transaction-description">
                            ${escapeHtml(description)}
                        </div>

                        <div class="transaction-date">
                            ${date}
                        </div>

                    </div>

                    <div class="transaction-amount ${typeClass}">
                        ${sign}${formatCurrency(amount)}
                    </div>

                </div>
            `;

        }).join('');

}


/**
 * ============================================================
 * FORMAT CURRENCY
 * ============================================================
 */
function formatCurrency(amount) {

    return new Intl.NumberFormat(
        'en-IN',
        {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }
    ).format(
        Number(amount) || 0
    );

}


/**
 * ============================================================
 * FORMAT DATE
 * ============================================================
 */
function formatDate(date) {

    if (!date) {
        return '-';
    }


    const parsed =
        new Date(date);


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return date;
    }


    return parsed.toLocaleDateString(
        'en-IN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }
    );

}


/**
 * ============================================================
 * ESCAPE HTML
 * ============================================================
 */
function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}


/**
 * ============================================================
 * DASHBOARD ERROR
 * ============================================================
 */
function showDashboardError(message) {

    const alertContainer =
        document.getElementById(
            'dashboard-alert'
        );


    if (!alertContainer) {
        return;
    }


    alertContainer.innerHTML = `
        <div class="alert alert-error">

            <span>⚠️</span>

            <span>
                ${escapeHtml(message)}
            </span>

        </div>
    `;

}
async function loadNotificationCount() {
    try {
        const response = await apiGet('/notifications/unread-count');

        let count = 0;

        if (response && typeof response.count === 'number') {
            count = response.count;
        } else if (
            response &&
            response.data &&
            typeof response.data.count === 'number'
        ) {
            count = response.data.count;
        }

        updateNotificationIndicators(count);

    } catch (error) {
        console.error(
            'Failed to load notification count:',
            error
        );
    }
}


function updateNotificationIndicators(count) {

    const sidebarBadge =
        document.getElementById('sidebar-unread-badge');

    if (sidebarBadge) {
        if (count > 0) {
            sidebarBadge.textContent =
                count > 99 ? '99+' : count;

            sidebarBadge.style.display = 'inline-flex';
        } else {
            sidebarBadge.style.display = 'none';
        }
    }

    const topbarDot =
        document.getElementById('topbar-notification-dot');

    if (topbarDot) {
        topbarDot.style.display =
            count > 0 ? 'block' : 'none';
    }
}