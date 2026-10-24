
/**
 * FinPocket User Dashboard Handler
 * Authentication, dashboard cards, and recent transactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    initSidebarUser();
    initSidebarToggle();
    initLogout();

    loadDashboard();
    loadNotificationCount();

    initBalancePrivacy();
    loadEnhancedDashboardWidgets();
});

/**
 * Load dashboard summary from the backend.
 */
async function loadDashboard() {
    try {
        const response = await apiGet('/user/dashboard');
        const data = response && response.data
            ? response.data
            : response;

        if (!data) {
            throw new Error('Dashboard data is empty.');
        }

        updateDashboardCards(data);
        updateWelcomeMessage(data);
        await loadRecentTransactions();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showDashboardError(
            'Unable to load dashboard data. Please refresh the page.'
        );
    }
}

/**
 * Update the four main dashboard cards.
 */
function updateDashboardCards(data) {
    const balanceEl = document.getElementById('total-balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expenses');
    const budgetEl = document.getElementById('current-budget');

    if (balanceEl) {
        balanceEl.textContent = formatCurrency(data.totalBalance);
    }

    if (incomeEl) {
        incomeEl.textContent = formatCurrency(data.totalIncome);
    }

    if (expenseEl) {
        expenseEl.textContent = formatCurrency(data.totalExpenses);
    }

    if (budgetEl) {
        budgetEl.textContent = formatCurrency(data.currentBudget);
    }
}

/**
 * Update greeting with the user's name.
 */
function updateWelcomeMessage(data) {
    const greetingEl = document.getElementById('greeting-text');
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let greeting = 'Good evening';

    if (hour < 12) {
        greeting = 'Good morning';
    } else if (hour < 18) {
        greeting = 'Good afternoon';
    }

    const fullName = data.fullName || data.name || 'User';
    greetingEl.textContent = `${greeting}, ${fullName}!`;
}

/**
 * Fetch recent transactions.
 */
async function loadRecentTransactions() {
    try {
        const response = await apiGet('/transactions');
        const data = response && response.data !== undefined
            ? response.data
            : response;

        const transactions = Array.isArray(data)
            ? data
            : (data && Array.isArray(data.content) ? data.content : []);

        renderRecentTransactions(transactions.slice(0, 5));
    } catch (error) {
        console.error('Failed to load recent transactions:', error);
    }
}

/**
 * Render recent transaction rows safely.
 */
function renderRecentTransactions(transactions) {
    const container = document.querySelector('.transactions-list');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No Transactions Yet</h3>
                <p>Start by adding your first income or expense.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = transactions.map(transaction => {
        const type = String(
            transaction.type || transaction.transactionType || ''
        ).toUpperCase();

        const isIncome = [
            'INCOME', 'CREDIT', 'DEPOSIT'
        ].includes(type);

        const amount = Math.abs(Number(transaction.amount) || 0);
        const category = escapeHtml(transaction.category || 'Other');
        const description = escapeHtml(transaction.description || '');
        const date = formatDate(
            transaction.date ||
            transaction.createdAt ||
            transaction.transactionDate
        );

        const sign = isIncome ? '+' : '-';
        const typeClass = isIncome ? 'income' : 'expense';

        return `
            <div class="transaction-item">
                <div class="transaction-icon ${typeClass}">
                    ${isIncome ? '📈' : '📉'}
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${category}</div>
                    <div class="transaction-description">${description}</div>
                    <div class="transaction-date">${escapeHtml(date)}</div>
                </div>
                <div class="transaction-amount ${typeClass}">
                    ${sign}${formatCurrency(amount)}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * BALANCE PRIVACY
 * Adds a button beside the balance card to hide or reveal the amount.
 */
function initBalancePrivacy() {
    const balanceEl = document.getElementById('total-balance');
    if (!balanceEl) return;

    // Avoid adding duplicate controls.
    if (document.getElementById('balance-privacy-toggle')) return;

    const button = document.createElement('button');
    button.id = 'balance-privacy-toggle';
    button.type = 'button';
    button.textContent = '👁️';
    button.setAttribute('aria-label', 'Hide balance');
    button.title = 'Hide or reveal balance';

    button.style.cssText = `
        margin-left: 10px;
        padding: 5px 9px;
        border: 1px solid var(--fp-border, #334155);
        border-radius: 8px;
        background: transparent;
        color: inherit;
        cursor: pointer;
    `;

    balanceEl.insertAdjacentElement('afterend', button);

    let hidden = localStorage.getItem('finpocket-hide-balance') === 'true';

    function renderBalance() {
        const actual = balanceEl.dataset.actualBalance || balanceEl.textContent;

        if (!balanceEl.dataset.actualBalance) {
            balanceEl.dataset.actualBalance = actual;
        }

        balanceEl.textContent = hidden ? '₹ ••••••' : actual;
        button.textContent = hidden ? '🙈' : '👁️';
        button.setAttribute(
            'aria-label',
            hidden ? 'Reveal balance' : 'Hide balance'
        );
    }

    // Preserve future balance updates while privacy is enabled.
    const originalTextSetter = Object.getOwnPropertyDescriptor(
        Node.prototype,
        'textContent'
    );

    button.addEventListener('click', () => {
        hidden = !hidden;
        localStorage.setItem('finpocket-hide-balance', String(hidden));
        renderBalance();
    });

    // Store the preference for dashboard refreshes.
    window.finPocketBalancePrivacy = {
        isHidden: () => hidden,
        render: renderBalance
    };

    renderBalance();
}

/**
 * Load additional dashboard widgets.
 *
 * Transaction data is retrieved from the existing API. Optional
 * bills and emergency-fund widgets use browser storage until
 * corresponding backend endpoints are confirmed.
 */
async function loadEnhancedDashboardWidgets() {
    try {
        const response = await apiGet('/transactions');

        const data = response && response.data !== undefined
            ? response.data
            : response;

        const transactions = Array.isArray(data)
            ? data
            : (data && Array.isArray(data.content) ? data.content : []);

        renderMonthlySummary(transactions);
        renderSpendingInsights(transactions);
    } catch (error) {
        console.warn('Could not load enhanced dashboard widgets:', error);
    }

    renderEmergencyFundWidget();
    renderUpcomingBillsWidget();
}

/**
 * Normalize transaction type.
 */
function getTransactionType(transaction) {
    return String(
        transaction.type || transaction.transactionType || ''
    ).toUpperCase();
}

/**
 * Calculate current-month totals.
 */
function renderMonthlySummary(transactions) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expenses = 0;

    transactions.forEach(transaction => {
        const rawDate = transaction.date ||
            transaction.createdAt ||
            transaction.transactionDate;

        const date = rawDate ? new Date(rawDate) : null;

        if (
            !date ||
            Number.isNaN(date.getTime()) ||
            date.getMonth() !== currentMonth ||
            date.getFullYear() !== currentYear
        ) {
            return;
        }

        const amount = Math.abs(Number(transaction.amount) || 0);
        const type = getTransactionType(transaction);

        if (['INCOME', 'CREDIT', 'DEPOSIT'].includes(type)) {
            income += amount;
        } else if (['EXPENSE', 'DEBIT', 'WITHDRAWAL'].includes(type)) {
            expenses += amount;
        }
    });

    const savings = income - expenses;

    setDashboardWidget(
        'monthly-financial-summary',
        'This Month',
        `
            <div class="fp-summary-row">
                <span>Income</span>
                <strong class="income">${formatCurrency(income)}</strong>
            </div>
            <div class="fp-summary-row">
                <span>Expenses</span>
                <strong class="expense">${formatCurrency(expenses)}</strong>
            </div>
            <div class="fp-summary-row">
                <span>Net savings</span>
                <strong>${formatCurrency(savings)}</strong>
            </div>
        `
    );
}

/**
 * Generate simple rule-based spending insights.
 */
function renderSpendingInsights(transactions) {
    const now = new Date();
    const totalsByCategory = {};
    let totalExpenses = 0;

    transactions.forEach(transaction => {
        const rawDate = transaction.date ||
            transaction.createdAt ||
            transaction.transactionDate;

        const date = rawDate ? new Date(rawDate) : null;

        if (
            !date ||
            Number.isNaN(date.getTime()) ||
            date.getMonth() !== now.getMonth() ||
            date.getFullYear() !== now.getFullYear()
        ) {
            return;
        }

        const type = getTransactionType(transaction);

        if (!['EXPENSE', 'DEBIT', 'WITHDRAWAL'].includes(type)) {
            return;
        }

        const amount = Math.abs(Number(transaction.amount) || 0);
        const category = transaction.category || 'Other';

        totalsByCategory[category] =
            (totalsByCategory[category] || 0) + amount;

        totalExpenses += amount;
    });

    const categories = Object.entries(totalsByCategory)
        .sort((a, b) => b[1] - a[1]);

    let message = 'Add transactions to receive spending insights.';

    if (totalExpenses > 0 && categories.length > 0) {
        const [topCategory, topAmount] = categories[0];
        const percentage = Math.round(topAmount / totalExpenses * 100);

        message = `Your highest spending category this month is ${
            escapeHtml(topCategory)
        } (${percentage}% of recorded expenses).`;

        if (totalExpenses > 10000) {
            message += ' Review your spending to see whether you can save more.';
        }
    }

    setDashboardWidget(
        'financial-insights',
        'Financial Insights',
        `<p>${message}</p>`
    );
}

/**
 * Create or update a dashboard widget.
 */
function setDashboardWidget(id, title, content) {
    let widget = document.getElementById(id);

    if (!widget) {
        const dashboardContent = document.querySelector('.dashboard-content');
        if (!dashboardContent) return;

        widget = document.createElement('section');
        widget.id = id;
        widget.className = 'dashboard-section fp-enhanced-widget';
        dashboardContent.appendChild(widget);
    }

    widget.innerHTML = `
        <div class="section-title">
            <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="fp-widget-content">${content}</div>
    `;

    addEnhancedDashboardStyles();
}

/**
 * Shared styling for the added widgets.
 */
function addEnhancedDashboardStyles() {
    if (document.getElementById('fp-enhanced-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'fp-enhanced-dashboard-styles';

    style.textContent = `
        .fp-enhanced-widget {
            margin-top: 20px;
            padding: 20px;
            border: 1px solid var(--fp-border, #334155);
            border-radius: 14px;
            background: var(--fp-card, #111827);
            color: var(--fp-text, #f8fafc);
        }

        .fp-widget-content {
            line-height: 1.8;
            overflow-wrap: anywhere;
        }

        .fp-summary-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 7px 0;
            border-bottom: 1px solid var(--fp-border, #334155);
        }

        .fp-summary-row:last-child {
            border-bottom: none;
        }

        .fp-summary-row .income {
            color: #22c55e;
        }

        .fp-summary-row .expense {
            color: #f87171;
        }
    `;

    document.head.appendChild(style);
}

/**
 * EMERGENCY FUND WIDGET
 * Reads demo/local fund data until a backend endpoint is confirmed.
 */
function renderEmergencyFundWidget() {
    let fund = {};

    try {
        fund = JSON.parse(
            localStorage.getItem('finpocket-emergency-fund') || '{}'
        );
    } catch (error) {
        console.warn('Could not read emergency fund data:', error);
    }

    const saved = Math.max(0, Number(fund.saved) || 0);
    const target = Math.max(0, Number(fund.target) || 0);
    const percent = target > 0
        ? Math.min(100, Math.round(saved / target * 100))
        : 0;

    const content = target > 0
        ? `
            <p>Saved: <strong>${formatCurrency(saved)}</strong></p>
            <p>Target: ${formatCurrency(target)}</p>
            <div style="height:10px;background:var(--fp-border,#334155);border-radius:10px;overflow:hidden">
                <div style="height:100%;width:${percent}%;background:#14b8a6"></div>
            </div>
            <p>${percent}% of your target</p>
        `
        : '<p>Set an emergency fund target to track your progress.</p>';

    setDashboardWidget(
        'emergency-fund-overview',
        'Emergency Fund',
        content
    );
}

/**
 * UPCOMING BILLS WIDGET
 * Uses locally stored demo bills until backend integration is confirmed.
 */
function renderUpcomingBillsWidget() {
    let bills = [];

    try {
        const stored = JSON.parse(
            localStorage.getItem('finpocket-bills') || '[]'
        );

        bills = Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.warn('Could not read bills:', error);
    }

    const upcoming = bills
        .filter(bill => {
            const status = String(bill.status || 'UNPAID').toUpperCase();
            return !['PAID', 'COMPLETED'].includes(status);
        })
        .sort((a, b) => {
            return new Date(a.dueDate || a.date || 0) -
                new Date(b.dueDate || b.date || 0);
        })
        .slice(0, 5);

    const content = upcoming.length
        ? upcoming.map(bill => `
            <div class="fp-summary-row">
                <span>
                    ${escapeHtml(bill.name || bill.title || 'Bill')}
                    <small>
                        ${escapeHtml(formatDate(bill.dueDate || bill.date))}
                    </small>
                </span>
                <strong>${formatCurrency(bill.amount)}</strong>
            </div>
        `).join('')
        : '<p>No upcoming bills recorded yet.</p>';

    setDashboardWidget(
        'upcoming-bills-overview',
        'Upcoming Bills',
        content
    );
}

/**
 * FORMAT CURRENCY
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(Number(amount) || 0);
}

/**
 * FORMAT DATE
 */
function formatDate(date) {
    if (!date) return '-';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return String(date);
    }

    return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * ESCAPE HTML
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
 * DISPLAY DASHBOARD ERROR
 */
function showDashboardError(message) {
    const alertContainer = document.getElementById('dashboard-alert');
    if (!alertContainer) return;

    alertContainer.textContent = '';

    const alert = document.createElement('div');
    alert.className = 'alert alert-error';

    const icon = document.createElement('span');
    icon.textContent = '⚠️';

    const text = document.createElement('span');
    text.textContent = message;

    alert.append(icon, text);
    alertContainer.appendChild(alert);
}

/**
 * LOAD UNREAD NOTIFICATION COUNT
 */
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
        console.error('Failed to load notification count:', error);
    }
}

/**
 * UPDATE NOTIFICATION INDICATORS
 */
function updateNotificationIndicators(count) {
    const sidebarBadge = document.getElementById('sidebar-unread-badge');

    if (sidebarBadge) {
        if (count > 0) {
            sidebarBadge.textContent = count > 99 ? '99+' : String(count);
            sidebarBadge.style.display = 'inline-flex';
        } else {
            sidebarBadge.style.display = 'none';
        }
    }

    const topbarDot = document.getElementById('topbar-notification-dot');

    if (topbarDot) {
        topbarDot.style.display = count > 0 ? 'block' : 'none';
    }
}
