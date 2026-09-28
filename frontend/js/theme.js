/* =========================================================
   FinPocket - Theme Manager
   ========================================================= */

const THEME_KEY = "finpocket-theme";

/* Apply saved theme immediately */
(function () {
    const savedTheme = localStorage.getItem(THEME_KEY) || "dark";

    document.documentElement.setAttribute(
        "data-theme",
        savedTheme
    );
})();


/* =========================================================
   GET CURRENT THEME
   ========================================================= */

function getCurrentTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
}


/* =========================================================
   SET THEME
   ========================================================= */

function setTheme(theme) {

    if (theme !== "light" && theme !== "dark") {
        theme = "dark";
    }

    localStorage.setItem(THEME_KEY, theme);

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    updateThemeControls();
}


/* =========================================================
   TOGGLE THEME
   ========================================================= */

function toggleTheme() {

    const currentTheme = getCurrentTheme();

    const newTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";

    setTheme(newTheme);
}


/* =========================================================
   UPDATE THEME CONTROLS
   ========================================================= */

function updateThemeControls() {

    const currentTheme = getCurrentTheme();

    const themeToggle =
        document.getElementById("theme-toggle");

    const themeLabel =
        document.getElementById("theme-label");

    if (themeToggle) {
        themeToggle.checked =
            currentTheme === "dark";
    }

    if (themeLabel) {

        themeLabel.textContent =
            currentTheme === "dark"
                ? "Dark"
                : "Light";
    }

    document.querySelectorAll(
        "[data-theme-option]"
    ).forEach(option => {

        option.classList.toggle(
            "selected",
            option.dataset.themeOption === currentTheme
        );
    });
}


/* =========================================================
   INITIALIZE THEME CONTROLS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        updateThemeControls();
    }
);