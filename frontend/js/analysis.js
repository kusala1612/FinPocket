// analysis.js
let categoryChart, monthlyChart, dailyChart;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    initSidebarUser();
    initSidebarToggle();
    initLogout();
    setDates();

    document.getElementById('apply').addEventListener('click', loadDaily);

    try {
        await loadSummary();
        await loadCategory();
        await loadMonthly();
        await loadDaily();
    } catch (error) {
        console.error(error);
    }
});

const money = value =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(Number(value) || 0);

const text = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
};

async function loadSummary() {
    const data = await apiGet('/analytics/summary');

    text('income', money(data.totalIncome));
    text('expenses', money(data.totalExpenses));
    text('balance', money(data.balance));
    text('average', money(data.averageDailyExpense));

    text(
        'top',
        data.highestSpendingCategory || 'No expenses yet'
    );

    text(
        'iTop',
        data.highestSpendingCategory
            ? `${data.highestSpendingCategory} — ${money(data.highestCategoryAmount)}`
            : 'No expense data yet'
    );

    text('iAvg', money(data.averageDailyExpense));
    text('iBal', money(data.balance));
}

async function loadCategory() {
    let data = await apiGet('/analytics/category');

    if (!Array.isArray(data)) {
        data = data.data || [];
    }

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(
        document.getElementById('categoryChart'),
        {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.category),
                datasets: [
                    {
                        data: data.map(
                            item => Number(item.amount) || 0
                        )
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: context =>
                                `${context.label}: ${money(context.raw)}`
                        }
                    }
                }
            }
        }
    );
}

async function loadMonthly() {
    let data = await apiGet('/analytics/monthly');

    if (!Array.isArray(data)) {
        data = data.data || [];
    }

    if (monthlyChart) {
        monthlyChart.destroy();
    }

    monthlyChart = new Chart(
        document.getElementById('monthlyChart'),
        {
            type: 'bar',
            data: {
                labels: data.map(item => item.month),
                datasets: [
                    {
                        label: 'Income',
                        data: data.map(
                            item => Number(item.income) || 0
                        )
                    },
                    {
                        label: 'Expenses',
                        data: data.map(
                            item => Number(item.expenses) || 0
                        )
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
}

async function loadDaily() {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;

    if (!start || !end || start > end) {
        return;
    }

    let data = await apiGet(
        `/analytics/daily?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );

    if (!Array.isArray(data)) {
        data = data.data || [];
    }

    if (dailyChart) {
        dailyChart.destroy();
    }

    dailyChart = new Chart(
        document.getElementById('dailyChart'),
        {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [
                    {
                        label: 'Daily Expenses',
                        data: data.map(
                            item => Number(item.amount) || 0
                        ),
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
}

function setDates() {
    const end = document.getElementById('end');
    const start = document.getElementById('start');

    const today = new Date();
    const previous = new Date();

    previous.setDate(today.getDate() - 29);

    end.value = today.toISOString().slice(0, 10);
    start.value = previous.toISOString().slice(0, 10);
}