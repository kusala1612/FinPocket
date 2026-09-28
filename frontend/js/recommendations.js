// ============================================================
// FinPocket - Recommendations
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // Authentication
    if (!requireAuth()) return;

    // Common dashboard components
    initSidebarUser();
    initSidebarToggle();
    initLogout();

    // Load recommendations
    loadRecommendations();

    // Retry button
    const retryButton =
        document.getElementById("retry-recommendations-btn");

    if (retryButton) {
        retryButton.addEventListener(
            "click",
            loadRecommendations
        );
    }

});


// ============================================================
// LOAD RECOMMENDATIONS
// ============================================================

async function loadRecommendations() {

    const loading =
        document.getElementById(
            "recommendations-loading"
        );

    const grid =
        document.getElementById(
            "recommendations-grid"
        );

    const empty =
        document.getElementById(
            "recommendations-empty"
        );

    const errorBox =
        document.getElementById(
            "recommendations-error"
        );

    // Reset states
    if (loading) {
        loading.style.display = "block";
    }

    if (grid) {
        grid.style.display = "none";
        grid.innerHTML = "";
    }

    if (empty) {
        empty.style.display = "none";
    }

    if (errorBox) {
        errorBox.style.display = "none";
    }


    try {

        console.log(
            "Loading FinPocket recommendations..."
        );

        const response =
            await apiGet("/recommendations");


        console.log(
            "Recommendations API response:",
            response
        );


        // --------------------------------------------------------
        // Handle both possible API response formats
        // --------------------------------------------------------

        let recommendations = response;

        if (
            response &&
            response.data &&
            Array.isArray(response.data)
        ) {
            recommendations = response.data;
        }


        if (!Array.isArray(recommendations)) {

            throw new Error(
                "Invalid recommendations response."
            );

        }


        // --------------------------------------------------------
        // Hide loading
        // --------------------------------------------------------

        if (loading) {
            loading.style.display = "none";
        }


        // --------------------------------------------------------
        // No recommendations
        // --------------------------------------------------------

        if (recommendations.length === 0) {

            if (empty) {
                empty.style.display = "block";
            }

            return;
        }


        // --------------------------------------------------------
        // Display recommendations
        // --------------------------------------------------------

        renderRecommendations(
            recommendations
        );


        if (grid) {
            grid.style.display = "grid";
        }


    } catch (error) {

        console.error(
            "Failed to load recommendations:",
            error
        );


        if (loading) {
            loading.style.display = "none";
        }


        if (errorBox) {

            errorBox.style.display = "block";

            const errorMessage =
                document.getElementById(
                    "recommendations-error-message"
                );

            if (errorMessage) {

                errorMessage.textContent =
                    error.message ||
                    "Unable to load recommendations. Please try again.";

            }

        }

    }

}


// ============================================================
// RENDER RECOMMENDATIONS
// ============================================================

function renderRecommendations(
    recommendations
) {

    const grid =
        document.getElementById(
            "recommendations-grid"
        );

    if (!grid) return;


    grid.innerHTML = "";


    recommendations.forEach(
        (recommendation) => {

            const card =
                createRecommendationCard(
                    recommendation
                );

            grid.appendChild(card);

        }
    );

}


// ============================================================
// CREATE RECOMMENDATION CARD
// ============================================================

function createRecommendationCard(
    recommendation
) {

    const card =
        document.createElement("div");

    card.className =
        "recommendation-card";


    const type =
        String(
            recommendation.type || "INFO"
        ).toUpperCase();


    const icon =
        getRecommendationIcon(type);


    const typeLabel =
        getRecommendationTypeLabel(type);


    const title =
        escapeHTML(
            recommendation.title ||
            "Financial Recommendation"
        );


    const message =
        escapeHTML(
            recommendation.message ||
            "Review your financial activity regularly."
        );


    const category =
        recommendation.category
            ? escapeHTML(
                recommendation.category
            )
            : "";


    const amount =
        recommendation.amount !== null &&
        recommendation.amount !== undefined
            ? Number(
                recommendation.amount
            )
            : null;


    let categoryHTML = "";

    if (category) {

        categoryHTML = `
            <div class="recommendation-category">
                Category:
                <strong>${category}</strong>
            </div>
        `;

    }


    let amountHTML = "";

    if (
        amount !== null &&
        !Number.isNaN(amount)
    ) {

        amountHTML = `
            <div class="recommendation-amount">
                ${formatMoney(amount)}
            </div>
        `;

    }


    card.innerHTML = `

        <div class="recommendation-top">

            <div class="recommendation-icon">
                ${icon}
            </div>

            <div>

                <h3 class="recommendation-title">
                    ${title}
                </h3>

                <div class="recommendation-type">
                    ${typeLabel}
                </div>

            </div>

        </div>


        <p class="recommendation-message">
            ${message}
        </p>


        ${categoryHTML}

        ${amountHTML}

    `;


    return card;

}


// ============================================================
// RECOMMENDATION ICONS
// ============================================================

function getRecommendationIcon(type) {

    switch (type) {

        case "SPENDING":
            return "⚠️";

        case "BUDGET":
            return "💰";

        case "POSITIVE":
            return "✅";

        case "INFO":
            return "ℹ️";

        default:
            return "💡";

    }

}


// ============================================================
// RECOMMENDATION TYPE LABELS
// ============================================================

function getRecommendationTypeLabel(type) {

    switch (type) {

        case "SPENDING":
            return "Spending";

        case "BUDGET":
            return "Budget";

        case "POSITIVE":
            return "Positive";

        case "INFO":
            return "Information";

        default:
            return "Recommendation";

    }

}


// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(amount) {

    const value =
        Number(amount) || 0;


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2
        }
    ).format(value);

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}