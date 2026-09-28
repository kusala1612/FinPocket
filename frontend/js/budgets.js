// ============================================================
// FINPOCKET - BUDGETS MODULE
// ============================================================

let currentBudget = null;
let editingBudget = false;


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {

    if (typeof requireAuth === "function") {
        requireAuth();
    }

    if (typeof initSidebarUser === "function") {
        initSidebarUser();
    }

    if (typeof initSidebarToggle === "function") {
        initSidebarToggle();
    }

    if (typeof initLogout === "function") {
        initLogout();
    }

    setupBudgetForm();

    await loadBudgetCategories();

    await loadBudget();
});


// ============================================================
// LOAD BUDGET
// ============================================================
let loadedBudgets = [];

async function loadBudget() {
    const container = document.getElementById("budget-container");
    const emptyState = document.getElementById("empty-budget");

    if (!container || !emptyState) {
        console.error("Budget container or empty state not found.");
        return;
    }

    try {
        const response = await apiGet("/budgets");

        let budgets = response;

        if (response && Array.isArray(response.data)) {
            budgets = response.data;
        }

        if (!Array.isArray(budgets)) {
            budgets = [];
        }

        loadedBudgets = budgets;

        if (loadedBudgets.length === 0) {
            container.innerHTML = "";
            container.style.display = "none";
            emptyState.style.display = "block";
            return;
        }

        emptyState.style.display = "none";
        container.style.display = "grid";

        const transactionsResponse = await apiGet("/transactions");
        let transactions = transactionsResponse;

        if (
            transactionsResponse &&
            Array.isArray(transactionsResponse.data)
        ) {
            transactions = transactionsResponse.data;
        }

        if (!Array.isArray(transactions)) {
            transactions = [];
        }

        container.innerHTML = loadedBudgets.map((budget, index) => {
            const limit = getBudgetLimit(budget);
const category = budget.category || null;

const budgetYear = Number(budget.year);
const budgetMonth = Number(budget.month);

const spent = calculateBudgetSpending(
    transactions,
    category,
    budgetYear,
    budgetMonth
);
            const remaining = limit - spent;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            const safePercentage = Math.min(Math.max(percentage, 0), 100);

            let statusClass = "success";
            let statusText =
                `You are within your budget. ${formatCurrency(Math.max(remaining, 0))} remaining.`;

            if (percentage >= 100) {
                statusClass = "danger";
                statusText = "⚠️ You have exceeded your budget.";
            } else if (percentage >= 80) {
                statusClass = "warning";
                statusText =
                    `⚠️ You have used ${Math.round(percentage)}% of your budget. Spend carefully.`;
            }

            const budgetName = category || "Overall Monthly Budget";

            return `
                <div class="budget-card">
                    <div class="budget-card-top">
                        <div class="budget-month">
                          ${budgetName} — ${new Date(budgetYear, budgetMonth - 1, 1)
    .toLocaleString("en-IN", { month: "long", year: "numeric" })}  
                        </div>

                        <div class="budget-card-actions">
                            <button type="button"
                                class="budget-action-btn"
                                onclick="selectBudgetForAction(${index}); editBudget();">
                                Edit
                            </button>

                            <button type="button"
                                class="budget-action-btn"
                                onclick="selectBudgetForAction(${index}); deleteBudget();">
                                Delete
                            </button>
                        </div>
                    </div>

                    <div class="budget-card-body">
                        <p>Budget Limit: <strong>${formatCurrency(limit)}</strong></p>
                        <p>Spent: <strong>${formatCurrency(spent)}</strong></p>
                        <p>Remaining: <strong>${formatCurrency(Math.max(remaining, 0))}</strong></p>
                        <p>${Math.round(percentage)}% used</p>

                        <div class="progress-bar">
                            <div class="budget-progress ${statusClass}"
                                style="width: ${safePercentage}%"></div>
                        </div>

                        <div class="status-message ${statusClass}">
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error("Error loading budgets:", error);
        showAlert("Could not load budgets. Please refresh the page.", "error");
    }
}

function selectBudgetForAction(index) {
    currentBudget = loadedBudgets[index] || null;
}

function calculateBudgetSpending(transactions, category, year, month) {
    return transactions.reduce((total, transaction) => {
        const type = String(
            transaction.type || transaction.transactionType || ""
        ).toUpperCase();

        if (type !== "EXPENSE") return total;

        const dateValue =
            transaction.date ||
            transaction.transactionDate ||
            transaction.createdAt;

        if (!dateValue) return total;

        const date = new Date(dateValue);

        if (
            date.getFullYear() !== year ||
            date.getMonth() + 1 !== month
        ) {
            return total;
        }

        if (category) {
            const transactionCategory =
                transaction.categoryName ||
                transaction.category?.name ||
                (typeof transaction.category === "string"
                    ? transaction.category
                    : "");

            if (
                String(transactionCategory).toLowerCase() !==
                String(category).toLowerCase()
            ) {
                return total;
            }
        }

        return total + Number(transaction.amount || 0);
    }, 0);
}

// ============================================================
// FIND CURRENT MONTH BUDGET
// ============================================================


// ============================================================
// SHOW BUDGET
// ============================================================

async function showBudget(budget) {

    document.getElementById("empty-budget").style.display = "none";

document.getElementById("budget-container").style.display = "block";
    const limit = getBudgetLimit(budget);

    const spent = await calculateCurrentMonthExpenses();

    const remaining = limit - spent;

    let percentage = 0;

    if (limit > 0) {
        percentage = (spent / limit) * 100;
    }

    updateElement(
        "budget-limit",
        formatCurrency(limit)
    );

    updateElement(
        "budget-spent",
        formatCurrency(spent)
    );

    updateElement(
        "budget-remaining",
        formatCurrency(Math.max(remaining, 0))
    );

    updateElement(
        "budget-percentage",
        `${Math.round(percentage)}%`
    );

    updateBudgetMonth(budget);

    updateProgressBar(percentage);

    updateBudgetStatus(
        percentage,
        remaining
    );
}


// ============================================================
// GET BUDGET LIMIT
// ============================================================

function getBudgetLimit(budget) {

    return Number(
        budget.budget ??
        budget.amount ??
        budget.budgetAmount ??
        budget.limit ??
        budget.monthlyLimit ??
        budget.maxAmount ??
        0
    );
}


// ============================================================
// CALCULATE CURRENT MONTH EXPENSES
// ============================================================

async function calculateCurrentMonthExpenses() {

    try {

        const response = await apiGet("/transactions");

        let transactions = response;

        if (response && Array.isArray(response.data)) {
            transactions = response.data;
        }

        if (!Array.isArray(transactions)) {
            return 0;
        }

        const now = new Date();

        const year = now.getFullYear();
        const month = now.getMonth();

        let total = 0;

        transactions.forEach(transaction => {

            const type =
                String(
                    transaction.type ||
                    transaction.transactionType ||
                    ""
                ).toUpperCase();

            if (type !== "EXPENSE") {
                return;
            }

            const dateValue =
                transaction.date ||
                transaction.transactionDate ||
                transaction.createdAt;

            if (!dateValue) {
                return;
            }

            const date = new Date(dateValue);

            if (
                date.getFullYear() === year &&
                date.getMonth() === month
            ) {

                total += Number(
                    transaction.amount || 0
                );
            }

        });

        return total;

    } catch (error) {

        console.error(
            "Could not calculate expenses:",
            error
        );

        return 0;
    }
}


// ============================================================
// UPDATE MONTH LABEL
// ============================================================

function updateBudgetMonth(budget) {

    const year = Number(budget.year);
    const month = Number(budget.month);

    if (!year || !month) {
        updateElement("budget-month", "Monthly Budget");
        return;
    }

    const date = new Date(year, month - 1, 1);

    const monthName =
        date.toLocaleString("en-IN", {
            month: "long"
        });

    updateElement(
        "budget-month",
        `${monthName} ${year}`
    );
}


// ============================================================
// UPDATE PROGRESS BAR
// ============================================================

function updateProgressBar(percentage) {

    const progress =
        document.getElementById("budget-progress");

    if (!progress) {
        return;
    }

    const safePercentage =
        Math.min(Math.max(percentage, 0), 100);

    progress.style.width =
        `${safePercentage}%`;

    progress.classList.remove(
        "warning",
        "danger"
    );

    if (percentage >= 100) {

        progress.classList.add("danger");

    } else if (percentage >= 80) {

        progress.classList.add("warning");
    }
}


// ============================================================
// UPDATE BUDGET STATUS
// ============================================================

function updateBudgetStatus(
    percentage,
    remaining
) {

    const status =
        document.getElementById("budget-status");

    if (!status) {
        return;
    }

    status.className =
        "status-message";

    if (percentage >= 100) {

        status.classList.add("danger");

        status.textContent =
            "⚠️ You have exceeded your monthly budget.";

    } else if (percentage >= 80) {

        status.classList.add("warning");

        status.textContent =
            `⚠️ You have used ${Math.round(percentage)}% of your budget. Spend carefully.`;

    } else {

        status.classList.add("success");

        status.textContent =
            `✅ You are within your budget. ${formatCurrency(remaining)} remaining.`;
    }
}


// ============================================================
// OPEN BUDGET MODAL
// ============================================================

function openBudgetModal() {

    editingBudget = false;

    const modal =
        document.getElementById("budget-modal");

    const title =
        document.getElementById("budget-modal-title");

    const amount =
        document.getElementById("budget-amount");

    const date =
        document.getElementById("budget-start-date");

    if (title) {
        title.textContent =
            "Set Monthly Budget";
    }

    if (amount) {
        amount.value = "";
    }

    if (date) {

        const today =
            new Date().toISOString().split("T")[0];

        date.value = today;
    }

    clearModalAlert();

    if (modal) {
    modal.classList.add("show");
}
}


// ============================================================
// EDIT BUDGET
// ============================================================

function editBudget() {

    if (!currentBudget) {
        return;
    }

    editingBudget = true;

    const modal =
        document.getElementById("budget-modal");

    const title =
        document.getElementById("budget-modal-title");

    const amount =
        document.getElementById("budget-amount");

    const date =
        document.getElementById("budget-start-date");

    if (title) {
        title.textContent =
            "Edit Monthly Budget";
    }

    if (amount) {

        amount.value =
            getBudgetLimit(currentBudget);
    }

    if (date) {

        const dateValue =
            currentBudget.startDate ||
            currentBudget.date;

        if (dateValue) {

            const formatted =
                new Date(dateValue)
                    .toISOString()
                    .split("T")[0];

            date.value = formatted;

        } else {

            date.value =
                new Date()
                    .toISOString()
                    .split("T")[0];
        }
    }

    clearModalAlert();

    if (modal) {
    modal.classList.add("show");
}
}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeBudgetModal() {

    const modal =
        document.getElementById("budget-modal");

    if (modal) {
        modal.classList.remove("show");
    }

    clearModalAlert();
}


// ============================================================
// FORM SETUP
// ============================================================

function setupBudgetForm() {

    const form =
        document.getElementById("budget-form");

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            await saveBudget();
        }
    );
}


// ============================================================
// SAVE BUDGET
// ============================================================


async function saveBudget() {
    const amountInput = document.getElementById("budget-amount");
    const dateInput = document.getElementById("budget-start-date");
    const categoryInput = document.getElementById("budget-category");

    const amount = Number(amountInput?.value || 0);
    const startDate = dateInput?.value;
    const selectedCategory = categoryInput?.value || "";

    if (!amount || amount <= 0) {
        showModalAlert("Please enter a valid budget amount.", "error");
        return;
    }

    if (!startDate) {
        showModalAlert("Please select a start date.", "error");
        return;
    }

    if (!selectedCategory) {
        showModalAlert("Please select a budget type.", "error");
        return;
    }

    // Parse the date as local year/month/day
    const [year, month] = startDate.split("-").map(Number);

    const budgetData = {
        amount: amount,
        year: year,
        month: month,
        category: selectedCategory === "ALL" ? null : selectedCategory
    };

    try {
        let response;

        if (editingBudget && currentBudget) {
            const id = getBudgetId(currentBudget);

            if (!id) {
                showModalAlert("Budget ID could not be found.", "error");
                return;
            }

            response = await apiPut(`/budgets/${id}`, budgetData);
        } else {
            response = await apiPost("/budgets", budgetData);
        }

        console.log("Budget save response:", response);

        closeBudgetModal();

        showAlert(
            editingBudget
                ? "Budget updated successfully."
                : "Budget created successfully.",
            "success"
        );

        await loadBudget();

    } catch (error) {
        console.error("Error saving budget:", error);
        showModalAlert(getErrorMessage(error), "error");
    }
}


// ============================================================
// DELETE BUDGET
// ============================================================

async function deleteBudget() {

    if (!currentBudget) {
        return;
    }

    const id =
        getBudgetId(currentBudget);

    if (!id) {

        showAlert(
            "Budget ID could not be found.",
            "error"
        );

        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this monthly budget?"
        );

    if (!confirmed) {
        return;
    }


    try {

        await apiDelete(
            `/budgets/${id}`
        );

currentBudget = null;
await loadBudget();

        showAlert(
            "Budget deleted successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Error deleting budget:",
            error
        );

        showAlert(
            getErrorMessage(error),
            "error"
        );
    }
}


// ============================================================
// GET BUDGET ID
// ============================================================

function getBudgetId(budget) {

    return (
        budget.id ||
        budget._id ||
        budget.budgetId
    );
}


// ============================================================
// EMPTY STATE
// ============================================================

function showEmptyBudget() {

    const empty =
        document.getElementById("empty-budget");

    const card =
    document.getElementById("budget-container");

    if (empty) {
        empty.style.display = "block";
    }

    if (card) {
        card.style.display = "none";
    }
}


// ============================================================
// ALERT
// ============================================================

function showAlert(message, type) {

    const alert =
        document.getElementById("budget-alert");

    if (!alert) {
        return;
    }

    alert.textContent = message;

    alert.className =
        `alert show ${type}`;

    setTimeout(function () {

        alert.classList.remove("show");

    }, 3500);
}


function showModalAlert(message, type) {

    const alert =
        document.getElementById("modal-alert");

    if (!alert) {
        return;
    }

    alert.textContent = message;

    alert.className =
        `alert show ${type}`;
}


function clearModalAlert() {

    const alert =
        document.getElementById("modal-alert");

    if (!alert) {
        return;
    }

    alert.textContent = "";

    alert.className = "alert";
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function getErrorMessage(error) {

    if (!error) {
        return "Something went wrong.";
    }

    if (error.message) {
        return error.message;
    }

    return "Unable to complete the request.";
}


// ============================================================
// DOM HELPER
// ============================================================

function updateElement(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


// ============================================================
// CURRENCY FORMAT
// ============================================================

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(Number(amount) || 0);
}


// ============================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ============================================================

window.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById("budget-modal");

        if (
            modal &&
            event.target === modal
        ) {
            closeBudgetModal();
        }
    }
);

// ============================================================
// LOAD CATEGORIES INTO BUDGET DROPDOWN
// ============================================================

async function loadBudgetCategories() {
    const select = document.getElementById("budget-category");

    if (!select) return;

    try {
        const response = await apiGet("/categories");

        let categories = response;

        if (response && Array.isArray(response.data)) {
            categories = response.data;
        }

        if (!Array.isArray(categories)) {
            categories = [];
        }

        // Keep the first two options:
        // Select budget type + Overall Monthly Budget
        select.innerHTML = `
            <option value="">Select budget type</option>
            <option value="ALL">Overall Monthly Budget</option>
        `;

        categories
            .filter(category => category.active !== false)
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(category => {
                const option = document.createElement("option");
                option.value = category.name;
                option.textContent = category.name;
                select.appendChild(option);
            });

    } catch (error) {
        console.error("Error loading budget categories:", error);
        showAlert("Could not load categories. Please refresh the page.", "error");
    }
}