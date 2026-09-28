/* =========================================================
   FinPocket - Categories Module
   ========================================================= */
let categories = [];
let editingCategoryId = null;
let currentCategoryType = "EXPENSE";

const defaultExpenseCategories = [
    { name: "Food", icon: "🍔" },
    { name: "Travel", icon: "🚗" },
    { name: "Education", icon: "🎓" },
    { name: "Shopping", icon: "🛍️" },
    { name: "Bills", icon: "🧾" },
    { name: "Entertainment", icon: "🎬" },
    { name: "Healthcare", icon: "🏥" },
    { name: "Household", icon: "🏠" },
    { name: "Other", icon: "📝" }
];

const defaultIncomeCategories = [
    { name: "Salary", icon: "💼" },
    { name: "Gift", icon: "🎁" },
    { name: "Refund", icon: "↩️" },
    { name: "Other Income", icon: "💰" }
];

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    requireAuth();

    initSidebarUser();
    initSidebarToggle();
    initLogout();

    loadCategories();
});


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

async function loadCategories() {
    try {
        const response = await apiGet("/categories");

        if (Array.isArray(response)) {
            categories = response;
        } else if (response && Array.isArray(response.data)) {
            categories = response.data;
        } else {
            categories = [];
        }

        renderCategories();

    } catch (error) {
        console.error("Failed to load categories:", error);

        /*
         * Temporary fallback.
         * This allows the page to display the standard
         * FinPocket categories even before backend integration
         * is completely connected.
         */
        categories = [
            ...defaultExpenseCategories.map(category => ({
                ...category,
                type: "EXPENSE",
                isDefault: true
            })),

            ...defaultIncomeCategories.map(category => ({
                ...category,
                type: "INCOME",
                isDefault: true
            }))
        ];

        renderCategories();
    }
}


/* =========================================================
   RENDER CATEGORIES
   ========================================================= */

function renderCategories() {

    const expenseContainer =
        document.getElementById("expense-categories-list");

    const incomeContainer =
        document.getElementById("income-categories-list");

    if (!expenseContainer || !incomeContainer) {
        return;
    }

    expenseContainer.innerHTML = "";
    incomeContainer.innerHTML = "";

    const expenseCategories =
        categories.filter(category =>
            normalizeType(category.type) === "EXPENSE"
        );

    const incomeCategories =
        categories.filter(category =>
            normalizeType(category.type) === "INCOME"
        );

    /*
     * If backend does not yet contain categories,
     * display default categories.
     */
    if (expenseCategories.length === 0) {
        defaultExpenseCategories.forEach(category => {
            expenseContainer.appendChild(
                createCategoryCard({
                    ...category,
                    type: "EXPENSE",
                    isDefault: true
                })
            );
        });
    } else {
        expenseCategories.forEach(category => {
            expenseContainer.appendChild(
                createCategoryCard(category)
            );
        });
    }

    if (incomeCategories.length === 0) {
        defaultIncomeCategories.forEach(category => {
            incomeContainer.appendChild(
                createCategoryCard({
                    ...category,
                    type: "INCOME",
                    isDefault: true
                })
            );
        });
    } else {
        incomeCategories.forEach(category => {
            incomeContainer.appendChild(
                createCategoryCard(category)
            );
        });
    }
}


/* =========================================================
   CATEGORY CARD
   ========================================================= */

function createCategoryCard(category) {

    const card = document.createElement("div");
    card.className = "category-card";

    const categoryId =
        category.id ||
        category._id ||
        category.categoryId ||
        "";

    const name =
        category.name ||
        category.categoryName ||
        "Unnamed";

    const icon =
        category.icon ||
        "📝";

    const isDefault =
        category.isDefault === true ||
        category.default === true;

    card.innerHTML = `
        <div class="category-icon">
            ${escapeHtml(icon)}
        </div>

        <div class="category-info">
            <h3>${escapeHtml(name)}</h3>
            <span>
                ${normalizeType(category.type) === "INCOME"
                    ? "Income"
                    : "Expense"}
            </span>
        </div>

        <div class="category-actions">

            <button
                class="category-action edit"
                title="Edit category"
                ${isDefault ? "disabled" : ""}
                onclick="editCategory('${escapeHtml(categoryId)}')">
                ✏️
            </button>

            <button
                class="category-action delete"
                title="Delete category"
                ${isDefault ? "disabled" : ""}
                onclick="deleteCategory('${escapeHtml(categoryId)}')">
                🗑️
            </button>

        </div>
    `;

    return card;
}


/* =========================================================
   OPEN ADD CATEGORY MODAL
   ========================================================= */

function openCategoryModal(type = "EXPENSE") {

    currentCategoryType = type;
    editingCategoryId = null;

    const modal =
        document.getElementById("category-modal");

    const title =
        document.getElementById("category-modal-title");

    const nameInput =
        document.getElementById("category-name");

    const iconInput =
        document.getElementById("category-icon");

    const typeInput =
        document.getElementById("category-type");

    if (!modal) {
        return;
    }

    if (title) {
        title.textContent =
            type === "INCOME"
                ? "Add Income Category"
                : "Add Expense Category";
    }

    if (nameInput) {
        nameInput.value = "";
    }

    if (iconInput) {
        iconInput.value = "";
    }

    if (typeInput) {
        typeInput.value = type;
    }

    modal.classList.add("active");
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeCategoryModal() {

    const modal =
        document.getElementById("category-modal");

    if (modal) {
        modal.classList.remove("active");
    }

    editingCategoryId = null;
}


/* =========================================================
   EDIT CATEGORY
   ========================================================= */

async function editCategory(id) {

    if (!id) {
        return;
    }

    const category = categories.find(item => {

        const itemId =
            item.id ||
            item._id ||
            item.categoryId;

        return String(itemId) === String(id);
    });

    if (!category) {
        showCategoryAlert(
            "Category information not found.",
            "error"
        );

        return;
    }

    editingCategoryId = id;

    currentCategoryType =
        normalizeType(category.type);

    const modal =
        document.getElementById("category-modal");

    const title =
        document.getElementById("category-modal-title");

    const nameInput =
        document.getElementById("category-name");

    const iconInput =
        document.getElementById("category-icon");

    const typeInput =
        document.getElementById("category-type");

    if (title) {
        title.textContent = "Edit Category";
    }

    if (nameInput) {
        nameInput.value =
            category.name ||
            category.categoryName ||
            "";
    }

    if (iconInput) {
        iconInput.value =
            category.icon ||
            "";
    }

    if (typeInput) {
        typeInput.value =
            currentCategoryType;
    }

    if (modal) {
        modal.classList.add("active");
    }
}


/* =========================================================
   SAVE CATEGORY
   ========================================================= */

async function saveCategory(event) {

    if (event) {
        event.preventDefault();
    }

    const nameInput =
        document.getElementById("category-name");

    const iconInput =
        document.getElementById("category-icon");

    const typeInput =
        document.getElementById("category-type");

    const name =
        nameInput
            ? nameInput.value.trim()
            : "";

    const icon =
        iconInput
            ? iconInput.value.trim()
            : "";

    const type =
        typeInput
            ? typeInput.value
            : currentCategoryType;

    if (!name) {
        showCategoryAlert(
            "Please enter a category name.",
            "error"
        );

        return;
    }

    if (!icon) {
        showCategoryAlert(
            "Please enter a category icon.",
            "error"
        );

        return;
    }

    const categoryData = {
        name: name,
        icon: icon,
        type: type
    };

    try {

        if (editingCategoryId) {

            await apiPut(
                `/categories/${editingCategoryId}`,
                categoryData
            );

            showCategoryAlert(
                "Category updated successfully.",
                "success"
            );

        } else {

            await apiPost(
                "/categories",
                categoryData
            );

            showCategoryAlert(
                "Category added successfully.",
                "success"
            );
        }

        closeCategoryModal();

        await loadCategories();

    } catch (error) {

        console.error(
            "Category save error:",
            error
        );

        showCategoryAlert(
            "Unable to save category. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   DELETE CATEGORY
   ========================================================= */

async function deleteCategory(id) {

    if (!id) {
        return;
    }

    const category =
        categories.find(item => {

            const itemId =
                item.id ||
                item._id ||
                item.categoryId;

            return String(itemId) === String(id);
        });

    if (!category) {
        return;
    }

    const name =
        category.name ||
        category.categoryName ||
        "this category";

    const confirmed =
        confirm(
            `Are you sure you want to delete "${name}"?`
        );

    if (!confirmed) {
        return;
    }

    try {

        await apiDelete(
            `/categories/${id}`
        );

        showCategoryAlert(
            "Category deleted successfully.",
            "success"
        );

        await loadCategories();

    } catch (error) {

        console.error(
            "Category delete error:",
            error
        );

        showCategoryAlert(
            "Unable to delete category. It may be used by existing transactions.",
            "error"
        );
    }
}


/* =========================================================
   TYPE NORMALIZATION
   ========================================================= */

function normalizeType(type) {

    if (!type) {
        return "EXPENSE";
    }

    return String(type)
        .toUpperCase()
        .trim();
}


/* =========================================================
   ALERT
   ========================================================= */

function showCategoryAlert(message, type = "success") {

    const alertBox =
        document.getElementById("category-alert");

    if (!alertBox) {
        return;
    }

    alertBox.textContent = message;

    alertBox.className =
        `category-alert ${type}`;

    alertBox.style.display = "block";

    setTimeout(() => {
        alertBox.style.display = "none";
    }, 3000);
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
   ========================================================= */

window.addEventListener("click", event => {

    const modal =
        document.getElementById("category-modal");

    if (
        modal &&
        event.target === modal
    ) {
        closeCategoryModal();
    }
});


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeCategoryModal();
    }
});