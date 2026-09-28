
/* ======================================================
   FINPOCKET - TRANSACTIONS JAVASCRIPT
====================================================== */

let transactions = [];
let currentTransactionType = 'EXPENSE';


/* ======================================================
   DOM CONTENT LOADED
====================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // Authentication
    if (typeof requireAuth === 'function') {
        if (!requireAuth()) return;
    }

    // Sidebar
    if (typeof initSidebarUser === 'function') initSidebarUser();
    if (typeof initSidebarToggle === 'function') initSidebarToggle();
    if (typeof initLogout === 'function') initLogout();

    // Set today's date
    setToday();

    // Transaction form
    const form = document.getElementById('transaction-form');

    if (form) {
        form.addEventListener('submit', saveTransaction);
    }

    // Reminder checkbox
    const reminderCheckbox =
        document.getElementById('reminder-enabled');

    const reminderFields =
        document.getElementById('reminder-fields');

    if (reminderCheckbox && reminderFields) {
        reminderCheckbox.addEventListener('change', function () {
            reminderFields.style.display =
                this.checked ? 'block' : 'none';
        });
    }

    // Recurring transaction checkbox
const recurringCheckbox =
    document.getElementById('recurring-active');

const recurrenceFields =
    document.getElementById('recurrence-fields');

const recurrenceFrequency =
    document.getElementById('recurrence-frequency');

const recurrenceEndDate =
    document.getElementById('recurrence-end-date');

if (recurringCheckbox && recurrenceFields) {
    function updateRecurrenceFields() {
        recurrenceFields.style.display =
            recurringCheckbox.checked ? 'block' : 'none';

        recurrenceFrequency.required = recurringCheckbox.checked;
        recurrenceEndDate.required = recurringCheckbox.checked;

        if (!recurringCheckbox.checked) {
            recurrenceFrequency.value = '';
            recurrenceEndDate.value = '';
        }
    }

    recurringCheckbox.addEventListener('change', updateRecurrenceFields);
    updateRecurrenceFields();
}

    // Search filter
    const searchInput =
        document.getElementById('search-input');

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Exact amount filter
    const amountInput =
        document.getElementById('amount-filter');

    if (amountInput) {
        amountInput.addEventListener('input', applyFilters);
    }

    // Type filter
    const typeFilter =
        document.getElementById('type-filter');

    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
    }

    // From date filter
    const fromDate =
        document.getElementById('from-date');

    if (fromDate) {
        fromDate.addEventListener('change', applyFilters);
    }

    // To date filter
    const toDate =
        document.getElementById('to-date');

    if (toDate) {
        toDate.addEventListener('change', applyFilters);
    }

    // Income category listeners
    document
        .querySelectorAll('input[name="income-category"]')
        .forEach(radio => {
            radio.addEventListener('change', updateOtherCategory);
        });

    // Expense category listeners
    document
        .querySelectorAll('input[name="expense-category"]')
        .forEach(radio => {
            radio.addEventListener('change', updateOtherCategory);
        });

    // Load transactions
    loadTransactions();
});


/* ======================================================
   SET TODAY
====================================================== */

function setToday() {
    const dateInput =
        document.getElementById('transaction-date');

    if (!dateInput) return;

    dateInput.value = new Date().toISOString().split('T')[0];
}


/* ======================================================
   OPEN TRANSACTION MODAL
====================================================== */

function openTransactionModal(type = 'EXPENSE', transaction = null) {

    currentTransactionType = String(type).toUpperCase();

    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');

    if (!modal || !form) return;

    form.reset();

    const idInput = document.getElementById('transaction-id');

    if (idInput) {
        idInput.value = transaction ? getTransactionId(transaction) : '';
    }

    const amountInput =
        document.getElementById('transaction-amount');

    if (amountInput) {
        amountInput.value = transaction ? transaction.amount : '';
    }

    const dateInput =
        document.getElementById('transaction-date');

    if (dateInput) {
        dateInput.value = transaction
            ? formatInputDate(transaction.date)
            : new Date().toISOString().split('T')[0];
    }

    const descriptionInput =
        document.getElementById('transaction-description');

    if (descriptionInput) {
        descriptionInput.value =
            transaction ? transaction.description || '' : '';
    }

    // Reminder fields
    const reminderCheckbox =
        document.getElementById('reminder-enabled');

    const reminderAtInput =
        document.getElementById('reminder-at');

    const reminderFields =
        document.getElementById('reminder-fields');

    if (reminderCheckbox) {
        reminderCheckbox.checked =
            transaction ? Boolean(transaction.reminderEnabled) : false;
    }

    if (reminderAtInput) {
        reminderAtInput.value =
            transaction && transaction.reminderAt
                ? formatReminderDateTime(transaction.reminderAt)
                : '';
    }

    if (reminderFields) {
        reminderFields.style.display =
            reminderCheckbox && reminderCheckbox.checked
                ? 'block'
                : 'none';
    }

    // Clear category selections
    clearCategorySelections();

    // Select category when editing
    if (transaction) {
        selectTransactionCategory(
            transaction.category,
            currentTransactionType
        );
    }

    updateModalCategoryFields();

    // Modal title
    const modalTitle = document.getElementById('modal-title');

    if (modalTitle) {
        modalTitle.textContent = transaction
            ? (currentTransactionType === 'INCOME'
                ? 'Edit Income'
                : 'Edit Expense')
            : (currentTransactionType === 'INCOME'
                ? 'Add Income'
                : 'Add Expense');
    }

    // Save button text
    const saveButton =
        document.getElementById('save-transaction-btn');

    if (saveButton) {
        saveButton.textContent =
            currentTransactionType === 'INCOME'
                ? (transaction ? 'Update Income' : 'Save Income')
                : (transaction ? 'Update Expense' : 'Save Expense');
    }

    modal.classList.add('show');
}


/* ======================================================
   CLEAR CATEGORY SELECTIONS
====================================================== */

function clearCategorySelections() {

    document
        .querySelectorAll(
            'input[name="income-category"], input[name="expense-category"]'
        )
        .forEach(radio => {
            radio.checked = false;
        });

    const otherIncome =
        document.getElementById('other-income-category');

    const otherExpense =
        document.getElementById('other-expense-category');

    if (otherIncome) {
        otherIncome.value = '';
        otherIncome.style.display = 'none';
        otherIncome.required = false;
    }

    if (otherExpense) {
        otherExpense.value = '';
        otherExpense.style.display = 'none';
        otherExpense.required = false;
    }
}


/* ======================================================
   SELECT CATEGORY WHEN EDITING
====================================================== */

function selectTransactionCategory(category, type) {

    if (!category) return;

    const categoryName = String(category);

    const selector = type === 'INCOME'
        ? 'input[name="income-category"]'
        : 'input[name="expense-category"]';

    const radios = document.querySelectorAll(selector);
    let found = false;

    radios.forEach(radio => {
        if (
            radio.value.toLowerCase() ===
            categoryName.toLowerCase()
        ) {
            radio.checked = true;
            found = true;
        }
    });

    // Custom "Other" category
    if (!found) {
        const otherRadio =
            document.querySelector(`${selector}[value="Other"]`);

        if (otherRadio) {
            otherRadio.checked = true;
        }

        const otherInput = type === 'INCOME'
            ? document.getElementById('other-income-category')
            : document.getElementById('other-expense-category');

        if (otherInput) {
            otherInput.value = categoryName;
        }
    }
}


/* ======================================================
   UPDATE CATEGORY DISPLAY
====================================================== */

function updateModalCategoryFields() {

    const incomeCategories =
        document.getElementById('income-categories');

    const expenseCategories =
        document.getElementById('expense-categories');

    const otherIncome =
        document.getElementById('other-income-category');

    const otherExpense =
        document.getElementById('other-expense-category');

    if (!incomeCategories || !expenseCategories) return;

    if (currentTransactionType === 'INCOME') {

        incomeCategories.style.display = 'grid';
        expenseCategories.style.display = 'none';

        if (otherExpense) {
            otherExpense.style.display = 'none';
            otherExpense.required = false;
        }

        const selected = document.querySelector(
            'input[name="income-category"]:checked'
        );

        if (selected && selected.value === 'Other') {
            if (otherIncome) {
                otherIncome.style.display = 'block';
                otherIncome.required = true;
            }
        } else if (otherIncome) {
            otherIncome.style.display = 'none';
            otherIncome.required = false;
        }

    } else {

        incomeCategories.style.display = 'none';
        expenseCategories.style.display = 'grid';

        if (otherIncome) {
            otherIncome.style.display = 'none';
            otherIncome.required = false;
        }

        const selected = document.querySelector(
            'input[name="expense-category"]:checked'
        );

        if (selected && selected.value === 'Other') {
            if (otherExpense) {
                otherExpense.style.display = 'block';
                otherExpense.required = true;
            }
        } else if (otherExpense) {
            otherExpense.style.display = 'none';
            otherExpense.required = false;
        }
    }
}


/* ======================================================
   OTHER CATEGORY CHANGE
====================================================== */

function updateOtherCategory() {
    updateModalCategoryFields();
}


/* ======================================================
   CLOSE MODAL
====================================================== */

function closeTransactionModal() {

    const modal =
        document.getElementById('transaction-modal');

    if (modal) {
        modal.classList.remove('show');
    }

    clearCategorySelections();
}


/* ======================================================
   SAVE TRANSACTION
====================================================== */

async function saveTransaction(event) {

    event.preventDefault();

    const id =
        document.getElementById('transaction-id').value.trim();

    const amount = Number(
        document.getElementById('transaction-amount').value
    );

    const date =
        document.getElementById('transaction-date').value;

    const description =
        document.getElementById('transaction-description')
            .value.trim();

    const reminderEnabled =
        document.getElementById('reminder-enabled').checked;

    const reminderAt =
        document.getElementById('reminder-at').value;
// Recurring transaction details
const recurringActive =
    document.getElementById('recurring-active').checked;

const recurrenceFrequency =
    recurringActive
        ? document.getElementById('recurrence-frequency').value
        : 'NONE';

const recurrenceEndDate =
    recurringActive
        ? document.getElementById('recurrence-end-date').value || null
        : null;
    let category = '';

    // Validate amount
    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount.', 'error');
        return;
    }

    // Validate date
    if (!date) {
        showAlert('Please select a date.', 'error');
        return;
    }

    // Validate reminder
    if (reminderEnabled) {

        if (!reminderAt) {
            showAlert(
                'Please select a reminder date and time.',
                'error'
            );
            return;
        }

        const reminderDate = new Date(reminderAt);

        if (isNaN(reminderDate.getTime())) {
            showAlert(
                'Please select a valid reminder date and time.',
                'error'
            );
            return;
        }

        if (reminderDate <= new Date()) {
            showAlert(
                'Reminder date and time must be in the future.',
                'error'
            );
            return;
        }
    }

    // Get selected category
    const isIncome = currentTransactionType === 'INCOME';

    const selected = document.querySelector(
        isIncome
            ? 'input[name="income-category"]:checked'
            : 'input[name="expense-category"]:checked'
    );

    if (!selected) {
        showAlert(
            isIncome
                ? 'Please select an income category.'
                : 'Please select an expense category.',
            'error'
        );
        return;
    }

    if (selected.value === 'Other') {

        const otherInput = document.getElementById(
            isIncome
                ? 'other-income-category'
                : 'other-expense-category'
        );

        category = otherInput.value.trim();

        if (!category) {
            showAlert(
                isIncome
                    ? 'Please enter the income category.'
                    : 'Please enter the expense category.',
                'error'
            );

            otherInput.focus();
            return;
        }

    } else {
        category = selected.value;
    }

    // Transaction data
const transactionData = {
    type: currentTransactionType,
    amount: amount,
    date: date,
    category: category,
    description: description,

    // Reminder details
    reminderEnabled: reminderEnabled,
    reminderAt: reminderEnabled ? reminderAt : null,

    // Recurring transaction details
    recurringActive: recurringActive,
    recurrenceFrequency: recurrenceFrequency,
    recurrenceEndDate: recurrenceEndDate
};

    const saveButton =
        document.getElementById('save-transaction-btn');

    try {

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
        }

        // Update existing transaction
        if (id) {

            await apiPut(
                `/transactions/${encodeURIComponent(id)}`,
                transactionData
            );

            showAlert(
                isIncome
                    ? 'Income updated successfully.'
                    : 'Expense updated successfully.',
                'success'
            );

        } else {

            // Create new transaction
            await apiPost('/transactions', transactionData);

            showAlert(
                isIncome
                    ? 'Income added successfully.'
                    : 'Expense added successfully.',
                'success'
            );
        }

        closeTransactionModal();

        // Reload transactions and preserve active filters
        await loadTransactions();

    } catch (error) {

        console.error('Transaction error:', error);

        showAlert(
            error.message || 'Unable to save transaction.',
            'error'
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;

            saveButton.textContent =
                currentTransactionType === 'INCOME'
                    ? (id ? 'Update Income' : 'Save Income')
                    : (id ? 'Update Expense' : 'Save Expense');
        }
    }
}


/* ======================================================
   LOAD TRANSACTIONS
====================================================== */

async function loadTransactions() {

    const tbody =
        document.getElementById('transactions-table-body');

    try {

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            Loading transactions...
                        </div>
                    </td>
                </tr>
            `;
        }

        const response = await apiGet('/transactions');

        // Support both array and { data: [...] } responses
        let data = response;

        if (response && Array.isArray(response.data)) {
            data = response.data;
        }

        transactions = Array.isArray(data) ? data : [];

        // Apply search, amount, type and date filters
        applyFilters();

    } catch (error) {

        console.error('Failed to load transactions:', error);

        transactions = [];

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <div style="font-size:2rem;">⚠️</div>
                            <h3>Unable to load transactions</h3>
                            <p>
                                Please refresh the page and try again.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}


/* ======================================================
   RENDER TRANSACTIONS
====================================================== */

function renderTransactions(list) {

    const tbody =
        document.getElementById('transactions-table-body');

    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div style="font-size:2rem;">📋</div>
                        <h3>No Transactions Yet</h3>
                        <p>Add your first income or expense.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(transaction => {

        const type =
            String(transaction.type || '').toUpperCase();

        const isIncome = type === 'INCOME';

        const transactionId =
            getTransactionId(transaction);

        return `
            <tr>
                <td>${formatDate(transaction.date)}</td>

                <td>
                    <span class="type-badge ${
                        isIncome ? 'type-income' : 'type-expense'
                    }">
                        ${isIncome ? 'Income' : 'Expense'}
                    </span>
                </td>

                <td>
                    ${escapeHtml(transaction.category || '-')}
                </td>

                <td>
                    ${escapeHtml(transaction.description || '-')}
                </td>

                <td class="${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'}
                    ${formatCurrency(transaction.amount)}
                </td>

                <td>
                    <button
                        type="button"
                        class="action-btn"
                        onclick="editTransaction('${escapeAttribute(transactionId)}')"
                        title="Edit">
                        ✏️
                    </button>

                    <button
                        type="button"
                        class="action-btn"
                        onclick="deleteTransaction('${escapeAttribute(transactionId)}')"
                        title="Delete">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}


/* ======================================================
   FILTER TRANSACTIONS
====================================================== */

function applyFilters() {

    const searchInput =
        document.getElementById('search-input');

    const amountInput =
        document.getElementById('amount-filter');

    const typeFilter =
        document.getElementById('type-filter');

    const fromDate =
        document.getElementById('from-date');

    const toDate =
        document.getElementById('to-date');

    const search = searchInput
        ? searchInput.value.trim().toLowerCase()
        : '';

    const amountSearch = amountInput
        ? amountInput.value.trim()
        : '';

    const selectedType = typeFilter
        ? typeFilter.value
        : '';

    const from = fromDate ? fromDate.value : '';
    const to = toDate ? toDate.value : '';

    const filtered = transactions.filter(transaction => {

        const category =
            String(transaction.category || '').toLowerCase();

        const description =
            String(transaction.description || '').toLowerCase();

        const type =
            String(transaction.type || '').toUpperCase();

        const date = transaction.date
            ? String(transaction.date).substring(0, 10)
            : '';

        // Search by category or description
        const matchesSearch =
            !search ||
            category.includes(search) ||
            description.includes(search);

        // Filter by transaction type
        const matchesType =
            !selectedType ||
            type === selectedType;

        // Filter from date
        const matchesFrom =
            !from ||
            date >= from;

        // Filter to date
        const matchesTo =
            !to ||
            date <= to;

        // Exact amount filter
        const matchesAmount =
            !amountSearch ||
            Number(transaction.amount) === Number(amountSearch);

        return (
            matchesSearch &&
            matchesType &&
            matchesFrom &&
            matchesTo &&
            matchesAmount
        );
    });

    renderTransactions(filtered);
}


/* ======================================================
   EDIT TRANSACTION
====================================================== */

function editTransaction(id) {

    const transaction = transactions.find(
        item =>
            String(getTransactionId(item)) === String(id)
    );

    if (!transaction) {
        showAlert('Transaction not found.', 'error');
        return;
    }

    const type =
        String(transaction.type || 'EXPENSE').toUpperCase();

    openTransactionModal(type, transaction);
}


/* ======================================================
   DELETE TRANSACTION
====================================================== */

async function deleteTransaction(id) {

    const transaction = transactions.find(
        item =>
            String(getTransactionId(item)) === String(id)
    );

    if (!transaction) {
        showAlert('Transaction not found.', 'error');
        return;
    }

    const confirmed = confirm(
        'Are you sure you want to delete this transaction?'
    );

    if (!confirmed) return;

    try {

        await apiDelete(
            `/transactions/${encodeURIComponent(id)}`
        );

        showAlert(
            'Transaction deleted successfully.',
            'success'
        );

        await loadTransactions();

    } catch (error) {

        console.error('Delete transaction error:', error);

        showAlert(
            error.message || 'Unable to delete transaction.',
            'error'
        );
    }
}


/* ======================================================
   GET TRANSACTION ID
====================================================== */

function getTransactionId(transaction) {

    if (!transaction) return '';

    return (
        transaction.id ||
        transaction._id ||
        transaction.transactionId ||
        ''
    );
}


/* ======================================================
   FORMAT INPUT DATE
====================================================== */

function formatInputDate(date) {

    if (!date) return '';

    return String(date).substring(0, 10);
}


/* ======================================================
   FORMAT REMINDER DATE & TIME
====================================================== */

function formatReminderDateTime(value) {

    if (!value) return '';

    const date = new Date(value);

    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const hours = String(date.getHours()).padStart(2, '0');

    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}


/* ======================================================
   FORMAT DATE
====================================================== */

function formatDate(date) {

    if (!date) return '-';

    const value = String(date).substring(0, 10);

    const parts = value.split('-');

    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return value;
}


/* ======================================================
   FORMAT CURRENCY
====================================================== */

function formatCurrency(amount) {

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(Number(amount) || 0);
}


/* ======================================================
   ESCAPE HTML
====================================================== */

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* ======================================================
   ESCAPE ATTRIBUTE
====================================================== */

function escapeAttribute(value) {

    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}


/* ======================================================
   SHOW ALERT
====================================================== */

function showAlert(message, type = 'error') {

    const container =
        document.getElementById('transaction-alert');

    if (!container) {
        alert(message);
        return;
    }

    container.innerHTML = `
        <div class="alert alert-${type}">
            ${escapeHtml(message)}
        </div>
    `;

    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}