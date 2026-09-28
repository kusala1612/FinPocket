// ============================================================
// FinPocket — Reports
// ============================================================

let currentReport = null;


// ------------------------------------------------------------
// INITIALIZE
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
        if (!requireAuth()) return;

    initSidebarUser();
    initSidebarToggle();
    

    const monthInput = document.getElementById("report-month");
    const loadButton = document.getElementById("load-report-btn");
    const csvButton = document.getElementById("export-csv-btn");
    const pdfButton = document.getElementById("export-pdf-btn");

    // Set current month
    const now = new Date();

    const currentMonth =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    monthInput.value = currentMonth;

    loadButton.addEventListener("click", loadReport);

    csvButton.addEventListener("click", exportCSV);

    pdfButton.addEventListener("click", exportPDF);

    // Automatically load current month
    loadReport();
});


// ------------------------------------------------------------
// LOAD MONTHLY REPORT
// ------------------------------------------------------------

async function loadReport() {

    const monthInput =
        document.getElementById("report-month");

    const selectedMonth = monthInput.value;

    if (!selectedMonth) {
        alert("Please select a month.");
        return;
    }

    const [year, month] =
        selectedMonth.split("-");

    const button =
        document.getElementById("load-report-btn");

    button.disabled = true;
    button.textContent = "Loading...";

    try {

        const report =
            await apiGet(
                `/reports/monthly?year=${year}&month=${Number(month)}`
            );

        currentReport = report;

        displayReport(report);

    } catch (error) {

        console.error("Report loading error:", error);

        alert(
            error.message ||
            "Unable to load the report."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Generate Report";
    }
}


// ------------------------------------------------------------
// DISPLAY REPORT
// ------------------------------------------------------------

function displayReport(report) {

    document.getElementById("report-title").textContent =
        "Monthly Financial Report";

    document.getElementById("report-period-text").textContent =
        `Report for ${formatPeriod(report.period)}`;

    document.getElementById("report-income").textContent =
        formatMoney(report.income);

    document.getElementById("report-expenses").textContent =
        formatMoney(report.expenses);

    document.getElementById("report-savings").textContent =
        formatMoney(report.savings);

    document.getElementById("report-average").textContent =
        formatMoney(report.averageExpense);

    displayCategoryBreakdown(
        report.categoryBreakdown || []
    );

    displayMonthlyBreakdown(
        report.monthlyBreakdown || []
    );
}


// ------------------------------------------------------------
// CATEGORY BREAKDOWN
// ------------------------------------------------------------

function displayCategoryBreakdown(categories) {

    const tbody =
        document.getElementById(
            "category-report-body"
        );

    tbody.innerHTML = "";

    if (!categories.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-report">
                    No expense data available
                    for this month.
                </td>
            </tr>
        `;

        return;
    }

    categories.forEach(category => {

        const row =
            document.createElement("tr");

        const amount =
            Number(category.amount || 0);

        const percentage =
            Number(category.percentage || 0);

        row.innerHTML = `
            <td>
                ${escapeHTML(category.category || "Other")}
            </td>

            <td>
                ${formatMoney(amount)}
            </td>

            <td>
                ${percentage.toFixed(2)}%
            </td>
        `;

        tbody.appendChild(row);
    });
}


// ------------------------------------------------------------
// MONTHLY BREAKDOWN
// ------------------------------------------------------------

function displayMonthlyBreakdown(months) {

    const tbody =
        document.getElementById(
            "monthly-report-body"
        );

    tbody.innerHTML = "";

    if (!months.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-report">
                    No monthly data available.
                </td>
            </tr>
        `;

        return;
    }

    months.forEach(month => {

        const income =
            Number(month.income || 0);

        const expenses =
            Number(month.expenses || 0);

        const balance =
            month.balance !== undefined
                ? Number(month.balance)
                : income - expenses;

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                ${escapeHTML(month.month || "-")}
            </td>

            <td>
                ${formatMoney(income)}
            </td>

            <td>
                ${formatMoney(expenses)}
            </td>

            <td>
                ${formatMoney(balance)}
            </td>
        `;

        tbody.appendChild(row);
    });
}


// ------------------------------------------------------------
// MONEY FORMAT
// ------------------------------------------------------------

function formatMoney(amount) {

    const value =
        Number(amount || 0);

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2
        }
    ).format(value);
}


// ------------------------------------------------------------
// PERIOD FORMAT
// ------------------------------------------------------------

function formatPeriod(period) {

    if (!period) {
        return "Selected Month";
    }

    const parts =
        period.split("-");

    if (parts.length !== 2) {
        return period;
    }

    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const date =
        new Date(year, month - 1, 1);

    return date.toLocaleDateString(
        "en-IN",
        {
            month: "long",
            year: "numeric"
        }
    );
}


// ------------------------------------------------------------
// CSV EXPORT
// ------------------------------------------------------------

function exportCSV() {

    if (!currentReport) {

        alert(
            "Please generate a report first."
        );

        return;
    }

    let csv = "";

    csv += "FinPocket Monthly Financial Report\n";
    csv += `Period,${currentReport.period}\n\n`;

    csv += "Summary\n";
    csv += "Metric,Amount\n";
    csv += `Total Income,${currentReport.income || 0}\n`;
    csv += `Total Expenses,${currentReport.expenses || 0}\n`;
    csv += `Savings,${currentReport.savings || 0}\n`;
    csv += `Average Expense,${currentReport.averageExpense || 0}\n\n`;

    csv += "Category Breakdown\n";
    csv += "Category,Amount,Percentage\n";

    (currentReport.categoryBreakdown || [])
        .forEach(category => {

            csv +=
                `"${csvEscape(category.category || "Other")}",` +
                `${category.amount || 0},` +
                `${category.percentage || 0}\n`;
        });

    csv += "\nMonthly Breakdown\n";
    csv += "Month,Income,Expenses,Balance\n";

    (currentReport.monthlyBreakdown || [])
        .forEach(month => {

            const income =
                Number(month.income || 0);

            const expenses =
                Number(month.expenses || 0);

            const balance =
                month.balance !== undefined
                    ? Number(month.balance)
                    : income - expenses;

            csv +=
                `${month.month || ""},` +
                `${income},` +
                `${expenses},` +
                `${balance}\n`;
        });

    const blob =
        new Blob(
            [csv],
            { type: "text/csv;charset=utf-8;" }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `FinPocket_Report_${currentReport.period}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


// ------------------------------------------------------------
// PDF EXPORT
// ------------------------------------------------------------

function exportPDF() {

    if (!currentReport) {

        alert(
            "Please generate a report first."
        );

        return;
    }

    /*
     * Uses the browser's print dialog.
     * Select "Save as PDF".
     */

    const reportWindow =
        window.open(
            "",
            "_blank",
            "width=900,height=700"
        );

    if (!reportWindow) {

        alert(
            "Please allow pop-ups to export the PDF."
        );

        return;
    }

    const categories =
        currentReport.categoryBreakdown || [];

    const months =
        currentReport.monthlyBreakdown || [];

    let categoryRows = "";

    categories.forEach(category => {

        categoryRows += `
            <tr>
                <td>${escapeHTML(category.category || "Other")}</td>
                <td>${formatMoney(category.amount)}</td>
                <td>${Number(category.percentage || 0).toFixed(2)}%</td>
            </tr>
        `;
    });

    let monthlyRows = "";

    months.forEach(month => {

        const income =
            Number(month.income || 0);

        const expenses =
            Number(month.expenses || 0);

        const balance =
            month.balance !== undefined
                ? Number(month.balance)
                : income - expenses;

        monthlyRows += `
            <tr>
                <td>${escapeHTML(month.month || "-")}</td>
                <td>${formatMoney(income)}</td>
                <td>${formatMoney(expenses)}</td>
                <td>${formatMoney(balance)}</td>
            </tr>
        `;
    });

    reportWindow.document.write(`
        <!DOCTYPE html>

        <html>

        <head>

            <title>
                FinPocket Report ${currentReport.period}
            </title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    color: #222;
                }

                h1 {
                    margin-bottom: 5px;
                }

                h2 {
                    margin-top: 30px;
                }

                .period {
                    color: #666;
                    margin-bottom: 25px;
                }

                .summary {
                    display: grid;
                    grid-template-columns:
                        repeat(4, 1fr);
                    gap: 15px;
                }

                .card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 15px;
                }

                .label {
                    font-size: 13px;
                    color: #666;
                }

                .value {
                    font-size: 20px;
                    font-weight: bold;
                    margin-top: 8px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                th,
                td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }

                th {
                    background: #f5f5f5;
                }

                .print-btn {
                    padding: 10px 18px;
                    margin-bottom: 20px;
                    cursor: pointer;
                }

                @media print {
                    .print-btn {
                        display: none;
                    }
                }

            </style>

        </head>

        <body>

            <button
                class="print-btn"
                onclick="window.print()">
                Save / Print PDF
            </button>

            <h1>
                FinPocket Monthly Financial Report
            </h1>

            <div class="period">
                ${formatPeriod(currentReport.period)}
            </div>

            <div class="summary">

                <div class="card">
                    <div class="label">
                        Total Income
                    </div>
                    <div class="value">
                        ${formatMoney(currentReport.income)}
                    </div>
                </div>

                <div class="card">
                    <div class="label">
                        Total Expenses
                    </div>
                    <div class="value">
                        ${formatMoney(currentReport.expenses)}
                    </div>
                </div>

                <div class="card">
                    <div class="label">
                        Savings
                    </div>
                    <div class="value">
                        ${formatMoney(currentReport.savings)}
                    </div>
                </div>

                <div class="card">
                    <div class="label">
                        Average Expense
                    </div>
                    <div class="value">
                        ${formatMoney(currentReport.averageExpense)}
                    </div>
                </div>

            </div>

            <h2>
                Category Breakdown
            </h2>

            <table>

                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>

                <tbody>
                    ${categoryRows}
                </tbody>

            </table>

            <h2>
                Monthly Breakdown
            </h2>

            <table>

                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Income</th>
                        <th>Expenses</th>
                        <th>Balance</th>
                    </tr>
                </thead>

                <tbody>
                    ${monthlyRows}
                </tbody>

            </table>

        </body>

        </html>
    `);

    reportWindow.document.close();

    setTimeout(() => {
        reportWindow.focus();
        reportWindow.print();
    }, 500);
}


// ------------------------------------------------------------
// HTML SAFETY
// ------------------------------------------------------------

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ------------------------------------------------------------
// CSV SAFETY
// ------------------------------------------------------------

function csvEscape(value) {

    return String(value)
        .replace(/"/g, '""');
}