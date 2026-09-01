/**
 * FinPocket Login Page Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (redirectIfAuthenticated()) return;

    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const togglePassword = document.getElementById('toggle-password');
    const submitBtn = document.getElementById('login-btn');

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Client-side validation
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email) {
            showAlert('login-alert', 'Please enter your email address');
            emailInput.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showAlert('login-alert', 'Please enter a valid email address');
            emailInput.focus();
            return;
        }

        if (!password) {
            showAlert('login-alert', 'Please enter your password');
            passwordInput.focus();
            return;
        }

        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';

        try {
            const response = await loginUser(email, password);

            if (response.success) {
                showAlert('login-alert', 'Login successful! Redirecting...', 'success');

                // Role-based redirect
                setTimeout(() => {
                    if (response.role === 'ADMIN') {
                        window.location.href = '/admin-dashboard.html';
                    } else {
                        window.location.href = '/user-dashboard.html';
                    }
                }, 500);
            }
        } catch (error) {
            showAlert('login-alert', error.message || 'Invalid email or password');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In';
        }
    });
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
