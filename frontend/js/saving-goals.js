/* =========================================================
   FinPocket - Saving Goals
   ========================================================= */

let savingGoals = [];
let editingGoal = null;
let contributionGoal = null;


/* =========================
   Initialization
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {

    try {

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

        setupIconSelection();
        setupGoalForm();

        await loadGoals();

    } catch (error) {
        console.error("Saving Goals initialization error:", error);
        showPageAlert("Unable to load Saving Goals.", "error");
    }

});


/* =========================
   Load Goals
   ========================= */

async function loadGoals() {

    try {

        // Correct backend endpoint
        const response = await apiGet("/goals");

        if (Array.isArray(response)) {
            savingGoals = response;
        } else if (response && Array.isArray(response.data)) {
            savingGoals = response.data;
        } else {
            savingGoals = [];
        }

        renderGoals();

    } catch (error) {

        console.error("Failed to load saving goals:", error);

        savingGoals = [];

        renderGoals();

        showPageAlert(
            getErrorMessage(error),
            "error"
        );
    }

}


/* =========================
   Render Goals
   ========================= */

function renderGoals() {

    const container = document.getElementById("goals-grid");

    if (!container) {
        return;
    }

    if (!savingGoals.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">🎯</div>

                <h3>No Saving Goals Yet</h3>

                <p>
                    Create your first saving goal and start tracking
                    your progress.
                </p>

                <button
                    class="primary-btn"
                    onclick="openGoalModal()">
                    + Create Your First Goal
                </button>

            </div>
        `;

        return;
    }

    container.innerHTML = savingGoals
        .map(goal => createGoalCard(goal))
        .join("");

}


/* =========================
   Create Goal Card
   ========================= */

function createGoalCard(goal) {

    const id = getGoalId(goal);

    const name =
        goal.name ||
        goal.goalName ||
        "Saving Goal";

    const target =
        Number(
            goal.targetAmount ??
            goal.target ??
            0
        );

    const saved =
        Number(
            goal.savedAmount ??
            goal.currentAmount ??
            goal.amountSaved ??
            0
        );

    const targetDate =
        goal.targetDate ||
        goal.deadline ||
        "";

    // Icon is currently UI-only.
    // Backend GoalDto does not store icon.
    const icon = goal.icon || "🎯";

    const percentage =
        target > 0
            ? Math.min((saved / target) * 100, 100)
            : 0;

    const completed =
        saved >= target && target > 0;

    const remaining =
        Math.max(target - saved, 0);

    const safeId = escapeHtml(String(id));

    return `
        <div class="goal-card">

            <div class="goal-card-top">

                <div class="goal-title-wrap">

                    <div class="goal-icon">
                        ${escapeHtml(icon)}
                    </div>

                    <div>

                        <h3 class="goal-title">
                            ${escapeHtml(name)}
                        </h3>

                        <div class="goal-date">
                            ${
                                targetDate
                                    ? "Target: " + formatDate(targetDate)
                                    : "No target date"
                            }
                        </div>

                    </div>

                </div>

                <div class="goal-menu">

                    <button
                        class="icon-btn"
                        title="Edit"
                        onclick="editGoal('${safeId}')">
                        ✏️
                    </button>

                    <button
                        class="icon-btn"
                        title="Delete"
                        onclick="deleteGoal('${safeId}')">
                        🗑️
                    </button>

                </div>

            </div>


            <div class="goal-amounts">

                <div class="amount-box">

                    <span class="amount-label">
                        Saved
                    </span>

                    <span class="amount-value">
                        ${formatCurrency(saved)}
                    </span>

                </div>

                <div class="amount-box">

                    <span class="amount-label">
                        Target
                    </span>

                    <span class="amount-value">
                        ${formatCurrency(target)}
                    </span>

                </div>

            </div>


            <div class="progress-header">

                <span>
                    Progress
                </span>

                <span class="progress-percent">
                    ${percentage.toFixed(1)}%
                </span>

            </div>


            <div class="progress-bar">

                <div
                    class="progress-fill"
                    style="width:${percentage}%">
                </div>

            </div>


            <div class="goal-status ${completed ? "completed" : ""}">

                ${
                    completed
                        ? "🏆 Goal Achieved!"
                        : `${formatCurrency(remaining)} remaining`
                }

            </div>


            <div class="goal-actions">

                ${
                    completed
                        ? ""
                        : `
                            <button
                                class="secondary-btn"
                                onclick="openContributionModal('${safeId}')">
                                + Add Money
                            </button>
                        `
                }

            </div>

        </div>
    `;
}


/* =========================
   Open Goal Modal
   ========================= */

function openGoalModal(goal = null) {

    editingGoal = goal;

    const modal =
        document.getElementById("goal-modal");

    const title =
        document.getElementById("goal-modal-title");

    const form =
        document.getElementById("goal-form");

    if (!modal || !title || !form) {
        return;
    }

    form.reset();

    document.getElementById("goal-id").value = "";
    document.getElementById("saved-amount").value = "0";
    document.getElementById("goal-icon").value = "🎯";

    selectIcon("🎯");

    const savedAmountInput =
        document.getElementById("saved-amount");

    if (goal) {

        title.textContent = "Edit Saving Goal";

        document.getElementById("goal-id").value =
            getGoalId(goal);

        document.getElementById("goal-name").value =
            goal.name ||
            goal.goalName ||
            "";

        document.getElementById("target-amount").value =
            goal.targetAmount ??
            goal.target ??
            "";

        document.getElementById("saved-amount").value =
            goal.savedAmount ??
            goal.currentAmount ??
            goal.amountSaved ??
            0;

        /*
         * Saved amount cannot be edited through PUT /goals/{id}.
         * It must be changed using Add Money.
         */
        savedAmountInput.disabled = true;
        savedAmountInput.title =
            "Use Add Money to update the saved amount.";

        document.getElementById("target-date").value =
            normalizeDateInput(
                goal.targetDate ||
                goal.deadline ||
                ""
            );

        selectIcon("🎯");

    } else {

        title.textContent = "Create Saving Goal";

        savedAmountInput.disabled = false;
        savedAmountInput.title = "";

    }

    clearAlert("modal-alert");

    modal.classList.add("active");

}


/* =========================
   Close Goal Modal
   ========================= */

function closeGoalModal() {

    const modal =
        document.getElementById("goal-modal");

    if (modal) {
        modal.classList.remove("active");
    }

    editingGoal = null;
}


/* =========================
   Goal Form
   ========================= */

function setupGoalForm() {

    const form =
        document.getElementById("goal-form");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async event => {

        event.preventDefault();

        const name =
            document.getElementById("goal-name")
                .value.trim();

        const targetAmount =
            Number(
                document.getElementById("target-amount")
                    .value
            );

        const savedAmount =
            Number(
                document.getElementById("saved-amount")
                    .value || 0
            );

        const targetDate =
            document.getElementById("target-date")
                .value;


        /* Validation */

        if (!name) {

            showModalAlert(
                "Please enter a goal name.",
                "error"
            );

            return;
        }


        if (!targetAmount || targetAmount <= 0) {

            showModalAlert(
                "Target amount must be greater than 0.",
                "error"
            );

            return;
        }


        if (savedAmount < 0) {

            showModalAlert(
                "Saved amount cannot be negative.",
                "error"
            );

            return;
        }


        if (savedAmount > targetAmount) {

            showModalAlert(
                "Saved amount cannot be greater than the target amount.",
                "error"
            );

            return;
        }


        if (!targetDate) {

            showModalAlert(
                "Please select a target date.",
                "error"
            );

            return;
        }


        /*
         * IMPORTANT:
         * Backend GoalRequest accepts:
         * name
         * targetAmount
         * targetDate
         * description
         *
         * It does not accept icon/savedAmount.
         */

        const payload = {
            name: name,
            targetAmount: targetAmount,
            targetDate: targetDate,
            description: ""
        };


        try {

            const id =
                document.getElementById("goal-id").value;


            /* =========================
               UPDATE
               ========================= */

            if (id) {

                await apiPut(
                    `/goals/${encodeURIComponent(id)}`,
                    payload
                );

                showPageAlert(
                    "Saving goal updated successfully.",
                    "success"
                );


            } else {


                /* =========================
                   CREATE
                   ========================= */

                const response =
                    await apiPost(
                        "/goals",
                        payload
                    );

                /*
                 * Backend creates a new goal with
                 * savedAmount = 0.
                 *
                 * If user entered Initial Saved Amount,
                 * add it using the proper endpoint.
                 */

                const createdId =
                    getGoalId(response);

                if (savedAmount > 0 && createdId) {

                    await apiPost(
                        `/goals/${encodeURIComponent(createdId)}/add-savings`,
                        {
                            amount: savedAmount
                        }
                    );

                }

                showPageAlert(
                    "Saving goal created successfully.",
                    "success"
                );

            }


            closeGoalModal();

            await loadGoals();


        } catch (error) {

            console.error(
                "Saving goal save error:",
                error
            );

            showModalAlert(
                getErrorMessage(error),
                "error"
            );

        }

    });

}


/* =========================
   Edit Goal
   ========================= */

function editGoal(id) {

    const goal =
        savingGoals.find(
            item =>
                String(getGoalId(item)) === String(id)
        );

    if (!goal) {
        return;
    }

    openGoalModal(goal);

}


/* =========================
   Delete Goal
   ========================= */

async function deleteGoal(id) {

    const goal =
        savingGoals.find(
            item =>
                String(getGoalId(item)) === String(id)
        );

    if (!goal) {
        return;
    }

    const name =
        goal.name ||
        goal.goalName ||
        "this saving goal";


    if (!confirm(`Delete "${name}"?`)) {
        return;
    }


    try {

        await apiDelete(
            `/goals/${encodeURIComponent(id)}`
        );

        showPageAlert(
            "Saving goal deleted.",
            "success"
        );

        await loadGoals();


    } catch (error) {

        console.error(
            "Delete goal error:",
            error
        );

        showPageAlert(
            getErrorMessage(error),
            "error"
        );

    }

}


/* =========================
   Contribution Modal
   ========================= */

function openContributionModal(id) {

    const goal =
        savingGoals.find(
            item =>
                String(getGoalId(item)) === String(id)
        );

    if (!goal) {
        return;
    }

    contributionGoal = goal;

    const name =
        goal.name ||
        goal.goalName ||
        "Saving Goal";

    const saved =
        Number(
            goal.savedAmount ??
            goal.currentAmount ??
            goal.amountSaved ??
            0
        );


    document.getElementById(
        "contribution-goal-name"
    ).value = name;


    document.getElementById(
        "contribution-current"
    ).value = formatCurrency(saved);


    document.getElementById(
        "contribution-amount"
    ).value = "";


    clearAlert("contribution-alert");


    document
        .getElementById("contribution-modal")
        .classList.add("active");

}


/* =========================
   Close Contribution Modal
   ========================= */

function closeContributionModal() {

    const modal =
        document.getElementById(
            "contribution-modal"
        );

    if (modal) {
        modal.classList.remove("active");
    }

    contributionGoal = null;

}


/* =========================
   Save Contribution
   ========================= */

async function saveContribution() {

    if (!contributionGoal) {
        return;
    }


    const amount =
        Number(
            document.getElementById(
                "contribution-amount"
            ).value
        );


    if (!amount || amount <= 0) {

        showContributionAlert(
            "Please enter a valid amount.",
            "error"
        );

        return;
    }


    const id =
        getGoalId(contributionGoal);


    const target =
        Number(
            contributionGoal.targetAmount ??
            contributionGoal.target ??
            0
        );


    const currentSaved =
        Number(
            contributionGoal.savedAmount ??
            contributionGoal.currentAmount ??
            contributionGoal.amountSaved ??
            0
        );


    const remaining =
        Math.max(
            target - currentSaved,
            0
        );


    if (amount > remaining) {

        showContributionAlert(
            `You can add at most ${formatCurrency(remaining)}.`,
            "error"
        );

        return;
    }


    try {

        /*
         * Correct backend endpoint:
         * POST /api/goals/{id}/add-savings
         *
         * Payload:
         * { amount: number }
         */

        await apiPost(
            `/goals/${encodeURIComponent(id)}/add-savings`,
            {
                amount: amount
            }
        );


        const newSaved =
            currentSaved + amount;


        closeContributionModal();


        showPageAlert(
            newSaved >= target
                ? "🏆 Goal achieved! Congratulations!"
                : "Money added to your saving goal.",
            "success"
        );


        await loadGoals();


    } catch (error) {

        console.error(
            "Contribution error:",
            error
        );

        showContributionAlert(
            getErrorMessage(error),
            "error"
        );

    }

}


/* =========================
   Icon Selection
   ========================= */

function setupIconSelection() {

    document
        .querySelectorAll(".icon-option")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const icon =
                        button.dataset.icon;

                    selectIcon(icon);

                }
            );

        });

}


function selectIcon(icon) {

    const hidden =
        document.getElementById("goal-icon");

    if (hidden) {
        hidden.value = icon;
    }


    document
        .querySelectorAll(".icon-option")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.icon === icon
            );

        });

}


/* =========================
   Helpers
   ========================= */

function getGoalId(goal) {

    return (
        goal?.id ??
        goal?._id ??
        goal?.goalId ??
        ""
    );

}


function formatCurrency(value) {

    const amount =
        Number(value) || 0;

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(amount);

}


function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function normalizeDateInput(value) {

    if (!value) {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString()
        .split("T")[0];

}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function getErrorMessage(error) {

    if (!error) {
        return "Something went wrong.";
    }

    if (typeof error === "string") {
        return error;
    }

    return (
        error.message ||
        error.error ||
        "Something went wrong."
    );

}


/* =========================
   Alerts
   ========================= */

function showPageAlert(
    message,
    type = "success"
) {

    const alert =
        document.getElementById("page-alert");

    if (!alert) {
        return;
    }

    alert.textContent = message;

    alert.className =
        `alert show ${type}`;

    setTimeout(() => {
        alert.className = "alert";
    }, 4000);

}


function showModalAlert(
    message,
    type = "error"
) {

    const alert =
        document.getElementById("modal-alert");

    if (!alert) {
        return;
    }

    alert.textContent = message;

    alert.className =
        `alert show ${type}`;

}


function showContributionAlert(
    message,
    type = "error"
) {

    const alert =
        document.getElementById(
            "contribution-alert"
        );

    if (!alert) {
        return;
    }

    alert.textContent = message;

    alert.className =
        `alert show ${type}`;

}


function clearAlert(id) {

    const alert =
        document.getElementById(id);

    if (!alert) {
        return;
    }

    alert.textContent = "";
    alert.className = "alert";

}


/* =========================
   Close modal when clicking
   outside the modal content
   ========================= */

window.addEventListener("click", event => {

    const goalModal =
        document.getElementById("goal-modal");

    const contributionModal =
        document.getElementById(
            "contribution-modal"
        );


    if (event.target === goalModal) {
        closeGoalModal();
    }


    if (event.target === contributionModal) {
        closeContributionModal();
    }

});